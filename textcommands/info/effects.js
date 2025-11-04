const Player = require('../../models/Player');
const allItems = require('../../gamedata/items');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embed');

/**
 * Formats milliseconds into a human-readable string (e.g., 1h 15m 30s).
 * @param {number} ms The duration in milliseconds.
 * @returns {string} The formatted duration string.
 */
function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const time = {
        d: Math.floor(ms / 86400000),
        h: Math.floor(ms / 3600000) % 24,
        m: Math.floor(ms / 60000) % 60,
        s: Math.floor(ms / 1000) % 60,
    };
    return Object.entries(time)
        .filter(val => val[1] !== 0)
        .map(([key, val]) => `${val}${key}`)
        .join(' ');
}

/**
 * Generates a user-friendly description for an effect.
 * @param {object} effect The effect object from the player document.
 * @returns {string} A human-readable description of the effect's bonus.
 */
function generateEffectDescription(effect) {
    switch (effect.type) {
        case 'essence':
        case 'voter_luck':
            const increasePercent = Math.round((effect.strength - 1) * 100);
            return `Increases the chance of encountering Pals by **${increasePercent}%**.`;
        default:
            return 'Provides a mysterious benefit.';
    }
}

module.exports = {
    name: 'effects',
    description: 'Displays your currently active effects from potions and other sources.',
    aliases: ['buffs', 'activeeffects'],
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });

            if (!player) {
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`)] });
            }

            const currentTime = Date.now();
            
            // Filter out any effects that have expired
            const activeEffects = player.effects.filter(effect => effect.expiresAt && effect.expiresAt > currentTime);

            const embed = createInfoEmbed(
                'Active Effects',
                'Here are all the temporary buffs currently affecting you.'
            );

            if (activeEffects.length === 0) {
                embed.setDescription('You have no active effects.');
            } else {
                activeEffects.forEach(effect => {
                    const itemId = effect.source.toLowerCase().replace(/\s+/g, '_');
                    const itemName = allItems[itemId]?.name || 'Unknown Source';
                    const timeRemaining = formatDuration(effect.expiresAt - currentTime);
                    const effectDescription = generateEffectDescription(effect);

                    embed.addFields({
                        name: `✨ ${itemName}`,
                        value: `${effectDescription}\n⏳ Time Remaining: **${timeRemaining}**`,
                        inline: false,
                    });
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Effects command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching your active effects.')] });
        }
    },
};
