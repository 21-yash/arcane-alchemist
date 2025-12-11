const allMonsters = require("../gamedata/monsters");
const { StatusEffectManager, STATUS_EFFECTS } = require("./statusEffects");
const allItems = require("../gamedata/items");
const allSkillTrees = require("../gamedata/skillTrees");
const SkillTree = require("../models/SkillTree");
const allPals = require("../gamedata/pets");
const config = require('../config/config');
const Y = config.emojis

/**
 * Combat System Configuration
 */
const COMBAT_CONFIG = {
    BASE_HIT_CHANCE: 0.9,
    MIN_HIT_CHANCE: 0.05,
    MAX_HIT_CHANCE: 0.99,
    MIN_DAMAGE: 1,
    MAX_TURNS: 50,
    CRIT_MULTIPLIER: 1.5,
    MAX_CRIT_CHANCE: 0.3,
    PACK_LEADER_BONUS: 0.15,
    MAX_PACK_BONUS: 0.5,
    AREA_DAMAGE_MULTIPLIER: 0.3,
};

/**
 * Combat Logger class for better battle logging
 */
class CombatLogger {
    constructor() {
        this.logs = [];
    }

    add(message) {
        if (typeof message === 'string' && message.trim()) {
            this.logs.push(message.trim());
        }
    }

    addMultiple(messages) {
        if (Array.isArray(messages)) {
            messages.forEach(msg => this.add(msg));
        }
    }

    clear() {
        this.logs = [];
    }

    getLog() {
        return this.logs.join('\n');
    }
}

/**
 * Safe stat operations with validation
 */
class StatManager {
    static validateStats(stats) {
        const defaultStats = { hp: 20, atk: 10, def: 5, spd: 10, luck: 0 };
        
        if (!stats || typeof stats !== 'object') {
            return { ...defaultStats };
        }

        return {
            hp: Math.max(1, Number(stats.hp) || defaultStats.hp),
            atk: Math.max(1, Number(stats.atk) || defaultStats.atk),
            def: Math.max(0, Number(stats.def) || defaultStats.def),
            spd: Math.max(1, Number(stats.spd) || defaultStats.spd),
            luck: Math.max(0, Number(stats.luck) || defaultStats.luck),
            accuracy: Math.max(0.1, Number(stats.accuracy) || 1),
            evasion: Math.max(0.1, Number(stats.evasion) || 1),
        };
    }

    static cloneCreature(creature) {
        if (!creature) throw new Error('Creature is required');
        
        try {
            const cloned = JSON.parse(JSON.stringify(creature));
            cloned.stats = this.validateStats(cloned.stats);
            cloned.statusEffects = cloned.statusEffects || [];
            cloned.skillBonuses = cloned.skillBonuses || {};
            // Ensure potionEffects is preserved
            cloned.potionEffects = cloned.potionEffects || [];
            return cloned;
        } catch (error) {
            throw new Error(`Failed to clone creature: ${error.message}`);
        }
    }
}

/**
 * Equipment manager with better error handling
 */
class EquipmentManager {
    static getEffects(equipment) {
        const effects = {};
        
        if (!equipment || typeof equipment !== 'object') {
            return effects;
        }

        try {
            Object.values(equipment).forEach(equipmentId => {
                if (!equipmentId || !allItems[equipmentId]) return;

                const item = allItems[equipmentId];
                
                // Special abilities
                if (item.special) effects[item.special] = true;
                if (item.stats?.special) effects[item.stats.special] = true;
                
                // Resistances
                const resistanceMap = {
                    fire_resist: 'fire_resistance',
                    ice_resist: 'ice_resistance', 
                    storm_resist: 'storm_resistance',
                    wind_resist: 'wind_resistance',
                    physical_resist: 'physical_resistance'
                };
                
                Object.entries(resistanceMap).forEach(([itemProp, effectProp]) => {
                    if (item[itemProp]) effects[effectProp] = item[itemProp];
                });
                
                // Damage bonuses
                ['fire_damage', 'ice_damage', 'storm_damage'].forEach(prop => {
                    if (item[prop]) effects[prop] = item[prop];
                });
                
                // Combat bonuses
                const bonusMap = {
                    dodge: 'dodge_bonus',
                    crit: 'crit_bonus', 
                    accuracy: 'accuracy_bonus'
                };
                
                Object.entries(bonusMap).forEach(([itemProp, effectProp]) => {
                    const value = item[itemProp] || item.stats?.[itemProp];
                    if (value) effects[effectProp] = value;
                });
            });
        } catch (error) {
            console.error('Error processing equipment effects:', error);
        }
        
        return effects;
    }

    static getResistances(equipment) {
        const resistances = { fire: 0, ice: 0, storm: 0, physical: 0 };
        
        if (!equipment) return resistances;

        try {
            Object.values(equipment).forEach(itemId => {
                if (!itemId || !allItems[itemId]) return;

                const item = allItems[itemId];
                if (item.fire_resist) resistances.fire += Number(item.fire_resist) || 0;
                if (item.ice_resist) resistances.ice += Number(item.ice_resist) || 0;
                if (item.storm_resist) resistances.storm += Number(item.storm_resist) || 0;
                if (item.wind_resist) resistances.storm += Number(item.wind_resist) || 0;
                if (item.physical_resist) resistances.physical += Number(item.physical_resist) || 0;
            });
        } catch (error) {
            console.error('Error calculating resistances:', error);
        }

        return resistances;
    }

    static getMultiplier(equipment, statType) {
        let multiplier = 1;
        
        if (!equipment) return multiplier;

        try {
            Object.values(equipment).forEach(itemId => {
                if (!itemId || !allItems[itemId]) return;

                const item = allItems[itemId];
                const statMap = {
                    accuracy: ['accuracyMultiplier', 'accuracy'],
                    evasion: ['evasionMultiplier', 'evasion']
                };
                
                if (statMap[statType]) {
                    statMap[statType].forEach(prop => {
                        const value = item.stats?.[prop] || item[prop];
                        if (value && !isNaN(value)) {
                            multiplier *= Number(value);
                        }
                    });
                }
            });
        } catch (error) {
            console.error(`Error calculating ${statType} multiplier:`, error);
        }
        
        return Math.max(0.1, multiplier);
    }
}

/**
 * Type advantage calculator
 */
class TypeAdvantage {
    static ADVANTAGES = {
        Beast:      { strong: ["Mystic", "Undead"],         weak: ["Mechanical", "Aeonic"] },
        Mystic:     { strong: ["Undead", "Abyssal"],        weak: ["Beast", "Elemental"] },
        Undead:     { strong: ["Abyssal", "Elemental"],     weak: ["Mystic", "Beast"] },
        Abyssal:    { strong: ["Elemental", "Mechanical"],  weak: ["Undead", "Mystic"] },
        Mechanical: { strong: ["Aeonic", "Beast"],          weak: ["Elemental", "Abyssal"] },
        Elemental:  { strong: ["Mystic", "Mechanical"],     weak: ["Abyssal", "Undead"] },
        Aeonic:     { strong: ["Beast", "Mystic"],          weak: ["Mechanical", "Elemental"] }
    };

    static calculate(attackerType, defenderType) {
        if (!attackerType || !defenderType) return 1;

        const advantages = this.ADVANTAGES[attackerType];
        if (!advantages) return 1;

        if (advantages.strong?.includes(defenderType)) return 1.5;
        if (advantages.weak?.includes(defenderType)) return 0.75;
        return 1;
    }
}

/**
 * Skill Tree Manager
 */
class SkillManager {
    static async ensureSkillTree(pet) {
        if (!pet?.petId) throw new Error('Pet with petId is required');

        try {
            let skillTree = await SkillTree.findOne({ palId: pet.petId });
            if (!skillTree) {
                skillTree = new SkillTree({
                    palId: pet.petId,
                    skillPoints: Math.floor(pet.level / 5),
                });
                await skillTree.save();
            }
            return skillTree;
        } catch (error) {
            console.error('Error ensuring skill tree:', error);
            throw error;
        }
    }

