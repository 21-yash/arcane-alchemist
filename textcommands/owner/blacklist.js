 const { EmbedBuilder } = require('discord.js');
const Blacklist = require('../../models/Blacklist');
const config = require('../../config/config.json');
const { createArgEmbed } = require('../../utils/embed');

module.exports = {
    name: 'blacklist',
    description: 'Manage user blacklist',
    usage: '<add/remove> <user> [reason]',
    aliases: ['bl'],
    ownerOnly: true,
    bot_perm: [],
    async execute(message, args, client, prefix) {
        if (!args[0] || !args[1]) {
            return await message.reply({ embeds: [ createArgEmbed(prefix, this.name, this.usage) ] });
        }

        const action = args[0].toLowerCase();
        const userMention = args[1];

        if (action !== 'add' && action !== 'remove') {
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} Invalid Action`)
                .setDescription('Action must be either `add` or `remove`.');
            
            return await message.reply({ embeds: [embed] });
        }

        // Get user
        let user;
        try {
            const userId = userMention.replace(/[<@!>]/g, '');
            user = await client.users.fetch(userId);
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} Invalid User`)
                .setDescription('Please provide a valid user mention or ID.');
            
            return await message.reply({ embeds: [embed] });
        }

        if (action === 'add') {
            await handleBlacklistAdd(message, args, user);
        } else if (action === 'remove') {
            await handleBlacklistRemove(message, args, user);
        }
    },
};

async function handleBlacklistAdd(message, args, user) {
    // Parse arguments
    const reasonArgs = args.slice(2);
    const reason = reasonArgs.join(' ') || 'No reason provided';

    // Prevent blacklisting bot owner
    if (user.id === config.ownerId) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Cannot Blacklist Owner`)
            .setDescription('You cannot blacklist the bot owner.');
        
        return await message.reply({ embeds: [embed] });
    }

    // Prevent self-blacklisting
    if (user.id === message.author.id) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Cannot Blacklist Yourself`)
            .setDescription('You cannot blacklist yourself.');
        
        return await message.reply({ embeds: [embed] });
    }

    try {
        // Check if user is already blacklisted
        const existingBlacklist = await Blacklist.findOne({
            userId: user.id
        });

        if (existingBlacklist) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle(`${config.emojis.warning} Already Blacklisted`)
                .setDescription(`${user.tag} is already blacklisted in this server.`);
            
            return await message.reply({ embeds: [embed] });
        }

        // Blacklist the user
        await Blacklist.create({
            userId: user.id,
            reason: reason,
            blacklistedBy: message.author.id
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.banned} User Blacklisted`)
            .setDescription(`Successfully blacklisted ${user.tag} in this server.`)
            .addFields([
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Blacklisted by', value: `<@${message.author.id}>`, inline: true }
            ])
            .setTimestamp();

        await message.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error blacklisting user:', error);
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Command Error`)
            .setDescription('An error occurred while processing your command. If this persists, please report it to the server administrators.');
        
        await message.reply({ embeds: [embed] });
    }
}

async function handleBlacklistRemove(message, args, user) {

    try {
        // Find and remove blacklist entry
        const blacklistEntry = await Blacklist.findOneAndDelete({
            userId: user.id
        });

        if (!blacklistEntry) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle(`${config.emojis.warning} User Not Blacklisted`)
                .setDescription(`${user.tag} is not blacklisted in this server.`);
            
            return await message.reply({ embeds: [embed] });
        }
        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.unbanned} User Unblacklisted`)
            .setDescription(`Successfully unblacklisted ${user.tag} from this server.`)
            .addFields([
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Originally blacklisted by', value: `<@${blacklistEntry.blacklistedBy}>`, inline: true },
                { name: 'Unblacklisted by', value: `<@${message.author.id}>`, inline: true }
            ])
            .setTimestamp();

        await message.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error unblacklisting user:', error);
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Command Error`)
            .setDescription('An error occurred while processing your command. If this persists, please report it to the server administrators.');
        
        await message.reply({ embeds: [embed] });
    }
}