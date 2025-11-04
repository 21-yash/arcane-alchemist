const allMonsters = require("../gamedata/monsters");
const { StatusEffectManager, STATUS_EFFECTS } = require("./statusEffects");
const allItems = require("../gamedata/items");
const allSkillTrees = require("../gamedata/skillTrees");
const SkillTree = require("../models/SkillTree");
const allPals = require("../gamedata/pets");

async function ensureSkillTree(pet) {
    let skillTree = await SkillTree.findOne({ palId: pet.petId });
    if (!skillTree) {
        skillTree = new SkillTree({
            palId: pet.petId,
            skillPoints: Math.floor(pet.level / 5),
        });
        await skillTree.save();
    }
    return skillTree;
}

/**
 * Converts a Roman numeral string to an integer.
 * @param {string} roman The Roman numeral (e.g., 'I', 'IV').
 * @returns {number} The integer value.
 */
function romanToInt(roman) {
    const romanMap = { I: 1, V: 5, X: 10 };
    let total = 0;
    for (let i = 0; i < roman.length; i++) {
        const currentVal = romanMap[roman[i]];
        const nextVal = romanMap[roman[i + 1]];
        if (nextVal > currentVal) {
            total -= currentVal;
        } else {
            total += currentVal;
        }
    }
    return total;
}

// Type advantage system using 5 types
const TYPE_ADVANTAGES = {
    Beast: { 
        strong: ["Mystic", "Elemental"], 
        weak: ["Mechanical", "Undead"] 
    },
    Elemental: { 
        strong: ["Mechanical", "Mystic"], 
        weak: ["Beast", "Undead"] 
    },
    Mystic: { 
        strong: ["Undead", "Elemental"], 
        weak: ["Beast", "Mechanical"] 
    },
    Undead: { 
        strong: ["Beast", "Mechanical"], 
        weak: ["Mystic", "Elemental"] 
    },
    Mechanical: { 
        strong: ["Beast", "Undead"], 
        weak: ["Elemental", "Mystic"] 
    },
};

/**
 * Calculates type advantage multiplier
 */
function getTypeAdvantage(attackerType, defenderType) {
    const advantages = TYPE_ADVANTAGES[attackerType];
    if (!advantages) return 1;

    if (advantages.strong?.includes(defenderType)) return 1.5;
    if (advantages.weak?.includes(defenderType)) return 0.75;
    return 1;
}

/**
 * Gets equipment resistances for a creature
 */
function getEquipmentResistances(equipment) {
    const resistances = {
        fire: 0,
        ice: 0,
        storm: 0,
        physical: 0,
    };

    if (equipment) {
        Object.values(equipment).forEach((itemId) => {
            if (itemId && allItems[itemId]) {
                const item = allItems[itemId];
                if (item.fire_resist) resistances.fire += item.fire_resist;
                if (item.ice_resist) resistances.ice += item.ice_resist;
                if (item.storm_resist) resistances.storm += item.storm_resist;
                if (item.wind_resist) resistances.storm += item.wind_resist;
                if (item.physical_resist) resistances.physical += item.physical_resist;
            }
        });
    }

    return resistances;
}

/**
 * Gets equipment effects for special weapon abilities
 */
function getEquipmentEffects(equipment) {
    const effects = {};

    if (equipment) {
        Object.values(equipment).forEach((equipmentId) => {
            if (equipmentId && allItems[equipmentId]) {
                const item = allItems[equipmentId];
                if (item.special) {
                    effects[item.special] = true;
                }
                // Also check for nested stats.special
                if (item.stats?.special) {
                    effects[item.stats.special] = true;
                }
                
                // Handle resistance effects
                if (item.fire_resist) effects.fire_resistance = item.fire_resist;
                if (item.ice_resist) effects.ice_resistance = item.ice_resist;
                if (item.storm_resist) effects.storm_resistance = item.storm_resist;
                if (item.wind_resist) effects.wind_resistance = item.wind_resist;
                if (item.physical_resist) effects.physical_resistance = item.physical_resist;
                
                // Handle damage bonuses
                if (item.fire_damage) effects.fire_damage = item.fire_damage;
                if (item.ice_damage) effects.ice_damage = item.ice_damage;
                if (item.storm_damage) effects.storm_damage = item.storm_damage;
                
                // Handle special combat effects
                if (item.stats?.dodge) effects.dodge_bonus = item.stats.dodge;
                if (item.dodge) effects.dodge_bonus = item.dodge;
                if (item.stats?.crit) effects.crit_bonus = item.stats.crit;
                if (item.crit) effects.crit_bonus = item.crit;
                if (item.stats?.accuracy) effects.accuracy_bonus = item.stats.accuracy;
                if (item.accuracy) effects.accuracy_bonus = item.accuracy;
            }
        });
    }

    return effects;
}