    static async applySkillBonuses(creature, skillTree = null, battleType = 'dungeon', context = {}) {
        if (!creature) throw new Error('Creature is required');

        let modifiedCreature = StatManager.cloneCreature(creature);
        
        const palData = allPals[creature.basePetId];
        const baseStats = palData?.baseStats || {};
        
        modifiedCreature.stats = StatManager.validateStats({
            ...baseStats,
            ...modifiedCreature.stats
        });

        if (!skillTree?.unlockedSkills?.length) {
            return modifiedCreature;
        }

        try {
            const typeSkills = allSkillTrees[creature.type]?.skills || {};

            for (let i = 0; i < skillTree.unlockedSkills.length; i++) {
                const unlockedSkill = skillTree.unlockedSkills[i];
                
                if (!unlockedSkill.skillId || !unlockedSkill.level) continue;

                const skillData = typeSkills[unlockedSkill.skillId];
                if (!skillData?.effects?.[unlockedSkill.level - 1]) continue;

                if (skillData.battleType && skillData.battleType !== battleType) {
                    continue;
                }

                if (unlockedSkill.skillId === 'pack_hunter' && battleType === 'party') {
                    const beastCount = context.beastCount || 1;
                    if (beastCount > 1) {
                        const doubledBonus = {};
                        Object.keys(bonus).forEach(key => {
                            doubledBonus[key] = bonus[key] * 2;
                        });
                        Object.assign(modifiedCreature.skillBonuses, doubledBonus);
                        continue;
                    }
                }

                const effect = skillData.effects[unlockedSkill.level - 1];
                const bonus = effect.bonus || {};

                // Apply stat bonuses
                this.applyStatBonus(modifiedCreature.stats, 'atk', bonus.atkMultiplier, true);
                this.applyStatBonus(modifiedCreature.stats, 'def', bonus.defBonus, false);
                this.applyStatBonus(modifiedCreature.stats, 'spd', bonus.spdBonus, false);
                this.applyStatBonus(modifiedCreature.stats, 'luck', bonus.critChance ? bonus.critChance * 100 : 0, false);
                this.applyStatBonus(modifiedCreature.stats, 'luck', bonus.luckBonus, false);
                this.applyStatBonus(modifiedCreature.stats, 'accuracy', bonus.accuracy, true);

                // Apply all-stats bonus
                if (bonus.allStats && !isNaN(bonus.allStats)) {
                    ['atk', 'def', 'spd'].forEach(stat => {
                        modifiedCreature.stats[stat] = Math.floor(modifiedCreature.stats[stat] * bonus.allStats);
                    });
                }

                // Magic damage and damage reduction
                if (bonus.magicDamage && !isNaN(bonus.magicDamage)) {
                    modifiedCreature.stats.atk = Math.floor(modifiedCreature.stats.atk * bonus.magicDamage);
                }
                
                if (bonus.damageReduction && !isNaN(bonus.damageReduction)) {
                    modifiedCreature.stats.damageReduction = 
                        (modifiedCreature.stats.damageReduction || 0) + bonus.damageReduction;
                }

                // Store skill bonuses
                Object.assign(modifiedCreature.skillBonuses, bonus);
            }
        } catch (error) {
            console.error('Error applying skill bonuses:', error);
        }

        modifiedCreature.stats = StatManager.validateStats(modifiedCreature.stats);
        return modifiedCreature;
    }

    static applyStatBonus(stats, statName, bonus, isMultiplier = false) {
        if (bonus == null || isNaN(bonus)) return;

        if (isMultiplier) {
            stats[statName] = Math.floor(stats[statName] * (1 + bonus));
        } else {
            stats[statName] += bonus;
        }
    }

    static checkActivation(creature, skillType, currentHp = null, maxHp = null) {
        if (!creature?.skillBonuses) return null;

        try {
            switch (skillType) {
                case "dodge":
                    return this.checkDodgeActivation(creature);
                case "counter":
                    return this.checkCounterActivation(creature);
                case "execute":
                    return this.checkExecuteActivation(creature, currentHp, maxHp);
                case "divine_protection":
                    return this.checkDivineProtectionActivation(creature);
                case "overload":
                    return this.checkOverloadActivation(creature);
                case "dark_ritual":
                    return this.checkDarkRitualActivation(creature, currentHp, maxHp);
                case "lich_transformation":
                    return this.checkLichTransformActivation(creature);
                case "lifesteal":
                    return this.checkLifestealActivation(creature);
                case "multiAttack":
                    return this.checkMultiAttackActivation(creature);
                case "hpRegen":
                    return this.checkHpRegenActivation(creature, maxHp);
                case "celestial_barrier":
                    return this.checkCelestialBarrierActivation(creature);
                case "revive":
                    return this.checkReviveActivation(creature);
                case "chainReaction":
                    return this.checkChainReactionActivation(creature);
                case "selfRepair":
                    return this.checkSelfRepairActivation(creature, maxHp);
                case "elemental_shield":
                    return this.checkElementalShieldActivation(creature);
                case "elemental_storm":
                    return this.checkElementalStormActivation(creature);
                case "abyssal_devourer":
                    return this.checkAbyssalDevourerActivation(creature);
                case "temporal_echo":
                    return this.checkTemporalEchoActivation(creature);
                case "paradox_loop":
                    return this.checkParadoxLoopActivation(creature);
                default:
                    return null;
            }
        } catch (error) {
            console.error(`Error checking skill activation for ${skillType}:`, error);
            return null;
        }
    }

    // Existing skill checks
    static checkDodgeActivation(creature) {
        const chance = creature.skillBonuses.dodgeChance;
        if (chance && Math.random() < chance) {
            return {
                type: "dodge",
                message: `**${creature.nickname || creature.name}** dodges with feral instinct!`,
            };
        }
        return null;
    }

    static checkCounterActivation(creature) {
        const chance = creature.skillBonuses.counterChance;
        if (chance && Math.random() < chance) {
            return {
                type: "counter",
                message: `**${creature.nickname || creature.name}** counter-attacks!`,
                damage: Math.floor(creature.stats.atk * 0.7)
            };
        }
        return null;
    }

    static checkExecuteActivation(creature, currentHp, maxHp) {
        if (!currentHp || !maxHp) return null;
        
        const threshold = creature.skillBonuses.executeThreshold;
        if (threshold && (currentHp / maxHp) <= threshold) {
            return {
                type: "execute",
                multiplier: creature.skillBonuses.executeMultiplier || 2.0,
                message: `🩸 **Apex Predator!** ${creature.nickname || creature.name} delivers a devastating finishing blow!`
            };
        }
        return null;
    }

    static checkDivineProtectionActivation(creature) {
        const chance = creature.skillBonuses.divineProtection;
        if (chance && Math.random() < chance) {
            return {
                type: "divine_protection",
                retribution: creature.skillBonuses.divineRetribution || 0,
                message: `✨ **Divine Intervention!** ${creature.nickname || creature.name} is protected by divine light!`,
            };
        }
        return null;
    }

    static checkOverloadActivation(creature) {
        const chance = creature.skillBonuses.overloadChance;
        if (chance && Math.random() < chance) {
            return {
                type: "overload",
                multiplier: creature.skillBonuses.overloadDamage || 2.0,
                message: `⚡ **System Overload!** ${creature.nickname || creature.name}'s circuits surge with power!`
            };
        }
        return null;
    }

    static checkDarkRitualActivation(creature, currentHp, maxHp) {
        const hpSacrifice = creature.skillBonuses.hpSacrifice;
        const powerBonus = creature.skillBonuses.powerBonus;
        const chance = creature.skillBonuses.chance;
        
        if (hpSacrifice && powerBonus && chance && Math.random() < chance) {
            const sacrificeAmount = Math.floor(maxHp * hpSacrifice);
            if (currentHp > sacrificeAmount) {
                return {
                    type: "dark_ritual",
                    sacrifice: sacrificeAmount,
                    multiplier: powerBonus,
                    message: `🩸 **Dark Ritual!** ${creature.nickname || creature.name} sacrifices life force for power!`
                };
            }
        }
        return null;
    }

    static checkLichTransformActivation(creature) {
        const invulnerability = creature.skillBonuses.invulnerability;
        const powerMultiplier = creature.skillBonuses.powerMultiplier;
        const chance = creature.skillBonuses.lichChance;
        
        if (invulnerability && powerMultiplier && chance && Math.random() < chance) {
            return {
                type: "lich_transformation",
                duration: invulnerability,
                multiplier: powerMultiplier,
                message: `💀 **Lich Transformation!** ${creature.nickname || creature.name} transcends mortal limits!`
            };
        }
        return null;
    }

    static checkCelestialBarrierActivation(creature) {
        const chance = creature.skillBonuses.barrierChance;
        if (chance && Math.random() < chance) {
            return {
                type: "celestial_barrier",
                absorb: creature.skillBonuses.barrierAbsorb || 0.3,
                message: `🛡️ **Celestial Barrier!** ${creature.nickname || creature.name} creates a protective shield!`
            };
        }
        return null;
    }

    static checkLifestealActivation(creature) {
        const lifesteal = creature.skillBonuses.lifesteal;
        if (lifesteal) {
            return {
                type: "lifesteal",
                percentage: lifesteal,
                message: `🩸 **Life Drain!** ${creature.nickname || creature.name} absorbs life energy!`
            };
        }
        return null;
    }

    static checkMultiAttackActivation(creature) {
        const chance = creature.skillBonuses.multiAttack;
        if (chance && Math.random() < chance) {
            return {
                type: "multiAttack",
                message: `⚡ **System Enhancement!** ${creature.nickname || creature.name} attacks multiple times!`
            };
        }
        return null;
    }

    static checkHpRegenActivation(creature, maxHp) {
        const regenRate = creature.skillBonuses.hpRegen;
        if (regenRate && maxHp) {
            const healAmount = Math.floor(maxHp * regenRate);
            return {
                type: "hpRegen",
                heal: healAmount,
                message: `✨ **Healing Light!** ${creature.nickname || creature.name} regenerates ${healAmount} HP!`
            };
        }
        return null;
    }

    static checkReviveActivation(creature) {
        const chance = creature.skillBonuses.reviveChance;
        if (chance && Math.random() < chance) {
            return {
                type: "revive",
                message: `🌟 **Miraculous Revival!** ${creature.nickname || creature.name} refuses to fall!`
            };
        }
        return null;
    }

    static checkChainReactionActivation(creature) {
        const chance = creature.skillBonuses.chainReaction;
        if (chance && Math.random() < chance) {
            return {
                type: "chainReaction",
                message: `⚡ **Chain Reaction!** ${creature.nickname || creature.name}'s overload spreads!`,
                damage: Math.floor(creature.stats.atk * 0.5)
            };
        }
        return null;
    }

    static checkSelfRepairActivation(creature, maxHp) {
        const repairRate = creature.skillBonuses.selfRepair;
        if (repairRate && maxHp) {
            const repairAmount = Math.floor(maxHp * repairRate);
            return {
                type: "selfRepair",
                heal: repairAmount,
                message: `🔧 **Self Repair!** ${creature.nickname || creature.name} automatically repairs damage!`
            };
        }
        return null;
    }

