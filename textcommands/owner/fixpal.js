const { createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embed');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const config = require('../../config/config.json');

module.exports = {
    name: 'fixpal',
    description: 'Forcefully sets a Pal\'s status to Idle. (Owner only)',
    usage: '<user_id> <pal_short_id>',
    aliases: ['resetpal'],
    ownerOnly: true,
    async execute(message, args, client, prefix) {

        try {
            if (args.length < 2) {
                return message.reply({ embeds: [
                    createErrorEmbed('Missing Arguments', `Usage: \`${prefix}fixpal <user_id> <pal_short_id>\``)
                ]});
            }

            const targetUserId = args[0];
            const shortId = parseInt(args[1]);

            if (isNaN(shortId)) {
                return message.reply({ embeds: [
                    createWarningEmbed('Invalid Pal ID', 'The Pal ID must be a number.')
                ]});
            }

            const pal = await Pet.findOne({ ownerId: targetUserId, shortId });
            if (!pal) {
                return message.reply({ embeds: [
                    createWarningEmbed('Pal Not Found', `Could not find a Pal with ID **#${shortId}** belonging to user \`${targetUserId}\`.`)
                ]});
            }

            if (pal.status === 'Idle') {
                 return message.reply({ embeds: [
                    createWarningEmbed('Already Idle', `**${pal.nickname}** (ID: ${shortId}) is already in the 'Idle' state.`)
                ]});
            }

            const oldStatus = pal.status;
            pal.status = 'Idle';
            await pal.save();

    
            const successEmbed = createSuccessEmbed(
                'Pal Status Reset!',
                `Successfully reset the status for **${pal.nickname}** (ID: ${shortId}).`,
                {
                    fields: [
                        { name: 'Owner', value: `<@${targetUserId}>`, inline: true },
                        { name: 'Status Change', value: `\`${oldStatus}\` → \`Idle\``, inline: true },
                    ]
                }
            );
            
            await message.reply({ embeds: [successEmbed] });

        } catch (err) {
            console.error('Fixpal command error:', err);
            message.reply({ embeds: [ createErrorEmbed('An Error Occurred', 'There was a problem resetting the Pal\'s status.') ]});
        }
    }
};