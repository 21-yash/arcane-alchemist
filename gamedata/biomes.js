module.exports = {

    'whispering_forest': {
        name: 'Whispering Forest',
        description: 'A dense, ancient forest where common herbs and beasts are plentiful.',
        staminaCost: 10,
        levelRequirement: 1,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809421070930091/image-removebg-preview_30.png?ex=68b9a4ce&is=68b8534e&hm=87ed15044f5950449bb115328b0f9a6dfd479d11ffcfab7e9491f0b89b3f88a9&',
        lootTable: [
            { itemId: 'moonpetal_herb', chance: 0.70, quantityRange: [1, 3] },
            { itemId: 'wood_log', chance: 0.50, quantityRange: [1, 2] },
            { itemId: 'beast_hide', chance: 0.20, quantityRange: [1, 1] },
            { itemId: 'sun_kissed_fern', chance: 0.05, quantityRange: [1, 1] },
            { itemId: 'whispering_bloom', chance: 0.01, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'moon_owl', chance: 0.04},
            { palId: 'dire_wolf', chance: 0.08},
            { palId: 'grove_guardian', chance: 0.08},
            { palId: 'sproutling', chance: 0.12},
            { palId: 'forest_rabbit', chance: 0.12},
        ]
    },

    'glimmering_caves': {
        name: 'Glimmering Caves',
        description: 'A network of underground caves filled with glowing crystals and valuable ores.',
        levelRequirement: 5,
        staminaCost: 10,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809421746344017/image-removebg-preview_31.png?ex=68b9a4ce&is=68b8534e&hm=9adbe13a47916b722edd73eb7b379d2d124e7afe52f2b0b123d43a6c0716f644&',
        lootTable: [
            { itemId: 'crystal_shard', chance: 0.75, quantityRange: [2, 4] },
            { itemId: 'iron_ore', chance: 0.40, quantityRange: [1, 3] },
            { itemId: 'silver_leaf', chance: 0.15, quantityRange: [1, 2] },
            { itemId: 'starlight_berry', chance: 0.05, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'world_render_behemoth', chance: 0.004 },
            { palId: 'prism_guardian', chance: 0.02},
            { palId: 'tin_golem', chance: 0.08},
            { palId: 'crystal_sprite', chance: 0.08},
            { palId: 'gear_pup', chance: 0.12},
            { palId: 'skeletal_rat', chance: 0.12},
        ]
    },

    'sunken_swamp': {
        name: 'Sunken Swamp',
        description: 'A murky, dangerous swamp where potent and mysterious ingredients grow.',
        levelRequirement: 12,
        staminaCost: 20,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809419137482925/image-removebg-preview_27.png?ex=68b9a4ce&is=68b8534e&hm=6a2cb5b99a5e15cfeccb3cc41e9cfe6211a5d4dd11e5113c70143aafd4a9b024&',
        lootTable: [
            { itemId: 'moonpetal_herb', chance: 0.70, quantityRange: [2, 4] },
            { itemId: 'spirit_dust', chance: 0.20, quantityRange: [1, 2] },
            { itemId: 'echo_crystal', chance: 0.08, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'phantom_knight', chance: 0.02},
            { palId: 'stone_boar', chance: 0.04},
            { palId: 'shellback_turtle', chance: 0.08},
            { palId: 'bone_hound', chance: 0.08}
        ]
    },

    'iron_foundry': {
        name: 'Iron Foundry',
        description: 'Abandoned mechanical workshops filled with rusted gears and ancient automatons.',
        levelRequirement: 15,
        staminaCost: 15,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809422400520343/image-removebg-preview_32.png?ex=68b9a4cf&is=68b8534f&hm=ef677445aaec3942b3de4027d82b5bde50d6de035f82bdc7fef3557cb219135e&',        
        lootTable: [
            { itemId: 'scrap_metal', chance: 0.60, quantityRange: [2, 4] },
            { itemId: 'gear_component', chance: 0.35, quantityRange: [1, 3] },
            { itemId: 'oil_essence', chance: 0.20, quantityRange: [1, 2] },
            { itemId: 'mechanical_core', chance: 0.02, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'clockwork_dragon', chance: 0.005},
            { palId: 'iron_colossus', chance: 0.04},
            { palId: 'steel_hound', chance: 0.08},
            { palId: 'gear_pup', chance: 0.12},
            { palId: 'tin_golem', chance: 0.12},  
        ]
    },

    'volcanic_peaks': {
        name: 'Volcanic Peaks',
        description: 'A treacherous mountain range flowing with magma and home to fire-resistant flora.',
        levelRequirement: 20,
        staminaCost: 20,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809420366287000/image-removebg-preview_29.png?ex=68b9a4ce&is=68b8534e&hm=3080fcb3ec03f383093d3e787ef49d0bd95c6c49b74e3a37785e483972486dc6&',
        lootTable: [
            { itemId: 'ember_moss', chance: 0.50, quantityRange: [1, 3] },
            { itemId: 'obsidian_fragment', chance: 0.25, quantityRange: [1, 2] },
            { itemId: 'fire_essence', chance: 0.10, quantityRange: [1, 1] },
            { itemId: 'fire_bloom', chance: 0.02, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'star_phoenix', chance: 0.005},
            { palId: 'pyre_elemental', chance: 0.08},
            { palId: 'flame_sprite', chance: 0.12},
        ]
    },

    'frozen_forest': {
        name: 'Frozen Forest',
        description: 'A dense, cold forest, where only the hardiest ingredients can survive.',
        levelRequirement: 25,
        staminaCost: 20,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809419733078047/image-removebg-preview_28.png?ex=68b9a4ce&is=68b8534e&hm=a0b60a1531b265ce3c8dda6182ea9fb24de3b6ba46a999d0252d4ab838ba88b8&',
        lootTable: [
            { itemId: 'frost_lily', chance: 0.40, quantityRange: [1, 2] },
            { itemId: 'ice_crystal', chance: 0.20, quantityRange: [1, 3] },
            { itemId: 'frost_shard', chance: 0.07, quantityRange: [1, 1] },
            { itemId: 'dragonbone_charm', chance: 0.01, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'ancient_treant', chance: 0.005},
            { palId: 'frost_serpent', chance: 0.02},
        ]
    },

    'sky_citadel': {
        name: 'Sky Citadel',
        description: 'Ancient floating ruins high above the clouds, where storm winds carry rare treasures.',
        levelRequirement: 30,
        staminaCost: 25,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809418726445230/image-removebg-preview_26.png?ex=68b9a4ce&is=68b8534e&hm=94a7829bde280040ff1d3c90f73be56423fb95f2a9386c0ae74a05721661a604&',
        lootTable: [
            { itemId: 'storm_essence', chance: 0.35, quantityRange: [1, 2] },
            { itemId: 'wind_crystal', chance: 0.25, quantityRange: [1, 3] },
            { itemId: 'feathered_plume', chance: 0.15, quantityRange: [1, 2] },
            { itemId: 'celestial_fragment', chance: 0.03, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'celestial_kirin', chance: 0.005},
            { palId: 'prism_guardian', chance: 0.02}, 
            { palId: 'storm_roc', chance: 0.03},
            { palId: 'iron_gryphon', chance: 0.04},
            { palId: 'crystal_sprite', chance: 0.08},
        ]
    },

    'shadow_realm': {
        name: 'Shadow Realm',
        description: 'A dark dimension where the boundary between life and death grows thin.',
        levelRequirement: 35,
        staminaCost: 30,
        pic: 'https://cdn.discordapp.com/attachments/920231858204200961/1412809418172661892/image-removebg-preview_25.png?ex=68b9a4ce&is=68b8534e&hm=6ff9de1d17fd42ef9266e3cb70b52ca5c8cd4a6bd1922116954ef9413403f465&',
        lootTable: [
            { itemId: 'shadow_essence', chance: 0.40, quantityRange: [1, 2] },
            { itemId: 'soul_fragment', chance: 0.25, quantityRange: [1, 1] },
            { itemId: 'void_crystal', chance: 0.15, quantityRange: [1, 2] },
            { itemId: 'nightmare_orb', chance: 0.01, quantityRange: [1, 1] },
        ],
        possiblePals: [
            { palId: 'shadow_wyrm', chance: 0.004},
            { palId: 'aether_wing_drake', chance: 0.005},
            { palId: 'phantom_knight', chance: 0.02},
            { palId: 'bone_hound', chance: 0.08},
            { palId: 'skeletal_rat', chance: 0.12}, 
        ]
    }

};

/*
RARITY ENCOUNTER RATES:
- Common: 12% base chance
- Uncommon: 8% base chance  
- Rare: 4% base chance
- Epic: 2% base chance
- Legendary: 0.5% base chance

BIOME DISTRIBUTION:
- Whispering Forest: Forest/nature pets (Forest Rabbit, Sproutling, Dire Wolf, Grove Guardian, Moon Owl)
- Glimmering Caves: Underground/crystal/mechanical pets (Gear Pup, Skeletal Rat, Tin Golem, Crystal Sprite, Steel Hound, Bone Hound, Prism Guardian)
- Sunken Swamp: Swamp/defensive pets (Shellback Turtle, Stone Boar, Phantom Knight)
- Volcanic Peaks: Fire/phoenix pets (Flame Sprite, Pyre Elemental, Star Phoenix)
- Frozen Forest: Ice/ancient pets (Frost Serpent, Ancient Treant)
- Sky Citadel: Flying/storm/celestial pets (Iron Gryphon, Storm Roc, Celestial Kirin)
- Iron Foundry: Large mechanical pets (Iron Colossus, Clockwork Dragon)
- Shadow Realm: Dark/undead legendary pets (Shadow Wyrm)
*/