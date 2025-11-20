const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const GameData = require('../../utils/gameData');
const { createErrorEmbed } = require('../../utils/embed');
const SkillTree = require('../../models/SkillTree');
const config = require('../../config/config.json');

module.exports = {
    name: 'start',
    description: 'Begin your journey as an Arcane Alchemist!',
    aliases: ['begin', 'join'],
    user_perm: [],
    bot_perm: [],
    async execute(message, args, client, prefix) {
        try {
            // --- 1. Check if the player already exists ---
            const existingPlayer = await Player.findOne({ userId: message.author.id });
            if (existingPlayer) {
                return message.reply({ embeds: [createErrorEmbed('Adventure Already Started', 'You have already begun your journey! Use `!profile` to see your progress.')] });
            }

            // --- 2. Get the list of available starter Pals ---
            const starterPals = Object.entries(GameData.pets)
                .filter(([id, pal]) => pal.rarity === 'Common')
                .map(([id, pal]) => ({ id, ...pal }));

            if (starterPals.length === 0) {
                 return message.reply({ embeds: [createErrorEmbed('Game Error', 'No starter Pals could be found. Please contact bot\'s support.')] });
            }

            // --- 3. Create the initial welcome embed and selection menu ---
            const createWelcomeEmbed = () => new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Welcome to Arcane Alchemist! ✨')
                .setDescription(
                    "Your journey to become the greatest alchemist begins now!\n\n" +
                    "**🌿 Forage** for rare ingredients.\n" +
                    "**🧪 Brew** powerful potions and craft mighty gear.\n" +
                    "**🐾 Tame and train** loyal Pals to aid you.\n" +
                    "**⚔️ Send** your Pals on expeditions to dangerous dungeons for epic loot."
                )
                .addFields({
                    name: 'Choose Your First Pal',
                    value: 'Select one of the companions below to join you on your adventure. This choice is permanent!'
                });

            const createSelectMenu = () => new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('starter_pal_select')
                    .setPlaceholder('Choose your companion...')
                    .addOptions(starterPals.map(pal => ({
                        label: pal.name,
                        description: `A ${pal.type}-type Pal. Rarity: ${pal.rarity}.`,
                        value: pal.id,
                        emoji: getEmojiForType(pal.type)
                    })))
            );
            
            // --- 4. Send the selection message ---
            const selectionMessage = await message.reply({ embeds: [createWelcomeEmbed()], components: [createSelectMenu()] });

            // --- 5. Wait for the player's choice ---
            const filter = (interaction) => interaction.user.id === message.author.id;
            const collector = selectionMessage.createMessageComponentCollector({
                filter,
                componentType: ComponentType.StringSelect,
                time: 60000 // 60 seconds to choose
            });

            collector.on('collect', async (selectInteraction) => {
                const chosenPalId = selectInteraction.values[0];
                const chosenPalData = GameData.getPet(chosenPalId);

                // --- Create Confirmation Embed and Buttons ---
                const confirmationEmbed = new EmbedBuilder()
                    .setColor('#FBBF24')
                    .setTitle(`Confirm Your Partner: ${chosenPalData.name}?`)
                    .setDescription(`You have selected the **${chosenPalData.name}**. Are you sure you want to begin your journey with this Pal?\n\n*${chosenPalData.description}*`)
                    .addFields(
                        { name: 'Type & Rarity', value: `${getEmojiForType(chosenPalData.type)} ${chosenPalData.type} | ${chosenPalData.rarity}`, inline: false },
                        { name: 'Base Stats', value: `❤️ HP: ${chosenPalData.baseStats.hp}\n⚔️ ATK: ${chosenPalData.baseStats.atk}\n🛡️ DEF: ${chosenPalData.baseStats.def}\n💨 SPD: ${chosenPalData.baseStats.spd}\n🍀 LUCK: ${chosenPalData.baseStats.luck}`, inline: false }
                    );
                
                const confirmationButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_start').setLabel('Yes, I\'m sure!').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('cancel_start').setLabel('No, let me choose again').setStyle(ButtonStyle.Danger)
                );

                // Update the message to show the confirmation prompt
                await selectInteraction.update({ embeds: [confirmationEmbed], components: [confirmationButtons] });

                // --- Wait for button confirmation ---
                const buttonCollector = selectionMessage.createMessageComponentCollector({
                    filter,
                    componentType: ComponentType.Button,
                    time: 30000 // 30 seconds to confirm
                });

                buttonCollector.on('collect', async (buttonInteraction) => {
                    if (buttonInteraction.customId === 'confirm_start') {
                        // --- Create the Player and Pal in the database ---
                        const newPlayer = new Player({ userId: message.author.id });

                        newPlayer.palCounter += 1;
                        const newShortId = newPlayer.palCounter;

                        const newPal = new Pet({
                            ownerId: message.author.id,
                            basePetId: chosenPalId,
                            shortId: newShortId,
                            nickname: chosenPalData.name,
                            stats: chosenPalData.baseStats,
                            type: chosenPalData.type
                        });

                        await newPlayer.save();
                        await newPal.save();

                        const skillTree = new SkillTree({
                            palId: newPal.petId,
                            skillPoints: 0,
                            unlockedSkills: []
                        });
                        await skillTree.save();

                        // --- Send the final welcome message ---
                        const finalEmbed = new EmbedBuilder()
                            .setColor('#22C55E')
                            .setTitle(`🎉 Welcome to the Guild, Alchemist!`)
                            .setDescription(`You and **${chosenPalData.name}** are now partners. Your adventure awaits!`)
                            .setThumbnail(buttonInteraction.user.displayAvatarURL())
                            .addFields({ name: 'What to do next?', value: `Try using the \`${prefix}forage\` or \`${prefix}profile\` commands to get started.` });

                        await buttonInteraction.update({ embeds: [finalEmbed], components: [] });
                        collector.stop();
                        buttonCollector.stop();

                    } else if (buttonInteraction.customId === 'cancel_start') {
                        // Revert back to the selection menu
                        await buttonInteraction.update({ embeds: [createWelcomeEmbed()], components: [createSelectMenu()] });
                        buttonCollector.stop(); // Stop listening for this confirmation
                    }
                });

                buttonCollector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        const timeoutEmbed = createErrorEmbed('Confirmation Timed Out', `You did not confirm your choice in time. Please run the \`${prefix}start\` command again.`);
                        selectionMessage.edit({ embeds: [timeoutEmbed], components: [] });
                    }
                });
            });

            collector.on('end', (collected, reason) => {
                // Check if the collector stopped because a choice was made, not just because it timed out
                if (reason === 'time' && collected.size === 0) {
                    const timeoutEmbed = createErrorEmbed('Selection Timed Out', `You did not choose a Pal in time. Please run the \`${prefix}start\` command again.`);
                    selectionMessage.edit({ embeds: [timeoutEmbed], components: [] });
                }
            });

        } catch (error) {
            console.error('Start command error:', error);
            await message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem starting your adventure. Please try again later.')] });
        }
    }
};

// Helper function to assign emojis to Pal types
function getEmojiForType(type) {
    switch (type) {
        case 'Beast': return config.emojis['Forest Rabbit'];
        case 'Elemental': return config.emojis['Flame Sprite'];
        case 'Mystic': return config.emojis['Sproutling'];
        case 'Undead': return config.emojis['Skeletal Rat'];
        case 'Mechanical': return config.emojis['Gear Pup'];
        case 'Aeonic': return config.emojis['Dustwing Moth'];
        case 'Abyssal': return config.emojis['Void Mite'];
        default: return '❓';
    }
}