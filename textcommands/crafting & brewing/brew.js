const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");
const Player = require("../../models/Player");
const { createErrorEmbed } = require("../../utils/embed");
const { grantPlayerXp } = require("../../utils/leveling");
const GameData = require('../../utils/gameData');
const { updateQuestProgress } = require('../../utils/questSystem');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');
const config = require('../../config/config.json');
const e = require('../../utils/emojis');

const activeBrewingSessions = new Set();
const BASE_BREWING_SUCCESS_RATE = 0.70;
const CAULDRON_COLOR = 0x7C3AED; // Purple

// ── Input Validator ─────────────────────────────────────────────────

class BrewInputValidator {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/\s+/g, ' ').substring(0, 500);
    }

    static parseBrewInput(input, player, options = {}) {
        const sanitized = this.sanitizeInput(input);
        const maxBatch = options.maxBatch || 1;
        const currentSelection = options.currentSelection || {};
        let brewQuantity = options.currentQuantity || 1;

        if (!sanitized) {
            return { success: false, error: "Type ingredients in format: **quantity ingredient_name**\nExample: `2 moonpetal_herb, 1 crystal_shard`" };
        }

        let inputText = sanitized;

        const quantityMatch = inputText.match(/\s+x(\d+)$/i);
        if (quantityMatch) {
            brewQuantity = parseInt(quantityMatch[1]);
            if (isNaN(brewQuantity) || brewQuantity < 1 || brewQuantity > maxBatch) {
                return { success: false, error: `Brew quantity must be between **1** and **${maxBatch}**.` };
            }
            inputText = inputText.replace(/\s+x\d+$/i, '');
        }

        const inputParts = inputText.split(',').map(p => p.trim()).filter(p => p.length > 0);

        if (inputParts.length === 0 && !quantityMatch) {
            return { success: false, error: "Add at least **one ingredient** to start brewing." };
        }

        if (inputParts.length > 10) {
            return { success: false, error: "Too many ingredients — maximum **10** per recipe." };
        }

        const newIngredients = { ...currentSelection };

        for (const part of inputParts) {
            const result = this.parseIngredientPart(part, player);
            if (!result.success) return result;
            newIngredients[result.itemId] = (newIngredients[result.itemId] || 0) + result.quantity;
        }

        if (Object.keys(newIngredients).length > 10) {
            return { success: false, error: "Too many unique ingredients — maximum **10** per recipe." };
        }

        // Validate the entire combined selection against inventory
        for (const [itemId, totalQty] of Object.entries(newIngredients)) {
            const playerItem = player.inventory.find(item => item.itemId === itemId);
            const itemData = GameData.getItem(itemId);
            const totalNeeded = totalQty * brewQuantity;

            if (!playerItem || playerItem.quantity < totalNeeded) {
                const available = playerItem ? playerItem.quantity : 0;
                const emoji = CommandHelpers.getItemEmoji(itemId);
                let errorMsg = `**Not enough** ${emoji} ${itemData?.name || itemId}\n`;
                if (brewQuantity > 1) {
                    errorMsg += `Need total **${totalQty} x${brewQuantity} = ${totalNeeded}** — you have **${available}**`;
                } else {
                    errorMsg += `Need total **${totalQty}** — you have **${available}**`;
                }
                return { success: false, error: errorMsg };
            }
        }

        return { success: true, ingredients: newIngredients, brewQuantity };
    }

    static parseIngredientPart(part, player) {
        const match = part.match(/^(\d+)\s+(.+)$/);

        if (!match) {
            return { success: false, error: `**Invalid format:** \`${part}\`\nUse: \`quantity ingredient_name\` (e.g. \`2 moonpetal_herb\`)` };
        }

        const quantity = parseInt(match[1]);
        const itemNameInput = match[2].trim();

        if (isNaN(quantity) || quantity < 1 || quantity > 99) {
            return { success: false, error: `**Bad quantity** for \`${itemNameInput}\` — must be between **1** and **99**.` };
        }

        const itemResult = this.findIngredientItem(itemNameInput);
        if (!itemResult.success) return itemResult;

        const materialTypes = ["crafting_material", "ingredient"];
        const itemData = GameData.getItem(itemResult.itemId);
        if (!itemData || !materialTypes.includes(itemData.type)) {
            return { success: false, error: `**${itemData?.name || itemNameInput}** isn't a brewing ingredient.` };
        }

        return { success: true, itemId: itemResult.itemId, quantity };
    }

    static findIngredientItem(input) {
        const searchTerm = input.toLowerCase().replace(/\s+/g, '_');

        if (GameData.items[searchTerm]) return { success: true, itemId: searchTerm };

        const itemId = Object.keys(GameData.items).find(id => {
            const item = GameData.getItem(id);
            if (!item) return false;
            const normalizedItemName = item.name.toLowerCase().replace(/\s+/g, '_');
            return normalizedItemName === searchTerm || id.toLowerCase() === searchTerm;
        });

        if (itemId) return { success: true, itemId };

        const partialMatch = Object.keys(GameData.items).find(id => {
            const item = GameData.getItem(id);
            if (!item) return false;
            const normalizedItemName = item.name.toLowerCase().replace(/\s+/g, '_');
            return normalizedItemName.includes(searchTerm) ||
                   searchTerm.includes(normalizedItemName.substring(0, 4));
        });

        if (partialMatch) return { success: true, itemId: partialMatch };

        return { success: false, error: `**Ingredient not found:** \`${input}\`\nCheck spelling or use \`forage\` to gather more ingredients.` };
    }
}

