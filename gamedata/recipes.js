module.exports = {
    'recipe_whispering_charm': {
        result: { itemId: 'whispering_charm', quantity: 1 },
        ingredients: [
            { itemId: 'whispering_bloom', quantity: 1 },
            { itemId: 'crystal_shard', quantity: 3 },
            { itemId: 'wood_log', quantity: 5 }
        ],
        xp: 100,
        level: 4
    },
    'recipe_starlight_infusion': {
        result: { itemId: 'starlight_infusion', quantity: 1 },
        ingredients: [
            { itemId: 'starlight_berry', quantity: 1 },
            { itemId: 'crystal_shard', quantity: 5 },
            { itemId: 'sun_kissed_fern', quantity: 2 }
        ],
        xp: 250,
        level: 12
    },
    'recipe_primal_call_charm': {
        result: { itemId: 'primal_call_charm', quantity: 1 },
        ingredients: [
            { itemId: 'dragonbone_charm', quantity: 1 },
            { itemId: 'frost_lily', quantity: 5 },
            { itemId: 'spirit_dust', quantity: 3 } 
        ],
        xp: 1000,
        level: 15
    },

    'recipe_alchemical_incubator': {
        result: { itemId: 'alchemical_incubator', quantity: 1 },
        ingredients: [
            { itemId: 'iron_ore', quantity: 10 },
            { itemId: 'crystal_shard', quantity: 5 },
            { itemId: 'sun_kissed_fern', quantity: 1 } // Requires a rare ingredient
        ],
        xp: 100,
        level: 5
    },
    'recipe_breeding_pen': {
        result: { itemId: 'breeding_pen', quantity: 1 },
        ingredients: [
            { itemId: 'sun_kissed_fern', quantity: 5 },  // Rare forage item
            { itemId: 'mystic_thread', quantity: 10 },   // Rare dungeon material
            { itemId: 'wood_log', quantity: 15 }     // Guaranteed drop from a mid-tier dungeon
        ],
        xp: 500,
        level: 12
    },

    // --- BREWING RECIPES (Potions) ---
    'recipe_level_potion': {
        result: { itemId: 'level_potion', quantity: 1},
        ingredients: [
            { itemId: 'moonpetal_herb', quantity: 5 },
            { itemId: 'crystal_shard', quantity: 2 },
            { itemId: 'silver_leaf', quantity: 1}
        ],
        xp: 50,
        level: 2
    },
    'recipe_minor_healing': {
        result: { itemId: 'minor_healing_potion', quantity: 1 },
        ingredients: [
            { itemId: 'moonpetal_herb', quantity: 2 },
            { itemId: 'crystal_shard', quantity: 1 },
        ],
        xp: 10,
        level: 1
    },
    'recipe_elixir_strength': {
        result: { itemId: 'elixir_of_strength', quantity: 1 },
        ingredients: [
            { itemId: 'sun_kissed_fern', quantity: 2 },
            { itemId: 'iron_ore', quantity: 1 },
        ],
        xp: 25,
        level: 3
    },
    'recipe_mana_draught': {
        result: { itemId: 'mana_draught', quantity: 1 },
        ingredients: [
            { itemId: 'moonpetal_herb', quantity: 1 },
            { itemId: 'silver_leaf', quantity: 2 },
        ],
        xp: 18,
        level: 2
    },
    'recipe_greater_healing': {
        result: { itemId: 'greater_healing_potion', quantity: 1 },
        ingredients: [
            { itemId: 'frost_lily', quantity: 2 },
            { itemId: 'crystal_shard', quantity: 3 },
            { itemId: 'silver_leaf', quantity: 1 },
        ],
        xp: 45,
        level: 8
    },
    'recipe_storm_elixir': {
        result: { itemId: 'storm_elixir', quantity: 1 },
        ingredients: [
            { itemId: 'storm_essence', quantity: 2 },
            { itemId: 'wind_crystal', quantity: 1 },
            { itemId: 'moonpetal_herb', quantity: 1 },
        ],
        xp: 60,
        level: 12
    },
    'recipe_void_tonic': {
        result: { itemId: 'void_tonic', quantity: 1 },
        ingredients: [
            { itemId: 'shadow_essence', quantity: 2 },
            { itemId: 'void_crystal', quantity: 1 },
            { itemId: 'spirit_dust', quantity: 1 },
        ],
        xp: 120,
        level: 20
    },
    'recipe_celestial_elixir': {
        result: { itemId: 'celestial_elixir', quantity: 1 },
        ingredients: [
            { itemId: 'celestial_fragment', quantity: 1 },
            { itemId: 'storm_essence', quantity: 3 },
            { itemId: 'frost_lily', quantity: 2 },
            { itemId: 'fire_bloom', quantity: 1 },
        ],
        xp: 250,
        level: 30
    },

    // --- CRAFTING RECIPES (Weapons & Armor) ---
    'recipe_wooden_sword': {
        result: { itemId: 'wooden_sword', quantity: 1 },
        ingredients: [
            { itemId: 'wood_log', quantity: 5 },
            { itemId: 'crystal_shard', quantity: 1 },
        ],
        xp: 15,
        level: 2
    },
    'recipe_leather_helmet': {
        result: { itemId: 'leather_helmet', quantity: 1 },
        ingredients: [
            { itemId: 'beast_hide', quantity: 3 },
            { itemId: 'iron_ore', quantity: 1 },
        ],
        xp: 20,
        level: 3
    },
    'recipe_iron_sword': {
        result: { itemId: 'iron_sword', quantity: 1 },
        ingredients: [
            { itemId: 'iron_ore', quantity: 5 },
            { itemId: 'crystal_shard', quantity: 3 },
        ],
        xp: 55,
        level: 8
    },
    'recipe_bronze_sword': {
        result: { itemId: 'bronze_sword', quantity: 1 },
        ingredients: [
            { itemId: 'iron_ore', quantity: 2 },
            { itemId: 'ancient_coin', quantity: 2 },
            { itemId: 'crystal_shard', quantity: 2 },
        ],
        xp: 30,
        level: 4
    },
    'recipe_mechanical_gauntlets': {
        result: { itemId: 'mechanical_gauntlets', quantity: 1 },
        ingredients: [
            { itemId: 'gear_component', quantity: 4 },
            { itemId: 'scrap_metal', quantity: 8 },
            { itemId: 'oil_essence', quantity: 2 },
        ],
        xp: 65,
        level: 12
    },
    'recipe_storm_boots': {
        result: { itemId: 'storm_boots', quantity: 1 },
        ingredients: [
            { itemId: 'wind_crystal', quantity: 3 },
            { itemId: 'feathered_plume', quantity: 5 },
            { itemId: 'beast_hide', quantity: 2 },
        ],
        xp: 70,
        level: 14
    },
    'recipe_stormcaller_staff': {
        result: { itemId: 'stormcaller_staff', quantity: 1 },
        ingredients: [
            { itemId: 'storm_essence', quantity: 3 },
            { itemId: 'thunder_shard', quantity: 1 },
            { itemId: 'wind_crystal', quantity: 5 },
            { itemId: 'wood_log', quantity: 10 },
        ],
        xp: 180,
        level: 15
    },
    'recipe_void_cloak': {
        result: { itemId: 'void_cloak', quantity: 1 },
        ingredients: [
            { itemId: 'shadow_essence', quantity: 4 },
            { itemId: 'soul_fragment', quantity: 2 },
            { itemId: 'mystic_thread', quantity: 8 },
        ],
        xp: 150,
        level: 12
    },
    'recipe_celestial_crown': {
        result: { itemId: 'celestial_crown', quantity: 1 },
        ingredients: [
            { itemId: 'celestial_fragment', quantity: 2 },
            { itemId: 'dragon_scale', quantity: 1 },
            { itemId: 'ancient_coin', quantity: 10 },
            { itemId: 'storm_core', quantity: 1 },
        ],
        xp: 350,
        level: 15
    },

    // --- ENCHANTING RECIPES (Special Gear / Buffs) ---
    'recipe_enchanted_charm': {
        result: { itemId: 'enchanted_charm', quantity: 1 },
        ingredients: [
            { itemId: 'crystal_shard', quantity: 3 },
            { itemId: 'sun_kissed_fern', quantity: 1 },
            { itemId: 'mana_draught', quantity: 1 },
        ],
        xp: 50,
        level: 3
    },
    'recipe_glowing_amulet': {
        result: { itemId: 'glowing_amulet', quantity: 1 },
        ingredients: [
            { itemId: 'iron_ore', quantity: 2 },
            { itemId: 'sun_kissed_fern', quantity: 3 },
        ],
        xp: 40,
        level: 5
    },
    'recipe_guardian_shield': {
        result: { itemId: 'guardian_shield', quantity: 1 },
        ingredients: [
            { itemId: 'iron_ore', quantity: 8 },
            { itemId: 'crystal_shard', quantity: 5 },
            { itemId: 'echo_crystal', quantity: 1 },
        ],
        xp: 75,
        level: 12
    },
    'recipe_phoenix_crown': {
        result: { itemId: 'phoenix_crown', quantity: 1 },
        ingredients: [
            { itemId: 'fire_bloom', quantity: 1 },
            { itemId: 'molten_core', quantity: 1 },
            { itemId: 'dragon_scale', quantity: 2 },
            { itemId: 'volcanic_core', quantity: 1 },
        ],
        xp: 400,
        level: 12
    },

    // --- ADVANCED POTION RECIPES ---
    'recipe_elixir_focus': {
        result: { itemId: 'elixir_of_focus', quantity: 1 },
        ingredients: [
            { itemId: 'echo_crystal', quantity: 1 },
            { itemId: 'silver_leaf', quantity: 2 },
            { itemId: 'moonpetal_herb', quantity: 1 },
        ],
        xp: 75,
        level: 7
    },
    'recipe_shadow_draught': {
        result: { itemId: 'shadow_draught', quantity: 1 },
        ingredients: [
            { itemId: 'shadow_essence', quantity: 1 },
            { itemId: 'void_crystal', quantity: 1 },
            { itemId: 'spirit_dust', quantity: 1 },
            { itemId: 'ember_moss', quantity: 2 },
        ],
        xp: 100,
        level: 12
    },

    // --- SPECIAL MATERIAL CONVERSION RECIPES ---
    'recipe_mechanical_core': {
        result: { itemId: 'mechanical_core', quantity: 1 },
        ingredients: [
            { itemId: 'gear_component', quantity: 10 },
            { itemId: 'scrap_metal', quantity: 15 },
            { itemId: 'oil_essence', quantity: 5 },
            { itemId: 'iron_ore', quantity: 5 },
        ],
        xp: 80,
        level: 10
    },
    'recipe_storm_core': {
        result: { itemId: 'storm_core', quantity: 1 },
        ingredients: [
            { itemId: 'storm_fragment', quantity: 5 },
            { itemId: 'thunder_shard', quantity: 2 },
            { itemId: 'wind_crystal', quantity: 10 },
            { itemId: 'storm_essence', quantity: 8 },
        ],
        xp: 200,
        level: 12
    },
    'recipe_volcanic_core': {
        result: { itemId: 'volcanic_core', quantity: 1 },
        ingredients: [
            { itemId: 'molten_core', quantity: 3 },
            { itemId: 'lava_gem', quantity: 5 },
            { itemId: 'fire_essence', quantity: 10 },
            { itemId: 'obsidian_fragment', quantity: 8 },
        ],
        xp: 220,
        level: 15
    },
    'recipe_nightmare_orb': {
        result: { itemId: 'nightmare_orb', quantity: 1 },
        ingredients: [
            { itemId: 'soul_fragment', quantity: 10 },
            { itemId: 'shadow_essence', quantity: 15 },
            { itemId: 'void_crystal', quantity: 8 },
            { itemId: 'echo_core', quantity: 3 },
        ],
        xp: 300,
        level: 16
    },


    // === NEW CRAFTING RECIPES FOR EQUIPMENT ===

    'recipe_frost_circlet': {
        result: { itemId: 'frost_circlet', quantity: 1 },
        ingredients: [
            { itemId: 'frost_lily', quantity: 3 },
            { itemId: 'ice_crystal', quantity: 2 },
            { itemId: 'crystal_shard', quantity: 5 }
        ],
        xp: 85,
        level: 10
    },

    'recipe_ember_helm': {
        result: { itemId: 'ember_helm', quantity: 1 },
        ingredients: [
            { itemId: 'ember_moss', quantity: 8 },
            { itemId: 'beast_hide', quantity: 2 },
            { itemId: 'iron_ore', quantity: 3 }
        ],
        xp: 45,
        level: 6
    },

    'recipe_echo_diadem': {
        result: { itemId: 'echo_diadem', quantity: 1 },
        ingredients: [
            { itemId: 'echo_crystal', quantity: 3 },
            { itemId: 'echo_core', quantity: 1 },
            { itemId: 'ancient_coin', quantity: 5 }
        ],
        xp: 140,
        level: 14
    },

    'recipe_beast_hide_vest': {
        result: { itemId: 'beast_hide_vest', quantity: 1 },
        ingredients: [
            { itemId: 'beast_hide', quantity: 4 },
            { itemId: 'mystic_thread', quantity: 2 }
        ],
        xp: 25,
        level: 3
    },

    'recipe_mystic_robes': {
        result: { itemId: 'mystic_robes', quantity: 1 },
        ingredients: [
            { itemId: 'mystic_thread', quantity: 8 },
            { itemId: 'spirit_dust', quantity: 2 },
            { itemId: 'crystal_shard', quantity: 4 }
        ],
        xp: 90,
        level: 11
    },

    'recipe_obsidian_plate': {
        result: { itemId: 'obsidian_plate', quantity: 1 },
        ingredients: [
            { itemId: 'obsidian_fragment', quantity: 6 },
            { itemId: 'volcanic_core', quantity: 1 },
            { itemId: 'fire_essence', quantity: 3 }
        ],
        xp: 180,
        level: 16
    },

    'recipe_wind_walker_pants': {
        result: { itemId: 'wind_walker_pants', quantity: 1 },
        ingredients: [
            { itemId: 'wind_crystal', quantity: 4 },
            { itemId: 'feathered_plume', quantity: 6 },
            { itemId: 'beast_hide', quantity: 1 }
        ],
        xp: 55,
        level: 8
    },

    'recipe_frost_guard_leggings': {
        result: { itemId: 'frost_guard_leggings', quantity: 1 },
        ingredients: [
            { itemId: 'frost_shard', quantity: 3 },
            { itemId: 'frost_core', quantity: 1 },
            { itemId: 'beast_hide', quantity: 2 }
        ],
        xp: 95,
        level: 12
    },

    'recipe_shadow_weave_pants': {
        result: { itemId: 'shadow_weave_pants', quantity: 1 },
        ingredients: [
            { itemId: 'shadow_essence', quantity: 5 },
            { itemId: 'soul_fragment', quantity: 1 },
            { itemId: 'mystic_thread', quantity: 4 }
        ],
        xp: 125,
        level: 15
    },

    'recipe_crystal_treads': {
        result: { itemId: 'crystal_treads', quantity: 1 },
        ingredients: [
            { itemId: 'crystal_shard', quantity: 8 },
            { itemId: 'beast_hide', quantity: 1 },
            { itemId: 'wood_log', quantity: 2 }
        ],
        xp: 20,
        level: 2
    },

    'recipe_molten_walkers': {
        result: { itemId: 'molten_walkers', quantity: 1 },
        ingredients: [
            { itemId: 'molten_core', quantity: 2 },
            { itemId: 'lava_gem', quantity: 3 },
            { itemId: 'obsidian_fragment', quantity: 4 }
        ],
        xp: 150,
        level: 14
    },

    'recipe_spirit_orb': {
        result: { itemId: 'spirit_orb', quantity: 1 },
        ingredients: [
            { itemId: 'spirit_dust', quantity: 4 },
            { itemId: 'soul_fragment', quantity: 1 },
            { itemId: 'crystal_shard', quantity: 6 }
        ],
        xp: 80,
        level: 9
    },

    'recipe_mechanical_gauntlet': {
        result: { itemId: 'mechanical_gauntlet', quantity: 1 },
        ingredients: [
            { itemId: 'gear_component', quantity: 3 },
            { itemId: 'scrap_metal', quantity: 5 },
            { itemId: 'oil_essence', quantity: 1 }
        ],
        xp: 40,
        level: 5
    },

    'recipe_void_shield': {
        result: { itemId: 'void_shield', quantity: 1 },
        ingredients: [
            { itemId: 'void_crystal', quantity: 3 },
            { itemId: 'nightmare_orb', quantity: 1 },
            { itemId: 'iron_ore', quantity: 4 }
        ],
        xp: 200,
        level: 18
    },

    'recipe_lava_buckler': {
        result: { itemId: 'lava_buckler', quantity: 1 },
        ingredients: [
            { itemId: 'lava_gem', quantity: 4 },
            { itemId: 'fire_essence', quantity: 2 },
            { itemId: 'iron_ore', quantity: 3 }
        ],
        xp: 75,
        level: 10
    },

    'recipe_ancient_signet': {
        result: { itemId: 'ancient_signet', quantity: 1 },
        ingredients: [
            { itemId: 'ancient_coin', quantity: 8 },
            { itemId: 'crystal_shard', quantity: 3 },
            { itemId: 'iron_ore', quantity: 1 }
        ],
        xp: 60,
        level: 8
    },

    'recipe_feathered_brooch': {
        result: { itemId: 'feathered_brooch', quantity: 1 },
        ingredients: [
            { itemId: 'feathered_plume', quantity: 10 },
            { itemId: 'wind_crystal', quantity: 2 },
            { itemId: 'crystal_shard', quantity: 2 }
        ],
        xp: 35,
        level: 5
    },

    'recipe_soul_pendant': {
        result: { itemId: 'soul_pendant', quantity: 1 },
        ingredients: [
            { itemId: 'soul_fragment', quantity: 3 },
            { itemId: 'spirit_dust', quantity: 5 },
            { itemId: 'ancient_coin', quantity: 4 }
        ],
        xp: 130,
        level: 13
    },

    'recipe_nightmare_choker': {
        result: { itemId: 'nightmare_choker', quantity: 1 },
        ingredients: [
            { itemId: 'nightmare_orb', quantity: 1 },
            { itemId: 'shadow_essence', quantity: 8 },
            { itemId: 'soul_fragment', quantity: 5 },
            { itemId: 'void_crystal', quantity: 2 }
        ],
        xp: 350,
        level: 20
    },

    // === NEW POTION RECIPES ===

    'recipe_ice_resistance_potion': {
        result: { itemId: 'ice_resistance_potion', quantity: 1 },
        ingredients: [
            { itemId: 'frost_lily', quantity: 2 },
            { itemId: 'ice_crystal', quantity: 1 },
            { itemId: 'moonpetal_herb', quantity: 1 }
        ],
        xp: 35,
        level: 5
    },

    'recipe_fire_resistance_draught': {
        result: { itemId: 'fire_resistance_draught', quantity: 1 },
        ingredients: [
            { itemId: 'ember_moss', quantity: 3 },
            { itemId: 'fire_essence', quantity: 1 },
            { itemId: 'silver_leaf', quantity: 2 }
        ],
        xp: 35,
        level: 5
    },

    'recipe_berserker_elixir': {
        result: { itemId: 'berserker_elixir', quantity: 1 },
        ingredients: [
            { itemId: 'fire_bloom', quantity: 1 },
            { itemId: 'beast_hide', quantity: 1 },
            { itemId: 'iron_ore', quantity: 2 }
        ],
        xp: 85,
        level: 11
    },

    'recipe_spirit_communion_brew': {
        result: { itemId: 'spirit_communion_brew', quantity: 1 },
        ingredients: [
            { itemId: 'spirit_dust', quantity: 3 },
            { itemId: 'soul_fragment', quantity: 1 },
            { itemId: 'celestial_fragment', quantity: 1 }
        ],
        xp: 150,
        level: 16
    },

    'recipe_mechanical_oil': {
        result: { itemId: 'mechanical_oil', quantity: 1 },
        ingredients: [
            { itemId: 'oil_essence', quantity: 4 },
            { itemId: 'gear_component', quantity: 1 },
            { itemId: 'scrap_metal', quantity: 2 }
        ],
        xp: 40,
        level: 6
    },

    'recipe_nightmare_draught': {
        result: { itemId: 'nightmare_draught', quantity: 1 },
        ingredients: [
            { itemId: 'nightmare_orb', quantity: 1 },
            { itemId: 'shadow_essence', quantity: 4 },
            { itemId: 'void_crystal', quantity: 1 },
            { itemId: 'spirit_dust', quantity: 2 }
        ],
        xp: 300,
        level: 22
    },

    'recipe_essence_fusion_elixir': {
        result: { itemId: 'essence_fusion_elixir', quantity: 1 },
        ingredients: [
            { itemId: 'fire_essence', quantity: 2 },
            { itemId: 'storm_essence', quantity: 2 },
            { itemId: 'frost_core', quantity: 1 },
            { itemId: 'celestial_fragment', quantity: 1 }
        ],
        xp: 180,
        level: 17
    },

    'recipe_crystal_clarity_potion': {
        result: { itemId: 'crystal_clarity_potion', quantity: 1 },
        ingredients: [
            { itemId: 'crystal_shard', quantity: 6 },
            { itemId: 'echo_crystal', quantity: 1 },
            { itemId: 'silver_leaf', quantity: 3 }
        ],
        xp: 65,
        level: 9
    },

    // === NEW WEAPON CRAFTING RECIPES ===

    'recipe_ember_blade': {
        result: { itemId: 'ember_blade', quantity: 1 },
        ingredients: [
            { itemId: 'ember_moss', quantity: 6 },
            { itemId: 'iron_ore', quantity: 3 },
            { itemId: 'fire_essence', quantity: 1 }
        ],
        xp: 50,
        level: 7
    },

    'recipe_frost_spear': {
        result: { itemId: 'frost_spear', quantity: 1 },
        ingredients: [
            { itemId: 'frost_lily', quantity: 4 },
            { itemId: 'ice_crystal', quantity: 3 },
            { itemId: 'iron_ore', quantity: 2 },
            { itemId: 'wood_log', quantity: 3 }
        ],
        xp: 70,
        level: 9
    },

    'recipe_shadow_dagger': {
        result: { itemId: 'shadow_dagger', quantity: 1 },
        ingredients: [
            { itemId: 'shadow_essence', quantity: 4 },
            { itemId: 'void_crystal', quantity: 2 },
            { itemId: 'iron_ore', quantity: 2 }
        ],
        xp: 120,
        level: 14
    },

    'recipe_crystal_mace': {
        result: { itemId: 'crystal_mace', quantity: 1 },
        ingredients: [
            { itemId: 'crystal_shard', quantity: 10 },
            { itemId: 'echo_crystal', quantity: 2 },
            { itemId: 'iron_ore', quantity: 4 },
            { itemId: 'wood_log', quantity: 2 }
        ],
        xp: 55,
        level: 8
    },

    'recipe_wind_bow': {
        result: { itemId: 'wind_bow', quantity: 1 },
        ingredients: [
            { itemId: 'wind_crystal', quantity: 5 },
            { itemId: 'feathered_plume', quantity: 8 },
            { itemId: 'wood_log', quantity: 6 },
            { itemId: 'mystic_thread', quantity: 3 }
        ],
        xp: 75,
        level: 10
    },

    'recipe_soul_scythe': {
        result: { itemId: 'soul_scythe', quantity: 1 },
        ingredients: [
            { itemId: 'soul_fragment', quantity: 3 },
            { itemId: 'spirit_dust', quantity: 6 },
            { itemId: 'iron_ore', quantity: 5 },
            { itemId: 'nightmare_orb', quantity: 1 }
        ],
        xp: 160,
        level: 16
    },

    'recipe_mechanical_hammer': {
        result: { itemId: 'mechanical_hammer', quantity: 1 },
        ingredients: [
            { itemId: 'gear_component', quantity: 8 },
            { itemId: 'scrap_metal', quantity: 12 },
            { itemId: 'oil_essence', quantity: 4 },
            { itemId: 'iron_ore', quantity: 6 }
        ],
        xp: 85,
        level: 11
    },

    'recipe_void_whip': {
        result: { itemId: 'void_whip', quantity: 1 },
        ingredients: [
            { itemId: 'void_crystal', quantity: 4 },
            { itemId: 'shadow_essence', quantity: 3 },
            { itemId: 'mystic_thread', quantity: 8 },
            { itemId: 'beast_hide', quantity: 2 }
        ],
        xp: 110,
        level: 13
    },

    'recipe_ancient_war_axe': {
        result: { itemId: 'ancient_war_axe', quantity: 1 },
        ingredients: [
            { itemId: 'ancient_coin', quantity: 12 },
            { itemId: 'iron_ore', quantity: 8 },
            { itemId: 'dragon_scale', quantity: 1 },
            { itemId: 'wood_log', quantity: 4 }
        ],
        xp: 95,
        level: 12
    },

    'recipe_obsidian_katana': {
        result: { itemId: 'obsidian_katana', quantity: 1 },
        ingredients: [
            { itemId: 'obsidian_fragment', quantity: 8 },
            { itemId: 'volcanic_core', quantity: 1 },
            { itemId: 'fire_essence', quantity: 4 },
            { itemId: 'ancient_coin', quantity: 6 }
        ],
        xp: 180,
        level: 17
    },

    'recipe_storm_trident': {
        result: { itemId: 'storm_trident', quantity: 1 },
        ingredients: [
            { itemId: 'storm_fragment', quantity: 4 },
            { itemId: 'thunder_shard', quantity: 2 },
            { itemId: 'storm_essence', quantity: 5 },
            { itemId: 'iron_ore', quantity: 6 }
        ],
        xp: 150,
        level: 15
    },

    'recipe_nightmare_cleaver': {
        result: { itemId: 'nightmare_cleaver', quantity: 1 },
        ingredients: [
            { itemId: 'nightmare_orb', quantity: 2 },
            { itemId: 'shadow_essence', quantity: 10 },
            { itemId: 'soul_fragment', quantity: 6 },
            { itemId: 'obsidian_fragment', quantity: 4 },
            { itemId: 'dragon_scale', quantity: 1 }
        ],
        xp: 400,
        level: 22
    },

    'recipe_celestial_lance': {
        result: { itemId: 'celestial_lance', quantity: 1 },
        ingredients: [
            { itemId: 'celestial_fragment', quantity: 3 },
            { itemId: 'storm_core', quantity: 1 },
            { itemId: 'dragon_scale', quantity: 2 },
            { itemId: 'ancient_coin', quantity: 15 },
            { itemId: 'fire_bloom', quantity: 1 }
        ],
        xp: 380,
        level: 20
    },

    'recipe_spirit_staff': {
        result: { itemId: 'spirit_staff', quantity: 1 },
        ingredients: [
            { itemId: 'spirit_dust', quantity: 8 },
            { itemId: 'soul_fragment', quantity: 2 },
            { itemId: 'echo_crystal', quantity: 3 },
            { itemId: 'wood_log', quantity: 5 }
        ],
        xp: 80,
        level: 10
    },

    'recipe_molten_flail': {
        result: { itemId: 'molten_flail', quantity: 1 },
        ingredients: [
            { itemId: 'molten_core', quantity: 3 },
            { itemId: 'lava_gem', quantity: 4 },
            { itemId: 'iron_ore', quantity: 8 },
            { itemId: 'mystic_thread', quantity: 6 }
        ],
        xp: 140,
        level: 14
    },

};