const { createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embed');
const { getMember } = require('../../utils/functions');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');

module.exports = {
    name: 'addallitems',
    description: 'Grant a player one of every available item (owner only).',
    usage: '<@user | user_id>',
    ownerOnly: true,
    async execute(message, args, client, prefix) {
        if (!args.length) {
            return message.reply({
                embeds: [
                    createWarningEmbed(
                        'Invalid Usage',
                        `Usage: \`${prefix}addallitems <@user | user_id>\``
                    )
                ]
            });
        }

        try {
            const member = getMember(message, args[0]);
            const targetUserId = member?.id || args[0].replace(/[<@!>]/g, '');

            if (!targetUserId) {
                return message.reply({
                    embeds: [createErrorEmbed('User Not Found', 'Please mention a valid user or provide their ID.')]
                });
            }

            const playerResult = await CommandHelpers.validatePlayer(targetUserId, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }

            const player = playerResult.player;
            const itemIds = Object.keys(GameData.items || {});

            if (!itemIds.length) {
                return message.reply({
                    embeds: [createErrorEmbed('No Items Found', 'Game data does not contain any items to grant.')]
                });
            }

            let addedCount = 0;

            for (const itemId of itemIds) {
                const existingItem = player.inventory.find(invItem => invItem.itemId === itemId);

                if (existingItem) {
                    if (existingItem.quantity <= 0) {
                        existingItem.quantity = 1;
                        addedCount += 1;
                    }
                    continue;
                }

                player.inventory.push({ itemId, quantity: 1 });
                addedCount += 1;
            }

            await player.save();

            const targetUserDisplay = member?.user?.username || targetUserId;
            const successDetails = `Granted **${itemIds.length}** item types to ${targetUserDisplay}.\n` +
                (addedCount === 0
                    ? 'All items were already present in their inventory.'
                    : `Newly added items: **${addedCount}**`);

            return message.reply({
                embeds: [createSuccessEmbed('Inventory Populated', successDetails)]
            });
        } catch (error) {
            console.error('AddAllItems command error:', error);
            return message.reply({
                embeds: [createErrorEmbed('Command Error', 'Failed to grant items. Check logs for details.')]
            });
        }
    }
};

