const { EmbedBuilder } = require('discord.js');
const config = require('../../config/config.json');
const Player = require('../../models/Player');
const { getMember } = require('../../utils/functions');

// Available badges
const AVAILABLE_BADGES = {
    'beta_user': {
        name: 'Beta User',
        description: 'An early supporter who helped test the bot!',
        icon: 'badge_beta_user.png'
    }
    // Add more badges here as needed
};

module.exports = {
    name: 'badge',
    description: 'Manage user badges (Owner only)',
    usage: '<add/remove/list> <user> <badge_id>',
    aliases: ['badges'],
    user_perm: [],
    bot_perm: [],
    ownerOnly: true,
    async execute(message, args, client, prefix) {
        
        if (!args[0]) {
            const badgeList = Object.entries(AVAILABLE_BADGES)
                .map(([id, badge]) => `\`${id}\` - ${badge.name}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('🏅 Badge Management')
                .setDescription(`Usage: \`${prefix}badge <add/remove/list> <user> [badge_id]\``)
                .addFields([
                    { name: 'Available Badges', value: badgeList || 'No badges defined', inline: false },
                    { name: 'Examples', value: 
                        `\`${prefix}badge add @user beta_user\`\n` +
                        `\`${prefix}badge remove @user beta_user\`\n` +
                        `\`${prefix}badge list @user\``, 
                    inline: false }
                ]);
            
            return message.reply({ embeds: [embed] });
        }

        const action = args[0].toLowerCase();

        if (action === 'list') {
            // List all available badges
            const badgeList = Object.entries(AVAILABLE_BADGES)
                .map(([id, badge]) => `**${badge.name}** (\`${id}\`)\n${badge.description}`)
                .join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('🏅 Available Badges')
                .setDescription(badgeList || 'No badges defined');
            
            // If user specified, show their badges
            if (args[1]) {
                const member = getMember(message, args[1]);
                if (member) {
                    const player = await Player.findOne({ userId: member.id });
                    if (player && player.badges && player.badges.length > 0) {
                        const userBadges = player.badges.map(b => {
                            const badge = AVAILABLE_BADGES[b];
                            return badge ? `🏅 ${badge.name}` : `🏅 ${b}`;
                        }).join('\n');
                        embed.addFields({ name: `${member.user.username}'s Badges`, value: userBadges, inline: false });
                    } else {
                        embed.addFields({ name: `${member.user.username}'s Badges`, value: 'No badges', inline: false });
                    }
                }
            }
            
            return message.reply({ embeds: [embed] });
        }

        if (action === 'add' || action === 'remove') {
            if (!args[1] || !args[2]) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle(`${config.emojis.error} Missing Arguments`)
                        .setDescription(`Usage: \`${prefix}badge ${action} <user> <badge_id>\``)]
                });
            }

            const member = getMember(message, args[1]);
            if (!member) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle(`${config.emojis.error} User Not Found`)
                        .setDescription('Could not find that user.')]
                });
            }

            const badgeId = args[2].toLowerCase();

            // Validate badge exists
            if (!AVAILABLE_BADGES[badgeId]) {
                const badgeList = Object.keys(AVAILABLE_BADGES).map(b => `\`${b}\``).join(', ');
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle(`${config.emojis.error} Invalid Badge`)
                        .setDescription(`Badge \`${badgeId}\` does not exist.\n\n**Available badges:** ${badgeList}`)]
                });
            }

            const player = await Player.findOne({ userId: member.id });
            if (!player) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle(`${config.emojis.error} Player Not Found`)
                        .setDescription(`${member.user.username} doesn't have a player profile.`)]
                });
            }

            // Initialize badges array if it doesn't exist
            if (!player.badges) {
                player.badges = [];
            }

            if (action === 'add') {
                if (player.badges.includes(badgeId)) {
                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle(`${config.emojis.warning} Already Has Badge`)
                            .setDescription(`${member.user.username} already has the **${AVAILABLE_BADGES[badgeId].name}** badge.`)]
                    });
                }

                player.badges.push(badgeId);
                await player.save();

                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle(`${config.emojis.success} Badge Added`)
                        .setDescription(`Added **${AVAILABLE_BADGES[badgeId].name}** badge to ${member.user.username}!`)]
                });

            } else if (action === 'remove') {
                if (!player.badges.includes(badgeId)) {
                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle(`${config.emojis.warning} Doesn't Have Badge`)
                            .setDescription(`${member.user.username} doesn't have the **${AVAILABLE_BADGES[badgeId].name}** badge.`)]
                    });
                }

                player.badges = player.badges.filter(b => b !== badgeId);
                await player.save();

                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle(`${config.emojis.success} Badge Removed`)
                        .setDescription(`Removed **${AVAILABLE_BADGES[badgeId].name}** badge from ${member.user.username}.`)]
                });
            }
        }

        // Invalid action
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} Invalid Action`)
                .setDescription(`Action must be \`add\`, \`remove\`, or \`list\`.`)]
        });
    },
};