    static checkElementalShieldActivation(creature) {
        const chance = creature.skillBonuses.shieldChance;
        if (chance && Math.random() < chance) {
            return {
                type: "elemental_shield",
                absorb: creature.skillBonuses.elementalAbsorb || 0.5,
                reflection: creature.skillBonuses.reflection || 0.2,
                message: `🛡️ **Elemental Shield!** ${creature.nickname || creature.name} activates an elemental shield!`
            };
        }
        return null;
    }

    static checkElementalStormActivation(creature) {
        const chance = creature.skillBonuses.stormChance;
        if (chance && Math.random() < chance) {
            return {
                type: "elemental_storm",
                multiplier: creature.skillBonuses.damage || 2.5,
                areaAttack: creature.skillBonuses.areaAttack || true,
                multiStatus: creature.skillBonuses.multiStatus || true,
                message: `🌪️ **Elemental Storm!** ${creature.nickname || creature.name} unleashes elemental fury!`
            };
        }
        return null;
    }

    static checkAbyssalDevourerActivation(creature) {
        const lifesteal = creature.skillBonuses.lifesteal;
        const areaDamage = creature.skillBonuses.areaDamage;
        const instantFear = creature.skillBonuses.instantFear;
        
        if (areaDamage && Math.random() < (creature.skillBonuses.abyssalChance || 0.1)) {
            return {
                type: "abyssal_devourer",
                lifesteal: lifesteal || 0.25,
                multiplier: areaDamage,
                instantFear: instantFear,
                message: `🌊 **Abyssal Devourer!** ${creature.nickname || creature.name} unleashes void tentacles!`
            };
        }
        return null;
    }

    static checkTemporalEchoActivation(creature) {
        const echoChance = creature.skillBonuses.echoChance;
        const echoDamageMultiplier = creature.skillBonuses.echoDamageMultiplier;
        
        if (echoChance && echoDamageMultiplier && Math.random() < echoChance) {
            return {
                type: "temporal_echo",
                multiplier: echoDamageMultiplier,
                message: `⏰ **Temporal Echo!** ${creature.nickname || creature.name}'s attack echoes through time!`
            };
        }
        return null;
    }

    static checkParadoxLoopActivation(creature) {
        const damageImmunity = creature.skillBonuses.damageImmunity;
        const paradoxChance = creature.skillBonuses.paradoxChance;
        
        if (damageImmunity && paradoxChance && Math.random() < paradoxChance) {
            return {
                type: "paradox_loop",
                immunity: true,
                recoilPercent: creature.skillBonuses.recoilPercent || 0.5,
                message: `🔮 **Paradox Loop!** ${creature.nickname || creature.name} phases out of time!`
            };
        }
        return null;
    }
}

/**
 * Hit chance calculator
 */
class HitCalculator {
    static compute(attackerStats, defenderStats, attackerEquipment = null, defenderEquipment = null) {
        try {
            const attackerAccuracy = (attackerStats.accuracy || 1) * EquipmentManager.getMultiplier(attackerEquipment, 'accuracy');
            const defenderEvasion = (defenderStats.evasion || 1) * EquipmentManager.getMultiplier(defenderEquipment, 'evasion');
            
            const hitChance = Math.min(
                COMBAT_CONFIG.MAX_HIT_CHANCE, 
                Math.max(
                    COMBAT_CONFIG.MIN_HIT_CHANCE, 
                    COMBAT_CONFIG.BASE_HIT_CHANCE * attackerAccuracy / defenderEvasion
                )
            );
            
            return { hitChance };
        } catch (error) {
            console.error('Error computing hit chance:', error);
            return { hitChance: COMBAT_CONFIG.BASE_HIT_CHANCE };
        }
    }
}

/**
 * Damage calculator with comprehensive validation
 */
class DamageCalculator {
    static calculate(attacker, defender, attackerType, defenderType, defenderResistances = {}) {
        try {
            const attackerStats = StatManager.validateStats(attacker);
            const defenderStats = StatManager.validateStats(defender);
            
            let baseDamage = Math.max(
                COMBAT_CONFIG.MIN_DAMAGE, 
                Math.floor(attackerStats.atk - defenderStats.def / 2)
            );

            const typeMultiplier = TypeAdvantage.calculate(attackerType, defenderType);
            baseDamage = Math.floor(baseDamage * typeMultiplier);

            const critChance = Math.min(
                COMBAT_CONFIG.MAX_CRIT_CHANCE, 
                (attackerStats.luck || 0) * 0.01
            );
            const isCrit = Math.random() < critChance;
            if (isCrit) {
                baseDamage = Math.floor(baseDamage * COMBAT_CONFIG.CRIT_MULTIPLIER);
            }

            let resistanceMultiplier = 1;
            if (defenderResistances && attackerType === "Elemental") {
                const totalResistance = (defenderResistances.fire || 0) + 
                                      (defenderResistances.ice || 0) + 
                                      (defenderResistances.storm || 0);
                resistanceMultiplier = Math.max(0.1, 1 - totalResistance / 100);
            }

            return {
                damage: Math.floor(baseDamage * resistanceMultiplier),
                typeMultiplier,
                isCrit,
                resistanceApplied: resistanceMultiplier < 1
            };
        } catch (error) {
            console.error('Error calculating damage:', error);
            return {
                damage: COMBAT_CONFIG.MIN_DAMAGE,
                typeMultiplier: 1,
                isCrit: false,
                resistanceApplied: false
            };
        }
    }
}

/**
 * Turn order calculator
 */
class TurnOrderManager {
    static calculate(creature1, creature2, creature1Name, creature2Name) {
        try {
            let speed1 = creature1.stats?.spd || 10;
            let speed2 = creature2.stats?.spd || 10;

            if (creature1.statusEffects) {
                const slowEffect = creature1.statusEffects.find(effect => effect.type === 'slow');
                if (slowEffect) speed1 = Math.floor(speed1 * 0.5);
            }

            if (creature2.statusEffects) {
                const slowEffect = creature2.statusEffects.find(effect => effect.type === 'slow');
                if (slowEffect) speed2 = Math.floor(speed2 * 0.5);
            }

            if (speed1 > speed2) {
                return { first: creature1, second: creature2, firstName: creature1Name, secondName: creature2Name };
            } else if (speed2 > speed1) {
                return { first: creature2, second: creature1, firstName: creature2Name, secondName: creature1Name };
            } else {
                const firstGoesFirst = Math.random() < 0.5;
                return firstGoesFirst ?
                    { first: creature1, second: creature2, firstName: creature1Name, secondName: creature2Name } :
                    { first: creature2, second: creature1, firstName: creature2Name, secondName: creature1Name };
            }
        } catch (error) {
            console.error('Error calculating turn order:', error);
            return { first: creature1, second: creature2, firstName: creature1Name, secondName: creature2Name };
        }
    }
}

/**
 * Pack leader bonus calculator
 */
class PackLeaderManager {
    static apply(creature, beastCount = 1) {
        if (creature.type !== "Beast" || beastCount <= 1) return creature;
        
        try {
            const modifiedCreature = StatManager.cloneCreature(creature);
            const bonus = Math.min(
                COMBAT_CONFIG.MAX_PACK_BONUS, 
                (beastCount - 1) * COMBAT_CONFIG.PACK_LEADER_BONUS
            );
            
            modifiedCreature.stats.atk = Math.floor(modifiedCreature.stats.atk * (1 + bonus));
            return modifiedCreature;
        } catch (error) {
            console.error('Error applying pack leader bonus:', error);
            return creature;
        }
    }
}

/**
 * Utility functions
 */
