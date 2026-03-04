
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const Player = require('../../models/Player');
const { createErrorEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const config = require('../../config/config.json');
const emojis = require('../../utils/emojis');

// ── Constants ───────────────────────────────────────────────────────

const CRAFTBOOK_COLOR = 0xE67E22;
const RECIPES_PER_PAGE = 5;

const TYPE_META = {
    equipment:          { icon: config.emojis.equipment, label: 'Equipment' },
    hatcher:            { icon: '🥚', label: 'Hatcher' },
    crafting_material:  { icon: '🔧', label: 'Material' },
    essence:            { icon: '✨', label: 'Essence' },
};

const RARITY_COLORS = {
    Common:    0x9CA3AF,
    Uncommon:  0x22C55E,
    Rare:      0x3B82F6,
    Epic:      0xA855F7,
    Legendary: 0xF59E0B,
    Mythic:    0xEF4444,
};

// ── Helpers ─────────────────────────────────────────────────────────

function getTypeInfo(type) {
    return TYPE_META[type] || { icon: '📦', label: 'Item' };
}

function rarityEmoji(rarity) {
    return emojis[rarity?.toLowerCase()] || config.emojis[rarity] || '';
}

function getCraftingRecipes() {
    return Object.entries(GameData.recipes).filter(([, recipe]) => {
        const resultItem = GameData.getItem(recipe.result.itemId);
        return resultItem && resultItem.type !== 'potion' && resultItem.source === 'crafting';
    });
}

function getRecipeTypes(recipes) {
    const types = new Set();
    for (const [, recipe] of recipes) {
        const item = GameData.getItem(recipe.result.itemId);
        if (item) types.add(item.type);
    }
    return [...types];
}

function getTypeRecipes(typeKey, recipes) {
    return recipes.filter(([, r]) => {
        const item = GameData.getItem(r.result.itemId);
        return item?.type === typeKey;
    });
}

function formatIngredients(recipe) {
    return recipe.ingredients.map(ing => {
        const emoji = CommandHelpers.getItemEmoji(ing.itemId);
        const name = GameData.getItem(ing.itemId)?.name || 'Unknown';
        return `${emoji} \`x${ing.quantity}\` ${name}`;
    }).join('\n');
}

// ── Text Builders ───────────────────────────────────────────────────

function buildOverviewText(player, recipes) {
    const total = recipes.length;
    const known = recipes.filter(([rid]) => player.craftingJournal.includes(rid)).length;

    let text = `# ${config.emojis.crafting} Master Craftbook\n`;
    text += `-# Your collection of discovered crafting recipes\n\n`;

    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    const filled = Math.round((known / total) * 10);
    const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
    text += `### 📊 Progress\n`;
    text += `${bar}  **${known}/${total}** recipes discovered · \`${pct}%\`\n\n`;

    const types = getRecipeTypes(recipes);
    for (const type of types) {
        const { icon, label } = getTypeInfo(type);
        const typeRecipes = getTypeRecipes(type, recipes);
        const typeKnown = typeRecipes.filter(([rid]) => player.craftingJournal.includes(rid)).length;
        text += `${icon} **${label}** — ${typeKnown}/${typeRecipes.length} discovered\n`;
    }

    text += `\n-# Select a category below to browse recipes`;
    return text;
}

function buildCategoryText(typeKey, player, recipes, page) {
    const { icon, label } = getTypeInfo(typeKey);
    const typeRecipes = getTypeRecipes(typeKey, recipes);
    if (typeRecipes.length === 0) return null;

    const totalPages = Math.ceil(typeRecipes.length / RECIPES_PER_PAGE);
    const start = page * RECIPES_PER_PAGE;
    const pageRecipes = typeRecipes.slice(start, start + RECIPES_PER_PAGE);

    let text = `# ${icon} ${label} Recipes\n`;
    if (totalPages > 1) text += `-# Page ${page + 1}/${totalPages}\n`;
    text += `\n`;

    for (const [recipeId, recipe] of pageRecipes) {
        const item = GameData.getItem(recipe.result.itemId);
        const isKnown = player.craftingJournal.includes(recipeId);
        const itemEmoji = CommandHelpers.getItemEmoji(item.name);
        const status = isKnown ? itemEmoji : '🔒';

        text += `${status} **${item.name}** \`${item.rarity}\`\n`;

        if (isKnown) {
            const ings = recipe.ingredients.map(ing => {
                const emoji = CommandHelpers.getItemEmoji(ing.itemId);
                const name = GameData.getItem(ing.itemId)?.name || '???';
                return `${emoji}\`x${ing.quantity}\``;
            }).join(' ');
            text += `> -# ${ings}\n`;
            text += `> -# ⚒️ Level ${recipe.level} · ✨ ${recipe.xp} XP\n`;
        } else {
            text += `-# Find recipe to unlock this item!\n`;
        }
        text += `\n`;
    }

    return text;
}

function buildDetailText(recipeId, recipe, player) {
    const item = GameData.getItem(recipe.result.itemId);
    if (!item) return null;

    const icon = CommandHelpers.getItemEmoji(item.name);
    const isKnown = player.craftingJournal.includes(recipeId);
    const rEmoji = rarityEmoji(item.rarity);

    let text = `# ${icon} ${item.name}\n`;
    text += `-# ${item.description}\n\n`;
    text += `${rEmoji} **${item.rarity}** · ${getTypeInfo(item.type).icon} ${getTypeInfo(item.type).label} · ${config.emojis.crafting} Crafting\n\n`;

    if (item.stats) {
        text += `### 📊 Stats\n`;
        const statLines = Object.entries(item.stats).map(([stat, value]) =>
            `**${stat.toUpperCase()}** +${value}`
        ).join(' · ');
        text += `${statLines}\n\n`;
    }

    if (isKnown) {
        text += `### 🔨 Recipe\n`;
        text += formatIngredients(recipe) + `\n\n`;
        text += `> ✨ **${recipe.xp} XP** · ⚒️ **Level ${recipe.level}** required\n`;
    } else {
        text += `### 🔒 Recipe Unknown\n`;
        text += `-# Find recipe to unlock this item!\n`;
    }

    return text;
}

// ── Container Builders ──────────────────────────────────────────────

function buildOverviewContainer(player, recipes) {
    const container = new ContainerBuilder().setAccentColor(CRAFTBOOK_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(buildOverviewText(player, recipes)));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(buildCategorySelect(recipes)));
    return container;
}

