const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const Player = require('../../models/Player');
const { createErrorEmbed } = require('../../utils/embed');
const CommandHelpers = require('../../utils/commandHelpers');
const { grantPlayerXp } = require('../../utils/leveling');
const { steps, TOTAL_STEPS, TUTORIAL_COLOR, COMPLETION_REWARDS } = require('../../gamedata/tutorial');
const e = require('../../utils/emojis');

// Track active tutorial listeners per user: { listener, client, type }
const activeTutorialListeners = new Map();

// ── Container Builders ──────────────────────────────────────────────

function buildStepContainer(prefix, stepNumber) {
    const data = steps[stepNumber];
    if (!data) return null;

    const text = typeof data.text === 'function' ? data.text(prefix) : data.text;

    const container = new ContainerBuilder().setAccentColor(TUTORIAL_COLOR);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    if (!data.isLast) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${e.loading} **Waiting for you to use the command above...**\n-# Step ${stepNumber} of ${TOTAL_STEPS}`
            )
        );
    }

    return container;
}

function buildCompletionContainer(prefix) {
    const data = steps[TOTAL_STEPS];
    const text = typeof data.text === 'function' ? data.text(prefix) : data.text;

    const container = new ContainerBuilder().setAccentColor(0x22C55E);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
    );
    return container;
}

function buildTimeoutContainer(stepNumber, prefix) {
    const container = new ContainerBuilder().setAccentColor(0xF59E0B);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## ⏰ Tutorial Paused\n\n` +
            `Your progress is saved at **Step ${stepNumber}**.\n` +
            `Use \`${prefix}tutorial\` to pick up where you left off.`
        )
    );
    return container;
}

// ── Main Command ────────────────────────────────────────────────────

module.exports = {
    name: 'tutorial',
    description: 'Start or continue the interactive tutorial — learn by doing!',
    aliases: ['tut'],
    usage: '',
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            // Already completed
            if (player.tutorialStep === -1) {
                const container = new ContainerBuilder().setAccentColor(TUTORIAL_COLOR);
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🧙‍♂️ Tutorial Already Completed\n\n` +
                        `You've already finished the tutorial!\n\n` +
                        `> 📖 \`${prefix}guide\` for in-depth guides\n` +
                        `> ❓ \`${prefix}help\` for all commands`
                    )
                );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            // Determine starting step
            let currentStep = player.tutorialStep;
            if (currentStep <= 0) {
                currentStep = 1;
                player.tutorialStep = 1;
                await player.save();
            }

            // Run onEnter hook if one exists
            const stepData = steps[currentStep];
            if (stepData?.onEnter) {
                stepData.onEnter(player);
                await player.save();
            }

            // Clean up any previous listener
            this.cleanupListener(message.author.id);

            // Send the step container
            const stepContainer = buildStepContainer(prefix, currentStep);
            const reply = await message.reply({
                components: [stepContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Set up the listener for this step
            this.setupStepListener(reply, message, player, currentStep, client, prefix);

        } catch (error) {
            console.error('Tutorial command error:', error);
            await message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem with the tutorial. Please try again later.')]
            });
        }
    },

    /**
     * Set up listener for a tutorial step.
     * Handles both command-based steps (messageCreate) and event-based steps (waitForEvent).
     */
    setupStepListener(reply, originalMessage, player, stepNumber, client, prefix) {
        const stepData = steps[stepNumber];
        if (!stepData) return;

        const userId = originalMessage.author.id;

        // ── Final step: buttons only ──
        if (stepData.isLast) {
            return;
        }

        // ── Event-based step (e.g., potionBrewed) ──
        if (stepData.waitForEvent) {
            const eventName = stepData.waitForEvent;

            const eventListener = async (eventUserId) => {
                if (eventUserId !== userId) return;

                // Event matched — advance tutorial
                this.cleanupListener(userId);
                this.advanceToNextStep(originalMessage, stepNumber, client, prefix);
            };

            activeTutorialListeners.set(userId, { listener: eventListener, client, type: 'event', eventName });
            client.on(eventName, eventListener);
            return;
        }

        // ── Command-based step (messageCreate) ──
        const expectedCommands = stepData.expectedCommands || [];
        if (expectedCommands.length === 0) return;

        const messageListener = async (msg) => {
            if (msg.author.id !== userId) return;
            if (!msg.content.startsWith(prefix)) return;

            const content = msg.content.slice(prefix.length).trim();
            const commandName = content.split(/\s+/)[0]?.toLowerCase();

            // Resolve aliases
            const command = client.textCommands.get(commandName) ||
                [...client.textCommands.values()].find(c => c.aliases?.includes(commandName));
            if (!command) return;

            const resolvedName = command.name;
            if (!expectedCommands.includes(resolvedName)) return;

            // Command matched — advance tutorial
            this.cleanupListener(userId);
            this.advanceToNextStep(originalMessage, stepNumber, client, prefix);
        };

        activeTutorialListeners.set(userId, { listener: messageListener, client, type: 'message' });
        client.on('messageCreate', messageListener);
    },

    /**
     * Advance to the next tutorial step after a delay.
     */
    advanceToNextStep(originalMessage, currentStep, client, prefix) {
        const nextStep = currentStep + 1;
        if (nextStep > TOTAL_STEPS) return;

        // Small delay so the command's response appears first
        setTimeout(async () => {
            try {
                const freshPlayer = await Player.findOne({ userId: originalMessage.author.id });
                if (!freshPlayer) return;

                freshPlayer.tutorialStep = nextStep;

                // Run onEnter for next step
                const nextStepData = steps[nextStep];
                if (nextStepData?.onEnter) {
                    nextStepData.onEnter(freshPlayer);
                }

                if (nextStepData?.isLast) {
                    freshPlayer.tutorialStep = -1;
                    freshPlayer.gold += COMPLETION_REWARDS.gold;
                    freshPlayer.stamina = Math.min(freshPlayer.stamina + COMPLETION_REWARDS.stamina, freshPlayer.maxStamina);
                    await grantPlayerXp(client, originalMessage, freshPlayer, COMPLETION_REWARDS.xp);
                }

                await freshPlayer.save();

                const nextContainer = buildStepContainer(prefix, nextStep);
                const newReply = await originalMessage.channel.send({
                    components: [nextContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                // Set up the listener for the new step
                this.setupStepListener(newReply, originalMessage, freshPlayer, nextStep, client, prefix);
            } catch (err) {
                console.error('Tutorial advance error:', err);
            }
        }, 2000);
    },

    /**
     * Clean up active listener for a user (removes from client properly)
     */
    cleanupListener(userId) {
        const entry = activeTutorialListeners.get(userId);
        if (entry) {
            if (entry.type === 'event') {
                entry.client.removeListener(entry.eventName, entry.listener);
            } else {
                entry.client.removeListener('messageCreate', entry.listener);
            }
            activeTutorialListeners.delete(userId);
        }
    }
};
