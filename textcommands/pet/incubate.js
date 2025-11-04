
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('../../utils/embed');
const allItems = require('../../gamedata/items');
const allPets = require('../../gamedata/pets');
const SkillTree = require('../../models/SkillTree');

module.exports = {
    name: "incubate",
    description: "Manage your alchemical incubator to hatch eggs into pets.",
    aliases: ['incubator', 'hatch'],
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        "No Adventure Started",
                        `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    )]
                });
            }

            // Check if player has an alchemical incubator
            const hasIncubator = player.inventory.some(item => item.itemId === 'alchemical_incubator');
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
                return this.handleStatus(message, player, prefix);
            }
            
            if (subcommand === 'claim') {
                return this.handleClaim(message, player, client, prefix);
            }

            // Handle placing specific egg by name
            if (subcommand && subcommand !== 'status' && subcommand !== 'claim') {
                const eggName = args.join('_').toLowerCase();
                return this.handlePlaceEggByName(message, player, eggName, prefix);
            }

            // Default behavior - show interactive menu
            return this.handleInteractiveMenu(message, player, client, prefix);

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

    async handleStatus(message, player, prefix) {
        let description = "**🧪 Alchemical Incubator Status**\n\n";
        
        if (player.hatchingSlot.eggId) {
            const eggItem = allItems[player.hatchingSlot.eggId];
            const now = new Date();
            const timeLeft = player.hatchingSlot.hatchesAt - now;
            
            if (timeLeft <= 0) {
                description += `✨ **Ready to Hatch!**\n`;
                description += `> Egg: **${eggItem.name}**\n`;
                description += `> Status: **Ready for collection!**\n`;
                description += `\nUse \`${prefix}incubate claim\` to hatch your egg!`;
            } else {
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                description += `🥚 **Currently Incubating**\n`;
                description += `> Egg: **${eggItem.name}**\n`;
                description += `> Time Remaining: **${hoursLeft}h ${minutesLeft}m**\n`;
            }
        } else {
            description += `📭 **Empty Incubator**\n`;
            description += `> Place an egg to start the hatching process.\n`;
            description += `\nUse \`${prefix}incubate <egg name>\` to place an egg.`;
        }
        
        return message.reply({
            embeds: [createInfoEmbed("Incubator Status", description)]
        });
    },

    async handleClaim(message, player, client, prefix) {
        if (!player.hatchingSlot.eggId) {
            return message.reply({
                embeds: [createErrorEmbed("Nothing to Claim", "There's no egg in your incubator!")]
            });
        }

        const now = new Date();
        if (now < player.hatchingSlot.hatchesAt) {
            const timeLeft = player.hatchingSlot.hatchesAt - now;
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return message.reply({
                embeds: [createWarningEmbed(
                    "Not Ready Yet", 
                    `Your egg still needs **${hoursLeft}h ${minutesLeft}m** to finish hatching!`
                )]
            });
        }

        // Generate random pet from egg's possible pets
        const eggItem = allItems[player.hatchingSlot.eggId];
        const possiblePets = eggItem.possiblePals;
        const randomPet = possiblePets[Math.floor(Math.random() * possiblePets.length)];
        const petData = allPets[randomPet];

        // Generate next available short ID
        const maxShortId = await Pet.findOne({ ownerId: message.author.id })
            .sort({ shortId: -1 })
            .select('shortId')
            .exec();
        const nextShortId = maxShortId ? maxShortId.shortId + 1 : 1;

        // Create new pet
        const newPet = new Pet({
            ownerId: message.author.id,
            nickname: petData.name,
            basePetId: randomPet,
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
        
        // Clear the hatching slot
        player.hatchingSlot.eggId = null;
        player.hatchingSlot.hatchesAt = null;
        
        // Update player stats
        player.stats.eggsHatched = (player.stats.eggsHatched || 0) + 1;
        player.palCounter = (player.palCounter || 0) + 1;
        await player.save();

        // Emit achievement event
        client.emit('eggHatch', message.author.id);

        return message.reply({
            embeds: [createSuccessEmbed(
                "Egg Hatched!", 
                `🐣 **${petData.name}** has hatched from your ${eggItem.name}!\n\n` +
                `**Pet ID:** #${nextShortId}\n` +
                `**Rarity:** ${petData.rarity}\n` +
                `**Type:** ${petData.type}\n\n` +
                `Use \`${prefix}pet info ${nextShortId}\` to view your new companion!`
            )]
        });
    },

    async handlePlaceEggByName(message, player, eggName, prefix) {
        if (player.hatchingSlot.eggId) {
            const currentEgg = allItems[player.hatchingSlot.eggId];
            return message.reply({
                embeds: [createErrorEmbed(
                    "Incubator Occupied", 
                    `Your incubator already contains **${currentEgg.name}**! Use \`${prefix}incubate status\` to check its progress.`
                )]
            });
        }

        // Find egg by name
        const playerEggs = player.inventory.filter(item => 
            allItems[item.itemId] && allItems[item.itemId].type === 'egg'
        );

        const matchingEgg = playerEggs.find(item => 
            allItems[item.itemId].name.toLowerCase().includes(eggName)
        );

        if (!matchingEgg) {
            return message.reply({
                embeds: [createErrorEmbed(
                    "Egg Not Found", 
                    `You don't have an egg matching "${eggName}". Use \`${prefix}inventory\` to see your available eggs.`
                )]
            });
        }

        const eggItem = allItems[matchingEgg.itemId];
        
        // Remove egg from inventory
        matchingEgg.quantity--;
        if (matchingEgg.quantity <= 0) {
            player.inventory = player.inventory.filter(item => item.itemId !== matchingEgg.itemId);
        }

        // Set hatching slot
        const hatchTime = new Date(Date.now() + eggItem.hatchTimeMinutes * 60 * 1000);
        player.hatchingSlot.eggId = matchingEgg.itemId;
        player.hatchingSlot.hatchesAt = hatchTime;

        await player.save();

        return message.reply({
            embeds: [createSuccessEmbed(
                "Egg Placed", 
                `You've placed **${eggItem.name}** in the incubator! It will hatch in ${eggItem.hatchTimeMinutes} minutes.\n\n` +
                `Use \`${prefix}incubate status\` to check progress or \`${prefix}incubate claim\` when ready!`
            )]
        });
    },

    async handleInteractiveMenu(message, player, client, prefix) {
        if (player.hatchingSlot.eggId) {
            // If there's already an egg, just show status
            return this.handleStatus(message, player, prefix);
        }

        const playerEggs = player.inventory.filter(item => 
            allItems[item.itemId] && allItems[item.itemId].type === 'egg'
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
            label: `${allItems[item.itemId].name} (x${item.quantity})`,
            value: item.itemId,
            description: `Hatches in ${allItems[item.itemId].hatchTimeMinutes} minutes`
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
                const eggItem = allItems[selectedEggId];
                
                // Remove egg from inventory
                const playerEgg = player.inventory.find(item => item.itemId === selectedEggId);
                if (!playerEgg || playerEgg.quantity <= 0) {
                    await i.update({
                        embeds: [createErrorEmbed("Error", "You no longer have this egg!")],
                        components: []
                    });
                    return;
                }

                playerEgg.quantity--;
                if (playerEgg.quantity <= 0) {
                    player.inventory = player.inventory.filter(item => item.itemId !== selectedEggId);
                }

                // Set hatching slot
                const hatchTime = new Date(Date.now() + eggItem.hatchTimeMinutes * 60 * 1000);
                player.hatchingSlot.eggId = selectedEggId;
                player.hatchingSlot.hatchesAt = hatchTime;

                await player.save();

                await i.update({
                    embeds: [createSuccessEmbed(
                        "Egg Placed", 
                        `You've placed **${eggItem.name}** in the incubator! It will hatch in ${eggItem.hatchTimeMinutes} minutes.\n\n` +
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