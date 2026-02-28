// ═══════════════════════════════════════════════════════════════
//  QUEST DATA — Daily / Weekly / Story
//  Objectives MUST match tracked keys in updateQuestProgress()
//
//  levelRequired: Player must be at this level or higher for
//                 the quest to appear. This prevents quests
//                 that reference locked features.
// ═══════════════════════════════════════════════════════════════

// ── Daily quest pool (3 random are picked per day, filtered by level) ──

const dailyQuestPool = [
    // === Tier 1 — Available from the start (level 1+) ===
    {
        id: 'daily_forage_light',
        name: 'Quick Forage',
        description: 'Gather a few ingredients from the nearby wilds.',
        levelRequired: 1,
        objectives: { forage_times: 3 },
        rewards: { xp: 30, gold: 60 }
    },
    {
        id: 'daily_forage',
        name: 'Wilderness Gathering',
        description: 'Forage for ingredients in the wilds.',
        levelRequired: 1,
        objectives: { forage_times: 5 },
        rewards: { xp: 50, gold: 100 }
    },
    {
        id: 'daily_forage_loot',
        name: 'Ingredient Collector',
        description: 'Collect ingredients while foraging.',
        levelRequired: 1,
        objectives: { collect_items: 12 },
        rewards: { xp: 60, gold: 120 }
    },
    {
        id: 'daily_brew_light',
        name: 'Brew Something',
        description: 'Practice your alchemy by brewing a potion.',
        levelRequired: 1,
        objectives: { brew_potions: 1 },
        rewards: { xp: 30, gold: 60 }
    },
    {
        id: 'daily_brew',
        name: 'Potion Brewer',
        description: 'Brew several potions in the cauldron.',
        levelRequired: 1,
        objectives: { brew_potions: 3 },
        rewards: { xp: 70, gold: 130 }
    },
    {
        id: 'daily_craft_light',
        name: 'Quick Craft',
        description: 'Craft a piece of equipment at the workshop.',
        levelRequired: 1,
        objectives: { craft_items: 1 },
        rewards: { xp: 30, gold: 60 }
    },
    {
        id: 'daily_craft',
        name: 'Workshop Shift',
        description: 'Craft equipment at the workshop.',
        levelRequired: 1,
        objectives: { craft_items: 3 },
        rewards: { xp: 70, gold: 130 }
    },
    {
        id: 'daily_forage_brew',
        name: 'Gather & Brew',
        description: 'Forage for ingredients then brew something with them.',
        levelRequired: 1,
        objectives: { forage_times: 3, brew_potions: 1 },
        rewards: { xp: 60, gold: 110 }
    },
    {
        id: 'daily_forage_craft',
        name: 'Gather & Craft',
        description: 'Forage for materials then craft gear.',
        levelRequired: 1,
        objectives: { forage_times: 3, craft_items: 1 },
        rewards: { xp: 60, gold: 110 }
    },

    // === Tier 2 — Dungeon + Expedition unlocked (level 3+) ===
    {
        id: 'daily_dungeon_light',
        name: 'Dungeon Explorer',
        description: 'Enter a dungeon and clear a few floors.',
        levelRequired: 3,
        objectives: { clear_dungeon_floors: 3 },
        rewards: { xp: 50, gold: 100 }
    },
    {
        id: 'daily_dungeon',
        name: 'Dungeon Runner',
        description: 'Push through dungeon floors with your Pals.',
        levelRequired: 3,
        objectives: { clear_dungeon_floors: 5 },
        rewards: { xp: 70, gold: 140 }
    },
    {
        id: 'daily_expedition_light',
        name: 'Scout Mission',
        description: 'Send a Pal on a quick expedition.',
        levelRequired: 3,
        objectives: { complete_expeditions: 1 },
        rewards: { xp: 40, gold: 80 }
    },
    {
        id: 'daily_expedition',
        name: 'Explorer\'s Duty',
        description: 'Send your Pals on expeditions.',
        levelRequired: 3,
        objectives: { complete_expeditions: 2 },
        rewards: { xp: 60, gold: 110 }
    },
    {
        id: 'daily_dungeon_forage',
        name: 'Adventurer\'s Day',
        description: 'Forage and clear some dungeon floors.',
        levelRequired: 3,
        objectives: { forage_times: 3, clear_dungeon_floors: 3 },
        rewards: { xp: 80, gold: 150 }
    },

    // === Tier 3 — Battles + more gameplay (level 5+) ===
    {
        id: 'daily_battle_light',
        name: 'Arena Challenger',
        description: 'Challenge another player to a battle.',
        levelRequired: 5,
        objectives: { win_battles: 1 },
        rewards: { xp: 60, gold: 120 }
    },
    {
        id: 'daily_battle',
        name: 'Arena Fighter',
        description: 'Win PvP battles against other players.',
        levelRequired: 5,
        objectives: { win_battles: 2 },
        rewards: { xp: 80, gold: 160 }
    },
    {
        id: 'daily_mixed',
        name: 'Daily Grind',
        description: 'Forage, brew, and fight — a bit of everything.',
        levelRequired: 5,
        objectives: { forage_times: 3, brew_potions: 1, clear_dungeon_floors: 3 },
        rewards: { xp: 100, gold: 200 }
    },
    {
        id: 'daily_crafter_brewer',
        name: 'Artisan\'s Day',
        description: 'Spend the day crafting and brewing.',
        levelRequired: 5,
        objectives: { craft_items: 2, brew_potions: 2 },
        rewards: { xp: 90, gold: 180 }
    },

    // === Tier 4 — Pet breeding/hatching (level 8+) ===
    {
        id: 'daily_hatch',
        name: 'Egg Watcher',
        description: 'Hatch a Pal egg from the incubator.',
        levelRequired: 8,
        objectives: { hatch_pals: 1 },
        rewards: { xp: 60, gold: 100 }
    },
    {
        id: 'daily_breed',
        name: 'Pal Breeder',
        description: 'Breed a pair of Pals.',
        levelRequired: 10,
        objectives: { breed_pals: 1 },
        rewards: { xp: 70, gold: 130 }
    },

    // === Tier 5 — Late game variety (level 12+) ===
    {
        id: 'daily_hardcore',
        name: 'Hardcore Routine',
        description: 'Clear dungeons, win battles, and forage — for the dedicated.',
        levelRequired: 12,
        objectives: { clear_dungeons: 2, win_battles: 1, forage_times: 5 },
        rewards: { xp: 150, gold: 300 }
    },
    {
        id: 'daily_mass_forage',
        name: 'Rare Ingredient Hunt',
        description: 'Go on an extended foraging run for rare ingredients.',
        levelRequired: 12,
        objectives: { forage_times: 8, collect_items: 15 },
        rewards: { xp: 100, gold: 200 }
    },
    {
        id: 'daily_brewer_master',
        name: 'Potion Marathon',
        description: 'Brew a large batch of potions.',
        levelRequired: 15,
        objectives: { brew_potions: 5 },
        rewards: { xp: 120, gold: 250 }
    },
    {
        id: 'daily_full_routine',
        name: 'The Full Alchemist',
        description: 'Forage, brew, craft, clear dungeons — do it all.',
        levelRequired: 15,
        objectives: { forage_times: 5, brew_potions: 2, craft_items: 2, clear_dungeons: 1 },
        rewards: { xp: 180, gold: 350 }
    }
];