function buildCategoryContainer(typeKey, player, recipes, page = 0) {
    const text = buildCategoryText(typeKey, player, recipes, page);
    if (!text) return null;

    const typeRecipes = getTypeRecipes(typeKey, recipes);
    const totalPages = Math.ceil(typeRecipes.length / RECIPES_PER_PAGE);

    const container = new ContainerBuilder().setAccentColor(CRAFTBOOK_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Category select
    container.addActionRowComponents(new ActionRowBuilder().addComponents(buildCategorySelect(recipes)));

    // Recipe detail select (only the current page's recipes)
    const start = page * RECIPES_PER_PAGE;
    const pageRecipes = typeRecipes.slice(start, start + RECIPES_PER_PAGE);

    if (pageRecipes.length > 0) {
        const recipeSelect = new StringSelectMenuBuilder()
            .setCustomId('craftbook_recipe_select')
            .setPlaceholder('🔍 View recipe details...');

        for (const [rid, recipe] of pageRecipes) {
            const item = GameData.getItem(recipe.result.itemId);
            const isKnown = player.craftingJournal.includes(rid);
            recipeSelect.addOptions({
                label: item.name,
                description: isKnown ? `Lv ${recipe.level} · ${recipe.xp} XP` : '🔒 Undiscovered',
                value: rid,
                emoji: isKnown ? emojis.success : '🔒'
            });
        }
        container.addActionRowComponents(new ActionRowBuilder().addComponents(recipeSelect));
    }

    // Page nav buttons (only if multiple pages)
    if (totalPages > 1) {
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`craftbook_page_${typeKey}_${page - 1}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emojis.previous)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(`craftbook_pageinfo`)
                    .setLabel(`${page + 1} / ${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`craftbook_page_${typeKey}_${page + 1}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emojis.next)
                    .setDisabled(page >= totalPages - 1)
            )
        );
    }

    return container;
}

function buildDetailContainer(recipeId, recipe, player, recipes) {
    const item = GameData.getItem(recipe.result.itemId);
    const color = RARITY_COLORS[item?.rarity] || CRAFTBOOK_COLOR;
    const text = buildDetailText(recipeId, recipe, player);
    if (!text) return null;

    const container = new ContainerBuilder().setAccentColor(color);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(buildCategorySelect(recipes)));

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`craftbook_back_${item.type}`)
                .setLabel(`Back to ${getTypeInfo(item.type).label}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(emojis.previous)
        )
    );

    return container;
}

// ── Shared Select ───────────────────────────────────────────────────

function buildCategorySelect(recipes) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('craftbook_category')
        .setPlaceholder('📖 Browse Recipe Categories...')
        .addOptions({ label: 'Overview', description: 'View your craftbook progress', value: 'overview', emoji: '📖' });

    const types = getRecipeTypes(recipes);
    for (const type of types) {
        const { icon, label } = getTypeInfo(type);
        select.addOptions({
            label,
            description: `Browse ${label.toLowerCase()} recipes`,
            value: type,
            emoji: icon
        });
    }

    return select;
}

// ── Main Command ────────────────────────────────────────────────────

