const Player = require('../../models/Player');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config.json');
const CommandHelpers = require('../../utils/commandHelpers');
const ITEMS_PER_PAGE = 10;

module.exports = {
    name: 'inventory',
    description: 'View your alchemical ingredients, potions, and equipment.',
    usage: '[@user] [--page=number] [--type=type] [--rarity=rarity]',
    aliases: ['inv', 'bag'],
    cooldown: 3,
    async execute(message, args, client, prefix) {
        try {
            const user = message.author;

            const playerResult = await CommandHelpers.validatePlayer(user.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            if (!player.inventory || player.inventory.length === 0) {
                return message.reply({ embeds: [createErrorEmbed('Empty Inventory', `Your inventory is empty. Use \`${prefix}forage\` to find some ingredients!`)] });
            }

            // Parse filters from arguments
            const filters = this.parseFilters(args);

            // Apply filters to inventory
            let filteredInventory = this.applyFilters(player.inventory, filters);

            if (filteredInventory.length === 0) {
                return message.reply({ 
                    embeds: [createErrorEmbed('No Items Found', 'No items match your filters.')] 
                });
            }

            // Sort inventory
            const sortedInventory = this.sortInventory(filteredInventory);

            const totalPages = Math.ceil(sortedInventory.length / ITEMS_PER_PAGE);
            let currentPage = Math.min(Math.max(0, (filters.page || 1) - 1), totalPages - 1);

            const generateEmbed = (page) => {
                const start = page * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const currentItems = sortedInventory.slice(start, end);

                let description = `\u200b \n<:gold:1422196282214191104> **Gold** \`${player.gold}\`\n<:arcane_dust:1422196426535866368> **Arcane Dust** \`${player.arcaneDust}\`\n`;
                
                // Show active filters
                if (filters.type || filters.rarity) {
                    description += '\n**Active Filters:**';
                    if (filters.type) description += ` Type: \`${filters.type}\``;
                    if (filters.rarity) description += ` Rarity: \`${filters.rarity}\``;
                    description += '\n';
                }

                let lastType = '';
                const emojiMap = {
                    ingredient: config.emojis.ingredients,
                    hatcher: config.emojis['Alchemical Incubator'],
                    crafting_material: config.emojis.crafting,
                    potion: config.emojis.potion,
                    equipment: config.emojis.equipment,
                    egg: '🥚',
                    taming_lure: config.emojis['Taming Lure'],
                    essence: config.emojis.essence || '✨',
                    default: '❓'
                };

                currentItems.forEach((invItem) => {
                    const itemData = GameData.getItem(invItem.itemId);
                    const itememoji = CommandHelpers.getItemEmoji(invItem.itemId);

                    if (itemData.type !== lastType) {
                        const emoji = emojiMap[itemData.type] || emojiMap.default;
                        description += `\n${emoji} **${itemData.type.charAt(0).toUpperCase() + itemData.type.slice(1).replace(/_/g, ' ')}**\n`;
                        lastType = itemData.type;
                    }
                    description += `> ${itememoji} \`${invItem.quantity}x\` ${itemData.name} (*${itemData.rarity}*)\n`;
                });

                return createCustomEmbed(
                    `${user.username}'s Inventory`,
                    description,
                    '#87CEEB',
                    {
                        footer: { 
                            text: `Page ${page + 1} of ${totalPages} • ${sortedInventory.length} items` 
                        },
                        timestamp: false 
                    }
                );
            };

            const generateButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('inv_first')
                        .setLabel('⏮️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('inv_previous')
                        .setLabel('◀️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('inv_next')
                        .setLabel('▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('inv_last')
                        .setLabel('⏭️')
                        .setStyle(ButtonStyle.Secondary)
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
                time: 5 * 60 * 1000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                switch (interaction.customId) {
                    case 'inv_first':
                        currentPage = 0;
                        break;
                    case 'inv_previous':
                        currentPage = Math.max(0, currentPage - 1);
                        break;
                    case 'inv_next':
                        currentPage = Math.min(totalPages - 1, currentPage + 1);
                        break;
                    case 'inv_last':
                        currentPage = totalPages - 1;
                        break;
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
    },

    /**
     * Parse filter arguments from command args
     */
    parseFilters(args) {
        const filters = {
            page: null,
            type: null,
            rarity: null
        };

        args.forEach(arg => {
            if (arg.startsWith('--page=')) {
                const pageNum = parseInt(arg.split('=')[1]);
                if (!isNaN(pageNum) && pageNum > 0) {
                    filters.page = pageNum;
                }
            } else if (arg.startsWith('--type=')) {
                filters.type = arg.split('=')[1].toLowerCase().replace(/-/g, '_');
            } else if (arg.startsWith('--rarity=')) {
                filters.rarity = arg.split('=')[1].toLowerCase();
            }
        });

        return filters;
    },

    /**
     * Apply filters to inventory
     */
    applyFilters(inventory, filters) {
        return inventory.filter(invItem => {
            const itemData = GameData.getItem(invItem.itemId);
            if (!itemData) return false;

            // Filter by type
            if (filters.type && itemData.type !== filters.type) {
                return false;
            }

            // Filter by rarity
            if (filters.rarity && itemData.rarity?.toLowerCase() !== filters.rarity) {
                return false;
            }

            return true;
        });
    },

    /**
     * Sort inventory by priority
     */
    sortInventory(inventory) {
        return inventory.sort((a, b) => {
            const itemA = GameData.getItem(a.itemId);
            const itemB = GameData.getItem(b.itemId);
            
            // Priority order
            const typePriority = {
                'ingredient': 1,
                'crafting_material': 2,
                'equipment': 3,
                'potion': 4,
                'egg': 5,
                'hatcher': 6,
                'taming_lure': 7,
                'essence': 8
            };
            
            const priorityA = typePriority[itemA.type] || 999;
            const priorityB = typePriority[itemB.type] || 999;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            const rarityPriority = {
                'legendary': 1,
                'epic': 2,
                'rare': 3,
                'uncommon': 4,
                'common': 5 
            };
            
            const rarityA = rarityPriority[itemA.rarity?.toLowerCase()] || 999;
            const rarityB = rarityPriority[itemB.rarity?.toLowerCase()] || 999;
            
            if (rarityA !== rarityB) {
                return rarityA - rarityB;
            }
            
            return itemA.name.localeCompare(itemB.name);
        });
    }
};