const { checkAchievements } = require('../utils/achievements');

/**
 * This handler registers listeners for custom game-related events.
 * It connects player actions to progression systems like achievements.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
function initializeGameEventListeners(client) {
    console.log('[Game Events] Initializing listeners...');

    // --- FORAGE EVENT ---
    // Emitted whenever a player successfully completes a forage action.
    client.on('forage', (playerId) => {
        checkAchievements(client, playerId, 'forage');
    });

    // --- EGG HATCH EVENT ---
    client.on('eggHatch', (playerId) => {
        checkAchievements(client, playerId, 'eggHatch');
    });

    // --- DUNGEON CLEAR EVENT ---
    client.on('dungeonClear', (playerId) => {
        checkAchievements(client, playerId, 'dungeonClear');
    });
    
    // --- POTION BREW EVENT ---
    client.on('potionBrewed', (playerId) => {
        checkAchievements(client, playerId, 'potionBrew');
    });

    // --- PAL BREED EVENT ---
    client.on('palsBred', (playerId) => {
        checkAchievements(client, playerId, 'palsBred');
    });

    // --- ITEM CRAFT EVENT ---
    client.on('itemCrafted', (playerId, itemId) => {
        checkAchievements(client, playerId, 'itemsCrafted');
        checkAchievements(client, playerId, 'itemCraft', itemId);
    });

    console.log('[Game Events] Listeners initialized.');
}

module.exports = { initializeGameEventListeners };