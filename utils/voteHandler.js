const Player = require('../models/Player');
const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.json');
const { getCrateType, openCrate, isWeekend, crateTypes } = require('../gamedata/voteCrates');

async function handleVoteReward(userId, client) {
    try {
        const player = await Player.findOne({ userId });
        if (!player) {
            console.log(`[Vote Handler] User ${userId} voted but is not a player.`);
            return;
        }

        const now = new Date();
        const weekend = isWeekend();

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

        // --- Determine Crate Type & Open ---
        const crateType = getCrateType(player.voteStreak);
        const rewards = openCrate(crateType, weekend);
        const crate = crateTypes[crateType];

        // --- Apply Rewards ---
        player.gold += rewards.gold;
        player.arcaneDust += rewards.dust;

        // Add items to inventory
        for (const item of rewards.items) {
            const existingItem = player.inventory.find(i => i.itemId === item.itemId);
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                player.inventory.push({ itemId: item.itemId, quantity: item.quantity });
            }
        }

        // Add recipe scroll to grimoire if obtained
        if (rewards.scroll && !player.grimoire.includes(rewards.scroll.recipeId)) {
            player.grimoire.push(rewards.scroll.recipeId);
        }

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

        // --- Build the Reward Embed ---
        const embed = new EmbedBuilder()
            .setColor(crate.color)
            .setAuthor({ name: '🗳️ Thank You For Voting!', iconURL: client.user.displayAvatarURL() })
            .setTitle(`${crate.emoji} ${crate.name} Received!`)

        // Streak info
        let streakText = '';
        if (isStreak) {
            streakText = `🔥 **${player.voteStreak}-day** voting streak!`;
        } else {
            streakText = `Starting a new streak! Keep voting daily!`;
        }
        
        if (weekend) {
            streakText += `\n🎉 **WEEKEND BONUS:** Double rewards!`;
        }

        embed.addFields({ name: 'Streak Status', value: streakText, inline: false });

        // Items received + Currency in one field
        let rewardsText = '';
        
        // Add currency first
        const goldEmoji = config.emojis.gold || '🪙';
        const dustEmoji = config.emojis.arcane_dust || '✨';
        rewardsText += `${goldEmoji} **${rewards.gold.toLocaleString()}** Gold\n`;
        rewardsText += `${dustEmoji} **${rewards.dust.toLocaleString()}** Arcane Dust\n`;
        
        // Add items
        for (const item of rewards.items) {
            const emoji = config.emojis[item.name] || '�';
            rewardsText += `${emoji} **${item.name}** x${item.quantity}\n`;
        }
        
        // Add scroll if obtained
        if (rewards.scroll) {
            const scrollEmoji = config.emojis.scroll || '📜';
            rewardsText += `${scrollEmoji} **${rewards.scroll.name}** *(NEW!)*\n`;
        }

        embed.addFields({ name: 'Rewards', value: rewardsText.trim(), inline: false });

        // Buff info
        embed.addFields({ 
            name: 'Voter\'s Luck', 
            value: `🍀 Active for **12 hours**\n+10% rare encounter chance!`, 
            inline: true 
        });

        // Next crate preview
        const streakToNext = getStreakToNextCrate(player.voteStreak);
        if (streakToNext) {
            embed.setFooter({ text: streakToNext })
        } 

        embed.setTimestamp();

        // --- Notify the Player ---
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            user.send({ embeds: [embed] }).catch(() => {
                console.log(`Could not DM user ${userId} about their vote reward.`);
            });
        }

    } catch (error) {
        console.error(`Error handling vote reward for ${userId}:`, error);
    }
}

/**
 * Get streak info for next crate upgrade
 */
function getStreakToNextCrate(currentStreak) {
    if (currentStreak >= 40) return '🏆 You have the best crate!';
    if (currentStreak >= 20) return `${40 - currentStreak} more votes to 🌟 Legendary Crate`;
    if (currentStreak >= 10) return `${20 - currentStreak} more votes to 💎 Rare Crate`;
    return `${10 - currentStreak} more votes to 🎁 Uncommon Crate`;
}

module.exports = { handleVoteReward };