const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config/config.json');

// events/guildCreate.js - When bot joins a guild
module.exports = {
    name: 'guildCreate',
    once: false,
    async execute(guild, client) {
        try {
            console.log(`[Guild Join] Added to guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
            
            // Log to console with guild info
            console.log(`Guild Info:
- Name: ${guild.name}
- ID: ${guild.id}
- Owner: ${guild.ownerId}
- Members: ${guild.memberCount}
- Created: ${guild.createdAt.toDateString()}
- Verification Level: ${guild.verificationLevel}
- Total Guilds: ${client.guilds.cache.size}`);

            // Find a suitable channel to send welcome message
            const welcomeChannel = await findWelcomeChannel(guild);
            
            if (welcomeChannel) {
                await sendWelcomeMessage(welcomeChannel, guild);
            }

            // Optional: Send notification to bot owner/log channel
            await notifyBotOwner(client, guild, 'joined');


        } catch (error) {
            console.error('[Guild Join Error]:', error);
        }
    }
};

/**
 * Find the best channel to send welcome message
 * @param {Guild} guild - Discord guild object
 * @returns {TextChannel|null} - Best channel or null
 */
async function findWelcomeChannel(guild) {
    try {
        const botMember = await guild.members.fetch(guild.client.user.id);
        
        // Priority order for welcome channels
        const channelPriorities = [
            'general',
            'welcome',
            'bot-commands',
            'commands',
            'chat'
        ];

        // Check for channels by name
        for (const channelName of channelPriorities) {
            const channel = guild.channels.cache.find(ch => 
                ch.name.toLowerCase().includes(channelName) &&
                ch.isTextBased() &&
                ch.permissionsFor(botMember).has([
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks
                ])
            );
            
            if (channel) return channel;
        }

        // Find first text channel where bot can send messages
        const availableChannel = guild.channels.cache.find(ch =>
            ch.isTextBased() &&
            ch.permissionsFor(botMember).has([
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.EmbedLinks
            ])
        );

        return availableChannel || null;

    } catch (error) {
        console.error('Error finding welcome channel:', error);
        return null;
    }
}

/**
 * Send welcome message to guild
 * @param {TextChannel} channel - Channel to send message
 * @param {Guild} guild - Discord guild object
 */
async function sendWelcomeMessage(channel, guild) {
    try {
        const botUser = guild.client.user;
        const defaultPrefix = config.prefix || '!';

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle(`${botUser.username} has joined ${guild.name}!`)
            .setThumbnail(botUser.displayAvatarURL())
            .setDescription(
                `Thank you for adding me to your server! I'm an RPG adventure bot that brings gaming experiences to Discord.\n\n` +
                `**Quick Start Guide:**\n` +
                `• Use \`${defaultPrefix}help\` to see all available commands\n` +
                `• Use \`${defaultPrefix}start\` to begin your adventure\n` +
                `• Use \`${defaultPrefix}forage\` to gather resources\n` +
                `• Use \`${defaultPrefix}profile\` to view your profile\n\n` +
                `**Key Features:**\n` +
                `🏰 Dungeon exploration and combat\n` +
                `⚗️ Alchemy and potion brewing\n` +
                `🔨 Item crafting and equipment\n` +
                `📋 Quest system with multiple factions\n` +
                `🎒 Inventory management\n` +
                `🏪 Shopping and trading\n\n`
            )
            .addFields([
                {
                    name: '⚙️ Default Prefix',
                    value: `\`${defaultPrefix}\` (can be changed with \`${defaultPrefix}setprefix\`)`,
                    inline: true
                }
            ])
            .setFooter({
                text: `Thank you for inviting me!`,
                iconURL: botUser.displayAvatarURL()
            })
            .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });

    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
}

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