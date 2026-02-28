const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require("../../utils/embed");
const { grantPlayerXp } = require("../../utils/leveling");
const GameData = require('../../utils/gameData');
const { updateQuestProgress } = require('../../utils/questSystem');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');

const activeCraftingSessions = new Set();

/**
 * Input sanitizer and validator for crafting
 */
class CraftInputValidator {
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
     * Validate and parse crafting input
     * @param {string} input - User input string
     * @param {Object} player - Player object
     * @returns {Object} Validation result
     */
    static parseCraftInput(input, player) {
        const sanitized = this.sanitizeInput(input);
        
        if (!sanitized) {
            return {
                success: false,
                error: "Please provide materials to craft with."
            };
        }

        // Parse material parts
        const inputParts = sanitized
            .split(',')
            .map(part => part.trim())
            .filter(part => part.length > 0);

        if (inputParts.length === 0) {
            return {
                success: false,
                error: "Please provide at least one material."
            };
        }

        if (inputParts.length > 10) {
            return {
                success: false,
                error: "Too many materials. Maximum 10 materials allowed."
            };
        }

        const materials = {};
        
        for (const part of inputParts) {
            const result = this.parseMaterialPart(part, player);
            if (!result.success) {
                return result;
            }
            materials[result.itemId] = result.quantity;
        }

        return {
            success: true,
            materials
        };
    }

    /**
     * Parse a single material part
     * @param {string} part - Single material string
     * @param {Object} player - Player object
     * @returns {Object} Parse result
     */
    static parseMaterialPart(part, player) {
        // Match pattern: "number material_name" or "number material name"
        const match = part.match(/^(\d+)\s+(.+)$/);
        
        if (!match) {
            return {
                success: false,
                error: `Invalid format: "${part}". Use format: **quantity material_name**`
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
        const itemResult = this.findCraftingMaterial(itemNameInput);
        if (!itemResult.success) {
            return itemResult;
        }

        // Validate item type
        const materialTypes = ["crafting_material", "ingredient"];
        const itemData = CommandHelpers.getItemData(itemResult.itemId);
        if (!itemData || !materialTypes.includes(itemData.type)) {
            return {
                success: false,
                error: `"${itemData ? itemData.name : itemNameInput}" is not a crafting material.`
            };
        }

        // Check player inventory
        const playerItem = player.inventory.find(item => item.itemId === itemResult.itemId);
        
        if (!playerItem || playerItem.quantity < quantity) {
            const available = playerItem ? playerItem.quantity : 0;
            return {
                success: false,
                error: `Not enough ${itemData.name}. Need ${quantity}, but you have ${available}.`
            };
        }

        return {
            success: true,
            itemId: itemResult.itemId,
            quantity
        };
    }

    /**
     * Find crafting material item by name or ID
     * @param {string} input - Item name or ID input
     * @returns {Object} Find result
     */
    static findCraftingMaterial(input) {
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
            const item = CommandHelpers.getItemData(id);
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
            const item = CommandHelpers.getItemData(id);
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
            error: `Material "${input}" not found. Check spelling or explore dungeons to find crafting materials.`
        };
    }
}

/**
 * Recipe validator and matcher for crafting
 */
class CraftingRecipeHandler {
    /**
     * Check if player has recipe in crafting journal
     * @param {Object} player - Player object
     * @param {string} recipeId - Recipe ID to check
     * @returns {boolean} Whether recipe is unlocked
     */
    static hasRecipeUnlocked(player, recipeId) {
        return player.craftingJournal && player.craftingJournal.includes(recipeId);
    }