/**
 * Gets equipment accuracy multipliers from equipped items
 */
function getEquipmentAccuracyMultiplier(equipment) {
    let multiplier = 1;
    
    if (equipment) {
        Object.values(equipment).forEach((itemId) => {
            if (itemId && allItems[itemId]) {
                const item = allItems[itemId];
                // Check for accuracy bonuses in various formats
                if (item.stats?.accuracyMultiplier) {
                    multiplier *= item.stats.accuracyMultiplier;
                } else if (item.accuracyMultiplier) {
                    multiplier *= item.accuracyMultiplier;
                } else if (item.stats?.accuracy) {
                    multiplier *= item.stats.accuracy;
                } else if (item.accuracy) {
                    multiplier *= item.accuracy;
                }
            }
        });
    }
    
    return multiplier;
}

/**
 * Gets equipment evasion multipliers from equipped items
 */
function getEquipmentEvasionMultiplier(equipment) {
    let multiplier = 1;
    
    if (equipment) {
        Object.values(equipment).forEach((itemId) => {
            if (itemId && allItems[itemId]) {
                const item = allItems[itemId];
                // Check for evasion bonuses in various formats
                if (item.stats?.evasionMultiplier) {
                    multiplier *= item.stats.evasionMultiplier;
                } else if (item.evasionMultiplier) {
                    multiplier *= item.evasionMultiplier;
                } else if (item.stats?.evasion) {
                    multiplier *= item.stats.evasion;
                } else if (item.evasion) {
                    multiplier *= item.evasion;
                }
            }
        });
    }
    
    return multiplier;
}

/**
 * Computes hit chance based on attacker accuracy vs defender evasion
 */
function computeHitChance(attackerStats, defenderStats, attackerEquipment = null, defenderEquipment = null) {
    const baseHit = 0.9; // 90% base hit chance
    const attackerAccuracy = (attackerStats.accuracy || 1) * getEquipmentAccuracyMultiplier(attackerEquipment);
    const defenderEvasion = (defenderStats.evasion || 1) * getEquipmentEvasionMultiplier(defenderEquipment);
    
    // Calculate final hit chance with bounds
    const hitChance = Math.min(0.99, Math.max(0.05, baseHit * attackerAccuracy / defenderEvasion));
    
    return { hitChance };
}

/**
 * Applies pack leader bonus for beast types in party battles
 */
function applyPackLeaderBonus(creature, beastCount = 1) {
    if (creature.type !== "Beast" || beastCount <= 1) return creature;
    
    const modifiedCreature = JSON.parse(JSON.stringify(creature));
    const bonus = Math.min(0.5, (beastCount - 1) * 0.15); // 15% per additional beast, max 50%
    
    modifiedCreature.stats.atk = Math.floor(modifiedCreature.stats.atk * (1 + bonus));
    
    return modifiedCreature;
}

/**
 * Applies skill bonuses to creature stats
 */
