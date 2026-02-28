
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const SkillTree = require('../../models/SkillTree');
const CommandHelpers = require('../../utils/commandHelpers');
const { updateQuestProgress } = require('../../utils/questSystem');
const LabManager = require('../../utils/labManager');

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

module.exports = {
    name: "incubate",
    description: "Manage your alchemical incubator to hatch eggs into pets.",
    aliases: ['incubator', 'hatch'],
    cooldown: 10,
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;
            LabManager.ensureLabHatchingSlots(player, labEffects);
            if (player.isModified('labHatchingSlots')) {
                await player.save();
            }

            // Check if player has an alchemical incubator
            const hasIncubator = CommandHelpers.hasItem(player, 'alchemical_incubator');
            if (!hasIncubator) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        "No Incubator Found", 
                        "You need an Alchemical Incubator to hatch eggs! Craft one at the workshop first."
                    )]
                });
            }

            const subcommand = args[0]?.toLowerCase();

            // Handle subcommands
            if (subcommand === 'status') {
                return this.handleStatus(message, player, prefix, labEffects);
            }
            
            if (subcommand === 'claim') {
                const slotArg = args[1];
                return this.handleClaim(message, player, client, prefix, labEffects, slotArg);
            }

            // Handle placing specific egg by name
            if (subcommand && subcommand !== 'status' && subcommand !== 'claim') {
                const eggName = args.join('_').toLowerCase();
                return this.handlePlaceEggByName(message, player, eggName, prefix, labEffects);
            }

            // Default behavior - show interactive menu
            return this.handleInteractiveMenu(message, player, client, prefix, labEffects);

        } catch (error) {
            console.error('Incubate command error:', error);
            message.reply({
                embeds: [createErrorEmbed(
                    "An Error Occurred", 
                    "There was a problem accessing your incubator."
                )]
            });
        }
    },

    async handleStatus(message, player, prefix, labEffects) {
        const slots = getAllHatchingSlots(player);
        let description = "**🧪 Incubator Slots**\n\n";
        slots.forEach(slot => {
            const label = getSlotLabel(slot);
            description += `${formatSlotDisplay(slot, label)}\n\n`;
        });
        description += `Use \`${prefix}incubate <egg name>\` to fill the next available slot.\n`;
        description += `Use \`${prefix}incubate claim [slot]\` to hatch ready eggs (e.g. \`${prefix}incubate claim lab2\`).`;

        return message.reply({
            embeds: [createInfoEmbed("Incubator Status", description.trim())]
        });
    },

    async handleClaim(message, player, client, prefix, labEffects, slotArg) {
        let targetSlot = slotArg ? resolveSlotArg(player, slotArg) : findFirstReadySlot(player);
        if (slotArg && !targetSlot) {
            return message.reply({
                embeds: [createErrorEmbed("Invalid Slot", "That incubator slot does not exist.")]
            });
        }
        if (!targetSlot) {
            return message.reply({
                embeds: [createWarningEmbed("Not Ready Yet", "None of your eggs are ready to hatch yet.")]
            });
        }
        if (!targetSlot.eggId) {
            return message.reply({
                embeds: [createErrorEmbed("Slot Empty", "This slot doesn't contain an egg right now.")]
            });
        }

        const now = new Date();
        if (targetSlot.hatchesAt && now < targetSlot.hatchesAt) {
            return message.reply({
                embeds: [createWarningEmbed(
                    "Not Ready Yet",
                    `That egg still needs **${formatTimeRemaining(targetSlot.hatchesAt - now)}** to finish hatching!`
                )]
            });
        }

        const eggItem = GameData.getItem(targetSlot.eggId);
        if (!eggItem) {
            clearSlot(targetSlot);
            await player.save();
            return message.reply({ embeds: [createErrorEmbed("Error", "The egg data could not be found. Slot reset.")] });
        }

        const hatchedPetId = selectPetFromEgg(eggItem, labEffects);
        if (!hatchedPetId) {
            clearSlot(targetSlot);
            await player.save();
            return message.reply({ embeds: [createErrorEmbed("Error", "No suitable Pal was found for this egg. Please try again.")] });
        }

        const petData = GameData.getPet(hatchedPetId);
        const maxShortId = await Pet.findOne({ ownerId: message.author.id })
            .sort({ shortId: -1 })
            .select('shortId')
            .exec();
        const nextShortId = maxShortId ? maxShortId.shortId + 1 : 1;

        const newPet = new Pet({
            ownerId: message.author.id,
            nickname: petData.name,
            basePetId: hatchedPetId,
            shortId: nextShortId,
            stats: { ...petData.baseStats },
            type: petData.type
        });
        await newPet.save();

        const skillTree = new SkillTree({
            palId: newPet.petId,
            skillPoints: 0,
            unlockedSkills: []
        });
        await skillTree.save();

        clearSlot(targetSlot);
        player.stats.eggsHatched = (player.stats.eggsHatched || 0) + 1;
        player.palCounter = (player.palCounter || 0) + 1;
        await player.save();

        await updateQuestProgress(message.author.id, 'hatch_pals', 1, message);
        client.emit('eggHatch', message.author.id);

        const slotLabel = getSlotLabel(targetSlot);
        return message.reply({
            embeds: [createSuccessEmbed(
                "Egg Hatched!",
                `🐣 **${petData.name}** hatched from **${eggItem.name}** in your ${slotLabel}!\n\n` +
                `**Pet ID:** #${nextShortId}\n` +
                `**Rarity:** ${petData.rarity}\n` +
                `**Type:** ${petData.type}\n\n` +
                `Use \`${prefix}pet info ${nextShortId}\` to view your new companion!`
            )]
        });
    },

    async handlePlaceEggByName(message, player, eggName, prefix, labEffects) {
        const availableSlot = findFirstAvailableSlot(player);
        if (!availableSlot) {
            return message.reply({
                embeds: [createErrorEmbed("All Slots Occupied", "Free up an incubator slot before placing another egg.")]
            });
        }

        const playerEggs = player.inventory.filter(item => 
            GameData.getItem(item.itemId) && GameData.getItem(item.itemId).type === 'egg'
        );

        const matchingEgg = playerEggs.find(item => 
            GameData.getItem(item.itemId)?.name?.toLowerCase().includes(eggName)
        );

        if (!matchingEgg) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Egg Not Found", 
                    `You don't have an egg matching "${eggName}". Use \`${prefix}incubate status\` to view your eggs.`
                )]
            });
        }

        const eggItem = GameData.getItem(matchingEgg.itemId);
        const hatchTime = getHatchTimestamp(eggItem, labEffects);

        matchingEgg.quantity--;
        if (matchingEgg.quantity <= 0) {
            player.inventory = player.inventory.filter(item => item.itemId !== matchingEgg.itemId);
        }

        setSlotEgg(availableSlot, matchingEgg.itemId, hatchTime);
        await player.save();

        const label = getSlotLabel(availableSlot);
        return message.reply({
            embeds: [createSuccessEmbed(
                "Egg Placed", 
                `You've placed **${eggItem.name}** into your ${label}! It will hatch in ${formatTimeRemaining(hatchTime - new Date())}.\n\n` +
                `Use \`${prefix}incubate status\` to check progress or \`${prefix}incubate claim\` when ready.`
            )]
        });
    },

    async handleInteractiveMenu(message, player, client, prefix, labEffects) {
        const availableSlot = findFirstAvailableSlot(player);
        if (!availableSlot) {
            return this.handleStatus(message, player, prefix, labEffects);
        }

        const playerEggs = player.inventory.filter(item => 
            GameData.getItem(item.itemId) && GameData.getItem(item.itemId).type === 'egg'
        );

        if (playerEggs.length === 0) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "No Eggs Found", 
                    "You don't have any eggs to incubate! Find them in dungeons or through breeding."
                )]
            });
        }

        // Limit to first 25 eggs to avoid Discord select menu limit
        const eggOptions = playerEggs.slice(0, 25).map(item => ({
            label: `${GameData.getItem(item.itemId)?.name || 'Unknown'} (x${item.quantity})`,
            value: item.itemId,
            description: `Hatches in ${GameData.getItem(item.itemId)?.hatchTimeMinutes || 0} minutes`
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('incubate_select_egg')
            .setPlaceholder('Select an egg to incubate...')
            .addOptions(eggOptions);

        const cancelButton = new ButtonBuilder()
            .setCustomId('incubate_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const components = [
            new ActionRowBuilder().addComponents(selectMenu),
            new ActionRowBuilder().addComponents(cancelButton)
        ];

        let description = "**🧪 Alchemical Incubator**\n\n";
        description += "Select an egg from the menu below to begin incubating it.\n\n";
        
        if (playerEggs.length > 25) {
            description += `⚠️ **Note:** You have ${playerEggs.length} eggs, but only the first 25 are shown. Use \`${prefix}incubate <egg name>\` to place a specific egg.\n\n`;
        }
        
        description += `You can also use:\n`;
        description += `• \`${prefix}incubate <egg name>\` - Place specific egg\n`;
        description += `• \`${prefix}incubate status\` - Check incubator status\n`;
        description += `• \`${prefix}incubate claim\` - Claim hatched pet`;

        const reply = await message.reply({
            embeds: [createInfoEmbed("Select Egg to Incubate", description)],
            components: components
        });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'incubate_select_egg') {
                const selectedEggId = i.values[0];
                const eggItem = GameData.getItem(selectedEggId);
                
                const playerEgg = player.inventory.find(item => item.itemId === selectedEggId);
                if (!playerEgg || playerEgg.quantity <= 0) {
                    await i.update({
                        embeds: [createErrorEmbed("Error", "You no longer have this egg!")],
                        components: []
                    });
                    return;
                }

                const slot = findFirstAvailableSlot(player);
                if (!slot) {
                    await i.update({
                        embeds: [createErrorEmbed("All Slots Filled", "You filled all incubator slots while the menu was open.")],
                        components: []
                    });
                    return;
                }

                playerEgg.quantity--;
                if (playerEgg.quantity <= 0) {
                    player.inventory = player.inventory.filter(item => item.itemId !== selectedEggId);
                }

                const hatchTime = getHatchTimestamp(eggItem, labEffects);
                setSlotEgg(slot, selectedEggId, hatchTime);

                await player.save();

                await i.update({
                    embeds: [createSuccessEmbed(
                        "Egg Placed", 
                        `You've placed **${eggItem.name}** into your ${getSlotLabel(slot)}! It will hatch in ${formatTimeRemaining(hatchTime - new Date())}.\n\n` +
                        `Use \`${prefix}incubate status\` to check progress or \`${prefix}incubate claim\` when ready!`
                    )],
                    components: []
                });
            } else if (i.customId === 'incubate_cancel') {
                await i.update({
                    embeds: [createWarningEmbed("Cancelled", "Incubator interface closed.")],
                    components: []
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                reply.edit({
                    //embeds: [createWarningEmbed("Timed Out", "Incubator interface has timed out.")],
                    components: []
                }).catch(() => {});
            }
        });
    }
};

