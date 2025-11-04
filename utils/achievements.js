const Player = require('../models/Player');
const allAchievements = require('../gamedata/achievement');
const { createSuccessEmbed } = require('./embed');

/**
 * Checks and unlocks achievements for a player based on a specific event type.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @param {string} playerId The Discord ID of the player.
 * @param {string} eventType The type of event that was triggered (e.g., 'forage', 'eggHatch').
 * @param {any} eventData Additional data for specific achievements (like itemId for crafting).
 */
async function checkAchievements(client, playerId, eventType, eventData = null) {
    try {
        const player = await Player.findOne({ userId: playerId });
        if (!player) return;

        const achievementsToAnalyse = allAchievements.filter(a => a.condition.type === eventType);

        for (const achievement of achievementsToAnalyse) {
            const isAlreadyUnlocked = player.achievements.includes(achievement.id);
            if (isAlreadyUnlocked) continue;

            let shouldUnlock = false;

            // Handle different achievement types
            switch (eventType) {
                case 'forage':
                    shouldUnlock = player.stats.forageCount >= achievement.condition.count;
                    break;
                case 'eggHatch':
                    const hatchCount = player.stats.eggsHatched || 0;
                    shouldUnlock = hatchCount >= achievement.condition.count;
                    break;
                case 'palsBred':
                    const breedCount = player.stats.palsBred || 0;
                    shouldUnlock = breedCount >= achievement.condition.count;
                    break;
                case 'potionBrewed':
                    const brewCount = player.stats.potionsBrewed || 0;
                    shouldUnlock = brewCount >= achievement.condition.count;
                    break;
                case 'itemsCrafted':
                    const craftCount = player.stats.itemsCrafted || 0;
                    shouldUnlock = craftCount >= achievement.condition.count;
                    break;
                case 'dungeonClear':
                    const dungeonCount = player.stats.dungeonClears || 0;
                    shouldUnlock = dungeonCount >= achievement.condition.count;
                    break;
                case 'itemCraft':
                    // For specific item crafting achievements
                    shouldUnlock = achievement.condition.itemId === eventData;
                    break;
                default:
                    // Generic stat-based achievements
                    const statValue = player.stats[`${eventType}Count`] || 0;
                    shouldUnlock = statValue >= achievement.condition.count;
                    break;
            }

            if (shouldUnlock) {
                player.achievements.push(achievement.id);

                if (achievement.reward?.xp) {
                    player.xp += achievement.reward.xp;
                }
                if (achievement.reward?.gold) {
                    player.gold += achievement.reward.gold;
                }
                if (achievement.reward?.item) {
                    const itemInInventory = player.inventory.find(i => i.itemId === achievement.reward.item);
                    if (itemInInventory) {
                        itemInInventory.quantity += 1;
                    } else {
                        player.inventory.push({ itemId: achievement.reward.item, quantity: 1 });
                    }
                }

                await player.save();

                const user = await client.users.fetch(playerId).catch(() => null);
                if (user) {
                    const achievementEmbed = createSuccessEmbed(
                        '🏆 Achievement Unlocked!',
                        `**${achievement.name}**\n*${achievement.description}*`
                    );
                    user.send({ embeds: [achievementEmbed] }).catch(() => {}); // Catch if DMs are closed
                }
            }
        }
    } catch (error) {
        console.error(`[Achievements] Error checking achievements for ${playerId}:`, error);
    }
}

module.exports = { checkAchievements }; 