async function applySkillBonuses(creature, skillTree = null) {
    // Create a deep copy to avoid mutating the original
    let modifiedCreature = JSON.parse(JSON.stringify(creature));

    // Initialize skill bonuses object and ensure stats are valid numbers
    if (!modifiedCreature.skillBonuses) modifiedCreature.skillBonuses = {};

    // Get base stats from pet data as fallback
    const palData = allPals[creature.basePetId];
    const baseStats = palData?.baseStats || {};

    // Ensure all stats are valid numbers, using base stats as defaults
    modifiedCreature.stats.atk = Number(modifiedCreature.stats.atk) || baseStats.atk || 10;
    modifiedCreature.stats.def = Number(modifiedCreature.stats.def) || baseStats.def || 5;
    modifiedCreature.stats.spd = Number(modifiedCreature.stats.spd) || baseStats.spd || 10;
    modifiedCreature.stats.hp = Number(modifiedCreature.stats.hp) || baseStats.hp || 20;
    modifiedCreature.stats.luck = Number(modifiedCreature.stats.luck) || baseStats.luck || 0;

    if (!skillTree || !skillTree.unlockedSkills || skillTree.unlockedSkills.length === 0) {
        return modifiedCreature;
    }

    const typeSkills = allSkillTrees[creature.type].skills;

    // Apply each unlocked skill's bonuses
    skillTree.unlockedSkills.forEach((unlockedSkill) => {
        const skillData = typeSkills[unlockedSkill.skillId];
        if (skillData && skillData.effects && skillData.effects[unlockedSkill.level - 1]) {
            const effect = skillData.effects[unlockedSkill.level - 1];
            const bonus = effect.bonus || {};

            // Apply stat bonuses with proper null checks
            if (bonus.atkMultiplier && !isNaN(bonus.atkMultiplier)) {
                modifiedCreature.stats.atk = Math.floor(modifiedCreature.stats.atk * bonus.atkMultiplier);
            }
            if (bonus.defBonus && !isNaN(bonus.defBonus)) {
                modifiedCreature.stats.def += bonus.defBonus;
            }
            if (bonus.spdBonus && !isNaN(bonus.spdBonus)) {
                modifiedCreature.stats.spd += bonus.spdBonus;
            }
            if (bonus.critChance && !isNaN(bonus.critChance)) {
                modifiedCreature.stats.luck += bonus.critChance * 100;
            }
            if (bonus.luckBonus && !isNaN(bonus.luckBonus)) {
                modifiedCreature.stats.luck += bonus.luckBonus;
            }
            if (bonus.accuracy && !isNaN(bonus.accuracy)) {
                modifiedCreature.stats.accuracy = (modifiedCreature.stats.accuracy || 1) * bonus.accuracy;
            }
            if (bonus.allStats && !isNaN(bonus.allStats)) {
                modifiedCreature.stats.atk = Math.floor(modifiedCreature.stats.atk * bonus.allStats);
                modifiedCreature.stats.def = Math.floor(modifiedCreature.stats.def * bonus.allStats);
                modifiedCreature.stats.spd = Math.floor(modifiedCreature.stats.spd * bonus.allStats);
            }
            if (bonus.magicDamage && !isNaN(bonus.magicDamage)) {
                modifiedCreature.stats.atk = Math.floor(modifiedCreature.stats.atk * bonus.magicDamage);
            }
            if (bonus.damageReduction && !isNaN(bonus.damageReduction)) {
                modifiedCreature.stats.damageReduction = (modifiedCreature.stats.damageReduction || 0) + bonus.damageReduction;
            }

            // Store special abilities for combat use
            Object.assign(modifiedCreature.skillBonuses, bonus);
        }
    });

    // Ensure final stats are not NaN
    modifiedCreature.stats.atk = isNaN(modifiedCreature.stats.atk) ? 0 : modifiedCreature.stats.atk;
    modifiedCreature.stats.def = isNaN(modifiedCreature.stats.def) ? 0 : modifiedCreature.stats.def;
    modifiedCreature.stats.spd = isNaN(modifiedCreature.stats.spd) ? 0 : modifiedCreature.stats.spd;
    modifiedCreature.stats.hp = isNaN(modifiedCreature.stats.hp) ? 0 : modifiedCreature.stats.hp;
    modifiedCreature.stats.luck = isNaN(modifiedCreature.stats.luck) ? 0 : modifiedCreature.stats.luck;

    return modifiedCreature;
}

/**
 * Checks for special ability activation
 */
function checkSpecialAbility(ability, chance) {
    return Math.random() < chance;
}

/**
 * Processes weapon special abilities
 */
