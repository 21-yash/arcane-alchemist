
const { EmbedBuilder } = require('discord.js');
const config = require('../../config/config.json');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embed');

module.exports = {
    name: 'removedungeon',
    description: 'Remove a user from dungeon session (Owner only)',
    usage: '<user_id>',
    aliases: ['rmdungeon', 'dungeonremove'],
    ownerOnly: true,
    async execute(message, args, client, prefix) {

        if (!args[0]) {
            return message.reply({
                embeds: [createErrorEmbed('Missing Arguments', `Usage: \`${prefix}removedungeon <user_id>\``)]
            });
        }

        const userId = args[0];

        // Check if user is in a dungeon session
        if (!client.dungeonSessions.has(userId)) {
            return message.reply({
                embeds: [createWarningEmbed('Not in Dungeon', `User <@${userId}> is not currently in a dungeon session.`)]
            });
        }

        // Remove the user from dungeon session
        client.dungeonSessions.delete(userId);

        const embed = createSuccessEmbed(
            'User Removed from Dungeon',
            `Successfully removed <@${userId}> from their dungeon session.`
        );

        await message.reply({ embeds: [embed] });
    }
};