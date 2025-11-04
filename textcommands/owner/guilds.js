const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed, createCustomEmbed } = require('../../utils/embed');
const config = require('../../config/config.json');

module.exports = {
    name: 'guilds',
    description: 'View and manage bot guilds (Owner only)',
    ownerOnly: true,
    aliases: ['servers', 'guildlist'],
    usage: '[list] | [info <guild_id>] | [leave <guild_id>] | [stats]',
    ownerOnly: true,
    async execute(message, args, client, prefix) {
        try {

            const subcommand = args[0]?.toLowerCase() || 'list';

            switch (subcommand) {
                case 'list':
                    await handleGuildList(message, args, client);
                    break;
                case 'info':
                    await handleGuildInfo(message, args, client);
                    break;
                case 'leave':
                    await handleLeaveGuild(message, args, client);
                    break;
                case 'stats':
                    await handleGuildStats(message, client);
                    break;
                default:
                    await handleGuildList(message, args, client);
            }

        } catch (error) {
            console.error('Guilds command error:', error);
            message.reply({
                embeds: [createErrorEmbed('Command Error', 'An error occurred while executing the command.')]
            });
        }
    }
};

/**
 * Handle guild list display with pagination
 */
async function handleGuildList(message, args, client) {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        
        if (guilds.length === 0) {
            return message.reply({
                embeds: [createCustomEmbed('No Guilds', 'Bot is not in any guilds.', '#FFA500')]
            });
        }

        // Sort guilds by member count (descending)
        guilds.sort((a, b) => b.memberCount - a.memberCount);

        const guildsPerPage = 10;
        let currentPage = 0;
        const totalPages = Math.ceil(guilds.length / guildsPerPage);

        const generateGuildListEmbed = (page) => {
            const start = page * guildsPerPage;
            const pageGuilds = guilds.slice(start, start + guildsPerPage);
            
            const guildList = pageGuilds.map((guild, index) => {
                const position = start + index + 1;
                const owner = guild.members.cache.get(guild.ownerId);
                const ownerName = owner ? `${owner.user.username}` : 'Unknown';
                
                return `**${position}.** ${guild.name}\n` +
                       `└ ID: \`${guild.id}\`\n` +
                       `└ Members: ${guild.memberCount.toLocaleString()}\n` +
                       `└ Owner: ${ownerName}\n` +
                       `└ Created: ${guild.createdAt.toDateString()}`;
            }).join('\n\n');

            const totalMembers = guilds.reduce((sum, guild) => sum + guild.memberCount, 0);

            return createCustomEmbed(
                `Guild List (${guilds.length} servers)`,
                guildList,
                '#4169E1',
                {
                    footer: { 
                        text: `Page ${page + 1} of ${totalPages} • Total Members: ${totalMembers.toLocaleString()}` 
                    }
                }
            );
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('guild_previous')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('guild_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('guild_stats')
                    .setLabel('Statistics')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('guild_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔄')
            );
        };

        const reply = await message.reply({
            embeds: [generateGuildListEmbed(currentPage)],
            components: [generateButtons(currentPage)]
        });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 10 * 60 * 1000, // 10 minutes
            componentType: ComponentType.Button
        });

        collector.on('collect', async i => {
            try {
                switch (i.customId) {
                    case 'guild_previous':
                        currentPage--;
                        break;
                    case 'guild_next':
                        currentPage++;
                        break;
                    case 'guild_stats':
                        await handleGuildStats(i, client, true);
                        return;
                    case 'guild_refresh':
                        // Refresh guild list
                        currentPage = 0;
                        await i.update({
                            embeds: [generateGuildListEmbed(currentPage)],
                            components: [generateButtons(currentPage)]
                        });
                        return;
                }

                await i.update({
                    embeds: [generateGuildListEmbed(currentPage)],
                    components: [generateButtons(currentPage)]
                });
            } catch (error) {
                console.error('Guild list button error:', error);
                await i.deferUpdate().catch(() => {});
            }
        });

        collector.on('end', () => {
            const disabledButtons = generateButtons(currentPage);
            disabledButtons.components.forEach(button => button.setDisabled(true));
            reply.edit({ components: [disabledButtons] }).catch(() => {});
        });

    } catch (error) {
        console.error('Guild list error:', error);
        throw error;
    }
}

/**
 * Handle detailed guild information
 */
