const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const allPals = require('../../gamedata/pets');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embed');
const config = require('../../config/config.json');

const PALS_PER_PAGE = 5;

// Convert the pals object to an array and add the ID to each object
const palsArray = Object.entries(allPals).map(([id, pal]) => ({ id, ...pal }));

// Helper function to generate the embed for the current page
const generateEmbed = (page, sortOrder) => {
    let sortedPals = [...palsArray];

    // Apply sorting
    switch (sortOrder) {
        case 'name_asc':
            sortedPals.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'rarity_desc':
            {
                const rarityOrder = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
                sortedPals.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
            }
            break;
        case 'rarity_asc':
            {
                const rarityOrder1 = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
                sortedPals.sort((a, b) => rarityOrder1.indexOf(a.rarity) - rarityOrder1.indexOf(b.rarity));
            }
            break;
        case 'type':
            sortedPals.sort((a, b) => a.type.localeCompare(b.type));
            break;
    }

    const start = page * PALS_PER_PAGE;
    const end = start + PALS_PER_PAGE;
    const pagePals = sortedPals.slice(start, end);

    const embed = createCustomEmbed(
        '🐾 Pal Encyclopedia',
        'A complete list of all discoverable Pals in the world of Arcane Alchemist.',
        '#A9A9A9',
        {
            footer: { text: `Page ${page + 1} of ${Math.ceil(sortedPals.length / PALS_PER_PAGE)}` },
            timestamp: false
        }
    );

    pagePals.forEach(pal => {
        embed.addFields({
            name: `${config.emojis[pal.name]} • ${pal.name}`,
            value:
                `>>> Rarity: ${pal.rarity} | Type: ${pal.type} \n*${pal.description}*\n`,
            inline: false
        });
    });

    return embed;
};

// Helper function to generate embed for a single pal
const generatePalEmbed = (pal) => {
    const embed = createCustomEmbed(
        `🐾 ${pal.name}`,
        pal.description,
        '#A9A9A9',
        { footer: { text: `Rarity: ${pal.rarity} | Type: ${pal.type}` }, timestamp: false }
    );

    embed.addFields(
        { name: 'Stats', value: `❤ **HP:** ${pal.baseStats.hp}\n⚔ **ATK:** ${pal.baseStats.atk}\n🛡 **DEF:** ${pal.baseStats.def}\n💨 **SPD:** ${pal.baseStats.spd}\n🍀 **LUCK:** ${pal.baseStats.luck}`, inline: true },
        { name: 'Growth', value: `**HP:** +${pal.statGrowth.hp}\n**ATK:** +${pal.statGrowth.atk}\n**DEF:** +${pal.statGrowth.def}\n**SPD:** +${pal.statGrowth.spd}\n**LUCK:** +${pal.statGrowth.luck}`, inline: true }
    );

    embed.addFields({
        name: 'Evolution',
        value: pal.evolution
            ? `Evolves at **Lvl ${pal.evolution.level}** into **${allPals[pal.evolution.evolvesTo]?.name || 'Unknown'}**`
            : '*Does not evolve.*',
        inline: false
    });

    embed.setImage(pal.pic);

    return embed;
};

module.exports = {
    name: 'dex',
    description: 'Displays a list of all Pals in the game, or details about a specific Pal.',
    aliases: ['paldex', 'allpet'],
    async execute(message, args, client, prefix) {
        try {
            if (args.length > 0) {
                // User searched for a specific pal
                const query = args.join(' ').toLowerCase();

                const pal =
                    palsArray.find(p => p.name.toLowerCase() === query) || // exact match
                    palsArray.find(p => p.name.toLowerCase().includes(query)); // partial match

                if (!pal) {
                    return message.reply({
                        embeds: [createErrorEmbed('Not Found', `No Pal found with the name **${args.join(' ')}**.`)]
                    });
                }

                return message.reply({ embeds: [generatePalEmbed(pal)] });
            }

            // Normal paginated mode
            let currentPage = 0;
            let currentSort = 'rarity_asc';

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('previous_page').setLabel('Previous').setStyle(ButtonStyle.Secondary).setEmoji('⬅️'),
                new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Secondary).setEmoji('➡️')
            );

            const sortMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('sort_pals')
                    .setPlaceholder('Sort by...')
                    .addOptions([
                        { label: 'Name (A-Z)', value: 'name_asc', default: true },
                        { label: 'Rarity (Highest First)', value: 'rarity_desc' },
                        { label: 'Type', value: 'type' }
                    ])
            );

            const reply = await message.reply({
                embeds: [generateEmbed(currentPage, currentSort)],
                components: [sortMenu, row]
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000
            });

            collector.on('collect', async i => {
                if (i.isButton()) {
                    if (i.customId === 'next_page') {
                        currentPage++;
                    } else if (i.customId === 'previous_page') {
                        currentPage--;
                    }
                } else if (i.isStringSelectMenu()) {
                    currentSort = i.values[0];
                    currentPage = 0;
                }

                const totalPages = Math.ceil(palsArray.length / PALS_PER_PAGE);
                if (currentPage >= totalPages) currentPage = totalPages - 1;
                if (currentPage < 0) currentPage = 0;

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage >= totalPages - 1);

                await i.update({
                    embeds: [generateEmbed(currentPage, currentSort)],
                    components: [sortMenu, row]
                });
            });

            collector.on('end', () => {
                row.components.forEach(c => c.setDisabled(true));
                sortMenu.components[0].setDisabled(true);
                reply.edit({ components: [sortMenu, row] }).catch(() => {});
            });
        } catch (error) {
            console.error('Allpets command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem displaying the Pal Encyclopedia.')]
            });
        }
    }
};