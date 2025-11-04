const Player = require('../models/Player');
const { createInfoEmbed } = require('./embed');
const config = require('../config/config.json');

async function handleVoteReward(userId, client) {
    try {
        const player = await Player.findOne({ userId });
        if (!player) {
            console.log(`[Vote Handler] User ${userId} voted but is not a player.`);
            return;
        }

        const now = new Date();
        const baseGoldReward = 500;
        const baseDustReward = 50;

        // --- Vote Streak Logic ---
        let isStreak = false;
        if (player.lastVotedAt) {
            const hoursSinceLastVote = (now - player.lastVotedAt) / (1000 * 60 * 60);
            // Top.gg allows votes every 12 hours. We allow up to 24 hours to maintain a streak.
            if (hoursSinceLastVote <= 24) {
                player.voteStreak += 1;
                isStreak = true;
            } else {
                player.voteStreak = 1; // Reset streak
            }
        } else {
            player.voteStreak = 1;
        }

        player.lastVotedAt = now;

        // --- Calculate Rewards ---
        // Increase rewards by 10% for each day in the streak, max of 100% bonus (10 days)
        const streakBonus = Math.min(player.voteStreak - 1, 10) * 0.10;
        const finalGold = Math.floor(baseGoldReward * (1 + streakBonus));
        const finalDust = Math.floor(baseDustReward * (1 + streakBonus));

        player.gold += finalGold;
        player.arcaneDust += finalDust;

        // --- Apply "Voter's Luck" Buff ---
        const buffDuration = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
        const expiresAt = now.getTime() + buffDuration;

        // Remove any existing voter buff to prevent stacking
        player.effects = player.effects.filter(e => e.type !== 'voter_luck');
        
        player.effects.push({
            type: 'voter_luck',
            expiresAt: expiresAt,
            strength: 1.1, // Represents a 10% bonus
            source: "Voter Luck"
        });

        await player.save();

        // --- Notify the Player ---
        let rewardMessage = `You have been rewarded with **${finalGold} Gold** and **${finalDust} Arcane Dust**!`;
        if (isStreak) {
            rewardMessage += `\n\n🔥 You are on a **${player.voteStreak}-day** voting streak! Your rewards were increased by **${Math.floor(streakBonus * 100)}%**.`;
        }
        rewardMessage += `\n\nYou have also received the **Voter's Luck** buff for 12 hours, slightly increasing your chances of finding rare items and Pals!`;

        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            const embed = createInfoEmbed('🗳️ Thank You For Voting!', rewardMessage);
            user.send({ embeds: [embed] }).catch(() => {
                console.log(`Could not DM user ${userId} about their vote reward.`);
            });
        }

    } catch (error) {
        console.error(`Error handling vote reward for ${userId}:`, error);
    }
}

module.exports = { handleVoteReward };