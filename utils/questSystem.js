const QuestProgress = require('../models/Quest');
const { dailyQuestPool, weeklyQuestPool, storyQuests } = require('../gamedata/quests');
const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.json');
const e = config.emojis;

// ═══════════════════════════════════════════════════════════════
//  RESET HELPERS
// ═══════════════════════════════════════════════════════════════

/** Check if we've crossed midnight IST since lastReset */
function needsDailyReset(lastReset) {
    if (!lastReset) return true;
    const now = new Date();
    // Midnight IST = 18:30 UTC previous day
    const todayReset = new Date(now);
    todayReset.setUTCHours(18, 30, 0, 0);
    if (now < todayReset) todayReset.setUTCDate(todayReset.getUTCDate() - 1);
    return lastReset < todayReset;
}

/** Check if we've crossed Monday midnight IST since lastReset */
function needsWeeklyReset(lastReset) {
    if (!lastReset) return true;
    const now = new Date();
    // Find the most recent Monday 00:00 IST = Sunday 18:30 UTC
    const todayReset = new Date(now);
    todayReset.setUTCHours(18, 30, 0, 0);
    if (now < todayReset) todayReset.setUTCDate(todayReset.getUTCDate() - 1);
    // Walk back to Monday
    const day = todayReset.getUTCDay(); // 0=Sun ... 6=Sat
    const daysBack = day === 0 ? 6 : day - 1; // Monday = 0 back
    todayReset.setUTCDate(todayReset.getUTCDate() - daysBack);
    return lastReset < todayReset;
}

/** Pick n random items from pool without duplicates */
function pickRandom(pool, n) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

// ═══════════════════════════════════════════════════════════════
//  INITIALIZE / ENSURE QUESTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create a player's quest doc, resetting dailies/weeklies as needed.
 * Filters quest pools by player level so locked features don't appear.
 * This is the ONLY entry point for reading quest data.
 */
async function getQuestProgress(playerId) {
    let qp = await QuestProgress.findOne({ playerId });

    if (!qp) {
        qp = new QuestProgress({ playerId });
    }

    let changed = false;

    // Fetch player level for quest filtering
    const Player = require('../models/Player');
    const player = await Player.findOne({ userId: playerId });
    const playerLevel = player?.level || 1;

    // ── Daily reset ──
    if (needsDailyReset(qp.lastDailyReset)) {
        const eligible = dailyQuestPool.filter(q => playerLevel >= (q.levelRequired || 1));
        const picked = pickRandom(eligible, Math.min(3, eligible.length));
        qp.dailyQuests = picked.map(q => ({
            questId: q.id,
            progress: new Map(),
            completed: false,
            completedAt: null
        }));
        qp.lastDailyReset = new Date();
        changed = true;
    }

    // ── Weekly reset ──
    if (needsWeeklyReset(qp.lastWeeklyReset)) {
        const eligible = weeklyQuestPool.filter(q => playerLevel >= (q.levelRequired || 1));
        const picked = pickRandom(eligible, Math.min(2, eligible.length));
        qp.weeklyQuests = picked.map(q => ({
            questId: q.id,
            progress: new Map(),
            completed: false,
            completedAt: null
        }));
        qp.lastWeeklyReset = new Date();
        changed = true;
    }

    if (changed) await qp.save();
    return qp;
}

// ═══════════════════════════════════════════════════════════════
//  QUEST PROGRESS UPDATE  (called from commands)
// ═══════════════════════════════════════════════════════════════

/**
 * Increment quest progress for a player.
 *
 * @param {string}  playerId   Discord user ID
 * @param {string}  objective  The objective key (e.g. 'forage_times')
 * @param {number}  amount     How much to add (default 1)
 * @param {object}  [message]  Discord message — used to send completion rewards
 */
