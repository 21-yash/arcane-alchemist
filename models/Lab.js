const mongoose = require('mongoose');

const LaboratorySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    level: { type: Number, default: 1 },
    upgrades: [{
        upgradeId: String,
        level: { type: Number, default: 1 },
        purchasedAt: { type: Date, default: Date.now }
    }],
    activeUpgrades: [{
        upgradeId: String,
        expiresAt: { type: Date }
    }],
    researchPoints: { type: Number, default: 0 },
    lastResearchTick: { type: Date, default: null },
    arcaneDustStored: { type: Number, default: 0 },
    lastArcaneDustTick: { type: Date, default: null },
    autoBrewer: {
        recipeId: { type: String, default: null },
        storage: {
            type: [{
                itemId: { type: String },
                quantity: { type: Number, default: 0 }
            }],
            default: []
        },
        lastTick: { type: Date, default: null }
    },
    appliedBonuses: {
        stamina: { type: Number, default: 0 }
    },
    decorations: [String], // Array of decoration IDs
    layout: {
        theme: { type: String, default: 'basic' },
        background: { type: String, default: 'stone_walls' },
        floor: { type: String, default: 'wooden_planks' }
    }
});

module.exports = mongoose.model('Laboratory', LaboratorySchema);