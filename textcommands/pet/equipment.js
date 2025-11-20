const { createErrorEmbed, createWarningEmbed, createCustomEmbed, createArgEmbed } = require('../../utils/embed');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');

async function formatEquipmentLine(pal, slotName) {
    const itemId = pal.equipment[slotName];
    const itemEmoji = CommandHelpers.getItemEmoji(itemId);
    
    if (!itemId) {
        return '*Empty*';
    }

    const itemData = GameData.getItem(itemId);
    if (!itemData) {
        return `${itemEmoji} *Unknown Item (${itemId})*`;
    }

    const statStrings = [];
    if (itemData.stats) {
        for (const [stat, value] of Object.entries(itemData.stats)) {
            if (typeof value === 'number') {
                statStrings.push(`+${value} ${stat.toUpperCase()}`);
            } else if (typeof value === 'string') {
                const specialName = value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                statStrings.push(`*${specialName}*`);
            }
        }
    }

    const statsDisplay = statStrings.length > 0 
        ? `\n${statStrings.join(' • ')}` 
        : '';

    return `${itemEmoji} **${itemData.name}**${statsDisplay}`;
}

module.exports = {
    name: 'equipment',
    description: 'Shows the equipped items on a Pal.',
    usage: '<pal_id>',
    aliases: ['equipments', 'gear'],
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            if (!args[0]) {
                return message.reply({ embeds: [
                    createArgEmbed(prefix, this.name, this.usage)
                ]});
            }

            const shortId = parseInt(args[0]);

            const petResult = await CommandHelpers.validatePet(message.author.id, shortId, prefix);
            if (!petResult.success) {
                return message.reply({ embeds: [petResult.embed] });
            }
            const pal = petResult.pet;

            // Get pet base data for thumbnail
            const basePetData = GameData.getPet(pal.basePetId);

            // --- Create the embed with mobile-friendly layout ---
            const equipmentEmbed = createCustomEmbed(
                `${pal.nickname}'s Equipment`,
                `Viewing equipment for **${pal.nickname}** (ID: ${pal.shortId})`,
                '#5865F2',
                {
                    thumbnail: basePetData?.pic || message.author.displayAvatarURL(),
                    fields: [
                        { 
                            name: '• Weapon', 
                            value: await formatEquipmentLine(pal, 'weapon'), 
                            inline: false 
                        },
                        { 
                            name: '• Offhand', 
                            value: await formatEquipmentLine(pal, 'offhand'), 
                            inline: false 
                        },
                        { 
                            name: '• Head', 
                            value: await formatEquipmentLine(pal, 'head'), 
                            inline: false 
                        },
                        { 
                            name: '• Chest', 
                            value: await formatEquipmentLine(pal, 'chest'), 
                            inline: false 
                        },
                        { 
                            name: '• Leggings', 
                            value: await formatEquipmentLine(pal, 'leg'), 
                            inline: false 
                        },
                        { 
                            name: '• Boots', 
                            value: await formatEquipmentLine(pal, 'boots'), 
                            inline: false 
                        },
                        { 
                            name: '• Accessory', 
                            value: await formatEquipmentLine(pal, 'accessory'), 
                            inline: false 
                        }
                    ],
                    footer: { 
                        text: `Owner: ${message.author.username}`, 
                        iconURL: message.author.displayAvatarURL() 
                    }
                }
            );

            await message.reply({ embeds: [equipmentEmbed] });

        } catch (error) {
            console.error("Equipment command error:", error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem displaying the equipment.')] });
        }
    }
};