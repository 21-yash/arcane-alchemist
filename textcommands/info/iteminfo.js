const { createErrorEmbed, createCustomEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const path = require('path');

module.exports = {
    name: 'iteminfo',
    description: 'View detailed information about an item.',
    usage: '<item_name>',
    aliases: ['item', 'iinfo'],
    async execute(message, args, client, prefix) {
        try {
            // Check if item name is provided
            if (args.length === 0) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        'Missing Argument',
                        `Please specify an item name.\n**Usage:** \`${prefix}${this.name} ${this.usage}\`\n**Example:** \`${prefix}${this.name} iron sword\``
                    )]
                });
            }

            // Join args to get full item name
            const searchName = args.join(' ').toLowerCase();

            // Find item by searching through all items
            let foundItemId = null;
            let foundItemData = null;

            // Get all items from GameData
            const items = require('../../gamedata/items');
            
            // Try exact match first (by item ID)
            const exactMatch = searchName.replace(/\s+/g, '_');
            if (items[exactMatch]) {
                foundItemId = exactMatch;
                foundItemData = items[exactMatch];
            } else {
                // Try fuzzy search by name
                const cleanSearch = searchName.replace(/[_\s-]/g, '').toLowerCase();
                
                for (const [itemId, itemData] of Object.entries(items)) {
                    const cleanItemName = itemData.name.replace(/[_\s-]/g, '').toLowerCase();
                    const cleanItemId = itemId.replace(/[_\s-]/g, '').toLowerCase();
                    
                    if (cleanItemName === cleanSearch || cleanItemId === cleanSearch) {
                        foundItemId = itemId;
                        foundItemData = itemData;
                        break;
                    }
                }

                // If still not found, try partial match
                if (!foundItemData) {
                    for (const [itemId, itemData] of Object.entries(items)) {
                        const cleanItemName = itemData.name.replace(/[_\s-]/g, '').toLowerCase();
                        const cleanItemId = itemId.replace(/[_\s-]/g, '').toLowerCase();
                        
                        if (cleanItemName.includes(cleanSearch) || cleanItemId.includes(cleanSearch)) {
                            foundItemId = itemId;
                            foundItemData = itemData;
                            break;
                        }
                    }
                }
            }

            if (!foundItemData) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        'Item Not Found',
                        `No item found with the name "${args.join(' ')}". Please check your spelling and try again.`
                    )]
                });
            }

            // Build item information
            const emoji = CommandHelpers.getItemEmoji(foundItemId);
            let description = `${foundItemData.description}\n\n`;

            // Add type and rarity
            description += `**Type:** ${foundItemData.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
            description += `**Rarity:** ${foundItemData.rarity}\n`;
            description += `**Source:** ${foundItemData.source ? foundItemData.source.replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'}\n`;

            // Add stats if equipment
            if (foundItemData.type === 'equipment' && foundItemData.stats) {
                description += `\n**Stats:**\n`;
                for (const [stat, value] of Object.entries(foundItemData.stats)) {
                    if (stat !== 'special') {
                        const displayStat = stat.toUpperCase();
                        const displayValue = value >= 0 ? `+${value}` : value;
                        description += `\`${displayStat}\` ${displayValue}\n`;
                    }
                }
                if (foundItemData.stats.special) {
                    description += `\n**Special:** ${foundItemData.stats.special.replace(/_/g, ' ')}\n`;
                }
                if (foundItemData.slot) {
                    description += `**Slot:** ${foundItemData.slot.replace(/\b\w/g, l => l.toUpperCase())}\n`;
                }
            }

            // Add effect if potion
            if (foundItemData.type === 'potion' && foundItemData.effect) {
                description += `\n**Effect:**\n`;
                const effect = foundItemData.effect;
                
                if (effect.type === 'heal') {
                    description += `Restores ${effect.value} HP\n`;
                } else if (effect.type === 'stat_boost' || effect.type === 'multi_boost') {
                    description += `Boosts stats:\n`;
                    for (const [stat, value] of Object.entries(effect.stats || {})) {
                        const displayStat = stat.toUpperCase();
                        description += `  \`${displayStat}\` +${value}\n`;
                    }
                } else if (effect.type === 'level_up') {
                    description += `Increases level by ${effect.value}\n`;
                } else if (effect.type === 'resistance') {
                    description += `Grants ${effect.value}% ${effect.element} resistance\n`;
                } else if (effect.type === 'special') {
                    description += `${effect.ability ? effect.ability.replace(/_/g, ' ') : 'Special effect'}\n`;
                }
                
                if (effect.duration) {
                    description += `**Duration:** ${effect.duration.replace(/_/g, ' ')}\n`;
                }
            }

            // Add effects if essence/lure
            if (foundItemData.effects) {
                description += `\n**Effects:**\n`;
                const effects = foundItemData.effects;
                
                if (effects.type) {
                    description += `${effects.type.replace(/_/g, ' ')}\n`;
                }
                if (effects.strength) {
                    description += `**Strength:** ${effects.strength}x\n`;
                }
                if (effects.duration) {
                    const duration = effects.duration;
                    const hours = Math.floor(duration / (60 * 60 * 1000));
                    const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));
                    description += `**Duration:** ${hours > 0 ? `${hours}h ` : ''}${minutes}m\n`;
                }
            }

            // Usability
            if (foundItemData.usable !== undefined) {
                description += `\n**Usable:** ${foundItemData.usable ? 'Yes' : 'No'}\n`;
            }

            // Get rarity color
            const rarityColors = {
                'common': '#808080',
                'uncommon': '#00ff00',
                'rare': '#0099ff',
                'epic': '#9900ff',
                'legendary': '#ff9900'
            };
            const color = rarityColors[foundItemData.rarity?.toLowerCase()] || '#87CEEB';

            // Get item icon path (if exists)
            const iconFileName = foundItemId.toLowerCase().replace(/_/g, '_') + '.png';
            const iconPath = path.join(process.cwd(), 'assets', 'icons', iconFileName);
            
            // Create the embed
            const embed = createCustomEmbed(
                `${emoji} ${foundItemData.name}`,
                description,
                color,
                {
                    thumbnail: `attachment://${iconFileName}`,
                    footer: {
                        text: `Item ID: ${foundItemId}`
                    },
                    timestamp: false
                }
            );

            // Try to send with icon attachment
            try {
                await message.reply({
                    embeds: [embed],
                    files: [{
                        attachment: iconPath,
                        name: iconFileName
                    }]
                });
            } catch (attachmentError) {
                // If attachment fails, send without it
                const embedWithoutThumbnail = createCustomEmbed(
                    `${emoji} ${foundItemData.name}`,
                    description,
                    color,
                    {
                        footer: {
                            text: `Item ID: ${foundItemId}`
                        },
                        timestamp: false
                    }
                );
                
                await message.reply({
                    embeds: [embedWithoutThumbnail]
                });
            }

        } catch (error) {
            console.error('Item info command error:', error);
            message.reply({
                embeds: [createErrorEmbed(
                    'An Error Occurred',
                    'There was a problem fetching item information. Please try again later.'
                )]
            });
        }
    }
};
