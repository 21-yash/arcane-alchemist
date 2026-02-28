const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const Expedition = require('../../models/Expedition');
const { createErrorEmbed, createSuccessEmbed, createInfoEmbed, createCustomEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');
const { updateQuestProgress } = require('../../utils/questSystem');
const { grantPlayerXp } = require('../../utils/leveling');

const expeditionTypes = {
    resource_gathering: {
        name: 'Resource Gathering',
        description: 'Send your Pal to gather rare ingredients and materials',
        baseTime: 120, // 2 hours in minutes
        rewards: {
            xp: [50, 100],
            gold: [100, 200],
            items: [
                { itemId: 'moonpetal_herb', chance: 0.3, quantity: [2, 5] },
                { itemId: 'crystal_shard', chance: 0.2, quantity: [1, 3] },
                { itemId: 'shadow_essence', chance: 0.15, quantity: [1, 2] }
            ]
        },
        risks: { injury: 0.1, lost: 0.02 }
    },
    treasure_hunting: {
        name: 'Treasure Hunting',
        description: 'Search for valuable artifacts and rare equipment',
        baseTime: 180, // 3 hours
        rewards: {
            xp: [75, 150],
            gold: [200, 400],
            items: [
                { itemId: 'ancient_coin', chance: 0.4, quantity: [3, 8] },
            ]
        },
        risks: { injury: 0.15, lost: 0.03 }
    },
    combat_training: {
        name: 'Combat Training',
        description: 'Intensive training to boost your Pal\'s combat abilities',
        baseTime: 240, // 4 hours
        rewards: {
            xp: [150, 300],
            gold: [50, 100],
            items: []
        },
        risks: { injury: 0.25, lost: 0.01 }
    },
    exploration: {
        name: 'Exploration',
        description: 'Explore uncharted territories for unique discoveries',
        baseTime: 300,
        rewards: {
            xp: [100, 200],
            gold: [150, 300],
            items: [
                { itemId: 'spirit_dust', chance: 0.1, quantity: [1, 1] },
                { itemId: 'silver_leaf', chance: 0.15, quantity: [1, 1] }
            ]
        },
        risks: { injury: 0.2, lost: 0.05 }
    }
};

const difficulties = {
    easy: { multiplier: 1, riskMod: 0.5, timeReduction: 0.9 },
    medium: { multiplier: 1.5, riskMod: 1, timeReduction: 1 },
    hard: { multiplier: 2.2, riskMod: 1.5, timeReduction: 1.1 },
    extreme: { multiplier: 3, riskMod: 2, timeReduction: 1.2 }
};

module.exports = {
    name: 'expedition',
    description: 'Send your Pals on expeditions to gather resources and gain experience.',
    aliases: ['exp', 'explore'],
    cooldown: 10,
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;

            // Check for active expeditions
            if (args[0]?.toLowerCase() === 'status') {
                return this.showExpeditionStatus(message, player, client);
            }

            if (args[0]?.toLowerCase() === 'collect') {
                return this.collectExpeditions(message, player, client, labEffects);
            }

            // Get available pals (not injured, not on expeditions, etc.)
            const availablePals = await Pet.find({ 
                ownerId: message.author.id, 
                status: 'Idle'
            });

            if (availablePals.length === 0) {
                return message.reply({
                    embeds: [createErrorEmbed('No Available Pals', 'All your Pals are either injured, breeding, or already on expeditions!')]
                });
            }

            // Create expedition selection UI
            const expeditionEmbed = createCustomEmbed(
                '🗺️ Expedition Command Center',
                'Choose an expedition type and select a Pal to send on the mission.\n\n' +
                Object.entries(expeditionTypes).map(([key, exp]) => 
                    `**${exp.name}** - ${exp.description}\n*Base Duration: ${Math.floor(exp.baseTime/60)}h ${exp.baseTime%60}m*`
                ).join('\n\n'),
                '#8B4513'
            );

            const expeditionSelect = new StringSelectMenuBuilder()
                .setCustomId('select_expedition_type')
                .setPlaceholder('Choose expedition type...')
                .addOptions(
                    Object.entries(expeditionTypes).map(([key, exp]) => ({
                        label: exp.name,
                        description: `${Math.floor(exp.baseTime/60)}h ${exp.baseTime%60}m - ${exp.description.substring(0, 50)}...`,
                        value: key
                    }))
                );

            const reply = await message.reply({
                embeds: [expeditionEmbed],
                components: [new ActionRowBuilder().addComponents(expeditionSelect)]
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000
            });

            collector.on('collect', async (i) => {
                if (i.isStringSelectMenu() && i.customId === 'select_expedition_type') {
                    await this.handleExpeditionTypeSelection(i, availablePals, expeditionTypes[i.values[0]]);
                } else if (i.isStringSelectMenu() && i.customId === 'select_pal_for_expedition') {
                    await this.handlePalSelection(i, player);
                } else if (i.isStringSelectMenu() && i.customId === 'select_difficulty') {
                    await this.handleDifficultySelection(i, player, client, labEffects);
                }
            });

            collector.on('end', () => {
                reply.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Expedition command error:', error);
            message.reply({
                embeds: [createErrorEmbed('Error', 'There was a problem with the expedition system.')]
            });
        }
    },

    async handleExpeditionTypeSelection(interaction, availablePals, expeditionType) {
        const palSelect = new StringSelectMenuBuilder()
            .setCustomId('select_pal_for_expedition')
            .setPlaceholder('Choose a Pal for this expedition...')
            .addOptions(
                availablePals.slice(0, 25).map(pal => {
                    const palData = GameData.getPet(pal.basePetId);
                    return {
                        label: `${pal.nickname} (Lv.${pal.level})`,
                        description: `${palData.type} - HP:${pal.stats.hp} ATK:${pal.stats.atk} DEF:${pal.stats.def}`,
                        value: `${pal.petId}:${interaction.values[0]}`
                    };
                })
            );

        await interaction.update({
            embeds: [createInfoEmbed(
                `🎯 ${expeditionType.name}`,
                `${expeditionType.description}\n\n**Base Duration:** ${Math.floor(expeditionType.baseTime/60)}h ${expeditionType.baseTime%60}m\n**Risk Level:** ${expeditionType.risks.injury * 100}% injury chance\n\nSelect a Pal to send on this expedition:`
            )],
            components: [new ActionRowBuilder().addComponents(palSelect)]
        });
    },

    async handlePalSelection(interaction, player) {
        const [palId, expeditionTypeKey] = interaction.values[0].split(':');
        
        const difficultySelect = new StringSelectMenuBuilder()
            .setCustomId('select_difficulty')
            .setPlaceholder('Choose difficulty level...')
            .addOptions(
                Object.entries(difficulties).map(([key, diff]) => ({
                    label: `${key.charAt(0).toUpperCase() + key.slice(1)} (${diff.multiplier}x rewards)`,
                    description: `Risk: ${diff.riskMod}x, Time: ${diff.timeReduction}x`,
                    value: `${palId}:${expeditionTypeKey}:${key}`
                }))
            );

        await interaction.update({
            embeds: [createInfoEmbed(
                '⚖️ Choose Difficulty',
                'Higher difficulties offer better rewards but increase risks and time requirements.\n\n' +
                '**Easy:** Lower risk, faster completion\n' +
                '**Medium:** Balanced risk and rewards\n' +
                '**Hard:** Higher risk, better rewards\n' +
                '**Extreme:** Maximum risk and rewards'
            )],
            components: [new ActionRowBuilder().addComponents(difficultySelect)]
        });
    },

    async handleDifficultySelection(interaction, player, client, labEffects) {
        const [palId, expeditionTypeKey, difficultyKey] = interaction.values[0].split(':');
        
        try {
            const pal = await Pet.findOne({ petId: palId });
            const expeditionType = expeditionTypes[expeditionTypeKey];
            const difficulty = difficulties[difficultyKey];
            
            // Calculate expedition duration
            const baseDuration = expeditionType.baseTime * difficulty.timeReduction;
            const timeReduction = Math.min(labEffects?.expeditionTimeReduction || 0, 0.8);
            const adjustedDuration = baseDuration * (1 - timeReduction);
            const endTime = new Date(Date.now() + adjustedDuration * 60 * 1000);
            
            // Create expedition record
            const expedition = new Expedition({
                userId: interaction.user.id,
                palId: palId,
                expeditionType: expeditionTypeKey,
                difficulty: difficultyKey,
                endTime: endTime,
                riskFactors: {
                    injuryChance: Math.max(0, (expeditionType.risks.injury * difficulty.riskMod) * (1 - (labEffects?.expeditionSuccessBonus || 0)) - (labEffects?.expeditionInjuryReduction || 0)),
                    lostChance: Math.max(0, (expeditionType.risks.lost * difficulty.riskMod) * (1 - (labEffects?.expeditionSuccessBonus || 0)) - (labEffects?.expeditionLostReduction || 0))
                }
            });

            // Update pal status
            pal.status = 'Exploring';
            
            await expedition.save();
            await pal.save();

            // Emit expedition start event
            client.emit('expeditionStarted', interaction.user.id, expeditionTypeKey);

            const successEmbed = createSuccessEmbed(
                '🚀 Expedition Started!',
                `**${pal.nickname}** has departed on a **${expeditionType.name}** expedition!\n\n` +
                `**Difficulty:** ${difficultyKey.charAt(0).toUpperCase() + difficultyKey.slice(1)}\n` +
                `**Return Time:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n` +
                `**Risk Level:** ${Math.round(expedition.riskFactors.injuryChance * 100)}% injury chance\n\n` +
                `Use \`expedition status\` to check progress and \`expedition collect\` when complete!`
            );

            await interaction.update({
                embeds: [successEmbed],
                components: []
            });

        } catch (error) {
            console.error('Error starting expedition:', error);
            await interaction.update({
                embeds: [createErrorEmbed('Error', 'Failed to start expedition. Please try again.')],
                components: []
            });
        }
    },

    async showExpeditionStatus(message, player, client) {
        const activeExpeditions = await Expedition.find({ 
            userId: message.author.id, 
            status: 'active' 
        });

        if (activeExpeditions.length === 0) {
            return message.reply({
                embeds: [createInfoEmbed('No Active Expeditions', 'You have no Pals currently on expeditions.')]
            });
        }

        let statusText = '';
        for (const expedition of activeExpeditions) {
            const pal = await Pet.findOne({ petId: expedition.palId });
            const expeditionType = expeditionTypes[expedition.expeditionType];
            const timeRemaining = expedition.endTime - Date.now();
            const isComplete = timeRemaining <= 0;

            statusText += `**${pal.nickname}** - ${expeditionType.name}\n`;
            statusText += `Status: ${isComplete ? '✅ Ready to collect!' : `⏱️ <t:${Math.floor(expedition.endTime.getTime() / 1000)}:R>`}\n`;
            statusText += `Difficulty: ${expedition.difficulty.charAt(0).toUpperCase() + expedition.difficulty.slice(1)}\n\n`;
        }

        const embed = createInfoEmbed('🗺️ Expedition Status', statusText);
        return message.reply({ embeds: [embed] });
    },

    async collectExpeditions(message, player, client, labEffects) {
        const completedExpeditions = await Expedition.find({ 
            userId: message.author.id, 
            status: 'active',
            endTime: { $lte: new Date() }
        });

        if (completedExpeditions.length === 0) {
            return message.reply({
                embeds: [createInfoEmbed('No Completed Expeditions', 'No expeditions are ready for collection yet.')]
            });
        }

        let totalRewards = { xp: 0, gold: 0, items: {} };
        let resultText = '';
        let successfulExpeditions = 0;

        for (const expedition of completedExpeditions) {
            const pal = await Pet.findOne({ petId: expedition.palId });
            const expeditionType = expeditionTypes[expedition.expeditionType];
            const difficulty = difficulties[expedition.difficulty];

            // Calculate if expedition was successful (risk checks)
            const injuryRoll = Math.random();
            const lostRoll = Math.random();
            
            let success = true;
            let injured = false;
            
            if (injuryRoll < expedition.riskFactors.injuryChance) {
                injured = true;
                pal.status = 'Injured';
                pal.currentHp = Math.floor(pal.stats.hp * 0.3);
                pal.lastInjuryUpdate = new Date();
            } else {
                pal.status = 'Idle';
            }

            if (lostRoll < expedition.riskFactors.lostChance) {
                success = false;
                resultText += `💔 **${pal.nickname}** got lost and returned with nothing!\n`;
            } else {
                // Calculate rewards
                const rewardMultiplier = labEffects?.expeditionRewardMultiplier || 1;
                const xpReward = Math.floor((Math.random() * (expeditionType.rewards.xp[1] - expeditionType.rewards.xp[0]) + expeditionType.rewards.xp[0]) * difficulty.multiplier * rewardMultiplier);
                const goldBase = Math.floor((Math.random() * (expeditionType.rewards.gold[1] - expeditionType.rewards.gold[0]) + expeditionType.rewards.gold[0]) * difficulty.multiplier * rewardMultiplier);
                const goldReward = LabManager.applyGoldBonus(goldBase, labEffects);

                totalRewards.xp += xpReward;
                totalRewards.gold += goldReward;

                // Item rewards
                for (const itemReward of expeditionType.rewards.items) {
                    if (Math.random() < itemReward.chance * difficulty.multiplier) {
                        const quantity = Math.floor(Math.random() * (itemReward.quantity[1] - itemReward.quantity[0] + 1)) + itemReward.quantity[0];
                        totalRewards.items[itemReward.itemId] = (totalRewards.items[itemReward.itemId] || 0) + quantity;
                    }
                }

                resultText += `✅ **${pal.nickname}** returned successfully${injured ? ' (injured)' : ''}!\n`;
                resultText += `Gained: ${xpReward} XP, ${goldReward} gold\n`;
                successfulExpeditions++;
            }

            expedition.status = 'completed';
            await expedition.save();
            await pal.save();
        }

        // Apply rewards to player
        player.gold += totalRewards.gold;
        
        for (const [itemId, quantity] of Object.entries(totalRewards.items)) {
            const existingItem = player.inventory.find(item => item.itemId === itemId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                player.inventory.push({ itemId, quantity });
            }
        }

        if (successfulExpeditions > 0) {
            player.stats.expeditionsCompleted = (player.stats.expeditionsCompleted || 0) + successfulExpeditions;
        }

        await player.save();

        if (successfulExpeditions > 0) {
            client.emit('expeditionComplete', message.author.id, successfulExpeditions);
            await updateQuestProgress(message.author.id, 'complete_expeditions', successfulExpeditions, message);
        }

        // Grant player XP from expeditions
        if (totalRewards.xp > 0) {
            await grantPlayerXp(client, message, message.author.id, totalRewards.xp);
        }

        // Show results
        let rewardSummary = `**Total Rewards:**\n⭐ ${totalRewards.xp} XP\n💰 ${totalRewards.gold} Gold\n`;
        if (Object.keys(totalRewards.items).length > 0) {
            rewardSummary += '**Items:**\n';
            for (const [itemId, quantity] of Object.entries(totalRewards.items)) {
                rewardSummary += `${GameData.getItem(itemId)?.name || itemId} x${quantity}\n`;
            }
        }

        const embed = createCustomEmbed('🎉 Expeditions Complete!', resultText + '\n' + rewardSummary, '#00ff00');
        message.reply({ embeds: [embed] });
    }
};