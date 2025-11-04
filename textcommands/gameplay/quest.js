const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const QuestProgress = require('../../models/Quest');
const questData = require('../../gamedata/quests');
const { createErrorEmbed, createSuccessEmbed, createCustomEmbed } = require('../../utils/embed');
const { initializeQuestProgress, updateQuestProgress } = require('../../utils/questSystem');

module.exports = {
    name: 'quest',
    description: 'View and manage your quests and faction reputation.',
    usage: 'list [type] | info <quest_id> | start <quest_id> | abandon <quest_id> | rep',
    aliases: ['q', 'quests'],
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({ 
                    embeds: [createErrorEmbed('No Adventure Started', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`)] 
                });
            }

            let questProgress = await QuestProgress.findOne({ playerId: message.author.id });
            if (!questProgress) {
                questProgress = await initializeQuestProgress(message.author.id);
            }

            const subcommand = args[0]?.toLowerCase();

            switch (subcommand) {
                case 'list':
                    await handleQuestList(message, args, player, questProgress);
                    break;
                case 'info':
                    await handleQuestInfo(message, args, player, questProgress);
                    break;
                case 'start':
                    await handleStartQuest(message, args, player, questProgress);
                    break;
                case 'abandon':
                    await handleAbandonQuest(message, args, player, questProgress);
                    break;
                case 'rep':
                    await handleFactionInfo(message, args, player, questProgress);
                    break;
                default:
                    await showQuestMenu(message, player, questProgress);
            }

        } catch (error) {
            console.error('Quest command error:', error);
            const errorEmbed = createErrorEmbed(
                'Quest System Error', 
                'An unexpected error occurred. Please try again or contact support if the issue persists.'
            );
            message.reply({ embeds: [errorEmbed] }).catch(console.error);
        }
    }
};

async function handleQuestList(message, args, player, questProgress) {
    try {
        const filterType = args[1]?.toLowerCase();
        const validTypes = ['available', 'active', 'completed', 'daily', 'weekly', 'main', 'faction'];
        
        let filteredQuests = questProgress.quests || [];
        let title = 'All Quests';
        
        if (filterType && validTypes.includes(filterType)) {
            if (['available', 'active', 'completed'].includes(filterType)) {
                filteredQuests = filteredQuests.filter(q => q.status === filterType);
                title = `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Quests`;
            } else {
                filteredQuests = filteredQuests.filter(q => {
                    const questInfo = questData[q.questId];
                    return questInfo && questInfo.type === filterType;
                });
                title = `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Quests`;
            }
        }
        
        if (filteredQuests.length === 0) {
            const noQuestsEmbed = createCustomEmbed(
                'No Quests Found', 
                `You have no ${filterType || 'quests'} at this time.\n\n` +
                `Use \`quest list\` to see all available quest types.`, 
                '#FFA500'
            );
            return message.reply({ embeds: [noQuestsEmbed] });
        }
        
        const statusPriority = { active: 1, available: 2, completed: 3, failed: 4 };
        filteredQuests.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
        
        const questsPerPage = 8;
        let currentPage = 0;
        const totalPages = Math.ceil(filteredQuests.length / questsPerPage);
        
        const generateQuestListEmbed = (page) => {
            const start = page * questsPerPage;
            const pageQuests = filteredQuests.slice(start, start + questsPerPage);
            
            const questList = pageQuests.map(quest => {
                const questInfo = questData[quest.questId];
                if (!questInfo) return `❓ **Unknown Quest** (${quest.questId})\n└ Quest data not found`;
                
                const statusEmoji = {
                    'available': '📋',
                    'active': '⚡',
                    'completed': '✅',
                    'failed': '❌'
                }[quest.status] || '❓';
                
                const typeEmoji = {
                    'main': '📖',
                    'daily': '☀️',
                    'weekly': '🗓️',
                    'faction': '🏛️'
                }[questInfo.type] || '📝';
                
                const progressText = quest.status === 'active' ? getQuestProgressText(quest, questInfo) : '';
                
                return `${statusEmoji} ${typeEmoji} **${questInfo.name}** \`${quest.questId}\`\n└ ${questInfo.description}${progressText}`;
            }).join('\n\n');
            
            return createCustomEmbed(
                `📚 ${title}`,
                questList,
                '#4169E1',
                {
                    footer: { text: `Page ${page + 1} of ${totalPages} • Total: ${filteredQuests.length} quests` },
                    timestamp: false
                }
            );
        };
        
        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous_quest')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⬅️')
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next_quest')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
                    .setDisabled(page >= totalPages - 1)
            );
        };
        
        const reply = await message.reply({
            embeds: [generateQuestListEmbed(currentPage)],
            components: totalPages > 1 ? [generateButtons(currentPage)] : []
        });
        
        if (totalPages > 1) {
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000,
                componentType: ComponentType.Button
            });
            
            collector.on('collect', async i => {
                try {
                    if (i.customId === 'next_quest') currentPage++;
                    else if (i.customId === 'previous_quest') currentPage--;
                    
                    await i.update({ 
                        embeds: [generateQuestListEmbed(currentPage)], 
                        components: [generateButtons(currentPage)] 
                    });
                } catch (error) {
                    console.error('Button interaction error:', error);
                    await i.deferUpdate().catch(() => {});
                }
            });
            
            collector.on('end', () => {
                const finalComponents = generateButtons(currentPage);
                finalComponents.components.forEach(button => button.setDisabled(true));
                reply.edit({ components: [finalComponents] }).catch(() => {});
            });
        }
    } catch (error) {
        console.error('Quest list error:', error);
        throw error;
    }
}

