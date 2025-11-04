const { createArgEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');

module.exports = {
    name: 'test',
    description: 'description',
    usage: 'test',
    aliases: ['t'],
    user_perm: [],
    bot_perm: [],
    async execute(message, args, client) {

        const item = GameData.getItem('level_potion');

        if (item) {
            await message.reply(`✅ Found item by ID: **${item.name}** (Type: ${item.type})`);
        } else {
            await message.reply("❌ Could not find an item with the ID 'level_potion'.");
        }

        const allItems = GameData.items;

        const itemsString = JSON.stringify(allItems, null, 2);

        if (itemsString.length > 1900) {
            await message.channel.send({
                embeds: [createSuccessEmbed('All Item Data (Too long to display)', 'The item data is loaded but too large to show in a single embed.')]
            });
        } else {
             await message.channel.send({
                embeds: [createSuccessEmbed('All Item Data', '```json\n' + itemsString + '\n```')]
            });
        }
    }
}