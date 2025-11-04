const allDungeons = require('../../gamedata/dungeons');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embed');

const dungeonsArray = Object.entries(allDungeons).map(([id, dungeon]) => ({ id, ...dungeon }));

// Embed for the full list of dungeons
const generateListEmbed = (prefix) => {
    const embed = createInfoEmbed(
        '⚔️ Available Dungeons',
        'Send your Pals on expeditions to these dangerous locations to find rare loot and gain experience.'
    );

    dungeonsArray.forEach(dungeon => {
        embed.addFields({
            name: `● ${dungeon.name} (Tier ${dungeon.tier})`,
            value:
                `Requires Pal Lvl: ${dungeon.levelRequirement}\n` +
                `Floors: ${dungeon.floors}\n` +
                `Stamina Cost: ${dungeon.staminaCost}`,
            inline: false
        });
    });
    embed.setFooter({ text: `Use ${prefix}dungeons <dungeon> to view more info` });

    return embed;
};

// Embed for a single dungeon
const generateDungeonEmbed = (dungeon) => {
    const embed = createInfoEmbed(
        `⚔️ ${dungeon.name} (Tier ${dungeon.tier})`,
        `Requires Pal Lvl: **${dungeon.levelRequirement}**`
    );

    embed.addFields(
        { name: 'Floors', value: `${dungeon.floors}`, inline: true },
        { name: 'Stamina Cost', value: `${dungeon.staminaCost}`, inline: true }
    );

    embed.addFields(
        { name: 'Enemies', value: dungeon.enemyPool.map(e => `• ${toTitleCase(e)}`).join('\n'), inline: true },
        { name: 'Boss', value: toTitleCase(dungeon.boss), inline: true }
    );

    embed.setThumbnail(dungeon.pic);
    // Rewards
    let lootText = dungeon.baseRewards.lootTable.map(
        loot => `• ${toTitleCase(loot.itemId)}`
    ).join('\n');

    let eggText = dungeon.baseRewards.eggTable.map(
        egg => `🥚 ${toTitleCase(egg.itemId)}`
    ).join('\n');

    embed.addFields(
        { name: 'Loot', value: lootText || 'None', inline: false },
        { name: 'Eggs', value: eggText || 'None', inline: false },
    );

    if (dungeon.guaranteedReward) {
        embed.addFields({
            name: 'Guaranteed Reward',
            value: `${toTitleCase(dungeon.guaranteedReward.itemId)} x${dungeon.guaranteedReward.quantity}`,
            inline: false
        });
    }

    return embed;
};

module.exports = {
    name: 'dungeons',
    description: 'Displays a list of all available dungeons, or details about a specific dungeon.',
    aliases: ['alldungeons', 'expeditions'],
    async execute(message, args, client, prefix) {
        try {
            if (args.length > 0) {
                const query = args.join(' ').toLowerCase();

                const dungeon =
                    dungeonsArray.find(d => d.name.toLowerCase() === query) ||
                    dungeonsArray.find(d => d.name.toLowerCase().includes(query));

                if (!dungeon) {
                    return message.reply({
                        embeds: [createErrorEmbed('Not Found', `No dungeon found with the name **${args.join(' ')}**.`)]
                    });
                }

                return message.reply({ embeds: [generateDungeonEmbed(dungeon)] });
            }

            // Default list view
            return message.reply({ embeds: [generateListEmbed(prefix)] });
        } catch (error) {
            console.error('Alldungeons command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem displaying the dungeons list.')]
            });
        }
    }
};

function toTitleCase(str) {
    return str
        .split('_')                        
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');                        
}