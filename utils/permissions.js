const { PermissionFlagsBits } = require('discord.js');
const Blacklist = require('../models/Blacklist');
const DisabledCommand = require('../models/DisabledCommand');
const config = require('../config/config.json');

// In-memory cooldown tracking
const blacklistCooldowns = new Map();

// In-memory caching to prevent massive database latency spikes on every message
const cache = {
    blacklists: new Map(), // key: userId_guildId (or userId_global), value: { reason }
    disabledCommands: new Map(), // key: commandName_guildId, value: true
    initialized: false
};

let _initPromise = null;

/**
 * Initialize the permissions caches from the database
 */
async function initPermissionsCache() {
    if (cache.initialized) return;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        try {
            const allBlacklists = await Blacklist.find().lean();
            for (const b of allBlacklists) {
                const key = `${b.userId}_${b.guildId || 'global'}`;
                cache.blacklists.set(key, { reason: b.reason });
            }

            const allDisabled = await DisabledCommand.find().lean();
            for (const d of allDisabled) {
                cache.disabledCommands.set(`${d.commandName}_${d.guildId}`, true);
            }

            cache.initialized = true;
            console.log(`[Permissions] Cached ${cache.blacklists.size} blacklists and ${cache.disabledCommands.size} disabled commands.`);
        } catch (error) {
            _initPromise = null;
            console.error('Error initializing permissions cache:', error);
            throw error;
        }
    })();

    return _initPromise;
}

/**
 * Cache mutation helpers for commands that change permissions
 */
function updateBlacklistCache(userId, guildId, reason, isAdding) {
    const key = `${userId}_${guildId || 'global'}`;
    if (isAdding) {
        cache.blacklists.set(key, { reason });
    } else {
        cache.blacklists.delete(key);
    }
}

function updateDisabledCommandCache(commandName, guildId, isAdding) {
    const key = `${commandName}_${guildId}`;
    if (isAdding) {
        cache.disabledCommands.set(key, true);
    } else {
        cache.disabledCommands.delete(key);
    }
}

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
        if (!cache.initialized) await initPermissionsCache();

        // Check for global blacklist first
        const globalEntry = cache.blacklists.get(`${userId}_global`);
        
        // Check for server-specific blacklist
        const serverEntry = guildId ? cache.blacklists.get(`${userId}_${guildId}`) : null;
        
        const blacklistEntry = globalEntry || serverEntry;
        
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
        if (!cache.initialized) await initPermissionsCache();
        return cache.disabledCommands.has(`${commandName}_${guildId}`);
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
    isCommandDisabled,
    initPermissionsCache,
    updateBlacklistCache,
    updateDisabledCommandCache
};
