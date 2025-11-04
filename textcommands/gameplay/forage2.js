const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createSuccessEmbed, createInfoEmbed, createWarningEmbed } = require('../../utils/embed');
const { restoreStamina } = require('../../utils/stamina');
const allBiomes = require('../../gamedata/biomes');
const allItems = require('../../gamedata/items');
const allPals = require('../../gamedata/pets');
const config = require('../../config/config.json');
const { grantPlayerXp } = require('../../utils/leveling');
const cooldowns = new Map();
const { updateQuestProgress } = require('../../utils/questSystem');

// Foraging events system
const forageEvents = {
    common: [
        { 
            message: "You carefully search through the undergrowth, finding what you expected.", 
            lootMultiplier: 1.0, 
            xpBonus: 0,
            weight: 50 
        },
        { 
            message: "The search is methodical and thorough.", 
            lootMultiplier: 1.1, 
            xpBonus: 2,
            weight: 30 
        },
        { 
            message: "You take your time, ensuring you don't miss anything valuable.", 
            lootMultiplier: 0.9, 
            xpBonus: 5,
            weight: 20 
        }
    ],
    rare: [
        { 
            message: "Your pet's keen senses lead you to a hidden cache of materials!", 
            trigger: "pet_present",
            lootMultiplier: 1.5, 
            xpBonus: 15,
            weight: 30 
        },
        { 
            message: "A shimmering disturbance in the air reveals rare ingredients growing nearby!", 
            guaranteedRare: true, 
            xpBonus: 20,
            weight: 25 
        },
        { 
            message: "You discover an ancient shrine with offerings left by previous explorers!", 
            bonusGold: [10, 25], 
            lootMultiplier: 1.3,
            xpBonus: 18,
            weight: 20 
        },
        { 
            message: "A friendly local creature shows you where the best materials grow!", 
            lootMultiplier: 1.8, 
            xpBonus: 12,
            weight: 15 
        },
        {
            message: "Your active essence attracts creatures from deeper in the wilderness!",
            trigger: "lure_effect_active",
            palChanceMultiplier: 2.0,
            xpBonus: 10,
            weight: 10
        }
    ],
    negative: [
        { 
            message: "Thorny vines snag your pack, causing you to lose some gathered materials.", 
            lootMultiplier: 0.6, 
            xpBonus: 2,
            weight: 40 
        },
        { 
            message: "A sudden downpour soaks your equipment, making the search more difficult.", 
            lootMultiplier: 0.7, 
            xpBonus: 3,
            weight: 30 
        },
        { 
            message: "You slip on loose rocks and scatter some of your findings.", 
            lootMultiplier: 0.5, 
            xpBonus: 0,
            weight: 20 
        },
        { 
            message: "A mischievous sprite darts by and pilfers some of your gold!", 
            loseGold: [5, 15], 
            xpBonus: 1,
            weight: 10 
        }
    ]
};

// Biome-specific event modifiers
const biomeEventModifiers = {
    'whispering_forest': {
        rareChance: 0.08,
        negativeChance: 0.12,
        petLuckBonus: 0.15
    },
    'glimmering_caves': {
        rareChance: 0.12,
        negativeChance: 0.08,
        petLuckBonus: 0.10
    },
    'sunken_swamp': {
        rareChance: 0.06,
        negativeChance: 0.18,
        petLuckBonus: 0.05
    },
    'iron_foundry': {
        rareChance: 0.10,
        negativeChance: 0.15,
        petLuckBonus: 0.12
    },
    'volcanic_peaks': {
        rareChance: 0.15,
        negativeChance: 0.20,
        petLuckBonus: 0.08
    },
    'frozen_forest': {
        rareChance: 0.12,
        negativeChance: 0.25,
        petLuckBonus: 0.20
    },
    'sky_citadel': {
        rareChance: 0.12,
        negativeChance: 0.15,
        petLuckBonus: 0.25
    },
    'shadow_realm': {
        rareChance: 0.15,
        negativeChance: 0.30,
        petLuckBonus: 0.30
    }
};

function selectEvent(eventPool, weights = null) {
    if (weights) {
        const totalWeight = eventPool.reduce((sum, event) => sum + (event.weight || 1), 0);
        let random = Math.random() * totalWeight;
        
        for (const event of eventPool) {
            random -= (event.weight || 1);
            if (random <= 0) return event;
        }
    }
    return eventPool[Math.floor(Math.random() * eventPool.length)];
}

