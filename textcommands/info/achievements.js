const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');
const { createErrorEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const config = require('../../config/config.json');

const ACHIEVEMENTS_PER_PAGE = 7;
const ACCENT_COLOR = 0xFFD700; // Gold

// Helper to safely extract emoji ID or fallback to string for buttons
const getBtnEmoji = (emojiStr, fallback) => {
    if (!emojiStr) return fallback;
    const match = emojiStr.match(/<a?:.+:(\d+)>/);
    return match ? match[1] : emojiStr;
};

// Helper to determine the best emoji based on achievement ID
const getAchievementEmoji = (id, unlocked) => {
    if (!unlocked) return '🔒';
    
    if (id.includes('forage')) return '🌿';
    if (id.includes('hatch')) return '🥚';
    if (id.includes('dungeon')) return '⚔️';
    if (id.includes('brew')) return '🧪';
    if (id.includes('craft')) return '🔨';
    if (id.includes('breed')) return '❤️';
    return '🏆';
};

// Format a single item reward using config emojis if available
const formatRewardItem = (itemName) => {
    // Attempt to map snake_case to Title Case to match config
    const words = itemName.split('_');
    const titleCase = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    const emoji = config.emojis[titleCase] || config.emojis[itemName] || '📦';
    return `${emoji} **${titleCase}**`;
};

function buildAchievementContainer(member, allAchievements, unlockedIds, page, totalPages, activeFilter) {
    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR);

    // ── Header Area ──
    const totalCount = allAchievements.length;
    const unlockedCount = unlockedIds.length;
    const percentage = Math.floor((unlockedCount / totalCount) * 100);
    
    let header = `## 🏆 ${member.displayName}'s Achievements\n`;
    header += `Progress: \`${unlockedCount} / ${totalCount}\` (${percentage}%)`;

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(header)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // ── Filter Select Menu ──
    const filterSelect = new StringSelectMenuBuilder()
        .setCustomId('ach_filter')
        .setPlaceholder('🔍 Filter achievements...');

    filterSelect.addOptions([
        {
            label: `All Achievements (${totalCount})`,
            value: 'all',
            emoji: '📋',
            default: activeFilter === 'all'
        },
        {
            label: `Unlocked (${unlockedCount})`,
            value: 'unlocked',
            emoji: '🏆',
            default: activeFilter === 'unlocked'
        },
        {
            label: `Locked (${totalCount - unlockedCount})`,
            value: 'locked',
            emoji: '🔒',
            default: activeFilter === 'locked'
        }
    ]);

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(filterSelect)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // ── Item List ──
    // Determine which achievements to show based on filter
    let filteredAchievements = allAchievements;
    if (activeFilter === 'unlocked') {
        filteredAchievements = allAchievements.filter(ach => unlockedIds.includes(ach.id));
    } else if (activeFilter === 'locked') {
        filteredAchievements = allAchievements.filter(ach => !unlockedIds.includes(ach.id));
    }

    // Recheck total pages based on filtering
    totalPages = Math.max(1, Math.ceil(filteredAchievements.length / ACHIEVEMENTS_PER_PAGE));
    // Ensure page doesn't go out of bounds if filter changes
    page = Math.min(page, totalPages - 1); 

    if (filteredAchievements.length === 0) {
        let msg = '*No achievements match this filter.*';
        if (activeFilter === 'unlocked') msg = '🔒 *No achievements unlocked yet. Start your adventure!*';
        if (activeFilter === 'locked') msg = '🎉 *Congratulations! You\'ve unlocked everything!*';
        
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(msg)
        );
    } else {
        const start = page * ACHIEVEMENTS_PER_PAGE;
        const pageItems = filteredAchievements.slice(start, start + ACHIEVEMENTS_PER_PAGE);

        let content = '';

        pageItems.forEach(achievement => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            const icon = getAchievementEmoji(achievement.id, isUnlocked);
            const titleFormat = isUnlocked ? `**${achievement.name}**` : `**~~${achievement.name}~~**`;
            
            content += `${icon} ${titleFormat}\n*${achievement.description}*\n`;
            
            // Format rewards nicely
            if (achievement.reward && !isUnlocked) {
                const rewards = [];
                if (achievement.reward.xp) rewards.push(`${config.emojis.info || '✨'} \`${achievement.reward.xp} XP\``);
                if (achievement.reward.gold) rewards.push(`${config.emojis.gold || '🪙'} \`${achievement.reward.gold} Gold\``);
                if (achievement.reward.item) rewards.push(formatRewardItem(achievement.reward.item));
                
                content += `> **Reward:** ${rewards.join(' | ')}\n`;
            }
            content += '\n'; // spacing
        });

        // Trim hanging newline
        content = content.trim();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content)
        );
    }

    // ── Pagination Buttons ──
    if (totalPages > 1) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true)
        );

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ach_first').setEmoji(getBtnEmoji(config.emojis.first, '⏮️')).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('ach_prev').setEmoji(getBtnEmoji(config.emojis.previous, '◀️')).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('ach_page').setLabel(`${page + 1} / ${totalPages}`).setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('ach_next').setEmoji(getBtnEmoji(config.emojis.next, '▶️')).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
                new ButtonBuilder().setCustomId('ach_last').setEmoji(getBtnEmoji(config.emojis.last, '⏭️')).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
            )
        );
    } else if (filteredAchievements.length > 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Page 1 of 1 • ${filteredAchievements.length} Achievements`)
        );
    }

    return { container, totalPages, newPage: page };
}

module.exports = {
    name: 'achievements',
    description: 'View your or another player\'s achievements.',
    usage: '[@user]',
    aliases: ['ach', 'trophy', 'achievement'],
    cooldown: 3,
    async execute(message, args, client, prefix) {
        try {
            // Get target member (self or mentioned user)
            const targetQuery = args.join(' ');
            const member = await CommandHelpers.getMemberFromMessage(message, targetQuery) || message.member;

            const playerResult = await CommandHelpers.validatePlayer(member.id, prefix);
            if (!playerResult.success) {
                const notStartedMsg = member.id === message.author.id 
                    ? `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    : `**${member.displayName}** has not started their alchemical journey yet.`;
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', notStartedMsg)] });
            }
            const player = playerResult.player;
            const allAchievements = GameData.achievement || [];

            let activeFilter = 'all';
            let currentPage = 0;

            const initialRender = buildAchievementContainer(member, allAchievements, player.achievements, currentPage, 1, activeFilter);
            currentPage = initialRender.newPage;

            const reply = await message.reply({
                components: [initialRender.container],
                flags: MessageFlags.IsComponentsV2
            });

            // --- Collector ---
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                try {
                    if (interaction.isStringSelectMenu() && interaction.customId === 'ach_filter') {
                        activeFilter = interaction.values[0];
                        currentPage = 0; // Reset page on filter change
                    } else if (interaction.isButton()) {
                        // Max pages checking will happen inside builder based on filtered amount
                        switch (interaction.customId) {
                            case 'ach_first': currentPage = 0; break;
                            case 'ach_prev':  currentPage = Math.max(0, currentPage - 1); break;
                            case 'ach_next':  currentPage++; break; // Builder bounds it
                            case 'ach_last':  currentPage = 999; break; // Builder upper bounds it
                        }
                    }

                    const updatedRender = buildAchievementContainer(member, allAchievements, player.achievements, currentPage, 1, activeFilter);
                    currentPage = updatedRender.newPage;

                    await interaction.update({
                        components: [updatedRender.container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (err) {
                    if (err.code === 10062) return; // Expired interaction
                    console.error('Achievement list interaction error:', err);
                }
            });

            collector.on('end', () => {
                const finalRender = buildAchievementContainer(member, allAchievements, player.achievements, currentPage, 1, activeFilter);
                
                // Disable interactive components
                finalRender.container.components.forEach(component => {
                    if (component.components) {
                        component.components.forEach(inner => {
                            if (inner.setDisabled) {
                                inner.setDisabled(true);
                            }
                        });
                    }
                });

                reply.edit({
                    components: [finalRender.container],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
            });

        } catch (error) {
            console.error('Achievements command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching achievements.')] });
        }
    }
};