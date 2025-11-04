const { EmbedBuilder } = require('discord.js');
const DisabledCommand = require('../../models/DisabledCommand');
const config = require('../../config/config.json');
const { createArgEmbed } = require('../../utils/embed');

module.exports = {
    name: 'command',
    description: 'Enable or disable a command in this server',
    usage: '<enable|disable> <command> [reason]',
    user_perm: ['ManageGuild'],
    bot_perm: [],
    async execute(message, args, client, prefix) {
        const action = args[0]?.toLowerCase();
        const commandName = args[1]?.toLowerCase();

        if (!action || !['enable', 'disable'].includes(action) || !commandName) {
            const embed = createArgEmbed(prefix, this.name, this.usage);
            return message.reply({ embeds: [embed] });
        }

        // --- Logic for Disabling a Command ---
        if (action === 'disable') {
            const reason = args.slice(2).join(' ') || 'No reason provided';

            // Check if command exists
            const commandExists = client.slashCommands.has(commandName) || client.textCommands.has(commandName);
            if (!commandExists) {
                const embed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`${config.emojis.error} Command Not Found`)
                    .setDescription(`The command \`${commandName}\` does not exist.`);
                return message.reply({ embeds: [embed] });
            }

            // Prevent disabling admin commands
            const adminCommands = ['blacklist', 'command', 'prefix', 'feature'];
            if (adminCommands.includes(commandName)) {
                const embed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`${config.emojis.error} Cannot Disable Admin Command`)
                    .setDescription(`You cannot disable the \`${commandName}\` command as it's an admin command.`);
                return message.reply({ embeds: [embed] });
            }

            try {
                // Check if already disabled
                const existingDisabled = await DisabledCommand.findOne({ commandName, guildId: message.guild.id });
                if (existingDisabled) {
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle(`${config.emojis.warning} Already Disabled`)
                        .setDescription(`The command \`${commandName}\` is already disabled in this server.`);
                    return message.reply({ embeds: [embed] });
                }

                // Disable the command
                await DisabledCommand.create({
                    commandName: commandName,
                    guildId: message.guild.id,
                    disabledBy: message.author.id,
                    reason: reason
                });

                const embed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.disabled} Command Disabled`)
                    .setDescription(`Successfully disabled the \`${commandName}\` command.`)
                    .addFields([
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Disabled by', value: `<@${message.author.id}>`, inline: true }
                    ])
                    .setTimestamp();
                return message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Error disabling command:', error);
                const embed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`${config.emojis.error} Command Error`)
                    .setDescription('An error occurred while processing your command.');
                return message.reply({ embeds: [embed] });
            }
        }

        // --- Logic for Enabling a Command ---
        if (action === 'enable') {
            try {
                // Check if the command is in the database (i.e., if it's disabled)
                const disabledCommand = await DisabledCommand.findOne({ commandName, guildId: message.guild.id });

                if (!disabledCommand) {
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle(`${config.emojis.warning} Already Enabled`)
                        .setDescription(`The command \`${commandName}\` is not currently disabled in this server.`);
                    return message.reply({ embeds: [embed] });
                }

                // Enable the command by deleting the entry
                await DisabledCommand.deleteOne({ commandName, guildId: message.guild.id });

                const embed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.enabled} Command Enabled`)
                    .setDescription(`Successfully enabled the \`${commandName}\` command.`)
                    .addFields([
                        { name: 'Enabled by', value: `<@${message.author.id}>`, inline: true }
                    ])
                    .setTimestamp();
                return message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Error enabling command:', error);
                const embed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`${config.emojis.error} Command Error`)
                    .setDescription('An error occurred while processing your command.');
                return message.reply({ embeds: [embed] });
            }
        }
    },
};