const Utils = {
    romanToInt(roman) {
        if (!roman || typeof roman !== 'string') return 1;
        
        const romanMap = { I: 1, V: 5, X: 10 };
        let total = 0;
        
        try {
            for (let i = 0; i < roman.length; i++) {
                const currentVal = romanMap[roman[i]];
                const nextVal = romanMap[roman[i + 1]];
                
                if (!currentVal) continue;
                
                if (nextVal && nextVal > currentVal) {
                    total -= currentVal;
                } else {
                    total += currentVal;
                }
            }
        } catch (error) {
            console.error('Error converting roman numeral:', error);
            return 1;
        }
        
        return total || 1;
    },

    checkSpecialAbility(ability, chance) {
        if (typeof chance !== 'number' || chance <= 0) return false;
        return Math.random() < chance;
    },

    // Extracts active abilities from the creature's potionEffects array
    extractPotionAbilities(creature) {
        if (!creature?.potionEffects || !Array.isArray(creature.potionEffects)) return {};

        const effects = {};
        
        creature.potionEffects.forEach(effect => {
            if (effect.type === "special") {
                effects.special = {
                    ability: effect.ability,
                    chance: effect.chance || 0.25,
                    duration: effect.duration,
                };
            }
            
            if (effect.type === "multi_element") {
                effects.multi_element = {
                    elements: effect.elements || [],
                    damage_boost: effect.damage_boost || 0,
                    duration: effect.duration,
                };
            }
        });

        return effects;
    },

    safeGenerateEnemy(dungeon, floor, isBoss = false) {
        try {
            if (!dungeon || !dungeon.enemyPool) {
                throw new Error('Invalid dungeon data');
            }

            const enemyId = isBoss && dungeon.boss
                ? dungeon.boss
                : dungeon.enemyPool[Math.floor(Math.random() * dungeon.enemyPool.length)];
            
            const enemyBase = allMonsters[enemyId];
            if (!enemyBase) {
                throw new Error(`Monster not found: ${enemyId}`);
            }

            const tierValue = this.romanToInt(dungeon.tier);
            const scaleFactor = 1 + 0.2 * (floor - 1) + 0.1 * tierValue;

            return {
                name: enemyBase.name,
                type: enemyBase.type,
                stats: StatManager.validateStats({
                    hp: Math.round(enemyBase.baseStats.hp * scaleFactor),
                    atk: Math.round(enemyBase.baseStats.atk * scaleFactor),
                    def: Math.round(enemyBase.baseStats.def * scaleFactor),
                    spd: Math.round(enemyBase.baseStats.spd * scaleFactor),
                }),
            };
        } catch (error) {
            console.error('Error generating enemy:', error);
            return {
                name: "Unknown Beast",
                type: "Beast",
                stats: StatManager.validateStats({ hp: 30, atk: 15, def: 8, spd: 10 }),
            };
        }
    },

    safeGenerateDungeonRewards(dungeon, floor) {
        try {
            if (!dungeon?.baseRewards) return { gold1: 0, xp1: 0, loot: [], egg: null };

            const { baseRewards, scaleFactors = {}, floors, guaranteedReward } = dungeon;
            const { gold = [0, 0], xp = [0, 0], lootTable = [], eggTable = [] } = baseRewards;

            const goldRange = Array.isArray(gold) ? gold : [0, 0];
            const xpRange = Array.isArray(xp) ? xp : [0, 0];

            const gold1 = Math.floor(
                (Math.random() * Math.max(0, goldRange[1] - goldRange[0]) + goldRange[0]) *
                Math.pow(scaleFactors.gold || 1, floor - 1)
            );

            const xp1 = Math.floor(
                (Math.random() * Math.max(0, xpRange[1] - xpRange[0]) + xpRange[0]) *
                Math.pow(scaleFactors.xp || 1, floor - 1)
            );

            const loot = lootTable
                .filter(item => item && typeof item === 'object')
                .map(item => {
                    const chance = item.baseChance * Math.pow(scaleFactors.lootChance || 1, floor - 1);
                    if (Math.random() < chance) {
                        const quantityRange = item.quantityRange || [1, 1];
                        return {
                            itemId: item.itemId,
                            quantity: Math.floor(Math.random() * (quantityRange[1] - quantityRange[0] + 1)) + quantityRange[0],
                        };
                    }
                    return null;
                })
                .filter(item => item !== null);

            const eggDrop = eggTable
                .filter(e => e && typeof e === 'object')
                .find(e => Math.random() < e.chance * Math.pow(scaleFactors.lootChance || 1, floor - 1));

            if (floor === floors && guaranteedReward) {
                loot.push(guaranteedReward);
            }

            return {
                gold1,
                xp1,
                loot,
                egg: eggDrop ? { itemId: eggDrop.itemId, quantity: 1 } : null,
            };
        } catch (error) {
            console.error('Error generating dungeon rewards:', error);
            return { gold1: 0, xp1: 0, loot: [], egg: null };
        }
    }
};

/**
 * Weapon ability processor with improved error handling
 */
class WeaponAbilityProcessor {
    static ABILITIES = {
        lightning_strike: { chance: 0.25, multiplier: 0.5, message: "Lightning Strike", icon: Y['Stormcaller Staff'] },
        lightning_fork: { chance: 0.25, multiplier: 0.5, message: "Lightning Strike", icon: Y['Storm Trident'] },
        shadow_strike: { chance: 0.25, multiplier: 1.0, message: "Shadow Strike", icon: Y['Shadow Dagger'] },
        shadow_blend: { chance: 0.25, multiplier: 1.0, message: "Shadow Strike", icon: Y['Void Cloak'] },
        volcanic_edge: { chance: 0.2, multiplier: 0.4, message: "Volcanic Edge", icon: Y['Obsidian Katana'] },
        terror_strike: { chance: 0.15, multiplier: 1.5, message: "Terror Strike", icon: Y['Nightmare Cleaver']  },
        divine_thrust: { chance: 0.3, multiplier: 0.6, message: "Divine Thrust", icon: Y['Celestial Lance'] },
        frost_pierce: { chance: 0.25, multiplier: 0.3, message: "Frost Pierce", icon: Y['Frost Spear'], statusEffect: "freeze" },
        crystal_shatter: { chance: 0.2, multiplier: 0.4, message: "Crystal Shatter", icon: Y['Crystal Mace'] },
        wind_shot: { chance: 0.3, multiplier: 0.35, message: "Wind Shot", icon: Y['Wind Bow'] },
        soul_harvest: { chance: 0.2, multiplier: 0.8, message: "Soul Harvest", icon: Y['Soul Scythe'] },
        crushing_blow: { chance: 0.25, multiplier: 0.6, message: "Crushing Blow", icon: Y['Mechanical Hammer'] },
        void_lash: { chance: 0.2, multiplier: 0.5, message: "Void Lash", icon: Y['Void Whip'] },
        ancient_fury: { chance: 0.15, multiplier: 1.2, message: "Ancient Fury", icon: Y['Ancient War Axe'] },
        molten_chain: { chance: 0.2, multiplier: 0.45, message: "Molten Chain", icon: Y['Molten Flail'], statusEffect: "burn" },
        spirit_channel: { chance: 0.25, multiplier: 0.4, message: "Spirit Channel", icon: Y['Spirit Staff'] },
        burn_chance: { chance: 0.2, multiplier: 0, message: "Burning Blade", icon: Y['Ember Blade'], statusEffect: "burn" }
    };

    static process(attacker, equipmentEffects, attackerName, logger) {
        let damage = 0;
        let activated = false;
        let statusEffects = [];

        try {
            for (const [ability, active] of Object.entries(equipmentEffects)) {
                if (!active || activated) continue;

                const abilityData = this.ABILITIES[ability];
                if (!abilityData) continue;

                if (Utils.checkSpecialAbility(ability, abilityData.chance)) {
                    if (abilityData.multiplier > 0) {
                        damage = Math.floor(attacker.atk * abilityData.multiplier);
                        activated = true;
                    }
                    
                    if (abilityData.statusEffect) {
                        statusEffects.push(abilityData.statusEffect);
                    }
                    
                    logger.add(`${abilityData.icon} **${abilityData.message}!** ${attackerName}'s weapon unleashes its power!`);
                    
                    if (activated) break;
                }
            }
        } catch (error) {
            console.error('Error processing weapon abilities:', error);
        }

        return { damage, activated, statusEffects };
    }
}

/**
 * Status effect processor with new Abyssal/Aeonic effects
 */
class StatusProcessor {
    static inflictStatus(attacker, target, attackerName, logger) {
        try {
            if (attacker.skillBonuses?.statusInflict) {
                Object.entries(attacker.skillBonuses.statusInflict).forEach(([effectName, chance]) => {
                    if (Math.random() < chance) {
                        StatusEffectManager.applyStatusEffect(target, effectName);
                        const effectDisplayName = STATUS_EFFECTS[effectName]?.name || effectName;
                        logger.add(`🌑 **${attackerName}** inflicts ${effectDisplayName}!`);
                    }
                });
            }

            if (attacker.skillBonuses?.statusChance) {
                Object.entries(attacker.skillBonuses.statusChance).forEach(([effectName, chance]) => {
                    if (Math.random() < chance) {
                        StatusEffectManager.applyStatusEffect(target, effectName);
                        const effectDisplayName = STATUS_EFFECTS[effectName]?.name || effectName;
                        const statusIcon = this.getStatusIcon(effectName);
                        logger.add(`${statusIcon} **${attackerName}** inflicts ${effectDisplayName}!`);
                    }
                });
            }

            // Handle special Abyssal effects
            if (attacker.skillBonuses?.drownChance && Math.random() < attacker.skillBonuses.drownChance) {
                StatusEffectManager.applyStatusEffect(target, 'drown');
                logger.add(`🌊 **${attackerName}** drowns the enemy in abyssal waters!`);
            }

            if (attacker.skillBonuses?.fearChance && Math.random() < attacker.skillBonuses.fearChance) {
                StatusEffectManager.applyStatusEffect(target, 'fear');
                logger.add(`😱 **Terror From Below!** ${attackerName} strikes terror into the enemy!`);
            }

            if (attacker.skillBonuses?.silenceChance && Math.random() < attacker.skillBonuses.silenceChance) {
                StatusEffectManager.applyStatusEffect(target, 'silence');
                logger.add(`🔇 **${attackerName}** silences the enemy!`);
            }
        } catch (error) {
            console.error('Error processing status infliction:', error);
        }
    }

    static getStatusIcon(effectName) {
        const iconMap = {
            burn: "🔥",
            freeze: "❄️", 
            shock: "⚡",
            poison: "💀",
            fear: "😱",
            drown: "🌊",
            silence: "🔇",
            decay: "⏳",
            slow: "🐌"
        };
        return iconMap[effectName] || "🌑";
    }

    static checkImmunity(equipment, statusType) {
        if (!equipment) return false;
        
        try {
            return Object.values(equipment).some(itemId => {
                if (!itemId || !allItems[itemId]) return false;
                
                const item = allItems[itemId];
                return item.stats?.immuneToStatus === true || 
                       item.immuneToStatus === true ||
                       (item.statusResistance && item.statusResistance[statusType] >= 1.0);
            });
        } catch (error) {
            console.error('Error checking status immunity:', error);
            return false;
        }
    }
}

/**
 * Equipment effect processors
 */
