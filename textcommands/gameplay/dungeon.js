const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
} = require("discord.js");
const Player = require("../../models/Player");
const Pet = require("../../models/Pet");
const {
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    createCustomEmbed,
    createInfoEmbed,
} = require("../../utils/embed");
const GameData = require("../../utils/gameData");
const {
    CombatEngine,
    SkillManager,
    EquipmentManager,
    Utils,
    StatManager
} = require("../../utils/combat");
const { grantPalXp, grantPlayerXp } = require("../../utils/leveling");
const { restorePetHp } = require("../../utils/stamina");
const LabManager = require('../../utils/labManager');
const { updateQuestProgress } = require('../../utils/questSystem');

/**
 * Dungeon Session Manager - handles active sessions
 */
class DungeonSessionManager {
    constructor() {
        this.activeSessions = new Map();
    }

    create(userId) {
        const sessionId = `${userId}_${Date.now()}`;
        this.activeSessions.set(userId, sessionId);
        return sessionId;
    }

    isValid(userId, sessionId) {
        return this.activeSessions.get(userId) === sessionId;
    }

    cleanup(userId) {
        this.activeSessions.delete(userId);
    }

    hasActive(userId) {
        return this.activeSessions.has(userId);
    }
}

/**
 * Dungeon Manager - handles dungeon logic
 */
class DungeonManager {
    static async getDungeonForPlayer(player, args, prefix) {
        let dungeonId;
        let dungeon;

        if (args[0]?.toLowerCase() === "quick") {
            if (!player.preferences?.selectedDungeon) {
                throw new Error(`NO_DUNGEON_SELECTED:You haven't selected a preferred dungeon yet! Use \`${prefix}select dungeon\` to choose one.`);
            }
            dungeonId = player.preferences.selectedDungeon;
            dungeon = GameData.getDungeon(dungeonId);
        } else if (args.length > 0) {
            dungeonId = args.join("_").toLowerCase();
            dungeon = GameData.getDungeon(dungeonId);
        } else {
            if (player.preferences?.selectedDungeon) {
                dungeonId = player.preferences.selectedDungeon;
                dungeon = GameData.getDungeon(dungeonId);
            } else {
                throw new Error(`NO_DUNGEON_SPECIFIED:Please specify a dungeon name or use \`${prefix}select dungeon\` to set a preferred dungeon, then use \`${prefix}dungeon quick\`.`);
            }
        }

        if (!dungeon) {
            throw new Error(`DUNGEON_NOT_FOUND:That dungeon does not exist. Use \`${prefix}alldungeons\` to see available locations.`);
        }

        return { dungeonId, dungeon };
    }

    static async getEligiblePals(userId, levelRequirement) {
        return await Pet.find({
            ownerId: userId,
            status: "Idle",
            level: { $gte: levelRequirement },
        });
    }

    static async selectPreferredPal(player, availablePals) {
        if (!player.preferences?.selectedPet) return null;

        return availablePals.find(pal => 
            pal.petId === player.preferences.selectedPet
        );
    }

    static async restoreInjuredPets(userId) {
        const allPets = await Pet.find({ ownerId: userId });
        for (const pet of allPets) {
            if (pet.status === "Injured") {
                const { effects: labEffects } = await LabManager.getLabData(pet.ownerId);
                await restorePetHp(pet, labEffects);
            }
        }
    }
}

/**
 * Reward Manager - handles dungeon rewards
 */
class RewardManager {
    static initializeRewards() {
        return { gold: 0, xp: 0, loot: [], egg: [] };
    }

    static addFloorRewards(sessionRewards, floorRewards) {
        sessionRewards.gold += floorRewards.gold1;
        sessionRewards.xp += floorRewards.xp1;

        // Add loot
        floorRewards.loot.forEach((newItem) => {
            const existingItem = sessionRewards.loot.find(
                (item) => item.itemId === newItem.itemId,
            );
            if (existingItem) {
                existingItem.quantity += newItem.quantity;
            } else {
                sessionRewards.loot.push({ ...newItem });
            }
        });

        // Add eggs
        if (floorRewards.egg) {
            const existingEgg = sessionRewards.egg.find(
                (item) => item.itemId === floorRewards.egg.itemId,
            );
            if (existingEgg) {
                existingEgg.quantity += 1;
            } else {
                sessionRewards.egg.push({
                    itemId: floorRewards.egg.itemId,
                    quantity: 1,
                });
            }
        }
    }

