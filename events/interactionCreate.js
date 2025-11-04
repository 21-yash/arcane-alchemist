const { checkBlacklist, checkUserPermissions, checkBotPermissions, isCommandDisabled } = require('../utils/permissions');
const config = require('../config/config.json');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand() || !interaction.isContextMenuCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        try {
            // Check if user is blacklisted
            const blacklistCheck = await checkBlacklist(interaction.user.id, interaction.guild?.id);
            if (blacklistCheck.isBlacklisted) {
                if (blacklistCheck.shouldNotify) {
                    await interaction.reply({
                        content: `${config.emojis.banned} You are blacklisted and cannot use commands. Reason: ${blacklistCheck.reason}`,
                        ephemeral: true
                    });
                } else {
                    // Silently ignore if cooldown is active
                    return;
                }
                return;
            }

            // Check if command is disabled
            if (interaction.guild && await isCommandDisabled(interaction.commandName, interaction.guild.id)) {
                await interaction.reply({
                    content: `${config.emojis.disabled} This command is currently disabled in this server.`,
                    ephemeral: true
                });
                return;
            }

            // Check if command is owner only
            if (command.ownerOnly && interaction.user.id !== config.ownerId) {
                await interaction.reply({
                    content: `${config.emojis.error} This command is only available to the bot owner.`,
                    ephemeral: true
                });
                return;
            }

            // Check user permissions
            if (command.user_perm && !checkUserPermissions(interaction.member, command.user_perm)) {
                await interaction.reply({
                    content: `${config.emojis.error} You don't have the required permissions to use this command. \n\`${command.user_perm}\``,
                    ephemeral: true
                });
                return;
            }

            // Check bot permissions
            if (command.bot_perm && !checkBotPermissions(interaction.guild, command.bot_perm)) {
                await interaction.reply({
                    content: `${config.emojis.error} I don't have the required permissions to execute this command. \n\`${command.bot_perm}\``,
                    ephemeral: true
                });
                return;
            }

            // Execute command
            await command.execute(interaction, client);

        } catch (error) {
            await client.handleError(interaction, error, interaction.commandName);
        }
    },
};
