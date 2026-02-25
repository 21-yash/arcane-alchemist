const config = require('../config/config.json');
const { checkBlacklist, checkUserPermissions, checkBotPermissions, isCommandDisabled } = require('../utils/permissions');
const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits } = require('discord.js');

// Track users who have already received the tutorial nudge this session
const tutorialNudged = new Set();

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        
        // Ignore bots and messages without content for command processing
        if (message.author.bot || !message.content || !message.guild) return;

        const prefix = await client.getPrefix(message.guild.id);

        // Check if message starts with prefix
        if (!message.content.startsWith(prefix)) return;

        // Parse command and arguments
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Get command
        const command = client.textCommands.get(commandName) || 
                       client.textCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        if (!message.guild.members.cache.get(client.user.id).permissionsIn(message.channel).has(PermissionFlagsBits.SendMessages)) return;

        try {
            // Check if user is blacklisted
            const blacklistCheck = await checkBlacklist(message.author.id);
            if (blacklistCheck.isBlacklisted) {
                if (blacklistCheck.shouldNotify) {
                    await message.reply(`${config.emojis.banned} You are blacklisted and cannot use commands. Reason: ${blacklistCheck.reason}`);
                }
                return;
            }

            // Check if command is disabled
            if (message.guild && await isCommandDisabled(commandName, message.guild.id)) {
                await message.reply(`${config.emojis.disabled} This command is currently disabled in this server.`);
                return;
            }

            // Check if command is owner only
            if (command.ownerOnly && message.author.id !== config.ownerId) {
                await message.reply(`${config.emojis.error} This command is only available to the bot owner.`);
                return;
            }

            // Check user permissions
            if (command.user_perm && !checkUserPermissions(message.member, command.user_perm)) {
                await message.reply(`${config.emojis.error} You don't have the required permissions to use this command. \n\`${command.user_perm}\``);
                return;
            }

            // Check bot permissions
            if (command.bot_perm && !checkBotPermissions(message.guild, command.bot_perm)) {
                await message.reply(`${config.emojis.error} I don't have the required permissions to execute this command. \n\`${command.bot_perm}\``);
                return;
            }

            // Execute command
            await command.execute(message, args, client, prefix);

            // --- Tutorial Nudge (one-time per session) ---
            const skipCommands = ['start', 'tutorial', 'tut', 'help', 'h'];
            const resolvedName = command.name || commandName;
            if (!skipCommands.includes(resolvedName) && !tutorialNudged.has(message.author.id)) {
                try {
                    const Player = require('../models/Player');
                    const player = await Player.findOne({ userId: message.author.id });
                    if (player && player.tutorialStep !== undefined && player.tutorialStep >= 0 && player.tutorialStep !== -1) {
                        tutorialNudged.add(message.author.id);
                        const nudgeEmbed = new EmbedBuilder()
                            .setColor('#9B59B6')
                            .setDescription(`🧙‍♂️ **Psst!** You haven't finished the tutorial yet. Use \`${prefix}tutorial\` to learn the basics and earn bonus rewards!`);
                        await message.channel.send({ embeds: [nudgeEmbed] });
                    }
                } catch (nudgeErr) {
                    // Silently fail — nudge is non-critical
                }
            }

        } catch (error) {
            await client.handleMessageError(message, error, commandName);
        }
    },
};