function processWeaponAbilities(attacker, equipmentEffects, attackerName) {
    let damage = 0;
    let messages = [];
    let activated = false;
    let statusEffects = [];

    for (const [ability, active] of Object.entries(equipmentEffects)) {
        if (!active || activated) continue;

        switch (ability) {
            case "lightning_strike":
            case "lightning_fork":
                if (checkSpecialAbility(ability, 0.25)) {
                    damage = Math.floor(attacker.atk * 0.5);
                    messages.push(`⚡ **Lightning Strike!** ${attackerName}'s weapon crackles with electricity!`);
                    activated = true;
                }
                break;
            case "shadow_strike":
            case "shadow_blend":
                if (checkSpecialAbility(ability, 0.25)) {
                    damage = attacker.atk;
                    messages.push(`🌑 **Shadow Strike!** ${attackerName} attacks from the shadows!`);
                    activated = true;
                }
                break;
            case "volcanic_edge":
                if (checkSpecialAbility(ability, 0.2)) {
                    damage = Math.floor(attacker.atk * 0.4);
                    messages.push(`🌋 **Volcanic Edge!** ${attackerName}'s blade erupts with molten fury!`);
                    activated = true;
                }
                break;
            case "terror_strike":
                if (checkSpecialAbility(ability, 0.15)) {
                    damage = Math.floor(attacker.atk * 1.5);
                    messages.push(`😱 **Terror Strike!** ${attackerName} unleashes nightmare incarnate!`);
                    activated = true;
                }
                break;
            case "divine_thrust":
                if (checkSpecialAbility(ability, 0.3)) {
                    damage = Math.floor(attacker.atk * 0.6);
                    messages.push(`✨ **Divine Thrust!** ${attackerName} channels celestial power!`);
                    activated = true;
                }
                break;
            case "burn_chance":
                if (checkSpecialAbility(ability, 0.2)) {
                    statusEffects.push("burn");
                    messages.push(`🔥 **Burning Blade!** ${attackerName}'s weapon ignites the enemy!`);
                }
                break;
            case "frost_pierce":
                if (checkSpecialAbility(ability, 0.25)) {
                    damage = Math.floor(attacker.atk * 0.3);
                    statusEffects.push("freeze");
                    messages.push(`❄️ **Frost Pierce!** ${attackerName}'s weapon freezes their target!`);
                    activated = true;
                }
                break;
            case "crystal_shatter":
                if (checkSpecialAbility(ability, 0.2)) {
                    damage = Math.floor(attacker.atk * 0.4);
                    messages.push(`💎 **Crystal Shatter!** ${attackerName}'s mace explodes with crystal energy!`);
                    activated = true;
                }
                break;
            case "wind_shot":
                if (checkSpecialAbility(ability, 0.3)) {
                    damage = Math.floor(attacker.atk * 0.35);
                    messages.push(`💨 **Wind Shot!** ${attackerName}'s arrow flies with supernatural speed!`);
                    activated = true;
                }
                break;
            case "soul_harvest":
                if (checkSpecialAbility(ability, 0.2)) {
                    damage = Math.floor(attacker.atk * 0.8);
                    messages.push(`👻 **Soul Harvest!** ${attackerName}'s scythe reaps spiritual energy!`);
                    activated = true;
                }
                break;
            case "crushing_blow":
                if (checkSpecialAbility(ability, 0.25)) {
                    damage = Math.floor(attacker.atk * 0.6);
                    messages.push(`🔨 **Crushing Blow!** ${attackerName}'s hammer delivers devastating impact!`);
                    activated = true;
                }
                break;
            case "void_lash":
                if (checkSpecialAbility(ability, 0.2)) {
                    damage = Math.floor(attacker.atk * 0.5);
                    messages.push(`🌌 **Void Lash!** ${attackerName}'s whip tears through reality!`);
                    activated = true;
                }
                break;
            case "ancient_fury":
                if (checkSpecialAbility(ability, 0.15)) {
                    damage = Math.floor(attacker.atk * 1.2);
                    messages.push(`⚔️ **Ancient Fury!** ${attackerName}'s axe channels bygone rage!`);
                    activated = true;
                }
                break;
            case "molten_chain":
                if (checkSpecialAbility(ability, 0.2)) {
                    damage = Math.floor(attacker.atk * 0.45);
                    statusEffects.push("burn");
                    messages.push(`🌋 **Molten Chain!** ${attackerName}'s flail burns everything it touches!`);
                    activated = true;
                }
                break;
            case "spirit_channel":
                if (checkSpecialAbility(ability, 0.25)) {
                    damage = Math.floor(attacker.atk * 0.4);
                    messages.push(`✨ **Spirit Channel!** ${attackerName} communes with otherworldly forces!`);
                    activated = true;
                }
                break;
            case "revive_once":
                // This is handled elsewhere in combat logic
                break;
        }
        if (activated) break;
    }

    return { damage, messages, activated, statusEffects };
}

