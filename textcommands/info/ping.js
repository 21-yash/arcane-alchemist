const { EmbedBuilder } = require('discord.js');
const config = require('../../config/config.json');

module.exports = {
    name: 'ping',
    description: 'Check bot latency and API response time',
    aliases: ['latency'],
    user_perm: [],
    bot_perm: [],
    async execute(message, args, client, prefix) {
        const sent = await message.reply(`${config.emojis.loading} Calculating ping...`);
        
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        // Determine ping quality
        let pingQuality = 'Excellent';
        let pingColor = config.colors.success;
        
        if (latency > 100 || apiLatency > 100) {
            pingQuality = 'Good';
            pingColor = config.colors.warning;
        }
        if (latency > 200 || apiLatency > 200) {
            pingQuality = 'Poor';
            pingColor = config.colors.error;
        }

        const embed = new EmbedBuilder()
            .setColor(pingColor)
            .setTitle(`${config.emojis.ping} Pong!`)
            .setDescription(`**${pingQuality}** connection quality`)
            .addFields([
                { name: 'Bot Latency', value: `${latency}ms`, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            ])
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        await sent.edit({ content: '', embeds: [embed] });
    },
};