class EquipmentEffectProcessor {
    static processDefensive(defender, defenderEquipmentEffects, defenderName, damage, logger) {
        let damageReduction = 0;
        let statusEffects = [];

        try {
            const effects = {
                shadow_step: { chance: 0.15, reduction: 0.2, message: "moves like a shadow", icon: Y['Shadow Weave Pants'] },
                shadow_blend: { chance: 0.15, reduction: 0.2, message: "moves like a shadow", icon: Y['Void Cloak'] },
                spirit_guard: { chance: 0.25, reduction: 0.3, message: "'s spirit guardian provides protection", icon: Y['Spirit Orb'] },
                void_absorption: { chance: 0.2, reduction: 0.5, message: "'s void shield absorbs the attack", icon: Y['Void Shield'] },
                shield_block: { chance: 0.25, reduction: 0.2, message: "'s shield blocks some damage", icon: "🛡️" }
            };

            const counterEffects = {
                burning_counter: { chance: 0.3, status: "burn", message: "'s buckler burns the attacker", icon: Y['Lava Buckler'] },
                frost_counter: { chance: 0.25, status: "freeze", message: "'s shield freezes the attacker", icon: "❄️" },
                shock_counter: { chance: 0.2, status: "shock", message: "'s shield electrifies the attacker", icon: "⚡" }
            };

            Object.entries(defenderEquipmentEffects).forEach(([effect, value]) => {
                if (effects[effect] && Math.random() < effects[effect].chance) {
                    logger.add(`${effects[effect].icon} **${defenderName}** ${effects[effect].message}!`);
                    damageReduction += Math.floor(damage * effects[effect].reduction);
                }

                if (counterEffects[effect] && Math.random() < counterEffects[effect].chance) {
                    statusEffects.push(counterEffects[effect].status);
                    logger.add(`${counterEffects[effect].icon} **${defenderName}** ${counterEffects[effect].message}!`);
                }
            });

            if (defender.equipment?.shield && allItems[defender.equipment.shield] && Math.random() < 0.2) {
                const shieldItem = allItems[defender.equipment.shield];
                const blockAmount = Math.floor(damage * 0.15);
                damageReduction += blockAmount;
                logger.add(`🛡️ **${defenderName}**'s ${shieldItem.name} blocks ${blockAmount} damage!`);
            }
        } catch (error) {
            console.error('Error processing defensive equipment effects:', error);
        }

        return { damageReduction, statusEffects };
    }

    static processOffensive(attacker, attackerEquipmentEffects, attackerName, logger) {
        let damageModifier = 1;
        let statusEffects = [];

        try {
            const effects = {
                frost_aura: { chance: 0.2, status: "slow", message: "'s frost aura slows the enemy", icon: Y['Frost Guard Leggings'] },
                flame_trail: { chance: 0.15, status: "burn", message: " leaves a trail of flames", icon: Y['Molten Walkers'] },
                mana_regeneration: { chance: 0.1, modifier: 1.1, message: "'s robes channel magical energy", icon: Y['Mystic Robes'] },
                echo_sight: { chance: 0.2, modifier: 1.15, message: "'s diadem reveals enemy weaknesses", icon: Y['Echo Diadem'] },
                ancient_wisdom: { chance: 0.15, modifier: 1.1, message: " channels ancient knowledge", icon: Y['Ancient Signet'] },
                soul_communion: { chance: 0.2, modifier: 1.12, message: " communes with spirits for guidance", icon: Y['Soul Pendant'] },
                terror_aura: { chance: 0.25, status: "fear", message: "'s terrifying presence instills fear", icon: Y['Nightmare Choker'] }
            };

            Object.entries(attackerEquipmentEffects).forEach(([effect, value]) => {
                const effectData = effects[effect];
                if (!effectData) return;

                if (Math.random() < effectData.chance) {
                    if (effectData.status) {
                        statusEffects.push(effectData.status);
                    }
                    if (effectData.modifier) {
                        damageModifier *= effectData.modifier;
                    }
                    logger.add(`${effectData.icon} **${attackerName}** ${effectData.message}!`);
                }
            });
        } catch (error) {
            console.error('Error processing offensive equipment effects:', error);
        }

        return { damageModifier, statusEffects };
    }
}

/**
 * Main Combat Engine with Abyssal and Aeonic support
 */
class CombatEngine {
    constructor() {
        this.logger = new CombatLogger();
        this.silentLogger = {
            add: () => {},
            addMultiple: () => {}
        };
    }

    async simulateDungeonBattle(pal, enemy, potionEffects = {}, equipmentEffects = {}, 
                               startingHp = null, palType = "Beast", enemyType = "Beast", 
                               skillTree = null, battleType = "dungeon", context = {}) {
        try {
            const enhancedPal = await SkillManager.applySkillBonuses(pal, skillTree, battleType, context);
            let palCurrentHp = startingHp !== null ? startingHp : enhancedPal.stats.hp;
            let enemyCurrentHp = enemy.stats.hp;
            
            // Auto-extract potion effects if not provided but present on pal
            if (Object.keys(potionEffects).length === 0 && pal.potionEffects && pal.potionEffects.length > 0) {
                potionEffects = Utils.extractPotionAbilities(pal);
            }
            
            const palResistances = EquipmentManager.getResistances(enhancedPal.equipment);
            const enemyResistances = {};
            
            if (!enhancedPal.statusEffects) enhancedPal.statusEffects = [];
            if (!enemy.statusEffects) enemy.statusEffects = [];

            let turn = 0;
            let reviveUsed = false;
            let invulnerabilityTurns = 0;
            let palResonanceStacks = 0;
            const paradoxState = {
                active: false,
                storedDamage: 0,
                recoilPercent: 0.5,
                pendingRecoil: false
            };

            this.logger.clear();
            
            while (palCurrentHp > 0 && enemyCurrentHp > 0 && turn < COMBAT_CONFIG.MAX_TURNS) {
                turn++;
                this.logger.add(`\n\n**--- Turn ${turn} ---**`);

                // Process status effects
                const palStatusResult = StatusEffectManager.processStatusEffects(
                    { ...enhancedPal, currentHp: palCurrentHp, maxHp: enhancedPal.stats.hp },
                    []
                );
                palCurrentHp = palStatusResult.creature.currentHp;
                enhancedPal.statusEffects = palStatusResult.creature.statusEffects;
                // Store modified stats for damage calculations
                const palModifiedStats = palStatusResult.creature.stats;
                this.logger.addMultiple(palStatusResult.battleLog);

                const enemyStatusResult = StatusEffectManager.processStatusEffects(
                    { ...enemy, currentHp: enemyCurrentHp, maxHp: enemy.stats.hp },
                    []
                );
                enemyCurrentHp = enemyStatusResult.creature.currentHp;
                enemy.statusEffects = enemyStatusResult.creature.statusEffects;
                // Store modified stats for damage calculations
                const enemyModifiedStats = enemyStatusResult.creature.stats;
                this.logger.addMultiple(enemyStatusResult.battleLog);

                // Handle paradox loop reflection damage from previous turn
                if (paradoxState.pendingRecoil) {
                    if (paradoxState.storedDamage > 0) {
                        this.logger.add(`⏰ **Temporal Reflection!** The attack reverses through time!`);
                        this.logger.add(`💫 **${enemy.name}** takes ${paradoxState.storedDamage} reflected damage!`);
                        enemyCurrentHp = Math.max(0, enemyCurrentHp - paradoxState.storedDamage);
                        
                        if (enemyCurrentHp <= 0) {
                            this.logger.add(`💀 The **${enemy.name}** has been defeated by temporal paradox!`);
                            break;
                        }
                    }
                    paradoxState.storedDamage = 0;
                    paradoxState.pendingRecoil = false;
                }

                const palCanAct = palStatusResult.canAct !== false;
                const enemyCanAct = enemyStatusResult.canAct !== false;

                // Pal's turn
                if (palCanAct && enemyCurrentHp > 0) {

                    if (enhancedPal.skillBonuses?.resonanceStacks) {
                        enhancedPal.resonanceStack = palResonanceStacks;
                    }

                    const attackResult = this.executeAttack(
                        { ...enhancedPal, stats: palModifiedStats, currentHp: palCurrentHp }, 
                        { ...enemy, stats: enemyModifiedStats, currentHp: enemyCurrentHp }, 
                        palType, enemyType, 
                        equipmentEffects, potionEffects, enemyResistances,
                        pal.nickname || pal.name, enemy.name,
                        null, 
                        {}    // options
                    );

                    if (attackResult.resonanceStacks !== undefined) {
                        palResonanceStacks = attackResult.resonanceStacks;
                    }
                    
                    enemyCurrentHp = Math.max(0, enemyCurrentHp - attackResult.damage);
                    if (attackResult.hpSacrificed) {
                        palCurrentHp = Math.max(1, palCurrentHp - attackResult.hpSacrificed);
                    }
                    if (attackResult.lichActivated) {
                        invulnerabilityTurns = 1;
                        this.logger.add(`💀 **${pal.nickname || pal.name}** transcends mortality - invulnerable for 1 turn!`);
                    }
                    
                    // Apply reflected damage from elemental shield
                    if (attackResult.reflectedDamage > 0) {
                        palCurrentHp = Math.max(0, palCurrentHp - attackResult.reflectedDamage);
                        this.logger.add(`⚡ **${pal.nickname || pal.name} takes ${attackResult.reflectedDamage} reflected damage!**`);
                    }
                    
                    // Handle Abyssal Devourer fear application
                    if (attackResult.applyFear) {
                        StatusEffectManager.applyStatusEffect(enemy, 'fear');
                        this.logger.add(`😱 **${enemy.name}** is struck with primal terror!`);
                    }
                    
                    if (attackResult.lifesteal > 0) {
                        palCurrentHp = Math.min(enhancedPal.stats.hp, palCurrentHp + attackResult.lifesteal);
                    }

                    if (enemyCurrentHp <= 0) {
                        this.logger.add(`💀 The **${enemy.name}** has been defeated!`);
                        break;
                    }
                    this.logger.add(`> *${enemy.name} HP: ${enemyCurrentHp}/${enemy.stats.hp}*`);
                }

                // Enemy's turn
                if (enemyCanAct && enemyCurrentHp > 0 && palCurrentHp > 0) {
                    // Check for paradox loop activation
                    const paradoxCheck = (!paradoxState.active && !paradoxState.pendingRecoil)
                        ? SkillManager.checkActivation(enhancedPal, "paradox_loop")
                        : null;
                    if (paradoxCheck?.type === "paradox_loop") {
                        this.logger.add(paradoxCheck.message);
                        paradoxState.active = true;
                        paradoxState.recoilPercent = paradoxCheck.recoilPercent || 0.5;
                        paradoxState.storedDamage = 0;
                    }

                    if (invulnerabilityTurns > 0 || paradoxState.active) {
                        const paradoxTriggered = paradoxState.active;
                        const immunityMessage = paradoxTriggered ? 
                            `🔮 **${pal.nickname || pal.name}** exists outside of time - attacks pass through harmlessly!` :
                            `🛡️ **${pal.nickname || pal.name}** is invulnerable to damage!`;
                        this.logger.add(immunityMessage);
                        
                        // Store damage for paradox recoil
                        if (paradoxTriggered) {
                            const simulatedAttack = this.simulateEnemyAttack(
                                enemy,
                                { ...enhancedPal, stats: palModifiedStats },
                                enemyType,
                                palType,
                                palResistances,
                                enemy.name,
                                pal.nickname || pal.name,
                                potionEffects // Pass active potion effects for defense check
                            );

                            const wouldBeDamage = Math.max(0, simulatedAttack.damage);
                            const storedChunk = Math.floor(wouldBeDamage * paradoxState.recoilPercent);
                            paradoxState.storedDamage += storedChunk;
                            this.logger.add(`⏰ *Storing ${storedChunk} temporal damage (total ${paradoxState.storedDamage}).*`);
                            paradoxState.active = false;
                            paradoxState.pendingRecoil = true;
                        }
                    } else {
                        const enemyAttackResult = this.executeEnemyAttack(
                            { ...enemy, stats: enemyModifiedStats }, 
                            { ...enhancedPal, stats: palModifiedStats }, 
                            enemyType, palType, 
                            palResistances, enemy.name, pal.nickname || pal.name,
                            { 
                                defenderEquipmentEffects: equipmentEffects,
                                defenderPotionEffects: potionEffects // Pass potions for defensive effects (phase_dodge)
                            }
                        );
                        
                        palCurrentHp = Math.max(0, palCurrentHp - enemyAttackResult.damage);
                        
                        // Apply reflected damage from elemental shield
                        if (enemyAttackResult.reflectedDamage > 0) {
                            enemyCurrentHp = Math.max(0, enemyCurrentHp - enemyAttackResult.reflectedDamage);
                            this.logger.add(`⚡ **${enemy.name} takes ${enemyAttackResult.reflectedDamage} reflected damage!**`);
                        }

                        if (palCurrentHp <= 0) {
                            if (this.handleDeath(enhancedPal, equipmentEffects, reviveUsed)) {
                                const reviveHp = Math.floor(enhancedPal.stats.hp * 0.3);
                                palCurrentHp = reviveHp;
                                reviveUsed = true;
                                this.logger.add(`🌟 **Revival!** ${pal.nickname || pal.name} refuses to stay down!`);
                            } else {
                                this.logger.add(`💀 Your **${pal.nickname || pal.name}** has been defeated!`);
                                break;
                            }
                        }
                        this.logger.add(`> *${pal.nickname || pal.name} HP: ${palCurrentHp}/${enhancedPal.stats.hp}*`);
                    }
                }

                // Apply healing effects
                palCurrentHp = this.applyHealingEffects(enhancedPal, palCurrentHp, pal.nickname || pal.name);

                if (invulnerabilityTurns > 0) {
                    invulnerabilityTurns--;
                    if (invulnerabilityTurns === 0) {
                        this.logger.add(`💀 **${pal.nickname || pal.name}**'s invulnerability fades...`);
                    }
                }
            }

            if (turn >= COMBAT_CONFIG.MAX_TURNS) {
                this.logger.add("⏱️ The battle lasted too long and both combatants retreat");
            }

            return {
                playerWon: palCurrentHp > 0,
                log: this.logger.getLog(),
                remainingHp: Math.max(0, palCurrentHp),
            };
        } catch (error) {
            console.error('Error in combat simulation:', error);
            return {
                playerWon: false,
                log: "An error occurred during battle simulation.",
                remainingHp: 0,
            };
        }
    }

