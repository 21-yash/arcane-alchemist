const cooldowns = new Map();

class CooldownManager {
    /**
     * Sets a cooldown for a specific user and command.
     * @param {string} userId - The Discord user ID.
     * @param {string} commandName - The name of the command.
     * @param {number} durationSeconds - The cooldown duration in seconds.
     */
    static set(userId, commandName, durationSeconds) {
        const key = `${userId}-${commandName}`;
        const expiresAt = Date.now() + durationSeconds * 1000;
        cooldowns.set(key, expiresAt);
    }

    /**
     * Checks if a user is currently on cooldown for a specific command.
     * @param {string} userId - The Discord user ID.
     * @param {string} commandName - The name of the command.
     * @returns {{ onCooldown: boolean, remaining: number }} An object indicating if the user is on cooldown and the remaining time in seconds.
     */
    static check(userId, commandName) {
        const key = `${userId}-${commandName}`;
        const expiresAt = cooldowns.get(key);

        if (!expiresAt) {
            return { onCooldown: false, remaining: 0 };
        }

        const remaining = (expiresAt - Date.now()) / 1000;

        if (remaining > 0) {
            return { onCooldown: true, remaining: Math.ceil(remaining) };
        } else {
            cooldowns.delete(key); // Clean up expired cooldown
            return { onCooldown: false, remaining: 0 };
        }
    }

    /**
     * Manually clears a specific cooldown for a user.
     * @param {string} userId - The Discord user ID.
     * @param {string} commandName - The name of the command.
     */
    static clear(userId, commandName) {
        const key = `${userId}-${commandName}`;
        cooldowns.delete(key);
    }

    /**
     * Proactively cleans up all expired cooldowns from the map to prevent memory leaks.
     * Should be run periodically.
     * @returns {number} The number of expired cooldowns that were removed.
     */
    static cleanup() {
        const now = Date.now();
        let clearedCount = 0;
        for (const [key, expiresAt] of cooldowns.entries()) {
            if (now > expiresAt) {
                cooldowns.delete(key);
                clearedCount++;
            }
        }
        if (clearedCount > 0) {
            console.log(`[CooldownManager] Proactively cleared ${clearedCount} expired cooldowns.`);
        }
        return clearedCount;
    }
}

module.exports = CooldownManager;