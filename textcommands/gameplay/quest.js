const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embed');
const { getQuestProgress, dailyQuestPool, weeklyQuestPool, storyQuests } = require('../../utils/questSystem');
const CommandHelpers = require('../../utils/commandHelpers');
const config = require('../../config/config.json');

// Shorthand for frequently used emojis
const e = config.emojis;

module.exports = {
    name: 'quest',
    description: 'View your daily, weekly, and story quests.',
    usage: '',
    aliases: ['q', 'quests'],
    cooldown: 5,
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const qp = await getQuestProgress(message.author.id);

            let currentTab = 'daily';

            const buildEmbed = (tab) => {
                switch (tab) {
                    case 'daily':  return buildDailyEmbed(qp, player);
                    case 'weekly': return buildWeeklyEmbed(qp, player);
                    case 'story':  return buildStoryEmbed(qp, player);
                    default:       return buildDailyEmbed(qp, player);
                }
            };

            const buildButtons = (tab) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('quest_daily')
                        .setLabel('Daily')
                        .setEmoji('☀️')
                        .setStyle(tab === 'daily' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('quest_weekly')
                        .setLabel('Weekly')
                        .setEmoji('🗓️')
                        .setStyle(tab === 'weekly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('quest_story')
                        .setLabel('Story')
                        .setEmoji('📖')
                        .setStyle(tab === 'story' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                );
            };

            const reply = await message.reply({
                embeds: [buildEmbed(currentTab)],
                components: [buildButtons(currentTab)]
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 3 * 60 * 1000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async i => {
                try {
                    if (i.customId === 'quest_daily')  currentTab = 'daily';
                    if (i.customId === 'quest_weekly') currentTab = 'weekly';
                    if (i.customId === 'quest_story')  currentTab = 'story';

                    await i.update({
                        embeds: [buildEmbed(currentTab)],
                        components: [buildButtons(currentTab)]
                    });
                } catch (err) {
                    await i.deferUpdate().catch(() => {});
                }
            });

            collector.on('end', () => {
                const disabledRow = buildButtons(currentTab);
                disabledRow.components.forEach(b => b.setDisabled(true));
                reply.edit({ components: [disabledRow] }).catch(() => {});
            });

        } catch (error) {
            console.error('Quest command error:', error);
            message.reply({ embeds: [createErrorEmbed('Quest Error', 'Something went wrong. Please try again.')] }).catch(() => {});
        }
    }
};

// ═══════════════════════════════════════════════════════════════
//  EMBED BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildDailyEmbed(qp, player) {
    const completedCount = qp.dailyQuests.filter(q => q.completed).length;
    const resetTime = getNextDailyReset();
    const timeLeft = formatTimeRemaining(resetTime);

    let desc = `${e.success} **Completed:** ${completedCount}/3  •  ${e.loading} **Resets in:** ${timeLeft}\n\n`;

    if (qp.dailyQuests.length === 0) {
        desc += '*No daily quests assigned yet. They will appear on reset!*';
    }

    for (const dq of qp.dailyQuests) {
        const def = dailyQuestPool.find(q => q.id === dq.questId);
        if (!def) continue;

        const status = dq.completed ? e.success : e.loading;
        const objectiveText = formatObjectives(def.objectives, dq.progress);
        const rewardText = formatRewards(def.rewards);

        desc += `${status} **${def.name}**\n`;
        desc += `> ${def.description}\n`;
        desc += `> ${objectiveText}\n`;
        if (!dq.completed) desc += `> ${rewardText}\n`;
        desc += '\n';
    }

    return new EmbedBuilder()
        .setColor('#F39C12')
        .setTitle('☀️  Daily Quests')
        .setDescription(desc)
        .setFooter({ text: `Lifetime daily quests completed: ${qp.dailyQuestsCompleted}` });
}

function buildWeeklyEmbed(qp, player) {
    const completedCount = qp.weeklyQuests.filter(q => q.completed).length;
    const resetTime = getNextWeeklyReset();
    const timeLeft = formatTimeRemaining(resetTime);

    let desc = `${e.success} **Completed:** ${completedCount}/2  •  ${e.loading} **Resets in:** ${timeLeft}\n\n`;

    if (qp.weeklyQuests.length === 0) {
        desc += '*No weekly quests assigned yet. They will appear on reset!*';
    }

    for (const wq of qp.weeklyQuests) {
        const def = weeklyQuestPool.find(q => q.id === wq.questId);
        if (!def) continue;

        const status = wq.completed ? e.success : e.loading;
        const objectiveText = formatObjectives(def.objectives, wq.progress);
        const rewardText = formatRewards(def.rewards);

        desc += `${status} **${def.name}**\n`;
        desc += `> ${def.description}\n`;
        desc += `> ${objectiveText}\n`;
        if (!wq.completed) desc += `> ${rewardText}\n`;
        desc += '\n';
    }

    return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🗓️  Weekly Quests')
        .setDescription(desc)
        .setFooter({ text: `Lifetime weekly quests completed: ${qp.weeklyQuestsCompleted}` });
}

