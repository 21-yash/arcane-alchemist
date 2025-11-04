const mongoose = require('mongoose');

const disabledCommandSchema = new mongoose.Schema({
    commandName: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    disabledBy: {
        type: String,
        required: true
    },
    disabledAt: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        default: 'No reason provided'
    }
}, {
    timestamps: true
});

// Compound index to ensure unique command per guild
disabledCommandSchema.index({ commandName: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('DisabledCommand', disabledCommandSchema);
