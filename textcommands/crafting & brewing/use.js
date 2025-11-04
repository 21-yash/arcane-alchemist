const { createArgEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('../../utils/embed');
const Pet = require('../../models/Pet');
const Player = require('../../models/Player');
const allItems = require('../../gamedata/items');
const { grantPalLevels, calculateXpForNextLevel } = require('../../utils/leveling');

// Helper function to find item by partial name match
function findItemByName(inventory, itemName) {
    const searchName = itemName.toLowerCase().replace(/[_\s-]/g, '');
    
    // First, try exact match
    let item = inventory.find(i => i.itemId === itemName.toLowerCase());
    if (item) return { item, itemId: itemName.toLowerCase() };
    
    // Then try to find by partial name match
    for (const invItem of inventory) {
        const itemData = allItems[invItem.itemId];
        if (!itemData) continue;
        
        const cleanItemName = itemData.name.toLowerCase().replace(/[_\s-]/g, '');
        const cleanItemId = invItem.itemId.replace(/[_\s-]/g, '');
        
        if (cleanItemName.includes(searchName) || cleanItemId.includes(searchName)) {
            return { item: invItem, itemId: invItem.itemId };
        }
    }
    
    return { item: null, itemId: null };
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

// Helper function to find pal with better error messages
async function findPal(message, args, player, prefix) {
    let palQuery = {};
    let palIdProvided = false;
    
    // Check if the last argument is a number (pal ID)
    const lastArg = args[args.length - 1];
    const potentialId = parseInt(lastArg);
    
    if (!isNaN(potentialId) && args.length > 1) {
        palQuery = { ownerId: message.author.id, shortId: potentialId };
        palIdProvided = true;
    } else {
        // Try to use selected pet
        if (player.preferencesselectedPet) {
            palQuery = { ownerId: message.author.id, petId: player.preferences.selectedPet };
        } else {
            return {
                error: createWarningEmbed(
                    'No Pal Specified', 
                    `You must either:\n• Provide a Pal ID at the end: \`${prefix}use potion_name 1 123\`\n• Or select a Pal first using \`${prefix}selectpet <id>\``
                )
            };
        }
    }
    
    const pal = await Pet.findOne(palQuery);
    
    if (!pal) {
        if (palIdProvided) {
            return {
                error: createWarningEmbed(
                    'Pal Not Found', 
                    `No Pal found with ID **${potentialId}**. Use \`${prefix}pets\` to see your Pals.`
                )
            };
        } else {
            return {
                error: createWarningEmbed(
                    'Selected Pal Not Found', 
                    `Your selected Pal could not be found. Use \`${prefix}selectpet <id>\` to select a different Pal.`
                )
            };
        }
    }
    
    return { pal, palIdProvided };
}

module.exports = {
    name: 'use',
    description: 'Use an item from your inventory on a Pal or activate lures/essences.',
    usage: '<item_name> [quantity] [pal_id]',
    examples: [
        'use healing 3',
        'use level_potion 2 123',
        'use whispering_charm',
        'use starlight_infusion'
    ],
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({ 
                    embeds: [createErrorEmbed('No Adventure Started', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`)] 
                });
            }

            if (args.length < 1) {
                return message.reply({ 
                    embeds: [createArgEmbed(prefix, this.name, this.usage + '\nExamples:\n' + this.examples.join('\n'))] 
                });
            }

            // Parse arguments
            const itemName = args[0].toLowerCase();
            let quantity = 1;
            
            // Parse quantity if provided and it's a number
            if (args.length > 1) {
                const potentialQuantity = parseInt(args[1]);
                if (!isNaN(potentialQuantity)) {
                    quantity = Math.max(1, Math.min(100, potentialQuantity)); // Limit to reasonable range
                }
            }

            // Find item in inventory
            const { item: itemInInventory, itemId } = findItemByName(player.inventory, itemName);
            
            if (!itemInInventory) {
                // Show similar items if any exist
                const similarItems = player.inventory
                    .filter(i => {
                        const itemData = allItems[i.itemId];
                        return itemData && (itemData.usable || itemData.type === 'potion' || itemData.type === 'essence' || itemData.type === 'lure');
                    })
                    .map(i => allItems[i.itemId].name)
                    .slice(0, 5);
                
                let errorMessage = `You don't have **${itemName.replace(/_/g, ' ')}** in your inventory.`;
                if (similarItems.length > 0) {
                    errorMessage += `\n\n**Available usable items:**\n${similarItems.map(name => `• ${name}`).join('\n')}`;
                }
                
                return message.reply({ 
                    embeds: [createWarningEmbed('Item Not Found', errorMessage)] 
                });
            }

            const itemData = allItems[itemId];
            if (!itemData) {
                return message.reply({ 
                    embeds: [createErrorEmbed('Invalid Item', 'This item data is corrupted or missing.')] 
                });
            }

            // Check if item is usable
            if (!itemData.usable) {
                return message.reply({ 
                    embeds: [createWarningEmbed('Not Usable', `**${itemData.name}** cannot be used directly.`)] 
                });
            }

            // Check quantity
            if (itemInInventory.quantity < quantity) {
                return message.reply({ 
                    embeds: [createWarningEmbed(
                        'Not Enough Items', 
                        `You only have **${itemInInventory.quantity}x ${itemData.name}**, but you tried to use **${quantity}x**.`
                    )] 
                });
            }

            const effect = itemData.effects || itemData.effect; // Support both formats
            if (!effect) {
                return message.reply({ 
                    embeds: [createWarningEmbed('No Effect', `**${itemData.name}** has no defined effects.`)] 
                });
            }

            let successMessage = '';
            let needsPal = ['heal', 'level_up', 'stat_boost', 'cure'].includes(effect.type);
            
            // Handle items that don't need a pal (lures, essences)
            if (!needsPal) {
                switch (effect.type) {
                    case 'pal_lure':
                    case 'rare_pal_lure':
                    case 'legendary_pal_lure':
                        // Apply lure effect to player
                        const duration = effect.duration || (30 * 60 * 1000); // 30 minutes default
                        const strength = effect.strength || 1.25;
                        
                        addEffectToPlayer(player, itemData.type, duration, strength, itemData.name);
                        
                        const durationText = formatDuration(duration);
                        const strengthText = Math.round((strength - 1) * 100);
                        
                        successMessage = `You activated **${quantity}x ${itemData.name}**!\n\n`;
                        successMessage += `**Effect:** +${strengthText}% Pal encounter chance\n`;
                        successMessage += `**Duration:** ${durationText}\n\n`;
                        successMessage += `*The essence spreads around you, making you more attractive to wild Pals!*`;
                        
                        // Consume multiple items but only apply the effect once (with extended duration if multiple)
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
                // Handle items that need a pal
                const palResult = await findPal(message, args, player, prefix);
                if (palResult.error) {
                    return message.reply({ embeds: [palResult.error] });
                }
                
                const pal = palResult.pal;
                
                switch (effect.type) {
                    case 'heal':
                        if (pal.currentHp === null) {
                            pal.currentHp = pal.stats.hp; // Initialize if null
                        }
                        
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
                        
                        successMessage = `You used **${quantity}x ${itemData.name}** on **${pal.nickname}**!\n\n`;
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
                        
                        // Build success message
                        successMessage = `You used **${quantity}x ${itemData.name}** on **${pal.nickname}**!\n\n`;
                        
                        if (result.evolved) {
                            successMessage += `✨ **Evolution!** ${result.evolutionInfo.oldName} evolved into **${result.evolutionInfo.newName}**!\n`;
                            successMessage += `**Current Level:** ${pal.level}\n`;
                            
                            // Calculate remaining potions used after evolution
                            const remainingPotions = quantity - (levelBefore - 1); // -1 because evolution happens at specific level
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
                        
                        // Send single consolidated message instead of spam
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
                    
                    default:
                        return message.reply({ 
                            embeds: [createWarningEmbed('Unknown Effect', `Effect type "${effect.type}" is not implemented yet.`)] 
                        });
                }
                
                await pal.save();
            }

            // Remove items from inventory
            itemInInventory.quantity -= quantity;
            if (itemInInventory.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId !== itemId);
            }

            await player.save();

            // Create appropriate embed based on item type
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