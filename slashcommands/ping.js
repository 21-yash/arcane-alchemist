const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong! and shows the bot latency'),
    
    async execute(interaction, client) {
        try {
            // Calculate the bot's latency
            const botLatency = Date.now() - interaction.createdTimestamp;
            const apiLatency = Math.round(client.ws.ping);
            
            await interaction.reply({
                content: `🏓 Pong!\n**Bot Latency:** ${botLatency}ms\n**API Latency:** ${apiLatency}ms`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Ping command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the ping command.',
                ephemeral: true
            });
        }
    }
};
