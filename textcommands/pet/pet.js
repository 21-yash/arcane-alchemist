const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createCustomEmbed, createInfoEmbed } = require('../../utils/embed');
const { calculateXpForNextLevel } = require('../../utils/leveling');
const allPals = require('../../gamedata/pets');
const config = require('../../config/config.json');
const { getMember } = require('../../utils/functions');
const { restorePetHp } = require('../../utils/stamina');

const PALS_PER_PAGE = 10;

// Helper function for the detailed Pal view embed
const generatePalDetailEmbed = (pal, member) => {
    const basePalInfo = allPals[pal.basePetId];
    
    const xpForNextLevel = calculateXpForNextLevel(pal.level);
    const progressPercentage = Math.floor((pal.xp / xpForNextLevel) * 100);
    const filledBlocks = Math.round(progressPercentage / 10);
    const emptyBlocks = 10 - filledBlocks;
    const progressBar = '▓'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

    return createCustomEmbed(
        `${pal.nickname} (Lvl. ${pal.level} ${basePalInfo.name})`,
        `**XP:** \`${pal.xp} / ${xpForNextLevel}\`\n\`${progressBar}\` (${progressPercentage}%)`,
        '#3498DB',
        {
            fields: [
                { name: '❤️ HP', value: `\`${pal.currentHp || pal.stats.hp}/${pal.stats.hp}\``, inline: true },
                { name: '⚔️ ATK', value: `\`${pal.stats.atk}\``, inline: true },
                { name: '🛡️ DEF', value: `\`${pal.stats.def}\``, inline: true },
                { name: '💨 SPD', value: `\`${pal.stats.spd}\``, inline: true },
                { name: '🍀 LUCK', value: `\`${pal.stats.luck}\``, inline: true },
                { name: 'Status', value: `\`${pal.status}\``, inline: true },
            ],
            timestamp: false,
            footer: { text: `Id: ${pal.petId}`}
        }
    );
};

module.exports = {
    name: 'pet',
    description: 'View your or another player\'s collection of Pals.',
    usage: '[@user] [--rarity <rarity>] [--type <type>] [--lvl] OR info <pal_id>',
    aliases: ['pals', 'collection', 'pal', 'pets'],
    async execute(message, args, client, prefix) {
        try {
            // --- Subcommand: View specific Pal info ---
            if (args[0]?.toLowerCase() === 'info') {
                const palId = parseInt(args[1]);
                if (!palId || isNaN(palId)) {
                    return message.reply({ embeds: [createErrorEmbed('Missing or Invalid Pal ID', `You need to provide a numeric ID of the Pal you want to view. Usage: \`${prefix}pet info <pal_id>\``)] });
                }
                let pal = await Pet.findOne({ ownerId: message.author.id, shortId: palId });
                if (!pal) {
                    return message.reply({ embeds: [createErrorEmbed('Pal Not Found', 'No Pal exists with that ID.')] });
                }

                pal = await restorePetHp(pal);
                // Fetch the owner's member object to display their avatar
                const ownerMember = await message.guild.members.fetch(pal.ownerId).catch(() => null);
                if (!ownerMember) {
                    return message.reply({ embeds: [createErrorEmbed('Owner Not Found', 'Could not find the owner of this Pal in the server.')] });
                }

                const filteredPal = allPals[pal.basePetId];
                
                const detailEmbed = generatePalDetailEmbed(pal, ownerMember);
                detailEmbed.setThumbnail(filteredPal.pic)
                return message.reply({ embeds: [detailEmbed] });
            }

            // --- Main Command: List Pals with Filters ---
            const member = getMember(message, args.filter(arg => !arg.startsWith('--')).join(' ')) || message.member;

            const player = await Player.findOne({ userId: member.id });
            if (!player) {
                const notStartedMsg = member.id === message.author.id
                    ? `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    : `**${member.displayName}** has not started their alchemical journey yet.`;
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', notStartedMsg)] });
            }

            let pals = await Pet.find({ ownerId: member.id });
            if (pals.length === 0) {
                const noPalsMsg = member.id === message.author.id
                    ? `You don't have any Pals yet! Try foraging to find one.`
                    : `**${member.displayName}** does not own any Pals.`;
                return message.reply({ embeds: [createInfoEmbed('No Pals Found', noPalsMsg)] });
            }

            // --- Apply Filters ---
            const filters = args.filter(arg => arg.startsWith('--'));
            let filteredPals = [...pals];
            let filterDescription = 'Showing all Pals.';

            for (const filter of filters) {
                const [key, value] = filter.slice(2).split('=');
                if (key === 'rarity' && value) {
                    filteredPals = filteredPals.filter(p => allPals[p.basePetId].rarity.toLowerCase() === value.toLowerCase());
                    filterDescription = `Filtering by Rarity: **${value}**`;
                }
                if (key === 'type' && value) {
                    filteredPals = filteredPals.filter(p => allPals[p.basePetId].type.toLowerCase() === value.toLowerCase());
                    filterDescription = `Filtering by Type: **${value}**`;
                }
                if (key === 'lvl') {
                    filteredPals.sort((a, b) => b.level - a.level);
                    filterDescription = 'Sorting by Level (Highest First).';
                }
            }
            
            if (filteredPals.length === 0) {
                return message.reply({ embeds: [createInfoEmbed('No Pals Found', 'No Pals matched your filters.')] });
            }

            // --- Pagination for List View ---
            let currentPage = 0;
            const totalPages = Math.ceil(filteredPals.length / PALS_PER_PAGE);

            const generateListEmbed = (page) => {
                const start = page * PALS_PER_PAGE;
                const end = start + PALS_PER_PAGE;
                const pagePals = filteredPals.slice(start, end);

                const list = pagePals.map(pal => {
                    const base = allPals[pal.basePetId];
                    return `**${pal.shortId}** ${config.emojis[pal.nickname]} **Lvl** \`${pal.level}\` • **${pal.nickname}** *\`${base.type}\`*`;
                }).join('\n');

                return createCustomEmbed(
                    `${member.displayName}'s Pal Collection`,
                    `${filterDescription}\n\n${list}`,
                    '#3498DB',
                    { footer: { text: `Page ${page + 1} of ${totalPages}` }, timestamp: false }
                );
            };

            const generateButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('previous_pal').setLabel('Previous').setStyle(ButtonStyle.Primary).setEmoji('⬅️').setDisabled(page === 0),
                    new ButtonBuilder().setCustomId('next_pal').setLabel('Next').setStyle(ButtonStyle.Primary).setEmoji('➡️').setDisabled(page >= totalPages - 1)
                );
            };

            const reply = await message.reply({
                embeds: [generateListEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
            
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000, // 5 minutes
                componentType: ComponentType.Button
            });

            collector.on('collect', async i => {
                if (i.customId === 'next_pal') currentPage++;
                else if (i.customId === 'previous_pal') currentPage--;
                await i.update({ embeds: [generateListEmbed(currentPage)], components: [generateButtons(currentPage)] });
            });

            collector.on('end', () => {
                const finalComponents = generateButtons(currentPage);
                finalComponents.components.forEach(button => button.setDisabled(true));
                reply.edit({ components: [finalComponents] }).catch(() => {});
            });

        } catch (error) {
            console.error('Pet command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching the Pal collection.')] });
        }
    }
};