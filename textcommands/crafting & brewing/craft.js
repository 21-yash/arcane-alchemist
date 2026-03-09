const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");
const { createErrorEmbed } = require("../../utils/embed");
const { grantPlayerXp } = require("../../utils/leveling");
const GameData = require('../../utils/gameData');
const { updateQuestProgress } = require('../../utils/questSystem');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');
const config = require('../../config/config.json');
const e = require('../../utils/emojis');

const activeCraftingSessions = new Set();
const WORKSHOP_COLOR = 0xD97706; // Amber

// ── Input Validator ─────────────────────────────────────────────────

class CraftInputValidator {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/\s+/g, ' ').substring(0, 500);
    }

    static parseCraftInput(input, player, options = {}) {
        const sanitized = this.sanitizeInput(input);
        const currentSelection = options.currentSelection || {};

        if (!sanitized) {
            return { success: false, error: "Type materials in format: **quantity material_name**\nExample: `5 iron_ore, 3 crystal_shard`" };
        }

        const inputParts = sanitized.split(',').map(p => p.trim()).filter(p => p.length > 0);

        if (inputParts.length === 0) {
            return { success: false, error: "Add at least **one material** to start crafting." };
        }

        const newMaterials = { ...currentSelection };

        for (const part of inputParts) {
            const result = this.parseMaterialPart(part, player);
            if (!result.success) return result;
            newMaterials[result.itemId] = (newMaterials[result.itemId] || 0) + result.quantity;
        }

        if (Object.keys(newMaterials).length > 10) {
            return { success: false, error: "Too many unique materials — maximum **10** per recipe." };
        }

        // Validate the entire combined selection against inventory
        for (const [itemId, totalQty] of Object.entries(newMaterials)) {
            const playerItem = player.inventory.find(item => item.itemId === itemId);
            const itemData = CommandHelpers.getItemData(itemId);

            if (!playerItem || playerItem.quantity < totalQty) {
                const available = playerItem ? playerItem.quantity : 0;
                const emoji = CommandHelpers.getItemEmoji(itemId);
                return { success: false, error: `**Not enough** ${emoji} ${itemData?.name || itemId}\nNeed total **${totalQty}** — you have **${available}**` };
            }
        }

        return { success: true, materials: newMaterials };
    }

    static parseMaterialPart(part, player) {
        const match = part.match(/^(\d+)\s+(.+)$/);

        if (!match) {
            return { success: false, error: `**Invalid format:** \`${part}\`\nUse: \`quantity material_name\` (e.g. \`5 iron_ore\`)` };
        }

        const quantity = parseInt(match[1]);
        const itemNameInput = match[2].trim();

        if (isNaN(quantity) || quantity < 1 || quantity > 99) {
            return { success: false, error: `**Bad quantity** for \`${itemNameInput}\` — must be between **1** and **99**.` };
        }

        const itemResult = this.findCraftingMaterial(itemNameInput);
        if (!itemResult.success) return itemResult;

        const materialTypes = ["crafting_material", "ingredient"];
        const itemData = CommandHelpers.getItemData(itemResult.itemId);
        if (!itemData || !materialTypes.includes(itemData.type)) {
            return { success: false, error: `**${itemData?.name || itemNameInput}** isn't a crafting material.` };
        }

        return { success: true, itemId: itemResult.itemId, quantity };
    }

    static findCraftingMaterial(input) {
        const searchTerm = input.toLowerCase().replace(/\s+/g, '_');

        if (GameData.items[searchTerm]) {
            return { success: true, itemId: searchTerm };
        }

        const itemId = Object.keys(GameData.items).find(id => {
            const item = CommandHelpers.getItemData(id);
            if (!item) return false;
            const normalizedItemName = item.name.toLowerCase().replace(/\s+/g, '_');
            return normalizedItemName === searchTerm || id.toLowerCase() === searchTerm;
        });

        if (itemId) return { success: true, itemId };

        const partialMatch = Object.keys(GameData.items).find(id => {
            const item = CommandHelpers.getItemData(id);
            if (!item) return false;
            const normalizedItemName = item.name.toLowerCase().replace(/\s+/g, '_');
            return normalizedItemName.includes(searchTerm) ||
                   searchTerm.includes(normalizedItemName.substring(0, 4));
        });

        if (partialMatch) return { success: true, itemId: partialMatch };

        return { success: false, error: `**Material not found:** \`${input}\`\nCheck spelling or explore dungeons to find new materials.` };
    }
}

