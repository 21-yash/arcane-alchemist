const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embed');
const CommandHelpers = require('../../utils/commandHelpers');
const { steps, TOTAL_STEPS, TUTORIAL_COLOR, COMPLETION_REWARDS } = require('../../gamedata/tutorial');

/**
 * Build the tutorial embed for a given step, replacing {prefix} placeholders.
 */
function buildTutorialEmbed(step, prefix, user) {
    const data = steps[step];
    if (!data) return null;

    const replacePlaceholders = (text) => text.replace(/\{prefix\}/g, prefix);

    const embed = new EmbedBuilder()
        .setColor(TUTORIAL_COLOR)
        .setTitle(data.title)
        .setDescription(replacePlaceholders(data.description))
        .setFooter({ 
            text: `${data.footer} • ${user.username}`, 
            iconURL: user.displayAvatarURL() 
        })
        .setTimestamp();

    if (data.fields && data.fields.length > 0) {
        embed.addFields(data.fields.map(f => ({
            name: f.name,
            value: replacePlaceholders(f.value),
            inline: f.inline ?? false
        })));
    }

    return embed;
}

/**
 * Build the navigation buttons for the tutorial.
 */
function buildButtons(currentStep, isLastStep) {
    const row = new ActionRowBuilder();

    // Back button (disabled on step 1)
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('tutorial_back')
            .setLabel('◀ Back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentStep <= 1)
    );

    if (isLastStep) {
        // Finish button on the last step
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('tutorial_finish')
                .setLabel('✨ Finish Tutorial')
                .setStyle(ButtonStyle.Success)
        );
    } else {
        // Next button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('tutorial_next')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Primary)
        );
    }

    // Skip button (always available)
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('tutorial_skip')
            .setLabel('Skip Tutorial')
            .setStyle(ButtonStyle.Danger)
    );

    return row;
}

module.exports = {
    name: 'tutorial',
    description: 'Start or continue the interactive tutorial — learn the basics of Arcane Alchemist!',
    aliases: ['tut'],
    usage: '',
    async execute(message, args, client, prefix) {
        try {
            // --- Validate player exists ---
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            // --- Handle "reset" subcommand ---
            if (args[0] && args[0].toLowerCase() === 'reset') {
                player.tutorialStep = 1;
                await player.save();
                // Fall through to show step 1
            }

            // --- If tutorial is already completed ---
            if (player.tutorialStep === -1 && !(args[0] && args[0].toLowerCase() === 'reset')) {
                const embed = createCustomEmbed(
                    '🧙‍♂️ Tutorial Already Completed',
                    `You've already completed the tutorial! Use \`${prefix}guide\` for in-depth guides, or \`${prefix}help\` for a full command list.\n\n*Use \`${prefix}tutorial reset\` to replay the tutorial.*`,
                    TUTORIAL_COLOR
                );
                return message.reply({ embeds: [embed] });
            }

            // --- Determine starting step ---
            let currentStep = player.tutorialStep;
            if (currentStep <= 0) {
                currentStep = 1;
                player.tutorialStep = 1;
                await player.save();
            }

            // --- Send the initial embed ---
            const embed = buildTutorialEmbed(currentStep, prefix, message.author);
            const buttons = buildButtons(currentStep, currentStep >= TOTAL_STEPS);

            const tutorialMessage = await message.reply({ embeds: [embed], components: [buttons] });

            // --- Collector for button interactions ---
            const collector = tutorialMessage.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                try {
                    if (interaction.customId === 'tutorial_next') {
                        currentStep = Math.min(currentStep + 1, TOTAL_STEPS);
                    } else if (interaction.customId === 'tutorial_back') {
                        currentStep = Math.max(currentStep - 1, 1);
                    } else if (interaction.customId === 'tutorial_finish') {
                        // Complete the tutorial & give rewards
                        player.tutorialStep = -1;
                        player.gold += COMPLETION_REWARDS.gold;
                        player.stamina = Math.min(player.stamina + COMPLETION_REWARDS.stamina, player.maxStamina);
                        await player.save();

                        const completeEmbed = createCustomEmbed(
                            '🎉 Tutorial Complete!',
                            `Congratulations, **${message.author.displayName}**! You've completed the Arcane Alchemist tutorial.\n\n` +
                            `**Rewards earned:**\n` +
                            `> 💰 **+${COMPLETION_REWARDS.gold} Gold**\n` +
                            `> ⚡ **+${COMPLETION_REWARDS.stamina} Stamina**\n\n` +
                            `*Eldric nods approvingly.* "Go forth and make your mark upon this world, alchemist!"\n\n` +
                            `Use \`${prefix}help\` to see all available commands. Good luck! ✨`,
                            '#22C55E'
                        );

                        await interaction.update({ embeds: [completeEmbed], components: [] });
                        collector.stop('completed');
                        return;
                    } else if (interaction.customId === 'tutorial_skip') {
                        // Skip the tutorial
                        player.tutorialStep = -1;
                        await player.save();

                        const skipEmbed = createCustomEmbed(
                            '⏩ Tutorial Skipped',
                            `*Eldric sighs but understands.* "Some learn best by doing. Very well!"\n\n` +
                            `You can always replay the tutorial with \`${prefix}tutorial reset\`.\n` +
                            `For help anytime, use \`${prefix}guide\` or \`${prefix}help\`.`,
                            '#F59E0B'
                        );

                        await interaction.update({ embeds: [skipEmbed], components: [] });
                        collector.stop('skipped');
                        return;
                    }

                    // Save the current step progress
                    player.tutorialStep = currentStep;
                    await player.save();

                    // Update the message with the new step
                    const newEmbed = buildTutorialEmbed(currentStep, prefix, message.author);
                    const newButtons = buildButtons(currentStep, currentStep >= TOTAL_STEPS);
                    await interaction.update({ embeds: [newEmbed], components: [newButtons] });
                } catch (err) {
                    console.error('Tutorial interaction error:', err);
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    const timeoutEmbed = createCustomEmbed(
                        '⏰ Tutorial Paused',
                        `Your tutorial session has timed out. Don't worry — your progress is saved at **Step ${currentStep}**!\n\n` +
                        `Use \`${prefix}tutorial\` to pick up where you left off.`,
                        TUTORIAL_COLOR
                    );
                    await tutorialMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Tutorial command error:', error);
            await message.reply({ 
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem with the tutorial. Please try again later.')] 
            });
        }
    }
};
