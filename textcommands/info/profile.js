const Player = require('../../models/Player');
const Pet = require('../../models/Pet'); 
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embed');
const { calculateXpForNextLevel } = require('../../utils/leveling');
const allAchievements = require('../../gamedata/achievement');
const { getMember } = require('../../utils/functions');
const { restoreStamina } = require('../../utils/stamina');

module.exports = {
    name: 'profile',
    description: 'View your or another player\'s alchemist profile.',
    usage: '[@user]',
    aliases: ['p', 'bal'],
    async execute(message, args, client, prefix) {
        try {
            // Use the getMember utility to find the target user, defaulting to the author
            const member = getMember(message, args.join(' ')) || message.member;

            let player = await Player.findOne({ userId: member.id });
            if (!player) {
                const notStartedMsg = member.id === message.author.id 
                    ? `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    : `**${member.displayName}** has not started their alchemical journey yet.`;
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', notStartedMsg)] });
            }
            player = await restoreStamina(player);

            // Fetch the count of pals owned by the player
            const palCount = await Pet.countDocuments({ ownerId: member.id });

            // --- Calculate XP Progress ---
            const xpForNextLevel = calculateXpForNextLevel(player.level);
            const progressPercentage = Math.floor((player.xp / xpForNextLevel) * 100);
            
            // Create a visual progress bar
            const filledBlocks = Math.round(progressPercentage / 10);
            const emptyBlocks = 10 - filledBlocks;
            const progressBar = '▓'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
            // ---------------------------

            const totalAchievements = allAchievements.length;

            const profileEmbed = createCustomEmbed(
                `Alchemist Profile: ${member.displayName}`,
                `**Level ${player.level}**\n\`${progressBar}\`\nXP: ${player.xp} / ${xpForNextLevel} (${progressPercentage}%)`,
                '#D2B48C', // A nice parchment color
                {
                    thumbnail: member.user.displayAvatarURL(),
                    fields: [
                        { name: '💰 Gold', value: `\`${player.gold}\``, inline: true },
                        { name: '⚡ Stamina', value: `\`${player.stamina}/${player.maxStamina}\``, inline: true },
                        { name: '🐾 Pals Owned', value: `\`${palCount}\``, inline: true },
                        { name: '🏆 Achievements', value: `\`${player.achievements.length}/${totalAchievements}\``, inline: true },
                        { name: '📊 Stats', value: `Forages: \`${player.stats.forageCount}\` \nDungeons Cleared: \`${player.stats.dungeonClears}\` \nPotions Brewed: \`${player.stats.potionsBrewed}\` \nItem Crafted: \`${player.stats.itemsCrafted}\`` }
                    ],
                    timestamp: false
                }
            );

            await message.reply({ embeds: [profileEmbed] });

        } catch (error) {
            console.error('Profile command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching the profile.')] });
        }
    }
};