    static formatRewardString(floorRewards) {
        let rewardString = `**+${floorRewards.gold1}** Gold\n**+${floorRewards.xp1}** XP`;
        
        floorRewards.loot.forEach((item) => {
            rewardString += `\n**+${item.quantity}x** ${GameData.getItem(item.itemId)?.name || 'Unknown Item'}`;
        });
        
        if (floorRewards.egg) {
            rewardString += `\n**+1x** ${GameData.getItem(floorRewards.egg.itemId)?.name || 'Unknown Item'}!`;
        }

        return rewardString;
    }

    static async finalizeRewards(userId, rewards, floorsCleared, dungeon, wasDefeated) {
        let updateSuccess = false;
        let retries = 3;

        while (!updateSuccess && retries > 0) {
            try {
                const currentPlayer = await Player.findOne({ userId });

                // Update gold
                currentPlayer.gold += rewards.gold;

                // Update dungeon clears
                if (!wasDefeated && floorsCleared === dungeon.floors) {
                    currentPlayer.stats.dungeonClears += 1;
                }

                // Update inventory
                [...rewards.loot, ...rewards.egg].forEach((item) => {
                    const existing = currentPlayer.inventory.find((i) => i.itemId === item.itemId);
                    if (existing) {
                        existing.quantity += item.quantity;
                    } else {
                        currentPlayer.inventory.push({ ...item });
                    }
                });

                await currentPlayer.save();
                updateSuccess = true;
            } catch (error) {
                if (error.name === 'VersionError' && retries > 0) {
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
                } else {
                    throw error;
                }
            }
        }

        return updateSuccess;
    }

    static formatFinalSummary(rewards, floorsCleared, levelUpInfo, pal) {
        let finalSummary = 
            `**Floors Cleared:** ${floorsCleared}\n` +
            `**Gold Earned:** ${rewards.gold}\n` +
            `**XP Gained:** ${rewards.xp}`;

        if (rewards.loot.length > 0 || rewards.egg.length > 0) {
            finalSummary += `\n\n**Items Obtained:**`;

            rewards.loot.forEach((item) => {
                const itemData = GameData.getItem(item.itemId);
                finalSummary += `\n• **${item.quantity}x** ${itemData.name}`;
            });

            if (rewards.egg.length > 0) {
                rewards.egg.forEach((eggItem) => {
                    const eggData = GameData.getItem(eggItem.itemId);
                    finalSummary += `\n• **${eggItem.quantity}x** ${eggData.name} 🥚`;
                });
            }
        } else {
            finalSummary += `\n\n**Items Obtained:** None`;
        }

        if (levelUpInfo.leveledUp) {
            finalSummary += `\n\n**LEVEL UP!** Your **${pal.nickname}** is now **Level ${levelUpInfo.newLevel}**!`;
        }

        if (pal.status === "Injured") {
            const currentHp = pal.currentHp || 0;
            const maxHp = pal.stats.hp;
            const hpToRecover = maxHp - currentHp;
            const timeToHeal = Math.ceil(hpToRecover / 1) * 1;
            finalSummary += `\n\n⚠️ Your **${pal.nickname}** is now **Injured** (${currentHp}/${maxHp} HP)`;
            if (timeToHeal > 0) {
                finalSummary += `\n🕐 Will fully heal in approximately **${timeToHeal}** minutes`;
            }
        }

        return finalSummary;
    }
}

/**
 * UI Manager - handles Discord UI components
 */