    executeAttack(attacker, defender, attackerType, defenderType, equipmentEffects, 
             potionEffects, defenderResistances, attackerName, defenderName, 
             defenderEquipmentEffects = null, options = {}) { 
        const logger = options.logger || this.logger;
        const defenderPotionEffects = options.defenderPotionEffects || {}; // Support defensive potions
        let totalDamage = 0;
        let lifesteal = 0;
        let applyFear = false;
        let elementalStormTriggered = false;
        let abyssalDevourerTriggered = false;
        let reflectDamageTotal = 0;
        let defenderHasBarrier = false;
        let barrierAbsorb = 0;
        let skillActivations = { hpSacrificed: 0, lichActivated: false, multiplier: 1, attackCount: 1, applyFear: false, enhancedLifesteal: null, elementalStormTriggered: false, abyssalDevourerTriggered: false };

        try {
            // Check for Celestial Barrier (defensive skill)
            const celestialBarrier = SkillManager.checkActivation(defender, "celestial_barrier");
            if (celestialBarrier?.type === "celestial_barrier") {
                logger.add(celestialBarrier.message);
                const absorbPercent = Math.round(celestialBarrier.absorb * 100);
                
                defenderHasBarrier = true;
                barrierAbsorb = celestialBarrier.absorb;
            }

            // Check for defensive skills BEFORE hit calculation
            const divineProtection = SkillManager.checkActivation(defender, "divine_protection");
            if (divineProtection?.type === "divine_protection") {
                logger.add(divineProtection.message);
                
                // Divine Retribution
                let retributionDamage = 0;
                if (divineProtection.retribution && divineProtection.retribution > 0) {
                    retributionDamage = Math.floor(defender.stats.atk * divineProtection.retribution);
                    logger.add(`⚡ **Divine Retribution!** The attacker takes ${retributionDamage} holy damage!`);
                }
                
                return { damage: 0, lifesteal: 0, applyFear: false, counterDamage: retributionDamage };
            }

            const dodgeSkill = SkillManager.checkActivation(defender, "dodge");
            if (dodgeSkill?.type === "dodge") {
                logger.add(dodgeSkill.message);
                
                // Check for counter-attack
                const counterSkill = SkillManager.checkActivation(defender, "counter");
                if (counterSkill?.type === "counter") {
                    logger.add(counterSkill.message);
                    // Note: Counter damage should be applied by caller
                }
                return { damage: 0, lifesteal: 0, applyFear: false, counterDamage: counterSkill?.damage || 0 };
            }

            // Hit calculation
            let effectiveHitChance = HitCalculator.compute(attacker.stats, defender.stats, attacker.equipment, defender.equipment).hitChance;
            
            // Check for phase_dodge (defensive potion effect)
            if (defenderPotionEffects.special?.ability === 'phase_dodge') {
                if (Math.random() < (defenderPotionEffects.special.chance || 0.25)) {
                    logger.add(`🌌 **Phase Shift!** ${defenderName} phases through the attack unharmed!`);
                    return { 
                        damage: 0, 
                        lifesteal: 0, 
                        applyFear: false,
                        counterDamage: 0
                    };
                }
            }
            
            if (Math.random() > effectiveHitChance) {
                logger.add(`💨 **${attackerName}**'s attack misses!`);
                return { 
                    damage: 0, 
                    lifesteal: 0, 
                    applyFear: false,
                    counterDamage: 0,
                    elementalStormTriggered: false,
                    abyssalDevourerTriggered: false
                };
            }

            // Get all skill activations
            skillActivations = this.checkSkillActivations(attacker, attackerName, logger, defender);
            let damageMultiplier = skillActivations.multiplier;
            let attackCount = skillActivations.attackCount;
            applyFear = skillActivations.applyFear;

            elementalStormTriggered = skillActivations.elementalStormTriggered || false;
            abyssalDevourerTriggered = skillActivations.abyssalDevourerTriggered || false;

            if (skillActivations.enhancedLifesteal) {
                attacker.skillBonuses.lifesteal = Math.max(
                    attacker.skillBonuses.lifesteal || 0,
                    skillActivations.enhancedLifesteal
                );
            }

            // Execute each attack
            for (let attackNum = 0; attackNum < attackCount; attackNum++) {
                let attack = DamageCalculator.calculate(
                    attacker.stats, defender.stats, attackerType, defenderType, defenderResistances
                );

                attack.damage = Math.floor(attack.damage * damageMultiplier);

                const weaponResult = WeaponAbilityProcessor.process(
                    attacker.stats, equipmentEffects, attackerName, logger
                );
                attack.damage += weaponResult.damage;

                const offensiveResult = EquipmentEffectProcessor.processOffensive(
                    attacker, equipmentEffects, attackerName, logger
                );
                attack.damage = Math.floor(attack.damage * offensiveResult.damageModifier);

                attack.damage = this.applyPotionEffects(attack.damage, potionEffects, attackerName, logger);

                // Check for Elemental Shield on defender
                const elementalShield = SkillManager.checkActivation(defender, "elemental_shield");
                if (elementalShield?.type === "elemental_shield") {
                    logger.add(elementalShield.message);
                    const absorbedDamage = Math.floor(attack.damage * elementalShield.absorb);
                    attack.damage -= absorbedDamage;
                    logger.add(`🛡️ **Shield absorbs ${absorbedDamage} damage!**`);
                    
                    const reflectThisHit = Math.floor(absorbedDamage * elementalShield.reflection);
                    reflectDamageTotal += reflectThisHit;
                    if (reflectThisHit > 0) {
                        logger.add(`⚡ **Shield reflects ${reflectThisHit} damage back!**`);
                    }
                }

                // Apply damage reduction from skills
                if (defender.skillBonuses?.damageReduction) {
                    const originalDamage = attack.damage;
                    attack.damage = Math.floor(attack.damage * (1 - defender.skillBonuses.damageReduction));
                    if (originalDamage !== attack.damage) {
                        logger.add(`🛡️ **Damage Reduction** reduces damage by ${originalDamage - attack.damage}!`);
                    }
                }

                // Process defensive equipment effects
                if (defenderEquipmentEffects) {
                    const defensiveResult = EquipmentEffectProcessor.processDefensive(
                        defender, defenderEquipmentEffects, defenderName, attack.damage, logger
                    );
                    
                    attack.damage = Math.max(0, attack.damage - defensiveResult.damageReduction);
                    
                    // Apply counter status effects to attacker
                    defensiveResult.statusEffects.forEach(status => {
                        StatusEffectManager.applyStatusEffect(attacker, status);
                        const statusIcon = StatusProcessor.getStatusIcon(status);
                        logger.add(`${statusIcon} **${attackerName}** is afflicted with ${status}!`);
                    });
                }

                totalDamage += attack.damage;
                this.logAttack(attackerName, attack, attackerType, defenderType, attackNum === 0 || attackCount === 1, logger);

                // Check for temporal echo
                const temporalEcho = SkillManager.checkActivation(attacker, "temporal_echo");
                if (temporalEcho?.type === "temporal_echo") {
                    logger.add(temporalEcho.message);
                    const echoDamage = Math.floor(attack.damage * temporalEcho.multiplier);
                    totalDamage += echoDamage;
                    logger.add(`⏰ **Echo Strike** deals **${echoDamage}** additional damage!`);
                }
            }

            // Apply Celestial Barrier absorption
            if (defenderHasBarrier && barrierAbsorb) {
                const absorbedDamage = Math.floor(totalDamage * barrierAbsorb);
                totalDamage -= absorbedDamage;
                logger.add(`🛡️ Barrier absorbed ${absorbedDamage} damage!`);
            }

            // Apply lifesteal
            if (attacker.skillBonuses?.lifesteal) {
                lifesteal = Math.floor(totalDamage * attacker.skillBonuses.lifesteal);
                logger.add(`💉 **Life Drain!** ${attackerName} recovers ${lifesteal} HP!`);
            }

            // Apply Abyssal Tide (dotDamage) - damage over time
            if (attacker.skillBonuses?.dotDamage) {
                const dotDamage = Math.floor(totalDamage * attacker.skillBonuses.dotDamage);
                if (dotDamage > 0) {
                    logger.add(`🌊 **Abyssal Tide!** Dark waters deal ${dotDamage} damage over time!`);
                    // Apply the dot damage immediately as additional damage
                    totalDamage += dotDamage;
                }
            }
            
            // Process status effect infliction
            StatusProcessor.inflictStatus(attacker, defender, attackerName, logger);

        } catch (error) {
            console.error('Error executing attack:', error);
        }
        return { damage: totalDamage, lifesteal, applyFear, counterDamage: 0, elementalStormTriggered, abyssalDevourerTriggered, reflectedDamage: reflectDamageTotal, hpSacrificed: skillActivations.hpSacrificed || 0, lichActivated: skillActivations.lichActivated || false, resonanceStacks: attacker.resonanceStack || 0 };
    }

