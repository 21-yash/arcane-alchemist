const mongoose = require('mongoose');

const SkillTreeSchema = new mongoose.Schema({
    palId: { type: String, required: true, unique: true },
    skillPoints: { type: Number, default: 0 },
    unlockedSkills: [{ 
        skillId: String,
        level: { type: Number, default: 1 },
        unlockedAt: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('SkillTree', SkillTreeSchema);