module.exports = {
    name: 'craftbook',
    description: 'View crafting recipes in your master cookbook.',
    usage: '[item_name]',
    aliases: ['recipes', 'crafts'],
    cooldown: 15,
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const recipes = getCraftingRecipes();

            // ── Direct item lookup ──────────────────────────────
            if (args.length > 0) {
                const searchTerm = args.join(' ').toLowerCase().replace(/\s+/g, '_');

                const itemId = Object.keys(GameData.items).find(id =>
                    id.toLowerCase() === searchTerm ||
                    GameData.getItem(id)?.name?.toLowerCase().replace(/\s+/g, '_') === searchTerm
                );

                if (!itemId || GameData.getItem(itemId)?.type === 'potion') {
                    return message.reply({
                        embeds: [createErrorEmbed('Item Not Found', `Could not find a craftable item named "${args.join(' ')}" or it's a potion (use ${prefix}grimoire for potions).`)]
                    });
                }

                const recipeEntry = Object.entries(GameData.recipes).find(([, recipe]) =>
                    recipe.result.itemId === itemId
                );

                if (!recipeEntry) {
                    return message.reply({
                        embeds: [createErrorEmbed('No Recipe Found', `No crafting recipe exists for ${GameData.getItem(itemId)?.name || 'Unknown'}.`)]
                    });
                }

                const [recipeId, recipe] = recipeEntry;
                const container = buildDetailContainer(recipeId, recipe, player, recipes);
                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ── Interactive panel ───────────────────────────────
            let currentView = 'overview';
            let currentPage = 0;
            let selectedRecipeId = null;

            const overviewContainer = buildOverviewContainer(player, recipes);

            const reply = await message.reply({
                components: [overviewContainer],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 120_000
            });

            collector.on('collect', async (interaction) => {
                try {
                    const fresh = await CommandHelpers.validatePlayer(message.author.id, prefix);
                    if (!fresh.success) return;
                    const fp = fresh.player;

                    if (interaction.isStringSelectMenu() && interaction.customId === 'craftbook_category') {
                        const value = interaction.values[0];

                        if (value === 'overview') {
                            currentView = 'overview';
                            currentPage = 0;
                            selectedRecipeId = null;
                            const container = buildOverviewContainer(fp, recipes);
                            await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                        } else {
                            currentView = value;
                            currentPage = 0;
                            selectedRecipeId = null;
                            const container = buildCategoryContainer(value, fp, recipes, 0);
                            if (!container) { await interaction.deferUpdate(); return; }
                            await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                        }
                    } else if (interaction.isStringSelectMenu() && interaction.customId === 'craftbook_recipe_select') {
                        const rid = interaction.values[0];
                        const recipe = GameData.recipes[rid];
                        if (!recipe) { await interaction.deferUpdate(); return; }

                        selectedRecipeId = rid;
                        const container = buildDetailContainer(rid, recipe, fp, recipes);
                        if (!container) { await interaction.deferUpdate(); return; }
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    } else if (interaction.customId.startsWith('craftbook_back_')) {
                        const typeKey = interaction.customId.replace('craftbook_back_', '');
                        currentView = typeKey;
                        currentPage = 0;
                        selectedRecipeId = null;
                        const container = buildCategoryContainer(typeKey, fp, recipes, 0);
                        if (!container) { await interaction.deferUpdate(); return; }
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    } else if (interaction.customId.startsWith('craftbook_page_')) {
                        const parts = interaction.customId.replace('craftbook_page_', '');
                        const lastUnderscore = parts.lastIndexOf('_');
                        const typeKey = parts.substring(0, lastUnderscore);
                        const page = parseInt(parts.substring(lastUnderscore + 1));
                        if (isNaN(page)) { await interaction.deferUpdate(); return; }

                        currentView = typeKey;
                        currentPage = page;
                        selectedRecipeId = null;
                        const container = buildCategoryContainer(typeKey, fp, recipes, page);
                        if (!container) { await interaction.deferUpdate(); return; }
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    } else {
                        await interaction.deferUpdate();
                    }
                } catch (error) {
                    console.error('Craftbook interaction error:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: `${emojis.error} An error occurred.`, ephemeral: true }).catch(() => {});
                    }
                }
            });

            collector.on('end', async () => {
                try {
                    const fresh = await CommandHelpers.validatePlayer(message.author.id, prefix);
                    if (!fresh.success) return;
                    const fp = fresh.player;

                    let finalContainer;
                    if (selectedRecipeId) {
                        const recipe = GameData.recipes[selectedRecipeId];
                        if (recipe) finalContainer = buildDetailContainer(selectedRecipeId, recipe, fp, recipes);
                    } else if (currentView !== 'overview') {
                        finalContainer = buildCategoryContainer(currentView, fp, recipes, currentPage);
                    } else {
                        finalContainer = buildOverviewContainer(fp, recipes);
                    }

                    if (finalContainer) {
                        finalContainer.components.forEach(component => {
                            if (component.components) {
                                component.components.forEach(inner => {
                                    if (inner.setDisabled) inner.setDisabled(true);
                                });
                            }
                        });
                        reply.edit({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                    }
                } catch {
                    // Silently fail — leave the message as-is
                }
            });

        } catch (error) {
            console.error('Craftbook command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem accessing your cookbook.')]
            });
        }
    }
};