function getQuestProgressText(quest, questInfo) {
    if (!questInfo.objectives || !quest.progress) return '';
    
    const progressEntries = Object.entries(questInfo.objectives).map(([obj, req]) => {
        const current = quest.progress.get(obj) || 0;
        return `${current}/${req}`;
    });
    
    return `\n   Progress: ${progressEntries.join(', ')}`;
}

async function handleQuestInfo(message, args, player, questProgress) {
    try {
        if (!args[1]) {
            return message.reply({ 
                embeds: [createErrorEmbed('Missing Quest ID', 'Usage: `quest info <quest_id>`\n\nYou can find quest IDs in the quest list.')] 
            });
        }
        
        const questId = args[1].toLowerCase();
        const questInfo = questData[questId];
        
        if (!questInfo) {
            const availableQuests = Object.keys(questData).slice(0, 5).join(', ');
            return message.reply({ 
                embeds: [createErrorEmbed(
                    'Quest Not Found', 
                    `No quest found with ID: \`${questId}\`\n\n` +
                    `Available quest IDs include: ${availableQuests}...`
                )] 
            });
        }
        
        const playerQuest = questProgress.quests.find(q => q.questId === questId);
        
        const questEmbed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle(`📜 ${questInfo.name}`)
            .setDescription(questInfo.description)
            .addFields([
                { 
                    name: '📊 Quest Details', 
                    value: `**Type:** ${questInfo.type}\n**Level Required:** ${questInfo.levelRequirement}\n**Faction:** ${questInfo.faction || 'None'}`,
                    inline: true 
                },
                { 
                    name: '🎯 Objectives', 
                    value: Object.entries(questInfo.objectives || {}).map(([obj, req]) => {
                        const current = playerQuest?.progress?.get(obj) || 0;
                        const progressBar = generateProgressBar(current, req);
                        return `${obj.replace(/_/g, ' ')}: ${current}/${req} ${progressBar}`;
                    }).join('\n') || 'No objectives defined',
                    inline: true 
                }
            ]);
        
        if (questInfo.prerequisites && questInfo.prerequisites.length > 0) {
            const prereqText = questInfo.prerequisites.map(id => {
                const prereqInfo = questData[id];
                const prereqQuest = questProgress.quests.find(q => q.questId === id);
                const status = prereqQuest?.status === 'completed' ? '✅' : '❌';
                return `${status} ${prereqInfo?.name || id}`;
            }).join('\n');
            
            questEmbed.addFields({ name: '📋 Prerequisites', value: prereqText, inline: false });
        }
        
        if (questInfo.rewards) {
            let rewardText = '';
            if (questInfo.rewards.xp) rewardText += `**XP:** ${questInfo.rewards.xp}\n`;
            if (questInfo.rewards.gold) rewardText += `**Gold:** ${questInfo.rewards.gold}\n`;
            if (questInfo.rewards.items && questInfo.rewards.items.length > 0) {
                rewardText += `**Items:** ${questInfo.rewards.items.map(item => `${item.quantity}x ${item.itemId}`).join(', ')}\n`;
            }
            if (questInfo.rewards.reputation) {
                rewardText += `**Reputation:** ${Object.entries(questInfo.rewards.reputation).map(([faction, rep]) => `${faction} ${rep > 0 ? '+' : ''}${rep}`).join(', ')}`;
            }
            
            questEmbed.addFields({ name: '🎁 Rewards', value: rewardText || 'No rewards', inline: false });
        }
        
        if (playerQuest) {
            const statusText = `**Current Status:** ${playerQuest.status}\n` +
                              `**Started:** ${playerQuest.startedAt ? playerQuest.startedAt.toDateString() : 'Not started'}\n` +
                              (playerQuest.completedAt ? `**Completed:** ${playerQuest.completedAt.toDateString()}` : '');
            
            questEmbed.addFields({ name: '📊 Your Progress', value: statusText, inline: false });
        }
        
        message.reply({ embeds: [questEmbed] });
    } catch (error) {
        console.error('Quest info error:', error);
        throw error;
    }
}

