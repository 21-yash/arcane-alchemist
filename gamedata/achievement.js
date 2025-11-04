module.exports = [
    // --- FORAGING ACHIEVEMENTS ---
    {
        id: 'forage_1',
        name: 'First Steps',
        description: 'Go on your first foraging expedition.',
        condition: { type: 'forage', count: 1 },
        reward: { xp: 100 }
    },
    {
        id: 'forage_25',
        name: 'Novice Gatherer',
        description: 'Forage 25 times.',
        condition: { type: 'forage', count: 25 },
        reward: { xp: 500, gold: 100 }
    },
    {
        id: 'forage_100',
        name: 'Expert Forager',
        description: 'Forage 100 times.',
        condition: { type: 'forage', count: 100 },
        reward: { xp: 2000, gold: 500, item: 'uncommon_elemental_egg' }
    },

    // --- HATCHING ACHIEVEMENTS ---
    {
        id: 'hatch_1',
        name: 'A New Friend',
        description: 'Successfully hatch your first egg.',
        condition: { type: 'eggHatch', count: 1 },
        reward: { xp: 250, gold: 50 }
    },
    {
        id: 'hatch_10',
        name: 'Pal Enthusiast',
        description: 'Hatch 10 different eggs.',
        condition: { type: 'eggHatch', count: 10 },
        reward: { xp: 1000, gold: 300 }
    },

    // --- DUNGEON ACHIEVEMENTS ---
    {
        id: 'dungeon_1',
        name: 'Into the Depths',
        description: 'Clear your first dungeon.',
        condition: { type: 'dungeonClear', count: 1 },
        reward: { xp: 1000, gold: 100 }
    },
    {
        id: 'dungeon_50',
        name: 'Dungeon Crawler',
        description: 'Successfully clear 50 dungeons.',
        condition: { type: 'dungeonClear', count: 50 },
        reward: { xp: 2500, gold: 1000, item: 'epic_undead_egg' }
    },

    // --- ALCHEMY ACHIEVEMENTS ---
    {
        id: 'brew_1',
        name: 'The First Brew',
        description: 'Brew your first potion.',
        condition: { type: 'potionsBrewed', count: 1 },
        reward: { xp: 250 }
    },
    {
        id: 'brew_20',
        name: 'Journeyman Brewer',
        description: 'Brew 20 different potions.',
        condition: { type: 'potionsBrewed', count: 20 },
        reward: { xp: 1000, gold: 200 }
    },
    {
        id: 'craft_incubator',
        name: 'The Alchemist\'s Cradle',
        description: 'Craft your first Alchemical Incubator.',
        condition: { type: 'itemCraft', itemId: 'alchemical_incubator' },
        reward: { xp: 1000 }
    },
    {
        id: 'craft_1',
        name: 'Know your Workbench',
        description: 'Craft your first item.',
        condition: { type: 'itemsCrafted', count: 1 },
        reward: { xp: 250, gold: 50 }
    },
    {
        id: 'craft_10',
        name: 'Skilled Craftsman',
        description: 'Craft 10 items.',
        condition: { type: 'itemsCrafted', count: 10 },
        reward: { xp: 1000, gold: 300 }
    },
    // --- BREEDING ACHIEVEMENTS ---
    {
        id: 'breed_1',
        name: 'First Pairing',
        description: 'Successfully breed your first egg.',
        condition: { type: 'palsBred', count: 1 },
        reward: { xp: 500, gold: 100 }
    },
    {
        id: 'breed_10',
        name: 'Master Breeder',
        description: 'Breed 10 eggs.',
        condition: { type: 'palsBred', count: 10 },
        reward: { xp: 2000, gold: 500, item: 'epic_elemental_egg' }
    },
];