// ── Recipe Handler ──────────────────────────────────────────────────

class CraftingRecipeHandler {
    static hasRecipeUnlocked(player, recipeId) {
        return player.craftingJournal && player.craftingJournal.includes(recipeId);
    }

    static findMatchingRecipe(materials, player) {
        let bestMatch = null;
        let bestMatchId = null;

        for (const [recipeId, recipeData] of Object.entries(GameData.recipes)) {
            const resultItem = CommandHelpers.getItemData(recipeData.result.itemId);
            if (!resultItem || resultItem.source !== "crafting") continue;

            // Exchangeable recipes can be crafted without research
            if (!recipeData.exchangeable && !this.hasRecipeUnlocked(player, recipeId)) {
                continue;
            }

            const requiredMaterials = recipeData.ingredients.reduce((acc, ing) => {
                acc[ing.itemId] = ing.quantity;
                return acc;
            }, {});

            if (this.isExactMatch(materials, requiredMaterials)) {
                const hasEnough = recipeData.ingredients.every(ing => {
                    const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                    return playerItem && playerItem.quantity >= ing.quantity;
                });

                if (hasEnough) {
                    bestMatch = recipeData;
                    bestMatchId = recipeId;
                    break;
                }
            }
        }

        return { recipe: bestMatch, recipeId: bestMatchId, hasMatch: bestMatch !== null };
    }

    static isExactMatch(submitted, required) {
        const submittedKeys = Object.keys(submitted).sort();
        const requiredKeys = Object.keys(required).sort();

        if (submittedKeys.length !== requiredKeys.length) return false;
        return requiredKeys.every(itemId => submitted[itemId] === required[itemId]);
    }

    static getAvailableCraftingRecipes(player) {
        const craftingRecipes = [];

        for (const [recipeId, recipeData] of Object.entries(GameData.recipes)) {
            const resultItem = CommandHelpers.getItemData(recipeData.result.itemId);
            if (resultItem && resultItem.source === "crafting") {
                craftingRecipes.push({ id: recipeId, ...recipeData, resultItem });
            }
        }

        return craftingRecipes;
    }

    static getKnownCraftingRecipes(player) {
        if (!player.craftingJournal) return [];

        return player.craftingJournal
            .map(recipeId => {
                const recipe = GameData.recipes[recipeId];
                if (!recipe) return null;
                const resultItem = CommandHelpers.getItemData(recipe.result.itemId);
                if (!resultItem || resultItem.source !== "crafting") return null;
                return { id: recipeId, ...recipe, resultItem };
            })
            .filter(Boolean);
    }
}

// ── Text Builders ───────────────────────────────────────────────────

function buildWorkshopText(player, selectedMaterials, prefix) {
    const knownRecipes = CraftingRecipeHandler.getKnownCraftingRecipes(player);
    const exchangeableCount = Object.values(GameData.recipes).filter(r => r.exchangeable).length;

    let text = `# ⚒️ Craftsman's Workshop\n`;
    text += `-# Type materials below to start crafting\n\n`;

    text += `### 📖 Recipe Book\n`;
    text += `> 📜 **${knownRecipes.length}** known recipe${knownRecipes.length !== 1 ? 's' : ''}`;
    if (exchangeableCount > 0) {
        text += ` · 🔄 **${exchangeableCount}** exchange recipe${exchangeableCount !== 1 ? 's' : ''}`;
    }
    text += `\n\n`;

    if (Object.keys(selectedMaterials).length > 0) {
        text += `### 🧪 Selected Materials\n`;
        for (const [itemId, qty] of Object.entries(selectedMaterials)) {
            const itemData = CommandHelpers.getItemData(itemId);
            const emoji = CommandHelpers.getItemEmoji(itemId);
            text += `> ${emoji} **${itemData.name}** x${qty}\n`;
        }

        const matchResult = CraftingRecipeHandler.findMatchingRecipe(selectedMaterials, player);
        if (matchResult.hasMatch) {
            const resultItem = CommandHelpers.getItemData(matchResult.recipe.result.itemId);
            const resultEmoji = CommandHelpers.getItemEmoji(matchResult.recipe.result.itemId);
            text += `\n${e.success} **Recipe Match!**\n`;
            text += `> Will create: ${resultEmoji} **${resultItem.name}** x${matchResult.recipe.result.quantity}\n`;
        } else {
            text += `\n${e.error} **Ingredients do not match any of your known recipes**\n`;
            text += `> Use \`${prefix}research\` to discover more recipes\n`;
        }
    }

    return text;
}

