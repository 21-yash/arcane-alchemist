module.exports = {
    'whispering_woods_path': {
        name: 'Whispering Woods Path',
        tier: 'I',
        floors: 20,
        durationMinutes: 10,
        staminaCost: 20,
        levelRequirement: 1,
        enemyPool: ['forest_sprite', 'wild_boar'],
        boss: 'elderwood_guardian',
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1413124557845430433/image-removebg-preview_33.png?ex=68baca4d&is=68b978cd&hm=c75457ad315320a01f4566a9e5c7c9abfb6f02cd952bd389ee4c5ba6af27866a&',
        baseRewards: {
            gold: [20, 50],
            xp: [10, 25],
            lootTable: [
                { itemId: 'moonpetal_herb', baseChance: 0.8, quantityRange: [1, 3] },
                { itemId: 'beast_hide', baseChance: 0.3, quantityRange: [1, 2] }
            ],
            eggTable: [
                { itemId: 'beast_egg', chance: 0.19 },
                { itemId: 'mystic_egg', chance: 0.15 },
                { itemId: 'undead_egg', chance: 0.08 }
            ]
        },
        scaleFactors: { gold: 1.05, xp: 1.04, lootChance: 1.02 },
        guaranteedReward: { itemId: 'whispering_bloom', quantity: 1 }
    },

    'sunken_crypts': {
        name: 'Sunken Crypts',
        tier: 'II',
        floors: 15,
        durationMinutes: 30,
        staminaCost: 40,
        levelRequirement: 8,
        enemyPool: ['crypt_bat', 'skeletal_warrior'],
        boss: 'grave_golem',
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1413124558340231308/image-removebg-preview_34.png?ex=68baca4d&is=68b978cd&hm=179a19d4917216c7f01ed57ef0a5f64eb149af89053d4593331f39a0b598a699&',
        baseRewards: {
            gold: [80, 150],
            xp: [50, 100],
            lootTable: [
                { itemId: 'crystal_shard', baseChance: 0.7, quantityRange: [2, 5] },
                { itemId: 'iron_ore', baseChance: 0.5, quantityRange: [3, 6] },
                { itemId: 'mystic_thread', baseChance: 0.08, quantityRange: [1, 2] },

            ],
            eggTable: [
                { itemId: 'undead_egg', chance: 0.2 },
                { itemId: 'mechanical_egg', chance: 0.16 },
                { itemId: 'elemental_egg', chance: 0.05 }
            ]
        },
        scaleFactors: { gold: 1.06, xp: 1.05, lootChance: 1.03 },
        guaranteedReward: { itemId: 'ancient_coin', quantity: 1 }
    },

    'molten_caverns': {
        name: 'Molten Caverns',
        tier: 'III',
        floors: 25,
        durationMinutes: 45,
        staminaCost: 60,
        levelRequirement: 15,
        enemyPool: ['lava_serpent', 'fire_elemental'],
        boss: 'molten_titan',
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1413124558847868928/image-removebg-preview_35.png?ex=68baca4d&is=68b978cd&hm=3a6e916f62bfd2d9380c810961e512ba1130127962dfffb799c0532c9ac4ad93&',
        baseRewards: {
            gold: [120, 200],
            xp: [100, 200],
            lootTable: [
                { itemId: 'fire_essence', baseChance: 0.6, quantityRange: [1, 2] },
                { itemId: 'lava_gem', baseChance: 0.3, quantityRange: [1, 1] }
            ],
            eggTable: [
                { itemId: 'elemental_egg', chance: 0.29 },
                { itemId: 'beast_egg', chance: 0.13 },
                { itemId: 'mechanical_egg', chance: 0.04 },
                { itemId: 'hybrid_beast_egg', chance: 0.01 }
            ]
        },
        scaleFactors: { gold: 1.07, xp: 1.06, lootChance: 1.04 },
        guaranteedReward: { itemId: 'molten_core', quantity: 1 }
    },

    'cavern_of_echoes': {
        name: 'Cavern of Echoes',
        tier: 'III',
        floors: 22,
        durationMinutes: 45,
        staminaCost: 60,
        levelRequirement: 15,
        enemyPool: ['echo_shade', 'crystal_guardian'],
        boss: 'spirit_wraith',
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1413124559661436978/image-removebg-preview_36.png?ex=68baca4d&is=68b978cd&hm=796aaad0d9a4184393a6a38765ce99262c633487c63589b2a9238154de2fa8c2&',
        baseRewards: {
            gold: [150, 250],
            xp: [80, 160],
            lootTable: [
                { itemId: 'echo_crystal', baseChance: 0.6, quantityRange: [1, 3] },
                { itemId: 'iron_ore', baseChance: 0.5, quantityRange: [2, 4] },
                { itemId: 'moonpetal_herb', baseChance: 0.4, quantityRange: [1, 2] },
                { itemId: 'spirit_dust', baseChance: 0.1, quantityRange: [1, 1] }
            ],
            eggTable: [
                { itemId: 'mystic_egg', chance: 0.21 },
                { itemId: 'undead_egg', chance: 0.13 }
            ]
        },
        scaleFactors: { gold: 1.07, xp: 1.06, lootChance: 1.03 },
        guaranteedReward: { itemId: 'echo_core', quantity: 1 }
    },

    'frozen_peak': {
        name: 'Frozen Peak',
        tier: 'III',
        floors: 30,
        durationMinutes: 50,
        staminaCost: 70,
        levelRequirement: 18,
        enemyPool: ['frost_wolf', 'ice_golem'],
        boss: 'frozen_wyvern',
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1413124560580120636/image-removebg-preview_37.png?ex=68baca4d&is=68b978cd&hm=50c80360fc5ac9c05e8efb736756c77268fd293f54e37f83296bd5e08f5f4b91&',
        baseRewards: {
            gold: [180, 280],
            xp: [120, 250],
            lootTable: [
                { itemId: 'ice_crystal', baseChance: 0.65, quantityRange: [1, 2] },
                { itemId: 'frost_shard', baseChance: 0.35, quantityRange: [1, 1] }
            ],
            eggTable: [
                { itemId: 'elemental_egg', chance: 0.13 },
                { itemId: 'beast_egg', chance: 0.132 }
            ]
        },
        scaleFactors: { gold: 1.07, xp: 1.06, lootChance: 1.03 },
        guaranteedReward: { itemId: 'frost_core', quantity: 1 }
    },

    'stormy_cliffs': {
        name: 'Stormy Cliffs',
        tier: 'IV',
        floors: 32,
        durationMinutes: 40,
        staminaCost: 60,
        levelRequirement: 20,
        enemyPool: ['storm_harpy', 'thunder_giant'],
        boss: 'tempest_dragon',
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1413124561536417813/image-removebg-preview_38.png?ex=68baca4e&is=68b978ce&hm=f4ce53c83ee540bcc6c44fbf1919b73da93e74b699a020d585da773f290f41b4&',
        baseRewards: {
            gold: [200, 300],
            xp: [150, 300],
            lootTable: [
                { itemId: 'storm_fragment', baseChance: 0.6, quantityRange: [1, 2] },
                { itemId: 'thunder_shard', baseChance: 0.25, quantityRange: [1, 1] },
                { itemId: 'dragon_scale', baseChance: 0.1, quantityRange: [1, 1] }
            ],
            eggTable: [
                { itemId: 'mechanical_egg', chance: 0.084 },
                { itemId: 'elemental_egg', chance: 0.063 },
                { itemId: 'mystic_egg', chance: 0.05 },
                { itemId: 'aeonic_egg', chance: 0.02 }
            ]
        },
        scaleFactors: { gold: 1.08, xp: 1.07, lootChance: 1.04 },
        guaranteedReward: { itemId: 'storm_core', quantity: 1 }
    },

    'volcanic_abyss': {
        name: 'Volcanic Abyss',
        tier: 'IV',
        floors: 35,
        durationMinutes: 60,
        staminaCost: 80,
        levelRequirement: 25,
        enemyPool: ['obsidian_beast', 'ash_phoenix'],
        boss: 'volcano_lord',
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1413124562736119839/image-removebg-preview_39.png?ex=68baca4e&is=68b978ce&hm=9c99589cad9c32fb8b24b7e1f25ac73429a86b9556adc3bce0e4caf7b6b7e74e&',
        baseRewards: {
            gold: [220, 320],
            xp: [150, 300],
            lootTable: [
                { itemId: 'molten_core', baseChance: 0.5, quantityRange: [1, 2] },
                { itemId: 'obsidian_fragment', baseChance: 0.6, quantityRange: [2, 5] },
                { itemId: 'crystal_shard', baseChance: 0.4, quantityRange: [2, 4] },
                { itemId: 'fire_bloom', baseChance: 0.1, quantityRange: [1, 1] }
            ],
            eggTable: [
                { itemId: 'beast_egg', chance: 0.12 },
                { itemId: 'elemental_egg', chance: 0.10 },
                { itemId: 'undead_egg', chance: 0.064 },
                { itemId: 'mystic_egg', chance: 0.004 },
                { itemId: 'abyssal_egg', chance: 0.025 }
            ]
        },
        scaleFactors: { gold: 1.08, xp: 1.07, lootChance: 1.04 },
        guaranteedReward: { itemId: 'volcanic_core', quantity: 1 }
    }
};