function generateProgressBar(current, max, length = 10) {
    const progress = Math.min(current / max, 1);
    const filled = Math.floor(progress * length);
    const empty = length - filled;
    return `[${'▓'.repeat(filled)}${'░'.repeat(empty)}]`;
}

async function handleStartQuest(message, args, player, questProgress) {
    try {
        if (!args[1]) {
            return message.reply({ 
                embeds: [createErrorEmbed('Missing Quest ID', 'Usage: `quest start <quest_id>`\n\nUse `quest list available` to see available quests.')] 
            });
        }
        
        const questId = args[1].toLowerCase();
        const questInfo = questData[questId];
        
        if (!questInfo) {
            return message.reply({ 
                embeds: [createErrorEmbed('Quest Not Found', `No quest found with ID: \`${questId}\``)] 
            });
        }
        
        const playerQuest = questProgress.quests.find(q => q.questId === questId);
        
        if (!playerQuest) {
            return message.reply({ 
                embeds: [createErrorEmbed('Quest Unavailable', 'This quest is not available to you yet. Check prerequisites and level requirements.')] 
            });
        }
        
        if (playerQuest.status !== 'available') {
            const statusMessage = {
                'active': 'This quest is already active.',
                'completed': 'This quest has already been completed.',
                'failed': 'This quest has failed. It may reset at the next daily/weekly reset.'
            }[playerQuest.status] || `This quest is currently ${playerQuest.status}.`;
            
            return message.reply({ 
                embeds: [createErrorEmbed('Cannot Start Quest', statusMessage)] 
            });
        }
        
        if (player.level < questInfo.levelRequirement) {
            return message.reply({ 
                embeds: [createErrorEmbed(
                    'Level Too Low', 
                    `You need to be level ${questInfo.levelRequirement} to start this quest. You are currently level ${player.level}.`
                )] 
            });
        }
        
        if (questInfo.prerequisites && questInfo.prerequisites.length > 0) {
            const unmetPrereqs = questInfo.prerequisites.filter(prereqId => {
                const prereqQuest = questProgress.quests.find(q => q.questId === prereqId);
                return !prereqQuest || prereqQuest.status !== 'completed';
            });
            
            if (unmetPrereqs.length > 0) {
                const prereqNames = unmetPrereqs.map(id => questData[id]?.name || id).join(', ');
                return message.reply({ 
                    embeds: [createErrorEmbed(
                        'Prerequisites Not Met', 
                        `You must complete these quests first: ${prereqNames}`
                    )] 
                });
            }
        }
        
        const activeQuests = questProgress.quests.filter(q => q.status === 'active').length;
        const maxActiveQuests = Math.min(5 + Math.floor(player.level / 10), 10); // Scale with level
        
        if (activeQuests >= maxActiveQuests) {
            return message.reply({ 
                embeds: [createErrorEmbed(
                    'Too Many Active Quests', 
                    `You can only have ${maxActiveQuests} active quests at a time. Complete or abandon some first.`
                )] 
            });
        }
        
        playerQuest.status = 'active';
        playerQuest.startedAt = new Date();
        playerQuest.progress = new Map();
        playerQuest.lastUpdate = new Date();
        
        Object.keys(questInfo.objectives || {}).forEach(objective => {
            playerQuest.progress.set(objective, 0);
        });
        
        await questProgress.save();
        
        const successEmbed = createSuccessEmbed(
            'Quest Started!',
            `🎯 You have started **${questInfo.name}**!\n\n` +
            `Use \`quest info ${questId}\` to track your progress.\n` +
            `Use \`quest list active\` to see all your active quests.`
        );
        
        message.reply({ embeds: [successEmbed] });
    } catch (error) {
        console.error('Start quest error:', error);
        throw error;
    }
}