    /**
     * Find matching crafting recipe for materials
     * @param {Object} materials - Selected materials
     * @param {Object} player - Player object
     * @returns {Object} Match result
     */
    static findMatchingRecipe(materials, player) {
        let bestMatch = null;
        let bestMatchId = null;

        for (const [recipeId, recipeData] of Object.entries(GameData.recipes)) {
            // Only check crafting recipes (items with source = "crafting")
            const resultItem = CommandHelpers.getItemData(recipeData.result.itemId);
            if (!resultItem || resultItem.source !== "crafting") {
                continue;
            }

            // Check if player has recipe unlocked (optional - remove if recipes should be discoverable)
            // Uncomment the next 3 lines if you want to require recipe unlocking
            // if (!this.hasRecipeUnlocked(player, recipeId)) {
            //     continue;
            // }

            const requiredMaterials = recipeData.ingredients.reduce((acc, ing) => {
                acc[ing.itemId] = ing.quantity;
                return acc;
            }, {});

            // Check exact match
            if (this.isExactMatch(materials, requiredMaterials)) {
                // Verify player has sufficient materials
                const hasEnough = recipeData.ingredients.every(ing => {
                    const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                    return playerItem && playerItem.quantity >= ing.quantity;
                });

                if (hasEnough) {
                    bestMatch = recipeData;
                    bestMatchId = recipeId;
                    break; // Exact match found, stop searching
                }
            }
        }

        return {
            recipe: bestMatch,
            recipeId: bestMatchId,
            hasMatch: bestMatch !== null
        };
    }

    /**
     * Check if materials exactly match recipe requirements
     * @param {Object} submitted - Submitted materials
     * @param {Object} required - Required materials
     * @returns {boolean} Whether it's an exact match
     */
    static isExactMatch(submitted, required) {
        const submittedKeys = Object.keys(submitted).sort();
        const requiredKeys = Object.keys(required).sort();

        // Must have same number of materials
        if (submittedKeys.length !== requiredKeys.length) {
            return false;
        }

        // All materials and quantities must match exactly
        return requiredKeys.every(itemId => 
            submitted[itemId] === required[itemId]
        );
    }

    /**
     * Get available crafting recipes for player
     * @param {Object} player - Player object
     * @returns {Array} Available crafting recipe data
     */
    static getAvailableCraftingRecipes(player) {
        const craftingRecipes = [];
        
        for (const [recipeId, recipeData] of Object.entries(GameData.recipes)) {
            const resultItem = CommandHelpers.getItemData(recipeData.result.itemId);
            if (resultItem && resultItem.source === "crafting") {
                craftingRecipes.push({
                    id: recipeId,
                    ...recipeData,
                    resultItem
                });
            }
        }
        
        return craftingRecipes;
    }

    /**
     * Get known crafting recipes for player
     * @param {Object} player - Player object
     * @returns {Array} Known crafting recipes
     */
    static getKnownCraftingRecipes(player) {
        if (!player.craftingJournal) return [];
        
        return player.craftingJournal
            .map(recipeId => {
                const recipe = GameData.recipes[recipeId];
                if (!recipe) return null;
                
                const resultItem = CommandHelpers.getItemData(recipe.result.itemId);
                if (!resultItem || resultItem.source !== "crafting") return null;
                
                return {
                    id: recipeId,
                    ...recipe,
                    resultItem
                };
            })
            .filter(Boolean);
    }
}

module.exports = {
    name: "craft",
    description: "Craft equipment and items at the workshop.",
    aliases: ['workbench', 'workshop'],
    cooldown: 10,
    async execute(message, args, client, prefix) {
        try {
            // Check if user already has an active crafting session
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
                    embeds: [
                        createErrorEmbed(
                            "No Materials",
                            "You don't have any materials to craft with! Find them in dungeons or through exploration."
                        )
                    ]
                });
            }

            // Mark user as having an active session
            activeCraftingSessions.add(message.author.id);

            // Crafting session state
            let selectedMaterials = {}; // Track material quantities { itemId: quantity }
            let lastValidInput = ""; // Store last valid input to prevent clearing on invalid input