function buildStoryEmbed(qp, player) {
    const idx = qp.currentStoryIndex;
    let desc = '';

    if (idx === -1 || idx >= storyQuests.length) {
        desc = `${e.success} **All story quests completed!** You have become a true legend of the Arcane.\n\n`;
        // Show completed list
        for (let i = 0; i < storyQuests.length; i++) {
            desc += `${e.success} ~~${storyQuests[i].name}~~\n`;
        }
    } else {
        // Show previous + current + locked
        for (let i = 0; i < storyQuests.length; i++) {
            const sq = storyQuests[i];
            if (i < idx) {
                // Completed
                desc += `${e.success} ~~${sq.name}~~\n`;
            } else if (i === idx) {
                // Current / Active
                const objectiveText = formatObjectives(sq.objectives, qp.storyProgress);
                const rewardText = formatRewards(sq.rewards);
                const levelOk = player.level >= sq.levelRequired;

                desc += `\n⭐ **${sq.name}** ${!levelOk ? `🔒 Lv.${sq.levelRequired}` : ''}\n`;
                desc += `> ${sq.description}\n`;
                if (levelOk) {
                    desc += `> ${objectiveText}\n`;
                    desc += `> ${rewardText}\n`;
                } else {
                    desc += `> *Reach level ${sq.levelRequired} to unlock this quest.*\n`;
                }
                desc += '\n';
            } else {
                // Locked
                desc += `🔒 ${sq.name} *(Lv.${sq.levelRequired})*\n`;
            }
        }
    }

    desc += `\n**Story quests completed:** ${qp.storyQuestsCompleted}/${storyQuests.length}`;

    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('📖  Story Quests')
        .setDescription(desc);
}

// ═══════════════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════════════

function formatObjectives(objectives, progressMap) {
    return Object.entries(objectives).map(([key, required]) => {
        const current = progressMap?.get(key) || 0;
        const done = current >= required;
        const bar = progressBar(current, required);
        const label = key.replace(/_/g, ' ');
        return `${done ? e.success : '▸'} ${label}: **${current}**/${required} ${bar}`;
    }).join('\n> ');
}

function formatRewards(rewards) {
    const parts = [];
    if (rewards.xp) parts.push(`**${rewards.xp}** XP`);
    if (rewards.gold) parts.push(`${e.gold} **${rewards.gold}**`);
    if (rewards.arcaneDust) parts.push(`${e.arcane_dust} **${rewards.arcaneDust}**`);
    if (rewards.items) {
        rewards.items.forEach(i => {
            const itemEmoji = e[i.itemId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())] || '';
            parts.push(`${itemEmoji} **${i.quantity}x** ${i.itemId.replace(/_/g, ' ')}`);
        });
    }
    return parts.join('  ');
}

function progressBar(current, max, length = 8) {
    const ratio = Math.min(current / max, 1);
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    return `[${'■'.repeat(filled)}${'□'.repeat(empty)}]`;
}

function getNextDailyReset() {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(18, 30, 0, 0); // midnight IST
    if (now >= reset) reset.setUTCDate(reset.getUTCDate() + 1);
    return reset;
}

function getNextWeeklyReset() {
    const now = new Date();
    // Next Monday 00:00 IST = Sunday 18:30 UTC
    const reset = new Date(now);
    reset.setUTCHours(18, 30, 0, 0);
    const day = reset.getUTCDay(); // 0=Sun
    // Days until next Monday (day 1)
    let daysUntil = (1 - day + 7) % 7;
    if (daysUntil === 0 && now >= reset) daysUntil = 7;
    reset.setUTCDate(reset.getUTCDate() + daysUntil);
    return reset;
}

function formatTimeRemaining(target) {
    const ms = target - Date.now();
    if (ms <= 0) return 'now';
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        return `${days}d ${remHours}h`;
    }
    return `${hours}h ${mins}m`;
}