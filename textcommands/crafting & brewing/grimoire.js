
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const { createErrorEmbed, createInfoEmbed, createCustomEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');

module.exports = {
    name: 'grimoire',
    description: 'View potion recipes in your magical grimoire.',
    usage: '[potion_name]',
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            // Get all potion recipes
            const potionRecipes = Object.entries(GameData.recipes).filter(([recipeId, recipe]) => {
                const resultItem = GameData.getItem(recipe.result.itemId);
                return resultItem && resultItem.type === 'potion';
            });

            if (args.length === 0) {
                // Show all potion recipes
                const recipesPerPage = 8;
                let currentPage = 0;
                const totalPages = Math.ceil(potionRecipes.length / recipesPerPage);

                const createGrimoireEmbed = (page) => {
                    const start = page * recipesPerPage;
                    const end = start + recipesPerPage;
                    const pageRecipes = potionRecipes.slice(start, end);

                    const embed = createCustomEmbed(
                        '📜 Potion Grimoire',
                        'Your collection of discovered potion recipes.',
                        '#9B59B6'
                    );

                    pageRecipes.forEach(([recipeId, recipe]) => {
                        const potion = GameData.getItem(recipe.result.itemId);
                        const isKnown = player.grimoire.includes(recipeId);
                        const status = isKnown ? '✅' : '❓';
                        const ingredients = recipe.ingredients.map(ing => 
                            `${CommandHelpers.getItemEmoji(ing.itemId)} \`x${ing.quantity}\` ${GameData.getItem(ing.itemId)?.name || 'Unknown'}`
                        ).join(', ');

                        embed.addFields({
                            name: `${status} ${potion.name} (${potion.rarity})`,
                            value: isKnown ? 
                                `**Ingredients:** ${ingredients}\n**XP:** ${recipe.xp} | **Level:** ${recipe.level}` :
                                `*Recipe unknown - craft to discover!*`,
                            inline: false
                        });
                    });

                    embed.setFooter({ text: `Page ${page + 1}/${totalPages} • Use ${prefix}grimoire <potion_name> for details` });
                    return embed;
                };

                const createNavigationButtons = (page) => {
                    return new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('grimoire_prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('grimoire_next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === totalPages - 1)
                    );
                };

                const reply = await message.reply({
                    embeds: [createGrimoireEmbed(currentPage)],
                    components: totalPages > 1 ? [createNavigationButtons(currentPage)] : []
                });

                if (totalPages > 1) {
                    const collector = reply.createMessageComponentCollector({
                        filter: i => i.user.id === message.author.id,
                        time: 5 * 60 * 1000
                    });

                    collector.on('collect', async i => {
                        if (i.customId === 'grimoire_prev' && currentPage > 0) {
                            currentPage--;
                        } else if (i.customId === 'grimoire_next' && currentPage < totalPages - 1) {
                            currentPage++;
                        }

                        await i.update({
                            embeds: [createGrimoireEmbed(currentPage)],
                            components: [createNavigationButtons(currentPage)]
                        });
                    });

                    collector.on('end', () => {
                        reply.edit({ components: [] }).catch(() => {});
                    });
                }

            } else {
                // Show specific potion details
                const searchTerm = args.join(' ').toLowerCase().replace(/\s+/g, '_');
                
                // Find potion by name or ID
                const potionId = Object.keys(GameData.items).find(id => 
                    id.toLowerCase() === searchTerm ||
                    GameData.getItem(id)?.name?.toLowerCase().replace(/\s+/g, '_') === searchTerm
                );

                if (!potionId || GameData.getItem(potionId)?.type !== 'potion') {
                    return message.reply({
                        embeds: [createErrorEmbed('Potion Not Found', `Could not find a potion named "${args.join(' ')}".`)]
                    });
                }

                // Find the recipe for this potion
                const recipeEntry = Object.entries(GameData.recipes).find(([recipeId, recipe]) => 
                    recipe.result.itemId === potionId
                );

                if (!recipeEntry) {
                    return message.reply({
                        embeds: [createErrorEmbed('No Recipe Found', `No recipe exists for ${GameData.getItem(potionId)?.name || 'Unknown'}.`)]
                    });
                }

                const [recipeId, recipe] = recipeEntry;
                const potion = GameData.getItem(potionId);
                const isKnown = player.grimoire.includes(recipeId);

                const embed = createCustomEmbed(
                    `📜 ${potion.name}`,
                    potion.description,
                    '#9B59B6'
                );

                embed.addFields(
                    { name: 'Rarity', value: potion.rarity, inline: true },
                    { name: 'Type', value: 'Potion', inline: true },
                    { name: 'Source', value: 'Brewing', inline: true }
                );

                if (potion.effect) {
                    let effectDesc = '';

                    const formatDuration = (dur) => {
                        if (typeof dur === 'string') return dur.replace(/_/g, ' ');
                        const totalMinutes = Math.round(dur / (60 * 1000));
                        if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
                        const hours = Math.round(totalMinutes / 60);
                        return `${hours} hour${hours !== 1 ? 's' : ''}`;
                    };

                    if (potion.effect.type === 'heal') {
                        effectDesc = `Restores ${potion.effect.value} HP`;
                    } else if (potion.effect.type === 'stat_boost') {
                        const stats = Object.entries(potion.effect.stats).map(([stat, val]) => 
                            `+${val} ${stat.toUpperCase()}`
                        ).join(', ');
                        effectDesc = `${stats} for ${formatDuration(potion.effect.duration)}`;
                    } else if (potion.effect.type === 'multi_boost') {
                        const stats = Object.entries(potion.effect.stats).map(([stat, val]) => 
                            `+${val} ${stat.toUpperCase()}`
                        ).join(', ');
                        effectDesc = `${stats} for ${formatDuration(potion.effect.duration)}`;
                    } else if (potion.effect.type === 'special') {
                        effectDesc = `Special: ${potion.effect.ability.replace(/_/g, ' ')} for ${formatDuration(potion.effect.duration)}`;
                    }
                    embed.addFields({ name: 'Effect', value: effectDesc, inline: false });
                }

                if (isKnown) {
                    const ingredients = recipe.ingredients.map(ing => 
                        `• ${CommandHelpers.getItemEmoji(ing.itemId)} \`x${ing.quantity}\` ${GameData.getItem(ing.itemId)?.name || 'Unknown'}`
                    ).join('\n');
                    
                    embed.addFields(
                        { name: 'Recipe', value: ingredients, inline: false },
                        { name: 'XP Reward', value: `${recipe.xp} XP`, inline: true },
                        { name: 'Required Level', value: `Level ${recipe.level}`, inline: true }
                    );
                } else {
                    embed.addFields({
                        name: '🔒 Recipe Unknown',
                        value: 'Craft this potion to discover its recipe!',
                        inline: false
                    });
                }

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Grimoire command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem accessing your grimoire.')]
            });
        }
    }
};