const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config.json');
const Player = require('../../models/Player');

module.exports = {
    name: 'vote',
    description: 'Support the bot by voting!',
    aliases: ['voting', 'support'],
    user_perm: [],
    bot_perm: [],
    async execute(message, args, client, prefix) {
        
        let voteStatus = 'You can vote now!';
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (player && player.lastVotedAt) {
                const cooldown = 12 * 60 * 60 * 1000; // 12 hours in ms
                const nextVoteTime = new Date(player.lastVotedAt).getTime() + cooldown;
                
                if (Date.now() < nextVoteTime) {
                    voteStatus = `<t:${Math.floor(nextVoteTime / 1000)}:R>`;
                }
            }
        } catch (error) {
            console.error('Error fetching vote status:', error);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`✨ Support ${client.user.username}!`)
            .setDescription(`Voting helps us grow and reach more users. You can vote every 12 hours!\n\n**Vote Status:** ${voteStatus}`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .addFields([
                { name: '🏆 Top.gg', value: '[Vote Here](https://top.gg/bot/849583244868321300/vote)', inline: true }
            ])
            .setFooter({ text: 'Thank you for your support! ❤️', iconURL: message.author.displayAvatarURL() });

        // Create a row with buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Top.gg')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://top.gg/bot/849583244868321300/vote')
                    .setEmoji('🏆'),
            );

        await message.reply({ embeds: [embed], components: [row] });
    },
};
