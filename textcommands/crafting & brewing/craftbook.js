
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const { createErrorEmbed, createInfoEmbed, createCustomEmbed } = require('../../utils/embed');
const allItems = require('../../gamedata/items');
const allRecipes = require('../../gamedata/recipes');

module.exports = {
    name: 'craftbook',
    description: 'View crafting recipes in your master cookbook.',
    usage: '[item_name]',
    aliases: ['recipes', 'crafts'],
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({
                    embeds: [createErrorEmbed('No Adventure Started', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`)]
                });
            }

            // Get all non-potion recipes (equipment, tools, etc.)
            const craftingRecipes = Object.entries(allRecipes).filter(([recipeId, recipe]) => {
                const resultItem = allItems[recipe.result.itemId];
                return resultItem && resultItem.type !== 'potion' && resultItem.source === 'crafting';
            });

            if (args.length === 0) {
                // Show all crafting recipes organized by type
                const recipesPerPage = 6;
                let currentPage = 0;
                const totalPages = Math.ceil(craftingRecipes.length / recipesPerPage);

                const createCookbookEmbed = (page) => {
                    const start = page * recipesPerPage;
                    const end = start + recipesPerPage;
                    const pageRecipes = craftingRecipes.slice(start, end);

                    const embed = createCustomEmbed(
                        '<:crafting:1412818437415244050> Master Craftbook',
                        'Your collection of discovered crafting recipes.',
                        '#E67E22'
                    );

                    pageRecipes.forEach(([recipeId, recipe]) => {
                        const item = allItems[recipe.result.itemId];
                        const isKnown = player.craftingJournal.includes(recipeId);
                        const status = isKnown ? '✅' : '❓';
                        
                        let typeIcon = '';
                        switch(item.type) {
                            case 'equipment': typeIcon = '⚔️'; break;
                            case 'hatcher': typeIcon = '🥚'; break;
                            case 'crafting_material': typeIcon = '🔧'; break;
                            default: typeIcon = '📦';
                        }

                        const ingredients = recipe.ingredients.map(ing => 
                            `${allItems[ing.itemId].name} x${ing.quantity}`
                        ).join(', ');

                        embed.addFields({
                            name: `${status} ${typeIcon} ${item.name} (${item.rarity})`,
                            value: isKnown ? 
                                `**Materials:** ${ingredients}\n**XP:** ${recipe.xp} | **Level:** ${recipe.level}` :
                                `*Recipe unknown - craft to discover!*`,
                            inline: false
                        });
                    });

                    embed.setFooter({ text: `Page ${page + 1}/${totalPages} • Use ${prefix}craftbook <item_name> for details` });
                    return embed;
                };

                const createNavigationButtons = (page) => {
                    return new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('cookbook_prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('cookbook_next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === totalPages - 1)
                    );
                };

                const reply = await message.reply({
                    embeds: [createCookbookEmbed(currentPage)],
                    components: totalPages > 1 ? [createNavigationButtons(currentPage)] : []
                });

                if (totalPages > 1) {
                    const collector = reply.createMessageComponentCollector({
                        filter: i => i.user.id === message.author.id,
                        time: 5 * 60 * 1000
                    });

                    collector.on('collect', async i => {
                        if (i.customId === 'cookbook_prev' && currentPage > 0) {
                            currentPage--;
                        } else if (i.customId === 'cookbook_next' && currentPage < totalPages - 1) {
                            currentPage++;
                        }

                        await i.update({
                            embeds: [createCookbookEmbed(currentPage)],
                            components: [createNavigationButtons(currentPage)]
                        });
                    });

                    collector.on('end', () => {
                        reply.edit({ components: [] }).catch(() => {});
                    });
                }

            } else {
                // Show specific item details
                const searchTerm = args.join(' ').toLowerCase().replace(/\s+/g, '_');
                
                // Find item by name or ID
                const itemId = Object.keys(allItems).find(id => 
                    id.toLowerCase() === searchTerm ||
                    allItems[id].name.toLowerCase().replace(/\s+/g, '_') === searchTerm
                );

                if (!itemId || allItems[itemId].type === 'potion') {
                    return message.reply({
                        embeds: [createErrorEmbed('Item Not Found', `Could not find a craftable item named "${args.join(' ')}" or it's a potion (use !grimoire for potions).`)]
                    });
                }

                // Find the recipe for this item
                const recipeEntry = Object.entries(allRecipes).find(([recipeId, recipe]) => 
                    recipe.result.itemId === itemId
                );

                if (!recipeEntry) {
                    return message.reply({
                        embeds: [createErrorEmbed('No Recipe Found', `No crafting recipe exists for ${allItems[itemId].name}.`)]
                    });
                }

                const [recipeId, recipe] = recipeEntry;
                const item = allItems[itemId];
                const isKnown = player.craftingJournal.includes(recipeId);

                let typeIcon = '';
                switch(item.type) {
                    case 'equipment': typeIcon = '⚔️'; break;
                    case 'hatcher': typeIcon = '🥚'; break;
                    case 'crafting_material': typeIcon = '🔧'; break;
                    default: typeIcon = '📦';
                }

                const embed = createCustomEmbed(
                    `${typeIcon} ${item.name}`,
                    item.description,
                    '#E67E22'
                );

                embed.addFields(
                    { name: 'Rarity', value: item.rarity, inline: true },
                    { name: 'Type', value: item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), inline: true },
                    { name: 'Source', value: 'Crafting', inline: true }
                );

                // Add equipment stats if applicable
                if (item.stats) {
                    const stats = Object.entries(item.stats).map(([stat, value]) => 
                        `${stat.toUpperCase()}: +${value}`
                    ).join(' | ');
                    embed.addFields({ name: '📊 Stats', value: stats, inline: false });
                }

                if (isKnown) {
                    const ingredients = recipe.ingredients.map(ing => 
                        `• ${allItems[ing.itemId].name} x${ing.quantity}`
                    ).join('\n');
                    
                    embed.addFields(
                        { name: '🔨 Recipe', value: ingredients, inline: false },
                        { name: 'XP Reward', value: `${recipe.xp} XP`, inline: true },
                        { name: 'Required Level', value: `Level ${recipe.level}`, inline: true }
                    );
                } else {
                    embed.addFields({
                        name: '🔒 Recipe Unknown',
                        value: 'Craft this item to discover its recipe!',
                        inline: false
                    });
                }

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Cookbook command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem accessing your cookbook.')]
            });
        }
    }
};