const config = require('../config/config.json');

// This object pre-resolves all your common emojis when the bot starts
const emojis = {
    success: config.emojis.success || '✅',
    error: config.emojis.error || '❌',
    warning: config.emojis.warning || '⚠️',
    info: config.emojis.info || 'ℹ️',
    loading: config.emojis.loading || '⏳',
    first: config.emojis.first || '⏮️',
    previous: config.emojis.previous || '◀️',
    next: config.emojis.next || '▶️',
    last: config.emojis.last || '⏭️',
    up: config.emojis.up || '🔼',
    down: config.emojis.down || '🔽',
    reload: config.emojis.reload || '🔄',
    common: config.emojis.Common || '⬜',
    rare: config.emojis.Rare || '🟦',
    epic: config.emojis.Epic || '🟪',
    legendary: config.emojis.Legendary || '🟧',
    mythic: config.emojis.Mythic || '🟥',
    uncommon: config.emojis.Uncommon || '🟩'
};

module.exports = emojis;