async function handleGuildInfo(message, args, client) {
    try {
        if (!args[1]) {
            return message.reply({
                embeds: [createErrorEmbed('Missing Guild ID', 'Usage: `guilds info <guild_id>`')]
            });
        }

        const guildId = args[1];
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            return message.reply({
                embeds: [createErrorEmbed('Guild Not Found', `No guild found with ID: \`${guildId}\``)]
            });
        }

        // Fetch additional guild data
        await guild.fetch();
        const owner = await guild.fetchOwner().catch(() => null);
        const channels = guild.channels.cache;
        const roles = guild.roles.cache;

        const guildEmbed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle(`Guild Information: ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields([
                {
                    name: 'Basic Info',
                    value: `**Name:** ${guild.name}\n` +
                           `**ID:** \`${guild.id}\`\n` +
                           `**Created:** ${guild.createdAt.toDateString()}\n` +
                           `**Joined:** ${guild.joinedAt.toDateString()}`,
                    inline: true
                },
                {
                    name: 'Statistics',
                    value: `**Members:** ${guild.memberCount.toLocaleString()}\n` +
                           `**Channels:** ${channels.size}\n` +
                           `**Roles:** ${roles.size}\n` +
                           `**Emojis:** ${guild.emojis.cache.size}`,
                    inline: true
                },
                {
                    name: 'Server Details',
                    value: `**Owner:** ${owner ? `${owner.user.username} (${owner.user.id})` : 'Unknown'}\n` +
                           `**Verification:** ${getVerificationLevel(guild.verificationLevel)}\n` +
                           `**Boost Level:** ${guild.premiumTier}\n` +
                           `**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
                    inline: false
                },
                {
                    name: 'Channel Breakdown',
                    value: `**Text:** ${channels.filter(c => c.type === 0).size}\n` +
                           `**Voice:** ${channels.filter(c => c.type === 2).size}\n` +
                           `**Categories:** ${channels.filter(c => c.type === 4).size}\n` +
                           `**Threads:** ${channels.filter(c => [10, 11, 12].includes(c.type)).size}`,
                    inline: true
                },
                {
                    name: 'Features',
                    value: guild.features.length > 0 ? 
                           guild.features.map(f => f.replace(/_/g, ' ').toLowerCase()).join(', ') : 
                           'None',
                    inline: false
                }
            ])
            .setTimestamp();

        if (guild.description) {
            guildEmbed.setDescription(guild.description);
        }

        // Action buttons
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`leave_guild_${guild.id}`)
                .setLabel('Leave Guild')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚪'),
            new ButtonBuilder()
                .setCustomId(`guild_invite_${guild.id}`)
                .setLabel('Create Invite')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔗')
        );

        const reply = await message.reply({
            embeds: [guildEmbed],
            components: [actionRow]
        });

        // Handle button interactions
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 5 * 60 * 1000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async i => {
            if (i.customId.startsWith('leave_guild_')) {
                await handleLeaveConfirmation(i, guild);
            } else if (i.customId.startsWith('guild_invite_')) {
                await handleCreateInvite(i, guild);
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });

    } catch (error) {
        console.error('Guild info error:', error);
        throw error;
    }
}

/**
 * Handle leaving a guild with confirmation
 */
async function handleLeaveGuild(message, args, client) {
    try {
        if (!args[1]) {
            return message.reply({
                embeds: [createErrorEmbed('Missing Guild ID', 'Usage: `guilds leave <guild_id>`')]
            });
        }

        const guildId = args[1];
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            return message.reply({
                embeds: [createErrorEmbed('Guild Not Found', `No guild found with ID: \`${guildId}\``)]
            });
        }

        await handleLeaveConfirmation(message, guild, false);

    } catch (error) {
        console.error('Leave guild error:', error);
        throw error;
    }
}

/**
 * Handle leave confirmation
 */
