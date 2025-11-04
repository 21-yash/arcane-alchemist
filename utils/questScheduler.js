const cron = require('node-cron');
const QuestProgress = require('../models/Quest');
const questData = require('../gamedata/quests');

class QuestScheduler {
    constructor() {
        this.setupSchedulers();
    }

    setupSchedulers() {
        cron.schedule('30 6 * * *', async () => {
            console.log('Running daily quest reset...');
            await this.resetDailyQuests();
        }, {
            timezone: "Asia/Kolkata"
        });

        cron.schedule('30 6 * * 1', async () => {
            console.log('Running weekly quest reset...');
            await this.resetWeeklyQuests();
        }, {
            timezone: "Asia/Kolkata"
        });
    }

    async resetDailyQuests() {
        try {
            const allPlayers = await QuestProgress.find({});
            const dailyQuests = Object.values(questData).filter(q => q.type === 'daily');
            
            for (const player of allPlayers) {
                let hasChanges = false;
                
                for (const dailyQuest of dailyQuests) {
                    const existingQuest = player.quests.find(q => q.questId === dailyQuest.id);
                    
                    if (existingQuest) {
                        if (['completed', 'failed'].includes(existingQuest.status)) {
                            existingQuest.status = 'available';
                            existingQuest.progress = new Map();
                            existingQuest.startedAt = null;
                            existingQuest.completedAt = null;
                            existingQuest.lastUpdate = new Date();
                            hasChanges = true;
                        }
                    } else if (this.isQuestUnlocked(dailyQuest, player)) {
                        player.quests.push({
                            questId: dailyQuest.id,
                            status: 'available',
                            progress: new Map(),
                            startedAt: null,
                            completedAt: null,
                            lastUpdate: new Date()
                        });
                        hasChanges = true;
                    }
                }
                
                if (hasChanges) {
                    player.dailyQuestsCompleted = 0;
                    player.lastDailyReset = new Date();
                    await player.save();
                }
            }
            
            console.log('Daily quest reset completed successfully');
        } catch (error) {
            console.error('Error resetting daily quests:', error);
        }
    }

    async resetWeeklyQuests() {
        try {
            const allPlayers = await QuestProgress.find({});
            const weeklyQuests = Object.values(questData).filter(q => q.type === 'weekly');
            
            for (const player of allPlayers) {
                let hasChanges = false;
                
                for (const weeklyQuest of weeklyQuests) {
                    const existingQuest = player.quests.find(q => q.questId === weeklyQuest.id);
                    
                    if (existingQuest) {
                        if (['completed', 'failed'].includes(existingQuest.status)) {
                            existingQuest.status = 'available';
                            existingQuest.progress = new Map();
                            existingQuest.startedAt = null;
                            existingQuest.completedAt = null;
                            existingQuest.lastUpdate = new Date();
                            hasChanges = true;
                        }
                    } else if (this.isQuestUnlocked(weeklyQuest, player)) {
                        player.quests.push({
                            questId: weeklyQuest.id,
                            status: 'available',
                            progress: new Map(),
                            startedAt: null,
                            completedAt: null,
                            lastUpdate: new Date()
                        });
                        hasChanges = true;
                    }
                }
                
                if (hasChanges) {
                    player.weeklyQuestsCompleted = 0;
                    player.lastWeeklyReset = new Date();
                    await player.save();
                }
            }
            
            console.log('Weekly quest reset completed successfully');
        } catch (error) {
            console.error('Error resetting weekly quests:', error);
        }
    }

    isQuestUnlocked(quest, player) {
        if (player.level < quest.levelRequirement) return false;
        
        if (quest.prerequisites && quest.prerequisites.length > 0) {
            return quest.prerequisites.every(prereqId => {
                const prereqQuest = player.quests.find(q => q.questId === prereqId);
                return prereqQuest && prereqQuest.status === 'completed';
            });
        }
        
        return true;
    }

    async forceResetDaily() {
        await this.resetDailyQuests();
    }

    async forceResetWeekly() {
        await this.resetWeeklyQuests();
    }
}

module.exports = new QuestScheduler();