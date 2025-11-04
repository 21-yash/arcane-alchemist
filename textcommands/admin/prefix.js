const { createArgEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embed');
const schema = require('../../models/Config');

module.exports = {
    name: 'prefix',
    description: 'Configure the prefix for the server',
    usage: '<new prefix>',
    aliases: ['setprefix'],
    user_perm: ['ManageGuild'],
    bot_perm: [],
    async execute(message, args, client, prefix) {
        
        if (!args[0]) {
            return await message.reply({ embeds: [
                createArgEmbed(prefix, this.name, this.usage) 
            ]});
        }

        const newPrefix = args[0];
        const guildId = message.guild.id;

        if (newPrefix.length > 5) {
            return await message.reply({ embeds: [
                createErrorEmbed('Invalid Prefix', 'The prefix cannot be longer than 5 characters.')
            ]});
        }

        try {
            await schema.findOneAndUpdate(
                { guildId: guildId }, // Query: find the document with this guildId
                { prefix: newPrefix },   // Update: set the prefix to the new value
                { upsert: true, new: true } // Options: create if not found, return the new doc
            );

            await message.reply({ embeds: [
                createSuccessEmbed('Prefix Updated', `The new server prefix has been set to: \`${newPrefix}\``)
            ]});

        } catch (error) {
            console.error("Error updating prefix:", error);
            await message.reply({ embeds: [
                createErrorEmbed('Database Error', 'There was an error updating the prefix in the database.')
            ]});
        }
    }
};