class UIManager {
    static createConfirmationComponents(sessionId) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dungeon_enter_${sessionId}`)
                .setLabel("Enter Dungeon")
                .setStyle(ButtonStyle.Success)
                .setEmoji("▶️"),
            new ButtonBuilder()
                .setCustomId(`dungeon_cancel_${sessionId}`)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger),
        );
    }

    static createPetSelectionMenu(availablePals, page, perPage, sessionId) {
        const petsSlice = availablePals.slice(page * perPage, page * perPage + perPage);
        return new StringSelectMenuBuilder()
            .setCustomId(`select_pal_dungeon_${sessionId}`)
            .setPlaceholder("Select a Pal for this expedition...")
            .addOptions(
                petsSlice.map((pal) => ({
                    label: `Lvl ${pal.level} ${pal.nickname}`,
                    description: `HP: ${pal.stats.hp} | ATK: ${pal.stats.atk} | DEF: ${pal.stats.def}`,
                    value: pal.petId,
                })),
            );
    }

    static createPaginationButtons(page, maxPage, sessionId) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`prev_page_${sessionId}`)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`next_page_${sessionId}`)
                .setLabel("Next")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === maxPage),
        );
    }

    static createFightButtons(sessionId) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`fight_${sessionId}`)
                .setLabel("Fight")
                .setStyle(ButtonStyle.Success)
                .setEmoji("⚔️"),
            new ButtonBuilder()
                .setCustomId(`run_${sessionId}`)
                .setLabel("Run")
                .setStyle(ButtonStyle.Danger),
        );
    }
}

// Initialize session manager
const sessionManager = new DungeonSessionManager();

module.exports = {
    name: "dungeon",
    description: "Embark on an expedition into a dangerous dungeon with one of your Pals.",
    usage: "[dungeon name] | quick",
    cooldown: 30,
    
    async execute(message, args, client, prefix) {
        // Check for active session
        if (sessionManager.hasActive(message.author.id)) {
            return message.reply({
                embeds: [
                    createWarningEmbed(
                        "Already in a Dungeon",
                        "You are already on an expedition! You cannot start another.",
                    ),
                ],
            });
        }

        try {
            // Get player
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({
                    embeds: [
                        createWarningEmbed(
                            "No Adventure Started",
                            `You haven't started your journey yet! Use \`${prefix}start\` to begin.`,
                        ),
                    ],
                });
            }

            // Get dungeon
            const { dungeon } = await DungeonManager.getDungeonForPlayer(player, args, prefix);

            // Create session
            const sessionId = sessionManager.create(message.author.id);

            // Show confirmation
            const confirmationEmbed = createInfoEmbed(
                `Enter ${dungeon.name}?`,
                `**Tier:** ${dungeon.tier} | **Floors:** ${dungeon.floors}\n` +
                    `**Requires Pal Lvl:** ${dungeon.levelRequirement}\n\nAre you sure you want to begin this expedition?`,
            );

            const reply = await message.reply({
                embeds: [confirmationEmbed],
                components: [UIManager.createConfirmationComponents(sessionId)],
            });

            // Handle confirmation
            const confirmationCollector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id && sessionManager.isValid(i.user.id, sessionId),
                time: 60000,
                max: 1,
                componentType: ComponentType.Button,
            });

            confirmationCollector.on("collect", async (i) => {
                try {
                    if (i.customId === `dungeon_cancel_${sessionId}`) {
                        sessionManager.cleanup(message.author.id);
                        return await i.update({
                            embeds: [
                                createWarningEmbed(
                                    "Expedition Cancelled",
                                    "You decided not to enter the dungeon.",
                                ),
                            ],
                            components: [],
                        });
                    }

                    if (i.customId === `dungeon_enter_${sessionId}`) {
                        await handleDungeonEntry(i, dungeon, client, reply, prefix, sessionId);
                    }
                } catch (error) {
                    console.error("Dungeon confirmation error:", error);
                    sessionManager.cleanup(message.author.id);
                    await handleInteractionError(i, "An error occurred during the dungeon expedition.");
                }
            });

            confirmationCollector.on("end", (collected) => {
                if (collected.size === 0) {
                    sessionManager.cleanup(message.author.id);
                    reply.edit({
                        embeds: [
                            createWarningEmbed(
                                "Expedition Timeout",
                                "The dungeon invitation has expired.",
                            ),
                        ],
                        components: [],
                    }).catch(() => {});
                }
            });

        } catch (error) {
            console.error("Dungeon command error:", error);
            sessionManager.cleanup(message.author.id);
            
            // Parse error message
            const [errorType, errorMessage] = error.message.split(':');
            const embedTitle = {
                'NO_DUNGEON_SELECTED': 'No Dungeon Selected',
                'NO_DUNGEON_SPECIFIED': 'No Dungeon Specified',
                'DUNGEON_NOT_FOUND': 'Dungeon Not Found'
            }[errorType] || 'An Error Occurred';

            const embedMessage = errorMessage || 'There was a problem starting the dungeon.';

            message.reply({
                embeds: [createWarningEmbed(embedTitle, embedMessage)],
            });
        }
    },
};