async function updateQuestProgress(playerId, objective, amount = 1, message = null) {
    try {
        const qp = await getQuestProgress(playerId);
        const completions = []; // { questDef, type }

        // ── Check daily quests ──
        for (const dq of qp.dailyQuests) {
            if (dq.completed) continue;
            const def = dailyQuestPool.find(q => q.id === dq.questId);
            if (!def || !def.objectives[objective]) continue;

            const current = dq.progress.get(objective) || 0;
            const target = def.objectives[objective];
            dq.progress.set(objective, Math.min(current + amount, target));

            // Check if all objectives met
            const isComplete = Object.entries(def.objectives).every(
                ([obj, req]) => (dq.progress.get(obj) || 0) >= req
            );
            if (isComplete) {
                dq.completed = true;
                dq.completedAt = new Date();
                qp.dailyQuestsCompleted++;
                qp.totalQuestsCompleted++;
                completions.push({ def, type: 'Daily' });
            }
        }

        // ── Check weekly quests ──
        for (const wq of qp.weeklyQuests) {
            if (wq.completed) continue;
            const def = weeklyQuestPool.find(q => q.id === wq.questId);
            if (!def || !def.objectives[objective]) continue;

            const current = wq.progress.get(objective) || 0;
            const target = def.objectives[objective];
            wq.progress.set(objective, Math.min(current + amount, target));

            const isComplete = Object.entries(def.objectives).every(
                ([obj, req]) => (wq.progress.get(obj) || 0) >= req
            );
            if (isComplete) {
                wq.completed = true;
                wq.completedAt = new Date();
                qp.weeklyQuestsCompleted++;
                qp.totalQuestsCompleted++;
                completions.push({ def, type: 'Weekly' });
            }
        }

        // ── Check story quest ──
        if (qp.currentStoryIndex >= 0 && qp.currentStoryIndex < storyQuests.length) {
            const storyDef = storyQuests[qp.currentStoryIndex];
            if (storyDef.objectives[objective]) {
                const current = qp.storyProgress.get(objective) || 0;
                const target = storyDef.objectives[objective];
                qp.storyProgress.set(objective, Math.min(current + amount, target));

                const isComplete = Object.entries(storyDef.objectives).every(
                    ([obj, req]) => (qp.storyProgress.get(obj) || 0) >= req
                );
                if (isComplete) {
                    qp.storyQuestsCompleted++;
                    qp.totalQuestsCompleted++;
                    completions.push({ def: storyDef, type: 'Story' });
                    // Advance to next story quest
                    qp.currentStoryIndex++;
                    qp.storyProgress = new Map();
                    if (qp.currentStoryIndex >= storyQuests.length) {
                        qp.currentStoryIndex = -1; // all done
                    }
                }
            }
        }

        qp.markModified('dailyQuests');
        qp.markModified('weeklyQuests');
        qp.markModified('storyProgress');
        await qp.save();

        // ── Grant rewards & send messages ──
        if (completions.length > 0) {
            await grantCompletionRewards(playerId, completions, message);
        }

        return completions.length > 0;
    } catch (error) {
        console.error('Error updating quest progress:', error);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
//  REWARD GRANTING + NOTIFICATION
// ═══════════════════════════════════════════════════════════════

async function grantCompletionRewards(playerId, completions, message) {
    try {
        const Player = require('../models/Player');
        const player = await Player.findOne({ userId: playerId });
        if (!player) return;

        for (const { def, type } of completions) {
            const r = def.rewards;
            if (r.xp) player.xp += r.xp;
            if (r.gold) player.gold += r.gold;
            if (r.arcaneDust) player.arcaneDust = (player.arcaneDust || 0) + r.arcaneDust;

            if (r.items) {
                for (const item of r.items) {
                    const existing = player.inventory.find(i => i.itemId === item.itemId);
                    if (existing) existing.quantity += item.quantity;
                    else player.inventory.push({ itemId: item.itemId, quantity: item.quantity });
                }
            }

            // Send completion message
            if (message && message.channel) {
                const typeEmoji = { Daily: '☀️', Weekly: '🗓️', Story: '📖' }[type] || '🎯';
                let rewardText = '';
                if (r.xp) rewardText += `+**${r.xp}** XP  `;
                if (r.gold) rewardText += `${e.gold} +**${r.gold}**  `;
                if (r.arcaneDust) rewardText += `${e.arcane_dust} +**${r.arcaneDust}**  `;
                if (r.items) {
                    rewardText += r.items.map(i => {
                        const itemEmoji = e[i.itemId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())] || '';
                        return `${itemEmoji} +**${i.quantity}x** ${i.itemId.replace(/_/g, ' ')}`;
                    }).join('  ');
                }

                const embed = new EmbedBuilder()
                    .setColor(type === 'Story' ? '#FFD700' : type === 'Weekly' ? '#9B59B6' : '#2ECC71')
                    .setTitle(`${typeEmoji}  ${type} Quest Complete!`)
                    .setDescription(
                        `**${def.name}**\n${def.description}\n\n` +
                        `**Rewards:**\n${rewardText}`
                    )
                    .setFooter({ text: `Completed by ${message.author?.username || message.user?.username || 'Unknown'}` })
                    .setTimestamp();

                message.channel.send({ embeds: [embed] }).catch(() => {});
            }
        }

        await player.save();
    } catch (error) {
        console.error('Error granting quest rewards:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    getQuestProgress,
    updateQuestProgress,
    storyQuests,
    dailyQuestPool,
    weeklyQuestPool
};