async function handleAbandonQuest(message, args, player, questProgress) {
    try {
        if (!args[1]) {
            return message.reply({ 
                embeds: [createErrorEmbed('Missing Quest ID', 'Usage: `quest abandon <quest_id>`')] 
            });
        }
        
        const questId = args[1].toLowerCase();
        const questInfo = questData[questId];
        const playerQuest = questProgress.quests.find(q => q.questId === questId);
        
        if (!questInfo || !playerQuest) {
            return message.reply({ 
                embeds: [createErrorEmbed('Quest Not Found', `No active quest found with ID: \`${questId}\``)] 
            });
        }
        
        if (playerQuest.status !== 'active') {
            return message.reply({ 
                embeds: [createErrorEmbed('Cannot Abandon Quest', 'You can only abandon active quests.')] 
            });
        }
        
        if (questInfo.type === 'main') {
            const confirmEmbed = createCustomEmbed(
                '⚠️ Abandon Main Quest?',
                `Are you sure you want to abandon **${questInfo.name}**?\n\n` +
                'Main quests are important for story progression and may not be easily recoverable.',
                '#FFA500'
            );
            
            const confirmButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_abandon')
                    .setLabel('Yes, Abandon')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚠️'),
                new ButtonBuilder()
                    .setCustomId('cancel_abandon')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );
            
            const confirmReply = await message.reply({
                embeds: [confirmEmbed],
                components: [confirmButton]
            });
            
            const collector = confirmReply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 30000,
                componentType: ComponentType.Button
            });
            
            collector.on('collect', async i => {
                if (i.customId === 'confirm_abandon') {
                    await performQuestAbandon(i, playerQuest, questInfo, questProgress);
                } else {
                    await i.update({ 
                        embeds: [createCustomEmbed('Cancelled', 'Quest abandonment cancelled.', '#808080')],
                        components: []
                    });
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    confirmReply.edit({ components: [] }).catch(() => {});
                }
            });
        } else {
            playerQuest.status = 'available';
            playerQuest.progress = new Map();
            playerQuest.startedAt = null;
            playerQuest.lastUpdate = new Date();
            
            await questProgress.save();
            
            const successEmbed = createSuccessEmbed(
                'Quest Abandoned',
                `You have abandoned **${questInfo.name}**.\n\nYou can start it again later using \`quest start ${questId}\`.`
            );
            
            message.reply({ embeds: [successEmbed] });
        }
    } catch (error) {
        console.error('Abandon quest error:', error);
        throw error;
    }
}

