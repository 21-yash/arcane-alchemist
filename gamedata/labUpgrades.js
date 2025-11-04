module.exports = {
    // Brewing Upgrades
    enhanced_cauldron: {
        name: 'Enhanced Cauldron',
        description: 'Reduces brewing time by 25%',
        type: 'brewing',
        maxLevel: 3,
        costs: [500, 1500, 3500],
        effects: [
            { level: 1, brewTimeReduction: 0.25 },
            { level: 2, brewTimeReduction: 0.4 },
            { level: 3, brewTimeReduction: 0.5 }
        ]
    },
    
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

    auto_brewer: {
        name: 'Auto-Brewer',
        description: 'Automatically brews potions from stored ingredients',
        type: 'automation',
        maxLevel: 3,
        costs: [5000, 15000, 35000],
        effects: [
            { level: 1, autoBrew: { capacity: 5, interval: 60 } }, // 5 potions per hour
            { level: 2, autoBrew: { capacity: 10, interval: 45 } },
            { level: 3, autoBrew: { capacity: 20, interval: 30 } }
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
            { level: 1, breedingSuccessBonus: 0.15 },
            { level: 2, breedingSuccessBonus: 0.25 },
            { level: 3, breedingSuccessBonus: 0.35 }
        ]
    },

    // Storage Upgrades
    expanded_storage: {
        name: 'Expanded Storage',
        description: 'Increases inventory capacity',
        type: 'storage',
        maxLevel: 10,
        costs: [200, 500, 1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000],
        effects: [
            { level: 1, inventorySlots: 10 },
            { level: 2, inventorySlots: 20 },
            { level: 3, inventorySlots: 35 },
            { level: 4, inventorySlots: 50 },
            { level: 5, inventorySlots: 70 },
            { level: 6, inventorySlots: 90 },
            { level: 7, inventorySlots: 115 },
            { level: 8, inventorySlots: 140 },
            { level: 9, inventorySlots: 170 },
            { level: 10, inventorySlots: 200 }
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
            { level: 2, researchGeneration: { points: 2, interval: 100 } },
            { level: 3, researchGeneration: { points: 3, interval: 80 } },
            { level: 4, researchGeneration: { points: 5, interval: 60 } },
            { level: 5, researchGeneration: { points: 8, interval: 45 } }
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
    }
};