function getAllHatchingSlots(player) {
    if (!player.hatchingSlot) {
        player.hatchingSlot = { eggId: null, hatchesAt: null };
    }
    const slots = [{
        type: 'base',
        index: 0,
        ref: player.hatchingSlot,
        eggId: player.hatchingSlot.eggId,
        hatchesAt: player.hatchingSlot.hatchesAt
    }];

    (player.labHatchingSlots || []).forEach((slot, idx) => {
        slots.push({
            type: 'lab',
            index: idx,
            ref: slot,
            eggId: slot.eggId,
            hatchesAt: slot.hatchesAt
        });
    });

    return slots;
}

function getSlotLabel(slotInfo) {
    return slotInfo.type === 'base' ? 'Main Slot' : `Lab Slot ${slotInfo.index + 1}`;
}

function formatSlotDisplay(slotInfo, label) {
    if (!slotInfo.eggId) {
        return `**${label}**\n> Empty`;
    }
    const eggItem = GameData.getItem(slotInfo.eggId);
    const name = eggItem?.name || slotInfo.eggId;
    if (!slotInfo.hatchesAt) {
        return `**${label}**\n> ${name} — Ready to hatch!`;
    }
    const now = new Date();
    if (now >= slotInfo.hatchesAt) {
        return `**${label}**\n> ${name} — Ready to hatch!`;
    }
    return `**${label}**\n> ${name} — ${formatTimeRemaining(slotInfo.hatchesAt - now)} remaining`;
}

