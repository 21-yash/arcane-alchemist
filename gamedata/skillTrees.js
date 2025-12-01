module.exports = {
    Beast: {
        name: 'Primal Path',
        skills: {
            pack_hunter: {
                name: 'Pack Hunter',
                description: 'Increases damage. Bonus doubled when fighting alongside other Beasts',
                maxLevel: 3,
                battleType: 'any',
                effects: [
                    { level: 1, bonus: { atkMultiplier: 0.06 } },
                    { level: 2, bonus: { atkMultiplier: 0.09 } },
                    { level: 3, bonus: { atkMultiplier: 0.12, critChance: 0.1 } }
                ],
                partyBonus: true,
                prerequisites: []
            },
            blood_frenzy: {
                name: 'Blood Frenzy',
                description: 'Deal bonus damage based on missing HP. The lower your HP, the stronger you become',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { frenzyDamage: 0.5 } },
                    { level: 2, bonus: { frenzyDamage: 0.75, critChance: 0.05 } },
                    { level: 3, bonus: { frenzyDamage: 1.0, critChance: 0.1, lifeSteal: 0.1 } }
                ],
                prerequisites: ['pack_hunter']
            },
            feral_instinct: {
                name: 'Feral Instinct',
                description: 'Chance to dodge attacks and counter-attack',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { dodgeChance: 0.1 } },
                    { level: 2, bonus: { dodgeChance: 0.15, counterChance: 0.2 } },
                    { level: 3, bonus: { dodgeChance: 0.2, counterChance: 0.3 } }
                ],
                prerequisites: ['pack_hunter']
            },
            apex_predator: {
                name: 'Apex Predator',
                description: 'Ultimate Beast skill - devastating attacks against wounded enemies',
                maxLevel: 1,
                effects: [
                    { level: 1, bonus: { executeThreshold: 0.5, executeMultiplier: 2.0 } }
                ],
                prerequisites: ['blood_frenzy', 'feral_instinct']
            }
        }
    },
    
    Elemental: {
        name: 'Elemental Mastery',
        skills: {
            elemental_affinity: {
                name: 'Elemental Affinity',
                description: 'Increased atk damage',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { magicDamage: 1.1 } },
                    { level: 2, bonus: { magicDamage: 1.15, manaEfficiency: 0.9 } },
                    { level: 3, bonus: { magicDamage: 1.2, manaEfficiency: 0.8 } }
                ],
                prerequisites: []
            },
            status_mastery: {
                name: 'Status Mastery',
                description: 'Attacks have chance to inflict status effects',
                maxLevel: 4,
                effects: [
                    { level: 1, bonus: { statusChance: { burn: 0.15 } } },
                    { level: 2, bonus: { statusChance: { burn: 0.2, freeze: 0.1 } } },
                    { level: 3, bonus: { statusChance: { burn: 0.25, freeze: 0.15, shock: 0.1 } } },
                    { level: 4, bonus: { statusChance: { burn: 0.3, freeze: 0.2, shock: 0.15 } } }
                ],
                prerequisites: []
            },
            elemental_shield: {
                name: 'Elemental Shield',
                description: 'Absorbs elemental damage and reflects it back',
                maxLevel: 2,
                effects: [
                    { level: 1, bonus: { elementalAbsorb: 0.5, reflection: 0.2, shieldChance: 0.1 } },
                    { level: 2, bonus: { elementalAbsorb: 0.80, reflection: 0.3, shieldChance: 0.15 } }
                ],
                prerequisites: ['elemental_affinity']
            },
            elemental_storm: {
                name: 'Elemental Storm',
                description: 'Ultimate Elemental skill - area damage with multiple effects',
                maxLevel: 1,
                effects: [
                    { level: 1, bonus: { areaAttack: true, multiStatus: true, damage: 2.5, stormChance: 0.15 } }
                ],
                prerequisites: ['status_mastery', 'elemental_shield']
            }
        }
    },

    Mystic: {
        name: 'Arcane Wisdom',
        skills: {
            mystic_resonance: {
                name: 'Mystic Resonance',
                description: 'Each spell cast builds arcane resonance, stacking damage and unlocking devastating power',
                maxLevel: 4,
                effects: [
                    { level: 1, bonus: { resonanceStacks: 3, resonancePerStack: 0.04 } },
                    { level: 2, bonus: { resonanceStacks: 4, resonancePerStack: 0.05 } },
                    { level: 3, bonus: { resonanceStacks: 5, resonancePerStack: 0.06 } },
                    { level: 4, bonus: { resonanceStacks: 5, resonancePerStack: 0.08, maxResonanceBurst: 2.0 } }
                ],
                prerequisites: []
            },
            healing_light: {
                name: 'Healing Light',
                description: 'Regenerates HP over time and can revive from defeat',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { hpRegen: 0.03 } },
                    { level: 2, bonus: { hpRegen: 0.05, reviveChance: 0.1 } },
                    { level: 3, bonus: { hpRegen: 0.08, reviveChance: 0.15 } }
                ],
                prerequisites: []
            },
           celestial_barrier: {
                name: 'Celestial Barrier',
                description: 'Create a shield that absorbs damage. Can absorb damage taken by area attacks.',
                maxLevel: 2,
                effects: [
                    { level: 1, bonus: { barrierChance: 0.20, barrierAbsorb: 0.3 } },
                    { level: 2, bonus: { barrierChance: 0.30, barrierAbsorb: 0.5, aoeProtect: true } }
                ],
                prerequisites: ['mystic_resonance']
            },
            divine_intervention: {
                name: 'Divine Intervention',
                description: 'Ultimate Mystic skill - chance to completely negate damage and reflect harm back to attacker',
                maxLevel: 1,
                effects: [
                    { level: 1, bonus: { divineProtection: 0.20, healOnDodge: true, divineRetribution: 0.5 } }
                ],
                prerequisites: ['healing_light', 'celestial_barrier']
            }
        }
    },

    Undead: {
        name: 'Necromantic Arts',
        skills: {
            undying_will: {
                name: 'Undying Will',
                description: 'Resistance to death and status effects',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { deathResistance: 0.1, statusResistance: { poison: 0.5 } } },
                    { level: 2, bonus: { deathResistance: 0.15, statusResistance: { poison: 0.75, curse: 0.3 } } },
                    { level: 3, bonus: { deathResistance: 0.2, statusResistance: { poison: 1.0, curse: 0.5 } } }
                ],
                prerequisites: []
            },
            life_drain: {
                name: 'Life Drain',
                description: 'Heals based on damage dealt to enemies',
                maxLevel: 4,
                effects: [
                    { level: 1, bonus: { lifesteal: 0.1 } },
                    { level: 2, bonus: { lifesteal: 0.15 } },
                    { level: 3, bonus: { lifesteal: 0.2, statusInflict: { cursed: 0.1 } } },
                    { level: 4, bonus: { lifesteal: 0.25, statusInflict: { cursed: 0.2 } } }
                ],
                prerequisites: []
            },
            dark_ritual: {
                name: 'Dark Ritual',
                description: 'Sacrifices HP for increased power',
                maxLevel: 2,
                effects: [
                    { level: 1, bonus: { hpSacrifice: 0.30, powerBonus: 1.5, chance: 0.1 } },
                    { level: 2, bonus: { hpSacrifice: 0.25, powerBonus: 1.8, chance: 0.15 } }
                ],
                prerequisites: ['undying_will']
            },
            lich_transformation: {
                name: 'Lich Transformation',
                description: 'Ultimate Undead skill - temporary invulnerability and massive power',
                maxLevel: 1,
                effects: [
                    { level: 1, bonus: { invulnerability: 1, powerMultiplier: 2.5, lichChance: 0.15 } }
                ],
                prerequisites: ['life_drain', 'dark_ritual']
            }
        }
    },

    Mechanical: {
        name: 'Technological Evolution',
        skills: {
            armor_plating: {
                name: 'Armor Plating',
                description: 'Enhanced defensive capabilities',
                maxLevel: 5,
                effects: [
                    { level: 1, bonus: { defBonus: 2, damageReduction: 0.02 } },
                    { level: 2, bonus: { defBonus: 5, damageReduction: 0.04 } },
                    { level: 3, bonus: { defBonus: 8, damageReduction: 0.06 } },
                    { level: 4, bonus: { defBonus: 11, damageReduction: 0.08 } },
                    { level: 5, bonus: { defBonus: 15, damageReduction: 0.1 } }
                ],
                prerequisites: []
            },
            system_upgrade: {
                name: 'System Upgrade',
                description: 'Improved processing speed and efficiency',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { spdBonus: 5, accuracy: 1.1 } },
                    { level: 2, bonus: { spdBonus: 8, accuracy: 1.15, multiAttack: 0.1 } },
                    { level: 3, bonus: { spdBonus: 12, accuracy: 1.2, multiAttack: 0.15 } }
                ],
                prerequisites: []
            },
            perfect_machine: {
                name: 'Perfect Machine',
                description: 'Peak efficiency in all systems',
                maxLevel: 1,
                effects: [
                    { level: 1, bonus: { allStats: 1.1, immuneToStatus: true, selfRepair: 0.1 } } //1.2
                ],
                prerequisites: ['armor_plating']
            },
            energy_core: {
                name: 'Energy Core',
                description: 'Ultimate Mechanical skill - Overloads systems for massive damage bursts',
                maxLevel: 2,
                effects: [
                    { level: 1, bonus: { overloadChance: 0.1, overloadDamage: 2.0 } },
                    { level: 2, bonus: { overloadChance: 0.15, overloadDamage: 2.5, chainReaction: 0.2 } }
                ],
                prerequisites: ['system_upgrade', 'perfect_machine']
            }
        }
    },

    Abyssal: {
        name: 'Abyssal Depths',
        skills: {
            crushing_pressure: {
                name: 'Crushing Pressure',
                description: 'The abyss squeezes enemies, lowering their attack and speed.',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { enemyAtkDown: 0.05, enemySpdDown: 0.05 } },
                    { level: 2, bonus: { enemyAtkDown: 0.08, enemySpdDown: 0.08 } },
                    { level: 3, bonus: { enemyAtkDown: 0.12, enemySpdDown: 0.12 } }
                ],
                prerequisites: []
            },
            abyssal_tide: {
                name: 'Abyssal Tide',
                description: 'Unleashes dark waters, dealing damage over time to enemies.',
                maxLevel: 4,
                effects: [
                    { level: 1, bonus: { dotDamage: 0.05 } },
                    { level: 2, bonus: { dotDamage: 0.08, drownChance: 0.1 } },
                    { level: 3, bonus: { dotDamage: 0.10, drownChance: 0.15 } },
                    { level: 4, bonus: { dotDamage: 0.12, drownChance: 0.2 } }
                ],
                prerequisites: []
            },
            terror_from_below: {
                name: 'Terror From Below',
                description: 'Strikes fear into enemies, reducing their defenses.',
                maxLevel: 2,
                effects: [
                    { level: 1, bonus: { fearChance: 0.15, defReduction: 0.08 } },
                    { level: 2, bonus: { fearChance: 0.25, defReduction: 0.12, silenceChance: 0.1 } }
                ],
                prerequisites: ['crushing_pressure']
            },
            abyssal_devourer: {
                name: 'Abyssal Devourer',
                description: 'Ultimate Abyssal skill - consumes enemies with void tentacles, draining HP and spreading corruption.',
                maxLevel: 1,
                effects: [
                    { level: 1, bonus: { lifesteal: 0.25, areaDamage: 2.5, instantFear: true, abyssalChance: 0.1 } }
                ],
                prerequisites: ['abyssal_tide', 'terror_from_below']
            }
        }
    },

    Aeonic: {
        name: 'Path of the Epoch',
        skills: {
            decay: {
                name: 'Decay',
                description: 'The Pal infuses the target with temporal energy, causing their defenses to erode each turn.',
                maxLevel: 4,
                effects: [
                    { level: 1, bonus: { statusInflict: { decay: 0.20 } } }, 
                    { level: 2, bonus: { statusInflict: { decay: 0.25 } } },
                    { level: 3, bonus: { statusInflict: { decay: 0.30 } } },
                    { level: 4, bonus: { statusInflict: { decay: 0.35 }, spdBonus: 10 } }
                ],
                prerequisites: []
            },
            precognition: {
                name: 'Precognition',
                description: 'The Pal sees moments into the future, giving it a passive chance to completely evade an attack.',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { dodgeChance: 0.10 } },
                    { level: 2, bonus: { dodgeChance: 0.15, counterChance: 0.20 } },
                    { level: 3, bonus: { dodgeChance: 0.20, counterChance: 0.30 } } 
                ],
                prerequisites: []
            },
            temporal_echo: {
                name: 'Temporal Echo',
                description: 'The Pal\'s attacks have a chance to create a temporal echo, striking the enemy a second time for reduced damage.',
                maxLevel: 3,
                effects: [
                    { level: 1, bonus: { echoChance: 0.20, echoDamageMultiplier: 0.40 } }, 
                    { level: 2, bonus: { echoChance: 0.25, echoDamageMultiplier: 0.50 } }, 
                    { level: 3, bonus: { echoChance: 0.30, echoDamageMultiplier: 0.60 } }, 
                ],
                prerequisites: ['decay']
            },
            paradox_loop: {
                name: 'Paradox Loop',
                description: 'Ultimate Aeonic skill - the Pal becomes immune to damage, stores some amount of that damage, and after a short delay reflects it back to the attacker.',
                maxLevel: 1,
                effects: [
                    { level: 1, bonus: { damageImmunity: 1, recoilPercent: 0.50, paradoxChance: 0.20 } }
                ],
                prerequisites: ['precognition', 'temporal_echo']
            }
        }
    }

};