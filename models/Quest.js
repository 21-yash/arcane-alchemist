// Enhanced Quest Progress Schema with better validation and indexing
const mongoose = require('mongoose');

const questProgressSchema = new mongoose.Schema({
    questId: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true
    },
    status: { 
        type: String, 
        enum: ['available', 'active', 'completed', 'failed', 'locked'], 
        default: 'available',
        required: true
    },
    progress: { 
        type: Map, 
        of: Number, 
        default: new Map(),
        validate: {
            validator: function(map) {
                // Ensure all progress values are non-negative
                for (let value of map.values()) {
                    if (value < 0) return false;
                }
                return true;
            },
            message: 'Quest progress values must be non-negative'
        }
    }, 
    startedAt: { 
        type: Date, 
        default: null,
        validate: {
            validator: function(date) {
                // Started date should not be in the future
                return !date || date <= new Date();
            },
            message: 'Start date cannot be in the future'
        }
    },
    completedAt: { 
        type: Date, 
        default: null,
        validate: {
            validator: function(date) {
                // Completed date should not be before started date
                if (!date || !this.startedAt) return true;
                return date >= this.startedAt;
            },
            message: 'Completion date cannot be before start date'
        }
    },
    lastUpdate: { 
        type: Date, 
        default: Date.now,
        required: true
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },
    timeSpent: {
        type: Number, // in milliseconds
        default: 0,
        min: 0
    }
}, { 
    _id: false,
    timestamps: false
});

// Add method to calculate quest duration
questProgressSchema.methods.getDuration = function() {
    if (!this.startedAt) return 0;
    const endTime = this.completedAt || new Date();
    return Math.max(0, endTime - this.startedAt);
};

const QuestProgressSchema = new mongoose.Schema({
    playerId: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    quests: [questProgressSchema],
    
    // Daily/Weekly tracking
    dailyQuestsCompleted: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    weeklyQuestsCompleted: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    lastDailyReset: { 
        type: Date, 
        default: Date.now,
        required: true
    },
    lastWeeklyReset: { 
        type: Date, 
        default: Date.now,
        required: true
    },
    
    // Faction reputation with expanded limits
    factionReputation: {
        alchemists: { 
            type: Number, 
            default: 0, 
            min: -1000, 
            max: 1000 
        },
        merchants: { 
            type: Number, 
            default: 0, 
            min: -1000, 
            max: 1000 
        },
        explorers: { 
            type: Number, 
            default: 0, 
            min: -1000, 
            max: 1000 
        },
        guardians: { 
            type: Number, 
            default: 0, 
            min: -1000, 
            max: 1000 
        }
    },
    
    // Quest cooldowns and timing
    questCooldowns: { 
        type: Map, 
        of: Date, 
        default: new Map() 
    },
    lastQuestCompletion: { 
        type: Date, 
        default: null 
    },
    
    // Achievement tracking
    questStats: {
        totalQuestsCompleted: {
            type: Number,
            default: 0,
            min: 0
        },
        totalQuestsFailed: {
            type: Number,
            default: 0,
            min: 0
        },
        longestQuestStreak: {
            type: Number,
            default: 0,
            min: 0
        },
        currentQuestStreak: {
            type: Number,
            default: 0,
            min: 0
        },
        favoriteQuestType: {
            type: String,
            enum: ['main', 'daily', 'weekly', 'faction', 'event', 'challenge'],
            default: 'main'
        },
        totalTimeSpentOnQuests: {
            type: Number, // in milliseconds
            default: 0,
            min: 0
        }
    },
    
    // Event quest tracking
    eventQuestsCompleted: {
        type: Map,
        of: Number,
        default: new Map()
    },
    
    // Quest preferences and settings
    questSettings: {
        autoAcceptDaily: {
            type: Boolean,
            default: false
        },
        autoAcceptWeekly: {
            type: Boolean,
            default: false
        },
        preferredFaction: {
            type: String,
            enum: ['alchemists', 'merchants', 'explorers', 'guardians', null],
            default: null
        },
        questNotifications: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    collection: 'questprogress'
});

// Indexes for better performance
QuestProgressSchema.index({ 'quests.questId': 1 });
QuestProgressSchema.index({ 'quests.status': 1 });
QuestProgressSchema.index({ lastDailyReset: 1 });
QuestProgressSchema.index({ lastWeeklyReset: 1 });
QuestProgressSchema.index({ 'questStats.totalQuestsCompleted': -1 });

// Virtual for active quest count
QuestProgressSchema.virtual('activeQuestCount').get(function() {
    return this.quests.filter(q => q.status === 'active').length;
});

// Virtual for available quest count
QuestProgressSchema.virtual('availableQuestCount').get(function() {
    return this.quests.filter(q => q.status === 'available').length;
});

// Method to get faction standing text
QuestProgressSchema.methods.getFactionStanding = function(faction) {
    const rep = this.factionReputation[faction] || 0;
    if (rep >= 500) return 'Revered';
    if (rep >= 250) return 'Honored';
    if (rep >= 100) return 'Friendly';
    if (rep >= 0) return 'Neutral';
    if (rep >= -100) return 'Unfriendly';
    if (rep >= -250) return 'Hostile';
    return 'Hated';
};

// Method to check if daily reset is needed
QuestProgressSchema.methods.needsDailyReset = function() {
    const now = new Date();
    const lastReset = this.lastDailyReset;
    const nextReset = new Date(lastReset);
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    nextReset.setUTCHours(6, 30, 0, 0); // 12:00 AM IST = 6:30 AM UTC
    
    return now >= nextReset;
};

// Method to check if weekly reset is needed
QuestProgressSchema.methods.needsWeeklyReset = function() {
    const now = new Date();
    const lastReset = this.lastWeeklyReset;
    const nextReset = new Date(lastReset);
    
    // Calculate next Monday at 12:00 AM IST
    const daysUntilMonday = (8 - nextReset.getDay()) % 7;
    nextReset.setUTCDate(nextReset.getUTCDate() + daysUntilMonday);
    nextReset.setUTCHours(6, 30, 0, 0);
    
    // If it's already Monday and past reset time, set to next Monday
    if (daysUntilMonday === 0 && now >= nextReset) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 7);
    }
    
    return now >= nextReset;
};

