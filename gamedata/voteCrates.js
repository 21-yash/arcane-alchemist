/**
 * Vote Crate System
 * 
 * Crate Types based on vote streak:
 * - Common Crate: 1-9 streak
 * - Uncommon Crate: 10-19 streak
 * - Rare Crate: 20-39 streak
 * - Legendary Crate: 40+ streak
 * 
 * Contents:
 * - Equipment/Weapons: Very rare chance
 * - Scrolls (Recipes): Rare chance
 * - Items: Shared across all rarities
 */

const items = require('./items');
const recipes = require('./recipes');

// Crate definitions
const crateTypes = {
    common: {
        name: 'Common Vote Crate',
        emoji: '📦',
        color: '#A0522D', // Brown
        description: 'A simple crate containing basic rewards for your support!',
        minStreak: 1,
        maxStreak: 9,
        image: 'common_vote_crate.png'
    },
    uncommon: {
        name: 'Uncommon Vote Crate',
        emoji: '🎁',
        color: '#2ECC71', // Green
        description: 'A refined crate with better chances for valuable items!',
        minStreak: 10,
        maxStreak: 19,
        image: 'uncommon_vote_crate.png'
    },
    rare: {
        name: 'Rare Vote Crate',
        emoji: '💎',
        color: '#9B59B6', // Purple
        description: 'A mystical crate brimming with powerful rewards!',
        minStreak: 20,
        maxStreak: 39,
        image: 'rare_vote_crate.png'
    },
    legendary: {
        name: 'Legendary Vote Crate',
        emoji: '✨',
        color: '#FFD700', // Gold
        description: 'An extraordinary crate containing legendary treasures!',
        minStreak: 40,
        maxStreak: Infinity,
        image: 'legendary_vote_crate.png'
    }
};

// Loot table weights by crate type
// Category weights determine WHAT TYPE of item you get
// Then rarity weights determine the quality within that category
const lootTables = {
    common: {
        categoryWeights: {
            ingredient: 55,      // 55% chance
            crafting_material: 37, // 37% chance
            scroll: 5,           // 5% chance (recipes)
            equipment: 3         // 3% chance (weapons/armor)
        },
        rarityWeights: {
            Common: 60,
            Uncommon: 30,
            Rare: 8,
            Epic: 2,
            Legendary: 0
        },
        itemCount: { min: 1, max: 2 },
        goldBonus: { min: 50, max: 150 },
        dustBonus: { min: 10, max: 30 }
    },
    uncommon: {
        categoryWeights: {
            ingredient: 47,
            crafting_material: 40,
            scroll: 8,
            equipment: 5
        },
        rarityWeights: {
            Common: 40,
            Uncommon: 40,
            Rare: 15,
            Epic: 4,
            Legendary: 1
        },
        itemCount: { min: 2, max: 3 },
        goldBonus: { min: 100, max: 300 },
        dustBonus: { min: 25, max: 50 }
    },
    rare: {
        categoryWeights: {
            ingredient: 39,
            crafting_material: 39,
            scroll: 12,
            equipment: 10
        },
        rarityWeights: {
            Common: 20,
            Uncommon: 35,
            Rare: 30,
            Epic: 12,
            Legendary: 3
        },
        itemCount: { min: 2, max: 4 },
        goldBonus: { min: 200, max: 500 },
        dustBonus: { min: 40, max: 80 }
    },
    legendary: {
        categoryWeights: {
            ingredient: 30,
            crafting_material: 35,
            scroll: 18,
            equipment: 17
        },
        rarityWeights: {
            Common: 5,
            Uncommon: 20,
            Rare: 35,
            Epic: 30,
            Legendary: 10
        },
        itemCount: { min: 3, max: 5 },
        goldBonus: { min: 400, max: 800 },
        dustBonus: { min: 75, max: 150 }
    }
};

/**
 * Get crate type based on vote streak
 */
function getCrateType(streak) {
    if (streak >= 40) return 'legendary';
    if (streak >= 20) return 'rare';
    if (streak >= 10) return 'uncommon';
    return 'common';
}

/**
 * Weighted random selection
 */
function weightedRandom(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let random = Math.random() * total;
    
    for (const [key, weight] of entries) {
        random -= weight;
        if (random <= 0) return key;
    }
    return entries[0][0];
}

/**
 * Get random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get all items of a specific category and rarity
 */
function getItemsByCategory(category, rarity = null) {
    const filteredItems = [];
    
    for (const [itemId, item] of Object.entries(items)) {
        // Skip non-droppable items
        if (item.type === 'voter_luck' || item.type === 'egg' || item.type === 'currency') continue;
        
        const matchesCategory = (
            (category === 'ingredient' && item.type === 'ingredient') ||
            (category === 'crafting_material' && item.type === 'crafting_material') ||
            (category === 'potion' && item.type === 'potion') ||
            (category === 'equipment' && (item.type === 'equipment' || item.slot))
        );
        
        if (matchesCategory) {
            const itemRarity = item.rarity?.charAt(0).toUpperCase() + item.rarity?.slice(1).toLowerCase() || 'Common';
            if (!rarity || itemRarity === rarity || item.rarity?.toLowerCase() === rarity.toLowerCase()) {
                filteredItems.push({ itemId, ...item });
            }
        }
    }
    
    return filteredItems;
}