            /**
             * Create the workshop embed
             * @returns {Object} Discord embed
             */
            const createWorkshopEmbed = () => {
                let description = `Enter materials in format: **quantity material_name, quantity material_name**\nExample: \`5 iron_ore, 3 crystal_shard\`\n\n`;

                // Show available recipes count
                const availableRecipes = CraftingRecipeHandler.getAvailableCraftingRecipes(player);
                const knownRecipes = CraftingRecipeHandler.getKnownCraftingRecipes(player);
                description += `🔨 **Available Recipes:** ${availableRecipes.length}`;
                
                if (knownRecipes.length > 0) {
                    description += ` | **Known:** ${knownRecipes.length}`;
                }
                description += `\n`;

                if (Object.keys(selectedMaterials).length > 0) {
                    description += `\n**Selected Materials:**\n`;
                    Object.entries(selectedMaterials).forEach(([itemId, qty]) => {
                        const itemData = CommandHelpers.getItemData(itemId);
                        const itemEmoji = CommandHelpers.getItemEmoji(itemId);
                        description += `> ${itemEmoji} ${itemData.name} x${qty}\n`;
                    });

                    // Show recipe match status
                    const matchResult = CraftingRecipeHandler.findMatchingRecipe(selectedMaterials, player);
                    if (matchResult.hasMatch) {
                        const resultItem = matchResult.recipe.resultItem || CommandHelpers.getItemData(matchResult.recipe.result.itemId);
                        description += `\n✅ **Recipe Match Found!**\n> Will create: ${resultItem.name} x${matchResult.recipe.result.quantity}`;
                    } else {
                        description += `\n❌ **No Recipe Match**`;
                    }
                }

                return createInfoEmbed("Craftsman's Workshop", description, {
                    footer: {
                        text: 'Type your materials below, then click "Craft"'
                    }
                });
            };

