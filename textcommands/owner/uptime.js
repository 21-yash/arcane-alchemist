const { EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const config = require('../../config/config.json');

module.exports = {
    name: 'uptime',
    description: 'Displays detailed bot uptime and system statistics (Owner Only)',
    aliases: ['stats', 'system'],
    user_perm: [],
    bot_perm: [],
    ownerOnly: true,
    async execute(message, args, client, prefix) {
        
        const uptime = convertTime(client.uptime);
        const processUptime = convertTime(process.uptime() * 1000);
        
        // Memory usage
        const memoryUsage = process.memoryUsage();
        const ramUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const ramAll = (memoryUsage.rss / 1024 / 1024).toFixed(2);

        // System Info
        const platform = os.platform();
        const arch = os.arch();
        const cpuCores = os.cpus().length;
        const cpuModel = os.cpus()[0].model;

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setAuthor({ name: `${client.user.username} System Diagnostics`, iconURL: client.user.displayAvatarURL() })
            .setTitle('📊 Detailed System Statistics')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields([
                { 
                    name: '⏱️ Uptime', 
                    value: `**Client:** ${uptime}\n**Process:** ${processUptime}`, 
                    inline: false 
                },
                { 
                    name: '💻 System Info', 
                    value: `**OS:** ${platform} (${arch})\n**CPU:** ${cpuModel} (${cpuCores} Cores)\n**Node.js:** ${process.version}`, 
                    inline: false 
                },
                { 
                    name: '🧠 Memory Usage', 
                    value: `**Heap Used:** ${ramUsed} MB\n**RSS:** ${ramAll} MB\n**Total System RAM:** ${ramTotal} GB`, 
                    inline: true 
                },
                { 
                    name: '🤖 Bot Stats', 
                    value: `**Guilds:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Channels:** ${client.channels.cache.size}`, 
                    inline: true 
                },
                { 
                    name: '🛠️ Versions', 
                    value: `**Discord.js:** v${djsVersion}`, 
                    inline: true 
                },
                {
                    name: '🏓 Latency',
                    value: `**API:** ${client.ws.ping}ms`,
                    inline: true
                }
            ])
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
};

function convertTime(ms) {
    const roundTowardsZero = ms > 0 ? Math.floor : Math.ceil;
	const days = roundTowardsZero(ms / 86400000),
		hours = roundTowardsZero(ms / 3600000) % 24,
		minutes = roundTowardsZero(ms / 60000) % 60,
		seconds = roundTowardsZero(ms / 1000) % 60;
	if (days === 0 && hours === 0 && minutes === 0) { return `${seconds}s` }
    if (days === 0 && hours === 0) { return `${minutes}m ${seconds}s` }
    if (days === 0) { return `${hours}h ${minutes}m ${seconds}s` }
	return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
