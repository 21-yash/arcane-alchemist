module.exports = {
    // TUTORIAL QUESTS
    'tutorial_first_steps': {
        id: 'tutorial_first_steps',
        name: 'First Steps into Alchemy',
        description: 'Learn the basics of being an Arcane Alchemist.',
        type: 'main',
        faction: 'alchemists',
        levelRequirement: 1,
        prerequisites: [],
        objectives: {
            forage_times: 3,
            reach_level: 2,
            enter_dungeon: 1
        },
        rewards: {
            xp: 100,
            gold: 200,
            items: [{ itemId: 'crystal_shard', quantity: 3 }],
            recipes: [{ recipeId: 'minor_healing_potion', type: 'potion' }],
            reputation: { alchemists: 50 }
        },
        storyline: 'Tutorial',
        isRepeatable: false
    },

    'tutorial_combat_basics': {
        id: 'tutorial_combat_basics',
        name: 'Combat Training',
        description: 'Learn the fundamentals of combat in this dangerous world.',
        type: 'main',
        faction: 'guardians',
        levelRequirement: 2,
        prerequisites: ['tutorial_first_steps'],
        objectives: {
            defeat_enemies: 5,
            use_healing_potion: 1,
            survive_battle: 3
        },
        rewards: {
            xp: 150,
            gold: 300,
            items: [{ itemId: 'iron_sword', quantity: 1 }],
            reputation: { guardians: 75 }
        },
        storyline: 'Tutorial',
        isRepeatable: false
    },

    'daily_forage': {
        id: 'daily_forage',
        name: 'Daily Gathering',
        description: 'Gather resources from the wilderness.',
        type: 'daily',
        faction: 'explorers',
        levelRequirement: 1,
        prerequisites: [],
        objectives: {
            forage_times: 5,
            collect_items: 10
        },
        rewards: {
            xp: 50,
            gold: 100,
            items: [{ itemId: 'greater_healing_potion', quantity: 1 }],
            reputation: { explorers: 10 }
        },
        isRepeatable: true,
        cooldown: 86400000 // 24 hr
    },

    'daily_craft': {
        id: 'daily_craft',
        name: 'Daily Crafting',
        description: 'Create useful items through alchemy.',
        type: 'daily',
        faction: 'alchemists',
        levelRequirement: 3,
        prerequisites: [],
        objectives: {
            craft_items: 3,
            brew_potions: 2
        },
        rewards: {
            xp: 75,
            gold: 150,
            items: [{ itemId: 'crystal_shard', quantity: 2 }],
            reputation: { alchemists: 15 }
        },
        isRepeatable: true,
        cooldown: 86400000
    },


    // MAIN STORY QUESTS
    'meeting_the_merchant': {
        id: 'meeting_the_merchant',
        name: 'Meeting the Merchant',
        description: 'Establish trade relations with the local merchant guild.',
        type: 'main',
        faction: 'merchants',
        levelRequirement: 5,
        prerequisites: ['tutorial_combat_basics'],
        objectives: {
            buy_from_shop: 5,
            accumulate_gold: 1000
        },
        rewards: {
            xp: 200,
            gold: 500,
            items: [{ itemId: 'merchant_badge', quantity: 1 }],
            reputation: { merchants: 100 }
        },
        storyline: 'Chapter 1',
        isRepeatable: false
    },

    'the_lost_expedition': {
        id: 'the_lost_expedition',
        name: 'The Lost Expedition',
        description: 'Search for a missing expedition in the Whispering Woods.',
        type: 'main',
        faction: 'explorers',
        levelRequirement: 8,
        prerequisites: ['meeting_the_merchant'],
        objectives: {
            explore_locations: 3,
            find_clues: 5,
            defeat_forest_guardian: 1
        },
        rewards: {
            xp: 400,
            gold: 800,
            items: [{ itemId: 'explorer_compass', quantity: 1 }],
            reputation: { explorers: 150 }
        },
        storyline: 'Chapter 2',
        isRepeatable: false
    },

    'ancient_secrets': {
        id: 'ancient_secrets',
        name: 'Ancient Secrets',
        description: 'Uncover the mysteries of the ancient civilization.',
        type: 'main',
        faction: 'alchemists',
        levelRequirement: 15,
        prerequisites: ['the_lost_expedition'],
        objectives: {
            decipher_runes: 10,
            craft_ancient_key: 1,
            enter_ancient_ruins: 1
        },
        rewards: {
            xp: 800,
            gold: 1500,
            items: [{ itemId: 'ancient_tome', quantity: 1 }],
            reputation: { alchemists: 200 }
        },
        storyline: 'Chapter 3',
        isRepeatable: false
    },

    // DAILY QUESTS
    

    'daily_trading': {
        id: 'daily_trading',
        name: 'Daily Commerce',
        description: 'Engage in profitable trading activities.',
        type: 'daily',
        faction: 'merchants',
        levelRequirement: 5,
        prerequisites: [],
        objectives: {
            complete_trades: 3,
            earn_profit: 500
        },
        rewards: {
            xp: 60,
            gold: 200,
            items: [{ itemId: 'trade_contract', quantity: 1 }],
            reputation: { merchants: 12 }
        },
        isRepeatable: true,
        cooldown: 86400000
    },

    'daily_patrol': {
        id: 'daily_patrol',
        name: 'City Patrol',
        description: 'Help maintain order by patrolling the city.',
        type: 'daily',
        faction: 'guardians',
        levelRequirement: 7,
        prerequisites: [],
        objectives: {
            patrol_areas: 4,
            help_citizens: 2,
            report_incidents: 1
        },
        rewards: {
            xp: 80,
            gold: 120,
            items: [{ itemId: 'guardian_seal', quantity: 1 }],
            reputation: { guardians: 18 }
        },
        isRepeatable: true,
        cooldown: 86400000
    },

    'daily_research': {
        id: 'daily_research',
        name: 'Arcane Research',
        description: 'Study ancient texts and conduct magical experiments.',
        type: 'daily',
        faction: 'alchemists',
        levelRequirement: 10,
        prerequisites: [],
        objectives: {
            study_texts: 2,
            conduct_experiments: 1,
            record_findings: 3
        },
        rewards: {
            xp: 100,
            gold: 80,
            items: [{ itemId: 'research_notes', quantity: 1 }],
            reputation: { alchemists: 20 }
        },
        isRepeatable: true,
        cooldown: 86400000
    },

    // WEEKLY QUESTS
    'weekly_dungeon': {
        id: 'weekly_dungeon',
        name: 'Weekly Expedition',
        description: 'Clear multiple dungeons to prove your worth.',
        type: 'weekly',
        faction: 'guardians',
        levelRequirement: 8,
        prerequisites: [],
        objectives: {
            clear_dungeons: 5,
            defeat_bosses: 2,
            find_treasure: 3
        },
        rewards: {
            xp: 500,
            gold: 1000,
            items: [{ itemId: 'rare_equipment_box', quantity: 1 }],
            reputation: { guardians: 100 }
        },
        isRepeatable: true,
        cooldown: 604800000 // 7 days
    },

    'weekly_grand_expedition': {
        id: 'weekly_grand_expedition',
        name: 'Grand Exploration',
        description: 'Embark on a grand journey across multiple regions.',
        type: 'weekly',
        faction: 'explorers',
        levelRequirement: 12,
        prerequisites: [],
        objectives: {
            visit_regions: 8,
            map_territories: 5,
            discover_landmarks: 3
        },
        rewards: {
            xp: 750,
            gold: 1500,
            items: [{ itemId: 'legendary_map', quantity: 1 }],
            reputation: { explorers: 150 }
        },
        isRepeatable: true,
        cooldown: 604800000
    },

    'weekly_market_domination': {
        id: 'weekly_market_domination',
        name: 'Market Mastery',
        description: 'Dominate the weekly markets with strategic trading.',
        type: 'weekly',
        faction: 'merchants',
        levelRequirement: 10,
        prerequisites: [],
        objectives: {
            complete_large_trades: 10,
            corner_market: 2,
            earn_weekly_profit: 5000
        },
        rewards: {
            xp: 600,
            gold: 2000,
            items: [{ itemId: 'golden_ledger', quantity: 1 }],
            reputation: { merchants: 120 }
        },
        isRepeatable: true,
        cooldown: 604800000
    },

    'weekly_alchemical_mastery': {
        id: 'weekly_alchemical_mastery',
        name: 'Alchemical Mastery',
        description: 'Push the boundaries of alchemical knowledge.',
        type: 'weekly',
        faction: 'alchemists',
        levelRequirement: 15,
        prerequisites: [],
        objectives: {
            create_masterwork_items: 3,
            discover_new_formulas: 2,
            teach_students: 5
        },
        rewards: {
            xp: 800,
            gold: 1200,
            items: [{ itemId: 'philosopher_stone_fragment', quantity: 1 }],
            reputation: { alchemists: 180 }
        },
        isRepeatable: true,
        cooldown: 604800000
    },

    // FACTION SPECIFIC QUESTS
    'alchemist_initiation': {
        id: 'alchemist_initiation',
        name: 'Alchemist Initiation',
        description: 'Prove your dedication to the alchemical arts.',
        type: 'faction',
        faction: 'alchemists',
        levelRequirement: 8,
        prerequisites: ['tutorial_first_steps'],
        objectives: {
            master_basic_recipes: 5,
            create_perfect_potion: 1,
            pass_guild_exam: 1
        },
        rewards: {
            xp: 300,
            gold: 600,
            items: [{ itemId: 'alchemist_robes', quantity: 1 }],
            reputation: { alchemists: 200 }
        },
        isRepeatable: false
    },

    'alchemist_mastery': {
        id: 'alchemist_mastery',
        name: 'Path of the Master Alchemist',
        description: 'Prove your mastery of the alchemical arts.',
        type: 'faction',
        faction: 'alchemists',
        levelRequirement: 20,
        prerequisites: ['alchemist_initiation', 'ancient_secrets'],
        objectives: {
            brew_legendary_potion: 1,
            craft_epic_equipment: 2,
            teach_apprentice: 3,
            discover_new_element: 1
        },
        rewards: {
            xp: 1500,
            gold: 3000,
            items: [{ itemId: 'master_alchemist_robe', quantity: 1 }],
            reputation: { alchemists: 500 }
        },
        isRepeatable: false
    },

    'merchant_apprentice': {
        id: 'merchant_apprentice',
        name: 'Merchant Apprentice',
        description: 'Learn the ways of successful trading.',
        type: 'faction',
        faction: 'merchants',
        levelRequirement: 6,
        prerequisites: ['meeting_the_merchant'],
        objectives: {
            complete_trade_routes: 3,
            negotiate_deals: 5,
            establish_connections: 2
        },
        rewards: {
            xp: 250,
            gold: 800,
            items: [{ itemId: 'merchant_scales', quantity: 1 }],
            reputation: { merchants: 150 }
        },
        isRepeatable: false
    },

    'merchant_mogul': {
        id: 'merchant_mogul',
        name: 'Trade Mogul',
        description: 'Become a master of commerce and trade.',
        type: 'faction',
        faction: 'merchants',
        levelRequirement: 18,
        prerequisites: ['merchant_apprentice'],
        objectives: {
            establish_trade_empire: 1,
            control_market_sectors: 3,
            train_merchant_apprentices: 5
        },
        rewards: {
            xp: 1200,
            gold: 5000,
            items: [{ itemId: 'golden_merchant_crown', quantity: 1 }],
            reputation: { merchants: 400 }
        },
        isRepeatable: false
    },

    'explorer_scout': {
        id: 'explorer_scout',
        name: 'Scout Training',
        description: 'Master the skills needed for exploration.',
        type: 'faction',
        faction: 'explorers',
        levelRequirement: 7,
        prerequisites: ['the_lost_expedition'],
        objectives: {
            survive_wilderness: 7,
            map_unexplored_areas: 5,
            rescue_lost_travelers: 3
        },
        rewards: {
            xp: 320,
            gold: 700,
            items: [{ itemId: 'explorer_boots', quantity: 1 }],
            reputation: { explorers: 180 }
        },
        isRepeatable: false
    },

    'legendary_explorer': {
        id: 'legendary_explorer',
        name: 'Legendary Explorer',
        description: 'Achieve legendary status among explorers.',
        type: 'faction',
        faction: 'explorers',
        levelRequirement: 22,
        prerequisites: ['explorer_scout'],
        objectives: {
            discover_new_continent: 1,
            chart_dangerous_territories: 5,
            lead_major_expedition: 1,
            write_exploration_guide: 1
        },
        rewards: {
            xp: 2000,
            gold: 4000,
            items: [{ itemId: 'legendary_explorer_cloak', quantity: 1 }],
            reputation: { explorers: 500 }
        },
        isRepeatable: false
    },

    'guardian_recruit': {
        id: 'guardian_recruit',
        name: 'Guardian Recruit',
        description: 'Begin your training as a guardian of the realm.',
        type: 'faction',
        faction: 'guardians',
        levelRequirement: 9,
        prerequisites: ['tutorial_combat_basics'],
        objectives: {
            complete_training_exercises: 10,
            protect_civilians: 5,
            demonstrate_courage: 3
        },
        rewards: {
            xp: 400,
            gold: 600,
            items: [{ itemId: 'guardian_shield', quantity: 1 }],
            reputation: { guardians: 200 }
        },
        isRepeatable: false
    },

    'elite_guardian': {
        id: 'elite_guardian',
        name: 'Elite Guardian',
        description: 'Ascend to the elite ranks of the Guardian Order.',
        type: 'faction',
        faction: 'guardians',
        levelRequirement: 25,
        prerequisites: ['guardian_recruit'],
        objectives: {
            defeat_legendary_monsters: 3,
            save_cities_from_disaster: 2,
            train_new_recruits: 10,
            uphold_justice: 5
        },
        rewards: {
            xp: 2500,
            gold: 3500,
            items: [{ itemId: 'elite_guardian_armor', quantity: 1 }],
            reputation: { guardians: 500 }
        },
        isRepeatable: false
    },

    // SPECIAL EVENT QUESTS
    'seasonal_harvest': {
        id: 'seasonal_harvest',
        name: 'Seasonal Harvest Festival',
        description: 'Participate in the annual harvest celebration.',
        type: 'event',
        faction: null,
        levelRequirement: 5,
        prerequisites: [],
        objectives: {
            gather_festival_items: 20,
            participate_in_contests: 3,
            help_festival_preparations: 5
        },
        rewards: {
            xp: 300,
            gold: 500,
            items: [{ itemId: 'harvest_crown', quantity: 1 }],
            reputation: { 
                alchemists: 25,
                merchants: 25,
                explorers: 25,
                guardians: 25
            }
        },
        isRepeatable: false,
        isLimited: true
    },

    'winter_solstice': {
        id: 'winter_solstice',
        name: 'Winter Solstice Celebration',
        description: 'Join the winter solstice festivities.',
        type: 'event',
        faction: null,
        levelRequirement: 1,
        prerequisites: [],
        objectives: {
            light_ceremonial_fires: 5,
            exchange_gifts: 3,
            share_winter_stories: 2
        },
        rewards: {
            xp: 200,
            gold: 300,
            items: [{ itemId: 'winter_cloak', quantity: 1 }],
            reputation: {
                alchemists: 15,
                merchants: 15,
                explorers: 15,
                guardians: 15
            }
        },
        isRepeatable: false,
        isLimited: true
    },

    // CHALLENGE QUESTS
    'master_of_all_trades': {
        id: 'master_of_all_trades',
        name: 'Master of All Trades',
        description: 'Achieve mastery across all faction disciplines.',
        type: 'challenge',
        faction: null,
        levelRequirement: 30,
        prerequisites: ['alchemist_mastery', 'merchant_mogul', 'legendary_explorer', 'elite_guardian'],
        objectives: {
            reach_max_reputation: 4,
            complete_all_faction_quests: 1,
            demonstrate_universal_mastery: 1
        },
        rewards: {
            xp: 5000,
            gold: 10000,
            items: [{ itemId: 'crown_of_mastery', quantity: 1 }],
            reputation: {
                alchemists: 100,
                merchants: 100,
                explorers: 100,
                guardians: 100
            }
        },
        isRepeatable: false
    },

    'legend_maker': {
        id: 'legend_maker',
        name: 'Legend Maker',
        description: 'Create your own legend through extraordinary deeds.',
        type: 'challenge',
        faction: null,
        levelRequirement: 35,
        prerequisites: ['master_of_all_trades'],
        objectives: {
            complete_impossible_tasks: 5,
            inspire_next_generation: 10,
            leave_lasting_legacy: 1
        },
        rewards: {
            xp: 10000,
            gold: 25000,
            items: [{ itemId: 'legendary_artifact', quantity: 1 }],
            reputation: {
                alchemists: 200,
                merchants: 200,
                explorers: 200,
                guardians: 200
            }
        },
        isRepeatable: false
    }
};