    executeEnemyAttack(enemy, defender, attackerType, defenderType, defenderResistances, attackerName, defenderName, options = {}) {
        const logger = options.logger || this.logger;
        const defenderPotionEffects = options.defenderPotionEffects || {};
        const defenderEquipmentEffects = options.defenderEquipmentEffects || {};

        try {
            const divineProtection = SkillManager.checkActivation(defender, "divine_protection");
            const dodgeSkill = SkillManager.checkActivation(defender, "dodge");

            if (divineProtection?.type === "divine_protection") {
                logger.add(divineProtection.message);
                logger.add(`> The attack is completely negated!`);
                return { damage: 0 };
            }

            if (dodgeSkill?.type === "dodge") {
                logger.add(dodgeSkill.message);
                logger.add(`> The attack is dodged!`);
                
                const counterSkill = SkillManager.checkActivation(defender, "counter");
                if (counterSkill?.type === "counter") {
                    logger.add(counterSkill.message);
                    logger.add(`⚔️ Counter-attack deals **${counterSkill.damage}** damage!`);
                }
                return { damage: 0 };
            }

            // Check for phase_dodge
            if (defenderPotionEffects.special?.ability === 'phase_dodge') {
                if (Math.random() < (defenderPotionEffects.special.chance || 0.25)) {
                    logger.add(`🌌 **Phase Shift!** ${defenderName} phases through the attack unharmed!`);
                    return { damage: 0 };
                }
            }

            let attack = DamageCalculator.calculate(
                enemy.stats, defender.stats, attackerType, defenderType, defenderResistances
            );
            
            // Check for elemental shield on defender
            const elementalShield = SkillManager.checkActivation(defender, "elemental_shield");
            let reflectDamage = 0;
            if (elementalShield?.type === "elemental_shield") {
                logger.add(elementalShield.message);
                
                const absorbedDamage = Math.floor(attack.damage * elementalShield.absorb);
                attack.damage -= absorbedDamage;
                logger.add(`🛡️ **Shield absorbs ${absorbedDamage} damage!**`);
                
                reflectDamage = Math.floor(absorbedDamage * elementalShield.reflection);
                if (reflectDamage > 0) {
                    logger.add(`⚡ **Shield reflects ${reflectDamage} damage back to ${attackerName}!**`);
                }
            }

            // Apply damage reduction
            if (defender.skillBonuses?.damageReduction) {
                const originalDamage = attack.damage;
                attack.damage = Math.floor(attack.damage * (1 - defender.skillBonuses.damageReduction));
                if (originalDamage !== attack.damage) {
                    logger.add(`🛡️ **Armor Plating** reduces damage by ${originalDamage - attack.damage}!`);
                }
            }

            this.logEnemyAttack(attackerName, attack, attackerType, defenderType, logger);

            return { damage: attack.damage, reflectedDamage: reflectDamage };
        } catch (error) {
            console.error('Error executing enemy attack:', error);
            return { damage: 1 };
        }
    }

    simulatePlayerAttack(attacker, defender, attackerType, defenderType, equipmentEffects, potionEffects, defenderResistances, attackerName, defenderName, defenderEquipmentEffects = null) {
        try {
            const attackerClone = StatManager.cloneCreature(attacker);
            const defenderClone = StatManager.cloneCreature(defender);
            return this.executeAttack(
                attackerClone,
                defenderClone,
                attackerType,
                defenderType,
                equipmentEffects,
                potionEffects,
                defenderResistances,
                attackerName,
                defenderName,
                defenderEquipmentEffects,
                { logger: this.silentLogger }
            );
        } catch (error) {
            console.error('Error simulating player attack:', error);
            return { damage: 0, reflectedDamage: 0 };
        }
    }

    simulateEnemyAttack(enemy, defender, attackerType, defenderType, defenderResistances, attackerName, defenderName, defenderPotionEffects = {}) {
        try {
            const enemyClone = StatManager.cloneCreature(enemy);
            const defenderClone = StatManager.cloneCreature(defender);
            return this.executeEnemyAttack(
                enemyClone,
                defenderClone,
                attackerType,
                defenderType,
                defenderResistances,
                attackerName,
                defenderName,
                { 
                    logger: this.silentLogger,
                    defenderPotionEffects: defenderPotionEffects 
                }
            );
        } catch (error) {
            console.error('Error simulating enemy attack:', error);
            return { damage: 0 };
        }
    }

