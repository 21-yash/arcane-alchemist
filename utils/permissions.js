const { PermissionFlagsBits } = require('discord.js');
const Blacklist = require('../models/Blacklist');
const DisabledCommand = require('../models/DisabledCommand');
const config = require('../config/config.json');

// In-memory cooldown tracking
const blacklistCooldowns = new Map();

/**
 * Check if a user has the required Discord permissions
 * @param {GuildMember} member - The guild member
 * @param {Array} requiredPermissions - Array of required Discord permissions
 * @returns {boolean} - Whether the user has permission
 */
function checkUserPermissions(member, requiredPermissions) {
    if (!member || !requiredPermissions || requiredPermissions.length === 0) return true;

    // Bot owner always has all permissions
    if (member.user.id === config.ownerId) return true;

    // Check Discord permissions
    return requiredPermissions.every(permission => {
        return member.permissions.has(PermissionFlagsBits[permission]);
    });
}

/**
 * Check if the bot has the required Discord permissions
 * @param {Guild} guild - The guild
 * @param {Array} requiredPermissions - Array of required Discord permissions
 * @returns {boolean} - Whether the bot has permission
 */
function checkBotPermissions(guild, requiredPermissions) {
    if (!guild || !requiredPermissions || requiredPermissions.length === 0) return true;

    const botMember = guild.members.me;
    if (!botMember) return false;

    // Check Discord permissions
    return requiredPermissions.every(permission => {
        return botMember.permissions.has(PermissionFlagsBits[permission]);
    });
}

/**
 * Check if a user is blacklisted and handle cooldown
 * @param {string} userId - The user ID to check
 * @param {string} guildId - The guild ID (optional for global blacklist)
 * @returns {Promise<Object>} - Blacklist status and notification info
 */
async function checkBlacklist(userId, guildId = null) {
    try {
        // Check for global blacklist first
        const globalBlacklist = await Blacklist.findOne({ userId, guildId: null });
        
        // Check for server-specific blacklist
        const serverBlacklist = guildId ? await Blacklist.findOne({ userId, guildId }) : null;
        
        const blacklistEntry = globalBlacklist || serverBlacklist;
        
        if (!blacklistEntry) {
            return {
                isBlacklisted: false,
                shouldNotify: false,
                reason: null
            };
        }

        // Check in-memory cooldown
        const now = Date.now();
        const cooldownTime = config.cooldowns.blacklistMessage; // 30 minutes in milliseconds
        const lastNotified = blacklistCooldowns.get(userId);

        let shouldNotify = true;

        if (lastNotified) {
            const timeSinceLastNotification = now - lastNotified;
            
            if (timeSinceLastNotification < cooldownTime) {
                shouldNotify = false;
            } else {
                // Update cooldown
                blacklistCooldowns.set(userId, now);
            }
        } else {
            // Set new cooldown
            blacklistCooldowns.set(userId, now);
        }

        return {
            isBlacklisted: true,
            shouldNotify,
            reason: blacklistEntry.reason
        };

    } catch (error) {
        console.error('Error checking blacklist:', error);
        return {
            isBlacklisted: false,
            shouldNotify: false,
            reason: null
        };
    }
}

/**
 * Check if a command is disabled in a guild
 * @param {string} commandName - The command name
 * @param {string} guildId - The guild ID
 * @returns {Promise<boolean>} - Whether the command is disabled
 */
async function isCommandDisabled(commandName, guildId) {
    try {
        const disabledCommand = await DisabledCommand.findOne({
            commandName,
            guildId
        });

        return !!disabledCommand;
    } catch (error) {
        console.error('Error checking disabled command:', error);
        return false;
    }
}

// Clean up expired cooldowns every 10 minutes
setInterval(() => {
    const now = Date.now();
    const cooldownTime = config.cooldowns.blacklistMessage;
    
    for (const [userId, lastNotified] of blacklistCooldowns.entries()) {
        if (now - lastNotified > cooldownTime) {
            blacklistCooldowns.delete(userId);
        }
    }
}, 600000); // 10 minutes

module.exports = {
    checkUserPermissions,
    checkBotPermissions,
    checkBlacklist,
    isCommandDisabled
};