function buildResultText(resultItem, resultEmoji, quantity) {
    let text = `## ${e.success} Crafting Success!\n\n`;
    text += `### ${resultEmoji} ${resultItem.name}\n`;
    text += `> Crafted **x${quantity}** successfully!\n`;
    return text;
}

function buildFailText(prefix) {
    let text = `# ${e.error} Unknown Recipe\n\n`;
    text += `This combination doesn't match any of your known recipes.\n\n`;
    text += `> 📖 Check your **Craftbook** for available recipes\n`;
    text += `> 🔬 Use \`${prefix}research\` to discover new ones\n`;
    return text;
}

// ── Container Builders ──────────────────────────────────────────────

function buildWorkshopContainer(player, selectedMaterials, prefix) {
    const container = new ContainerBuilder().setAccentColor(WORKSHOP_COLOR);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(buildWorkshopText(player, selectedMaterials, prefix))
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const hasMaterials = Object.keys(selectedMaterials).length > 0;
    const hasRecipeMatch = hasMaterials && CraftingRecipeHandler.findMatchingRecipe(selectedMaterials, player).hasMatch;

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("craft_confirm")
                .setLabel("Craft")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🔨")
                .setDisabled(!hasRecipeMatch),
            new ButtonBuilder()
                .setCustomId("craft_clear")
                .setLabel("Clear")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.reload)
                .setDisabled(!hasMaterials),
            new ButtonBuilder()
                .setCustomId("craft_cancel")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setEmoji(e.error)
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# •  Type materials in chat to add them  •  \`${prefix}craftbook\` to see known recipes`
        )
    );

    return container;
}