/**
 * Get all recipe scrolls of a specific rarity
 */
function getScrollsByRarity(rarity) {
    const scrolls = [];
    
    for (const [recipeId, recipe] of Object.entries(recipes)) {
        // Get the result item to determine rarity
        const resultItem = items[recipe.result.itemId];
        if (resultItem) {
            const itemRarity = resultItem.rarity?.charAt(0).toUpperCase() + resultItem.rarity?.slice(1).toLowerCase() || 'Common';
            if (itemRarity === rarity || resultItem.rarity?.toLowerCase() === rarity.toLowerCase()) {
                scrolls.push({
                    recipeId,
                    name: `Recipe: ${resultItem.name}`,
                    rarity: itemRarity,
                    resultItem: resultItem.name
                });
            }
        }
    }
    
    return scrolls;
}

/**
 * Open a vote crate and get rewards
 * @param {string} crateType - 'common', 'uncommon', 'rare', or 'legendary'
 * @param {boolean} isWeekend - Double rewards if true
 * @returns {Object} Rewards object containing items, gold, dust, and scroll
 */
function openCrate(crateType, isWeekend = false) {
    const lootTable = lootTables[crateType];
    const crate = crateTypes[crateType];
    
    const rewards = {
        crateType: crateType,
        crateName: crate.name,
        crateEmoji: crate.emoji,
        crateColor: crate.color,
        items: [],
        gold: 0,
        dust: 0,
        scroll: null,
        equipment: null, // Track if equipment already given (limit 1)
        isWeekend: isWeekend
    };
    
    // Determine number of items
    let itemCount = randomInt(lootTable.itemCount.min, lootTable.itemCount.max);
    if (isWeekend) itemCount = Math.min(itemCount + 1, 6); // +1 item on weekends, max 6
    
    // Roll for each item
    for (let i = 0; i < itemCount; i++) {
        let category = weightedRandom(lootTable.categoryWeights);
        const rarity = weightedRandom(lootTable.rarityWeights);
        
        // Limit scrolls to 1 per crate - if already have one, switch to crafting materials
        if (category === 'scroll' && rewards.scroll) {
            category = 'crafting_material';
        }
        
        // Limit equipment/weapons to 1 per crate - if already have one, switch to crafting materials
        if (category === 'equipment' && rewards.equipment) {
            category = 'crafting_material';
        }
        
        if (category === 'scroll') {
            // Try to get a recipe scroll
            const scrolls = getScrollsByRarity(rarity);
            if (scrolls.length > 0) {
                const scroll = scrolls[Math.floor(Math.random() * scrolls.length)];
                rewards.scroll = scroll;
            } else {
                // No scrolls of this rarity, give items instead
                const fallbackItems = getItemsByCategory('crafting_material', rarity);
                if (fallbackItems.length > 0) {
                    const item = fallbackItems[Math.floor(Math.random() * fallbackItems.length)];
                    addItemToRewards(rewards, item, rarity, 'crafting_material');
                }
            }
        } else if (category === 'equipment') {
            // Get equipment (limited to 1)
            const categoryItems = getItemsByCategory(category, rarity);
            if (categoryItems.length > 0) {
                const item = categoryItems[Math.floor(Math.random() * categoryItems.length)];
                rewards.equipment = {
                    itemId: item.itemId,
                    name: item.name,
                    quantity: 1,
                    rarity: rarity,
                    type: 'equipment'
                };
            }
        } else {
            // Get regular items (ingredients, crafting materials, potions)
            const categoryItems = getItemsByCategory(category, rarity);
            if (categoryItems.length > 0) {
                const item = categoryItems[Math.floor(Math.random() * categoryItems.length)];
                addItemToRewards(rewards, item, rarity, category);
            }
        }
    }
    
    // Add equipment to items array if obtained
    if (rewards.equipment) {
        rewards.items.push(rewards.equipment);
    }
    
    // Add gold and dust bonus
    rewards.gold = randomInt(lootTable.goldBonus.min, lootTable.goldBonus.max);
    rewards.dust = randomInt(lootTable.dustBonus.min, lootTable.dustBonus.max);
    
    // Weekend doubles
    if (isWeekend) {
        rewards.gold = Math.floor(rewards.gold * 2);
        rewards.dust = Math.floor(rewards.dust * 2);
    }
    
    return rewards;
}

/**
 * Helper function to add items to rewards, stacking if already exists
 */
function addItemToRewards(rewards, item, rarity, category) {
    const existingItem = rewards.items.find(r => r.itemId === item.itemId);
    if (existingItem) {
        existingItem.quantity += randomInt(1, 3);
    } else {
        rewards.items.push({
            itemId: item.itemId,
            name: item.name,
            quantity: randomInt(1, 3),
            rarity: rarity,
            type: category
        });
    }
}

/**
 * Check if current day is a weekend (Saturday or Sunday)
 */
function isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

module.exports = {
    crateTypes,
    lootTables,
    getCrateType,
    openCrate,
    isWeekend,
    getItemsByCategory,
    getScrollsByRarity
};