// Method to get quest by ID
QuestProgressSchema.methods.getQuest = function(questId) {
    return this.quests.find(q => q.questId === questId.toLowerCase());
};

// Method to add or update quest progress
QuestProgressSchema.methods.updateQuestProgress = function(questId, objective, amount = 1) {
    const quest = this.getQuest(questId);
    if (!quest || quest.status !== 'active') return false;
    
    const currentProgress = quest.progress.get(objective) || 0;
    quest.progress.set(objective, currentProgress + amount);
    quest.lastUpdate = new Date();
    
    return true;
};

// Method to complete a quest
QuestProgressSchema.methods.completeQuest = function(questId) {
    const quest = this.getQuest(questId);
    if (!quest || quest.status !== 'active') return false;
    
    quest.status = 'completed';
    quest.completedAt = new Date();
    quest.lastUpdate = new Date();
    
    // Update stats
    this.questStats.totalQuestsCompleted++;
    this.questStats.currentQuestStreak++;
    
    if (this.questStats.currentQuestStreak > this.questStats.longestQuestStreak) {
        this.questStats.longestQuestStreak = this.questStats.currentQuestStreak;
    }
    
    // Update time spent
    if (quest.startedAt) {
        const timeSpent = quest.completedAt - quest.startedAt;
        quest.timeSpent = timeSpent;
        this.questStats.totalTimeSpentOnQuests += timeSpent;
    }
    
    this.lastQuestCompletion = new Date();
    return true;
};

// Method to fail a quest
QuestProgressSchema.methods.failQuest = function(questId) {
    const quest = this.getQuest(questId);
    if (!quest || quest.status !== 'active') return false;
    
    quest.status = 'failed';
    quest.lastUpdate = new Date();
    quest.attempts++;
    
    // Reset streak on failure
    this.questStats.totalQuestsFailed++;
    this.questStats.currentQuestStreak = 0;
    
    return true;
};

// Pre-save middleware to validate quest data
QuestProgressSchema.pre('save', function(next) {
    // Ensure all quest IDs are lowercase
    this.quests.forEach(quest => {
        quest.questId = quest.questId.toLowerCase();
    });
    
    // Update last update timestamp
    this.markModified('quests');
    
    next();
});

// Static method to find players needing daily reset
QuestProgressSchema.statics.findPlayersNeedingDailyReset = function() {
    const oneDayAgo = new Date();
    oneDayAgo.setUTCDate(oneDayAgo.getUTCDate() - 1);
    oneDayAgo.setUTCHours(6, 30, 0, 0);
    
    return this.find({
        lastDailyReset: { $lt: oneDayAgo }
    });
};

// Static method to find players needing weekly reset
QuestProgressSchema.statics.findPlayersNeedingWeeklyReset = function() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);
    
    // Find last Monday
    const dayOfWeek = oneWeekAgo.getUTCDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - daysToSubtract);
    oneWeekAgo.setUTCHours(6, 30, 0, 0);
    
    return this.find({
        lastWeeklyReset: { $lt: oneWeekAgo }
    });
};

module.exports = mongoose.model('QuestProgress', QuestProgressSchema);