// ── Recipe Handler ──────────────────────────────────────────────────

class RecipeHandler {
    static hasRecipeUnlocked(player, recipeId) {
        return player.grimoire && player.grimoire.includes(recipeId);
    }

    static findMatchingRecipe(ingredients, player) {
        let bestMatch = null;
        let bestMatchId = null;

        for (const [recipeId, recipeData] of Object.entries(GameData.recipes)) {
            if (!this.hasRecipeUnlocked(player, recipeId)) continue;

            const requiredIngredients = recipeData.ingredients.reduce((acc, ing) => {
                acc[ing.itemId] = ing.quantity;
                return acc;
            }, {});

            if (this.isExactMatch(ingredients, requiredIngredients)) {
                bestMatch = recipeData;
                bestMatchId = recipeId;
                break;
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

    static getAvailableRecipes(player) {
        return player.grimoire || [];
    }
}

function calculateSuccessRate(labEffects) {
    let successRate = BASE_BREWING_SUCCESS_RATE;
    if (labEffects?.successRateBonus) {
        successRate += labEffects.successRateBonus;
    }
    return Math.min(successRate, 1.0);
}

// ── Text Builders ───────────────────────────────────────────────────

function buildCauldronText(player, selectedIngredients, brewQuantity, successRate, maxBatch, labEffects, prefix) {
    const availableRecipes = RecipeHandler.getAvailableRecipes(player);
    const dustEmoji = config.emojis.arcaneDust || '✨';

    let text = `# ⚗️ Alchemist's Cauldron\n`;
    text += `-# Type ingredients below to brew potions\n\n`;

    // Stats row
    text += `### 📊 Brewing Stats\n`;
    text += `> 📚 **${availableRecipes.length}** known recipe${availableRecipes.length !== 1 ? 's' : ''}`;
    text += ` · ${e.success} **${(successRate * 100).toFixed(0)}%** success rate`;
    if (labEffects?.successRateBonus) {
        text += ` (+${(labEffects.successRateBonus * 100).toFixed(0)}% lab)`;
    }
    if (maxBatch > 1) {
        text += `\n> 📦 Batch: up to **x${maxBatch}** per brew`;
    }
    text += `\n\n`;

    // Input format
    if (maxBatch > 1) {
        text += `### 📝 Multiple Brewing\n`;
        text += `> Add \`x3\` at end → Eg: 2 moonpetal_herb, 1 crystal_shard \`x3\` to brew 3x at a time\n`;
        text += `\n`;
    }

    if (Object.keys(selectedIngredients).length > 0) {
        text += `### 🧪 Selected Ingredients\n`;
        for (const [itemId, qty] of Object.entries(selectedIngredients)) {
            const itemData = GameData.getItem(itemId);
            const emoji = CommandHelpers.getItemEmoji(itemId);
            text += `> ${emoji} **${itemData.name}** x${qty}`;
            if (brewQuantity > 1) text += ` (x${brewQuantity} = ${qty * brewQuantity} total)`;
            text += `\n`;
        }

        if (brewQuantity > 1) {
            text += `> 📦 **Batch:** x${brewQuantity}\n`;
        }

        const matchResult = RecipeHandler.findMatchingRecipe(selectedIngredients, player);
        if (matchResult.hasMatch) {
            const resultItem = GameData.getItem(matchResult.recipe.result.itemId);
            const resultEmoji = CommandHelpers.getItemEmoji(matchResult.recipe.result.itemId);
            const totalQty = matchResult.recipe.result.quantity * brewQuantity;
            text += `\n${e.success} **Recipe Match!**\n`;
            text += `> Will brew: ${resultEmoji} **${resultItem.name}** x${totalQty}\n`;
            text += `> Success chance: **${(successRate * 100).toFixed(0)}%** per brew\n`;
        } else {
            text += `\n${e.error} **Ingredients do not match any of your known recipes**\n`;
            text += `> Use \`${prefix}research\` to discover more recipes\n`;
        }
    }

    return text;
}

function buildBrewResultText(resultItemData, resultEmoji, successfulBrews, failedBrews, totalDust, brewQuantity, successRate) {
    const dustEmoji = config.emojis.arcaneDust || '✨';

    if (successfulBrews > 0 && failedBrews > 0) {
        // Mixed results
        const totalQty = resultItemData.quantity * successfulBrews;
        let text = `# ⚗️ Brewing Complete\n`;
        text += `-# Mixed results...\n\n`;
        text += `### 📊 Results\n`;
        text += `> ${e.success} **${successfulBrews}** successful · ${e.error} **${failedBrews}** failed\n\n`;
        text += `> ${resultEmoji} **+${totalQty}x ${resultItemData.name}**\n`;
        text += `> ${dustEmoji} **+${totalDust}** Arcane Dust *(from failures)*\n`;
        return text;
    } else if (successfulBrews > 0) {
        const totalQty = resultItemData.quantity * successfulBrews;
        let text = `## ${e.success} Brewing Success!\n\n`;
        text += `### ${resultEmoji} ${resultItemData.name}\n`;
        text += `> Brewed **x${totalQty}** successfully!`;
        if (brewQuantity > 1) text += ` (${successfulBrews} batches)`;
        text += `\n`;
        return text;
    } else {
        let text = `# ${e.error} Brewing Failed!\n\n`;
        text += `All **${failedBrews}** attempt${failedBrews > 1 ? 's' : ''} failed — the ingredients fizzled.\n\n`;
        text += `> ${dustEmoji} Salvaged **${totalDust} Arcane Dust**\n`;
        return text;
    }
}

// ── Container Builders ──────────────────────────────────────────────

function buildCauldronContainer(player, selectedIngredients, brewQuantity, successRate, maxBatch, labEffects, prefix) {
    const container = new ContainerBuilder().setAccentColor(CAULDRON_COLOR);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            buildCauldronText(player, selectedIngredients, brewQuantity, successRate, maxBatch, labEffects, prefix)
        )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const hasIngredients = Object.keys(selectedIngredients).length > 0;
    const hasRecipeMatch = hasIngredients && RecipeHandler.findMatchingRecipe(selectedIngredients, player).hasMatch;

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("brew_confirm")
                .setLabel("Brew")
                .setStyle(ButtonStyle.Success)
                .setEmoji("⚗️")
                .setDisabled(!hasRecipeMatch),
            new ButtonBuilder()
                .setCustomId("brew_clear")
                .setLabel("Clear")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.reload)
                .setDisabled(!hasIngredients),
            new ButtonBuilder()
                .setCustomId("brew_cancel")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setEmoji(e.error)
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# •  Type ingredients in chat to add them  •  \`${prefix}grimoire\` to see known recipes`
        )
    );

    return container;
}