async function performQuestAbandon(interaction, playerQuest, questInfo, questProgress) {
    try {
        playerQuest.status = 'available';
        playerQuest.progress = new Map();
        playerQuest.startedAt = null;
        playerQuest.lastUpdate = new Date();
        
        await questProgress.save();
        
        const successEmbed = createSuccessEmbed(
            'Quest Abandoned',
            `You have abandoned **${questInfo.name}**.\n\nYou can start it again using \`quest start ${playerQuest.questId}\`.`
        );
        
        await interaction.update({ embeds: [successEmbed], components: [] });
    } catch (error) {
        console.error('Perform quest abandon error:', error);
        await interaction.update({ 
            embeds: [createErrorEmbed('Error', 'Failed to abandon quest. Please try again.')],
            components: []
        }).catch(() => {});
    }
}

async function handleFactionInfo(message, args, player, questProgress) {
    try {
        const factionEmbed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🏛️ Reputation')
            .setDescription('Your standing with the various factions of the realm.')
            .addFields([
                { 
                    name: '🧪 Alchemists Guild', 
                    value: `**Reputation:** ${questProgress.factionReputation.alchemists}\n**Status:** ${getReputationStatus(questProgress.factionReputation.alchemists)}`,
                    inline: true 
                },
                { 
                    name: '💰 Merchants Union', 
                    value: `**Reputation:** ${questProgress.factionReputation.merchants}\n**Status:** ${getReputationStatus(questProgress.factionReputation.merchants)}`,
                    inline: true 
                },
                { 
                    name: '🗺️ Explorers Society', 
                    value: `**Reputation:** ${questProgress.factionReputation.explorers}\n**Status:** ${getReputationStatus(questProgress.factionReputation.explorers)}`,
                    inline: true 
                },
                { 
                    name: '⚔️ Guardians Order', 
                    value: `**Reputation:** ${questProgress.factionReputation.guardians}\n**Status:** ${getReputationStatus(questProgress.factionReputation.guardians)}`,
                    inline: true 
                },
                {
                    name: '📊 Reputation Guide',
                    value: 'Hated (-1000 to -251) | Hostile (-250 to -101)\nUnfriendly (-100 to -1) | Neutral (0 to 99)\nFriendly (100 to 249) | Honored (250 to 499)\nRevered (500 to 1000)',
                    inline: false
                }
            ]);
        
        message.reply({ embeds: [factionEmbed] });
    } catch (error) {
        console.error('Faction info error:', error);
        throw error;
    }
}

function getReputationStatus(rep) {
    if (rep >= 500) return '🌟 Revered';
    if (rep >= 250) return '💎 Honored';
    if (rep >= 100) return '😊 Friendly';
    if (rep >= 0) return '😐 Neutral';
    if (rep >= -100) return '😠 Unfriendly';
    if (rep >= -250) return '😡 Hostile';
    return '💀 Hated';
}

async function showQuestMenu(message, player, questProgress) {
    const activeQuests = questProgress.quests.filter(q => q.status === 'active').length;
    const availableQuests = questProgress.quests.filter(q => q.status === 'available').length;
    const completedQuests = questProgress.quests.filter(q => q.status === 'completed').length;
    
    const menuEmbed = createCustomEmbed(
        '📚 Quest Journal',
        `**Active Quests:** ${activeQuests}/5\n` +
        `**Available Quests:** ${availableQuests}\n` +
        `**Completed Quests:** ${completedQuests}\n\n` +
        '**Commands:**\n' +
        '`quest list [type]` - View quest list\n' +
        '`quest info <quest_id>` - View quest details\n' +
        '`quest start <quest_id>` - Start a quest\n' +
        '`quest abandon <quest_id>` - Abandon active quest\n' +
        '`quest rep` - View faction reputation',
        '#4169E1'
    );
    
    message.reply({ embeds: [menuEmbed] });
}