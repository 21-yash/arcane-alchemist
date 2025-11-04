const allBiomes = require('../../gamedata/biomes');
const allPals = require('../../gamedata/pets'); // to resolve pal names
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embed');

// helper: convert this_text → This Text
const toTitleCase = (str) =>
    str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const biomesArray = Object.entries(allBiomes).map(([id, biome]) => ({ id, ...biome }));

// Embed for full biome list
const generateListEmbed = (prefix) => {
    const embed = createInfoEmbed(
        '🌿 Forageable Biomes',
        'These are the locations you can visit to gather ingredients. Higher level biomes yield rarer materials.'
    );

    biomesArray.forEach(biome => {
        embed.addFields({
            name: `● ${biome.name} (Lvl. ${biome.levelRequirement}+)`,
            value: `*${biome.description}*\n**Stamina Cost:** ${biome.staminaCost}`,
            inline: false
        });
    });
    embed.setFooter({ text: `Use ${prefix}biome <biome> to view more info`});

    return embed;
};

// Embed for single biome
const generateBiomeEmbed = (biome) => {
    const embed = createInfoEmbed(
        `🌿 ${biome.name}`,
        biome.description
    );

    embed.addFields(
        { name: 'Level Requirement', value: `${biome.levelRequirement}+`, inline: true },
        { name: 'Stamina Cost', value: `${biome.staminaCost}`, inline: true }
    );
    embed.setThumbnail(biome.pic);
    // Loot table
    const lootText = biome.lootTable.map(
        loot => `• ${toTitleCase(loot.itemId)}`
    ).join('\n');

    embed.addFields({ name: 'Loot Table', value: lootText || 'None', inline: false });

    // Possible Pals
    if (biome.possiblePals?.length) {
        const palsText = biome.possiblePals.map(p => {
            const palName = allPals[p.palId]?.name || toTitleCase(p.palId);
            return `• ${palName}`;
        }).join('\n');

        embed.addFields({ name: 'Possible Pals', value: palsText, inline: false });
    }

    return embed;
};

module.exports = {
    name: 'biomes',
    description: 'Displays a list of all forageable biomes, or details about a specific biome.',
    aliases: ['allbiomes', 'locations', 'biome'],
    async execute(message, args, client, prefix) {
        try {
            if (args.length > 0) {
                const query = args.join(' ').toLowerCase();

                const biome =
                    biomesArray.find(b => b.name.toLowerCase() === query) ||
                    biomesArray.find(b => b.name.toLowerCase().includes(query));

                if (!biome) {
                    return message.reply({
                        embeds: [createErrorEmbed('Not Found', `No biome found with the name **${args.join(' ')}**.`)]
                    });
                }

                return message.reply({ embeds: [generateBiomeEmbed(biome)] });
            }

            // Default list
            return message.reply({ embeds: [generateListEmbed(prefix)] });
        } catch (error) {
            console.error('Allbiomes command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem displaying the biomes list.')]
            });
        }
    }
};