// ── Weekly quest pool (2 random are picked per week, filtered by level) ──

const weeklyQuestPool = [
    // === Tier 1 — Available from start (level 1+) ===
    {
        id: 'weekly_forage',
        name: 'Harvest Season',
        description: 'Forage extensively throughout the week.',
        levelRequired: 1,
        objectives: { forage_times: 25 },
        rewards: { xp: 300, gold: 600, arcaneDust: 50 }
    },
    {
        id: 'weekly_brew',
        name: 'Master Brewer',
        description: 'Brew a large batch of potions this week.',
        levelRequired: 1,
        objectives: { brew_potions: 15 },
        rewards: { xp: 350, gold: 700, arcaneDust: 60 }
    },
    {
        id: 'weekly_craft',
        name: 'Forgemaster',
        description: 'Craft many pieces of equipment this week.',
        levelRequired: 1,
        objectives: { craft_items: 12 },
        rewards: { xp: 350, gold: 700, arcaneDust: 60 }
    },
    {
        id: 'weekly_collector',
        name: 'Material Hoarder',
        description: 'Collect a massive amount of foraged items.',
        levelRequired: 1,
        objectives: { collect_items: 50 },
        rewards: { xp: 300, gold: 600, arcaneDust: 50 }
    },

    // === Tier 2 — Dungeons/Expeditions (level 3+) ===
    {
        id: 'weekly_dungeon',
        name: 'Dungeon Conqueror',
        description: 'Conquer the dungeons throughout the week.',
        levelRequired: 3,
        objectives: { clear_dungeons: 10 },
        rewards: { xp: 500, gold: 1000, arcaneDust: 80 }
    },
    {
        id: 'weekly_expedition',
        name: 'Grand Expedition',
        description: 'Complete many expeditions this week.',
        levelRequired: 3,
        objectives: { complete_expeditions: 10 },
        rewards: { xp: 400, gold: 800, arcaneDust: 70 }
    },
    {
        id: 'weekly_adventurer',
        name: 'Seasoned Adventurer',
        description: 'Forage, clear dungeons, and run expeditions.',
        levelRequired: 3,
        objectives: { forage_times: 15, clear_dungeons: 5, complete_expeditions: 5 },
        rewards: { xp: 500, gold: 1000, arcaneDust: 80 }
    },

    // === Tier 3 — Battles (level 5+) ===
    {
        id: 'weekly_battle',
        name: 'Arena Champion',
        description: 'Dominate the arena throughout the week.',
        levelRequired: 5,
        objectives: { win_battles: 10 },
        rewards: { xp: 500, gold: 1000, arcaneDust: 80 }
    },

    // === Tier 4 — Breeding/Hatching (level 8+) ===
    {
        id: 'weekly_breed_hatch',
        name: 'Pal Nursery',
        description: 'Breed and hatch Pals throughout the week.',
        levelRequired: 10,
        objectives: { breed_pals: 3, hatch_pals: 3 },
        rewards: { xp: 400, gold: 800, arcaneDust: 70 }
    },

    // === Tier 5 — All-rounders (level 10+) ===
    {
        id: 'weekly_allrounder',
        name: 'Jack of All Trades',
        description: 'Do a bit of everything this week — the ultimate test.',
        levelRequired: 10,
        objectives: { forage_times: 10, brew_potions: 5, craft_items: 5, clear_dungeons: 3 },
        rewards: { xp: 600, gold: 1200, arcaneDust: 100 }
    },
    {
        id: 'weekly_legend',
        name: 'Path of the Legend',
        description: 'Forage, brew, fight, conquer dungeons, and explore — prove you are legendary.',
        levelRequired: 15,
        objectives: { forage_times: 20, brew_potions: 10, win_battles: 5, clear_dungeons: 5, complete_expeditions: 5 },
        rewards: { xp: 800, gold: 1500, arcaneDust: 150 }
    }
];

