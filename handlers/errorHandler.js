const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.json');

module.exports = (client) => {
    // Handle Discord.js errors
    client.on('error', (error) => {
        console.error('❌ Discord Client Error:', error);
    });

    client.on('warn', (warning) => {
        console.warn('⚠️ Discord Client Warning:', warning);
    });

    client.on('debug', (info) => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🐛 Discord Client Debug:', info);
        }
    });

    // Rate limit handling
    client.on('rateLimit', (rateLimitData) => {
        console.warn('⚠️ Rate Limited:', rateLimitData);
    });

    // Global error handler for commands
    client.handleError = async (interaction, error, commandName) => {
        console.error(`❌ Error in command ${commandName}:`, error);

        // Send detailed error to error channel
        await sendErrorToChannel(client, {
            type: 'Slash Command Error',
            command: commandName,
            user: `${interaction.user.tag} (${interaction.user.id})`,
            guild: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DM',
            error: error.message,
            stack: error.stack
        });

        // Send simple error message to user
        const userEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Command Error`)
            .setDescription('An error occurred while processing your command. If this persists, please report it to the server administrators.')
            .setTimestamp();

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [userEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [userEmbed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError);
        }
    };

    // Global error handler for messages
    client.handleMessageError = async (message, error, commandName) => {
        console.error(`❌ Error in text command ${commandName}:`, error);

        // Send detailed error to error channel
        await sendErrorToChannel(client, {
            type: 'Text Command Error',
            command: commandName,
            user: `${message.author.tag} (${message.author.id})`,
            guild: message.guild ? `${message.guild.name} (${message.guild.id})` : 'DM',
            error: error.message,
            stack: error.stack
        });

        // Send simple error message to user
        const userEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Command Error`)
            .setDescription('An error occurred while processing your command. If this persists, please report it to the server administrators.')
            .setTimestamp();

        try {
            await message.reply({ embeds: [userEmbed] });
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError);
        }
    };
};

// Helper function to send detailed errors to error channel
async function sendErrorToChannel(client, errorData) {
    try {
        if (!config.errorChannelId || config.errorChannelId === 'YOUR_ERROR_CHANNEL_ID') {
            return; // No error channel configured
        }

        const errorChannel = await client.channels.fetch(config.errorChannelId).catch(() => null);
        if (!errorChannel) {
            console.warn('⚠️ Error channel not found or inaccessible');
            return;
        }

        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`🚨 ${errorData.type}`)
            .setDescription('**Error Details:**')
            .addFields([
                { name: 'Command', value: errorData.command, inline: true },
                { name: 'User', value: errorData.user, inline: true },
                { name: 'Server', value: errorData.guild, inline: true },
                { name: 'Error Message', value: errorData.error.substring(0, 1024), inline: false }
            ])
            .setTimestamp();

        // Add stack trace if available (truncated for embed limits)
        if (errorData.stack) {
            const stackTrace = errorData.stack.substring(0, 1024);
            errorEmbed.addFields([{ name: 'Stack Trace', value: `\`\`\`${stackTrace}\`\`\``, inline: false }]);
        }

        await errorChannel.send({ embeds: [errorEmbed] });
    } catch (err) {
        console.error('❌ Failed to send error to error channel:', err);
    }
}