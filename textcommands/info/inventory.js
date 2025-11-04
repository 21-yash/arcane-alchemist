const Player = require('../../models/Player');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embed');
const items = require('../../gamedata/items');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config.json');
const ITEMS_PER_PAGE = 10;

module.exports = {
    name: 'inventory',
    description: 'View your alchemical ingredients, potions, and equipment.',
    usage: '[@user]',
    aliases: ['inv', 'bag'],
    async execute(message, args, client, prefix) {
        try {
            
            const user = message.author;

            const player = await Player.findOne({ userId: user.id });
            if (!player || !player.inventory || player.inventory.length === 0) {
                return message.reply({ embeds: [createErrorEmbed('Empty Inventory', `Your inventory is empty. Use \`${prefix}forage\` to find some ingredients!`)] });
            }

            // Sort inventory by type to make it organized
            const sortedInventory = player.inventory.sort((a, b) => {
                const itemA = items[a.itemId];
                const itemB = items[b.itemId];
                if (itemA.type < itemB.type) return -1;
                if (itemA.type > itemB.type) return 1;
                return 0;
            });

            const totalPages = Math.ceil(sortedInventory.length / ITEMS_PER_PAGE);
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const currentItems = sortedInventory.slice(start, end);

                let description = `\u200b \n💰 **Gold** \`${player.gold}\`\n✨ **Arcane Dust** \`${player.arcaneDust}\`\n`;
                let lastType = '';
                const emojiMap = {
                    ingredient: '🌿',
                    hatcher: '🐣',
                    crafting_material: config.emojis.crafting,
                    potion: config.emojis.potion,
                    equipment: config.emojis.equipment,
                    egg: '🥚',
                    default: '❓'
                };

                currentItems.forEach(invItem => {
                    const itemData = items[invItem.itemId];

                    if (itemData.type !== lastType) {
                        const emoji = emojiMap[itemData.type] || emojiMap.default;
                        description += `\n${emoji} **${itemData.type.charAt(0).toUpperCase() + itemData.type.slice(1).replace('_', ' ')}**\n`;
                        lastType = itemData.type;
                    }
                    description += `> \`${invItem.quantity}x\` ${itemData.name} (*${itemData.rarity}*)\n`;
                });

                return createCustomEmbed(
                    `${user.username}'s Inventory`,
                    description,
                    '#87CEEB',
                    {
                        footer: { text: `Page ${page + 1} of ${totalPages}` },
                        timestamp: false 
                    }
                );
            };

            const generateButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('inv_previous')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('inv_next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );
            };

            const inventoryMessage = await message.reply({
                embeds: [generateEmbed(currentPage)],
                components: totalPages > 1 ? [generateButtons(currentPage)] : []
            });

            if (totalPages <= 1) return;

            const collector = inventoryMessage.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 3 * 60 * 1000 // 3 minutes
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'inv_next') {
                    currentPage++;
                } else if (interaction.customId === 'inv_previous') {
                    currentPage--;
                }

                await interaction.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [generateButtons(currentPage)]
                });
            });

            collector.on('end', () => {
                const disabledButtons = generateButtons(currentPage);
                disabledButtons.components.forEach(button => button.setDisabled(true));
                inventoryMessage.edit({ components: [disabledButtons] }).catch(() => {});
            });

        } catch (error) {
            console.error('Inventory command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching your inventory.')] });
        }
    }
};