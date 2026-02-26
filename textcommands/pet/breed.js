
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const { updateQuestProgress } = require('../../utils/questSystem');
const LabManager = require('../../utils/labManager');

module.exports = {
    name: "breed",
    description: "Manage your breeding pen to breed pets and create eggs.",
    cooldown: 15,
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;

            // Check if player has a breeding pen
            const hasBreedingPen = CommandHelpers.hasItem(player, 'breeding_pen');
            if (!hasBreedingPen) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        "No Breeding Pen Found", 
                        "You need a Breeding Pen to breed pets! Craft one at the workshop first."
                    )]
                });
            }

            const subcommand = args[0]?.toLowerCase();

            // Handle subcommands
            if (subcommand === 'status') {
                return this.handleStatus(message, player, prefix, labEffects);
            }
            
            if (subcommand === 'claim') {
                return this.handleClaim(message, player, client, prefix, labEffects);
            }

            if (subcommand === 'remove') {
                return this.handleRemove(message, player, prefix);
            }

            if (subcommand === 'add' && args.length >= 3) {
                const shortId1 = parseInt(args[1]);
                const shortId2 = parseInt(args[2]);
                return this.handleAddPets(message, player, shortId1, shortId2, prefix, labEffects);
            }

            // Default behavior - show interactive menu
            return this.handleInteractiveMenu(message, player, client, prefix, labEffects);

        } catch (error) {
            console.error('Breed command error:', error);
            message.reply({
                embeds: [createErrorEmbed(
                    "An Error Occurred", 
                    "There was a problem accessing your breeding pen."
                )]
            });
        }
    },

    async handleStatus(message, player, prefix, labEffects) {
        let description = "**🏠 Breeding Pen Status**\n\n";
        
        if (player.breedingSlot && player.breedingSlot.pet1Id && player.breedingSlot.pet2Id) {
            const pet1Result = await CommandHelpers.validatePet(message.author.id, player.breedingSlot.pet1Id, prefix);
            const pet2Result = await CommandHelpers.validatePet(message.author.id, player.breedingSlot.pet2Id, prefix);
            const pet1 = pet1Result.success ? pet1Result.pet : null;
            const pet2 = pet2Result.success ? pet2Result.pet : null;
            
            if (!pet1 || !pet2) {
                // Clear invalid breeding slot
                player.breedingSlot = { pet1Id: null, pet2Id: null, finishesAt: null };
                await player.save();
                description += `📭 **Empty Breeding Pen**\n`;
                description += `> Place two pets to start the breeding process.\n`;
                description += `\nUse \`${prefix}breed add <pet1 id> <pet2 id>\` to place pets.`;
            } else {
                const pet1Data = GameData.getPet(pet1.basePetId);
                const pet2Data = GameData.getPet(pet2.basePetId);
                
                if (player.breedingSlot.finishesAt) {
                    const now = new Date();
                    const timeLeft = player.breedingSlot.finishesAt - now;
                    
                    if (timeLeft <= 0) {
                        description += `✨ **Breeding Complete!**\n`;
                        description += `> Parents: **${pet1Data.name} #${pet1.shortId}** & **${pet2Data.name} #${pet2.shortId}**\n`;
                        description += `> Status: **Ready for collection!**\n`;
                        description += `\nUse \`${prefix}breed claim\` to collect your egg!`;
                    } else {
                        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                        description += `💕 **Currently Breeding**\n`;
                        description += `> Parents: **${pet1Data.name} #${pet1.shortId}** & **${pet2Data.name} #${pet2.shortId}**\n`;
                        description += `> Time Remaining: **${hoursLeft}h ${minutesLeft}m**\n`;
                        description += `> Status: **The pets are getting closer together...**`;
                    }
                } else {
                    description += `💕 **Pets Placed**\n`;
                    description += `> Parents: **${pet1Data.name} #${pet1.shortId}** & **${pet2Data.name} #${pet2.shortId}**\n`;
                    description += `> Status: **The pets are getting to know each other...**`;
                }
            }
        } else {
            description += `📭 **Empty Breeding Pen**\n`;
            description += `> Place two pets to start the breeding process.\n`;
            description += `\nUse \`${prefix}breed add <pet1 id> <pet2 id>\` to place pets.`;
        }
        
        return message.reply({
            embeds: [createInfoEmbed("Breeding Pen Status", description)]
        });
    },

    async handleClaim(message, player, client, prefix, labEffects) {
        if (!player.breedingSlot || !player.breedingSlot.pet1Id || !player.breedingSlot.pet2Id) {
            return message.reply({
                embeds: [createErrorEmbed("Nothing to Claim", "There are not enough pets in your breeding pen!")]
            });
        }

        if (!player.breedingSlot.finishesAt) {
            return message.reply({
                embeds: [createErrorEmbed("Breeding Not Started", "The pets haven't started breeding yet!")]
            });
        }

        const now = new Date();
        if (now < player.breedingSlot.finishesAt) {
            const timeLeft = player.breedingSlot.finishesAt - now;
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return message.reply({
                embeds: [createWarningEmbed(
                    "Not Ready Yet", 
                    `The pets still need **${hoursLeft}h ${minutesLeft}m** to finish breeding!`
                )]
            });
        }

        const pet1 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet1Id });
        const pet2 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet2Id });
        
        if (!pet1 || !pet2) {
            return message.reply({
                embeds: [createErrorEmbed("Error", "One or both breeding pets could not be found!")]
            });
        }

        const pet1Data = GameData.getPet(pet1.basePetId);
        const pet2Data = GameData.getPet(pet2.basePetId);

        // Check for special breeding combinations
        let eggId = null;
        if (pet1Data.breeding && pet1Data.breeding.partner === pet2.basePetId) {
            eggId = pet1Data.breeding.egg;
        } else if (pet2Data.breeding && pet2Data.breeding.partner === pet1.basePetId) {
            eggId = pet2Data.breeding.egg;
        } else {
            // Default breeding - create an egg based on parent types
            const parentTypes = [pet1Data.type, pet2Data.type];
            if (parentTypes.includes('Aeonic')) {
                eggId = 'aeonic_egg';
            } else if (parentTypes.includes('Abyssal')) {
                eggId = 'abyssal_egg';
            } else if (parentTypes.includes('Beast')) {
                eggId = 'beast_egg';
            } else if (parentTypes.includes('Elemental')) {
                eggId = 'elemental_egg';
            } else if (parentTypes.includes('Mystic')) {
                eggId = 'mystic_egg';
            } else if (parentTypes.includes('Undead')) {
                eggId = 'undead_egg';
            } else if (parentTypes.includes('Mechanical')) {
                eggId = 'mechanical_egg';
            } else {
                eggId = 'beast_egg'; // Fallback
            }
        }

        // Add egg to inventory
        const existingEgg = player.inventory.find(item => item.itemId === eggId);
        if (existingEgg) {
            existingEgg.quantity++;
        } else {
            player.inventory.push({ itemId: eggId, quantity: 1 });
        }

        if (labEffects?.breedingExtraEggChance && Math.random() < labEffects.breedingExtraEggChance) {
            const bonusEgg = player.inventory.find(item => item.itemId === eggId);
            if (bonusEgg) {
                bonusEgg.quantity++;
            } else {
                player.inventory.push({ itemId: eggId, quantity: 1 });
            }
        }

        // Set pets back to Idle and clear breeding slot
        pet1.status = 'Idle';
        pet2.status = 'Idle';
        await pet1.save();
        await pet2.save();

        player.breedingSlot = { pet1Id: null, pet2Id: null, finishesAt: null };
        
        // Update player stats
        player.stats.eggsProduced = (player.stats.eggsProduced || 0) + 1;
        await player.save();

        await updateQuestProgress(message.author.id, 'breed_pals', 1);

        // Emit achievement event
        client.emit('palsBred', message.author.id);

        const eggItem = GameData.getItem(eggId);
        return message.reply({
            embeds: [createSuccessEmbed(
                "Breeding Complete!", 
                `🥚 **${pet1Data.name} #${pet1.shortId}** and **${pet2Data.name} #${pet2.shortId}** have produced a **${eggItem.name}**!\n\n` +
                `The egg has been added to your inventory. Use \`${prefix}incubate\` to hatch it!`
            )]
        });
    },

    async handleRemove(message, player, prefix) {
        if (!player.breedingSlot || !player.breedingSlot.pet1Id || !player.breedingSlot.pet2Id) {
            return message.reply({
                embeds: [createErrorEmbed("Nothing to Remove", "There are no pets in your breeding pen!")]
            });
        }

        const pet1 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet1Id });
        const pet2 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet2Id });

        // Set pets back to Idle
        if (pet1) {
            pet1.status = 'Idle';
            await pet1.save();
        }
        if (pet2) {
            pet2.status = 'Idle';
            await pet2.save();
        }

        // Clear breeding slot
        player.breedingSlot = { pet1Id: null, pet2Id: null, finishesAt: null };
        await player.save();

        const pet1Data = pet1 ? GameData.getPet(pet1.basePetId) : null;
        const pet2Data = pet2 ? GameData.getPet(pet2.basePetId) : null;

        return message.reply({
            embeds: [createSuccessEmbed(
                "Pets Removed", 
                `${pet1Data ? `**${pet1Data.name} #${pet1.shortId}**` : 'Pet 1'} and ${pet2Data ? `**${pet2Data.name} #${pet2.shortId}**` : 'Pet 2'} have been removed from the breeding pen.`
            )]
        });
    },

    async handleAddPets(message, player, shortId1, shortId2, prefix, labEffects) {
        if (player.breedingSlot && (player.breedingSlot.pet1Id || player.breedingSlot.pet2Id)) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Breeding Pen Occupied", 
                    `Your breeding pen is already in use! Use \`${prefix}breed status\` to check progress or \`${prefix}breed remove\` to clear it.`
                )]
            });
        }

        if (shortId1 === shortId2) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Invalid Combination", 
                    "You cannot breed a pet with itself! Please select two different pets."
                )]
            });
        }

        // Find both pets
        const pet1 = await Pet.findOne({ ownerId: message.author.id, shortId: shortId1 });
        const pet2 = await Pet.findOne({ ownerId: message.author.id, shortId: shortId2 });

        if (!pet1) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Pet Not Found", 
                    `You don't have a pet with ID #${shortId1}.`
                )]
            });
        }

        if (!pet2) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Pet Not Found", 
                    `You don't have a pet with ID #${shortId2}.`
                )]
            });
        }

        // Check if pets are available for breeding
        if (pet1.status !== 'Idle') {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Pet Unavailable", 
                    `**${GameData.getPet(pet1.basePetId)?.name || 'Unknown'} #${pet1.shortId}** is currently ${pet1.status.toLowerCase()} and cannot breed right now.`
                )]
            });
        }

        if (pet2.status !== 'Idle') {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Pet Unavailable", 
                    `**${GameData.getPet(pet2.basePetId)?.name || 'Unknown'} #${pet2.shortId}** is currently ${pet2.status.toLowerCase()} and cannot breed right now.`
                )]
            });
        }

        // Check breeding level requirement (level 5+)
        if (pet1.level < 5) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Pet Too Young", 
                    `**${GameData.getPet(pet1.basePetId)?.name || 'Unknown'} #${pet1.shortId}** must be at least level 5 to breed (currently level ${pet1.level}).`
                )]
            });
        }

        if (pet2.level < 5) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Pet Too Young", 
                    `**${GameData.getPet(pet2.basePetId)?.name || 'Unknown'} #${pet2.shortId}** must be at least level 5 to breed (currently level ${pet2.level}).`
                )]
            });
        }

        const pet1Data = GameData.getPet(pet1.basePetId);
        const pet2Data = GameData.getPet(pet2.basePetId);

        // Check for special breeding combinations
        let breedingTime = 240; // Default 4 hours
        let statusMessage = "The pets are getting to know each other...";
        
        if (pet1Data.breeding && pet1Data.breeding.partner === pet2.basePetId) {
            breedingTime = pet1Data.breeding.timeMinutes;
            statusMessage = "The pets are coming closer together! This looks like a special combination...";
        } else if (pet2Data.breeding && pet2Data.breeding.partner === pet1.basePetId) {
            breedingTime = pet2Data.breeding.timeMinutes;
            statusMessage = "The pets are coming closer together! This looks like a special combination...";
        }

        // Set pets to breeding status
        pet1.status = 'Breeding';
        pet2.status = 'Breeding';
        await pet1.save();
        await pet2.save();

        const timeReduction = Math.min(labEffects?.breedingTimeReduction || 0, 0.9);
        breedingTime = Math.max(30, Math.round(breedingTime * (1 - timeReduction)));

        // Set breeding slot
        const finishTime = new Date(Date.now() + breedingTime * 60 * 1000);
        player.breedingSlot = {
            pet1Id: shortId1,
            pet2Id: shortId2,
            finishesAt: finishTime
        };
        await player.save();

        const hours = Math.floor(breedingTime / 60);
        const minutes = breedingTime % 60;
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return message.reply({
            embeds: [createSuccessEmbed(
                "Pets Placed in Breeding Pen", 
                `**${pet1Data.name} #${pet1.shortId}** and **${pet2Data.name} #${pet2.shortId}** have been placed in the breeding pen!\n\n` +
                `**Breeding Time:** ${timeStr}\n` +
                `**Status:** ${statusMessage}\n\n` +
                `Use \`${prefix}breed status\` to check progress or \`${prefix}breed claim\` when ready!`
            )]
        });
    },

    async handleRemove(message, player, prefix) {
        if (!player.breedingSlot || !player.breedingSlot.pet1Id || !player.breedingSlot.pet2Id) {
            return message.reply({
                embeds: [createErrorEmbed("Nothing to Remove", "There are no pets in your breeding pen!")]
            });
        }

        const pet1 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet1Id });
        const pet2 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet2Id });

        // Set pets back to Idle
        if (pet1) {
            pet1.status = 'Idle';
            await pet1.save();
        }
        if (pet2) {
            pet2.status = 'Idle';
            await pet2.save();
        }

        // Clear breeding slot
        player.breedingSlot = { pet1Id: null, pet2Id: null, finishesAt: null };
        await player.save();

        const pet1Data = pet1 ? GameData.getPet(pet1.basePetId) : null;
        const pet2Data = pet2 ? GameData.getPet(pet2.basePetId) : null;

        return message.reply({
            embeds: [createSuccessEmbed(
                "Pets Removed", 
                `${pet1Data ? `**${pet1Data.name} #${pet1.shortId}**` : 'Pet 1'} and ${pet2Data ? `**${pet2Data.name} #${pet2.shortId}**` : 'Pet 2'} have been removed from the breeding pen.`
            )]
        });
    },

    async handleInteractiveMenu(message, player, client, prefix, labEffects) {
        if (player.breedingSlot && (player.breedingSlot.pet1Id || player.breedingSlot.pet2Id)) {
            // If there are already pets, just show status
            return this.handleStatus(message, player, prefix, labEffects);
        }

        const playerPets = await Pet.find({ 
            ownerId: message.author.id, 
            status: 'Idle',
            level: { $gte: 5 }
        }).sort({ shortId: 1 });

        if (playerPets.length < 2) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Not Enough Pets", 
                    "You need at least 2 idle pets at level 5+ to start breeding!"
                )]
            });
        }

        // Create pet selection options (limit to 25 for Discord)
        const petOptions = playerPets.slice(0, 25).map(pet => {
            const petData = GameData.getPet(pet.basePetId);
            return {
                label: `${petData.name} #${pet.shortId} (Lv.${pet.level})`,
                value: pet.shortId.toString(),
                description: `${petData.type} - ${petData.rarity}`
            };
        });

        let description = "**🏠 Breeding Pen**\n\n";
        description += "Select two pets from the menu below to begin breeding them.\n\n";
        description += "**Requirements:**\n";
        description += "• Both pets must be level 5+\n";
        description += "• Both pets must be idle\n";
        description += "• Cannot breed a pet with itself\n\n";
        
        if (playerPets.length > 25) {
            description += `⚠️ **Note:** You have ${playerPets.length} available pets, but only the first 25 are shown. Use \`${prefix}breed add <pet1 id> <pet2 id>\` for specific pets.\n\n`;
        }
        
        description += `You can also use:\n`;
        description += `• \`${prefix}breed add <pet1 id> <pet2 id>\` - Place specific pets\n`;
        description += `• \`${prefix}breed status\` - Check breeding status\n`;
        description += `• \`${prefix}breed remove\` - Remove pets from pen`;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('breed_select_pet1')
            .setPlaceholder('Select first pet for breeding...')
            .addOptions(petOptions);

        const cancelButton = new ButtonBuilder()
            .setCustomId('breed_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const components = [
            new ActionRowBuilder().addComponents(selectMenu),
            new ActionRowBuilder().addComponents(cancelButton)
        ];

        const reply = await message.reply({
            embeds: [createInfoEmbed("Select Pets for Breeding", description)],
            components: components
        });

        let selectedPet1 = null;

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 120000 // 2 minutes
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'breed_select_pet1') {
                const selectedShortId = parseInt(i.values[0]);
                selectedPet1 = playerPets.find(pet => pet.shortId === selectedShortId);
                
                if (!selectedPet1) {
                    await i.update({
                        embeds: [createErrorEmbed("Error", "Selected pet not found!")],
                        components: []
                    });
                    return;
                }

                // Create second pet selection menu (excluding the first pet)
                const remainingPets = playerPets.filter(pet => pet.shortId !== selectedShortId);
                const petOptions2 = remainingPets.slice(0, 25).map(pet => {
                    const petData = GameData.getPet(pet.basePetId);
                    return {
                        label: `${petData.name} #${pet.shortId} (Lv.${pet.level})`,
                        value: pet.shortId.toString(),
                        description: `${petData.type} - ${petData.rarity}`
                    };
                });

                const selectMenu2 = new StringSelectMenuBuilder()
                    .setCustomId('breed_select_pet2')
                    .setPlaceholder('Select second pet for breeding...')
                    .addOptions(petOptions2);

                const backButton = new ButtonBuilder()
                    .setCustomId('breed_back')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary);

                const cancelButton2 = new ButtonBuilder()
                    .setCustomId('breed_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger);

                const components2 = [
                    new ActionRowBuilder().addComponents(selectMenu2),
                    new ActionRowBuilder().addComponents(backButton, cancelButton2)
                ];

                const pet1Data = GameData.getPet(selectedPet1.basePetId);
                await i.update({
                    embeds: [createInfoEmbed(
                        "Select Second Pet", 
                        `**First Pet Selected:** ${pet1Data.name} #${selectedPet1.shortId}\n\n` +
                        "Now select the second pet to breed with:"
                    )],
                    components: components2
                });

            } else if (i.customId === 'breed_select_pet2') {
                const selectedShortId2 = parseInt(i.values[0]);
                const selectedPet2 = playerPets.find(pet => pet.shortId === selectedShortId2);
                
                if (!selectedPet2 || !selectedPet1) {
                    await i.update({
                        embeds: [createErrorEmbed("Error", "Selected pets not found!")],
                        components: []
                    });
                    return;
                }

                // Start breeding process
                const pet1Data = GameData.getPet(selectedPet1.basePetId);
                const pet2Data = GameData.getPet(selectedPet2.basePetId);

                // Check for special breeding combinations
                let breedingTime = 480; // Default 8 hours
                let statusMessage = "The pets are getting to know each other...";
                
                if (pet1Data.breeding && pet1Data.breeding.partner === selectedPet2.basePetId) {
                    breedingTime = pet1Data.breeding.timeMinutes;
                    statusMessage = "The pets are coming closer together! This looks like a special combination...";
                } else if (pet2Data.breeding && pet2Data.breeding.partner === selectedPet1.basePetId) {
                    breedingTime = pet2Data.breeding.timeMinutes;
                    statusMessage = "The pets are coming closer together! This looks like a special combination...";
                }

                // Set pets to breeding status
                selectedPet1.status = 'Breeding';
                selectedPet2.status = 'Breeding';
                await selectedPet1.save();
                await selectedPet2.save();

                // Set breeding slot
                const finishTime = new Date(Date.now() + breedingTime * 60 * 1000);
                player.breedingSlot = {
                    pet1Id: selectedPet1.shortId,
                    pet2Id: selectedPet2.shortId,
                    finishesAt: finishTime
                };
                await player.save();

                const hours = Math.floor(breedingTime / 60);
                const minutes = breedingTime % 60;
                const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                await i.update({
                    embeds: [createSuccessEmbed(
                        "Breeding Started!", 
                        `**${pet1Data.name} #${selectedPet1.shortId}** and **${pet2Data.name} #${selectedPet2.shortId}** have been placed in the breeding pen!\n\n` +
                        `**Breeding Time:** ${timeStr}\n` +
                        `**Status:** ${statusMessage}\n\n` +
                        `Use \`${prefix}breed status\` to check progress or \`${prefix}breed claim\` when ready!`
                    )],
                    components: []
                });

            } else if (i.customId === 'breed_back') {
                // Go back to first pet selection
                selectedPet1 = null;
                await i.update({
                    embeds: [createInfoEmbed("Select Pets for Breeding", description)],
                    components: components
                });

            } else if (i.customId === 'breed_cancel') {
                await i.update({
                    embeds: [createWarningEmbed("Cancelled", "Breeding interface closed.")],
                    components: []
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                reply.edit({
                    embeds: [createWarningEmbed("Timed Out", "Breeding interface has timed out.")],
                    components: []
                }).catch(() => {});
            }
        });
    }
};