// ── Story quests (sequential, permanent, level-gated) ────────

const storyQuests = [
    {
        id: 'story_1',
        name: 'First Steps into Alchemy',
        description: 'Every great alchemist starts somewhere. Begin your journey by foraging for your first ingredients.',
        levelRequired: 1,
        objectives: { forage_times: 3 },
        rewards: { xp: 100, gold: 200 }
    },
    {
        id: 'story_2',
        name: 'The Cauldron Awakens',
        description: 'Now that you have ingredients, learn to brew your first potions.',
        levelRequired: 2,
        objectives: { brew_potions: 2 },
        rewards: { xp: 120, gold: 250 }
    },
    {
        id: 'story_3',
        name: 'Into the Dungeons',
        description: 'The dungeons hold great treasures — and great danger. Prove your worth.',
        levelRequired: 3,
        objectives: { clear_dungeon_floors: 5 },
        rewards: { xp: 150, gold: 300 }
    },
    {
        id: 'story_4',
        name: 'Crafting Apprentice',
        description: 'Master the art of crafting equipment at the workshop.',
        levelRequired: 5,
        objectives: { craft_items: 3 },
        rewards: { xp: 200, gold: 400 }
    },
    {
        id: 'story_5',
        name: 'Expedition Ready',
        description: 'Send your Pals on expeditions to gather resources from distant lands.',
        levelRequired: 7,
        objectives: { complete_expeditions: 3 },
        rewards: { xp: 250, gold: 500 }
    },
    {
        id: 'story_6',
        name: 'The Breeder\'s Path',
        description: 'Learn the ancient art of Pal breeding.',
        levelRequired: 10,
        objectives: { breed_pals: 1, hatch_pals: 2 },
        rewards: { xp: 300, gold: 600 }
    },
    {
        id: 'story_7',
        name: 'Battle Hardened',
        description: 'Challenge other alchemists and prove your strength in the arena.',
        levelRequired: 12,
        objectives: { win_battles: 3 },
        rewards: { xp: 400, gold: 800 }
    },
    {
        id: 'story_8',
        name: 'The Alchemist\'s Mastery',
        description: 'Show your dedication by mastering all alchemical arts.',
        levelRequired: 15,
        objectives: { brew_potions: 15, craft_items: 10, forage_times: 20 },
        rewards: { xp: 600, gold: 1200, arcaneDust: 100 }
    },
    {
        id: 'story_9',
        name: 'Dungeon Crawler',
        description: 'Delve deep into the most dangerous dungeons. Only the strongest survive.',
        levelRequired: 20,
        objectives: { clear_dungeons: 15 },
        rewards: { xp: 800, gold: 1500, arcaneDust: 150 }
    },
    {
        id: 'story_10',
        name: 'The Legend of the Arcane',
        description: 'Your name echoes through the realm. Complete the ultimate trial to become a legend.',
        levelRequired: 25,
        objectives: { forage_times: 50, clear_dungeons: 25, brew_potions: 25, craft_items: 15, win_battles: 10 },
        rewards: { xp: 2000, gold: 5000, arcaneDust: 500 }
    }
];

module.exports = {
    dailyQuestPool,
    weeklyQuestPool,
    storyQuests
};
