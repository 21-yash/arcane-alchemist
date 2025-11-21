const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Player = require("../../models/Player");
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require("../../utils/embed");
const { grantPlayerXp } = require("../../utils/leveling");
const GameData = require('../../utils/gameData');
const { updateQuestProgress } = require('../../utils/questSystem');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');

const activeBrewingSessions = new Set();

// Base success rate for brewing (70%)
const BASE_BREWING_SUCCESS_RATE = 0.70;

/**
 * Input sanitizer and validator
 */
class BrewInputValidator {
    /**
     * Sanitize user input text
     * @param {string} input - Raw user input
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        // Remove excessive whitespace and normalize
        return input
            .trim()
            .replace(/\s+/g, ' ')
            .substring(0, 500); // Limit input length
    }

    /**
     * Validate and parse brewing input
     * @param {string} input - User input string
     * @param {Object} player - Player object
     * @returns {Object} Validation result
     */
    static parseBrewInput(input, player, options = {}) {
        const sanitized = this.sanitizeInput(input);
        const maxBatch = options.maxBatch || 1;
        
        if (!sanitized) {
            return {
                success: false,
                error: "Please provide ingredients to brew with."
            };
        }

        let inputText = sanitized;
        let brewQuantity = 1;
        
        // Extract quantity multiplier (x2, x3, etc.)
        const quantityMatch = inputText.match(/\s+x(\d+)$/i);
        if (quantityMatch) {
            brewQuantity = parseInt(quantityMatch[1]);
            if (isNaN(brewQuantity) || brewQuantity < 1 || brewQuantity > maxBatch) {
                return {
                    success: false,
                    error: `Brew quantity must be between 1 and ${maxBatch}.`
                };
            }
            inputText = inputText.replace(/\s+x\d+$/i, '');
        }

        // Parse ingredient parts
        const inputParts = inputText
            .split(',')
            .map(part => part.trim())
            .filter(part => part.length > 0);

        if (inputParts.length === 0) {
            return {
                success: false,
                error: "Please provide at least one ingredient."
            };
        }

        if (inputParts.length > 10) {
            return {
                success: false,
                error: "Too many ingredients. Maximum 10 ingredients allowed."
            };
        }

        const ingredients = {};
        
        for (const part of inputParts) {
            const result = this.parseIngredientPart(part, player, brewQuantity);
            if (!result.success) {
                return result;
            }
            ingredients[result.itemId] = result.quantity;
        }

        return {
            success: true,
            ingredients,
            brewQuantity
        };
    }

    /**
     * Parse a single ingredient part
     * @param {string} part - Single ingredient string
     * @param {Object} player - Player object
     * @param {number} brewQuantity - Number of brewing attempts
     * @returns {Object} Parse result
     */
    static parseIngredientPart(part, player, brewQuantity) {
        // Match pattern: "number ingredient_name" or "number ingredient name"
        const match = part.match(/^(\d+)\s+(.+)$/);
        
        if (!match) {
            return {
                success: false,
                error: `Invalid format: "${part}". Use format: **quantity ingredient_name**`
            };
        }

        const quantity = parseInt(match[1]);
        const itemNameInput = match[2].trim();

        if (isNaN(quantity) || quantity < 1 || quantity > 99) {
            return {
                success: false,
                error: `Invalid quantity for "${itemNameInput}". Must be between 1 and 99.`
            };
        }

        // Find matching item
        const itemResult = this.findIngredientItem(itemNameInput);
        if (!itemResult.success) {
            return itemResult;
        }

        // Validate item type
        const materialTypes = ["crafting_material", "ingredient"];
        const itemData = GameData.getItem(itemResult.itemId);
        if (!itemData || !materialTypes.includes(itemData.type)) {
            return {
                success: false,
                error: `"${itemData ? itemData.name : itemNameInput}" is not a brewing ingredient or material.`
            };
        }

        // Check player inventory
        const playerItem = player.inventory.find(item => item.itemId === itemResult.itemId);
        const totalNeeded = quantity * brewQuantity;
        
        if (!playerItem || playerItem.quantity < totalNeeded) {
            const available = playerItem ? playerItem.quantity : 0;
            let errorMsg = `Not enough ${itemData.name}. `;
            
            if (brewQuantity > 1) {
                errorMsg += `Need ${quantity} x${brewQuantity} = ${totalNeeded}, but you have ${available}.`;
            } else {
                errorMsg += `Need ${quantity}, but you have ${available}.`;
            }
            
            return {
                success: false,
                error: errorMsg
            };
        }

        return {
            success: true,
            itemId: itemResult.itemId,
            quantity
        };
    }

