const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createSuccessEmbed, createInfoEmbed, createWarningEmbed } = require('../../utils/embed');
const { restoreStamina } = require('../../utils/stamina');
const GameData = require('../../utils/gameData');
const config = require('../../config/config.json');
const { grantPlayerXp } = require('../../utils/leveling');
const cooldowns = new Map();
const { updateQuestProgress } = require('../../utils/questSystem');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');

module.exports = {
    name: 'forage',
    description: 'Forage for alchemical ingredients in a specific biome.',
    usage: '[biome name]',
    aliases: ['gather'],
    async execute(message, args, client, prefix) {

        if (cooldowns.has(message.author.id)) {
        const expiresAt = cooldowns.get(message.author.id);
        const remainingTime = (expiresAt - Date.now()) / 1000; 

            return message.reply({
                embeds: [
                    createWarningEmbed(
                        `${config.emojis.loading} Cooldown`,
                        `You need to wait another ${remainingTime.toFixed(1)} seconds.`
                    )
                ]
            });
        }

        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            let player = playerResult.player;

            const { effects: labEffects } = await LabManager.loadPlayerLab(player);

            let biomeId;
            if (args.length > 0) {
                biomeId = args.join('_').toLowerCase();
            } else if (player.preferences?.selectedBiome) {
                biomeId = player.preferences.selectedBiome;
            } else {
                biomeId = Object.keys(GameData.biomes)[0];
            }
            
            const biome = GameData.getBiome(biomeId);

            if (!biome) {
                const availableBiomes = Object.values(GameData.biomes).map(b => `\`${b.name}\``).join(', ');
                return message.reply({ embeds: [createErrorEmbed('Invalid Biome', `That biome does not exist. Available biomes: ${availableBiomes}`)] });
            }

            if (player.level < biome.levelRequirement) {
                return message.reply({ embeds: [createErrorEmbed('Level Too Low', `You must be level **${biome.levelRequirement}** to forage in the **${biome.name}**.`)] });
            }

            player = await restoreStamina(player, labEffects);

            // if (player.stamina < biome.staminaCost) {
            //     const staminaNeeded = biome.staminaCost - player.stamina;
            //     const timeToWaitMinutes = Math.ceil(staminaNeeded / 1) * 2; // Assuming 1 stamina per 5 mins
            //     return message.reply({ embeds: [
            //         createErrorEmbed('Not Enough Stamina!', `You are too tired. You need **${staminaNeeded}** more stamina.\nPlease wait approximately **${timeToWaitMinutes} minutes**.`)] 
            //     });
            // }

            const foundLoot = [];
            for (const lootItem of biome.lootTable) {
                const chanceBonus = 1 + (labEffects?.rareItemChanceBonus || 0);
                const lootChance = Math.min(1, lootItem.chance * chanceBonus);
                if (Math.random() < lootChance) {
                    const baseQuantity = Math.floor(Math.random() * (lootItem.quantityRange[1] - lootItem.quantityRange[0] + 1)) + lootItem.quantityRange[0];
                    const quantityMultiplier = 1 + (labEffects?.forageYieldBonus || 0);
                    const quantity = Math.max(1, Math.round(baseQuantity * quantityMultiplier));
                    foundLoot.push({ itemId: lootItem.itemId, quantity });
                }
            }

            player.lastStaminaUpdate = new Date();
            player.stats.forageCount += 1;

            let lootDescription = '';
            if (foundLoot.length > 0) {
                foundLoot.forEach(loot => {
                    const existingItem = player.inventory.find(i => i.itemId === loot.itemId);
                    if (existingItem) {
                        existingItem.quantity += loot.quantity;
                    } else {
                        player.inventory.push({ itemId: loot.itemId, quantity: loot.quantity });
                    }
                    lootDescription += `+ **${loot.quantity}x** ${GameData.getItem(loot.itemId)?.name || 'Unknown'}\n`;
                });
            } else {
                lootDescription = 'You searched carefully but found nothing of value.';
            }

            await player.save();
            client.emit('forage', message.author.id);

            const successEmbed = createSuccessEmbed(
                `Foraging in the ${biome.name}`,
                lootDescription, { footer: { text: `Stamina: ${player.stamina}/${player.maxStamina}`, iconURL: message.member.displayAvatarURL() }, thumbnail: biome.pic }
            );
            await message.reply({ embeds: [successEmbed] });
            grantPlayerXp(client, message, message.author.id, biome.staminaCost, { labEffects });
            await updateQuestProgress(message.author.id, 'forage_times', 1);
            if (foundLoot.length > 0) {
                await updateQuestProgress(message.author.id, 'collect_items', foundLoot.length);
            }

            let encounteredPalInfo = null;
            if (biome.possiblePals && biome.possiblePals.length > 0) {
                for (const pal of biome.possiblePals) {
                    if (Math.random() < pal.chance) {
                        encounteredPalInfo = { ...GameData.getPet(pal.palId), id: pal.palId };
                        break;
                    }
                }
            }

            if (encounteredPalInfo) {
                const encounterEmbed = createInfoEmbed(
                    `A wild ${encounteredPalInfo.name} appeared!`,
                    `While foraging, you stumble upon a wild **${encounteredPalInfo.name}**. It looks at you curiously.`,
                    {
                        thumbnail: encounteredPalInfo.pic
                    }
                );

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`tame_${encounteredPalInfo.id}`).setLabel('Attempt to Tame').setStyle(ButtonStyle.Success).setEmoji('🐾'),
                    new ButtonBuilder().setCustomId('ignore').setLabel('Leave it Be').setStyle(ButtonStyle.Secondary)
                );

                const encounterMessage = await message.channel.send({ embeds: [encounterEmbed], components: [buttons] });
                
                const collector = encounterMessage.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 2 * 60 * 1000,
                    componentType: ComponentType.Button
                });

                collector.on('collect', async i => {
                    if (i.customId === 'ignore') {
                        await i.update({
                            embeds: [createInfoEmbed(`You left the ${encounteredPalInfo.name} alone.`, 'It watches you for a moment before disappearing back into the wilds.')],
                            components: []
                        });
                        return collector.stop();
                    }

                    if (i.customId.startsWith('tame_')) {

                        player.palCounter += 1;
                        const newShortId = player.palCounter;

                        const newPal = new Pet({
                            ownerId: message.author.id,
                            basePetId: encounteredPalInfo.id,
                            shortId: newShortId,
                            nickname: encounteredPalInfo.name,
                            level: 1,
                            xp: 0,
                            stats: encounteredPalInfo.baseStats,
                            type: encounteredPalInfo.type
                        });
                        await newPal.save();
                        await player.save();

                        const SkillTree = require('../../models/SkillTree');
                        const skillTree = new SkillTree({
                            palId: newPal.petId,
                            skillPoints: 0, 
                            unlockedSkills: []
                        });
                        await skillTree.save();
                        
                        await i.update({
                            embeds: [createSuccessEmbed('Tamed!', `<@${message.author.id}> You successfully tamed the **${encounteredPalInfo.name}**! It has been added to your collection.`)],
                            components: []
                        });
                        grantPlayerXp(client, message, message.author.id, 20)
                        return collector.stop();
                    }
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        encounterMessage.edit({
                            embeds: [createInfoEmbed(`The ${encounteredPalInfo.name} got away.`, 'The wild Pal grew impatient and vanished before you could decide.')],
                            components: []
                        });
                    }
                });
            }

            const cooldownReduction = Math.min((labEffects?.forageCooldownReduction || 0) + (labEffects?.globalCooldownReduction || 0), 0.9);
            const cooldownDuration = 60000 * (1 - cooldownReduction);
            const expirationTime = Date.now() + cooldownDuration;
            cooldowns.set(message.author.id, expirationTime);

            // After the duration, remove the user from the cooldowns map
            setTimeout(() => {
                cooldowns.delete(message.author.id);
            }, cooldownDuration);

        } catch (error) {
            console.error('Forage command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem while trying to forage.')] });
        }
    }
};