// function processActiveEffects(player) {
//     if (!player.effects || !Array.isArray(player.effects)) {
//         player.effects = [];
//         return { hasLureEffect: false };
//     }

//     const currentTime = Date.now();
//     let hasLureEffect = false;
    
//     // Remove expired effects
//     player.effects = player.effects.filter(effect => {
//         const isExpired = currentTime > effect.expiresAt;
//         if (!isExpired && effect.type.includes('essence')) {
//             hasLureEffect = true;
//         }
//         return !isExpired;
//     });
    
//     return { hasLureEffect };
// }

function processActiveEffects(player) {
    if (!player.effects || !Array.isArray(player.effects)) {
        player.effects = [];
        return { strength: 1 };
    }

    const currentTime = Date.now();
    let strongestLureStrength = 1;

    const activeEffects = player.effects.filter(effect => {
        const isExpired = currentTime > effect.expiresAt;

        if (!isExpired && (effect.type.includes('essence') || effect.type.includes('voter_luck'))) {
            if (effect.strength > strongestLureStrength) {
                strongestLureStrength = effect.strength;
            }
        }
        
        return !isExpired;
    });

    player.effects = activeEffects;
    
    return { strength: strongestLureStrength };
}

function calculatePetBonus(selectedPet, biome) {
    if (!selectedPet) return { luckBonus: 0, typeBonus: 1.0 };
    
    const baseLuckBonus = (selectedPet.stats.luck || 0) / 100;
    const biomeModifier = biomeEventModifiers[biome.id]?.petLuckBonus || 0;
    
    // Type-based bonuses for specific biomes
    const typeBonuses = {
        'Beast': ['whispering_forest', 'sunken_swamp'],
        'Mechanical': ['iron_foundry', 'glimmering_caves'],
        'Elemental': ['volcanic_peaks', 'frozen_forest'],
        'Mystic': ['sky_citadel', 'shadow_realm']
    };
    
    let typeBonus = 1.0;
    if (typeBonuses[selectedPet.type]?.includes(biome.id)) {
        typeBonus = 1.2;
    }
    
    return {
        luckBonus: baseLuckBonus + biomeModifier,
        typeBonus
    };
}

