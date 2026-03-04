const mongoose = require('mongoose');

const SkillTreeSchema = new mongoose.Schema({
    palId: { type: String, required: true, unique: true },
    skillPoints: { type: Number, default: 0 },
    unlockedSkills: [{ 
        skillId: String,
        level: { type: Number, default: 1 },
        unlockedAt: { type: Date, default: Date.now }
    }],
    // Breeding inheritance: overrides which skill occupies each slot
    // If empty, the pet uses its default type skills
    customSkillSet: [{
        slot: { type: Number, required: true },        // Position 0-3
        skillId: { type: String, required: true },     // The skill at this slot
        fromType: { type: String, required: true }     // Which type tree this skill comes from
    }]
});

module.exports = mongoose.model('SkillTree', SkillTreeSchema);