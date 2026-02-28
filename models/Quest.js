const mongoose = require('mongoose');

// ── Individual quest progress (used in daily/weekly arrays) ──
const questEntrySchema = new mongoose.Schema({
    questId: { type: String, required: true },
    progress: { type: Map, of: Number, default: () => new Map() },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
}, { _id: false });

// ── Main quest progress document (one per player) ────────────
const QuestProgressSchema = new mongoose.Schema({
    playerId: { type: String, required: true, unique: true },

    // Daily quests — 3 assigned each day
    dailyQuests: { type: [questEntrySchema], default: [] },
    lastDailyReset: { type: Date, default: null },

    // Weekly quests — 2 assigned each week
    weeklyQuests: { type: [questEntrySchema], default: [] },
    lastWeeklyReset: { type: Date, default: null },

    // Story — index of current story quest (0-based), -1 = all done
    currentStoryIndex: { type: Number, default: 0 },
    storyProgress: { type: Map, of: Number, default: () => new Map() },

    // Lifetime stats
    totalQuestsCompleted: { type: Number, default: 0 },
    dailyQuestsCompleted: { type: Number, default: 0 },
    weeklyQuestsCompleted: { type: Number, default: 0 },
    storyQuestsCompleted: { type: Number, default: 0 },

}, { timestamps: true, collection: 'questprogress' });

QuestProgressSchema.index({ playerId: 1 });

module.exports = mongoose.model('QuestProgress', QuestProgressSchema);