async function handleDungeonEntry(interaction, dungeon, client, reply, prefix, sessionId) {
    if (!sessionManager.isValid(interaction.user.id, sessionId)) {
        return;
    }

    try {
        // Restore injured pets
        await DungeonManager.restoreInjuredPets(interaction.user.id);

        // Get available pals
        const availablePals = await DungeonManager.getEligiblePals(interaction.user.id, dungeon.levelRequirement);
        
        if (availablePals.length === 0) {
            sessionManager.cleanup(interaction.user.id);
            return interaction.update({
                embeds: [
                    createWarningEmbed(
                        "No Eligible Pals",
                        `You don't have any idle Pals that meet the level requirement of **${dungeon.levelRequirement}**.`,
                    ),
                ],
                components: [],
            });
        }

        // Check for preferred pal
        const player = await Player.findOne({ userId: interaction.user.id });
        const selectedPal = await DungeonManager.selectPreferredPal(player, availablePals);

        if (selectedPal) {
            // Skip selection, go directly to dungeon start
            await SkillManager.ensureSkillTree(selectedPal);
            await runDungeon(interaction, selectedPal, dungeon, client, sessionId);
        } else {
            // Show pal selection
            await showPalSelection(interaction, availablePals, dungeon, reply, client, sessionId);
        }
    } catch (error) {
        console.error("Dungeon entry error:", error);
        sessionManager.cleanup(interaction.user.id);
        await handleInteractionError(interaction, "An error occurred during dungeon entry.");
    }
}

async function showPalSelection(interaction, availablePals, dungeon, reply, client, sessionId) {
    let page = 0;
    const perPage = 25;
    const maxPage = Math.ceil(availablePals.length / perPage) - 1;

    const buildComponents = (page) => {
        const rows = [new ActionRowBuilder().addComponents(
            UIManager.createPetSelectionMenu(availablePals, page, perPage, sessionId)
        )];
        
        if (maxPage > 0) {
            rows.push(UIManager.createPaginationButtons(page, maxPage, sessionId));
        }
        return rows;
    };

    await interaction.update({
        embeds: [
            createInfoEmbed(
                "Select Your Pal",
                "Choose a companion to accompany you into the dungeon.",
            ),
        ],
        components: buildComponents(page),
    });

    const petCollector = reply.createMessageComponentCollector({
        filter: (x) => x.user.id === interaction.user.id && sessionManager.isValid(x.user.id, sessionId),
        time: 2 * 60000,
    });

    petCollector.on("collect", async (sel) => {
        try {
            if (sel.customId === `prev_page_${sessionId}`) {
                page = Math.max(0, page - 1);
                return sel.update({ components: buildComponents(page) });
            }
            if (sel.customId === `next_page_${sessionId}`) {
                page = Math.min(maxPage, page + 1);
                return sel.update({ components: buildComponents(page) });
            }
            if (sel.customId === `select_pal_dungeon_${sessionId}`) {
                petCollector.stop();
                const selectedPal = await Pet.findOne({ petId: sel.values[0] });
                
                if (!selectedPal) {
                    sessionManager.cleanup(interaction.user.id);
                    return sel.update({
                        embeds: [createErrorEmbed("Error", "Selected Pal not found.")],
                        components: []
                    });
                }

                await SkillManager.ensureSkillTree(selectedPal);
                // Proceed directly to dungeon run
                await runDungeon(sel, selectedPal, dungeon, client, sessionId);
            }
        } catch (error) {
            console.error("Pet selection error:", error);
            sessionManager.cleanup(interaction.user.id);
            await handleInteractionError(sel, "An error occurred during pet selection.");
        }
    });

    petCollector.on("end", (collected) => {
        if (collected.size === 0) {
            sessionManager.cleanup(interaction.user.id);
        }
    });
}

