const mongoose = require('mongoose');

const EggSchema = new mongoose.Schema({
    ownerId: { type: String, required: true },
    eggId: { type: Number, required: true },          // Short ID per player (like pet shortId)
    eggItemId: { type: String, required: true },       // e.g., 'beast_egg', 'undead_egg'

    // Skill inheritance from breeding
    inheritedSkills: [{
        slot: { type: Number, required: true },        // Position 0-3
        skillId: { type: String, required: true },     // The skill at this slot
        fromType: { type: String, required: true }     // Which type this skill belongs to
    }],

    // Breeding metadata
    parentTypes: [{ type: String }],                   // e.g., ['Beast', 'Undead'] for display
    parentRarities: [{ type: String }],                // e.g., ['Legendary', 'Rare'] for offspring rarity
    parentBasePetIds: [{ type: String }],              // e.g., ['shadow_wolf', 'iron_golem'] for lineage
    source: { 
        type: String, 
        default: 'other', 
        enum: ['breeding', 'dungeon', 'crate', 'other'] 
    },

    createdAt: { type: Date, default: Date.now }
});

// Compound index for quick lookup
EggSchema.index({ ownerId: 1, eggId: 1 }, { unique: true });

module.exports = mongoose.model('Egg', EggSchema);
