module.exports = {
    // Brewing Upgrades
    precision_mixer: {
        name: 'Precision Mixer',
        description: 'Increases brewing success rate',
        type: 'brewing',
        maxLevel: 5,
        costs: [750, 2000, 4000, 8000, 15000],
        effects: [
            { level: 1, successRateBonus: 0.1 },
            { level: 2, successRateBonus: 0.15 },
            { level: 3, successRateBonus: 0.2 },
            { level: 4, successRateBonus: 0.25 },
            { level: 5, successRateBonus: 0.3 }
        ]
    },


    // Incubation Upgrades
    temperature_control: {
        name: 'Temperature Control',
        description: 'Reduces egg hatching time',
        type: 'incubation',
        maxLevel: 4,
        costs: [1000, 3000, 7000, 15000],
        effects: [
            { level: 1, hatchTimeReduction: 0.2 },
            { level: 2, hatchTimeReduction: 0.3 },
            { level: 3, hatchTimeReduction: 0.4 },
            { level: 4, hatchTimeReduction: 0.5 }
        ]
    },

    fertility_enhancer: {
        name: 'Fertility Enhancer',
        description: 'Increases breeding success rate',
        type: 'breeding',
        maxLevel: 3,
        costs: [2500, 7500, 18000],
        effects: [
            { level: 1, breedingExtraEggChance: 0.05 },
            { level: 2, breedingExtraEggChance: 0.1 },
            { level: 3, breedingExtraEggChance: 0.2 }
        ]
    },

    research_station: {
        name: 'Research Station',
        description: 'Generates research points for discovering new recipes',
        type: 'research',
        maxLevel: 5,
        costs: [3000, 8000, 18000, 35000, 60000],
        effects: [
            { level: 1, researchGeneration: { points: 1, interval: 120 } }, 
            { level: 2, researchGeneration: { points: 2, interval: 110 } },
            { level: 3, researchGeneration: { points: 3, interval: 100 } },
            { level: 4, researchGeneration: { points: 5, interval: 100 } },
            { level: 5, researchGeneration: { points: 8, interval: 100 } }
        ]
    },

    rest_area: {
        name: 'Rest Area',
        description: 'Pals recover from injuries faster',
        type: 'healing',
        maxLevel: 3,
        costs: [1500, 4500, 12000],
        effects: [
            { level: 1, healingSpeedMultiplier: 1.5 },
            { level: 2, healingSpeedMultiplier: 2.0 },
            { level: 3, healingSpeedMultiplier: 3.0 }
        ]
    },

    trophy_case: {
        name: 'Trophy Case',
        description: 'Displays your achievements and provides inspiration bonuses',
        type: 'decoration',
        maxLevel: 1,
        costs: [2000],
        effects: [
            { level: 1, xpBonus: 0.1, prestigeDisplay: true }
        ]
    },

    // Additional Brewing Upgrades
    ingredient_preserver: {
        name: 'Ingredient Preserver',
        description: 'Chance to not consume ingredients when brewing fails',
        type: 'brewing',
        maxLevel: 4,
        costs: [2000, 5000, 12000, 25000],
        effects: [
            { level: 1, ingredientSaveChance: 0.15 },
            { level: 2, ingredientSaveChance: 0.25 },
            { level: 3, ingredientSaveChance: 0.35 },
            { level: 4, ingredientSaveChance: 0.5 }
        ]
    },

    batch_brewer: {
        name: 'Batch Brewer',
        description: 'Allows brewing multiple potions at once with',
        type: 'brewing',
        maxLevel: 3,
        costs: [4000, 12000, 30000],
        effects: [
            { level: 1, batchBrewing: { maxBatch: 3 } },
            { level: 2, batchBrewing: { maxBatch: 5 } },
            { level: 3, batchBrewing: { maxBatch: 10 } }
        ]
    },

    // Additional Incubation Upgrades
    dual_incubator: {
        name: 'Dual Incubator',
        description: 'Allows hatching two eggs simultaneously',
        type: 'incubation',
        maxLevel: 3,
        costs: [10000, 20000, 32000],
        effects: [
            { level: 1, additionalHatchingSlot: 1 },
            { level: 2, additionalHatchingSlot: 3 },
            { level: 3, additionalHatchingSlot: 5 }
        ]
    },

    hatching_booster: {
        name: 'Hatching Booster',
        description: 'Increases chance of hatching rare pets from eggs',
        type: 'incubation',
        maxLevel: 4,
        costs: [5000, 15000, 35000, 70000],
        effects: [
            { level: 1, rarePetChanceBonus: 0.1 },
            { level: 2, rarePetChanceBonus: 0.2 },
            { level: 3, rarePetChanceBonus: 0.3 },
            { level: 4, rarePetChanceBonus: 0.4 }
        ]
    },

    // Additional Breeding Upgrades
    breeding_accelerator: {
        name: 'Breeding Accelerator',
        description: 'Reduces breeding time',
        type: 'breeding',
        maxLevel: 4,
        costs: [3000, 9000, 20000, 45000],
        effects: [
            { level: 1, breedingTimeReduction: 0.15 },
            { level: 2, breedingTimeReduction: 0.25 },
            { level: 3, breedingTimeReduction: 0.35 },
            { level: 4, breedingTimeReduction: 0.5 }
        ]
    },

    // Resource & Foraging Upgrades
    rare_finder: {
        name: 'Rare Finder',
        description: 'Increases chance of finding rare ingredients while foraging',
        type: 'resource',
        maxLevel: 4,
        costs: [4000, 12000, 30000, 70000],
        effects: [
            { level: 1, rareItemChanceBonus: 0.1 },
            { level: 2, rareItemChanceBonus: 0.2 },
            { level: 3, rareItemChanceBonus: 0.3 },
            { level: 4, rareItemChanceBonus: 0.4 }
        ]
    },

    foraging_cooldown_reducer: {
        name: 'Foraging Cooldown Reducer',
        description: 'Reduces foraging cooldown time',
        type: 'resource',
        maxLevel: 3,
        costs: [5000, 15000, 40000],
        effects: [
            { level: 1, forageCooldownReduction: 0.2 },
            { level: 2, forageCooldownReduction: 0.35 },
            { level: 3, forageCooldownReduction: 0.5 }
        ]
    },

    // Stamina & Energy Upgrades
    stamina_well: {
        name: 'Stamina Well',
        description: 'Increases maximum stamina capacity',
        type: 'stamina',
        maxLevel: 5,
        costs: [2000, 6000, 15000, 35000, 75000],
        effects: [
            { level: 1, maxStaminaBonus: 40 },
            { level: 2, maxStaminaBonus: 60 },
            { level: 3, maxStaminaBonus: 80 },
            { level: 4, maxStaminaBonus: 120 },
            { level: 5, maxStaminaBonus: 200 }
        ]
    },

    stamina_regenerator: {
        name: 'Stamina Regenerator',
        description: 'Increases stamina regeneration rate',
        type: 'stamina',
        maxLevel: 4,
        costs: [3000, 9000, 25000, 60000],
        effects: [
            { level: 1, staminaRegenMultiplier: 1.25 },
            { level: 2, staminaRegenMultiplier: 1.5 },
            { level: 3, staminaRegenMultiplier: 1.75 },
            { level: 4, staminaRegenMultiplier: 2.0 }
        ]
    },

    // Expedition Upgrades
    expedition_planner: {
        name: 'Expedition Planner',
        description: 'Reduces expedition time and increases success rate',
        type: 'expedition',
        maxLevel: 4,
        costs: [4000, 12000, 30000, 70000],
        effects: [
            { level: 1, expeditionTimeReduction: 0.1, expeditionSuccessBonus: 0.05 },
            { level: 2, expeditionTimeReduction: 0.2, expeditionSuccessBonus: 0.1 },
            { level: 3, expeditionTimeReduction: 0.3, expeditionSuccessBonus: 0.15 },
            { level: 4, expeditionTimeReduction: 0.4, expeditionSuccessBonus: 0.2 }
        ]
    },

    expedition_rewards_boost: {
        name: 'Expedition Rewards Boost',
        description: 'Increases rewards from expeditions',
        type: 'expedition',
        maxLevel: 5,
        costs: [5000, 15000, 35000, 75000, 150000],
        effects: [
            { level: 1, expeditionRewardMultiplier: 1.15 },
            { level: 2, expeditionRewardMultiplier: 1.3 },
            { level: 3, expeditionRewardMultiplier: 1.45 },
            { level: 4, expeditionRewardMultiplier: 1.6 },
            { level: 5, expeditionRewardMultiplier: 1.75 }
        ]
    },

    expedition_safety_net: {
        name: 'Expedition Safety Net',
        description: 'Reduces chance of Pals getting injured or lost on expeditions',
        type: 'expedition',
        maxLevel: 3,
        costs: [6000, 20000, 50000],
        effects: [
            { level: 1, injuryChanceReduction: 0.2, lostChanceReduction: 0.3 },
            { level: 2, injuryChanceReduction: 0.35, lostChanceReduction: 0.5 },
            { level: 3, injuryChanceReduction: 0.5, lostChanceReduction: 0.7 }
        ]
    },

    // Combat & Equipment Upgrades
    combat_training_ground: {
        name: 'Combat Training Ground',
        description: 'Pals gain more XP from battles and dungeons',
        type: 'combat',
        maxLevel: 5,
        costs: [3000, 10000, 25000, 60000, 120000],
        effects: [
            { level: 1, battleXpBonus: 0.15 },
            { level: 2, battleXpBonus: 0.3 },
            { level: 3, battleXpBonus: 0.45 },
            { level: 4, battleXpBonus: 0.6 },
            { level: 5, battleXpBonus: 0.75 }
        ]
    },

    // Gold & Economy Upgrades
    gold_magnet: {
        name: 'Gold Magnet',
        description: 'Increases gold earned from all activities',
        type: 'economy',
        maxLevel: 5,
        costs: [2000, 6000, 15000, 35000, 75000],
        effects: [
            { level: 1, goldEarnedBonus: 0.1 },
            { level: 2, goldEarnedBonus: 0.2 },
            { level: 3, goldEarnedBonus: 0.3 },
            { level: 4, goldEarnedBonus: 0.4 },
            { level: 5, goldEarnedBonus: 0.5 }
        ]
    },

    merchant_connection: {
        name: 'Merchant Connection',
        description: 'Better prices when selling items to shops',
        type: 'economy',
        maxLevel: 4,
        costs: [4000, 12000, 30000, 70000],
        effects: [
            { level: 1, sellPriceBonus: 0.1 },
            { level: 2, sellPriceBonus: 0.2 },
            { level: 3, sellPriceBonus: 0.3 },
            { level: 4, sellPriceBonus: 0.4 }
        ]
    },

    // Advanced Upgrades
    arcane_reactor: {
        name: 'Arcane Reactor',
        description: 'Generates arcane dust over time',
        type: 'resource',
        maxLevel: 5,
        costs: [10000, 30000, 70000, 150000, 300000],
        effects: [
            { level: 1, arcaneDustGeneration: { amount: 1, interval: 180 } },
            { level: 2, arcaneDustGeneration: { amount: 2, interval: 150 } },
            { level: 3, arcaneDustGeneration: { amount: 4, interval: 120 } },
            { level: 4, arcaneDustGeneration: { amount: 6, interval: 90 } },
            { level: 5, arcaneDustGeneration: { amount: 10, interval: 60 } }
        ]
    },
};