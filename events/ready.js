const { REST, Routes } = require("discord.js");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
        console.log(
            `📊 Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`,
        );

        // Set bot activity
        client.user.setActivity("slash commands | !help", {
            type: "LISTENING",
        });

        // Register slash commands
        await registerSlashCommands(client);
    },
};

async function registerSlashCommands(client) {
    try {
        const commands = [];

        client.slashCommands.forEach((command) => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: "10" }).setToken(
            process.env.BOT_TOKEN,
        );

        console.log(
            `🔄 Started refreshing ${commands.length} application (/) commands.`,
        );

        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log(
            `✅ Successfully reloaded ${data.length} application (/) commands.`,
        );
    } catch (error) {
        console.error("❌ Error registering slash commands:", error);
    }
}
