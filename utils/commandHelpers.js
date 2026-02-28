const Player = require('../models/Player');
const Pet = require('../models/Pet');
const QuestProgress = require('../models/Quest');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('./embed');
const { getQuestProgress } = require('./questSystem');
const GameData = require('./gameData');
const { getMember } = require('./functions');
const config = require('../config/config.json');

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
     * Validate player and get quest progress (auto-creates & resets as needed)
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

            const questProgress = await getQuestProgress(userId);

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
            return GameData.getItem(itemId);
        } catch (error) {
            console.error('Error getting item data:', error);
            return null;
        }
    }

    /**
     * Get pet data safely
     * @param {string} petId - Pet ID
     * @returns {Object|null} Pet data or null
     */
    static getPetData(petId) {
        try {
            return GameData.getPet(petId);
        } catch (error) {
            console.error('Error getting pet data:', error);
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
            return GameData.getQuest(questId);
        } catch (error) {
            console.error('Error getting quest data:', error);
            return null;
        }
    }

    /**
     * Validate and get pet by owner and short ID
     * @param {string} ownerId - Owner user ID
     * @param {number} shortId - Pet short ID
     * @param {string} prefix - Command prefix for error messages
     * @returns {Promise<Object>} Validation result with pet data
     */
    static async validatePet(ownerId, shortId, prefix = '') {
        try {
            if (!shortId || isNaN(shortId)) {
                return {
                    success: false,
                    embed: createErrorEmbed(
                        'Invalid Pet ID',
                        `Pet ID must be a number. Use \`${prefix}pet\` to see your Pals.`
                    )
                };
            }

            const pet = await Pet.findOne({ ownerId, shortId: parseInt(shortId) });
            
            if (!pet) {
                return {
                    success: false,
                    embed: createErrorEmbed(
                        'Pet Not Found',
                        `No Pal found with ID **${shortId}**. Use \`${prefix}pet\` to see your Pals.`
                    )
                };
            }

            return {
                success: true,
                pet
            };
        } catch (error) {
            console.error('Error validating pet:', error);
            return {
                success: false,
                embed: createErrorEmbed(
                    'Database Error',
                    'Unable to access pet data. Please try again later.'
                )
            };
        }
    }

    /**
     * Get player's idle pets
     * @param {string} ownerId - Owner user ID
     * @param {Object} options - Query options
     * @param {number} [options.minLevel] - Minimum level
     * @param {number} [options.limit] - Maximum number of pets to return
     * @returns {Promise<Array>} Array of pet objects
     */
    static async getPlayerIdlePets(ownerId, options = {}) {
        try {
            const query = { ownerId, status: 'Idle' };
            if (options.minLevel) {
                query.level = { $gte: options.minLevel };
            }

            let queryBuilder = Pet.find(query).sort({ level: -1 });
            if (options.limit) {
                queryBuilder = queryBuilder.limit(options.limit);
            }

            return await queryBuilder;
        } catch (error) {
            console.error('Error getting player idle pets:', error);
            return [];
        }
    }

    /**
     * Find item in inventory by name or ID (fuzzy search)
     * @param {Object} player - Player object
     * @param {string} itemName - Item name or ID to search for
     * @returns {Object} Found item with itemId, or null if not found
     */
    static findItemInInventory(player, itemName) {
        const searchName = itemName.toLowerCase().replace(/[_\s-]/g, '');
        
        // First, try exact match by itemId
        let item = player.inventory.find(i => i.itemId === itemName.toLowerCase());
        if (item) {
            return { item, itemId: item.itemId };
        }
        
        // Then try to find by partial name match
        for (const invItem of player.inventory) {
            const itemData = this.getItemData(invItem.itemId);
            if (!itemData) continue;
            
            const cleanItemName = itemData.name.toLowerCase().replace(/[_\s-]/g, '');
            const cleanItemId = invItem.itemId.replace(/[_\s-]/g, '');
            
            if (cleanItemName.includes(searchName) || cleanItemId.includes(searchName)) {
                return { item: invItem, itemId: invItem.itemId };
            }
        }
        
        return { item: null, itemId: null };
    }

    /**
     * Check if player has a specific item
     * @param {Object} player - Player object
     * @param {string} itemId - Item ID to check
     * @param {number} quantity - Required quantity (default: 1)
     * @returns {boolean} Whether player has the item
     */
    static hasItem(player, itemId, quantity = 1) {
        const item = player.inventory.find(i => i.itemId === itemId);
        return item && item.quantity >= quantity;
    }

    /**
     * Format item name for display
     * @param {string} itemId - Item ID
     * @param {number} quantity - Item quantity (optional)
     * @returns {string} Formatted item name
     */
    static formatItemName(itemId, quantity = null) {
        const itemData = this.getItemData(itemId);
        const name = itemData?.name || itemId;
        return quantity !== null ? `${quantity}x ${name}` : name;
    }

    /**
     * Format pet name for display
     * @param {string} petId - Pet ID
     * @param {Object} pet - Pet object (optional, for nickname)
     * @returns {string} Formatted pet name
     */
    static formatPetName(petId, pet = null) {
        const petData = this.getPetData(petId);
        const baseName = petData?.name || petId;
        return pet?.nickname || baseName;
    }

    /**
     * Get member from message (author or mentioned user)
     * @param {Object} message - Discord message object
     * @param {string} arg - Argument string (mention or user ID)
     * @returns {Promise<Object|null>} Guild member or null
     */
    static async getMemberFromMessage(message, arg) {
        try {
            return getMember(message, arg) || message.member;
        } catch (error) {
            console.error('Error getting member from message:', error);
            return null;
        }
    }

    /**
     * Validate player and return error embed if not found
     * @param {string} userId - User ID
     * @param {string} prefix - Command prefix
     * @param {Object} message - Message object (for member context)
     * @returns {Promise<Object>} Result with player or error embed
     */
    static async requirePlayer(userId, prefix, message = null) {
        const result = await this.validatePlayer(userId, prefix);
        if (!result.success) {
            return result;
        }
        return result;
    }

    /**
     * Validate pet and return error embed if not found
     * @param {string} ownerId - Owner user ID
     * @param {number} shortId - Pet short ID
     * @param {string} prefix - Command prefix
     * @returns {Promise<Object>} Result with pet or error embed
     */
    static async requirePet(ownerId, shortId, prefix) {
        return await this.validatePet(ownerId, shortId, prefix);
    }

    /**
     * Get player's inventory item by ID
     * @param {Object} player - Player object
     * @param {string} itemId - Item ID
     * @returns {Object|null} Inventory item or null
     */
    static getInventoryItem(player, itemId) {
        return player.inventory.find(item => item.itemId === itemId) || null;
    }

    /**
     * Check if pet is available (not in use)
     * @param {Object} pet - Pet object
     * @returns {boolean} Whether pet is available
     */
    static isPetAvailable(pet) {
        return pet && pet.status === 'Idle' && (pet.currentHp === null || pet.currentHp > 0);
    }

    /**
     * Format time remaining
     * @param {Date} targetDate - Target date
     * @returns {string} Formatted time string
     */
    static formatTimeRemaining(targetDate) {
        if (!targetDate) return 'N/A';
        
        const now = new Date();
        const timeLeft = targetDate - now;
        
        if (timeLeft <= 0) return 'Ready!';
        
        return this.formatDuration(timeLeft);
    }

    /**
     * Create XP progress bar
     * @param {number} currentXp - Current XP
     * @param {number} requiredXp - Required XP for next level
     * @param {number} length - Bar length (default: 10)
     * @returns {string} Progress bar string
     */
    static createXPProgressBar(currentXp, requiredXp, length = 10) {
        return this.createProgressBar(currentXp, requiredXp, length);
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

    /**
     * Get user's target member (self or mentioned user)
     * @param {Object} message - Discord message
     * @param {Array} args - Command arguments
     * @param {string} prefix - Command prefix
     * @returns {Promise<Object>} Result with member and player
     */
    static async getTargetMember(message, args, prefix) {
        const member = await this.getMemberFromMessage(message, args.join(' '));
        
        if (!member) {
            return {
                success: false,
                embed: createErrorEmbed('User Not Found', 'Could not find the specified user.')
            };
        }

        const playerResult = await this.validatePlayer(member.id, prefix);
        if (!playerResult.success) {
            return playerResult;
        }

        return {
            success: true,
            member,
            player: playerResult.player
        };
    }

    /**
     * Validate and get multiple pets by short IDs
     * @param {string} ownerId - Owner user ID
     * @param {Array<number>} shortIds - Array of pet short IDs
     * @param {string} prefix - Command prefix
     * @returns {Promise<Object>} Result with pets array
     */
    static async validatePets(ownerId, shortIds, prefix) {
        const pets = [];
        const errors = [];

        for (const shortId of shortIds) {
            const result = await this.validatePet(ownerId, shortId, prefix);
            if (result.success) {
                pets.push(result.pet);
            } else {
                errors.push(result.embed);
            }
        }

        if (errors.length > 0) {
            return {
                success: false,
                embed: errors[0] // Return first error
            };
        }

        return {
            success: true,
            pets
        };
    }

    /**
     * Check if player has required level
     * @param {Object} player - Player object
     * @param {number} requiredLevel - Required level
     * @returns {Object} Validation result
     */
    static checkLevel(player, requiredLevel) {
        if (player.level < requiredLevel) {
            return {
                success: false,
                embed: createErrorEmbed(
                    'Level Too Low',
                    `You need to be level **${requiredLevel}** to do this. You are currently level **${player.level}**.`
                )
            };
        }
        return { success: true };
    }

    /**
     * Check if player has required gold
     * @param {Object} player - Player object
     * @param {number} requiredGold - Required gold amount
     * @returns {Object} Validation result
     */
    static checkGold(player, requiredGold) {
        if (player.gold < requiredGold) {
            return {
                success: false,
                embed: createErrorEmbed(
                    'Insufficient Gold',
                    `You need **${requiredGold}** gold for this. You currently have **${player.gold}** gold.`
                )
            };
        }
        return { success: true };
    }

    /**
     * Get emoji for an item from config
     * @param {string} item - Item ID or name
     * @returns {Promise<string>} Emoji or empty string
     */
    static getItemEmoji(item) {
        try {
            let name;
            
            const itemData = this.getItemData(item);
            if (itemData && itemData.name) {
                name = itemData.name;
            } else {
                name = String(item);
            }
           
            let emoji = config.emojis[name];

            if (!emoji && itemData?.type === 'egg') {
                const rarityPrefixes = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Hybrid'];
                const words = name.split(' ');
                
                if (words.length > 2 && rarityPrefixes.includes(words[0])) {
                    const baseName = words.slice(1).join(' ');
                    emoji = config.emojis[baseName];
                }
            }

            return emoji || '';
        } catch (err) {
            console.error('Error fetching item emoji:', err);
            return '';
        }
    } 

    /**
     * Get emoji for a pal from config
     * @param {string} pal - Pal ID or name
     * @returns {Promise<string>} Emoji or empty string
     */
    static getPalEmoji(pal) {
        try {
            let name;
            
            const palData = GameData.getPet(pal);
            if (palData && palData.name) {
                name = palData.name;
            } else {
                name = String(pal);
            }
           
            let emoji = config.emojis[name];

            return emoji || '';
        } catch (err) {
            console.error('Error fetching pal emoji:', err);
            return '';
        }
    } 
}

module.exports = CommandHelpers;