            /**
             * Create button components
             * @returns {Array} Button components
             */
            const createComponents = () => {
                const hasMaterials = Object.keys(selectedMaterials).length > 0;
                
                const buttonRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("craft_confirm")
                        .setLabel("Craft")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("🔨")
                        .setDisabled(!hasMaterials),
                    new ButtonBuilder()
                        .setCustomId("craft_clear")
                        .setLabel("Clear All")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!hasMaterials),
                    new ButtonBuilder()
                        .setCustomId("craft_cancel")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Danger)
                );

                return [buttonRow];
            };

            const reply = await message.reply({
                embeds: [createWorkshopEmbed()],
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
                    activeCraftingSessions.delete(message.author.id);
                    await reply.edit({
                        embeds: [
                            createWarningEmbed(
                                "Crafting Cancelled",
                                "You have cleared the workbench."
                            )
                        ],
                        components: []
                    });
                    messageCollector.stop();
                    componentCollector.stop();
                    return;
                }

                // Parse and validate input
                const parseResult = CraftInputValidator.parseCraftInput(m.content, player);
                
                if (!parseResult.success) {
                    if (parseResult.error && parseResult.error.startsWith("Invalid format:")) {
                        return; 
                    }
                    // Send error but don't clear existing materials
                    await m.reply({
                        embeds: [createErrorEmbed("Invalid Input", parseResult.error)],
                        allowedMentions: { repliedUser: false }
                    });
                    return;
                }

                // Update state only on successful parse
                selectedMaterials = parseResult.materials;
                lastValidInput = m.content;

                // Update the interface
                await reply.edit({
                    embeds: [createWorkshopEmbed()],
                    components: createComponents()
                });
            });

            componentCollector.on("collect", async (i) => {
                if (!i.isButton()) return;

                switch (i.customId) {
                    case "craft_clear":
                        selectedMaterials = {};
                        lastValidInput = "";
                        await i.update({
                            embeds: [createWorkshopEmbed()],
                            components: createComponents()
                        });
                        break;

                    case "craft_cancel":
                        activeCraftingSessions.delete(message.author.id);
                        await i.update({
                            embeds: [
                                createWarningEmbed(
                                    "Crafting Cancelled",
                                    "You have cleared the workbench."
                                )
                            ],
                            components: []
                        });
                        messageCollector.stop();
                        componentCollector.stop();
                        break;

                    case "craft_confirm":
                        if (Object.keys(selectedMaterials).length === 0) {
                            await i.reply({
                                embeds: [createErrorEmbed("No Materials", "Please add materials first.")],
                                ephemeral: true
                            });
                            return;
                        }

                        // Find matching recipe
                        const matchResult = CraftingRecipeHandler.findMatchingRecipe(selectedMaterials, player);

                        if (!matchResult.hasMatch) {
                            await i.reply({
                                embeds: [createErrorEmbed("No Recipe Match", "Those materials don't match any known crafting recipe.")],
                                ephemeral: true
                            });
                            return;
                        }

                        // Execute crafting
                        const craftResult = await this.executeCrafting(
                            player,
                            selectedMaterials,
                            matchResult,
                            client,
                            message,
                            labEffects
                        );

                        await i.update({
                            embeds: [craftResult.embed],
                            components: []
                        });

                        activeCraftingSessions.delete(message.author.id);
                        messageCollector.stop();
                        componentCollector.stop();
                        break;
                }
            });

            // Cleanup handlers
            const cleanupCollectors = () => {
                activeCraftingSessions.delete(message.author.id);
                messageCollector.stop();
                componentCollector.stop();
            };

            componentCollector.on("end", (collected, reason) => {
                if (reason === "time") {
                    reply.edit({
                        embeds: [
                            createWarningEmbed(
                                "Crafting Timed Out",
                                "Your crafting session has expired."
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
            activeCraftingSessions.delete(message.author.id);
            await CommandHelpers.handleCommandError(error, 'Craft', message);
        }
    },

    /**
     * Execute the crafting process
     * @param {Object} player - Player object
     * @param {Object} materials - Selected materials
     * @param {Object} matchResult - Recipe match result
     * @param {Object} client - Discord client
     * @param {Object} message - Discord message
     * @param {Object} labEffects - Lab effects
     * @returns {Object} Crafting result
     */
    async executeCrafting(player, materials, matchResult, client, message, labEffects = null) {
        try {
            if (matchResult.hasMatch) {
                // Successful crafting
                const recipe = matchResult.recipe;
                const recipeId = matchResult.recipeId;

                // Update statistics
                player.stats.itemsCrafted = (player.stats.itemsCrafted || 0) + 1;

                // Grant XP
                await grantPlayerXp(client, message, player.userId, recipe.xp, { labEffects });

                // Add recipe to crafting journal if not already there
                if (!player.craftingJournal) {
                    player.craftingJournal = [];
                }
                if (!player.craftingJournal.includes(recipeId)) {
                    player.craftingJournal.push(recipeId);
                }

                // Consume materials
                recipe.ingredients.forEach(ing => {
                    const playerItem = player.inventory.find(item => item.itemId === ing.itemId);
                    if (playerItem) {
                        playerItem.quantity -= ing.quantity;
                    }
                });

                // Add result items using CommandHelpers
                CommandHelpers.addItemsToInventory(player, [{
                    itemId: recipe.result.itemId,
                    quantity: recipe.result.quantity
                }]);

                // Clean up empty inventory slots
                player.inventory = player.inventory.filter(item => item.quantity > 0);

                await player.save();

                // Emit events
                client.emit("itemCrafted", message.author.id, recipe.result.itemId);
                await updateQuestProgress(message.author.id, 'craft_items', 1, message);

                const resultItemData = CommandHelpers.getItemData(recipe.result.itemId);
                const successMsg = `You successfully crafted **${recipe.result.quantity}x ${resultItemData.name}**!`;

                return {
                    embed: createSuccessEmbed("Crafting Success!", successMsg)
                };

            } else {
                // Failed crafting - consume 1 of each material, grant dust
                Object.entries(materials).forEach(([itemId, quantity]) => {
                    const playerItem = player.inventory.find(item => item.itemId === itemId);
                    if (playerItem) {
                        // Only consume 1 of each material type on failure
                        playerItem.quantity -= 1;
                    }
                });

                // Clean up empty inventory slots
                player.inventory = player.inventory.filter(item => item.quantity > 0);

                // Grant salvage dust based on number of different materials used
                const salvageDust = Object.keys(materials).length;
                player.arcaneDust = (player.arcaneDust || 0) + salvageDust;

                await player.save();

                const failureMsg = `The materials broke apart during crafting. You salvaged **${salvageDust} Arcane Dust** from the failure.`;

                return {
                    embed: createErrorEmbed("Crafting Failed!", failureMsg)
                };
            }

        } catch (error) {
            console.error("Execute crafting error:", error);
            return {
                embed: createErrorEmbed(
                    "Crafting Error",
                    "An error occurred during the crafting process."
                )
            };
        }
    }
};