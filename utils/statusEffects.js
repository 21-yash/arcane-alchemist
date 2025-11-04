const STATUS_EFFECTS = {
    poison: {
        name: 'Poison',
        emoji: '🟢',
        description: 'Takes damage each turn',
        damagePerTurn: 0.05, // 5% of max HP
        duration: 3
    },
    burn: {
        name: 'Burn', 
        emoji: '🔥',
        description: 'Fire damage over time',
        damagePerTurn: 0.07,
        duration: 3
    },
    freeze: {
        name: 'Freeze',
        emoji: '🧊', 
        description: 'Cannot act for turns',
        skipTurn: true,
        duration: 2
    },
    shock: {
        name: 'Shock',
        emoji: '⚡',
        description: 'Reduced accuracy and speed',
        statDebuff: { spd: 0.5 },
        duration: 3
    },
    blessed: {
        name: 'Blessed',
        emoji: '✨',
        description: 'Increased damage and healing',
        statBuff: { atk: 1.2, def: 1.1 },
        duration: 4
    },
    cursed: {
        name: 'Cursed',
        emoji: '🌑',
        description: 'Reduced stats and healing',
        statDebuff: { atk: 0.8, def: 0.9 },
        duration: 5
    },
    regeneration: {
        name: 'Regeneration',
        emoji: '💚',
        description: 'Heals each turn',
        healPerTurn: 0.08,
        duration: 4
    },
    shield: {
        name: 'Shield',
        emoji: '🛡️',
        description: 'Reduced incoming damage',
        damageReduction: 0.3,
        duration: 3
    },
    slow: {
        name: 'Slow',
        emoji: '❄️',
        description: 'Reduced speed',
        statDebuff: { spd: 0.8 },
        duration: 5
    },
    fear: {
        name: 'in Fear',
        emoji: '😨',
        description: 'Cannot act next turn',
        skipTurn: true,
        duration: 1
    },
    silence: {
        name: 'Silence',
        emoji: '🤫',
        description: 'Cannot activate chance-based skills',
        disablesSkills: true,
        duration: 3
    },
    drown: {
        name: 'Drown',
        emoji: '💧',
        description: 'Takes water damage each turn and has reduced speed',
        damagePerTurn: 0.06,
        statDebuff: { spd: 0.85 },
        duration: 3
    },
    decay: {
        name: 'Decay',
        emoji: '⏳',
        description: 'Defenses erode each turn',
        statDebuffStacking: { 
            stat: 'def', 
            multiplierPerTurn: -0.05,
            maxStacks: 4 
        },
        duration: 4
    }
};

class StatusEffectManager {
    static applyStatusEffect(creature, effectType, duration = null) {
        if (!creature.statusEffects) {
            creature.statusEffects = [];
        }
        
        const effect = STATUS_EFFECTS[effectType];
        if (!effect) return false;
        
        if (effect.statDebuffStacking) {
            const existingEffect = creature.statusEffects.find(se => se.type === effectType);
            
            if (existingEffect) {
                existingEffect.turnsRemaining = duration || effect.duration;
                existingEffect.duration = duration || effect.duration;
                return true;
            }
        } else {
            creature.statusEffects = creature.statusEffects.filter(se => se.type !== effectType);
        }
        
        // Add new effect
        const newEffect = {
            type: effectType,
            duration: duration || effect.duration,
            turnsRemaining: duration || effect.duration
        };
        
        if (effect.statDebuffStacking) {
            newEffect.stacks = 0;
        }
        
        creature.statusEffects.push(newEffect);
        
        return true;
    }
    
    static removeStatusEffect(creature, effectType) {
        if (!creature.statusEffects) return;
        creature.statusEffects = creature.statusEffects.filter(se => se.type !== effectType);
    }
    