/**
 * Checks for skill activation during combat
 */
function checkSkillActivation(creature, skillType, currentHp = null, maxHp = null) {
    if (!creature.skillBonuses) return null;

    switch (skillType) {
        case "dodge":
            if (creature.skillBonuses.dodgeChance && Math.random() < creature.skillBonuses.dodgeChance) {
                return {
                    type: "dodge",
                    message: `**${creature.nickname || creature.name}** dodges with feral instinct!`,
                };
            }
            break;
        case "counter":
            if (creature.skillBonuses.counterChance && Math.random() < creature.skillBonuses.counterChance) {
                return {
                    type: "counter",
                    message: `**${creature.nickname || creature.name}** counter-attacks!`,
                    damage: Math.floor(creature.stats.atk * 0.7)
                };
            }
            break;
        case "execute":
            if (currentHp && maxHp) {
                const hpPercent = currentHp / maxHp;
                if (creature.skillBonuses.executeThreshold && hpPercent <= creature.skillBonuses.executeThreshold) {
                    return {
                        type: "execute",
                        multiplier: creature.skillBonuses.atkMultiplier || 2.0,
                        message: `🩸 **Apex Predator!** ${creature.nickname || creature.name} delivers a devastating finishing blow!`
                    };
                }
            }
            break;
        case "divine_protection":
            if (creature.skillBonuses.divineProtection && Math.random() < creature.skillBonuses.divineProtection) {
                return {
                    type: "divine_protection",
                    message: `✨ Divine protection shields **${creature.nickname || creature.name}**!`,
                };
            }
            break;
        case "overload":
            if (creature.skillBonuses.overloadChance && Math.random() < creature.skillBonuses.overloadChance) {
                return {
                    type: "overload",
                    multiplier: creature.skillBonuses.overloadDamage || 2.0,
                    message: `⚡ **System Overload!** ${creature.nickname || creature.name}'s circuits surge with power!`
                };
            }
            break;
        case "dark_ritual":
            if (creature.skillBonuses.hpSacrifice && creature.skillBonuses.powerBonus && Math.random() < creature.skillBonuses.chance) {
                const sacrificeAmount = Math.floor(maxHp * creature.skillBonuses.hpSacrifice);
                if (currentHp > sacrificeAmount) {
                    return {
                        type: "dark_ritual",
                        sacrifice: sacrificeAmount,
                        multiplier: creature.skillBonuses.powerBonus,
                        message: `🩸 **Dark Ritual!** ${creature.nickname || creature.name} sacrifices life force for power!`
                    };
                }
            }
            break;
        case "lich_transformation":
            if (creature.skillBonuses.invulnerability && creature.skillBonuses.powerMultiplier && Math.random() < creature.skillBonuses.chance) {
                return {
                    type: "lich_transformation",
                    duration: creature.skillBonuses.invulnerability,
                    multiplier: creature.skillBonuses.powerMultiplier,
                    message: `💀 **Lich Transformation!** ${creature.nickname || creature.name} transcends mortal limits!`
                };
            }
            break;
        case "lifesteal":
            if (creature.skillBonuses.lifesteal) {
                return {
                    type: "lifesteal",
                    percentage: creature.skillBonuses.lifesteal,
                    message: `🩸 **Life Drain!** ${creature.nickname || creature.name} absorbs life energy!`
                };
            }
            break;
        case "multiAttack":
            if (creature.skillBonuses.multiAttack && Math.random() < creature.skillBonuses.multiAttack) {
                return {
                    type: "multiAttack",
                    message: `⚡ **System Enhancement!** ${creature.nickname || creature.name} attacks multiple times!`
                };
            }
            break;
        case "hpRegen":
            if (creature.skillBonuses.hpRegen) {
                const healAmount = Math.floor(maxHp * creature.skillBonuses.hpRegen);
                return {
                    type: "hpRegen",
                    heal: healAmount,
                    message: `✨ **Healing Light!** ${creature.nickname || creature.name} regenerates ${healAmount} HP!`
                };
            }
            break;
        case "revive":
            if (creature.skillBonuses.reviveChance && Math.random() < creature.skillBonuses.reviveChance) {
                return {
                    type: "revive",
                    message: `🌟 **Miraculous Revival!** ${creature.nickname || creature.name} refuses to fall!`
                };
            }
            break;
        case "chainReaction":
            if (creature.skillBonuses.chainReaction && Math.random() < creature.skillBonuses.chainReaction) {
                return {
                    type: "chainReaction",
                    message: `⚡ **Chain Reaction!** ${creature.nickname || creature.name}'s overload spreads!`,
                    damage: Math.floor(creature.stats.atk * 0.5)
                };
            }
            break;
        case "selfRepair":
            if (creature.skillBonuses.selfRepair) {
                const repairAmount = Math.floor(maxHp * creature.skillBonuses.selfRepair);
                return {
                    type: "selfRepair",
                    heal: repairAmount,
                    message: `🔧 **Self Repair!** ${creature.nickname || creature.name} automatically repairs damage!`
                };
            }
            break;
    }
    return null;
}

