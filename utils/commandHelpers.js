const Player = require('../models/Player');
const QuestProgress = require('../models/Quest');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('./embed');
const { initializeQuestProgress } = require('./questSystem');
const gameCache = require('./gameCache');

/**
 * Utility class for common command validation and helper functions
 */
class CommandHelpers {
    /**
     * Validate and get player data
     * @param {string} userId - Discord user ID
     * @param {string} prefix - Bot command prefix
     * @returns {Promise<Object>} Validation result with player data
     */
    static async validatePlayer(userId, prefix) {
        try {
            const player = await Player.findOne({ userId });
            
            if (!player) {
                return {
                    success: false,
                    embed: createErrorEmbed(
                        'No Adventure Started',
                        `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    )
                };
            }

            return {
                success: true,
                player
            };
        } catch (error) {
            console.error('Error validating player:', error);
            return {
                success: false,
                embed: createErrorEmbed(
                    'Database Error',
                    'Unable to access player data. Please try again later.'
                )
            };
        }
    }

    /**
     * Validate player and initialize quest progress
     * @param {string} userId - Discord user ID
     * @param {string} prefix - Bot command prefix
     * @returns {Promise<Object>} Validation result with player and quest data
     */
    static async validatePlayerWithQuests(userId, prefix) {
        try {
            const playerResult = await this.validatePlayer(userId, prefix);
            if (!playerResult.success) {
                return playerResult;
            }

            let questProgress = await QuestProgress.findOne({ playerId: userId });
            if (!questProgress) {
                questProgress = await initializeQuestProgress(userId);
            }

            return {
                success: true,
                player: playerResult.player,
                questProgress
            };
        } catch (error) {
            console.error('Error validating player with quests:', error);
            return {
                success: false,
                embed: createErrorEmbed(
                    'Database Error',
                    'Unable to access player or quest data. Please try again later.'
                )
            };
        }
    }

    /**
     * Check if player has sufficient resources
     * @param {Object} player - Player object
     * @param {Object} requirements - Resource requirements
     * @param {number} [requirements.gold] - Gold required
     * @param {number} [requirements.level] - Level required
     * @param {Array} [requirements.items] - Items required [{itemId, quantity}]
     * @param {Object} [requirements.reputation] - Reputation required {faction: amount}
     * @returns {Object} Validation result
     */
    static validateResources(player, requirements = {}) {
        const issues = [];

        // Check gold
        if (requirements.gold && player.gold < requirements.gold) {
            issues.push(`Need ${requirements.gold} gold (you have ${player.gold})`);
        }

        // Check level
        if (requirements.level && player.level < requirements.level) {
            issues.push(`Need level ${requirements.level} (you are level ${player.level})`);
        }

        // Check items
        if (requirements.items && requirements.items.length > 0) {
            for (const required of requirements.items) {
                const playerItem = player.inventory.find(item => item.itemId === required.itemId);
                const hasQuantity = playerItem ? playerItem.quantity : 0;
                
                if (hasQuantity < required.quantity) {
                    const itemData = this.getItemData(required.itemId);
                    const itemName = itemData ? itemData.name : required.itemId;
                    issues.push(`Need ${required.quantity}x ${itemName} (you have ${hasQuantity})`);
                }
            }
        }

        return {
            success: issues.length === 0,
            issues
        };
    }

    /**
     * Get item data safely
     * @param {string} itemId - Item ID
     * @returns {Object|null} Item data or null
     */
    static getItemData(itemId) {
        try {
            if (gameCache.has('items')) {
                const items = gameCache.get('items');
                return items[itemId] || null;
            }
            // Fallback to direct require
            const items = require('../gamedata/items');
            return items[itemId] || null;
        } catch (error) {
            console.error('Error getting item data:', error);
            return null;
        }
    }

    /**
     * Get recipe data safely
     * @param {string} recipeId - Recipe ID
     * @returns {Object|null} Recipe data or null
     */
    static getRecipeData(recipeId) {
        try {
            if (gameCache.has('recipes')) {
                const recipes = gameCache.get('recipes');
                return recipes[recipeId] || null;
            }
            // Fallback to direct require
            const recipes = require('../gamedata/recipes');
            return recipes[recipeId] || null;
        } catch (error) {
            console.error('Error getting recipe data:', error);
            return null;
        }
    }

    /**
     * Get quest data safely
     * @param {string} questId - Quest ID
     * @returns {Object|null} Quest data or null
     */
    static getQuestData(questId) {
        try {
            if (gameCache.has('quests')) {
                const quests = gameCache.get('quests');
                return quests[questId] || null;
            }
            // Fallback to direct require
            const quests = require('../gamedata/quests');
            return quests[questId] || null;
        } catch (error) {
            console.error('Error getting quest data:', error);
            return null;
        }
    }

    /**
     * Add items to player inventory
     * @param {Object} player - Player object
     * @param {Array} items - Items to add [{itemId, quantity}]
     * @returns {Array} Added items summary
     */
    static addItemsToInventory(player, items) {
        const addedItems = [];

        for (const item of items) {
            const existingItem = player.inventory.find(inv => inv.itemId === item.itemId);
            
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                player.inventory.push({
                    itemId: item.itemId,
                    quantity: item.quantity
                });
            }

            const itemData = this.getItemData(item.itemId);
            addedItems.push({
                name: itemData ? itemData.name : item.itemId,
                quantity: item.quantity
            });
        }

        return addedItems;
    }

    /**
     * Remove items from player inventory
     * @param {Object} player - Player object
     * @param {Array} items - Items to remove [{itemId, quantity}]
     * @returns {boolean} Success status
     */
    static removeItemsFromInventory(player, items) {
        // First check if player has all required items
        const validation = this.validateResources(player, { items });
        if (!validation.success) {
            return false;
        }

        // Remove items
        for (const item of items) {
            const existingItem = player.inventory.find(inv => inv.itemId === item.itemId);
            if (existingItem) {
                existingItem.quantity -= item.quantity;
            }
        }

        // Clean up empty inventory slots
        player.inventory = player.inventory.filter(item => item.quantity > 0);
        return true;
    }

    /**
     * Format currency display
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    static formatGold(amount) {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toString();
    }

    /**
     * Format experience display
     * @param {number} currentXp - Current XP
     * @param {number} requiredXp - Required XP for next level
     * @returns {string} Formatted XP string
     */
    static formatXP(currentXp, requiredXp) {
        const percentage = Math.floor((currentXp / requiredXp) * 100);
        return `${this.formatGold(currentXp)}/${this.formatGold(requiredXp)} (${percentage}%)`;
    }

    /**
     * Create a progress bar
     * @param {number} current - Current value
     * @param {number} max - Maximum value
     * @param {number} length - Bar length (default: 10)
     * @returns {string} Progress bar string
     */
    static createProgressBar(current, max, length = 10) {
        const progress = Math.min(current / max, 1);
        const filled = Math.floor(progress * length);
        const empty = length - filled;
        return `[${'▓'.repeat(filled)}${'░'.repeat(empty)}]`;
    }

    /**
     * Check if player is in an active session
     * @param {Set} activeSessions - Set of active session user IDs
     * @param {string} userId - User ID to check
     * @param {string} sessionType - Type of session (e.g., 'brewing', 'crafting')
     * @returns {Object} Check result
     */
    static checkActiveSession(activeSessions, userId, sessionType) {
        if (activeSessions.has(userId)) {
            return {
                isActive: true,
                embed: createErrorEmbed(
                    `Already ${sessionType}`,
                    `You already have an active ${sessionType.toLowerCase()} session! Please finish or cancel it first.`
                )
            };
        }

        return { isActive: false };
    }

    /**
     * Handle command errors gracefully
     * @param {Error} error - Error object
     * @param {string} commandName - Name of the command
     * @param {Object} message - Discord message object
     * @returns {Promise<void>}
     */
    static async handleCommandError(error, commandName, message) {
        console.error(`${commandName} command error:`, error);
        
        const errorEmbed = createErrorEmbed(
            'An Error Occurred',
            'There was a problem processing your request. Please try again later.'
        );

        try {
            if (message.replied || message.deferred) {
                await message.followUp({ embeds: [errorEmbed] });
            } else {
                await message.reply({ embeds: [errorEmbed] });
            }
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }

    /**
     * Validate command arguments
     * @param {Array} args - Command arguments
     * @param {Object} requirements - Argument requirements
     * @param {number} [requirements.min] - Minimum arguments required
     * @param {number} [requirements.max] - Maximum arguments allowed
     * @param {Array} [requirements.validSubcommands] - Valid subcommands
     * @returns {Object} Validation result
     */
    static validateArguments(args, requirements = {}) {
        const issues = [];

        // Check minimum arguments
        if (requirements.min && args.length < requirements.min) {
            issues.push(`At least ${requirements.min} argument(s) required`);
        }

        // Check maximum arguments
        if (requirements.max && args.length > requirements.max) {
            issues.push(`Maximum ${requirements.max} argument(s) allowed`);
        }

        // Check valid subcommands
        if (requirements.validSubcommands && args[0]) {
            const subcommand = args[0].toLowerCase();
            if (!requirements.validSubcommands.includes(subcommand)) {
                issues.push(`Invalid subcommand. Valid options: ${requirements.validSubcommands.join(', ')}`);
            }
        }

        return {
            success: issues.length === 0,
            issues
        };
    }

    /**
     * Format time duration
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    static formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Get player's materials/ingredients
     * @param {Object} player - Player object
     * @param {Array} validTypes - Valid item types (default: ['crafting_material', 'ingredient'])
     * @returns {Array} Available materials
     */
    static getPlayerMaterials(player, validTypes = ['crafting_material', 'ingredient']) {
        return player.inventory
            .filter(item => {
                const itemData = this.getItemData(item.itemId);
                return itemData && validTypes.includes(itemData.type);
            })
            .map(item => {
                const itemData = this.getItemData(item.itemId);
                return {
                    itemId: item.itemId,
                    name: itemData.name,
                    quantity: item.quantity,
                    description: itemData.description
                };
            });
    }
    
}

module.exports = CommandHelpers;