function formatTimeRemaining(ms) {
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function findFirstAvailableSlot(player) {
    return getAllHatchingSlots(player).find(slot => !slot.eggId) || null;
}

function findFirstReadySlot(player) {
    const now = new Date();
    return getAllHatchingSlots(player).find(slot => slot.eggId && (!slot.hatchesAt || now >= slot.hatchesAt)) || null;
}

function resolveSlotArg(player, slotArg) {
    if (!slotArg) return null;
    const normalized = slotArg.toLowerCase();
    if (normalized === 'base' || normalized === 'main' || normalized === 'slot0') {
        return getAllHatchingSlots(player)[0];
    }
    if (normalized.startsWith('lab')) {
        const idx = parseInt(normalized.replace('lab', ''), 10);
        if (!isNaN(idx) && idx > 0) {
            return getLabSlot(player, idx - 1);
        }
    }
    const numeric = parseInt(normalized, 10);
    if (!isNaN(numeric) && numeric > 0) {
        return getLabSlot(player, numeric - 1);
    }
    return null;
}

function getLabSlot(player, index) {
    return getAllHatchingSlots(player).find(slot => slot.type === 'lab' && slot.index === index) || null;
}

function clearSlot(slotInfo) {
    slotInfo.ref.eggId = null;
    slotInfo.ref.hatchesAt = null;
}

function setSlotEgg(slotInfo, eggId, hatchesAt) {
    slotInfo.ref.eggId = eggId;
    slotInfo.ref.hatchesAt = hatchesAt;
}

function getHatchTimestamp(eggItem, labEffects) {
    const reduction = labEffects?.hatchTimeReduction || 0;
    const baseMinutes = eggItem?.hatchTimeMinutes || 60;
    const modifiedMinutes = Math.max(1, Math.round(baseMinutes * (1 - reduction)));
    return new Date(Date.now() + modifiedMinutes * 60000);
}

function selectPetFromEgg(eggItem, labEffects) {
    const candidatePets = getCandidatePets(eggItem);
    if (!candidatePets.length) {
        return null;
    }

    const baseWeights = buildRarityWeights(eggItem);
    const adjustedWeights = applyRareBonus(baseWeights, labEffects?.rarePetChanceBonus || 0);
    const chosenRarity = pickWeightedRarity(adjustedWeights);
    const selection = pickPetByRarity(candidatePets, chosenRarity);
    return selection?.id || candidatePets[0].id;
}

function getCandidatePets(eggItem) {
    if (eggItem?.possiblePals?.length) {
        return eggItem.possiblePals
            .map(id => ({ id, data: GameData.getPet(id) }))
            .filter(entry => entry.data);
    }
    const type = eggItem?.eggType || 'Beast';
    return Object.entries(GameData.pets || {})
        .filter(([_, pet]) => pet.type === type)
        .map(([id, data]) => ({ id, data }));
}

function buildRarityWeights(eggItem) {
    const defaultWeights = { common: 0.55, uncommon: 0.25, rare: 0.15, epic: 0.04, legendary: 0.01 };
    return { ...defaultWeights, ...(eggItem?.rarityWeights || {}) };
}

function applyRareBonus(weights, bonus) {
    if (!bonus) return normalizeWeights(weights);
    const adjusted = { ...weights };
    ['rare', 'epic', 'legendary'].forEach(key => {
        if (adjusted[key]) {
            adjusted[key] *= (1 + bonus);
        }
    });
    return normalizeWeights(adjusted);
}

function normalizeWeights(weights) {
    const total = RARITY_ORDER.reduce((sum, key) => sum + (weights[key] || 0), 0);
    if (!total) return weights;
    const normalized = {};
    RARITY_ORDER.forEach(key => {
        normalized[key] = (weights[key] || 0) / total;
    });
    return normalized;
}

function pickWeightedRarity(weights) {
    const roll = Math.random();
    let cumulative = 0;
    for (const key of RARITY_ORDER) {
        cumulative += weights[key] || 0;
        if (roll <= cumulative) {
            return key;
        }
    }
    return RARITY_ORDER[RARITY_ORDER.length - 1];
}

function pickPetByRarity(pool, rarity) {
    const targetIndex = RARITY_ORDER.indexOf(rarity);
    if (targetIndex === -1) return pool[0];

    for (let offset = 0; offset < RARITY_ORDER.length; offset++) {
        const idx = targetIndex - offset;
        if (idx >= 0) {
            const desired = RARITY_ORDER[idx];
            const matches = pool.filter(entry => (entry.data.rarity || '').toLowerCase() === desired);
            if (matches.length) {
                return matches[Math.floor(Math.random() * matches.length)];
            }
        }
    }

    for (let idx = targetIndex + 1; idx < RARITY_ORDER.length; idx++) {
        const desired = RARITY_ORDER[idx];
        const matches = pool.filter(entry => (entry.data.rarity || '').toLowerCase() === desired);
        if (matches.length) {
            return matches[Math.floor(Math.random() * matches.length)];
        }
    }

    return pool[0];
}