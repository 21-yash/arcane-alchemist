const mongoose = require('mongoose');

const ExpeditionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    palId: { type: String, required: true },
    expeditionType: {
        type: String,
        enum: ['resource_gathering', 'treasure_hunting', 'combat_training', 'exploration'],
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'extreme'],
        required: true
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, required: true },
    status: {
        type: String,
        enum: ['active', 'completed', 'failed'],
        default: 'active'
    },
    rewards: {
        xp: { type: Number, default: 0 },
        gold: { type: Number, default: 0 },
        items: [{ 
            itemId: String, 
            quantity: Number 
        }],
        specialReward: { type: String, default: null }
    },
    riskFactors: {
        injuryChance: { type: Number, default: 0 },
        lostChance: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model('Expedition', ExpeditionSchema);