    /**
     * Find ingredient item by name or ID
     * @param {string} input - Item name or ID input
     * @returns {Object} Find result
     */
    static findIngredientItem(input) {
        const searchTerm = input.toLowerCase().replace(/\s+/g, '_');
        
        // First, try exact ID match
        if (GameData.items[searchTerm]) {
            return {
                success: true,
                itemId: searchTerm
            };
        }

        // Try to find by normalized name
        const itemId = Object.keys(GameData.items).find(id => {
            const item = GameData.getItem(id);
            if (!item) return false;
            
            const normalizedItemName = item.name.toLowerCase().replace(/\s+/g, '_');
            return normalizedItemName === searchTerm || id.toLowerCase() === searchTerm;
        });

        if (itemId) {
            return {
                success: true,
                itemId
            };
        }

        // Try partial matching for user-friendly search
        const partialMatch = Object.keys(GameData.items).find(id => {
            const item = GameData.getItem(id);
            if (!item) return false;
            
            const normalizedItemName = item.name.toLowerCase().replace(/\s+/g, '_');
            return normalizedItemName.includes(searchTerm) || 
                   searchTerm.includes(normalizedItemName.substring(0, 4));
        });

        if (partialMatch) {
            return {
                success: true,
                itemId: partialMatch
            };
        }

        return {
            success: false,
            error: `Ingredient "${input}" not found. Check spelling or use \`/ingredients\` to see available items.`
        };
    }
}

/**
 * Recipe validator and matcher
 */
class RecipeHandler {
    /**
     * Check if player has recipe unlocked
     * @param {Object} player - Player object
     * @param {string} recipeId - Recipe ID to check
     * @returns {boolean} Whether recipe is unlocked
     */
    static hasRecipeUnlocked(player, recipeId) {
        return player.grimoire && player.grimoire.includes(recipeId);
    }

    /**
     * Find matching recipe for ingredients
     * @param {Object} ingredients - Selected ingredients
     * @param {Object} player - Player object
     * @returns {Object} Match result
     */
    static findMatchingRecipe(ingredients, player) {
        let bestMatch = null;
        let bestMatchId = null;

        for (const [recipeId, recipeData] of Object.entries(GameData.recipes)) {
            // Check if player has recipe unlocked
            if (!this.hasRecipeUnlocked(player, recipeId)) {
                continue;
            }

            const requiredIngredients = recipeData.ingredients.reduce((acc, ing) => {
                acc[ing.itemId] = ing.quantity;
                return acc;
            }, {});

            // Check exact match
            if (this.isExactMatch(ingredients, requiredIngredients)) {
                bestMatch = recipeData;
                bestMatchId = recipeId;
                break; // Exact match found, stop searching
            }
        }

        return {
            recipe: bestMatch,
            recipeId: bestMatchId,
            hasMatch: bestMatch !== null
        };
    }

    /**
     * Check if ingredients exactly match recipe requirements
     * @param {Object} submitted - Submitted ingredients
     * @param {Object} required - Required ingredients
     * @returns {boolean} Whether it's an exact match
     */
    static isExactMatch(submitted, required) {
        const submittedKeys = Object.keys(submitted).sort();
        const requiredKeys = Object.keys(required).sort();

        // Must have same number of ingredients
        if (submittedKeys.length !== requiredKeys.length) {
            return false;
        }

        // All ingredients and quantities must match exactly
        return requiredKeys.every(itemId => 
            submitted[itemId] === required[itemId]
        );
    }