function buildResultContainer(text, color) {
    const container = new ContainerBuilder().setAccentColor(color || CAULDRON_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return container;
}

// ── Main Command ────────────────────────────────────────────────────

module.exports = {
    name: "brew",
    description: "Brew potions and craft items in the alchemist's cauldron.",
    cooldown: 10,
    async execute(message, args, client, prefix) {
        try {
            if (activeBrewingSessions.has(message.author.id)) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        "Already Brewing",
                        "You already have an active brewing session!\nFinish or cancel it first."
                    )]
                });
            }

            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) return message.reply({ embeds: [playerResult.embed] });
            const player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;
            const maxBatch = LabManager.getMaxBrewBatch(labEffects);
            const successRate = calculateSuccessRate(labEffects);

            // Check ingredients
            const materialTypes = ["crafting_material", "ingredient"];
            const hasIngredients = player.inventory.some(item => {
                const itemData = GameData.getItem(item.itemId);
                return itemData && materialTypes.includes(itemData.type);
            });

            if (!hasIngredients) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        "No Ingredients",
                        `You don't have any brewing ingredients!\n\n> 🏔️ Use \`${prefix}forage\` to gather ingredients\n> ⚔️ Clear dungeons for rare drops`
                    )]
                });
            }

            // Check recipes
            const availableRecipes = RecipeHandler.getAvailableRecipes(player);
            if (availableRecipes.length === 0) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        "No Recipes Known",
                        `You don't know any brewing recipes yet!\n\n> 🔬 Use \`${prefix}research\` to discover recipes\n> 🏪 Buy recipe scrolls from the \`${prefix}shop\``
                    )]
                });
            }

            activeBrewingSessions.add(message.author.id);

            let selectedIngredients = {};
            let brewQuantity = 1;

            const reply = await message.reply({
                components: [buildCauldronContainer(player, selectedIngredients, brewQuantity, successRate, maxBatch, labEffects, prefix)],
                flags: MessageFlags.IsComponentsV2
            });

            const messageCollector = message.channel.createMessageCollector({
                filter: (m) => m.author.id === message.author.id,
                time: 2 * 60 * 1000
            });

            const componentCollector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 2 * 60 * 1000
            });

            messageCollector.on("collect", async (m) => {
                if (m.content.toLowerCase().trim() === "cancel") {
                    activeBrewingSessions.delete(message.author.id);
                    const cancelContainer = buildResultContainer(
                        `## ${e.warning} Brewing Cancelled\nYou have cleared the cauldron.`,
                        0xF59E0B
                    );
                    await reply.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 });
                    messageCollector.stop();
                    componentCollector.stop('cancelled');
                    return;
                }

                const parseResult = BrewInputValidator.parseBrewInput(m.content, player, { 
                    maxBatch, 
                    currentSelection: selectedIngredients, 
                    currentQuantity: brewQuantity 
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

                selectedIngredients = parseResult.ingredients;
                brewQuantity = parseResult.brewQuantity;

                await reply.edit({
                    components: [buildCauldronContainer(player, selectedIngredients, brewQuantity, successRate, maxBatch, labEffects, prefix)],
                    flags: MessageFlags.IsComponentsV2
                });
            });

            componentCollector.on("collect", async (interaction) => {
                try {
                    if (!interaction.isButton()) return;

                    switch (interaction.customId) {
                        case "brew_clear":
                            selectedIngredients = {};
                            brewQuantity = 1;
                            await interaction.update({
                                components: [buildCauldronContainer(player, selectedIngredients, brewQuantity, successRate, maxBatch, labEffects, prefix)],
                                flags: MessageFlags.IsComponentsV2
                            });
                            break;

                        case "brew_cancel":
                            activeBrewingSessions.delete(message.author.id);
                            const cancelContainer = buildResultContainer(
                                `## ${e.warning} Brewing Cancelled\nYou have cleared the cauldron.`,
                                0xF59E0B
                            );
                            await interaction.update({
                                components: [cancelContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                            messageCollector.stop();
                            componentCollector.stop('cancelled');
                            break;

                        case "brew_confirm":
                            if (Object.keys(selectedIngredients).length === 0) return;

                            const matchResult = RecipeHandler.findMatchingRecipe(selectedIngredients, player);
                            if (!matchResult.hasMatch) return; // safety fallback

                            const brewResult = await this.executeBrewing(
                                player, selectedIngredients, brewQuantity,
                                matchResult, client, message, labEffects, successRate
                            );

                            try {
                                await interaction.update({
                                    components: [brewResult.container],
                                    flags: MessageFlags.IsComponentsV2
                                });
                            } catch (err) {
                                if (err.code === 10062) {
                                    await reply.edit({
                                        components: [brewResult.container],
                                        flags: MessageFlags.IsComponentsV2
                                    }).catch(() => {});
                                }
                            }

                            activeBrewingSessions.delete(message.author.id);
                            messageCollector.stop();
                            componentCollector.stop('brew_done');
                            break;
                    }
                } catch (error) {
                    console.error('Brew interaction error:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: `${e.error} An error occurred.`, ephemeral: true }).catch(() => {});
                    }
                }
            });


            componentCollector.on("end", (collected, reason) => {
                // Skip timeout edit if session was resolved (confirm, cancel, etc.)
                if (!['brew_done', 'cancelled'].includes(reason)) {
                    const timeoutContainer = buildResultContainer(
                        `## ${e.warning} Brewing Timed Out\nYour session has expired. Use \`${prefix}brew\` to start again.`,
                        0xF59E0B
                    );
                    reply.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                }
                activeBrewingSessions.delete(message.author.id);
                messageCollector.stop();
            });

        } catch (error) {
            console.error("Brew command error:", error);
            activeBrewingSessions.delete(message.author.id);
            if (message.replied || message.deferred) {
                message.followUp({ embeds: [createErrorEmbed("An Error Occurred", "There was a problem with your brewing session.")] }).catch(() => {});
            } else {
                message.reply({ embeds: [createErrorEmbed("An Error Occurred", "There was a problem with your brewing session.")] }).catch(() => {});
            }
        }
    },

    async executeBrewing(player, ingredients, brewQuantity, matchResult, client, message, labEffects = null, successRate = BASE_BREWING_SUCCESS_RATE) {
        try {
            const recipe = matchResult.recipe;
            const recipeId = matchResult.recipeId;

            let successfulBrews = 0;
            let failedBrews = 0;

            // Tutorial override: first brew always succeeds
            const effectiveRate = (player.tutorialStep === 5) ? 1.0 : successRate;

            for (let i = 0; i < brewQuantity; i++) {
                if (Math.random() < effectiveRate) {
                    successfulBrews++;
                } else {
                    failedBrews++;
                }
            }

            player.stats.potionsBrewed = (player.stats.potionsBrewed || 0) + successfulBrews;

            const totalXp = recipe.xp * successfulBrews;

            // Ensure recipe is in grimoire
            if (!player.grimoire.includes(recipeId)) {
                player.grimoire.push(recipeId);
            }

            // Consume all ingredients
            recipe.ingredients.forEach(ing => {
                const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                if (playerItem) playerItem.quantity -= ing.quantity * brewQuantity;
            });

            // Ingredient save chance for failures
            if (failedBrews > 0 && labEffects?.ingredientSaveChance) {
                recipe.ingredients.forEach(ing => {
                    for (let i = 0; i < failedBrews; i++) {
                        if (Math.random() < labEffects.ingredientSaveChance) {
                            const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                            if (playerItem) {
                                playerItem.quantity += ing.quantity;
                            } else {
                                player.inventory.push({ itemId: ing.itemId, quantity: ing.quantity });
                            }
                        }
                    }
                });
            }

            // Add result items
            if (successfulBrews > 0) {
                let totalResultQuantity = recipe.result.quantity * successfulBrews;
                const resultItem = player.inventory.find(item => item.itemId === recipe.result.itemId);
                if (resultItem) {
                    resultItem.quantity += totalResultQuantity;
                } else {
                    player.inventory.push({ itemId: recipe.result.itemId, quantity: totalResultQuantity });
                }

                for (let i = 0; i < successfulBrews; i++) {
                    client.emit("potionBrewed", message.author.id);
                    await updateQuestProgress(message.author.id, 'brew_potions', 1, message);
                }
            }

            // Grant arcane dust for failures
            let totalDust = 0;
            if (failedBrews > 0) {
                totalDust = Object.keys(ingredients).length * failedBrews;
                player.arcaneDust = (player.arcaneDust || 0) + totalDust;
            }

            player.inventory = player.inventory.filter(item => item.quantity > 0);

            if (totalXp > 0) {
                await grantPlayerXp(client, message, player, totalXp, { labEffects });
            }

            await player.save();

            // Build result
            const resultItemData = GameData.getItem(recipe.result.itemId);
            const resultEmoji = CommandHelpers.getItemEmoji(recipe.result.itemId);
            const text = buildBrewResultText(
                { ...resultItemData, quantity: recipe.result.quantity },
                resultEmoji,
                successfulBrews, failedBrews, totalDust, brewQuantity, successRate
            );

            let color = 0x22C55E; // green
            if (successfulBrews > 0 && failedBrews > 0) color = 0xF59E0B; // amber
            else if (failedBrews > 0) color = 0xEF4444; // red

            return { container: buildResultContainer(text, color) };

        } catch (error) {
            console.error("Execute brewing error:", error);
            const text = `# ${e.error} Brewing Error\nAn error occurred during brewing. Please try again.`;
            return { container: buildResultContainer(text, 0xEF4444) };
        }
    }
};