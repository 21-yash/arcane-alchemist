module.exports = {
    'voter_luck': {
        name: 'Voter\'s Luck',
        type: 'voter_luck',
        rarity: 'Rare',
        description: 'A small token given to those who vote in the community. It hums with a faint energy that attracts Pals.',
        source: 'voting',
        effects: { type: 'pal_lure', duration: 12 * 60 * 60 * 1000, strength: 1.1 },
        usable: false
    },
    // --- MISC (Crafting) ---
    'whispering_charm': {
        name: 'Whispering Charm',
        type: 'essence',
        rarity: 'Rare',
        description: 'A beautifully carved wooden charm that emits a faint, alluring sound only Pals can hear.',
        source: 'crafting',
        effects: { type: 'pal_lure', duration: 30 * 60 * 1000, strength: 1.25 },
        usable: true
    },
    'starlight_infusion': {
        name: 'Starlight Infusion',
        type: 'essence',
        rarity: 'Rare',
        description: 'A potent liquid that shimmers with celestial light. Its otherworldly scent is irresistible to magical and rare Pals.',
        source: 'crafting',
        effects: { type: 'rare_pal_lure', duration: 15 * 60 * 1000, strength: 1.5 },
        usable: true
    },
    'primal_call_charm': {
        name: 'Primal Call Charm',
        type: 'essence',
        rarity: 'Legendary',
        description: 'A Dragonbone Charm pulsating with raw power. Using it sends out a powerful call that only the strongest Pals will answer.',
        source: 'crafting',
        effects: { type: 'legendary_pal_lure', duration: 15 * 60 * 1000, strength: 3.0 },
        usable: true
    },

    // --- HATCHER (Crafting) ---
    'alchemical_incubator': {
        name: 'Alchemical Incubator',
        type: 'hatcher',
        rarity: 'Rare',
        description: 'A magical device that provides the perfect environment for hatching mysterious eggs.',
        source: 'crafting'
    },
    'breeding_pen': {
        name: 'Breeding Pen',
        type: 'hatcher', // Can reuse this type or create a new 'structure' type
        rarity: 'Epic',
        description: 'A comfortable, enchanted pen that encourages two Pals to produce an egg.',
        source: 'crafting'
    },
    // --- INGREDIENTS (Foraging) ---
    'moonpetal_herb': {
        name: 'Moonpetal Herb',
        type: 'ingredient',
        rarity: 'Common',
        description: 'A common herb that glows faintly under the moonlight.',
        source: 'foraging'
    },
    'crystal_shard': {
        name: 'Crystal Shard',
        type: 'ingredient',
        rarity: 'Common',
        description: 'A fragment of a common cave crystal.',
        source: 'foraging'
    },
    'sun_kissed_fern': {
        name: 'Sun-Kissed Fern',
        type: 'ingredient',
        rarity: 'Rare',
        description: 'A rare fern that seems to absorb sunlight.',
        source: 'foraging'
    },
    'silver_leaf': {
        name: 'Silver leaf',
        type: 'ingredient',
        rarity: 'Uncommon',
        description: 'Silvery leaves with potent restorative essence.',
        source: 'foraging'
    },
    'ember_moss': {
        name: 'Ember Moss',
        type: 'ingredient',
        rarity: 'Uncommon',
        description: 'A fiery moss that grows near lava flows, faintly warm to touch.',
        source: 'foraging'
    },
    'frost_lily': {
        name: 'Frost Lily',
        type: 'ingredient',
        rarity: 'Rare',
        description: 'A delicate flower found in frozen caverns. Said to never wilt.',
        source: 'foraging'
    },
    'storm_essence': {
        name: 'Storm Essence',
        type: 'ingredient',
        rarity: 'Rare',
        description: 'Concentrated energy from a thunderstorm, crackling with power.',
        source: 'foraging'
    },
    'wind_crystal': {
        name: 'Wind Crystal',
        type: 'crafting_material',
        rarity: 'Uncommon',
        description: 'A translucent crystal that seems to hold swirling air within.',
        source: 'foraging'
    },
    'feathered_plume': {
        name: 'Feathered Plume',
        type: 'crafting_material',
        rarity: 'Uncommon',
        description: 'A pristine feather from a sky-dwelling creature, light as air.',
        source: 'foraging'
    },
    'celestial_fragment': {
        name: 'Celestial Fragment',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'A shard of starlight made solid, pulsing with divine energy.',
        source: 'foraging'
    },
    'scrap_metal': {
        name: 'Scrap Metal',
        type: 'crafting_material',
        rarity: 'Common',
        description: 'Rusty but still usable metal scraps from ancient machinery.',
        source: 'foraging'
    },
    'gear_component': {
        name: 'Gear Component',
        type: 'crafting_material',
        rarity: 'Uncommon',
        description: 'A precisely crafted mechanical part, still in working condition.',
        source: 'foraging'
    },
    'oil_essence': {
        name: 'Oil Essence',
        type: 'ingredient',
        rarity: 'Uncommon',
        description: 'A viscous liquid that keeps ancient machines running smoothly.',
        source: 'foraging'
    },
    'mechanical_core': {
        name: 'Mechanical Core',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'The heart of a complex automaton, still humming with energy.',
        source: 'foraging'
    },
    'shadow_essence': {
        name: 'Shadow Essence',
        type: 'ingredient',
        rarity: 'Epic',
        description: 'Pure darkness given form, cold and weightless to the touch.',
        source: 'foraging'
    },
    'soul_fragment': {
        name: 'Soul Fragment',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'A piece of a lost soul, shimmering with otherworldly light.',
        source: 'foraging'
    },
    'void_crystal': {
        name: 'Void Crystal',
        type: 'crafting_material',
        rarity: 'Rare',
        description: 'A crystal that seems to absorb light, creating an aura of emptiness.',
        source: 'foraging'
    },
    'nightmare_orb': {
        name: 'Nightmare Orb',
        type: 'crafting_material',
        rarity: 'Legendary',
        description: 'A sphere of crystallized terror, dangerous to even look upon.',
        source: 'foraging'
    },
    'fire_bloom': {
        name: 'Fire Bloom',
        type: 'ingredient',
        rarity: 'Legendary',
        description: 'A flower that thrives in extreme heat, its petals are made of cool flame.',
        source: 'dungeon'
    },
    'spirit_dust': {
        name: 'Spirit Dust',
        type: 'ingredient',
        rarity: 'Epic',
        description: 'The shimmering remains of a benevolent spirit, perfect for enchanting.',
        source: 'dungeon'
    },
    // --- POTIONS (Brewing) ---
    'minor_healing_potion': {
        name: 'Minor Healing Potion',
        type: 'potion',
        rarity: 'Common',
        description: 'A simple brew that restores 50 HP to a familiar.',
        source: 'brewing',
        effect: { type: 'heal', value: 50 },
        usable: true
    },
    'greater_healing_potion': {
        name: 'Greater Healing Potion',
        type: 'potion',
        rarity: 'Rare',
        description: 'A powerful potion that restores 200 HP.',
        source: 'brewing',
        effect: { type: 'heal', value: 200 },
        usable: true
    },
    'elixir_of_strength': {
        name: 'Elixir of Strength',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'Temporarily boosts a familiar\'s ATK by 10 for one dungeon.',
        source: 'brewing',
        effect: { type: 'stat_boost', stats: { atk: 10 }, duration: '1_dungeon' },
        usable: false
    },
    'mana_draught': {
        name: 'Mana Draught',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'A concentrated tonic that sharpens reactions for a short time.',
        source: 'brewing',
        effect: { type: 'stat_boost', stats: { spd: 5 }, duration: '1_battle' },
        usable: false
    },

    'elixir_of_focus': {
        name: 'Elixir of Focus',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'Sharpens a familiar\'s senses, boosting accuracy and crit chance.',
        source: 'brewing',
        effect: { type: 'stat_boost', stats: { crit: 15 }, duration: '1_dungeon' },
        usable: false
    },
    'shadow_draught': {
        name: 'Shadow Draught',
        type: 'potion',
        rarity: 'Epic',
        description: 'A forbidden potion that lets your familiar strike from the shadows.',
        source: 'brewing',
        effect: { type: 'special', ability: 'shadow_strike', duration: '1_dungeon' },
        usable: false
    },
    'storm_elixir': {
        name: 'Storm Elixir',
        type: 'potion',
        rarity: 'Rare',
        description: 'Channels the power of thunder, dramatically boosting speed and critical chance.',
        source: 'brewing',
        effect: { type: 'multi_boost', stats: { spd: 15, crit: 20 }, duration: '1_dungeon' },
        usable: false
    },
    'void_tonic': {
        name: 'Void Tonic',
        type: 'potion',
        rarity: 'Epic',
        description: 'A dangerous brew that grants the ability to phase through attacks.',
        source: 'brewing',
        effect: { type: 'special', ability: 'phase_dodge', chance: 0.25, duration: '1_dungeon' },
        usable: false
    },
    'celestial_elixir': {
        name: 'Celestial Elixir',
        type: 'potion',
        rarity: 'Legendary',
        description: 'A divine potion that temporarily grants heavenly protection and power.',
        source: 'brewing',
        effect: { type: 'multi_boost', stats: { hp: 100, atk: 25, def: 25, luck: 15 }, duration: '1_dungeon' },
        usable: false
    },
    'level_potion': {
        name: 'Level Potion',
        type: 'potion',
        rarity: 'common',
        description: 'Mysterious drink which grants sudden level increase by 1',
        source: 'brewing',
        effect: { type: 'level_up', value: 1 },
        usable: true
    },
    'ice_resistance_potion': {
        name: 'Ice Resistance Potion',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'A chilling brew that protects against frost and ice attacks.',
        source: 'brewing',
        effect: { type: 'resistance', element: 'ice', value: 50, duration: '1_dungeon' },
        usable: false
    },
    'fire_resistance_draught': {
        name: 'Fire Resistance Draught',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'A cooling potion that shields the drinker from fire and heat.',
        source: 'brewing',
        effect: { type: 'resistance', element: 'fire', value: 50, duration: '1_dungeon' },
        usable: false
    },
    'berserker_elixir': {
        name: 'Berserker Elixir',
        type: 'potion',
        rarity: 'Rare',
        description: 'A dangerous potion that trades defense for overwhelming attack power.',
        source: 'brewing',
        effect: { type: 'trade_boost', gain: { atk: 30 }, lose: { def: 15 }, duration: '1_dungeon' },
        usable: false
    },
    'spirit_communion_brew': {
        name: 'Spirit Communion Brew',
        type: 'potion',
        rarity: 'Epic',
        description: 'Allows the drinker to commune with spirits, gaining supernatural insight.',
        source: 'brewing',
        effect: { type: 'special', ability: 'see_hidden', bonus_luck: 25, duration: '1_dungeon' },
        usable: false
    },
    'mechanical_oil': {
        name: 'Mechanical Oil',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'A specialized lubricant that enhances the performance of mechanical familiars.',
        source: 'brewing',
        effect: { type: 'familiar_type_boost', target: 'mechanical', stats: { spd: 15, accuracy: 10 }, duration: '1_dungeon' },
        usable: false
    },
    'nightmare_draught': {
        name: 'Nightmare Draught',
        type: 'potion',
        rarity: 'Legendary',
        description: 'A terrifying concoction that grants the ability to inflict fear upon enemies.',
        source: 'brewing',
        effect: { type: 'special', ability: 'fear_strike', chance: 0.30, duration: '1_dungeon' },
        usable: false
    },
    'essence_fusion_elixir': {
        name: 'Essence Fusion Elixir',
        type: 'potion',
        rarity: 'Epic',
        description: 'A complex brew that temporarily combines multiple elemental powers.',
        source: 'brewing',
        effect: { type: 'multi_element', elements: ['fire', 'ice', 'storm'], damage_boost: 20, duration: '1_dungeon' },
        usable: false
    },
    'crystal_clarity_potion': {
        name: 'Crystal Clarity Potion',
        type: 'potion',
        rarity: 'Rare',
        description: 'A clear potion that sharpens perception and reveals weaknesses.',
        source: 'brewing',
        effect: { type: 'special', ability: 'weakness_detection', crit_bonus: 25, duration: '1_battle' },
        usable: false
    },

    // --- EQUIPMENT (Crafting/Drops) ---
    'wooden_sword': {
        name: 'Wooden Sword',
        type: 'equipment',
        rarity: 'Common',
        slot: 'weapon',
        description: 'A simple but effective wooden sword.',
        source: 'crafting',
        stats: { atk: 5 }
    },
    'leather_helmet': {
        name: 'Leather Helmet',
        type: 'equipment',
        rarity: 'Common',
        slot: 'head',
        description: 'Basic protection for your familiar.',
        source: 'crafting',
        stats: { def: 3 }
    },
    'iron_sword': {
        name: 'Iron Sword',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'weapon',
        description: 'A sturdy blade forged from iron ore.',
        source: 'crafting',
        stats: { atk: 18 }
    },
    'bronze_sword': {
        name: 'Bronze Sword',
        type: 'equipment',
        rarity: 'Uncommon',
        slot: 'weapon',
        description: 'A balanced blade alloyed with alchemical bronze.',
        source: 'crafting',
        stats: { atk: 12 }
    },
    'enchanted_charm': {
        name: 'Enchanted Charm',
        type: 'equipment',
        rarity: 'uncommon',
        slot: 'accessory',
        description: 'A charm humming with stored energy from a mana draught.',
        source: 'crafting',
        stats: { luck: 10, spd: 2 }
    },
    'glowing_amulet': {
        name: 'Glowing Amulet',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'accessory',
        description: 'A warm light radiates from within, emboldening its bearer.',
        source: 'crafting',
        stats: { hp: 50, atk: 5 }
    },
    'guardian_shield': {
        name: 'Guardian Shield',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'offhand',
        description: 'A polished shield that glows faintly when blocking attacks.',
        source: 'crafting',
        stats: { def: 20, hp: 50 }
    },
    'phoenix_crown': {
        name: 'Phoenix Crown',
        type: 'equipment',
        rarity: 'Legendary',
        slot: 'head',
        description: 'A mythical crown said to revive its wearer once per dungeon.',
        source: 'crafting',
        stats: { hp: 100, atk: 20, special: 'revive_once' }
    },
    'stormcaller_staff': {
        name: 'Stormcaller Staff',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A staff that crackles with lightning, calling storms to aid its wielder.',
        source: 'crafting',
        stats: { atk: 30, spd: 10, special: 'lightning_strike' }
    },
    'celestial_crown': {
        name: 'Celestial Crown',
        type: 'equipment',
        rarity: 'Legendary',
        slot: 'head',
        description: 'A crown of pure starlight that blesses its wearer with divine favor.',
        source: 'crafting',
        stats: { hp: 75, atk: 15, def: 15, luck: 20 }
    },
    'void_cloak': {
        name: 'Void Cloak',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'chest',
        description: 'A cloak woven from shadow essence, allowing its wearer to blend with darkness.',
        source: 'crafting',
        stats: { def: 20, spd: 15, special: 'shadow_blend' }
    },
    'storm_boots': {
        name: 'Storm Boots',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'boots',
        description: 'Boots that allow the wearer to move with the speed of wind.',
        source: 'crafting',
        stats: { spd: 25, dodge: 5 }
    },
    'ember_blade': {
        name: 'Ember Blade',
        type: 'equipment',
        rarity: 'Uncommon',
        slot: 'weapon',
        description: 'A sword infused with ember moss, its blade glows with warm orange light.',
        source: 'crafting',
        stats: { atk: 14, special: 'burn_chance' } //fire_damage: 5,
    },
    'frost_spear': {
        name: 'Frost Spear',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'weapon',
        description: 'A crystalline spear that never loses its deadly chill.',
        source: 'crafting',
        stats: { atk: 16, special: 'frost_pierce' } //ice_damage: 8, 
    },
    'shadow_dagger': {
        name: 'Shadow Dagger',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A blade forged from pure shadow essence, strikes from unexpected angles.',
        source: 'crafting',
        stats: { atk: 22, crit: 25, special: 'shadow_strike' }
    },
    'crystal_mace': {
        name: 'Crystal Mace',
        type: 'equipment',
        rarity: 'Uncommon',
        slot: 'weapon',
        description: 'A heavy mace embedded with resonating crystal shards.',
        source: 'crafting',
        stats: { atk: 15, def: 5, special: 'crystal_shatter' }
    },
    'wind_bow': {
        name: 'Wind Bow',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'weapon',
        description: 'A bow crafted from wind crystals, arrows fly with supernatural speed.',
        source: 'crafting',
        stats: { atk: 18, spd: 8, accuracy: 15, special: 'wind_shot' }
    },
    'soul_scythe': {
        name: 'Soul Scythe',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A terrifying weapon that can cut through both flesh and spirit.',
        source: 'crafting',
        stats: { atk: 26, crit: 15, special: 'soul_harvest' }
    },
    'mechanical_hammer': {
        name: 'Mechanical Hammer',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'weapon',
        description: 'A precision-engineered war hammer with hydraulic enhancement.',
        source: 'crafting',
        stats: { atk: 20, accuracy: 12, special: 'crushing_blow' }
    },
    'void_whip': {
        name: 'Void Whip',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A weapon that seems to bend reality around its strikes.',
        source: 'crafting',
        stats: { atk: 19, spd: 12, special: 'void_lash' }
    },
    'ancient_war_axe': {
        name: 'Ancient War Axe',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'weapon',
        description: 'A massive axe from a bygone era, still sharp after centuries.',
        source: 'crafting',
        stats: { atk: 24, crit: 10, special: 'ancient_fury' }
    },
    'obsidian_katana': {
        name: 'Obsidian Katana',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A masterwork blade of volcanic glass, perfectly balanced and deadly sharp.',
        source: 'crafting',
        stats: { atk: 28, crit: 20, accuracy: 10, special: 'volcanic_edge' }
    },
    'storm_trident': {
        name: 'Storm Trident',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A three-pronged weapon that channels the power of thunder and lightning.',
        source: 'crafting',
        stats: { atk: 25, spd: 15, special: 'lightning_fork' }
    },
    'nightmare_cleaver': {
        name: 'Nightmare Cleaver',
        type: 'equipment',
        rarity: 'Legendary',
        slot: 'weapon',
        description: 'A massive blade that radiates terror, forged from crystallized nightmares.',
        source: 'crafting',
        stats: { atk: 35, crit: 25, special: 'terror_strike' }
    },
    'celestial_lance': {
        name: 'Celestial Lance',
        type: 'equipment',
        rarity: 'Legendary',
        slot: 'weapon',
        description: 'A divine spear that shines with starlight, blessed by celestial beings.',
        source: 'crafting',
        stats: { atk: 32, accuracy: 20, luck: 15, special: 'divine_thrust' }
    },
    'spirit_staff': {
        name: 'Spirit Staff',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'weapon',
        description: 'A staff that allows communion with spirits, enhancing magical abilities.',
        source: 'crafting',
        stats: { atk: 17, luck: 18, special: 'spirit_channel' }
    },
    'molten_flail': {
        name: 'Molten Flail',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A chain weapon with a molten core head that burns everything it touches.',
        source: 'crafting',
        stats: { atk: 23, special: 'molten_chain', fire_damage: 12 } //
    },
    'frost_circlet': {
        name: 'Frost Circlet',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'head',
        description: 'A delicate crown of crystallized ice that never melts, granting clarity of thought.',
        source: 'crafting',
        stats: { hp: 40, def: 12, spd: 8 }
    },
    'ember_helm': {
        name: 'Ember Helm',
        type: 'equipment',
        rarity: 'Uncommon',
        slot: 'head',
        description: 'A helmet lined with warm ember moss, providing comfort in cold environments.',
        source: 'crafting',
        stats: { hp: 35, fire_resist: 20, def: 15 } // 
    },
    'echo_diadem': {
        name: 'Echo Diadem',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'head',
        description: 'A crown that amplifies the wearer\'s mental abilities through resonant crystals.',
        source: 'crafting',
        stats: { hp: 60, def: 10, luck: 15, special: 'echo_sight' }
    },

    // CHEST SLOT
    'beast_hide_vest': {
        name: 'Beast Hide Vest',
        type: 'equipment',
        rarity: 'Common',
        slot: 'chest',
        description: 'A sturdy vest crafted from tough beast hide, offering reliable protection.',
        source: 'crafting',
        stats: { hp: 45, def: 18 }
    },
    'mystic_robes': {
        name: 'Mystic Robes',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'chest',
        description: 'Flowing robes woven from mystic thread, shimmering with arcane power.',
        source: 'crafting',
        stats: { hp: 55, def: 12, atk: 10, special: 'mana_regeneration' }
    },
    'obsidian_plate': {
        name: 'Obsidian Plate',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'chest',
        description: 'Heavy armor forged from volcanic glass, nearly impenetrable yet surprisingly light.',
        source: 'crafting',
        stats: { hp: 80, def: 35, spd: -5, fire_resist: 30 } //
    },

    // LEG SLOT
    'wind_walker_pants': {
        name: 'Wind Walker Pants',
        type: 'equipment',
        rarity: 'Uncommon',
        slot: 'leg',
        description: 'Light trousers enhanced with wind crystals for swift movement.',
        source: 'crafting',
        stats: { hp: 25, def: 8, spd: 15, dodge: 8 }
    },
    'frost_guard_leggings': {
        name: 'Frost Guard Leggings',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'leg',
        description: 'Protective leg armor that radiates cold, slowing nearby enemies.',
        source: 'crafting',
        stats: { hp: 40, def: 20, ice_resist: 25, special: 'frost_aura' } //
    },
    'shadow_weave_pants': {
        name: 'Shadow Weave Pants',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'leg',
        description: 'Trousers woven from pure shadow essence, allowing silent movement.',
        source: 'crafting',
        stats: { hp: 35, def: 15, spd: 20, special: 'shadow_step' }
    },

    // BOOTS SLOT (Additional)
    'crystal_treads': {
        name: 'Crystal Treads',
        type: 'equipment',
        rarity: 'Common',
        slot: 'boots',
        description: 'Simple boots with crystal shard soles for better grip and stability.',
        source: 'crafting',
        stats: { spd: 8, def: 5, stability: 10 }
    },
    'molten_walkers': {
        name: 'Molten Walkers',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'boots',
        description: 'Boots forged from molten cores, leaving trails of harmless flame.',
        source: 'crafting',
        stats: { spd: 18, def: 12, fire_resist: 20, special: 'flame_trail' } // 
    },

    // OFFHAND SLOT
    'spirit_orb': {
        name: 'Spirit Orb',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'offhand',
        description: 'A floating orb containing spirit dust, providing magical assistance in battle.',
        source: 'crafting',
        stats: { atk: 12, def: 8, luck: 12, special: 'spirit_guard' }
    },
    'mechanical_gauntlet': {
        name: 'Mechanical Gauntlet',
        type: 'equipment',
        rarity: 'Uncommon',
        slot: 'offhand',
        description: 'A single precision-crafted gauntlet that enhances grip and dexterity.',
        source: 'crafting',
        stats: { atk: 8, accuracy: 15, crit: 5 }
    },
    'void_shield': {
        name: 'Void Shield',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'offhand',
        description: 'A shield that seems to absorb light and projectiles into an endless void.',
        source: 'crafting',
        stats: { def: 25, hp: 45, special: 'void_absorption' }
    },
    'lava_buckler': {
        name: 'Lava Buckler',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'offhand',
        description: 'A small shield embedded with lava gems that burns attackers.',
        source: 'crafting',
        stats: { def: 18, fire_resist: 15, special: 'burning_counter' } // 
    },

    // ACCESSORY SLOT
    'ancient_signet': {
        name: 'Ancient Signet',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'accessory',
        description: 'A ring bearing the mark of a forgotten era, heavy with accumulated power.',
        source: 'crafting',
        stats: { luck: 18, atk: 8, special: 'ancient_wisdom' }
    },
    'feathered_brooch': {
        name: 'Feathered Brooch',
        type: 'equipment',
        rarity: 'Uncommon',
        slot: 'accessory',
        description: 'An elegant brooch adorned with sky-creature plumes, lightening the wearer\'s step.',
        source: 'crafting',
        stats: { spd: 12, dodge: 10, wind_resist: 15} // 
    },
    'soul_pendant': {
        name: 'Soul Pendant',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'accessory',
        description: 'A pendant containing soul fragments, connecting the wearer to the spirit realm.',
        source: 'crafting',
        stats: { hp: 65, atk: 15, special: 'soul_communion' }
    },
    'nightmare_choker': {
        name: 'Nightmare Choker',
        type: 'equipment',
        rarity: 'Legendary',
        slot: 'accessory',
        description: 'A terrifying necklace that radiates fear, causing enemies to hesitate.',
        source: 'crafting',
        stats: { atk: 25, crit: 20, special: 'terror_aura' }
    },

    // --- TAMING LURES (Foraging/Boss) ---
    'whispering_bloom': {
        name: 'Whispering Bloom',
        type: 'taming_lure',
        rarity: 'Epic',
        description: 'A beautiful flower said to attract gentle forest creatures.',
        source: 'foraging'
    },
    'starlight_berry': {
        name: 'Starlight Berry',
        type: 'taming_lure',
        rarity: 'Rare',
        description: 'A glowing berry that attracts magical beasts.',
        source: 'foraging'
    },
    'dragonbone_charm': {
        name: 'Dragonbone Charm',
        type: 'taming_lure',
        rarity: 'Legendary',
        description: 'A mystical charm made from dragon remains. Only the bravest familiars answer its call.',
        source: 'foraging'
    },

    // --- CRAFTING MATERIALS (Foraging/Dungeon) ---
    'iron_ore': {
        name: 'Iron Ore',
        type: 'crafting_material',
        rarity: 'Uncommon',
        description: 'A lump of raw iron, ready for the forge.',
        source: 'dungeon'
    },

    'wood_log': {
        name: 'Wood Log',
        type: 'crafting_material',
        rarity: 'Common',
        description: 'A sturdy length of timber, useful for simple weapons and tools.',
        source: 'foraging'
    },

    'beast_hide': {
        name: 'Beast Hide',
        type: 'crafting_material',
        rarity: 'Uncommon',
        description: 'Tough hide harvested from defeated beasts. Ideal for light armor.',
        source: 'dungeon_drop'
    },

    'mystic_thread': {
        name: 'Mystic Thread',
        type: 'crafting_material',
        rarity: 'Rare',
        description: 'Glowing thread spun from the webs of magical spiders.',
        source: 'dungeon'
    },
    'dragon_scale': {
        name: 'Dragon Scale',
        type: 'crafting_material',
        rarity: 'Legendary',
        description: 'A nearly indestructible scale shed from a dragon.',
        source: 'boss_drop'
    },

    // --- DUNGEON MATERIALS & CORES ---
    'ancient_coin': {
        name: 'Ancient Coin',
        type: 'crafting_material',
        rarity: 'Rare',
        description: 'An old coin from a forgotten era, humming with latent power.',
        source: 'dungeon'
    },
    'fire_essence': {
        name: 'Fire Essence',
        type: 'crafting_material',
        rarity: 'Rare',
        description: 'The pure, condensed energy of a flame.',
        source: 'dungeon'
    },
    'lava_gem': {
        name: 'Lava Gem',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'A gemstone forged in the heart of a volcano.',
        source: 'dungeon'
    },
    'molten_core': {
        name: 'Molten Core',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'The still-beating heart of a lava elemental.',
        source: 'dungeon'
    },
    'ice_crystal': {
        name: 'Ice Crystal',
        type: 'crafting_material',
        rarity: 'Rare',
        description: 'A shard of ice that never melts.',
        source: 'dungeon'
    },
    'frost_shard': {
        name: 'Frost Shard',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'A razor-sharp piece of magical ice.',
        source: 'dungeon'
    },
    'frost_core': {
        name: 'Frost Core',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'The frozen soul of an ancient ice spirit.',
        source: 'dungeon'
    },
    'storm_fragment': {
        name: 'Storm Fragment',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'A piece of a solidified thunderstorm.',
        source: 'dungeon'
    },
    'thunder_shard': {
        name: 'Thunder Shard',
        type: 'crafting_material',
        rarity: 'Legendary',
        description: 'A crystal that crackles with the raw power of lightning.',
        source: 'dungeon'
    },
    'storm_core': {
        name: 'Storm Core',
        type: 'crafting_material',
        rarity: 'Legendary',
        description: 'The eye of a captured hurricane, swirling with immense energy.',
        source: 'dungeon'
    },
    'echo_crystal': {
        name: 'Echo Crystal',
        type: 'crafting_material',
        rarity: 'Rare',
        description: 'A crystal that softly repeats any sound made near it.',
        source: 'dungeon'
    },
    'echo_core': {
        name: 'Echo Core',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'A resonating gem that amplifies magical properties.',
        source: 'dungeon'
    },
    'obsidian_fragment': {
        name: 'Obsidian Fragment',
        type: 'crafting_material',
        rarity: 'Epic',
        description: 'A shard of volcanic glass, sharp enough to cut shadows.',
        source: 'dungeon'
    },
    'volcanic_core': {
        name: 'Volcanic Core',
        type: 'crafting_material',
        rarity: 'Legendary',
        description: 'A pulsating orb of magma, containing the raw power of the earth\'s core.',
        source: 'dungeon_drop'
    },

    // --- EVENT/SHOP EXCLUSIVES (Optional from earlier list) ---
    'festival_firecracker': {
        name: 'Festival Firecracker',
        type: 'consumable',
        rarity: 'Uncommon',
        description: 'A festive item that entertains familiars and boosts morale.',
        source: 'event',
        effect: { type: 'buff', stat: 'morale', value: 20, duration: '1_dungeon' }
    },
    'guild_token': {
        name: 'Guild Token',
        type: 'currency',
        rarity: 'Rare',
        description: 'A token used to trade for special guild-only rewards.',
        source: 'shop'
    },

    // --- EGGS (Dungeon/Event Drops) ---
    // --- Common Eggs (Hatch Time: 1 Hour) ---
    'common_beast_egg': {
        name: 'Common Beast Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'A simple, sturdy egg with earthy tones. It feels warm to the touch.',
        hatchTimeMinutes: 60,
        possiblePals: ['forest_rabbit']
    },
    'common_elemental_egg': {
        name: 'Common Elemental Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'This egg is slightly warm and seems to hum with a faint inner energy.',
        hatchTimeMinutes: 60,
        possiblePals: ['flame_sprite']
    },
    'common_mystic_egg': {
        name: 'Common Mystic Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'Faint patterns like leaves and vines are visible just beneath its shell.',
        hatchTimeMinutes: 60,
        possiblePals: ['sproutling']
    },
    'common_undead_egg': {
        name: 'Common Undead Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'A strangely cold and brittle egg. You can hear a faint rattling inside.',
        hatchTimeMinutes: 60,
        possiblePals: ['skeletal_rat']
    },
    'common_mechanical_egg': {
        name: 'Common Mechanical Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'A metallic sphere covered in seams and rivets. It occasionally clicks softly.',
        hatchTimeMinutes: 60,
        possiblePals: ['gear_pup']
    },

    // --- Uncommon Eggs (Hatch Time: 4 Hours) ---
    'uncommon_beast_egg': {
        name: 'Uncommon Beast Egg',
        type: 'egg',
        rarity: 'Uncommon',
        description: 'A tough, leathery egg marked with primal patterns.',
        hatchTimeMinutes: 240,
        possiblePals: ['dire_wolf']
    },
    'uncommon_elemental_egg': {
        name: 'Uncommon Elemental Egg',
        type: 'egg',
        rarity: 'Uncommon',
        description: 'This egg shifts in color and temperature, charged with raw elemental power.',
        hatchTimeMinutes: 240,
        possiblePals: ['pyre_elemental', 'crystal_sprite']
    },
    'uncommon_mystic_egg': {
        name: 'Uncommon Mystic Egg',
        type: 'egg',
        rarity: 'Uncommon',
        description: 'It feels ancient and is covered in swirling, mystical symbols.',
        hatchTimeMinutes: 240,
        possiblePals: ['grove_guardian']
    },
    'uncommon_undead_egg': {
        name: 'Uncommon Undead Egg',
        type: 'egg',
        rarity: 'Uncommon',
        description: 'A heavy, stone-like egg that feels unnaturally cold.',
        hatchTimeMinutes: 240,
        possiblePals: ['bone_hound']
    },
    'uncommon_mechanical_egg': {
        name: 'Uncommon Mechanical Egg',
        type: 'egg',
        rarity: 'Uncommon',
        description: 'A precisely engineered ovoid of brass and copper.',
        hatchTimeMinutes: 240,
        possiblePals: ['tin_golem', 'steel_hound']
    },

    // --- Rare Eggs (Hatch Time: 8 Hours) ---
    'rare_beast_egg': {
        name: 'Rare Beast Egg',
        type: 'egg',
        rarity: 'Rare',
        description: 'This fossilized egg is as hard as rock, containing a powerful primal creature.',
        hatchTimeMinutes: 480,
        possiblePals: ['stone_boar', 'iron gryphon']
    },
    'rare_mystic_egg': {
        name: 'Rare Mystic Egg',
        type: 'egg',
        rarity: 'Rare',
        description: 'The shell is translucent, revealing a galaxy of swirling motes of light within.',
        hatchTimeMinutes: 480,
        possiblePals: ['moon_owl']
    },
    'rare_mechanical_egg': {
        name: 'Rare Mechanical Egg',
        type: 'egg',
        rarity: 'Rare',
        description: 'A massive sphere of interlocking iron plates, humming with power.',
        hatchTimeMinutes: 480,
        possiblePals: ['iron_colossus']
    },

    // --- Epic Eggs (Hatch Time: 12 Hours) ---
    'epic_elemental_egg': {
        name: 'Epic Elemental Egg',
        type: 'egg',
        rarity: 'Epic',
        description: 'Light bends around this perfectly smooth, crystalline egg.',
        hatchTimeMinutes: 720,
        possiblePals: ['prism_guardian', 'frost_serpent', 'storm_roc']
    },
    'epic_undead_egg': {
        name: 'Epic Undead Egg',
        type: 'egg',
        rarity: 'Epic',
        description: 'Bound in ethereal chains, this egg contains the soul of a mighty warrior.',
        hatchTimeMinutes: 720,
        possiblePals: ['phantom_knight']
    },

    // --- Legendary Eggs (Hatch Time: 24 Hours) ---
    'legendary_mystic_egg': {
        name: 'Legendary Mystic Egg',
        type: 'egg',
        rarity: 'Legendary',
        description: 'This egg radiates immense heat and light, like a miniature star. It promises a Pal of myth.',
        hatchTimeMinutes: 1440,
        possiblePals: ['star_phoenix', 'ancient_treant', 'celestial_kirin']
    },
    'legendary_mechanical_egg': {
        name: 'Legendary Mechanical Egg',
        type: 'egg',
        rarity: 'Legendary',
        description: 'An intricate orb of forgotten alloys and glowing gems. The pinnacle of arcane engineering.',
        hatchTimeMinutes: 1440,
        possiblePals: ['clockwork_dragon']
    },
    'legendary_undead_egg': {
        name: 'Legendary Undead Egg',
        type: 'egg',
        rarity: 'Legendary',
        description: 'A terrifying egg wrapped in shadows, pulsing with malevolent energy.',
        hatchTimeMinutes: 1440,
        possiblePals: ['shadow_wyrm']
    },
    'legendary_elemental_egg': {
        name: 'Legendary Elemental Egg',
        type: 'egg',
        rarity: 'Legendary',
        description: 'An egg that appears to hold a swirling galaxy within its translucent shell.',
        hatchTimeMinutes: 1440,
        possiblePals: ['aether_wing_drake']
    },
    'legendary_beast_egg': {
        name: 'Legendary Beast Egg',
        type: 'egg',
        rarity: 'Legendary',
        description: 'An egg glowing with the raw, slumbering power of the earth\'s core.',
        hatchTimeMinutes: 1440,
        possiblePals: ['world_render_behemoth']
    },
    // --- BREEDING EXCLUSIVE EGG ---
    'hybrid_beast_egg': {
        name: 'Hybrid Beast Egg',
        type: 'egg',
        rarity: 'Epic',
        description: 'A strange, pulsating egg that radiates both intense heat and a wild aura. Hatches in 18 hours.',
        hatchTimeMinutes: 1080, // 18 hours
        possiblePals: ['lava_hound'] 
    },    


};