    /**
     * Get available recipes for player
     * @param {Object} player - Player object
     * @returns {Array} Available recipe IDs
     */
    static getAvailableRecipes(player) {
        return player.grimoire || [];
    }
}

/**
 * Calculate brewing success rate
 * @param {Object} labEffects - Lab effects object
 * @returns {number} Success rate (0-1)
 */
function calculateSuccessRate(labEffects) {
    let successRate = BASE_BREWING_SUCCESS_RATE;
    
    // Add lab bonus if available
    if (labEffects?.successRateBonus) {
        successRate += labEffects.successRateBonus;
    }
    
    // Cap at 100%
    return Math.min(successRate, 1.0);
}

/**
 * Get player ingredients filtered by type
 * @param {Object} player - Player object
 * @returns {Array} Available ingredients for UI
 */
function getPlayerIngredients(player) {
    const materialTypes = ["crafting_material", "ingredient"];
    
    return player.inventory
        .filter(item => {
            const itemData = GameData.getItem(item.itemId);
            return itemData && materialTypes.includes(itemData.type);
        })
        .map(item => {
            const itemData = GameData.getItem(item.itemId);
            return {
                label: `${itemData.name} (x${item.quantity})`,
                value: item.itemId,
                description: itemData.description.substring(0, 100)
            };
        });
}