/**
 * Processes status effect infliction
 */
function processStatusInfliction(attacker, target, attackerName) {
    const statusMessages = [];

    if (attacker.skillBonuses?.statusInflict) {
        Object.entries(attacker.skillBonuses.statusInflict).forEach(([effectName, chance]) => {
            if (Math.random() < chance) {
                StatusEffectManager.applyStatusEffect(target, effectName);
                const effectDisplayName = STATUS_EFFECTS[effectName]?.name || effectName;
                statusMessages.push(`🌑 **${attackerName}** inflicts ${effectDisplayName}!`);
            }
        });
    }

    if (attacker.skillBonuses?.statusChance) {
        Object.entries(attacker.skillBonuses.statusChance).forEach(([effectName, chance]) => {
            if (Math.random() < chance) {
                StatusEffectManager.applyStatusEffect(target, effectName);
                const effectDisplayName = STATUS_EFFECTS[effectName]?.name || effectName;
                let statusIcon = "🌑";
                switch (effectName) {
                    case "burn": statusIcon = "🔥"; break;
                    case "freeze": statusIcon = "❄️"; break;
                    case "shock": statusIcon = "⚡"; break;
                    case "poison": statusIcon = "💀"; break;
                }
                statusMessages.push(`${statusIcon} **${attackerName}** inflicts ${effectDisplayName}!`);
            }
        });
    }
    return statusMessages;
}



/**
 * Processes defensive equipment effects when being attacked
 */
function processDefensiveEquipmentEffects(defender, defenderEquipmentEffects, defenderName, damage) {
    let messages = [];
    let damageReduction = 0;
    let statusEffects = [];

    // Process shield and defensive effects
    Object.entries(defenderEquipmentEffects).forEach(([effect, value]) => {
        switch (effect) {
            case "shadow_step":
            case "shadow_blend":
                if (Math.random() < 0.15) {
                    messages.push(`🌑 **${defenderName}** moves like a shadow, evading some damage!`);
                    damageReduction += Math.floor(damage * 0.2);
                }
                break;
            case "spirit_guard":
                if (Math.random() < 0.25) {
                    messages.push(`👻 **${defenderName}**'s spirit guardian provides protection!`);
                    damageReduction += Math.floor(damage * 0.3);
                }
                break;
            case "void_absorption":
                if (Math.random() < 0.2) {
                    messages.push(`🌌 **${defenderName}**'s void shield absorbs the attack!`);
                    damageReduction += Math.floor(damage * 0.5);
                }
                break;
            case "burning_counter":
                if (Math.random() < 0.3) {
                    statusEffects.push("burn");
                    messages.push(`🔥 **${defenderName}**'s buckler burns the attacker!`);
                }
                break;
            case "frost_counter":
                if (Math.random() < 0.25) {
                    statusEffects.push("freeze");
                    messages.push(`❄️ **${defenderName}**'s shield freezes the attacker!`);
                }
                break;
            case "shock_counter":
                if (Math.random() < 0.2) {
                    statusEffects.push("shock");
                    messages.push(`⚡ **${defenderName}**'s shield electrifies the attacker!`);
                }
                break;
            // Add generic shield blocking
            case "shield_block":
                if (Math.random() < 0.25) {
                    messages.push(`🛡️ **${defenderName}**'s shield blocks some damage!`);
                    damageReduction += Math.floor(damage * 0.2);
                }
                break;
        }
    });

    // Check for any shield equipment and apply generic shield effects
    if (defender.equipment && defender.equipment.shield) {
        const shieldItem = allItems[defender.equipment.shield];
        if (shieldItem) {
            // Generic shield block chance
            if (Math.random() < 0.2) {
                const blockAmount = Math.floor(damage * 0.15);
                damageReduction += blockAmount;
                messages.push(`🛡️ **${defenderName}**'s ${shieldItem.name} blocks ${blockAmount} damage!`);
            }
        }
    }

    return { messages, damageReduction, statusEffects };
}