function buildResultContainer(text, color) {
    const container = new ContainerBuilder().setAccentColor(color || WORKSHOP_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return container;
}

// ── Main Command ────────────────────────────────────────────────────

module.exports = {
    name: "craft",
    description: "Craft equipment and items at the workshop.",
    aliases: ['workbench', 'workshop'],
    cooldown: 10,
    async execute(message, args, client, prefix) {
        try {
            const sessionCheck = CommandHelpers.checkActiveSession(activeCraftingSessions, message.author.id, 'Crafting');
            if (sessionCheck.isActive) {
                return message.reply({ embeds: [sessionCheck.embed] });
            }

            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;

            const materials = CommandHelpers.getPlayerMaterials(player);
            if (materials.length === 0) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        "No Materials",
                        `You don't have any crafting materials yet!\n\n> 🏔️ Use \`${prefix}forage\` to gather ingredients\n> ⚔️ Clear dungeons for rare drops`
                    )]
                });
            }

            activeCraftingSessions.add(message.author.id);

            let selectedMaterials = {};

            const reply = await message.reply({
                components: [buildWorkshopContainer(player, selectedMaterials, prefix)],
                flags: MessageFlags.IsComponentsV2
            });

            // Message collector for text input
            const messageCollector = message.channel.createMessageCollector({
                filter: (m) => m.author.id === message.author.id,
                time: 2 * 60 * 1000
            });

            // Component collector for buttons
            const componentCollector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 2 * 60 * 1000
            });

            messageCollector.on("collect", async (m) => {
                if (m.content.toLowerCase().trim() === "cancel") {
                    activeCraftingSessions.delete(message.author.id);
                    const cancelContainer = buildResultContainer(
                        `## ${e.warning} Crafting Cancelled\nYou have cleared the workbench.`,
                        0xF59E0B
                    );
                    await reply.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 });
                    messageCollector.stop();
                    componentCollector.stop('cancelled');
                    return;
                }

                const parseResult = CraftInputValidator.parseCraftInput(m.content, player, { 
                    currentSelection: selectedMaterials 
                });

                if (!parseResult.success) {
                    if (parseResult.error && parseResult.error.startsWith("**Invalid format:**")) return;

                    const errContainer = new ContainerBuilder().setAccentColor(0xEF4444);
                    errContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${e.error} ${parseResult.error}`)
                    );
                    await m.reply({
                        components: [errContainer],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { repliedUser: false }
                    });
                    return;
                }

                selectedMaterials = parseResult.materials;

                await reply.edit({
                    components: [buildWorkshopContainer(player, selectedMaterials, prefix)],
                    flags: MessageFlags.IsComponentsV2
                });
            });

            componentCollector.on("collect", async (interaction) => {
                try {
                    if (!interaction.isButton()) return;

                    switch (interaction.customId) {
                        case "craft_clear":
                            selectedMaterials = {};
                            await interaction.update({
                                components: [buildWorkshopContainer(player, selectedMaterials, prefix)],
                                flags: MessageFlags.IsComponentsV2
                            });
                            break;

                        case "craft_cancel":
                            activeCraftingSessions.delete(message.author.id);
                            const cancelContainer = buildResultContainer(
                                `## ${e.warning} Crafting Cancelled\nYou have cleared the workbench.`,
                                0xF59E0B
                            );
                            await interaction.update({
                                components: [cancelContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                            messageCollector.stop();
                            componentCollector.stop('cancelled');
                            break;

                        case "craft_confirm":
                            if (Object.keys(selectedMaterials).length === 0) return;

                            const matchResult = CraftingRecipeHandler.findMatchingRecipe(selectedMaterials, player);
                            if (!matchResult.hasMatch) return; // safety fallback

                            const craftResult = await this.executeCrafting(
                                player, selectedMaterials, matchResult, client, message, labEffects
                            );

                            await interaction.update({
                                components: [craftResult.container],
                                flags: MessageFlags.IsComponentsV2
                            });

                            activeCraftingSessions.delete(message.author.id);
                            messageCollector.stop();
                            componentCollector.stop('craft_done');
                            break;
                    }
                } catch (error) {
                    console.error('Craft interaction error:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: `${e.error} An error occurred.`, ephemeral: true }).catch(() => {});
                    }
                }
            });


            componentCollector.on("end", (collected, reason) => {
                // Skip timeout edit if session was resolved (confirm, cancel, etc.)
                if (!['craft_done', 'cancelled'].includes(reason)) {
                    const timeoutContainer = buildResultContainer(
                        `## ${e.warning} Crafting Timed Out\nYour session has expired. Use \`${prefix}craft\` to start again.`,
                        0xF59E0B
                    );
                    reply.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                }
                activeCraftingSessions.delete(message.author.id);
                messageCollector.stop();
            });

        } catch (error) {
            console.error("Craft command error:", error);
            activeCraftingSessions.delete(message.author.id);
            await CommandHelpers.handleCommandError(error, 'Craft', message);
        }
    },

    async executeCrafting(player, materials, matchResult, client, message, labEffects = null) {
        try {
            if (matchResult.hasMatch) {
                const recipe = matchResult.recipe;
                const recipeId = matchResult.recipeId;

                player.stats.itemsCrafted = (player.stats.itemsCrafted || 0) + 1;

                // Consume materials
                recipe.ingredients.forEach(ing => {
                    const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                    if (playerItem) playerItem.quantity -= ing.quantity;
                });

                // Add result
                CommandHelpers.addItemsToInventory(player, [{
                    itemId: recipe.result.itemId,
                    quantity: recipe.result.quantity
                }]);

                // Clean empty slots
                player.inventory = player.inventory.filter(item => item.quantity > 0);

                // Grant XP
                await grantPlayerXp(client, message, player, recipe.xp, { labEffects });
                await player.save();

                // Events
                client.emit("itemCrafted", message.author.id, recipe.result.itemId);
                await updateQuestProgress(message.author.id, 'craft_items', 1, message);

                const resultItemData = CommandHelpers.getItemData(recipe.result.itemId);
                const resultEmoji = CommandHelpers.getItemEmoji(recipe.result.itemId);
                const text = buildResultText(resultItemData, resultEmoji, recipe.result.quantity);
                return { container: buildResultContainer(text, 0x22C55E) };

            } else {
                const prefix = message.client?.prefix || 'aa!';
                const text = buildFailText(prefix);
                return { container: buildResultContainer(text, 0xEF4444) };
            }

        } catch (error) {
            console.error("Execute crafting error:", error);
            const text = `# ${e.error} Crafting Error\nAn error occurred during crafting. Please try again.`;
            return { container: buildResultContainer(text, 0xEF4444) };
        }
    }
};