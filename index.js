const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const mongoose = require('mongoose');
const Config = require('./models/Config');
require('dotenv').config();

const { initializeGameEventListeners } = require('./config/gameEvents');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildScheduledEvents
    ],
    allowedMentions: {
        parse: ["roles", "users"],
        repliedUser: false,
    },
    partials: [ Partials.Message, Partials.Reaction, Partials.Channel ]
});

client.slashCommands = new Collection();
client.textCommands = new Collection();
client.events = new Collection();
client.dungeonSessions = new Map();

const gameCache = require('./utils/gameCache');
(async () => {
    try {
        await gameCache.initialize();
        console.log('[Bot] Game cache initialized successfully');
    } catch (error) {
        console.error('[Bot] Failed to initialize game cache:', error);
        process.exit(1);
    }
})();

// Load handlers
require('./handlers/eventHandler')(client);
require('./handlers/commandHandler')(client);
require('./handlers/errorHandler')(client);
initializeGameEventListeners(client);
require('./utils/questScheduler');
require('./webhookListener').startWebhookListener(client);
// Connect to MongoDB
require('./config/database');

// some functions
client.getPrefix = async (guildId) => {
  const data = await Config.findOne({ guildId });
  return data?.prefix || ","; 
};

client.login(process.env.BOT_TOKEN).catch(console.error);

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Bot is starting...');
module.exports = client;