    static processStatusEffects(creature, battleLog = []) {
        if (!creature.statusEffects) return { creature, battleLog };
        
        let canAct = true;
        let skillsDisabled = false;
        let modifiedStats = { ...creature.stats };
        
        // Process each active status effect
        creature.statusEffects.forEach(effect => {
            const statusData = STATUS_EFFECTS[effect.type];
            if (!statusData) return;
            
            // Apply damage over time
            if (statusData.damagePerTurn) {
                const damage = Math.floor(creature.maxHp * statusData.damagePerTurn);
                creature.currentHp = Math.max(0, creature.currentHp - damage);
                battleLog.push(`${statusData.emoji} **${creature.name || creature.nickname}** takes ${damage} ${statusData.name} damage!`);
            }
            
            // Apply healing over time
            if (statusData.healPerTurn) {
                const healing = Math.floor(creature.maxHp * statusData.healPerTurn);
                creature.currentHp = Math.min(creature.maxHp, creature.currentHp + healing);
                battleLog.push(`${statusData.emoji} **${creature.name || creature.nickname}** recovers ${healing} HP from ${statusData.name}!`);
            }
            
            // Apply stat modifications
            if (statusData.statBuff) {
                Object.entries(statusData.statBuff).forEach(([stat, multiplier]) => {
                    modifiedStats[stat] = Math.floor(modifiedStats[stat] * multiplier);
                });
            }
            
            if (statusData.statDebuff) {
                Object.entries(statusData.statDebuff).forEach(([stat, multiplier]) => {
                    modifiedStats[stat] = Math.floor(modifiedStats[stat] * multiplier);
                });
            }
            
            // Check if creature can act
            if (statusData.skipTurn) {
                canAct = false;
                battleLog.push(`${statusData.emoji} **${creature.name || creature.nickname}** is ${statusData.name.toLowerCase()} and cannot act!`);
            }

            // Handle stacking debuffs like Decay
            if (statusData.statDebuffStacking) {
                const { stat, multiplierPerTurn, maxStacks } = statusData.statDebuffStacking;
                const totalDebuff = 1 + (multiplierPerTurn * effect.stacks);
                modifiedStats[stat] = Math.floor(modifiedStats[stat] * totalDebuff);
                battleLog.push(`${statusData.emoji} **${creature.name || creature.nickname}**'s defense is decaying! (${effect.stacks} stacks)`);
                // Increment stacks for the next turn
                if (effect.stacks < maxStacks) {
                    effect.stacks++;
                }
            }

            // check if skills are disabled
            if (statusData.disablesSkills) {
                skillsDisabled = true;
                battleLog.push(`${statusData.emoji} **${creature.name || creature.nickname}** is silenced!`);
            }
            
            // Reduce duration
            effect.turnsRemaining--;
        });
        
        // Remove expired effects
        const expiredEffects = creature.statusEffects.filter(e => e.turnsRemaining <= 0);
        expiredEffects.forEach(effect => {
            const statusData = STATUS_EFFECTS[effect.type];
            battleLog.push(`**${creature.name || creature.nickname}** recovers from ${statusData.name}!`);
        });
        
        creature.statusEffects = creature.statusEffects.filter(e => e.turnsRemaining > 0);
        
        return {
            creature: { ...creature, stats: modifiedStats },
            battleLog,
            canAct,
            skillsDisabled
        };
    }
    
    static getResistanceFromEquipment(equipment) {
        const allItems = require('../gamedata/items');
        const resistances = {};
        
        if (equipment) {
            Object.values(equipment).forEach(itemId => {
                if (itemId && allItems[itemId] && allItems[itemId].resistance) {
                    Object.entries(allItems[itemId].resistance).forEach(([effect, value]) => {
                        resistances[effect] = (resistances[effect] || 0) + value;
                    });
                }
            });
        }
        
        return resistances;
    }
    
    static checkResistance(creature, effectType) {
        const resistances = this.getResistanceFromEquipment(creature.equipment);
        const resistance = resistances[effectType] || 0;
        return Math.random() < resistance; // If true, resisted
    }
}

module.exports = { StatusEffectManager, STATUS_EFFECTS };