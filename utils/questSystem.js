const QuestProgress = require('../models/Quest');
const questData = require('../gamedata/quests');

async function initializeQuestProgress(playerId) {
    try {
        let questProgress = await QuestProgress.findOne({ playerId });
        
        if (!questProgress) {
            questProgress = new QuestProgress({
                playerId,
                quests: [],
                factionReputation: {
                    alchemists: 0,
                    merchants: 0,
                    explorers: 0,
                    guardians: 0
                }
            });
        }
        
        await updateAvailableQuests(questProgress);
        await questProgress.save();
        
        return questProgress;
    } catch (error) {
        console.error('Error initializing quest progress:', error);
        throw error;
    }
}

async function updateAvailableQuests(questProgress) {
    try {
        const Player = require('../models/Player');
        const player = await Player.findOne({ userId: questProgress.playerId });
        if (!player) return;
        
        for (const [questId, questInfo] of Object.entries(questData)) {
            const existingQuest = questProgress.quests.find(q => q.questId === questId);
            
            if (!existingQuest && isQuestUnlocked(questInfo, player, questProgress)) {
                questProgress.quests.push({
                    questId,
                    status: 'available',
                    progress: new Map(),
                    startedAt: null,
                    completedAt: null,
                    lastUpdate: new Date()
                });
            }
        }
    } catch (error) {
        console.error('Error updating available quests:', error);
    }
}

function isQuestUnlocked(questInfo, player, questProgress) {
    if (player.level < questInfo.levelRequirement) return false;
    
    if (questInfo.prerequisites && questInfo.prerequisites.length > 0) {
        return questInfo.prerequisites.every(prereqId => {
            const prereqQuest = questProgress.quests.find(q => q.questId === prereqId);
            return prereqQuest && prereqQuest.status === 'completed';
        });
    }
    
    return true;
}

async function updateQuestProgress(playerId, objective, amount = 1, specificQuestId = null) {
    try {
        const questProgress = await QuestProgress.findOne({ playerId });
        if (!questProgress) return false;
        
        let updated = false;
        const activeQuests = questProgress.quests.filter(q => q.status === 'active');
        
        for (const quest of activeQuests) {
            if (specificQuestId && quest.questId !== specificQuestId) continue;
            
            const questInfo = questData[quest.questId];
            if (!questInfo || !questInfo.objectives[objective]) continue;
            
            const currentProgress = quest.progress.get(objective) || 0;
            const newProgress = Math.min(
                currentProgress + amount,
                questInfo.objectives[objective]
            );
            
            if (newProgress > currentProgress) {
                quest.progress.set(objective, newProgress);
                quest.lastUpdate = new Date();
                updated = true;
                
                const isCompleted = Object.entries(questInfo.objectives).every(([obj, required]) => {
                    return (quest.progress.get(obj) || 0) >= required;
                });
                
                if (isCompleted) {
                    await completeQuest(questProgress, quest.questId, questInfo);
                }
            }
        }
        
        if (updated) {
            await questProgress.save();
        }
        
        return updated;
    } catch (error) {
        console.error('Error updating quest progress:', error);
        return false;
    }
}

async function completeQuest(questProgress, questId, questInfo) {
    try {
        const quest = questProgress.getQuest(questId);
        if (!quest) return false;
        
        questProgress.completeQuest(questId);
        
        if (questInfo.rewards) {
            const Player = require('../models/Player');
            const player = await Player.findOne({ userId: questProgress.playerId });
            
            if (player) {
                if (questInfo.rewards.xp) {
                    player.xp += questInfo.rewards.xp;
                }
                
                if (questInfo.rewards.gold) {
                    player.gold += questInfo.rewards.gold;
                }
                
                if (questInfo.rewards.reputation) {
                    for (const [faction, rep] of Object.entries(questInfo.rewards.reputation)) {
                        if (questProgress.factionReputation[faction] !== undefined) {
                            questProgress.factionReputation[faction] = Math.max(
                                -1000,
                                Math.min(1000, questProgress.factionReputation[faction] + rep)
                            );
                        }
                    }
                }
                
                if (questInfo.rewards.items) {
                    const itemsToGive = questInfo.rewards.items;
                    for (const item of itemsToGive) {
                        const existingItem = player.inventory.find(i => i.itemId === item.itemId);
                        if (existingItem) {
                            existingItem.quantity += item.quantity;
                        } else {
                            player.inventory.push({ itemId: item.itemId, quantity: item.quantity });
                        }
                    }
                }
                
                if (questInfo.rewards.recipes) {
                    const recipesToGive = questInfo.rewards.recipes;
                    for (const recipe of recipesToGive) {
                        if (recipe.type === 'potion' && !player.grimoire.includes(recipe.recipeId)) {
                            player.grimoire.push(recipe.recipeId);
                        }
                        if (recipe.type === 'crafting' && !player.craftingJournal.includes(recipe.recipeId)) {
                            player.craftingJournal.push(recipe.recipeId);
                        }
                    }
                }
                await player.save();
            }
        }
        
        if (questInfo.type === 'daily') {
            questProgress.dailyQuestsCompleted++;
        } else if (questInfo.type === 'weekly') {
            questProgress.weeklyQuestsCompleted++;
        }
        
        await updateAvailableQuests(questProgress);
        
        return true;
    } catch (error) {
        console.error('Error completing quest:', error);
        return false;
    }
}

module.exports = {
    initializeQuestProgress,
    updateAvailableQuests,
    updateQuestProgress,
    completeQuest,
    isQuestUnlocked
};