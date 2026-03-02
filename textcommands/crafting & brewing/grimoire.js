
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

const GRIMOIRE_COLOR = 0x9B59B6;
const POTIONS_PER_PAGE = 5;

const RARITY_COLORS = {
    Common:    0x9CA3AF,
    Uncommon:  0x22C55E,
    Rare:      0x3B82F6,
    Epic:      0xA855F7,
    Legendary: 0xF59E0B,
    Mythic:    0xEF4444,
};

const EFFECT_ICONS = {
    heal:                '💚',
    stat_boost:          '📈',
    multi_boost:         '📊',
    special:             '✨',
    level_up:            '⬆️',
    resistance:          '🛡️',
    trade_boost:         '⚖️',
    familiar_type_boost: '🔧',
};

// ── Helpers ─────────────────────────────────────────────────────────

function rarityEmoji(rarity) {
    return emojis[rarity?.toLowerCase()] || config.emojis[rarity] || '';
}

function getPotionRecipes() {
    return Object.entries(GameData.recipes).filter(([, recipe]) => {
        const resultItem = GameData.getItem(recipe.result.itemId);
        return resultItem && resultItem.type === 'potion';
    });
}

function formatDuration(dur) {
    if (typeof dur === 'string') return dur.replace(/_/g, ' ');
    const totalMinutes = Math.round(dur / (60 * 1000));
    if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
    const hours = Math.round(totalMinutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

function formatEffect(potion) {
    if (!potion.effect) return null;
    const e = potion.effect;
    const icon = EFFECT_ICONS[e.type] || '🔮';

    if (e.type === 'heal') {
        return `${icon} Restores **${e.value}** HP`;
    } else if (e.type === 'stat_boost' || e.type === 'multi_boost') {
        const stats = Object.entries(e.stats).map(([stat, val]) =>
            `+${val} ${stat.toUpperCase()}`
        ).join(', ');
        return `${icon} ${stats} for **${formatDuration(e.duration)}**`;
    } else if (e.type === 'special') {
        return `${icon} ${e.ability.replace(/_/g, ' ')} for **${formatDuration(e.duration)}**`;
    } else if (e.type === 'level_up') {
        return `${icon} Instantly boosts pal level by **${e.value}**`;
    } else if (e.type === 'resistance') {
        return `${icon} **${e.value}%** ${e.element} resistance for **${formatDuration(e.duration)}**`;
    } else if (e.type === 'trade_boost') {
        const gains = Object.entries(e.gain).map(([s, v]) => `+${v} ${s.toUpperCase()}`).join(', ');
        const loses = Object.entries(e.lose).map(([s, v]) => `-${v} ${s.toUpperCase()}`).join(', ');
        return `${icon} ${gains} / ${loses} for **${formatDuration(e.duration)}**`;
    } else if (e.type === 'familiar_type_boost') {
        const stats = Object.entries(e.stats).map(([stat, val]) =>
            `+${val} ${stat.toUpperCase()}`
        ).join(', ');
        return `${icon} ${stats} for **${e.target}** pals · **${formatDuration(e.duration)}**`;
    }
    return `${icon} Unknown effect`;
}

function groupByRarity(recipes) {
    const groups = {};
    for (const [rid, recipe] of recipes) {
        const potion = GameData.getItem(recipe.result.itemId);
        if (!potion) continue;
        const rarity = potion.rarity || 'Common';
        if (!groups[rarity]) groups[rarity] = [];
        groups[rarity].push([rid, recipe]);
    }
    return groups;
}

const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

// ── Text Builders ───────────────────────────────────────────────────

function buildOverviewText(player, recipes) {
    const total = recipes.length;
    const known = recipes.filter(([rid]) => player.grimoire.includes(rid)).length;

    let text = `# 📜 Potion Grimoire\n`;
    text += `-# Your collection of discovered potion recipes\n\n`;

    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    const filled = Math.round((known / total) * 10);
    const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
    text += `### 📊 Progress\n`;
    text += `${bar}  **${known}/${total}** recipes discovered · \`${pct}%\`\n\n`;

    const groups = groupByRarity(recipes);
    for (const rarity of RARITY_ORDER) {
        if (!groups[rarity]) continue;
        const rEmoji = rarityEmoji(rarity);
        const count = groups[rarity].length;
        const knownCount = groups[rarity].filter(([rid]) => player.grimoire.includes(rid)).length;
        text += `${rEmoji} **${rarity}** — ${knownCount}/${count} discovered\n`;
    }

    text += `\n-# Select a rarity below to browse potions`;
    return text;
}

function buildRarityText(rarity, player, recipes, page) {
    const rEmoji = rarityEmoji(rarity);
    const groups = groupByRarity(recipes);
    const rarityRecipes = groups[rarity];
    if (!rarityRecipes || rarityRecipes.length === 0) return null;

    const totalPages = Math.ceil(rarityRecipes.length / POTIONS_PER_PAGE);
    const start = page * POTIONS_PER_PAGE;
    const pageRecipes = rarityRecipes.slice(start, start + POTIONS_PER_PAGE);

    let text = `# ${rEmoji} ${rarity} Potions\n`;
    if (totalPages > 1) text += `-# Page ${page + 1}/${totalPages}\n`;
    text += `\n`;

    for (const [recipeId, recipe] of pageRecipes) {
        const potion = GameData.getItem(recipe.result.itemId);
        const isKnown = player.grimoire.includes(recipeId);
        const potionEmoji = CommandHelpers.getItemEmoji(recipe.result.itemId);
        const status = isKnown ? potionEmoji : '🔒';

        text += `${status} **${potion.name}**\n`;

        if (isKnown) {
            const effectStr = formatEffect(potion);
            if (effectStr) text += `-# ${effectStr}\n`;

            const ings = recipe.ingredients.map(ing => {
                const emoji = CommandHelpers.getItemEmoji(ing.itemId);
                return `${emoji}\`x${ing.quantity}\``;
            }).join(' ');
            text += `> 🧪 ${ings}\n`;
            text += `> ⚒️ Level ${recipe.level} · ✨ ${recipe.xp} XP\n`;
        } else {
            text += `-# Find recipe to unlock this potion!\n`;
        }
        text += `\n`;
    }

    return text;
}

function buildDetailText(recipeId, recipe, player) {
    const potion = GameData.getItem(recipe.result.itemId);
    if (!potion) return null;

    const isKnown = player.grimoire.includes(recipeId);
    const rEmoji = rarityEmoji(potion.rarity);
    const potionEmoji = CommandHelpers.getItemEmoji(recipe.result.itemId);

    let text = `# ${potionEmoji} ${potion.name}\n`;
    text += `-# ${potion.description}\n\n`;
    text += `${rEmoji} **${potion.rarity}** · 🧪 Potion · 📜 Brewing\n\n`;

    if (potion.effect) {
        text += `### 🔮 Effect\n`;
        const effectStr = formatEffect(potion);
        text += `${effectStr}\n\n`;
    }

    if (isKnown) {
        text += `### 🧪 Recipe\n`;
        const ings = recipe.ingredients.map(ing => {
            const emoji = CommandHelpers.getItemEmoji(ing.itemId);
            const name = GameData.getItem(ing.itemId)?.name || 'Unknown';
            return `${emoji} \`x${ing.quantity}\` ${name}`;
        }).join('\n');
        text += `${ings}\n\n`;
        text += `> ✨ **${recipe.xp} XP** · ⚒️ **Level ${recipe.level}** required\n`;
    } else {
        text += `### 🔒 Recipe Unknown\n`;
        text += `-# Find recipe to unlock this potion!\n`;
    }

    return text;
}

// ── Container Builders ──────────────────────────────────────────────

function buildOverviewContainer(player, recipes) {
    const container = new ContainerBuilder().setAccentColor(GRIMOIRE_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(buildOverviewText(player, recipes)));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(buildRaritySelect(recipes)));
    return container;
}

function buildRarityContainer(rarity, player, recipes, page = 0) {
    const text = buildRarityText(rarity, player, recipes, page);
    if (!text) return null;

    const color = RARITY_COLORS[rarity] || GRIMOIRE_COLOR;
    const groups = groupByRarity(recipes);
    const rarityRecipes = groups[rarity] || [];
    const totalPages = Math.ceil(rarityRecipes.length / POTIONS_PER_PAGE);

    const container = new ContainerBuilder().setAccentColor(color);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Rarity select
    container.addActionRowComponents(new ActionRowBuilder().addComponents(buildRaritySelect(recipes)));

    // Potion detail select (current page only)
    const start = page * POTIONS_PER_PAGE;
    const pageRecipes = rarityRecipes.slice(start, start + POTIONS_PER_PAGE);

    if (pageRecipes.length > 0) {
        const potionSelect = new StringSelectMenuBuilder()
            .setCustomId('grimoire_potion_select')
            .setPlaceholder('🔍 View potion details...');

        for (const [rid, recipe] of pageRecipes) {
            const potion = GameData.getItem(recipe.result.itemId);
            const isKnown = player.grimoire.includes(rid);
            potionSelect.addOptions({
                label: potion.name,
                description: isKnown ? `Lv ${recipe.level} · ${recipe.xp} XP` : '🔒 Undiscovered',
                value: rid,
                emoji: isKnown ? emojis.success : '🔒'
            });
        }
        container.addActionRowComponents(new ActionRowBuilder().addComponents(potionSelect));
    }

    // Page nav buttons
    if (totalPages > 1) {
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`grimoire_page_${rarity}_${page - 1}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emojis.previous)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('grimoire_pageinfo')
                    .setLabel(`${page + 1} / ${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`grimoire_page_${rarity}_${page + 1}`)
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
    const potion = GameData.getItem(recipe.result.itemId);
    const color = RARITY_COLORS[potion?.rarity] || GRIMOIRE_COLOR;
    const text = buildDetailText(recipeId, recipe, player);
    if (!text) return null;

    const container = new ContainerBuilder().setAccentColor(color);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(buildRaritySelect(recipes)));

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`grimoire_back_${potion.rarity}`)
                .setLabel(`Back to ${potion.rarity} Potions`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(emojis.previous)
        )
    );

    return container;
}