module.exports = {
    name: "brew",
    description: "Brew potions and craft items in the alchemist's cauldron.",
    async execute(message, args, client, prefix) {
        try {
            // Check if user already has an active brewing session
            if (activeBrewingSessions.has(message.author.id)) {
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "Already Brewing",
                            "You already have an active brewing session! Please finish or cancel it first."
                        )
                    ]
                });
            }

            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;
            const lab = labContext.lab;
            const maxBatch = LabManager.getMaxBrewBatch(labEffects);
            const successRate = calculateSuccessRate(labEffects);

            const ingredients = getPlayerIngredients(player);
            if (ingredients.length === 0) {
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "No Ingredients",
                            `You don't have any ingredients to brew with! Use \`${prefix}forage\` to find some.`
                        )
                    ]
                });
            }

            // Check if player has any recipes unlocked
            const availableRecipes = RecipeHandler.getAvailableRecipes(player);
            if (availableRecipes.length === 0) {
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "No Recipes Known",
                            `You don't know any recipes yet! Discover recipes through exploration or purchase recipe books.`
                        )
                    ]
                });
            }

            // Mark user as having an active session
            activeBrewingSessions.add(message.author.id);

            // Brewing session state
            let selectedIngredients = {}; // Track ingredient quantities { itemId: quantity }
            let brewQuantity = 1; // Track how many times to brew the recipe
            let lastValidInput = ""; // Store last valid input to prevent clearing on invalid input

            /**
             * Create the cauldron embed
             * @returns {Object} Discord embed
             */
            const createCauldronEmbed = () => {
                let description = `Enter ingredients in format: **quantity ingredient_name, quantity ingredient_name**\nExample: \`2 moonpetal_herb, 1 crystal_shard\`\n\nTo brew multiple potions, add **x[number]** at the end:\nExample: \`2 moonpetal_herb, 1 crystal_shard x3\`\n\n`;
                description += `Max batch size: **${maxBatch}** potion${maxBatch === 1 ? '' : 's'} per brew.\n`;
                description += `Base Success Rate: **${(BASE_BREWING_SUCCESS_RATE * 100).toFixed(0)}%**\n`;
                description += `Current Success Rate: **${(successRate * 100).toFixed(0)}%**`;
                
                if (labEffects?.successRateBonus) {
                    description += ` (+${(labEffects.successRateBonus * 100).toFixed(0)}% from lab)\n`;
                } else {
                    description += `\n`;
                }
                
                description += `\n📚 **Known Recipes:** ${availableRecipes.length}\n`;

                if (Object.keys(selectedIngredients).length > 0) {
                    description += `\n**Selected Ingredients:**\n`;
                    Object.entries(selectedIngredients).forEach(([itemId, qty]) => {
                        const itemData = GameData.getItem(itemId);
                        const itemEmoji = CommandHelpers.getItemEmoji(itemId);
                        description += `> ${itemEmoji} ${itemData.name} x${qty}\n`;
                    });
                    
                    if (brewQuantity > 1) {
                        description += `\n**Brew Quantity:** ${brewQuantity}x`;
                        description += `\n**Total Ingredients Needed:**\n`;
                        Object.entries(selectedIngredients).forEach(([itemId, qty]) => {
                            const itemData = GameData.getItem(itemId);
                            const itemEmoji = CommandHelpers.getItemEmoji(itemId);
                            description += `> ${itemEmoji} ${itemData.name} x${qty * brewQuantity}\n`;
                        });
                    }

                    // Show recipe match status
                    const matchResult = RecipeHandler.findMatchingRecipe(selectedIngredients, player);
                    if (matchResult.hasMatch) {
                        const resultItem = GameData.getItem(matchResult.recipe.result.itemId);
                        description += `\n✅ **Recipe Match Found!**\n> Will create: ${resultItem.name} x${matchResult.recipe.result.quantity * brewQuantity}`;
                        description += `\n> Success Chance: **${(successRate * 100).toFixed(0)}%** per brew`;
                    } else {
                        description += `\n❌ **No Recipe Match**`;
                    }
                }

                return createInfoEmbed("Alchemist's Cauldron", description, {
                    footer: {
                        text: 'Type your ingredients below, then click "Brew"'
                    }
                });
            };

            /**
             * Create button components
             * @returns {Array} Button components
             */
            const createComponents = () => {
                const hasIngredients = Object.keys(selectedIngredients).length > 0;
                
                const buttonRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("brew_confirm")
                        .setLabel("Brew")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("⚗️")
                        .setDisabled(!hasIngredients),
                    new ButtonBuilder()
                        .setCustomId("brew_clear")
                        .setLabel("Clear All")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!hasIngredients),
                    new ButtonBuilder()
                        .setCustomId("brew_cancel")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Danger)
                );

                return [buttonRow];
            };

            const reply = await message.reply({
                embeds: [createCauldronEmbed()],
                components: createComponents(),
                ephemeral: true
            });

            // Message collector for text input
            const messageCollector = message.channel.createMessageCollector({
                filter: (m) => m.author.id === message.author.id,
                time: 5 * 60 * 1000
            });

            // Component collector for buttons
            const componentCollector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 5 * 60 * 1000
            });

            messageCollector.on("collect", async (m) => {
                // Handle cancel command
                if (m.content.toLowerCase().trim() === "cancel") {
                    activeBrewingSessions.delete(message.author.id);
                    await reply.edit({
                        embeds: [
                            createWarningEmbed(
                                "Brewing Cancelled",
                                "You have cleared the cauldron."
                            )
                        ],
                        components: []
                    });
                    messageCollector.stop();
                    componentCollector.stop();
                    return;
                }

                // Parse and validate input
                const parseResult = BrewInputValidator.parseBrewInput(m.content, player, { maxBatch });
                
                if (!parseResult.success) {
                    if (parseResult.error && parseResult.error.startsWith("Invalid format:")) {
                        return; 
                    }
                    // Send error but don't clear existing ingredients
                    await m.reply({
                        embeds: [createErrorEmbed("Invalid Input", parseResult.error)],
                        allowedMentions: { repliedUser: false }
                    });
                    return;
                }

                // Update state only on successful parse
                selectedIngredients = parseResult.ingredients;
                brewQuantity = parseResult.brewQuantity;
                lastValidInput = m.content;

                // Update the interface
                await reply.edit({
                    embeds: [createCauldronEmbed()],
                    components: createComponents()
                });
            });

            componentCollector.on("collect", async (i) => {
                if (!i.isButton()) return;

                switch (i.customId) {
                    case "brew_clear":
                        selectedIngredients = {};
                        brewQuantity = 1;
                        lastValidInput = "";
                        await i.update({
                            embeds: [createCauldronEmbed()],
                            components: createComponents()
                        });
                        break;

                    case "brew_cancel":
                        activeBrewingSessions.delete(message.author.id);
                        await i.update({
                            embeds: [
                                createWarningEmbed(
                                    "Brewing Cancelled",
                                    "You have cleared the cauldron."
                                )
                            ],
                            components: []
                        });
                        messageCollector.stop();
                        componentCollector.stop();
                        break;

                    case "brew_confirm":
                        if (Object.keys(selectedIngredients).length === 0) {
                            await i.reply({
                                embeds: [createErrorEmbed("No Ingredients", "Please add ingredients first.")],
                                ephemeral: true
                            });
                            return;
                        }

                        // Find matching recipe
                        const matchResult = RecipeHandler.findMatchingRecipe(selectedIngredients, player);

                        if (!matchResult.hasMatch) {
                            await i.reply({
                                embeds: [createErrorEmbed("No Recipe Match", "Those ingredients don't match any recipe you know.")],
                                ephemeral: true
                            });
                            return;
                        }

                        // Execute brewing
                        const brewResult = await this.executeBrewing(
                            player,
                            selectedIngredients,
                            brewQuantity,
                            matchResult,
                            client,
                            message,
                            labEffects,
                            successRate
                        );

                        await i.update({
                            embeds: [brewResult.embed],
                            components: []
                        });

                        activeBrewingSessions.delete(message.author.id);
                        messageCollector.stop();
                        componentCollector.stop();
                        break;
                }
            });

            // Cleanup handlers
            const cleanupCollectors = () => {
                activeBrewingSessions.delete(message.author.id);
                messageCollector.stop();
                componentCollector.stop();
            };

            componentCollector.on("end", (collected, reason) => {
                if (reason === "time") {
                    reply.edit({
                        embeds: [
                            createWarningEmbed(
                                "Brewing Timed Out",
                                "Your brewing session has expired."
                            )
                        ],
                        components: []
                    }).catch(() => {});
                }
                cleanupCollectors();
            });

            messageCollector.on("end", (collected, reason) => {
                if (reason === "time") {
                    cleanupCollectors();
                }
            });

        } catch (error) {
            console.error("Brew command error:", error);
            activeBrewingSessions.delete(message.author.id);
            
            const errorEmbed = createErrorEmbed(
                "An Error Occurred",
                "There was a problem with your brewing session. Please try again."
            );

            // Try to reply or edit based on context
            if (message.replied || message.deferred) {
                message.followUp({ embeds: [errorEmbed] }).catch(() => {});
            } else {
                message.reply({ embeds: [errorEmbed] }).catch(() => {});
            }
        }
    },

    /**
     * Execute the brewing process
     * @param {Object} player - Player object
     * @param {Object} ingredients - Selected ingredients
     * @param {number} brewQuantity - Number of brewing attempts
     * @param {Object} matchResult - Recipe match result
     * @param {Object} client - Discord client
     * @param {Object} message - Discord message
     * @param {Object} labEffects - Lab effects
     * @param {number} successRate - Calculated success rate
     * @returns {Object} Brewing result
     */
    async executeBrewing(player, ingredients, brewQuantity, matchResult, client, message, labEffects = null, successRate = BASE_BREWING_SUCCESS_RATE) {
        try {
            const recipe = matchResult.recipe;
            const recipeId = matchResult.recipeId;

            // Track successes and failures
            let successfulBrews = 0;
            let failedBrews = 0;

            // Perform each brew attempt
            for (let i = 0; i < brewQuantity; i++) {
                const roll = Math.random();
                if (roll < successRate) {
                    successfulBrews++;
                } else {
                    failedBrews++;
                }
            }

            // Update statistics
            player.stats.potionsBrewed = (player.stats.potionsBrewed || 0) + successfulBrews;

            // Calculate total XP (only for successful brews)
            const totalXp = recipe.xp * successfulBrews;
            if (totalXp > 0) {
                await grantPlayerXp(client, message, player.userId, totalXp, { labEffects });
            }

            // Ensure recipe is in grimoire
            if (!player.grimoire.includes(recipeId)) {
                player.grimoire.push(recipeId);
            }

            // Consume all ingredients (success or fail, ingredients are used)
            recipe.ingredients.forEach(ing => {
                const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                if (playerItem) {
                    playerItem.quantity -= ing.quantity * brewQuantity;
                }
            });

            // Apply ingredient save chance for failed brews (preserves ingredients)
            if (failedBrews > 0 && labEffects?.ingredientSaveChance) {
                recipe.ingredients.forEach(ing => {
                    for (let i = 0; i < failedBrews; i++) {
                        if (Math.random() < labEffects.ingredientSaveChance) {
                            const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                            if (playerItem) {
                                playerItem.quantity += ing.quantity;
                            } else {
                                player.inventory.push({
                                    itemId: ing.itemId,
                                    quantity: ing.quantity
                                });
                            }
                        }
                    }
                });
            }

            // Add result items for successful brews
            if (successfulBrews > 0) {
                let totalResultQuantity = recipe.result.quantity * successfulBrews;
                
                const resultItem = player.inventory.find(item => item.itemId === recipe.result.itemId);
                
                if (resultItem) {
                    resultItem.quantity += totalResultQuantity;
                } else {
                    player.inventory.push({
                        itemId: recipe.result.itemId,
                        quantity: totalResultQuantity
                    });
                }

                // Emit events for successful brews
                for (let i = 0; i < successfulBrews; i++) {
                    client.emit("potionBrewed", message.author.id);
                    await updateQuestProgress(message.author.id, 'brew_potions', 1);
                }
            }

            // Grant arcane dust for failed brews
            let totalDust = 0;
            if (failedBrews > 0) {
                totalDust = Object.keys(ingredients).length * failedBrews;
                player.arcaneDust = (player.arcaneDust || 0) + totalDust;
            }

            // Clean up empty inventory slots
            player.inventory = player.inventory.filter(item => item.quantity > 0);

            await player.save();

            // Create result message
            const resultItemData = GameData.getItem(recipe.result.itemId);
            let resultMsg = "";

            if (successfulBrews > 0 && failedBrews > 0) {
                // Mixed results
                const totalResultQuantity = recipe.result.quantity * successfulBrews;

                resultMsg = `Mixed results! **${successfulBrews}** successful, **${failedBrews}** failed.\n\n`;
                resultMsg += `✅ Created **${totalResultQuantity}x ${resultItemData.name}**!\n`;
                resultMsg += `❌ Salvaged **${totalDust} Arcane Dust** from failures.`;

                return {
                    embed: createInfoEmbed("Brewing Complete", resultMsg)
                };
            } else if (successfulBrews > 0) {
                // All successful
                let totalResultQuantity = recipe.result.quantity * successfulBrews;
                
                resultMsg = `You successfully brewed **${totalResultQuantity}x ${resultItemData.name}**!`;
                
                if (brewQuantity > 1) {
                    resultMsg += ` (${successfulBrews} successful batches)`;
                }

                return {
                    embed: createSuccessEmbed("Brewing Success!", resultMsg)
                };
            } else {
                // All failed
                resultMsg = `All ${failedBrews} brewing attempt${failedBrews > 1 ? 's' : ''} failed! The ingredients fizzled into useless concoctions.\n\n`;
                resultMsg += `You salvaged **${totalDust} Arcane Dust** from the failures.`;

                return {
                    embed: createErrorEmbed("Brewing Failed!", resultMsg)
                };
            }

        } catch (error) {
            console.error("Execute brewing error:", error);
            return {
                embed: createErrorEmbed(
                    "Brewing Error",
                    "An error occurred during the brewing process."
                )
            };
        }
    }
};