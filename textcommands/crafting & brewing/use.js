const { createArgEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('../../utils/embed');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Pet = require('../../models/Pet');
const Player = require('../../models/Player');
const GameData = require('../../utils/gameData');
const { grantPalLevels, calculateXpForNextLevel } = require('../../utils/leveling');
const CommandHelpers = require('../../utils/commandHelpers');

// Helper function to find item by partial name match
function findItemByName(inventory, itemName) {
    const tempPlayer = { inventory };
    return CommandHelpers.findItemInInventory(tempPlayer, itemName);
}

// Helper function to format duration
function formatDuration(milliseconds) {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

// Helper function to add effect to player
function addEffectToPlayer(player, effectType, duration, strength, itemName) {
    if (!player.effects) {
        player.effects = [];
    }
    
    const expiresAt = Date.now() + duration;
    
    // Remove any existing effects of the same type
    player.effects = player.effects.filter(effect => effect.type !== effectType);
    
    // Add new effect
    player.effects.push({
        type: effectType,
        expiresAt: expiresAt,
        strength: strength,
        source: itemName
    });
}

// Helper function to clean expired potion effects from pal
function cleanExpiredPotionEffects(pal) {
    return removeExpiredPotionEffects(pal);
} 

// Helper function to check if pal already has a potion effect
function checkPotionConflicts(pal, newPotionId, newEffectType) {
    if (!pal.potionEffects || pal.potionEffects.length === 0) {
        return { canUse: true };
    }

    // Clean expired effects first
    cleanExpiredPotionEffects(pal);

    // Check if same potion is already active
    const existingPotionIndex = pal.potionEffects.findIndex(e => e.potionId === newPotionId);
    if (existingPotionIndex !== -1) {
        return {
            canUse: false,
            error: `**${pal.nickname}** already has **${pal.potionEffects[existingPotionIndex].source}** active! It will expire in ${formatDuration(pal.potionEffects[existingPotionIndex].expiresAt - Date.now())}.`
        };
    }

    // Check if trying to use ability potion when one is already active
    if (newEffectType === 'special' || newEffectType === 'multi_element') {
        const existingAbilityEffect = pal.potionEffects.find(e => 
            e.type === 'special' || e.type === 'multi_element'
        );
        if (existingAbilityEffect) {
            return {
                canUse: false,
                requiresConfirmation: true,
                existingEffect: existingAbilityEffect,
                message: `**${pal.nickname}** already has **${existingAbilityEffect.source}** active (${formatDuration(existingAbilityEffect.expiresAt - Date.now())} remaining).\n\nUsing this potion will **replace** the existing ability. Are you sure?`
            };
        }
    }

    return { canUse: true };
}

// Helper function to add potion effect to pal and apply stats immediately
function addPotionEffectToPal(pal, potionId, itemData) {
    // Handle both single 'effect' or array 'effects' (taking the first one for potions)
    const effect = itemData.effect || (itemData.effects ? itemData.effects[0] : null);
    
    if (!effect) return;

    const expiresAt = Date.now() + effect.duration;
    
    // If replacing an ability potion, remove the old one's stats first
    if (effect.type === 'special' || effect.type === 'multi_element') {
        if (!pal.potionEffects) pal.potionEffects = [];
        const oldAbilityEffect = pal.potionEffects.find(e => 
            e.type === 'special' || e.type === 'multi_element'
        );
        
        if (oldAbilityEffect) {
            // Remove old ability effect stats if it had any
            if (oldAbilityEffect.stats) {
                Object.entries(oldAbilityEffect.stats).forEach(([stat, value]) => {
                    if (pal.stats[stat] !== undefined) {
                        pal.stats[stat] -= value;
                    }
                });
            }
            if (oldAbilityEffect.bonus_luck) {
                pal.stats.luck = Math.max(0, pal.stats.luck - oldAbilityEffect.bonus_luck);
            }
            if (oldAbilityEffect.crit_bonus) {
                pal.stats.luck = Math.max(0, pal.stats.luck - oldAbilityEffect.crit_bonus);
            }
        }
        
        pal.potionEffects = pal.potionEffects.filter(e => 
            e.type !== 'special' && e.type !== 'multi_element'
        );
    }
    
    if (!pal.potionEffects) pal.potionEffects = [];

    // **INSTANTLY APPLY STAT CHANGES TO PAL**
    switch (effect.type) {
        case 'stat_boost':
        case 'multi_boost':
            if (effect.stats) {
                Object.entries(effect.stats).forEach(([stat, value]) => {
                    if (pal.stats[stat] !== undefined) {
                        pal.stats[stat] += value;
                    }
                });
            }
            break;
            
        case 'trade_boost':
            if (effect.gain) {
                Object.entries(effect.gain).forEach(([stat, value]) => {
                    if (pal.stats[stat] !== undefined) {
                        pal.stats[stat] += value;
                    }
                });
            }
            if (effect.lose) {
                Object.entries(effect.lose).forEach(([stat, value]) => {
                    if (pal.stats[stat] !== undefined) {
                        pal.stats[stat] = Math.max(1, pal.stats[stat] - value);
                    }
                });
            }
            break;
            
        case 'familiar_type_boost':
            // Only apply if pal matches target type
            const GameData = require('../../utils/gameData');
            const palData = GameData.getPet(pal.basePetId);
            const palType = palData?.type || "Beast";
            
            if (effect.target && palType.toLowerCase() === effect.target.toLowerCase()) {
                if (effect.stats) {
                    Object.entries(effect.stats).forEach(([stat, value]) => {
                        if (pal.stats[stat] !== undefined) {
                            pal.stats[stat] += value;
                        }
                    });
                }
            }
            break;
            
        case 'special':
            // Apply bonus stats from special potions
            if (effect.bonus_luck) {
                pal.stats.luck += effect.bonus_luck;
            }
            if (effect.crit_bonus) {
                pal.stats.luck += effect.crit_bonus;
            }
            break;
            
        case 'resistance':
        case 'multi_element':
            // These don't modify base stats, only stored in effects
            break;
    }

    // Add new effect to tracking array
    pal.potionEffects.push({
        potionId: potionId,
        type: effect.type,
        expiresAt: expiresAt,
        source: itemData.name,
        stats: effect.stats || {},
        element: effect.element,
        value: effect.value,
        gain: effect.gain,
        lose: effect.lose,
        target: effect.target,
        ability: effect.ability,
        chance: effect.chance,
        bonus_luck: effect.bonus_luck,
        crit_bonus: effect.crit_bonus,
        elements: effect.elements,
        damage_boost: effect.damage_boost
    });
}

// Helper function to remove expired potion effects and revert their stat changes
function removeExpiredPotionEffects(pal) {
    if (!pal.potionEffects || pal.potionEffects.length === 0) return false;
    
    const now = Date.now();
    const expiredEffects = pal.potionEffects.filter(effect => effect.expiresAt && effect.expiresAt < now);
    
    if (expiredEffects.length === 0) return false;
    
    // Revert stats from expired effects
    expiredEffects.forEach(effect => {
        switch (effect.type) {
            case 'stat_boost':
            case 'multi_boost':
                if (effect.stats) {
                    Object.entries(effect.stats).forEach(([stat, value]) => {
                        if (pal.stats[stat] !== undefined) {
                            pal.stats[stat] = Math.max(stat === 'hp' ? 1 : 0, pal.stats[stat] - value);
                        }
                    });
                }
                break;
                
            case 'trade_boost':
                // Revert the trade: remove gains, restore losses
                if (effect.gain) {
                    Object.entries(effect.gain).forEach(([stat, value]) => {
                        if (pal.stats[stat] !== undefined) {
                            pal.stats[stat] = Math.max(stat === 'hp' ? 1 : 0, pal.stats[stat] - value);
                        }
                    });
                }
                if (effect.lose) {
                    Object.entries(effect.lose).forEach(([stat, value]) => {
                        if (pal.stats[stat] !== undefined) {
                            pal.stats[stat] += value;
                        }
                    });
                }
                break;
                
            case 'familiar_type_boost':
                const GameData = require('../../utils/gameData');
                const palData = GameData.getPet(pal.basePetId);
                const palType = palData?.type || "Beast";
                
                if (effect.target && palType.toLowerCase() === effect.target.toLowerCase()) {
                    if (effect.stats) {
                        Object.entries(effect.stats).forEach(([stat, value]) => {
                            if (pal.stats[stat] !== undefined) {
                                pal.stats[stat] = Math.max(stat === 'hp' ? 1 : 0, pal.stats[stat] - value);
                            }
                        });
                    }
                }
                break;
                
            case 'special':
                if (effect.bonus_luck) {
                    pal.stats.luck = Math.max(0, pal.stats.luck - effect.bonus_luck);
                }
                if (effect.crit_bonus) {
                    pal.stats.luck = Math.max(0, pal.stats.luck - effect.crit_bonus);
                }
                break;
        }
    });
    
    // Remove expired effects from array
    pal.potionEffects = pal.potionEffects.filter(effect => !effect.expiresAt || effect.expiresAt >= now);
    
    return expiredEffects.length > 0; // Return true if any were removed
}

// Helper function to find pal with better error messages
async function findPal(message, args, player, prefix) {
    const lastArg = args[args.length - 1];
    const potentialId = parseInt(lastArg);
    
    if (!isNaN(potentialId) && args.length > 1) {
        const petResult = await CommandHelpers.validatePet(message.author.id, potentialId, prefix);
        if (!petResult.success) {
            return { error: petResult.embed };
        }
        return { pal: petResult.pet, palIdProvided: true };
    } else {
        if (player.preferences?.selectedPet) {
            const pet = await Pet.findOne({ ownerId: message.author.id, petId: player.preferences.selectedPet });
            if (!pet) {
                return {
                    error: createWarningEmbed(
                        'Selected Pal Not Found', 
                        `Your selected Pal could not be found. Use \`${prefix}selectpet <id>\` to select a different Pal.`
                    )
                };
            }
            return { pal: pet, palIdProvided: false };
        } else {
            return {
                error: createWarningEmbed(
                    'No Pal Specified', 
                    `You must either:\n• Provide a Pal ID at the end: \`${prefix}use ${args[0]} ${args[1] || '1'} <pal_id>\`\n• Or select a Pal first using \`${prefix}select pet <id>\``
                )
            };
        }
    }
}

module.exports = {
    name: 'use',
    description: 'Use an item from your inventory on a Pal or activate lures/essences.',
    usage: '<item_name> [quantity] [pal_id]',
    examples: [
        'use healing 3',
        'use level_potion x2 123',
        'use whispering_charm',
        'use starlight_infusion'
    ],
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            if (args.length < 1) {
                return message.reply({ 
                    embeds: [createArgEmbed(prefix, this.name, this.usage + '\nExamples:\n' + this.examples.join('\n'))] 
                });
            }

            // Parse arguments
            const itemName = args[0].toLowerCase();
            let quantity = 1;
            let palId = null;
            
            for (let i = 1; i < args.length; i++) {
                const arg = args[i];
                if (arg.startsWith('qty:') || arg.startsWith('x') || arg.endsWith('x')) {
                    const num = parseInt(arg.replace(/qty:|x/gi, ''));
                    if (!isNaN(num)) quantity = Math.max(1, Math.min(100, num));
                } 
                else {
                    const num = parseInt(arg);
                    if (!isNaN(num)) palId = num;
                }
            }

            // Find item in inventory
            const { item: itemInInventory, itemId } = findItemByName(player.inventory, itemName);
            
            if (!itemInInventory) {
                const similarItems = player.inventory
                    .filter(i => {
                        const itemData = GameData.getItem(i.itemId);
                        return itemData && (itemData.usable || itemData.type === 'potion' || itemData.type === 'essence' || itemData.type === 'lure');
                    })
                    .map(i => GameData.getItem(i.itemId)?.name || 'Unknown')
                    .slice(0, 5);
                
                let errorMessage = `You don't have **${itemName.replace(/_/g, ' ')}** in your inventory.`;
                if (similarItems.length > 0) {
                    errorMessage += `\n\n**Available usable items:**\n${similarItems.map(name => `• ${name}`).join('\n')}`;
                }
                
                return message.reply({ 
                    embeds: [createWarningEmbed('Item Not Found', errorMessage)] 
                });
            }

            const itemData = GameData.getItem(itemId);
            if (!itemData) {
                return message.reply({ 
                    embeds: [createErrorEmbed('Invalid Item', 'This item data is corrupted or missing.')] 
                });
            }

            if (!itemData.usable) {
                return message.reply({ 
                    embeds: [createWarningEmbed('Not Usable', `${CommandHelpers.getItemEmoji(itemData.name)} **${itemData.name}** cannot be used directly.`)] 
                });
            }

            if (itemInInventory.quantity < quantity) {
                return message.reply({ 
                    embeds: [createWarningEmbed(
                        'Not Enough Items', 
                        `You only have ${CommandHelpers.getItemEmoji(itemInInventory.itemId)} **${itemInInventory.quantity}x ${itemData.name}**, but you tried to use **${quantity}x**.`
                    )] 
                });
            }

            const effect = itemData.effects || itemData.effect;
            if (!effect) {
                return message.reply({ 
                    embeds: [createWarningEmbed('No Effect', `**${itemData.name}** has no defined effects.`)] 
                });
            }

            let successMessage = '';
            // Added new effect types to needsPal list
            let needsPal = ['heal', 'level_up', 'stat_boost', 'multi_boost', 'resistance', 'trade_boost', 'familiar_type_boost', 'special', 'multi_element', 'cure'].includes(effect.type);
            
            if (!needsPal) {
                switch (effect.type) {
                    case 'pal_lure':
                    case 'rare_pal_lure':
                    case 'legendary_pal_lure':
                        const duration = effect.duration || (30 * 60 * 1000); 
                        const strength = effect.strength || 1.25;
                        
                        addEffectToPlayer(player, itemData.type, duration, strength, itemData.name);
                        
                        const durationText = formatDuration(duration);
                        const strengthText = Math.round((strength - 1) * 100);
                        
                        successMessage = `You activated ${CommandHelpers.getItemEmoji(itemData.name)} **${quantity}x ${itemData.name}**!\n\n`;
                        successMessage += `**Effect:** +${strengthText}% Pal encounter chance\n`;
                        successMessage += `**Duration:** ${durationText}\n\n`;
                        successMessage += `*The essence spreads around you, making you more attractive to wild Pals!*`;
                        
                        if (quantity > 1) {
                            const totalDuration = duration * quantity;
                            player.effects[player.effects.length - 1].expiresAt = Date.now() + totalDuration;
                            successMessage = successMessage.replace(durationText, formatDuration(totalDuration));
                        }
                        break;
                    
                    default:
                        return message.reply({ 
                            embeds: [createWarningEmbed('Unknown Effect', `Effect type "${effect.type}" is not implemented yet.`)] 
                        });
                }
            } else {
                const palResult = await findPal(message, args, player, prefix);
                if (palResult.error) {
                    return message.reply({ embeds: [palResult.error] });
                }
                
                const pal = palResult.pal;
                
                // Clean expired effects every time we access the pal
                cleanExpiredPotionEffects(pal);
                
                switch (effect.type) {
                    case 'heal':
                        if (pal.currentHp === null) pal.currentHp = pal.stats.hp;
                        
                        if (pal.currentHp >= pal.stats.hp) {
                            return message.reply({ 
                                embeds: [createWarningEmbed(
                                    'Already Healthy', 
                                    `**${pal.nickname}** is already at full health (${pal.stats.hp}/${pal.stats.hp} HP)!`
                                )] 
                            });
                        }
                        
                        const healthBefore = pal.currentHp;
                        const healPerPotion = effect.value || 50;
                        const totalHealAmount = healPerPotion * quantity;
                        pal.currentHp = Math.min(pal.stats.hp, pal.currentHp + totalHealAmount);
                        const actualHealed = pal.currentHp - healthBefore;
                        
                        successMessage = `You used ${CommandHelpers.getItemEmoji(itemData.name)} **${quantity}x ${itemData.name}** on **${pal.nickname}**!\n\n`;
                        successMessage += `**HP Restored:** +${actualHealed} HP\n`;
                        successMessage += `**Current HP:** ${pal.currentHp}/${pal.stats.hp}`;
                        
                        if (actualHealed < totalHealAmount) {
                            const wasted = totalHealAmount - actualHealed;
                            successMessage += `\n\n*${wasted} healing was wasted due to being at full health.*`;
                        }
                        break;
                    
                    case 'level_up':
                        const MAX_LEVEL = 100;
                        if (pal.level >= MAX_LEVEL) {
                            return message.reply({ 
                                embeds: [createWarningEmbed(
                                    'Max Level Reached', 
                                    `**${pal.nickname}** is already at the maximum level (${MAX_LEVEL})!`
                                )] 
                            });
                        }
                        
                        const levelBefore = pal.level;
                        const result = await grantPalLevels(client, message, pal, quantity);
                        
                        if (result.totalLevelsGained === 0) {
                            return message.reply({ 
                                embeds: [createWarningEmbed('No Level Gain', 'Unable to gain any levels. Pal may already be at max level.')] 
                            });
                        }
                        
                        successMessage = `You used ${CommandHelpers.getItemEmoji(itemData.name)} **${quantity}x ${itemData.name}** on **${pal.nickname}**!\n\n`;
                        
                        if (result.evolved) {
                            successMessage += `✨ **Evolution!** ${result.evolutionInfo.oldName} evolved into **${result.evolutionInfo.newName}**!\n`;
                            successMessage += `**Current Level:** ${pal.level}\n`;
                            
                            const remainingPotions = quantity - (levelBefore - 1);
                            if (remainingPotions > 0) {
                                successMessage += `**Additional Levels from Remaining Potions:** ${pal.level - 1}\n`;
                            }
                        } else {
                            successMessage += `**Levels Gained:** ${result.totalLevelsGained} (${levelBefore} → ${pal.level})\n`;
                        }
                        
                        successMessage += `**Current XP:** ${pal.xp}/${calculateXpForNextLevel(pal.level)}`;
                        
                        if (result.skillPointsGained > 0) {
                            successMessage += `\n🌟 **Skill Points Gained:** ${result.skillPointsGained}`;
                        }
                        
                        if (result.reachedMaxLevel) {
                            successMessage += `\n\n✨ **${pal.nickname}** has reached maximum level!`;
                        }
                        
                        if (result.skillPointsGained > 0) {
                            const skillPointEmbed = createInfoEmbed(
                                `🌟 Skill Points Gained!`,
                                `**${pal.nickname}** gained ${result.skillPointsGained} skill point(s)! Use the skills command to spend them.`
                            );
                            await message.channel.send({ embeds: [skillPointEmbed] });
                        }
                        
                        if (result.evolved) {
                            const evolutionEmbed = createInfoEmbed(
                                `✨ What's this? Your ${result.evolutionInfo.oldName} is evolving! ✨`,
                                `Congratulations! Your Pal evolved into a **${result.evolutionInfo.newName}**!`
                            );
                            await message.channel.send({ embeds: [evolutionEmbed] });
                        }
                        break;
                    
                    case 'stat_boost':
                    case 'multi_boost':
                    case 'resistance':
                    case 'trade_boost':
                    case 'familiar_type_boost':
                    case 'special':
                    case 'multi_element':
                        // Check for potion conflicts
                        const conflictCheck = checkPotionConflicts(pal, itemId, effect.type);
                        
                        if (!conflictCheck.canUse) {
                            if (conflictCheck.requiresConfirmation) {
                                const confirmRow = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`confirm_potion_replace_${pal.petId}`)
                                        .setLabel('Yes, Replace')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('✅'),
                                    new ButtonBuilder()
                                        .setCustomId(`cancel_potion_replace_${pal.petId}`)
                                        .setLabel('Cancel')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setEmoji('❌')
                                );
                                
                                const confirmEmbed = createWarningEmbed(
                                    'Replace Existing Ability?',
                                    conflictCheck.message
                                );
                                
                                const confirmMsg = await message.reply({ 
                                    embeds: [confirmEmbed], 
                                    components: [confirmRow]
                                });
                                
                                const filter = (i) => i.user.id === message.author.id && i.message.id === confirmMsg.id;
                                const collector = confirmMsg.createMessageComponentCollector({ 
                                    filter, 
                                    time: 30000, 
                                    max: 1 
                                });
                                
                                collector.on('collect', async (interaction) => {
                                    if (interaction.customId === `cancel_potion_replace_${pal.petId}`) {
                                        await interaction.update({ 
                                            embeds: [createInfoEmbed('Cancelled', 'Potion use cancelled.')],
                                            components: []
                                        });
                                        return;
                                    }
                                    
                                    // User confirmed, apply the potion
                                    addPotionEffectToPal(pal, itemId, itemData);
                                    
                                    let effectDesc = '';
                                    if (effect.stats) {
                                        const statChanges = Object.entries(effect.stats)
                                            .map(([stat, value]) => `+${value} ${stat.toUpperCase()}`)
                                            .join(', ');
                                        effectDesc = `**Stat Boost:** ${statChanges}\n`;
                                    }
                                    if (effect.ability) {
                                        effectDesc += `**Ability:** ${effect.ability.replace(/_/g, ' ')}\n`;
                                    }
                                    if (effect.element) {
                                        effectDesc += `**Resistance:** ${effect.element} (${effect.value}%)\n`;
                                    }
                                    
                                    const finalMessage = `💉 Applied **${itemData.name}** to **${pal.nickname}**!\n\n${effectDesc}**Duration:** ${formatDuration(effect.duration)}\n\n✨ *${pal.nickname}'s abilities have been enhanced!*`;
                                    
                                    // Remove item from inventory (handled inside interaction because we return below)
                                    itemInInventory.quantity -= quantity;
                                    if (itemInInventory.quantity <= 0) {
                                        player.inventory = player.inventory.filter(i => i.itemId !== itemId);
                                    }
                                    
                                    await pal.save();
                                    await player.save();
                                    
                                    await interaction.update({ 
                                        embeds: [createSuccessEmbed('Potion Replaced!', finalMessage)],
                                        components: []
                                    });
                                });
                                
                                collector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        confirmMsg.edit({ 
                                            embeds: [createInfoEmbed('Timed Out', 'Potion use confirmation timed out.')],
                                            components: []
                                        }).catch(() => {});
                                    }
                                });
                                
                                // IMPORTANT: Return here to stop the main function from continuing to standard success message/save
                                return; 
                            } else {
                                // Can't use (direct conflict like same potion active)
                                return message.reply({ 
                                    embeds: [createWarningEmbed('Cannot Use Potion', conflictCheck.error)] 
                                });
                            }
                        }
                        
                        // No conflicts, apply directly
                        addPotionEffectToPal(pal, itemId, itemData);
                        
                        let effectDescription = '';
                        if (effect.stats) {
                            const statChanges = Object.entries(effect.stats)
                                .map(([stat, value]) => `+${value} ${stat.toUpperCase()}`)
                                .join(', ');
                            effectDescription = `**Stat Boost:** ${statChanges}\n`;
                        }
                        if (effect.gain) {
                            const gains = Object.entries(effect.gain)
                                .map(([stat, value]) => `+${value} ${stat.toUpperCase()}`)
                                .join(', ');
                            effectDescription += `**Gain:** ${gains}\n`;
                        }
                        if (effect.lose) {
                            const losses = Object.entries(effect.lose)
                                .map(([stat, value]) => `-${value} ${stat.toUpperCase()}`)
                                .join(', ');
                            effectDescription += `**Trade-off:** ${losses}\n`;
                        }
                        if (effect.ability) {
                            effectDescription += `**Ability:** ${effect.ability.replace(/_/g, ' ')}\n`;
                        }
                        if (effect.element) {
                            effectDescription += `**Resistance:** ${effect.element} (${effect.value}%)\n`;
                        }
                        if (effect.elements) {
                            effectDescription += `**Elements:** ${effect.elements.join(', ')}\n`;
                            effectDescription += `**Damage Boost:** +${effect.damage_boost}%\n`;
                        }
                        
                        successMessage = `💉 **${pal.nickname}** consumed **${itemData.name}**!\n\n`;
                        successMessage += effectDescription;
                        successMessage += `**Duration:** ${formatDuration(effect.duration)}\n\n`;
                        successMessage += `✨ *${pal.nickname}'s abilities have been enhanced!*`;
                        
                        break;
                    
                    default:
                        return message.reply({ 
                            embeds: [createWarningEmbed('Unknown Effect', `Effect type "${effect.type}" is not implemented yet.`)] 
                        });
                }
                
                await pal.save();
            }

            // Standard success path (skipped if confirmation interaction was triggered)
            itemInInventory.quantity -= quantity;
            if (itemInInventory.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId !== itemId);
            }

            await player.save();

            const embedTitle = itemData.type === 'lure' || itemData.type === 'essence' 
                ? 'Essence Activated!' 
                : 'Item Used Successfully!';
                
            const successEmbed = createSuccessEmbed(embedTitle, successMessage, {
                thumbnail: itemData.image || null
            });
            
            await message.reply({ embeds: [successEmbed] });

        } catch (err) {
            console.error('Use command error:', err);
            message.reply({ 
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem using this item. Please try again.')] 
            });
        }
    }
};