    checkSkillActivations(attacker, attackerName, customLogger = null, defender = null) {
        const logger = customLogger || this.logger;
        let multiplier = 1;
        let attackCount = 1;
        let applyFear = false;
        let enhancedLifesteal = null;
        let elementalStormTriggered = false;
        let abyssalDevourerTriggered = false;
        let hpSacrificed = 0;
        let lichActivated = false;

        try {
            // Check if silenced
            const silenced = attacker.statusEffects?.some(e => 
                e.type === 'silence' && e.turnsRemaining > 0
            );
            
            if (silenced) {
                logger.add(`🤫 **${attackerName}** is silenced and cannot use skills!`);
                return { multiplier, attackCount, applyFear, enhancedLifesteal, elementalStormTriggered, abyssalDevourerTriggered };
            }

            const executeSkill = SkillManager.checkActivation(attacker, "execute", defender?.currentHp, defender?.stats?.hp);
            const overloadSkill = SkillManager.checkActivation(attacker, "overload");
            const multiAttack = SkillManager.checkActivation(attacker, "multiAttack");
            const darkRitual = SkillManager.checkActivation(attacker, "dark_ritual", attacker.currentHp, attacker.stats.hp);
            const lichTransform = SkillManager.checkActivation(attacker, "lich_transformation");
            const elementalStorm = SkillManager.checkActivation(attacker, "elemental_storm");
            const abyssalDevourer = SkillManager.checkActivation(attacker, "abyssal_devourer");

            if (attacker.skillBonuses?.frenzyDamage && attacker.currentHp && attacker.stats?.hp) {
                const missingHpPercent = Math.max(0, 1 - (attacker.currentHp / attacker.stats.hp));
                if (missingHpPercent > 0) {
                    const frenzyBonus = 1 + (missingHpPercent * attacker.skillBonuses.frenzyDamage);
                    multiplier *= frenzyBonus;
                    const bonusPercent = Math.round(missingHpPercent * attacker.skillBonuses.frenzyDamage * 100);
                    logger.add(`🩸 **Blood Frenzy!** ${attackerName} gains +${bonusPercent}% damage from wounds!`);
                }
            }

            if (attacker.skillBonuses?.resonanceStacks) {
                if (!attacker.resonanceStack) attacker.resonanceStack = 0;
                
                const maxStacks = attacker.skillBonuses.resonanceStacks;
                const perStack = attacker.skillBonuses.resonancePerStack;
                
                if (attacker.resonanceStack >= maxStacks && attacker.skillBonuses.maxResonanceBurst) {
                    multiplier *= attacker.skillBonuses.maxResonanceBurst;
                    logger.add(`✨ **RESONANCE BURST!** ${attackerName} unleashes ${attacker.resonanceStack} stacks of arcane power!`);
                    attacker.resonanceStack = 0; 
                } else if (attacker.resonanceStack > 0) {
                    const stackBonus = 1 + (attacker.resonanceStack * perStack);
                    multiplier *= stackBonus;
                    logger.add(`🔮 **Resonance Stack ${attacker.resonanceStack}!** +${Math.round(attacker.resonanceStack * perStack * 100)}% damage`);
                }
                
                if (attacker.resonanceStack < maxStacks) {
                    attacker.resonanceStack++;
                }
            }

            if (elementalStorm?.type === "elemental_storm") {
                multiplier *= elementalStorm.multiplier;
                elementalStormTriggered = true;
                logger.add(elementalStorm.message);
            }

            if (executeSkill?.type === "execute") {
                multiplier *= executeSkill.multiplier;
                logger.add(executeSkill.message);
            }

            if (overloadSkill?.type === "overload") {
                multiplier *= overloadSkill.multiplier;
                logger.add(overloadSkill.message);
            }

            if (multiAttack?.type === "multiAttack") {
                attackCount = 2;
                logger.add(multiAttack.message);
            }

            if (darkRitual?.type === "dark_ritual") {
                multiplier *= darkRitual.multiplier;
                logger.add(`${darkRitual.message} (${darkRitual.sacrifice} HP!)`);
                if (darkRitual.sacrifice) {
                    hpSacrificed = darkRitual.sacrifice;
                }
            }

            if (lichTransform?.type === "lich_transformation") {
                multiplier *= lichTransform.multiplier;
                lichActivated = true;
                logger.add(lichTransform.message);
                logger.add(`💀 **Lich Power!** ${attackerName} channels dark energy for devastating power!`);
            }
           
            if (abyssalDevourer?.type === "abyssal_devourer") {
                multiplier *= abyssalDevourer.multiplier;
                applyFear = abyssalDevourer.instantFear;
                enhancedLifesteal = abyssalDevourer.lifesteal;
                abyssalDevourerTriggered = true;
                logger.add(abyssalDevourer.message);
            }
        } catch (error) {
            console.error('Error checking skill activations:', error);
        }

        return { multiplier, attackCount, applyFear, enhancedLifesteal, elementalStormTriggered, abyssalDevourerTriggered, hpSacrificed, lichActivated };
    }

    applyPotionEffects(damage, potionEffects, attackerName, customLogger = null) {
        const logger = customLogger || this.logger;
        try {
            if (!potionEffects.special) return Math.floor(damage);
            
            const { ability, chance = 0.25 } = potionEffects.special;
            
            switch (ability) {
                case "shadow_strike":
                    if (Math.random() < chance) {
                        damage *= 2;
                        logger.add(`🌑 **Shadow Strike!** ${attackerName} attacks from the shadows!`);
                    }
                    break;
                    
                case "fear_strike":
                    if (Math.random() < chance) {
                        damage = Math.floor(damage * 1.5);
                        logger.add(`😱 **Fear Strike!** ${attackerName} strikes with terror!`);
                    }
                    break;
                    
                case "weakness_detection":
                    if (Math.random() < chance) {
                        damage = Math.floor(damage * 1.3);
                        logger.add(`💎 **Weakness Detected!** ${attackerName} finds a critical weakness!`);
                    }
                    break;
            }
            
            // Apply multi_element damage boost
            if (potionEffects.multi_element?.damage_boost) {
                damage = Math.floor(damage * (1 + potionEffects.multi_element.damage_boost / 100));
            }
            
        } catch (error) {
            console.error('Error applying potion effects:', error);
        }
        return Math.floor(damage);
    }

    handleDeath(creature, equipmentEffects, reviveUsed) {
        try {
            if (creature.skillBonuses?.deathResistance && 
                Math.random() < creature.skillBonuses.deathResistance) {
                return true;
            }

            if (!reviveUsed && equipmentEffects.revive_once) {
                return true;
            }

            if (!reviveUsed && creature.skillBonuses?.reviveChance && 
                Math.random() < creature.skillBonuses.reviveChance) {
                return true;
            }
        } catch (error) {
            console.error('Error handling death:', error);
        }
        return false;
    }

    applyHealingEffects(creature, currentHp, creatureName) {
        let newHp = currentHp;
        
        try {
            if (creature.skillBonuses?.hpRegen) {
                const healing = Math.floor(creature.stats.hp * creature.skillBonuses.hpRegen);
                if (healing > 0) {
                    newHp = Math.min(creature.stats.hp, newHp + healing);
                    this.logger.add(`💚 **Regeneration:** ${creatureName} recovers ${healing} HP!`);
                }
            }

            if (creature.skillBonuses?.selfRepair) {
                const repairAmount = Math.floor(creature.stats.hp * creature.skillBonuses.selfRepair);
                if (repairAmount > 0) {
                    newHp = Math.min(creature.stats.hp, newHp + repairAmount);
                    this.logger.add(`🔧 **Self Repair:** ${creatureName} repairs ${repairAmount} HP!`);
                }
            }
        } catch (error) {
            console.error('Error applying healing effects:', error);
        }
        
        return newHp; 
    }

    logAttack(attackerName, attack, attackerType, defenderType, showDetails = true, customLogger = null) {
        const logger = customLogger || this.logger;
        let message = `⚔️ **${attackerName}** attacks for **${attack.damage}** damage!`;
        
        if (showDetails) {
            if (attack.typeMultiplier > 1) {
                message += ` ✨ **Super effective!** (${attackerType} vs ${defenderType})`;
            } else if (attack.typeMultiplier < 1) {
                message += ` 🛡️ *Not very effective...* (${attackerType} vs ${defenderType})`;
            }
            if (attack.isCrit) {
                message += ` 💥 **Critical hit!**`;
            }
            if (attack.resistanceApplied) {
                message += ` 🛡️ *Damage reduced by resistance!*`;
            }
        }
        
        logger.add(message);
    }

    logEnemyAttack(attackerName, attack, attackerType, defenderType, customLogger = null) {
        const logger = customLogger || this.logger;
        let message = `⚔️ The **${attackerName}** retaliates for **${attack.damage}** damage!`;
        
        if (attack.typeMultiplier > 1) {
            message += ` ✨ **Super effective!**`;
        } else if (attack.typeMultiplier < 1) {
            message += ` 🛡️ *Not very effective...*`;
        }
        if (attack.isCrit) {
            message += ` 💥 **Critical hit!**`;
        }
        
        logger.add(message);
    }
}

// Export all functions and classes for backward compatibility and new usage
module.exports = {
    // Legacy function exports
    generateEnemy: Utils.safeGenerateEnemy,
    generateDungeonRewards: Utils.safeGenerateDungeonRewards,
    getTypeAdvantage: TypeAdvantage.calculate,
    getEquipmentResistances: EquipmentManager.getResistances,
    getEquipmentEffects: EquipmentManager.getEffects,
    getEquipmentAccuracyMultiplier: (equipment) => EquipmentManager.getMultiplier(equipment, 'accuracy'),
    getEquipmentEvasionMultiplier: (equipment) => EquipmentManager.getMultiplier(equipment, 'evasion'),
    computeHitChance: HitCalculator.compute,
    calculateDamage: DamageCalculator.calculate,
    calculateTurnOrder: TurnOrderManager.calculate,
    applyPackLeaderBonus: PackLeaderManager.apply,
    ensureSkillTree: SkillManager.ensureSkillTree,
    applySkillBonuses: SkillManager.applySkillBonuses,
    checkSkillActivation: SkillManager.checkActivation,
    processWeaponAbilities: WeaponAbilityProcessor.process,
    processStatusInfliction: StatusProcessor.inflictStatus,
    checkStatusImmunity: StatusProcessor.checkImmunity,
    processDefensiveEquipmentEffects: EquipmentEffectProcessor.processDefensive,
    processOffensiveEquipmentEffects: EquipmentEffectProcessor.processOffensive,
    processEquipmentEffects: EquipmentEffectProcessor.processOffensive,
    
    // New class exports
    CombatEngine,
    StatManager,
    EquipmentManager,
    TypeAdvantage,
    SkillManager,
    HitCalculator,
    DamageCalculator,
    TurnOrderManager,
    PackLeaderManager,
    WeaponAbilityProcessor,
    StatusProcessor,
    EquipmentEffectProcessor,
    CombatLogger,
    Utils,
    
    // Configuration
    COMBAT_CONFIG
};