module.exports = {
    name: 'forage2',
    description: 'Forage for alchemical ingredients in a specific biome.',
    usage: '[biome name]',
    aliases: ['gather'],
    async execute(message, args, client, prefix) {

        if (cooldowns.has(message.author.id)) {
            const expiresAt = cooldowns.get(message.author.id);
            const remainingTime = (expiresAt - Date.now()) / 1000; 

            return message.reply({
                embeds: [
                    createWarningEmbed(
                        `${config.emojis.loading} Cooldown`,
                        `You need to wait another ${remainingTime.toFixed(1)} seconds.`
                    )
                ]
            });
        }

        try {
            let player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({ 
                    embeds: [createErrorEmbed('No Adventure Started', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`)] 
                });
            }

            // Determine biome
            let biomeId;
            if (args.length > 0) {
                biomeId = args.join('_').toLowerCase();
            } else if (player.preferences?.selectedBiome) {
                biomeId = player.preferences.selectedBiome;
            } else {
                biomeId = Object.keys(allBiomes)[0];
            }
            
            const biome = allBiomes[biomeId];
            if (!biome) {
                const availableBiomes = Object.values(allBiomes).map(b => `\`${b.name}\``).join(', ');
                return message.reply({ 
                    embeds: [createErrorEmbed('Invalid Biome', `That biome does not exist. Available biomes: ${availableBiomes}`)] 
                });
            }

            if (player.level < biome.levelRequirement) {
                return message.reply({ 
                    embeds: [createErrorEmbed('Level Too Low', `You must be level **${biome.levelRequirement}** to forage in the **${biome.name}**.`)] 
                });
            }

            player = await restoreStamina(player);

            if (player.stamina < biome.staminaCost) {
                const staminaNeeded = biome.staminaCost - player.stamina;
                const timeToWaitMinutes = Math.ceil(staminaNeeded / 1) * 2; // Assuming 1 stamina per 2 mins
                return message.reply({ embeds: [
                    createErrorEmbed('Not Enough Stamina!', `You are too tired. You need **${staminaNeeded}** more stamina.\nPlease wait approximately **${timeToWaitMinutes} minutes**.`)] 
                });
            }

            // Get selected pet
            let selectedPet = null;
            if (player.preferences.selectedPet) {
                selectedPet = await Pet.findOne({ 
                    ownerId: message.author.id, 
                    petId: player.preferences.selectedPet 
                });
            }

            // Process active effects
            const effectsResult = processActiveEffects(player);
            
            // Calculate pet bonuses
            const petBonus = calculatePetBonus(selectedPet, { id: biomeId, ...biome });
            
            // Determine what kind of event occurs
            const biomeModifier = biomeEventModifiers[biomeId] || { rareChance: 0.10, negativeChance: 0.15 };
            
            let eventType = 'common';
            const eventRoll = Math.random();
            
            if (eventRoll < biomeModifier.negativeChance) {
                eventType = 'negative';
            } else if (eventRoll < biomeModifier.negativeChance + biomeModifier.rareChance + petBonus.luckBonus) {
                eventType = 'rare';
            }

            // Select specific event
            let selectedEvent = selectEvent(forageEvents[eventType]);
            
            // Check event triggers
            if (selectedEvent.trigger) {
                if (selectedEvent.trigger === 'pet_present' && !selectedPet) {
                    selectedEvent = selectEvent(forageEvents.common);
                } else if (selectedEvent.trigger === 'lure_effect_active' && effectsResult.strength <= 1) { 
                    selectedEvent = selectEvent(forageEvents.common);
                } 
            }

            // Process base loot
            const foundLoot = [];
            let lootMultiplier = (selectedEvent.lootMultiplier || 1.0) * petBonus.typeBonus;
            
            for (const lootItem of biome.lootTable) {
                let chance = lootItem.chance * lootMultiplier;
                
                // Guaranteed rare item from certain events
                if (selectedEvent.guaranteedRare && lootItem.chance <= 0.1) {
                    chance = 0.25;
                }
                
                if (Math.random() < chance) {
                    const baseQuantity = Math.floor(Math.random() * (lootItem.quantityRange[1] - lootItem.quantityRange[0] + 1)) + lootItem.quantityRange[0];
                    const quantity = Math.max(1, Math.floor(baseQuantity * lootMultiplier));
                    foundLoot.push({ itemId: lootItem.itemId, quantity });
                }
            }

            let eventDescription = '';
            // Handle event-specific effects
            if (selectedEvent.loseGold && player.gold > 0) {
                const goldLoss = Math.floor(Math.random() * (selectedEvent.loseGold[1] - selectedEvent.loseGold[0] + 1)) + selectedEvent.loseGold[0];
                player.gold = Math.max(0, player.gold - goldLoss);
                eventDescription += `\n*You lost **${goldLoss} gold** during the mishap.*\n`;
            }

            if (selectedEvent.bonusGold) {
                const goldBonus = Math.floor(Math.random() * (selectedEvent.bonusGold[1] - selectedEvent.bonusGold[0] + 1)) + selectedEvent.bonusGold[0];
                player.gold += goldBonus;
                eventDescription += `\n*You found an extra **${goldBonus} gold** tucked away!* \n`;
            }

            // Update player stats
            player.lastStaminaUpdate = new Date();
            player.stats.forageCount += 1;

            // Add loot to inventory
            let lootDescription = '';
            if (foundLoot.length > 0) {
                foundLoot.forEach(loot => {
                    const existingItem = player.inventory.find(i => i.itemId === loot.itemId);
                    if (existingItem) {
                        existingItem.quantity += loot.quantity;
                    } else {
                        player.inventory.push({ itemId: loot.itemId, quantity: loot.quantity });
                    }
                    
                    const itemData = allItems[loot.itemId];
                    const rarity = loot.quantity > 1 ? '' : (itemData?.rarity === 'rare' || itemData?.rarity === 'epic' || itemData?.rarity === 'legendary') ? ' ✨' : '';
                    lootDescription += `+ **${loot.quantity}x** ${itemData?.name || loot.itemId}${rarity}\n`;
                });
            } else {
                lootDescription = 'No materials were found this time.';
            }
            player.stamina -= biome.staminaCost;

            await player.save();

            // Create result embed
            const embedColor = eventType === 'rare' ? '#FFD700' : eventType === 'negative' ? '#FF6B6B' : '#4ECDC4';
            const eventIcon = eventType === 'rare' ? '✨' : eventType === 'negative' ? '⚠️' : '🌿';
            
            let description = `${eventIcon} ${selectedEvent.message}\n\n`;
            description += `${eventDescription}\n**Materials Found:**\n${lootDescription}\n`;
            
            if (selectedPet) {
                description += `\n*Your ${selectedPet.nickname} helped with the search!*`;
            }

            const successEmbed = createSuccessEmbed(
                `Foraging in the ${biome.name}`,
                description,
                { 
                    footer: { text: `Stamina: ${player.stamina}/${player.maxStamina}`, iconURL: message.member.displayAvatarURL() }, 
                    thumbnail: biome.pic,
                    color: embedColor
                }
            );

            await message.reply({ embeds: [successEmbed] });
            
            // Grant XP
            const baseXp = biome.staminaCost + (selectedEvent.xpBonus || 0);
            grantPlayerXp(client, message, message.author.id, baseXp);
            
            // Update quest progress
            await updateQuestProgress(message.author.id, 'forage_times', 1);
            if (foundLoot.length > 0) {
                await updateQuestProgress(message.author.id, 'collect_items', foundLoot.length);
            }

            // Handle pet encounters
            let encounteredPalInfo = null;
            if (biome.possiblePals && biome.possiblePals.length > 0) {
                for (const pal of biome.possiblePals) {
                    let encounterChance = pal.chance;
                    
                    // Apply pet bonus and lure effects
                    if (selectedPet) {
                        encounterChance *= (1 + petBonus.luckBonus);
                    }
                    
                    if (selectedEvent.palChanceMultiplier) {
                        encounterChance *= selectedEvent.palChanceMultiplier;
                    }
                    
                    if (effectsResult.strength > 1) {
                        encounterChance *= effectsResult.strength;
                    }
                    
                    if (Math.random() < encounterChance) {
                        encounteredPalInfo = { ...allPals[pal.palId], id: pal.palId };
                        break;
                    }
                }
            }

            // Handle pet encounter (same as before)
            if (encounteredPalInfo) {
                const encounterEmbed = createInfoEmbed(
                    `A wild ${encounteredPalInfo.name} appeared!`,
                    `While foraging, you stumble upon a wild **${encounteredPalInfo.name}**. It looks at you curiously.`,
                    {
                        thumbnail: encounteredPalInfo.pic
                    }
                );

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`tame_${encounteredPalInfo.id}`).setLabel('Attempt to Tame').setStyle(ButtonStyle.Success).setEmoji('🐾'),
                    new ButtonBuilder().setCustomId('ignore').setLabel('Leave it Be').setStyle(ButtonStyle.Secondary)
                );

                const encounterMessage = await message.channel.send({ embeds: [encounterEmbed], components: [buttons] });
                
                const collector = encounterMessage.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 2 * 60 * 1000,
                    componentType: ComponentType.Button
                });

                collector.on('collect', async i => {
                    if (i.customId === 'ignore') {
                        await i.update({
                            embeds: [createInfoEmbed(`You left the ${encounteredPalInfo.name} alone.`, 'It watches you for a moment before disappearing back into the wilds.')],
                            components: []
                        });
                        return collector.stop();
                    }

                    if (i.customId.startsWith('tame_')) {
                        player.palCounter += 1;
                        const newShortId = player.palCounter;

                        const newPal = new Pet({
                            ownerId: message.author.id,
                            basePetId: encounteredPalInfo.id,
                            shortId: newShortId,
                            nickname: encounteredPalInfo.name,
                            level: 1,
                            xp: 0,
                            stats: encounteredPalInfo.baseStats,
                            type: encounteredPalInfo.type
                        });
                        await newPal.save();
                        await player.save();

                        const SkillTree = require('../../models/SkillTree');
                        const skillTree = new SkillTree({
                            palId: newPal.petId,
                            skillPoints: 0, 
                            unlockedSkills: []
                        });
                        await skillTree.save();
                        
                        await i.update({
                            embeds: [createSuccessEmbed('Tamed!', `<@${message.author.id}> You successfully tamed the **${encounteredPalInfo.name}**! It has been added to your collection.`)],
                            components: []
                        });
                        grantPlayerXp(client, message, message.author.id, 20);
                        return collector.stop();
                    }
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        encounterMessage.edit({
                            embeds: [createInfoEmbed(`The ${encounteredPalInfo.name} got away.`, 'The wild Pal grew impatient and vanished before you could decide.')],
                            components: []
                        });
                    }
                });
            }

            const expirationTime = Date.now() + 10000;
            cooldowns.set(message.author.id, expirationTime);

            setTimeout(() => {
                cooldowns.delete(message.author.id);
            }, 10 * 1000);

        } catch (error) {
            console.error('Forage command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem while trying to forage.')] });
        }
    }
};