async function handleLeaveConfirmation(interaction, guild, isButton = true) {
    try {
        const confirmEmbed = createCustomEmbed(
            'Confirm Guild Leave',
            `Are you sure you want to leave **${guild.name}**?\n\n` +
            `**Members:** ${guild.memberCount.toLocaleString()}\n` +
            `**ID:** \`${guild.id}\`\n\n` +
            'This action cannot be undone.',
            '#FFA500'
        );

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_leave')
                .setLabel('Yes, Leave Guild')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_leave')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const method = isButton ? 'update' : 'reply';
        const confirmReply = await interaction[method]({
            embeds: [confirmEmbed],
            components: [confirmRow]
        });

        const confirmCollector = confirmReply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000,
            componentType: ComponentType.Button
        });

        confirmCollector.on('collect', async i => {
            if (i.customId === 'confirm_leave') {
                try {
                    await guild.leave();
                    await i.update({
                        embeds: [createSuccessEmbed(
                            'Left Guild',
                            `Successfully left **${guild.name}** (${guild.id})`
                        )],
                        components: []
                    });
                } catch (error) {
                    await i.update({
                        embeds: [createErrorEmbed(
                            'Failed to Leave',
                            'An error occurred while leaving the guild.'
                        )],
                        components: []
                    });
                }
            } else {
                await i.update({
                    embeds: [createCustomEmbed('Cancelled', 'Guild leave cancelled.', '#808080')],
                    components: []
                });
            }
        });

        confirmCollector.on('end', collected => {
            if (collected.size === 0) {
                confirmReply.edit({ components: [] }).catch(() => {});
            }
        });

    } catch (error) {
        console.error('Leave confirmation error:', error);
    }
}

/**
 * Handle creating an invite
 */
async function handleCreateInvite(interaction, guild) {
    try {
        const channel = guild.channels.cache.find(c => 
            c.isTextBased() && 
            c.permissionsFor(guild.members.me).has('CreateInstantInvite')
        );

        if (!channel) {
            await interaction.reply({
                embeds: [createErrorEmbed('No Permission', 'Cannot create invite - no suitable channel found.')],
                ephemeral: true
            });
            return;
        }

        const invite = await channel.createInvite({
            maxAge: 0,
            maxUses: 0,
            reason: 'Created by bot owner'
        });

        await interaction.reply({
            embeds: [createSuccessEmbed(
                'Invite Created',
                `**Guild:** ${guild.name}\n**Invite:** ${invite.url}`
            )],
            ephemeral: true
        });

    } catch (error) {
        await interaction.reply({
            embeds: [createErrorEmbed('Failed', 'Could not create invite.')],
            ephemeral: true
        });
    }
}

/**
 * Handle guild statistics
 */
async function handleGuildStats(messageOrInteraction, client, isInteraction = false) {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        const totalMembers = guilds.reduce((sum, guild) => sum + guild.memberCount, 0);
        
        // Calculate statistics
        const largestGuild = guilds.reduce((prev, current) => 
            prev.memberCount > current.memberCount ? prev : current
        );
        
        const smallestGuild = guilds.reduce((prev, current) => 
            prev.memberCount < current.memberCount ? prev : current
        );

        const averageMembers = Math.round(totalMembers / guilds.length);
        
        const sizeDistribution = {
            tiny: guilds.filter(g => g.memberCount < 50).length,
            small: guilds.filter(g => g.memberCount >= 50 && g.memberCount < 250).length,
            medium: guilds.filter(g => g.memberCount >= 250 && g.memberCount < 1000).length,
            large: guilds.filter(g => g.memberCount >= 1000).length
        };

        const statsEmbed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle('Bot Guild Statistics')
            .addFields([
                {
                    name: 'Overview',
                    value: `**Total Guilds:** ${guilds.length.toLocaleString()}\n` +
                           `**Total Members:** ${totalMembers.toLocaleString()}\n` +
                           `**Average Members:** ${averageMembers.toLocaleString()}`,
                    inline: true
                },
                {
                    name: 'Extremes',
                    value: `**Largest:** ${largestGuild.name} (${largestGuild.memberCount.toLocaleString()})\n` +
                           `**Smallest:** ${smallestGuild.name} (${smallestGuild.memberCount.toLocaleString()})`,
                    inline: true
                },
                {
                    name: 'Size Distribution',
                    value: `**Tiny (<50):** ${sizeDistribution.tiny}\n` +
                           `**Small (50-249):** ${sizeDistribution.small}\n` +
                           `**Medium (250-999):** ${sizeDistribution.medium}\n` +
                           `**Large (1000+):** ${sizeDistribution.large}`,
                    inline: false
                }
            ])
            .setTimestamp();

        const method = isInteraction ? 'reply' : 'reply';
        const options = isInteraction ? { ephemeral: true } : {};

        await messageOrInteraction[method]({
            embeds: [statsEmbed],
            ...options
        });

    } catch (error) {
        console.error('Guild stats error:', error);
        throw error;
    }
}

/**
 * Get human-readable verification level
 */
function getVerificationLevel(level) {
    const levels = {
        0: 'None',
        1: 'Low',
        2: 'Medium', 
        3: 'High',
        4: 'Very High'
    };
    return levels[level] || 'Unknown';
}