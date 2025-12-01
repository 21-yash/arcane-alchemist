const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); //UUIDs for unique pet instances

const PetSchema = new mongoose.Schema({
    petId: { type: String, default: () => uuidv4(), unique: true }, // A unique ID for this specific pet instance
    ownerId: { type: String, required: true }, 
    basePetId: { type: String, required: true },
    shortId: { type: Number, required: true },

    nickname: { type: String, default: null },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    type: { type: String, required: true },

    stats: {
        hp: { type: Number, required: true },
        atk: { type: Number, required: true },
        def: { type: Number, required: true },
        spd: { type: Number, required: true },
        luck: { type: Number, required: true },
    },
    
    equipment: {
        weapon: { type: String, default: null }, 
        head: { type: String, default: null },
        chest: { type: String, default: null },
        leg: { type: String, default: null },
        boots: { type: String, default: null },
        offhand: { type: String, default: null },
        accessory: { type: String, default: null }
    },

    status: { 
        type: String, 
        default: 'Idle', 
        enum: ['Idle', 'Exploring', 'Injured', 'Breeding'] 
    },
    
    currentHp: { type: Number, default: null },
    lastInjuryUpdate: { type: Date, default: Date.now },
    potionEffects: { type: [Object], default: [] },
    
});

module.exports = mongoose.model('Pet', PetSchema);