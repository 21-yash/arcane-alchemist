
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Egg = require('../../models/Egg');
const { createErrorEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');
const config = require('../../config/config.json');
const e = require('../../utils/emojis');

const EGG_COLOR = 0xF59E0B; // Amber

function getAllHatchingSlots(player) {
    const slots = [];
    if (player.hatchingSlot) {
        slots.push(player.hatchingSlot);
    }
    if (player.labHatchingSlots) {
        slots.push(...player.labHatchingSlots);
    }
    return slots;
}

function getIncubatingEggDocIds(player) {
    return getAllHatchingSlots(player)
        .filter(slot => slot.eggDocId != null)
        .map(slot => slot.eggDocId);
}

module.exports = {
    name: 'eggs',
    description: 'View all your eggs.',
    aliases: ['egg', 'myeggs'],
    cooldown: 10,

    async execute(message, args, client, prefix) {
        const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
        if (!playerResult.success) return message.reply({ embeds: [playerResult.embed] });
        const player = playerResult.player;

        const allEggs = await Egg.find({ ownerId: message.author.id }).sort({ eggId: 1 });

        const container = new ContainerBuilder().setAccentColor(EGG_COLOR);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 🥚 Your Eggs`)
        );
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        if (allEggs.length === 0) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `You don't have any eggs.\n\n` +
                    `-# Breed pals with \`${prefix}breed\` to get eggs!`
                )
            );
        } else {
            const incubatingIds = getIncubatingEggDocIds(player);
            let text = '';

            for (const egg of allEggs) {
                const eggItem = GameData.getItem(egg.eggItemId);
                const name = eggItem?.name || egg.eggItemId;
                const eggEmoji = config.emojis[name] || '🥚';

                // Rarity badges from parents
                const r1 = egg.parentRarities?.[0] ? (config.emojis[egg.parentRarities[0]] || '') : '';
                const r2 = egg.parentRarities?.[1] ? (config.emojis[egg.parentRarities[1]] || '') : '';
                const rarityTag = (r1 || r2) ? ` ${r1}${r2}` : '';

                // Inherited skills count
                const inheritCount = egg.inheritedSkills?.filter(s => s.fromType !== eggItem?.eggType).length || 0;
                const inheritTag = inheritCount > 0 ? `  🧬${inheritCount}` : '';

                // Parent names
                const p1 = egg.parentBasePetIds?.[0] ? GameData.getPet(egg.parentBasePetIds[0]) : null;
                const p2 = egg.parentBasePetIds?.[1] ? GameData.getPet(egg.parentBasePetIds[1]) : null;
                const parentNames = (p1 && p2) ? `-# ${p1.name} + ${p2.name}` : '';

                // Status
                const isIncubating = incubatingIds.includes(egg.eggId);
                const statusTag = isIncubating ? '  ⏳ *Incubating*' : '';

                text += `**#${egg.eggId}** ${eggEmoji} ${name}${rarityTag}${inheritTag}${statusTag}\n`;
                if (parentNames) text += `${parentNames}\n`;
                text += `\n`;
            }

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(text.trim())
            );

            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# ${allEggs.length} egg${allEggs.length !== 1 ? 's' : ''} total  •  \`${prefix}incubate <id>\` to hatch`
                )
            );
        }

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