// ── Shared Select ───────────────────────────────────────────────────

function buildRaritySelect(recipes) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('grimoire_rarity')
        .setPlaceholder('📜 Browse Potion Rarities...')
        .addOptions({ label: 'Overview', description: 'View your grimoire progress', value: 'overview', emoji: '📜' });

    const groups = groupByRarity(recipes);
    for (const rarity of RARITY_ORDER) {
        if (!groups[rarity]) continue;
        select.addOptions({
            label: `${rarity} Potions (${groups[rarity].length})`,
            description: `Browse ${rarity.toLowerCase()} potion recipes`,
            value: rarity
        });
    }

    return select;
}

// ── Main Command ────────────────────────────────────────────────────

module.exports = {
    name: 'grimoire',
    description: 'View potion recipes in your magical grimoire.',
    usage: '[potion_name]',
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const recipes = getPotionRecipes();

            // ── Direct potion lookup ────────────────────────────
            if (args.length > 0) {
                const searchTerm = args.join(' ').toLowerCase().replace(/\s+/g, '_');

                const potionId = Object.keys(GameData.items).find(id =>
                    id.toLowerCase() === searchTerm ||
                    GameData.getItem(id)?.name?.toLowerCase().replace(/\s+/g, '_') === searchTerm
                );

                if (!potionId || GameData.getItem(potionId)?.type !== 'potion') {
                    return message.reply({
                        embeds: [createErrorEmbed('Potion Not Found', `Could not find a potion named "${args.join(' ')}".`)]
                    });
                }

                const recipeEntry = Object.entries(GameData.recipes).find(([, recipe]) =>
                    recipe.result.itemId === potionId
                );

                if (!recipeEntry) {
                    return message.reply({
                        embeds: [createErrorEmbed('No Recipe Found', `No recipe exists for ${GameData.getItem(potionId)?.name || 'Unknown'}.`)]
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

                    if (interaction.isStringSelectMenu() && interaction.customId === 'grimoire_rarity') {
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
                            const container = buildRarityContainer(value, fp, recipes, 0);
                            if (!container) { await interaction.deferUpdate(); return; }
                            await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                        }
                    } else if (interaction.isStringSelectMenu() && interaction.customId === 'grimoire_potion_select') {
                        const rid = interaction.values[0];
                        const recipe = GameData.recipes[rid];
                        if (!recipe) { await interaction.deferUpdate(); return; }

                        selectedRecipeId = rid;
                        const container = buildDetailContainer(rid, recipe, fp, recipes);
                        if (!container) { await interaction.deferUpdate(); return; }
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    } else if (interaction.customId.startsWith('grimoire_back_')) {
                        const rarity = interaction.customId.replace('grimoire_back_', '');
                        currentView = rarity;
                        currentPage = 0;
                        selectedRecipeId = null;
                        const container = buildRarityContainer(rarity, fp, recipes, 0);
                        if (!container) { await interaction.deferUpdate(); return; }
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    } else if (interaction.customId.startsWith('grimoire_page_')) {
                        const parts = interaction.customId.replace('grimoire_page_', '');
                        const lastUnderscore = parts.lastIndexOf('_');
                        const rarity = parts.substring(0, lastUnderscore);
                        const page = parseInt(parts.substring(lastUnderscore + 1));
                        if (isNaN(page)) { await interaction.deferUpdate(); return; }

                        currentView = rarity;
                        currentPage = page;
                        selectedRecipeId = null;
                        const container = buildRarityContainer(rarity, fp, recipes, page);
                        if (!container) { await interaction.deferUpdate(); return; }
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                    } else {
                        await interaction.deferUpdate();
                    }
                } catch (error) {
                    console.error('Grimoire interaction error:', error);
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
                        finalContainer = buildRarityContainer(currentView, fp, recipes, currentPage);
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
            console.error('Grimoire command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem accessing your grimoire.')]
            });
        }
    }
};