/**
 * Processes offensive equipment effects during attacks
 */
function processOffensiveEquipmentEffects(attacker, attackerEquipmentEffects, attackerName) {
    let messages = [];
    let damageModifier = 1;
    let statusEffects = [];

    // Process offensive effects
    Object.entries(attackerEquipmentEffects).forEach(([effect, value]) => {
        switch (effect) {
            case "frost_aura":
                if (Math.random() < 0.2) {
                    statusEffects.push("slow");
                    messages.push(`❄️ **${attackerName}**'s frost aura slows the enemy!`);
                }
                break;
            case "flame_trail":
                if (Math.random() < 0.15) {
                    statusEffects.push("burn");
                    messages.push(`🔥 **${attackerName}** leaves a trail of flames!`);
                }
                break;
            case "mana_regeneration":
                if (Math.random() < 0.1) {
                    messages.push(`✨ **${attackerName}**'s robes channel magical energy!`);
                    damageModifier *= 1.1;
                }
                break;
            case "echo_sight":
                if (Math.random() < 0.2) {
                    messages.push(`🔮 **${attackerName}**'s diadem reveals enemy weaknesses!`);
                    damageModifier *= 1.15;
                }
                break;
            case "ancient_wisdom":
                if (Math.random() < 0.15) {
                    messages.push(`📜 **${attackerName}** channels ancient knowledge!`);
                    damageModifier *= 1.1;
                }
                break;
            case "soul_communion":
                if (Math.random() < 0.2) {
                    messages.push(`👻 **${attackerName}** communes with spirits for guidance!`);
                    damageModifier *= 1.12;
                }
                break;
            case "terror_aura":
                if (Math.random() < 0.25) {
                    statusEffects.push("fear");
                    messages.push(`😱 **${attackerName}**'s terrifying presence instills fear!`);
                }
                break;
        }
    });

    return { messages, damageModifier, statusEffects };
}

/**
 * Legacy function for backwards compatibility
 */
function processEquipmentEffects(attacker, defender, equipmentEffects, attackerName, defenderName) {
    return processOffensiveEquipmentEffects(attacker, equipmentEffects, attackerName);
}

/**
 * Checks if equipment grants status immunity
 */
function checkStatusImmunity(equipment, statusType) {
    if (!equipment) return false;
    
    for (const itemId of Object.values(equipment)) {
        if (itemId && allItems[itemId]) {
            const item = allItems[itemId];
            if (item.stats?.immuneToStatus === true || 
                item.immuneToStatus === true ||
                (item.statusResistance && item.statusResistance[statusType] >= 1.0)) {
                return true;
            }
        }
    }
    return false;
}


/**
 * Determines turn order based on speed with status effect modifiers
 */
function calculateTurnOrder(creature1, creature2, creature1Name, creature2Name) {
    let speed1 = creature1.stats.spd;
    let speed2 = creature2.stats.spd;

    // Apply status effect modifiers
    if (creature1.statusEffects) {
        const slowEffect = creature1.statusEffects.find(effect => effect.type === 'slow');
        if (slowEffect) {
            speed1 = Math.floor(speed1 * 0.5);
        }
    }

    if (creature2.statusEffects) {
        const slowEffect = creature2.statusEffects.find(effect => effect.type === 'slow');
        if (slowEffect) {
            speed2 = Math.floor(speed2 * 0.5);
        }
    }

    if (speed1 > speed2) {
        return { first: creature1, second: creature2, firstName: creature1Name, secondName: creature2Name };
    } else if (speed2 > speed1) {
        return { first: creature2, second: creature1, firstName: creature2Name, secondName: creature1Name };
    } else {
        // Speed tie - random
        if (Math.random() < 0.5) {
            return { first: creature1, second: creature2, firstName: creature1Name, secondName: creature2Name };
        } else {
            return { first: creature2, second: creature1, firstName: creature2Name, secondName: creature1Name };
        }
    }
}