async function runDungeon(interaction, pal, dungeon, client, sessionId) {
    if (!sessionManager.isValid(interaction.user.id, sessionId)) {
        return;
    }

    try {
        let currentFloor = 1;
        const sessionRewards = RewardManager.initializeRewards();
        
        // Potion stats are already applied in DB, we just need the pal object
        const enhancedPal = StatManager.cloneCreature(pal);
        
        // Extract active potion abilities for combat engine (like shadow_strike, resistances)
        const potionEffects = Utils.extractPotionAbilities(pal);
        
        let palCurrentHp = enhancedPal.stats.hp;

        // Set pal status
        pal.status = "Exploring";
        await pal.save();

        // Update UI to show we are entering
        await interaction.update({
            embeds: [createSuccessEmbed("Expedition Started!", `**${pal.nickname}** enters **${dungeon.name}**...`)],
            components: []
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Show active skills
        const skillTree = await SkillManager.ensureSkillTree(pal);
        if (skillTree && skillTree.unlockedSkills.length > 0) {
            const skillNames = skillTree.unlockedSkills
                .map((skill) => `${skill.skillId} (Lvl ${skill.level})`)
                .join(", ");

            const skillEmbed = createInfoEmbed(
                "Active Skills",
                `Your **${pal.nickname}** enters the dungeon with: ${skillNames}`,
            );
            await interaction.channel.send({ embeds: [skillEmbed] });
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Main dungeon loop
        while (currentFloor <= dungeon.floors) {
            if (!sessionManager.isValid(interaction.user.id, sessionId)) {
                return;
            }

            const isBossFloor = currentFloor === dungeon.floors;
            const enemy = Utils.safeGenerateEnemy(dungeon, currentFloor, isBossFloor);
            const enemyType = enemy.type || "Beast";

            // Show floor info
            const floorEmbed = createCustomEmbed(
                `${dungeon.name} - Floor ${currentFloor}`,
                `A wild **${enemy.name}** (${enemyType}) appears!`,
                "#E74C3C",
                {
                    fields: [
                        {
                            name: `${pal.nickname} (Your ${GameData.getPet(pal.basePetId)?.type || "Beast"} Pal)`,
                            value: `❤️ HP: ${palCurrentHp}/${enhancedPal.stats.hp}${
                                skillTree && skillTree.unlockedSkills.length > 0
                                    ? `\n🎯 Skills: ${skillTree.unlockedSkills.length} active`
                                    : ""
                            }`,
                            inline: true,
                        },
                        {
                            name: `${enemy.name} (Enemy ${enemyType})`,
                            value: `❤️ HP: ${enemy.stats.hp}/${enemy.stats.hp}\n⚔️ ATK: ${enemy.stats.atk} | 🛡️ DEF: ${enemy.stats.def}`,
                            inline: true,
                        },
                    ],
                },
            );

            await interaction.message.edit({
                embeds: [floorEmbed],
                components: [UIManager.createFightButtons(sessionId)],
            });

            // Wait for action
            const action = await interaction.channel
                .awaitMessageComponent({
                    filter: (i) => i.user.id === interaction.user.id && sessionManager.isValid(i.user.id, sessionId),
                    time: 5 * 60000,
                    componentType: ComponentType.Button,
                })
                .catch(() => null);

            if (!action) {
                sessionManager.cleanup(interaction.user.id);
                await interaction.message.edit({
                    embeds: [
                        createWarningEmbed(
                            "Dungeon Timeout",
                            "The dungeon exploration timed out. You escaped with the rewards you've gathered so far.",
                        ),
                    ],
                    components: [],
                });
                return finalizeDungeon(
                    interaction,
                    pal,
                    sessionRewards,
                    client,
                    currentFloor - 1,
                    dungeon,
                    false,
                    palCurrentHp,
                    sessionId,
                );
            }

            if (action.customId === `run_${sessionId}`) {
                await interaction.message.edit({
                    embeds: [
                        createWarningEmbed(
                            "You Fled!",
                            "You escaped the dungeon with the rewards you've gathered so far.",
                        ),
                    ],
                    components: [],
                });
                
                // Update pal status if injured
                if (palCurrentHp < enhancedPal.stats.hp) {
                    pal.status = "Injured";
                    pal.currentHp = palCurrentHp;
                    pal.lastInjuryUpdate = new Date();
                    await pal.save();
                }
                
                return finalizeDungeon(
                    action,
                    pal,
                    sessionRewards,
                    client,
                    currentFloor - 1,
                    dungeon,
                    false,
                    palCurrentHp,
                    sessionId,
                );
            }

            if (action.customId === `fight_${sessionId}`) {
                // Use the new combat engine
                const combatEngine = new CombatEngine();
                const equipmentEffects = EquipmentManager.getEffects(enhancedPal.equipment);
                const palType = GameData.getPet(pal.basePetId)?.type || "Beast";
                
                const battleResult = await combatEngine.simulateDungeonBattle(
                    enhancedPal,
                    enemy,
                    potionEffects, // Use extracted abilities
                    equipmentEffects,
                    palCurrentHp,
                    palType,
                    enemyType,
                    skillTree,
                    'dungeon',
                    {}
                );
                
                palCurrentHp = battleResult.remainingHp;

                const battleEmbed = createInfoEmbed(
                    `Battle Log - Floor ${currentFloor}`,
                    battleResult.log,
                );
                await action.update({ embeds: [battleEmbed], components: [] });
                await new Promise((resolve) => setTimeout(resolve, 5000));

                if (!battleResult.playerWon) {
                    await interaction.message.edit({
                        embeds: [
                            createErrorEmbed(
                                "Defeated!",
                                `Your Pal, **${pal.nickname}**, was defeated on Floor ${currentFloor}. You escape with your current loot.`,
                            ),
                        ],
                    });
                    return finalizeDungeon(
                        action,
                        pal,
                        sessionRewards,
                        client,
                        currentFloor - 1,
                        dungeon,
                        true,
                        0,
                        sessionId,
                    );
                }

                // Generate and add floor rewards
                const floorRewards = Utils.safeGenerateDungeonRewards(dungeon, currentFloor);
                RewardManager.addFloorRewards(sessionRewards, floorRewards);

                const rewardString = RewardManager.formatRewardString(floorRewards);
                const rewardEmbed = createSuccessEmbed(
                    `Floor ${currentFloor} Cleared!`,
                    rewardString,
                );
                await interaction.message.edit({ embeds: [rewardEmbed] });
                await new Promise((resolve) => setTimeout(resolve, 4000));

                currentFloor++;
            }
        }

        // Dungeon completed
        await interaction.message.edit({
            embeds: [
                createSuccessEmbed(
                    "Dungeon Cleared!",
                    `You have conquered all ${dungeon.floors} floors of the **${dungeon.name}**!`,
                ),
            ],
        });
        
        return finalizeDungeon(
            interaction,
            pal,
            sessionRewards,
            client,
            dungeon.floors,
            dungeon,
            false,
            palCurrentHp,
            sessionId,
        );
    } catch (error) {
        console.error("Dungeon run error:", error);
        sessionManager.cleanup(interaction.user.id);
        await handleInteractionError(interaction, "An error occurred during the dungeon expedition.");
    }
}

async function finalizeDungeon(
    interaction,
    pal,
    rewards,
    client,
    floorsCleared,
    dungeon,
    wasDefeated = false,
    finalHp = null,
    sessionId,
) {
    try {
        // Clean up session
        sessionManager.cleanup(interaction.user.id);

        // Update player rewards
        const updateSuccess = await RewardManager.finalizeRewards(
            interaction.user.id, 
            rewards, 
            floorsCleared, 
            dungeon, 
            wasDefeated
        );

        if (!updateSuccess) {
            console.error('Failed to update player rewards after multiple retries');
        }

        // Grant Pal XP and check for level up
        const levelUpInfo = await grantPalXp(client, interaction.message, pal, rewards.xp);

        // Grant Player XP based on dungeon difficulty × floors cleared
        const playerXp = dungeon.staminaCost * floorsCleared;
        await grantPlayerXp(client, interaction.message, interaction.user.id, playerXp);

        // Update pal status based on final HP
        if (wasDefeated) {
            pal.status = "Injured";
            pal.currentHp = 0;
            pal.lastInjuryUpdate = new Date();
        } else if (finalHp !== null && finalHp < pal.stats.hp) {
            pal.status = "Injured";
            pal.currentHp = finalHp;
            pal.lastInjuryUpdate = new Date();
        } else {
            pal.status = "Idle";
            pal.currentHp = null;
        }
        await pal.save();

        // Generate final summary
        const finalSummary = RewardManager.formatFinalSummary(rewards, floorsCleared, levelUpInfo, pal);
        const summaryEmbed = createSuccessEmbed("Expedition Summary", finalSummary);
        await interaction.channel.send({ embeds: [summaryEmbed] });

        // Track dungeon floor clears (always, even partial runs)
        if (floorsCleared > 0) {
            await updateQuestProgress(interaction.user.id, 'clear_dungeon_floors', floorsCleared, interaction);
        }

        // Emit dungeon clear event if fully completed
        if (!wasDefeated && floorsCleared === dungeon.floors) {
            client.emit("dungeonClear", interaction.user.id);
            await updateQuestProgress(interaction.user.id, 'clear_dungeons', 1, interaction);
        }
    } catch (error) {
        console.error("Error in finalizeDungeon:", error);
        sessionManager.cleanup(interaction.user.id);
        // Try to send error message if possible
        try {
            await interaction.channel.send({
                embeds: [createErrorEmbed("Error", "An error occurred while finalizing the dungeon results.")]
            });
        } catch (sendError) {
            console.error("Failed to send error message:", sendError);
        }
    }
}

async function handleInteractionError(interaction, message) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [createErrorEmbed("Error", message)],
                ephemeral: true,
            });
        } else {
            await interaction.followUp({
                embeds: [createErrorEmbed("Error", message)],
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error("Failed to send error reply:", error);
    }
}