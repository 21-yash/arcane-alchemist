
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Pet = require('../../models/Pet');
const { createErrorEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const config = require('../../config/config.json');
const e = require('../../utils/emojis');

const EQUIP_COLOR = 0x5865F2; // Blurple

const SLOT_META = {
    weapon:    { label: 'Weapon',    emoji: '⚔️' },
    offhand:   { label: 'Offhand',   emoji: '🛡️' },
    head:      { label: 'Head',      emoji: '🪖' },
    chest:     { label: 'Chest',     emoji: '🧥' },
    leg:       { label: 'Leggings',  emoji: '👖' },
    boots:     { label: 'Boots',     emoji: '👢' },
    accessory: { label: 'Accessory', emoji: '💍' }
};

function formatStatBonuses(itemData) {
    if (!itemData?.stats) return '';
    const parts = [];
    for (const [stat, value] of Object.entries(itemData.stats)) {
        if (typeof value === 'number') {
            parts.push(`+${value} ${stat.toUpperCase()}`);
        } else if (typeof value === 'string') {
            parts.push(`*${value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}*`);
        }
    }
    return parts.length > 0 ? `\n-# ┗ ${parts.join(' • ')}` : '';
}

module.exports = {
    name: 'equipment',
    description: 'Shows the equipped items on a Pal.',
    usage: '<pal_id>',
    aliases: ['equipments', 'gear'],
    cooldown: 10,

    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) return message.reply({ embeds: [playerResult.embed] });

            if (!args[0]) {
                return message.reply({ embeds: [require('../../utils/embed').createArgEmbed(prefix, this.name, this.usage)] });
            }

            const shortId = parseInt(args[0]);
            const petResult = await CommandHelpers.validatePet(message.author.id, shortId, prefix);
            if (!petResult.success) return message.reply({ embeds: [petResult.embed] });
            const pal = petResult.pet;
            const basePetData = GameData.getPet(pal.basePetId);
            const petEmoji = config.emojis[basePetData?.name] || '🐾';
            const rarityEmoji = config.emojis[basePetData?.rarity] || '';

            const container = new ContainerBuilder().setAccentColor(EQUIP_COLOR);

            // Header
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${config.emojis.equipment} ${pal.nickname}'s Equipment\n` +
                    `${petEmoji} Lv.**${pal.level}** ${basePetData?.name || 'Unknown'}  ${rarityEmoji}`
                )
            );

            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

            // Slots
            let hasAny = false;
            let slotsText = '';

            for (const [slotKey, meta] of Object.entries(SLOT_META)) {
                const itemId = pal.equipment?.[slotKey];
                if (itemId) {
                    hasAny = true;
                    const itemData = GameData.getItem(itemId);
                    const itemEmoji = CommandHelpers.getItemEmoji(itemId);
                    const itemRarity = itemData?.rarity ? (config.emojis[itemData.rarity] || '') : '';
                    slotsText += `${itemEmoji} **${itemData?.name || itemId}** ${itemRarity}${formatStatBonuses(itemData)}\n\n`;
                } else {
                    slotsText += `${meta.emoji} ${meta.label}\n-# empty\n\n`;
                }
            }

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(slotsText.trim())
            );

            if (hasAny) {
                // Total stat bonuses
                let totalStats = { hp: 0, atk: 0, def: 0, spd: 0, luck: 0 };
                for (const slotKey of Object.keys(SLOT_META)) {
                    const itemId = pal.equipment?.[slotKey];
                    if (!itemId) continue;
                    const itemData = GameData.getItem(itemId);
                    if (!itemData?.stats) continue;
                    for (const [stat, value] of Object.entries(itemData.stats)) {
                        if (typeof value === 'number' && totalStats[stat] !== undefined) {
                            totalStats[stat] += value;
                        }
                    }
                }
                const bonusParts = Object.entries(totalStats)
                    .filter(([, v]) => v > 0)
                    .map(([s, v]) => `+${v} ${s.toUpperCase()}`);

                if (bonusParts.length > 0) {
                    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `-# Total Bonuses: ${bonusParts.join(' • ')}`
                        )
                    );
                }
            }

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error("Equipment command error:", error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem displaying the equipment.')] });
        }
    }
};