
const Player = require('../../models/Player');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embed');
const { getMember } = require('../../utils/functions');
const allAchievements = require('../../gamedata/achievement');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const ACHIEVEMENTS_PER_PAGE = 6;

module.exports = {
    name: 'achievements',
    description: 'View your or another player\'s achievements.',
    usage: '[@user]',
    aliases: ['ach', 'trophy', 'achievement'],
    async execute(message, args, client, prefix) {
        try {
            // Use the getMember utility to find the target user, defaulting to the author
            const member = getMember(message, args.join(' ')) || message.member;

            const player = await Player.findOne({ userId: member.id });
            if (!player) {
                const notStartedMsg = member.id === message.author.id 
                    ? `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    : `**${member.displayName}** has not started their alchemical journey yet.`;
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', notStartedMsg)] });
            }

            const unlockedAchievements = allAchievements.filter(ach => player.achievements.includes(ach.id));
            const lockedAchievements = allAchievements.filter(ach => !player.achievements.includes(ach.id));

            let currentPage = 0;
            let showingUnlocked = true;
            
            const generateEmbed = (page, showUnlocked) => {
                const achievements = showUnlocked ? unlockedAchievements : lockedAchievements;
                const totalPages = Math.ceil(achievements.length / ACHIEVEMENTS_PER_PAGE);
                
                const start = page * ACHIEVEMENTS_PER_PAGE;
                const end = start + ACHIEVEMENTS_PER_PAGE;
                const pageAchievements = achievements.slice(start, end);

                let description = '';
                
                if (achievements.length === 0) {
                    description = showUnlocked 
                        ? '🔒 No achievements unlocked yet. Start your adventure to earn some!'
                        : '🎉 Congratulations! You\'ve unlocked all achievements!';
                } else {
                    pageAchievements.forEach(achievement => {
                        const statusIcon = showUnlocked ? '🏆' : '🔒';
                        const rewardText = achievement.reward 
                            ? `\n**Reward:** ${achievement.reward.xp ? `${achievement.reward.xp} XP` : ''}${achievement.reward.gold ? ` | ${achievement.reward.gold} Gold` : ''}${achievement.reward.item ? ` | ${achievement.reward.item}` : ''}`
                            : '';
                        
                        description += `${statusIcon} **${achievement.name}**\n*${achievement.description}*${rewardText}\n\n`;
                    });
                }

                const embed = createCustomEmbed(
                    `🏆 ${member.displayName}'s Achievements`,
                    description,
                    showUnlocked ? '#FFD700' : '#808080',
                    {
                        footer: {
                            text: `${showUnlocked ? 'Unlocked' : 'Locked'} Achievements | Page ${page + 1}/${Math.max(totalPages, 1)} | Total: ${player.achievements.length}/${allAchievements.length}`
                        }
                    }
                );

                return embed;
            };

            const generateButtons = (page, showUnlocked) => {
                const achievements = showUnlocked ? unlockedAchievements : lockedAchievements;
                const totalPages = Math.ceil(achievements.length / ACHIEVEMENTS_PER_PAGE);

                const buttons = [];

                // Toggle between unlocked/locked
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('toggle_achievements')
                        .setLabel(showUnlocked ? 'Show Locked' : 'Show Unlocked')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(showUnlocked ? '🔒' : '🏆')
                );

                // Navigation buttons (only if more than 1 page)
                if (totalPages > 1) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page >= totalPages - 1)
                    );
                }

                return new ActionRowBuilder().addComponents(buttons);
            };

            const achievementMessage = await message.reply({
                embeds: [generateEmbed(currentPage, showingUnlocked)],
                components: [generateButtons(currentPage, showingUnlocked)]
            });

            const collector = achievementMessage.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 5 * 60 * 1000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'toggle_achievements') {
                    showingUnlocked = !showingUnlocked;
                    currentPage = 0; // Reset to first page when toggling
                } else if (interaction.customId === 'next_page') {
                    currentPage++;
                } else if (interaction.customId === 'prev_page') {
                    currentPage--;
                }

                await interaction.update({
                    embeds: [generateEmbed(currentPage, showingUnlocked)],
                    components: [generateButtons(currentPage, showingUnlocked)]
                });
            });

            collector.on('end', () => {
                const disabledButtons = generateButtons(currentPage, showingUnlocked);
                disabledButtons.components.forEach(button => button.setDisabled(true));
                achievementMessage.edit({ components: [disabledButtons] }).catch(() => {});
            });

        } catch (error) {
            console.error('Achievements command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching achievements.')] });
        }
    }
};