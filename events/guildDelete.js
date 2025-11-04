const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config/config.json');

module.exports = {
    name: 'guildDelete',
    once: false,
    async execute(guild, client) {
        try {
            console.log(`[Guild Leave] Removed from guild: ${guild.name} (${guild.id})`);
            
            // Log detailed info
            console.log(`Guild Leave Info:
- Name: ${guild.name}
- ID: ${guild.id}
- Members: ${guild.memberCount || 'Unknown'}
- Remaining Guilds: ${client.guilds.cache.size}`);

            // Notify bot owner/log channel
            await notifyBotOwner(client, guild, 'left');

        } catch (error) {
            console.error('[Guild Leave Error]:', error);
        }
    }
};

/**
 * Notify bot owner about guild changes
 * @param {Client} client - Discord client
 * @param {Guild} guild - Discord guild object
 * @param {string} action - 'joined' or 'left'
 */
async function notifyBotOwner(client, guild, action) {
    try {
        const logChannelId = config.logChannelId;
        const botOwnerId = config.ownerId;
        
        if (!logChannelId && !botOwnerId) return;

        const actionColor = action === 'joined' ? '#00FF7F' : '#FF6B6B';
        const actionEmoji = action === 'joined' ? '📈' : '📉';
        
        const logEmbed = new EmbedBuilder()
            .setColor(actionColor)
            .setTitle(`${actionEmoji} Guild ${action === 'joined' ? 'Added' : 'Removed'}`)
            .addFields([
                { name: 'Guild Name', value: guild.name, inline: true },
                { name: 'Guild ID', value: guild.id, inline: true },
                { name: 'Members', value: guild.memberCount?.toString() || 'Unknown', inline: true },
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Created', value: guild.createdAt.toDateString(), inline: true },
                { name: 'Total Guilds', value: client.guilds.cache.size.toString(), inline: true }
            ])
            .setTimestamp();

        // Send to log channel
        if (logChannelId) {
            try {
                const logChannel = await client.channels.fetch(logChannelId);
                if (logChannel?.isTextBased()) {
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error('Error sending to log channel:', error);
            }
        }

        // Send DM to bot owner
        if (botOwnerId) {
            try {
                const owner = await client.users.fetch(botOwnerId);
                await owner.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error('Error sending DM to owner:', error);
            }
        }

    } catch (error) {
        console.error('Error notifying bot owner:', error);
    }
}