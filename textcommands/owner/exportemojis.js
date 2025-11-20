const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'exportemojis',
    description: 'Exports all server emojis into JSON format',
    aliases: [],
    ownerOnly: true,
    async execute(message, args, client, prefix) {
        try {
            const emojis = message.guild.emojis.cache;

            if (!emojis.size)
                return message.reply('No emojis found in this server.');

            // convert "stone_boar" → "Stone Boar"
            const toTitleCase = (str) =>
                str
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase());

            let jsonLines = [];

            emojis.forEach((emoji) => {
                const prettyName = toTitleCase(emoji.name);
                jsonLines.push(`"${prettyName}": "<:${emoji.name}:${emoji.id}>",`);
            });

            let fullText = jsonLines.join('\n');

            // Split into chunks (Discord limit ~4096 chars per embed field)
            const chunks = [];
            const max = 4000; // safe

            while (fullText.length > 0) {
                chunks.push(fullText.slice(0, max));
                fullText = fullText.slice(max);
            }

            const embeds = chunks.map((chunk, index) =>
                new EmbedBuilder()
                    .setTitle(`Emoji Export ${chunks.length > 1 ? `(${index + 1}/${chunks.length})` : ''}`)
                    .setDescription("```json\n" + chunk + "\n```")
                    .setColor('#2b2d31')
            );

            await message.reply({ embeds });

        } catch (err) {
            console.error('Error exporting emojis:', err);
            message.reply('An error occurred while exporting emojis.');
        }
    }
}
