const { createErrorEmbed, createWarningEmbed, createCustomEmbed, createArgEmbed } = require('../../utils/embed');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const allItems = require('../../gamedata/items');
const allPals = require('../../gamedata/pets');

function formatEquipmentLine(pal, slotName) {
    const itemId = pal.equipment[slotName];
    if (!itemId) {
        return '*(None)*';
    }

    const itemData = allItems[itemId];
    if (!itemData) {
        return `*Unknown Item (${itemId})*`;
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

    return `**${itemData.name}**\n> ${statStrings.join(' | ') || 'No stat boosts'}`;
}

module.exports = {
    name: 'equipment',
    description: 'Shows the equipped items on a Pal.',
    usage: '<pal_id>',
    aliases: ['equipments', 'gear'],
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({ embeds: [
                    createErrorEmbed('No Adventure Started!', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`)
                ]});
            }
            if (!args[0]) {
                return message.reply({ embeds: [
                    createArgEmbed(prefix, this.name, this.usage)
                ]});
            }

            const shortId = parseInt(args[0]);
            if (isNaN(shortId)) {
                return message.reply({ embeds: [
                    createWarningEmbed('Invalid ID', `The ID of the Pal must be a valid number. Use \`${prefix}pet\` to check your Pal IDs.`)
                ]});
            }

            const pal = await Pet.findOne({ shortId, ownerId: message.author.id });
            if (!pal) {
                return message.reply({ embeds: [
                    createWarningEmbed('Pal Not Found', `Could not find a Pal with ID **#${shortId}** in your collection.`)
                ]});
            }

            // --- Create the embed with detailed fields ---
            const equipmentEmbed = createCustomEmbed(
                `Equipment for ${pal.nickname}`,
                `Showing all items currently equipped by **${pal.nickname}** (ID: ${pal.shortId}).`,
                '#839192',
                {
                    thumbnail: allPals[pal.basePetId]?.pic || message.author.displayAvatarURL(),
                    fields: [
                        { name: '⚔️ Weapon', value: formatEquipmentLine(pal, 'weapon'), inline: true },
                        { name: '🛡️ Offhand', value: formatEquipmentLine(pal, 'offhand'), inline: true },
                        { name: '⛑️ Head', value: formatEquipmentLine(pal, 'head'), inline: true },
                        { name: '👚 Chest', value: formatEquipmentLine(pal, 'chest'), inline: true },
                        { name: '👖 Leggings', value: formatEquipmentLine(pal, 'leg'), inline: true },
                        { name: '👟 Boots', value: formatEquipmentLine(pal, 'boots'), inline: true },
                        { name: '💍 Accessory', value: formatEquipmentLine(pal, 'accessory'), inline: true }
                    ],
                    footer: { text: `Owner: ${message.author.username}`, iconURL: message.author.displayAvatarURL() }
                }
            );

            await message.reply({ embeds: [equipmentEmbed] });

        } catch (error) {
            console.error("Equipment command error:", error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem displaying the equipment.')] });
        }
    }
};
