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
    // --- VOTE CRATES ---
    'common_vote_crate': {
        name: 'Common Vote Crate',
        type: 'crate',
        rarity: 'Common',
        description: 'A simple crate containing basic rewards for your support!',
        source: 'voting',
        usable: false
    },
    'uncommon_vote_crate': {
        name: 'Uncommon Vote Crate',
        type: 'crate',
        rarity: 'Uncommon',
        description: 'A refined crate with better chances for valuable items!',
        source: 'voting',
        usable: false
    },
    'rare_vote_crate': {
        name: 'Rare Vote Crate',
        type: 'crate',
        rarity: 'Rare',
        description: 'A mystical crate brimming with powerful rewards!',
        source: 'voting',
        usable: false
    },
    'legendary_vote_crate': {
        name: 'Legendary Vote Crate',
        type: 'crate',
        rarity: 'Legendary',
        description: 'An extraordinary crate containing legendary treasures!',
        source: 'voting',
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
        name: 'Silver Leaf',
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
        description: 'Temporarily boosts a familiar\'s ATK for 30 minutes',
        source: 'brewing',
        effect: { type: 'stat_boost', stats: { atk: 35 }, duration: 30 * 60 * 1000 },
        usable: true
    },
    'mana_draught': {
        name: 'Mana Draught',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'A concentrated tonic that sharpens reactions for a short time.',
        source: 'brewing',
        effect: { type: 'stat_boost', stats: { spd: 35 }, duration: 30 * 60 * 1000 },
        usable: true
    },

    'elixir_of_focus': {
        name: 'Elixir of Focus',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'Sharpens a familiar\'s senses, boosting atk and def.',
        source: 'brewing',
        effect: { type: 'multi_boost', stats: { atk: 30, def: 10 }, duration: 30 * 60 * 1000 },
        usable: true
    },
    'shadow_draught': {
        name: 'Shadow Draught',
        type: 'potion',
        rarity: 'Epic',
        description: 'A forbidden potion that lets your familiar strike from the shadows.',
        source: 'brewing',
        effect: { type: 'special', ability: 'shadow_strike', chance: 0.25, duration: 2 * 60 * 60 * 1000 },
        usable: true
    },
    'storm_elixir': {
        name: 'Storm Elixir',
        type: 'potion',
        rarity: 'Rare',
        description: 'Channels the power of thunder, dramatically boosting speed and atk.',
        source: 'brewing',
        effect: { type: 'multi_boost', stats: { spd: 55, atk: 30 }, duration: 60 * 60 * 1000 },
        usable: true
    },
    'void_tonic': {
        name: 'Void Tonic',
        type: 'potion',
        rarity: 'Epic',
        description: 'A dangerous brew that grants the ability to phase through attacks.',
        source: 'brewing',
        effect: { type: 'special', ability: 'phase_dodge', chance: 0.25, duration: 2 * 60 * 60 * 1000 },
        usable: true
    },
    'celestial_elixir': {
        name: 'Celestial Elixir',
        type: 'potion',
        rarity: 'Legendary',
        description: 'A divine potion that temporarily grants heavenly protection and power.',
        source: 'brewing',
        effect: { type: 'multi_boost', stats: { hp: 100, atk: 75, def: 55, luck: 15 }, duration: 3 * 60 * 60 * 1000 },
        usable: true
    },
    'level_potion': {
        name: 'Level Potion',
        type: 'potion',
        rarity: 'Common',
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
        effect: { type: 'resistance', element: 'ice', value: 50, duration: 30 * 60 * 1000 },
        usable: true
    },
    'fire_resistance_draught': {
        name: 'Fire Resistance Draught',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'A cooling potion that shields the drinker from fire and heat.',
        source: 'brewing',
        effect: { type: 'resistance', element: 'fire', value: 50, duration: 30 * 60 * 1000 },
        usable: true
    },
    'berserker_elixir': {
        name: 'Berserker Elixir',
        type: 'potion',
        rarity: 'Rare',
        description: 'A dangerous potion that trades defense for overwhelming attack power.',
        source: 'brewing',
        effect: { type: 'trade_boost', gain: { atk: 80 }, lose: { def: 55 }, duration: 60 * 60 * 1000 },
        usable: true
    },
    'spirit_communion_brew': {
        name: 'Spirit Communion Brew',
        type: 'potion',
        rarity: 'Epic',
        description: 'Allows the drinker to commune with spirits, gaining supernatural insight.',
        source: 'brewing',
        effect: { type: 'special', ability: 'see_hidden', bonus_luck: 25, duration: 2 * 60 * 60 * 1000 },
        usable: true
    },
    'mechanical_oil': {
        name: 'Mechanical Oil',
        type: 'potion',
        rarity: 'Uncommon',
        description: 'A specialized lubricant that enhances the performance of mechanical familiars.',
        source: 'brewing',
        effect: { type: 'familiar_type_boost', target: 'mechanical', stats: { spd: 45, def: 20 }, duration: 30 * 60 * 1000 },
        usable: true
    },
    'nightmare_draught': {
        name: 'Nightmare Draught',
        type: 'potion',
        rarity: 'Legendary',
        description: 'A terrifying concoction that grants the ability to inflict fear upon enemies.',
        source: 'brewing',
        effect: { type: 'special', ability: 'fear_strike', chance: 0.30, duration: 3 * 60 * 60 * 1000 },
        usable: true
    },
    'essence_fusion_elixir': {
        name: 'Essence Fusion Elixir',
        type: 'potion',
        rarity: 'Epic',
        description: 'A complex brew that temporarily combines multiple elemental powers.',
        source: 'brewing',
        effect: { type: 'multi_element', elements: ['fire', 'ice', 'storm'], damage_boost: 20, duration: 2 * 60 * 60 * 1000 },
        usable: false
    },
    'crystal_clarity_potion': {
        name: 'Crystal Clarity Potion',
        type: 'potion',
        rarity: 'Rare',
        description: 'A clear potion that sharpens perception and reveals weaknesses.',
        source: 'brewing',
        effect: { type: 'special', ability: 'weakness_detection', bonus_luck: 25, duration: 60 * 60 * 1000 },
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
        rarity: 'Uncommon',
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
        stats: { spd: 28, def: 3 }
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
        stats: { atk: 25, spd: 5, special: 'shadow_strike' }
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
        stats: { atk: 20, spd: 12, special: 'wind_shot' }
    },
    'soul_scythe': {
        name: 'Soul Scythe',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A terrifying weapon that can cut through both flesh and spirit.',
        source: 'crafting',
        stats: { atk: 28, spd: 3, special: 'soul_harvest' }
    },
    'mechanical_hammer': {
        name: 'Mechanical Hammer',
        type: 'equipment',
        rarity: 'Rare',
        slot: 'weapon',
        description: 'A precision-engineered war hammer with hydraulic enhancement.',
        source: 'crafting',
        stats: { atk: 22, def: 3, special: 'crushing_blow' }
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
        stats: { atk: 26, spd: 2, special: 'ancient_fury' }
    },
    'obsidian_katana': {
        name: 'Obsidian Katana',
        type: 'equipment',
        rarity: 'Epic',
        slot: 'weapon',
        description: 'A masterwork blade of volcanic glass, perfectly balanced and deadly sharp.',
        source: 'crafting',
        stats: { atk: 32, spd: 5, special: 'volcanic_edge' }
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
        stats: { atk: 40, spd: 5, special: 'terror_strike' }
    },
    'celestial_lance': {
        name: 'Celestial Lance',
        type: 'equipment',
        rarity: 'Legendary',
        slot: 'weapon',
        description: 'A divine spear that shines with starlight, blessed by celestial beings.',
        source: 'crafting',
        stats: { atk: 35, spd: 5, luck: 15, special: 'divine_thrust' }
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
        stats: { hp: 30, def: 10, spd: 18 }
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
        stats: { atk: 12, def: 5 }
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
        stats: { spd: 15, def: 3, wind_resist: 15} // 
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
        stats: { atk: 30, luck: 10, special: 'terror_aura' }
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
        effect: { type: 'buff', stats: { morale: 20 }, duration: 30 * 60 * 1000 }
    },
    'guild_token': {
        name: 'Guild Token',
        type: 'currency',
        rarity: 'Rare',
        description: 'A token used to trade for special guild-only rewards.',
        source: 'shop'
    },

    // --- EGGS (type-based) ---
    'beast_egg': {
        name: 'Beast Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'A sturdy egg covered in earthen patterns. It hums with primal life.',
        hatchTimeMinutes: 240,
        eggType: 'Beast',
        rarityWeights: { common: 0.55, uncommon: 0.25, rare: 0.15, epic: 0.04, legendary: 0.01 }
    },
    'elemental_egg': {
        name: 'Elemental Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'The shell shifts between colors, crackling faintly with elemental currents.',
        hatchTimeMinutes: 300,
        eggType: 'Elemental',
        rarityWeights: { common: 0.5, uncommon: 0.25, rare: 0.15, epic: 0.07, legendary: 0.03 }
    },
    'mystic_egg': {
        name: 'Mystic Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'Runes glow softly across the shell, whispering secrets of the arcane.',
        hatchTimeMinutes: 360,
        eggType: 'Mystic',
        rarityWeights: { common: 0.45, uncommon: 0.25, rare: 0.18, epic: 0.08, legendary: 0.04 }
    },
    'undead_egg': {
        name: 'Undead Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'Ice-cold to the touch, faint rattling echoes within the shell.',
        hatchTimeMinutes: 300,
        eggType: 'Undead',
        rarityWeights: { common: 0.5, uncommon: 0.25, rare: 0.15, epic: 0.07, legendary: 0.03 }
    },
    'mechanical_egg': {
        name: 'Mechanical Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'An intricate orb of gears and plates that occasionally clicks into motion.',
        hatchTimeMinutes: 360,
        eggType: 'Mechanical',
        rarityWeights: { common: 0.45, uncommon: 0.3, rare: 0.15, epic: 0.07, legendary: 0.03 }
    },
    'hybrid_beast_egg': {
        name: 'Hybrid Core Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'A volatile egg radiating both elemental heat and bestial fury.',
        hatchTimeMinutes: 720,
        eggType: 'Hybrid',
        rarityWeights: { common: 0.2, uncommon: 0.3, rare: 0.25, epic: 0.2, legendary: 0.05 },
        possiblePals: ['lava_hound']
    },    
    'aeonic_egg': {
        name: 'Aeonic Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'An egg suffused with temporal energy. The air shimmers around it as time bends.',
        hatchTimeMinutes: 480,
        eggType: 'Aeonic',
        rarityWeights: { common: 0.35, uncommon: 0.30, rare: 0.2, epic: 0.1, legendary: 0.05 }
    },
    'abyssal_egg': {
        name: 'Abyssal Egg',
        type: 'egg',
        rarity: 'Common',
        description: 'A dark egg leaking wisps of void energy. Staring at it for too long feels dangerous.',
        hatchTimeMinutes: 420,
        eggType: 'Abyssal',
        rarityWeights: { common: 0.3, uncommon: 0.3, rare: 0.2, epic: 0.15, legendary: 0.05 }
    },    


};