/**
 * Calculates damage with all modifiers
 */
function calculateDamage(attacker, defender, attackerType, defenderType, defenderResistances = {}) {
    let baseDamage = Math.max(1, Math.floor(attacker.atk - defender.def / 2));

    // Apply type advantage
    const typeMultiplier = getTypeAdvantage(attackerType, defenderType);
    baseDamage = Math.floor(baseDamage * typeMultiplier);

    // Check for critical hit
    const critChance = Math.min(0.3, (attacker.luck || 0) * 0.01);
    const isCrit = Math.random() < critChance;
    if (isCrit) {
        baseDamage = Math.floor(baseDamage * 1.5);
    }

    // Apply resistances
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
}



/**
 * Generates scaled stats for a specific enemy based on the dungeon floor.
 */
function generateEnemy(dungeon, floor, isBoss = false) {
    const enemyId = isBoss
        ? dungeon.boss
        : dungeon.enemyPool[Math.floor(Math.random() * dungeon.enemyPool.length)];
    const enemyBase = allMonsters[enemyId];

    const tierValue = romanToInt(dungeon.tier);
    const scaleFactor = 1 + 0.2 * (floor - 1) + 0.1 * tierValue;

    return {
        name: enemyBase.name,
        type: enemyBase.type,
        stats: {
            hp: Math.round(enemyBase.baseStats.hp * scaleFactor),
            atk: Math.round(enemyBase.baseStats.atk * scaleFactor),
            def: Math.round(enemyBase.baseStats.def * scaleFactor),
        },
    };
}

/**
 * Calculates the final rewards for a specific floor of a dungeon.
 */
function generateDungeonRewards(dungeon, floor) {
    const { baseRewards, scaleFactors, floors, guaranteedReward } = dungeon;
    const { gold, xp, lootTable, eggTable } = baseRewards;

    const gold1 = Math.floor(
        (Math.random() * (gold[1] - gold[0]) + gold[0]) *
            Math.pow(scaleFactors.gold, floor - 1),
    );

    const xp1 = Math.floor(
        (Math.random() * (xp[1] - xp[0]) + xp[0]) *
            Math.pow(scaleFactors.xp, floor - 1),
    );

    const loot = (lootTable || [])
        .map((item) => {
            if (
                Math.random() <
                item.baseChance * Math.pow(scaleFactors.lootChance, floor - 1)
            ) {
                return {
                    itemId: item.itemId,
                    quantity:
                        Math.floor(
                            Math.random() *
                                (item.quantityRange[1] -
                                    item.quantityRange[0] +
                                    1),
                        ) + item.quantityRange[0],
                };
            }
            return null;
        })
        .filter((item) => item !== null);

    const eggDrop = (eggTable || []).find(
        (e) =>
            Math.random() <
            e.chance * Math.pow(scaleFactors.lootChance, floor - 1),
    );

    if (floor === floors && guaranteedReward) {
        loot.push(guaranteedReward);
    }

    return {
        gold1,
        xp1,
        loot,
        egg: eggDrop ? { itemId: eggDrop.itemId, quantity: 1 } : null,
    };
}

module.exports = {
    generateEnemy,
    generateDungeonRewards,
    getTypeAdvantage,
    getEquipmentResistances,
    getEquipmentEffects,
    applySkillBonuses,
    checkSkillActivation,
    processWeaponAbilities,
    processStatusInfliction,
    processEquipmentEffects,
    processDefensiveEquipmentEffects,
    processOffensiveEquipmentEffects,
    checkStatusImmunity,
    calculateDamage,
    calculateTurnOrder,
    applyPackLeaderBonus,
    ensureSkillTree,
    getEquipmentAccuracyMultiplier,
    getEquipmentEvasionMultiplier,
    computeHitChance
};