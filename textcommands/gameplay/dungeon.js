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
const SkillTree = require("../../models/SkillTree");
const allPals = require("../../gamedata/pets");
const allDungeons = require("../../gamedata/dungeons");
const allItems = require("../../gamedata/items");
const allSkillTrees = require("../../gamedata/skillTrees");
const {
    generateEnemy,
    generateDungeonRewards,
    getEquipmentEffects,
    applySkillBonuses,
} = require("../../utils/combat");
const { grantPalXp } = require("../../utils/leveling");
const { restorePetHp } = require("../../utils/stamina");
const { ensureSkillTree } = require('../../utils/combat');

// Store active dungeon sessions per user
const activeDungeonSessions = new Map();

module.exports = {
    name: "dungeon",
    description: "Embark on an expedition into a dangerous dungeon with one of your Pals.",
    usage: "[dungeon name] | quick",
    async execute(message, args, client, prefix) {

        if (activeDungeonSessions.has(message.author.id)) {
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

            let dungeonId;
            let dungeon;

            if (args[0]?.toLowerCase() === "quick") {
                if (!player.preferences?.selectedDungeon) {
                    return message.reply({
                        embeds: [
                            createWarningEmbed(
                                "No Dungeon Selected",
                                `You haven't selected a preferred dungeon yet! Use \`${prefix}select dungeon\` to choose one.`,
                            ),
                        ],
                    });
                }
                dungeonId = player.preferences.selectedDungeon;
                dungeon = allDungeons[dungeonId];
            } else if (args.length > 0) {
                dungeonId = args.join("_").toLowerCase();
                dungeon = allDungeons[dungeonId];
            } else {
                if (player.preferences?.selectedDungeon) {
                    dungeonId = player.preferences.selectedDungeon;
                    dungeon = allDungeons[dungeonId];
                } else {
                    return message.reply({
                        embeds: [
                            createWarningEmbed(
                                "No Dungeon Specified",
                                `Please specify a dungeon name or use \`${prefix}select dungeon\` to set a preferred dungeon, then use \`${prefix}dungeon quick\`.`,
                            ),
                        ],
                    });
                }
            }

            if (!dungeon) {
                return message.reply({
                    embeds: [
                        createWarningEmbed(
                            "Dungeon Not Found",
                            `That dungeon does not exist. Use \`${prefix}alldungeons\` to see available locations.`,
                        ),
                    ],
                });
            }

            const sessionId = `${message.author.id}_${Date.now()}`;
            activeDungeonSessions.set(message.author.id, sessionId);

            const confirmationEmbed = createInfoEmbed(
                `Enter ${dungeon.name}?`,
                `**Tier:** ${dungeon.tier} | **Floors:** ${dungeon.floors}\n` +
                    `**Requires Pal Lvl:** ${dungeon.levelRequirement}\n\nAre you sure you want to begin this expedition?`,
            );
            const confirmButtons = new ActionRowBuilder().addComponents(
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

            const reply = await message.reply({
                embeds: [confirmationEmbed],
                components: [confirmButtons],
            });

            const confirmationCollector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id && activeDungeonSessions.get(message.author.id) === sessionId,
                time: 60000,
                max: 1,
                componentType: ComponentType.Button,
            });

            confirmationCollector.on("collect", async (i) => {
                try {
                    if (i.customId === `dungeon_cancel_${sessionId}`) {
                        activeDungeonSessions.delete(message.author.id);
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
                    console.error("Dungeon interaction error:", error);
                    activeDungeonSessions.delete(message.author.id);
                    if (!i.replied && !i.deferred) {
                        try {
                            await i.reply({
                                embeds: [createErrorEmbed("Error", "An error occurred during the dungeon expedition.")],
                                ephemeral: true,
                            });
                        } catch (replyError) {
                            console.error("Failed to send error reply:", replyError);
                        }
                    }
                }
            });

            confirmationCollector.on("end", (collected) => {
                if (collected.size === 0) {
                    activeDungeonSessions.delete(message.author.id);
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
            activeDungeonSessions.delete(message.author.id);
            message.reply({
                embeds: [
                    createErrorEmbed(
                        "An Error Occurred",
                        "There was a problem starting the dungeon.",
                    ),
                ],
            });
        }
    },
};

async function handleDungeonEntry(interaction, dungeon, client, reply, prefix, sessionId) {
    if (activeDungeonSessions.get(interaction.user.id) !== sessionId) {
        return;
    }

    const player = await Player.findOne({ userId: interaction.user.id });

    // Restore injured pets
    const allPets = await Pet.find({ ownerId: interaction.user.id });
    for (const pet of allPets) {
        if (pet.status === "Injured") {
            await restorePetHp(pet);
        }
    }

    let selectedPal = null;

    // Check if user has a preferred pet
    if (player.preferences?.selectedPet) {
        const preferredPet = await Pet.findOne({
            ownerId: interaction.user.id,
            petId: player.preferences.selectedPet,
            status: "Idle",
            level: { $gte: dungeon.levelRequirement },
        });

        if (preferredPet) {
            selectedPal = preferredPet;
        }
    }

    if (!selectedPal) {
        const availablePals = await Pet.find({
            ownerId: interaction.user.id,
            status: "Idle",
            level: { $gte: dungeon.levelRequirement },
        });

        if (availablePals.length === 0) {
            activeDungeonSessions.delete(interaction.user.id);
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

        // Show pet selection menu
        let page = 0;
        const perPage = 25;
        const maxPage = Math.ceil(availablePals.length / perPage) - 1;

        const buildMenu = (page) => {
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
        };

        const buildComponents = (page) => {
            const rows = [new ActionRowBuilder().addComponents(buildMenu(page))];
            if (maxPage > 0) {
                rows.push(
                    new ActionRowBuilder().addComponents(
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
                    ),
                );
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
            filter: (x) => x.user.id === interaction.user.id && activeDungeonSessions.get(x.user.id) === sessionId,
            time: 2 * 60000,
        });

        petCollector.on("collect", async (sel) => {
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
                selectedPal = await Pet.findOne({ petId: sel.values[0] });

                await ensureSkillTree(selectedPal);
                await runPotionPhase(sel, selectedPal, dungeon, reply, client, sessionId);
            }
        });

        petCollector.on("end", (collected) => {
            if (collected.size === 0) {
                activeDungeonSessions.delete(interaction.user.id);
            }
        });

        return;
    }

    await ensureSkillTree(selectedPal);
    // If we have a preferred pet, skip directly to potion phase
    await runPotionPhase(interaction, selectedPal, dungeon, reply, client, sessionId);
}

async function runPotionPhase(interaction, pal, dungeon, reply, client, sessionId) {
    // Verify session is still valid
    if (activeDungeonSessions.get(interaction.user.id) !== sessionId) {
        return;
    }

    const player = await Player.findOne({ userId: interaction.user.id });
    const availablePotions = player.inventory.filter((item) => {
        const itemData = allItems[item.itemId];
        return itemData && itemData.type === "potion" && item.quantity > 0;
    });

    if (availablePotions.length > 0) {
        const potionOptions = availablePotions.map((item) => ({
            label: `${allItems[item.itemId].name} (${item.quantity}x)`,
            description: allItems[item.itemId].description.substring(0, 100),
            value: item.itemId,
        }));
        potionOptions.unshift({
            label: "No Potion",
            description: "Enter without potions",
            value: "none",
        });

        const potionMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_potion_dungeon_${sessionId}`)
            .setPlaceholder("Select a potion to use (optional)...")
            .addOptions(potionOptions);

        await interaction.update({
            embeds: [
                createInfoEmbed("Select Potion", "Choose a potion to enhance your Pal."),
            ],
            components: [new ActionRowBuilder().addComponents(potionMenu)],
        });

        const potionCollector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id && activeDungeonSessions.get(i.user.id) === sessionId,
            time: 2 * 60000,
            componentType: ComponentType.StringSelect,
        });

        potionCollector.on("collect", async (potionInteraction) => {
            potionCollector.stop();
            const selectedPotionId = potionInteraction.values[0];
            let selectedPotion = null;

            if (selectedPotionId !== "none") {
                selectedPotion = allItems[selectedPotionId];
                const currentPlayer = await Player.findOne({ userId: interaction.user.id });
                const potionItem = currentPlayer.inventory.find(
                    (item) => item.itemId === selectedPotionId,
                );
                if (potionItem) {
                    potionItem.quantity -= 1;
                    if (potionItem.quantity <= 0) {
                        currentPlayer.inventory = currentPlayer.inventory.filter(
                            (item) => item.itemId !== selectedPotionId,
                        );
                    }
                    await currentPlayer.save();
                }
            }

            await runDungeon(potionInteraction, pal, dungeon, client, selectedPotion, sessionId);
        });

        potionCollector.on("end", (collected) => {
            if (collected.size === 0) {
                activeDungeonSessions.delete(interaction.user.id);
            }
        });
    } else {
        await runDungeon(interaction, pal, dungeon, client, null, sessionId);
    }
}

async function runDungeon(interaction, pal, dungeon, client, selectedPotion = null, sessionId) {
    let potionEffects = getPotionEffects(selectedPotion);

    // Verify session is still valid
    if (activeDungeonSessions.get(interaction.user.id) !== sessionId) {
        return;
    }

    let currentFloor = 1;
    const sessionRewards = { gold: 0, xp: 0, loot: [], egg: [] };

    let skillTree = null;
    try {
        skillTree = await SkillTree.findOne({ palId: pal.petId });
        if (!skillTree) {
            skillTree = new SkillTree({
                palId: pal.petId,
                skillPoints: 0,
                unlockedSkills: [],
            });
            await skillTree.save();
        }
    } catch (error) {
        console.error("Error retrieving skill tree:", error);
        skillTree = null;
    }

    const palData = allPals[pal.basePetId];
    const palType = palData?.type || "Beast";

    const enhancedPal = applyPotionEffects(pal, selectedPotion);
    let palCurrentHp = enhancedPal.stats.hp;

    if (selectedPotion) {
        potionEffects = getPotionEffects(selectedPotion);
        const potionEmbed = createSuccessEmbed(
            "Potion Applied!",
            `Your **${pal.nickname}** consumed a **${selectedPotion.name}** and feels empowered!`,
        );
        await interaction.update({ embeds: [potionEmbed], components: [] });
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    pal.status = "Exploring";
    await pal.save();

    if (skillTree && skillTree.unlockedSkills.length > 0) {
        const skillNames = skillTree.unlockedSkills
            .map((skill) => {
                const skillData = allSkillTrees[palType]?.skills[skill.skillId];
                return skillData ? `${skillData.name} (Lvl ${skill.level})` : skill.skillId;
            })
            .join(", ");

        const skillEmbed = createInfoEmbed(
            "Active Skills",
            `Your **${pal.nickname}** enters the dungeon with: ${skillNames}`,
        );
        await interaction.channel.send({ embeds: [skillEmbed] });
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    while (currentFloor <= dungeon.floors) {
        // Verify session is still valid before each floor
        if (activeDungeonSessions.get(interaction.user.id) !== sessionId) {
            return;
        }

        const isBossFloor = currentFloor === dungeon.floors;
        const enemy = generateEnemy(dungeon, currentFloor, isBossFloor);
        const enemyType = enemy.type || "Beast";

        const floorEmbed = createCustomEmbed(
            `${dungeon.name} - Floor ${currentFloor}`,
            `A wild **${enemy.name}** (${enemyType}) appears!`,
            "#E74C3C",
            {
                fields: [
                    {
                        name: `${pal.nickname} (Your ${palType} Pal)`,
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

        const fightButtons = new ActionRowBuilder().addComponents(
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

        await interaction.message.edit({
            embeds: [floorEmbed],
            components: [fightButtons],
        });

        const action = await interaction.channel
            .awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id && activeDungeonSessions.get(i.user.id) === sessionId,
                time: 5 * 60000,
                componentType: ComponentType.Button,
            })
            .catch(() => null);

        if (!action) {
            activeDungeonSessions.delete(interaction.user.id);
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
            const equipmentEffects = getEquipmentEffects(enhancedPal.equipment);
            const battleResult = await simulateEnhancedDungeonBattle(
                enhancedPal,
                enemy,
                potionEffects,
                equipmentEffects,
                palCurrentHp,
                palType,
                enemyType,
                skillTree,
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

            const floorRewards = generateDungeonRewards(dungeon, currentFloor);
            sessionRewards.gold += floorRewards.gold1;
            sessionRewards.xp += floorRewards.xp1;

            floorRewards.loot.forEach((newItem) => {
                const existingItem = sessionRewards.loot.find(
                    (item) => item.itemId === newItem.itemId,
                );
                if (existingItem) {
                    existingItem.quantity += newItem.quantity;
                } else {
                    sessionRewards.loot.push(newItem);
                }
            });

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

            let rewardString = `**+${floorRewards.gold1}** Gold\n**+${floorRewards.xp1}** XP`;
            floorRewards.loot.forEach((item) => {
                rewardString += `\n**+${item.quantity}x** ${allItems[item.itemId].name}`;
            });
            if (floorRewards.egg) {
                rewardString += `\n**+1x** ${allItems[floorRewards.egg.itemId].name}!`;
            }

            const rewardEmbed = createSuccessEmbed(
                `Floor ${currentFloor} Cleared!`,
                rewardString,
            );
            await interaction.message.edit({ embeds: [rewardEmbed] });
            await new Promise((resolve) => setTimeout(resolve, 4000));

            currentFloor++;
        }
    }

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
        activeDungeonSessions.delete(interaction.user.id);

        let updateSuccess = false;
        let retries = 3;

        while (!updateSuccess && retries > 0) {
            try {
                const currentPlayer = await Player.findOne({ userId: interaction.user.id });

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
                        currentPlayer.inventory.push(item);
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

        if (!updateSuccess) {
            console.error('Failed to update player after multiple retries');
        }

        const levelUpInfo = await grantPalXp(client, interaction.message, pal, rewards.xp);

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

        let finalSummary =
            `**Floors Cleared:** ${floorsCleared}\n` +
            `**Gold Earned:** ${rewards.gold}\n` +
            `**XP Gained:** ${rewards.xp}`;

        if (rewards.loot.length > 0 || rewards.egg.length > 0) {
            finalSummary += `\n\n**Items Obtained:**`;

            rewards.loot.forEach((item) => {
                const itemData = allItems[item.itemId];
                finalSummary += `\n• **${item.quantity}x** ${itemData.name}`;
            });

            if (rewards.egg.length > 0) {
                rewards.egg.forEach((eggItem) => {
                    const eggData = allItems[eggItem.itemId];
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

        const summaryEmbed = createSuccessEmbed("Expedition Summary", finalSummary);
        await interaction.channel.send({ embeds: [summaryEmbed] });

        if (!wasDefeated && floorsCleared === dungeon.floors) {
            client.emit("dungeonClear", interaction.user.id);
        }
    } catch (error) {
        console.error("Error in finalizeDungeon:", error);
        activeDungeonSessions.delete(interaction.user.id);
    }
}

// Helper functions
function applyPotionEffects(pal, potion) {
    if (!potion) return pal;

    const enhancedPal = JSON.parse(JSON.stringify(pal.toObject()));
    const effect = potion.effect;

    if (effect.type === "heal") {
        enhancedPal.stats.hp += effect.value;
    } else if (effect.type === "stat_boost") {
        if (enhancedPal.stats[effect.stat] !== undefined) {
            enhancedPal.stats[effect.stat] += effect.value;
        }
    } else if (effect.type === "multi_boost") {
        Object.keys(effect.stats).forEach((stat) => {
            if (enhancedPal.stats[stat] !== undefined) {
                enhancedPal.stats[stat] += effect.stats[stat];
            }
        });
    }

    return enhancedPal;
}

function getPotionEffects(potion) {
    if (!potion) return {};

    const effect = potion.effect;
    const effects = {};

    if (effect.type === "special") {
        effects.special = {
            ability: effect.ability,
            chance: effect.chance || 1.0,
            duration: effect.duration,
        };
    }

    return effects;
}

async function simulateEnhancedDungeonBattle(
    pal,
    enemy,
    potionEffects = {},
    equipmentEffects = {},
    startingHp = null,
    palType = "Beast",
    enemyType = "Beast",
    skillTree = null,
) {
    const {
        getTypeAdvantage,
        applySkillBonuses,
        getEquipmentResistances,
        checkSkillActivation,
        processWeaponAbilities,
        processStatusInfliction,
        processEquipmentEffects,
        calculateDamage,
        computeHitChance,
    } = require("../../utils/combat");
    const { StatusEffectManager } = require("../../utils/statusEffects");

    const enhancedPal = await applySkillBonuses(pal, skillTree);
    let palCurrentHp = startingHp !== null ? startingHp : enhancedPal.stats.hp;
    let enemyCurrentHp = enemy.stats.hp;
    const battleLog = [];
    let turn = 0;

    const palResistances = getEquipmentResistances(enhancedPal.equipment);
    const enemyResistances = {};
    if (!enhancedPal.statusEffects) enhancedPal.statusEffects = [];
    if (!enemy.statusEffects) enemy.statusEffects = [];

    let lichFormActive = 0;
    let invulnerabilityTurns = 0;
    let reviveUsed = false;

    while (palCurrentHp > 0 && enemyCurrentHp > 0 && turn < 50) {
        turn++;
        battleLog.push(`\n**--- Turn ${turn} ---**`);

        // Process status effects
        const palStatusResult = StatusEffectManager.processStatusEffects(
            { ...enhancedPal, currentHp: palCurrentHp, maxHp: enhancedPal.stats.hp },
            []
        );
        palCurrentHp = palStatusResult.creature.currentHp;
        enhancedPal.statusEffects = palStatusResult.creature.statusEffects;
        if (palStatusResult.battleLog.length > 0) {
            battleLog.push(...palStatusResult.battleLog);
        }

        const enemyStatusResult = StatusEffectManager.processStatusEffects(
            { ...enemy, currentHp: enemyCurrentHp, maxHp: enemy.stats.hp },
            []
        );
        enemyCurrentHp = enemyStatusResult.creature.currentHp;
        enemy.statusEffects = enemyStatusResult.creature.statusEffects;
        if (enemyStatusResult.battleLog.length > 0) {
            battleLog.push(...enemyStatusResult.battleLog);
        }

        if (invulnerabilityTurns > 0) invulnerabilityTurns--;

        const palCanAct = palStatusResult.canAct !== false;
        const enemyCanAct = enemyStatusResult.canAct !== false;

        // Pal's turn
        if (palCanAct) {
            // Check for miss first
            const hitResult = computeHitChance(
                palStatusResult.creature.stats,
                enemy.stats,
                enhancedPal.equipment,
                null
            );

            if (Math.random() > hitResult.hitChance) {
                battleLog.push(`💨 **${pal.nickname}**'s attack misses!`);
            } else {
                // Check for skill activations
                const darkRitual = checkSkillActivation(enhancedPal, "dark_ritual", palCurrentHp, enhancedPal.stats.hp);
                const lichTransform = checkSkillActivation(enhancedPal, "lich_transformation");
                const executeSkill = checkSkillActivation(enhancedPal, "execute", palCurrentHp, enhancedPal.stats.hp);
                const overloadSkill = checkSkillActivation(enhancedPal, "overload");
                const multiAttack = checkSkillActivation(enhancedPal, "multiAttack");
                const chainReaction = checkSkillActivation(enhancedPal, "chainReaction");

                let damageMultiplier = 1;
                let attackCount = 1;

                if (darkRitual?.type === "dark_ritual") {
                    palCurrentHp -= darkRitual.sacrifice;
                    damageMultiplier = darkRitual.multiplier;
                    battleLog.push(`🩸 **Dark Ritual!** ${pal.nickname} sacrifices ${darkRitual.sacrifice} HP for power!`);
                }

                if (lichTransform?.type === "lich_transformation" && lichFormActive === 0) {
                    invulnerabilityTurns = lichTransform.duration;
                    damageMultiplier *= lichTransform.multiplier;
                    lichFormActive = lichTransform.duration;
                    battleLog.push(`💀 **Lich Transformation!** ${pal.nickname} becomes temporarily invulnerable!`);
                }

                if (multiAttack?.type === "multiAttack") {
                    attackCount = 2;
                    battleLog.push(multiAttack.message);
                }

                let totalDamage = 0;

                for (let attack = 0; attack < attackCount; attack++) {
                    let palAttack = calculateDamage(
                        palStatusResult.creature.stats,
                        enemy.stats,
                        palType,
                        enemyType,
                        enemyResistances
                    );

                    let specialActivated = false;

                    if (executeSkill?.type === "execute") {
                        palAttack.damage = Math.floor(palAttack.damage * executeSkill.multiplier);
                        battleLog.push(`💀 **Apex Predator!** ${pal.nickname} delivers a devastating blow!`);
                        specialActivated = true;
                    } else if (overloadSkill?.type === "overload") {
                        palAttack.damage = Math.floor(palAttack.damage * overloadSkill.multiplier);
                        battleLog.push(`⚡ **System Overload!** ${pal.nickname}'s systems surge with power!`);
                        specialActivated = true;

                        if (chainReaction?.type === "chainReaction") {
                            palAttack.damage += chainReaction.damage;
                            battleLog.push(chainReaction.message);
                        }
                    }

                    if (damageMultiplier > 1) {
                        palAttack.damage = Math.floor(palAttack.damage * damageMultiplier);
                    }

                    // Process weapon abilities
                    if (!specialActivated) {
                        const weaponResult = processWeaponAbilities(
                            palStatusResult.creature.stats,
                            equipmentEffects,
                            pal.nickname
                        );

                        if (weaponResult.activated) {
                            palAttack.damage += weaponResult.damage;
                            battleLog.push(...weaponResult.messages);
                            specialActivated = true;

                            // Apply status effects from weapons
                            if (weaponResult.statusEffects) {
                                weaponResult.statusEffects.forEach(effect => {
                                    StatusEffectManager.applyStatusEffect(enemy, effect);
                                });
                            }
                        }
                    }

                    // Process offensive equipment effects
                    const { processOffensiveEquipmentEffects, processDefensiveEquipmentEffects } = require("../../utils/combat");
                    const offensiveResult = processOffensiveEquipmentEffects(
                        enhancedPal,
                        equipmentEffects,
                        pal.nickname
                    );
                    if (offensiveResult.messages.length > 0) {
                        battleLog.push(...offensiveResult.messages);
                    }
                    palAttack.damage = Math.floor(palAttack.damage * offensiveResult.damageModifier);

                    // Apply status effects from offensive equipment
                    if (offensiveResult.statusEffects) {
                        offensiveResult.statusEffects.forEach(effect => {
                            StatusEffectManager.applyStatusEffect(enemy, effect);
                        });
                    }

                    // Process potion special abilities
                    if (potionEffects.special && !specialActivated) {
                        const { ability, chance } = potionEffects.special;
                        if (ability === "shadow_strike" && Math.random() < (chance || 0.25)) {
                            palAttack.damage *= 2;
                            battleLog.push(`🌑 **Shadow Strike!** ${pal.nickname} attacks from the shadows!`);
                            specialActivated = true;
                        } else if (ability === "phase_dodge" && Math.random() < (chance || 0.15)) {
                            battleLog.push(`👻 **Phase Shift!** ${pal.nickname} attacks from another dimension!`);
                            palAttack.damage = Math.floor(palAttack.damage * 1.3);
                        }
                    }

                    totalDamage += palAttack.damage;

                    if (attack === 0 || attackCount === 1) {
                        let attackMessage = `⚔️ Your **${pal.nickname}** attacks for **${palAttack.damage}** damage!`;
                        if (palAttack.typeMultiplier > 1) {
                            attackMessage += ` ✨ **Super effective!** (${palType} vs ${enemyType})`;
                        } else if (palAttack.typeMultiplier < 1) {
                            attackMessage += ` 🛡️ *Not very effective...* (${palType} vs ${enemyType})`;
                        }
                        if (palAttack.isCrit && !specialActivated) {
                            attackMessage += ` 💥 **Critical hit!**`;
                        }
                        if (palAttack.resistanceApplied) {
                            attackMessage += ` 🛡️ *Damage reduced by resistance!*`;
                        }

                        if (!specialActivated) {
                            battleLog.push(attackMessage);
                        } else {
                            battleLog.push(`⚔️ The enhanced attack deals **${palAttack.damage}** damage!`);
                        }
                    } else {
                        battleLog.push(`⚔️ Follow-up attack deals **${palAttack.damage}** damage!`);
                    }
                }

                // Apply lifesteal
                if (enhancedPal.skillBonuses?.lifesteal) {
                    const healing = Math.floor(totalDamage * enhancedPal.skillBonuses.lifesteal);
                    palCurrentHp = Math.min(enhancedPal.stats.hp, palCurrentHp + healing);
                    battleLog.push(`💉 **Life Drain!** ${pal.nickname} recovers ${healing} HP!`);
                }

                enemyCurrentHp -= totalDamage;

                // Process status effect infliction
                const statusMessages = processStatusInfliction(enhancedPal, enemy, pal.nickname);
                battleLog.push(...statusMessages);

                if (enemyCurrentHp <= 0) {
                    battleLog.push(`💀 The **${enemy.name}** has been defeated!`);
                    break;
                }
                battleLog.push(`> *${enemy.name} HP: ${enemyCurrentHp}/${enemy.stats.hp}*`);
            }
        }

        // Enemy's turn
        if (enemyCanAct && enemyCurrentHp > 0) {
            if (invulnerabilityTurns > 0) {
                battleLog.push(`🛡️ **${pal.nickname}** is invulnerable to damage!`);
            } else {
                // Check for defensive abilities
                const divineProtection = checkSkillActivation(enhancedPal, "divine_protection");
                const dodgeSkill = checkSkillActivation(enhancedPal, "dodge");

                let dodged = false;

                if (divineProtection?.type === "divine_protection") {
                    battleLog.push(divineProtection.message);
                    battleLog.push(`> The attack is completely negated!`);
                    dodged = true;

                    if (enhancedPal.skillBonuses?.healOnDodge) {
                        const healing = Math.floor(enhancedPal.stats.hp * 0.1);
                        palCurrentHp = Math.min(enhancedPal.stats.hp, palCurrentHp + healing);
                        battleLog.push(`✨ **Divine Grace** restores ${healing} HP!`);
                    }
                } else if (dodgeSkill?.type === "dodge") {
                    battleLog.push(dodgeSkill.message);
                    battleLog.push(`> The attack misses!`);
                    dodged = true;

                    const counterSkill = checkSkillActivation(enhancedPal, "counter");
                    if (counterSkill?.type === "counter") {
                        const counterAttack = calculateDamage(
                            palStatusResult.creature.stats,
                            enemy.stats,
                            palType,
                            enemyType
                        );
                        enemyCurrentHp -= counterAttack.damage;
                        battleLog.push(`${counterSkill.message}`);
                        battleLog.push(`⚔️ Counter-attack deals **${counterAttack.damage}** damage!`);

                        if (enemyCurrentHp <= 0) {
                            battleLog.push(`💀 The **${enemy.name}** has been defeated by the counter-attack!`);
                            break;
                        }
                    }
                } else if (
                    potionEffects.special?.ability === "phase_dodge" &&
                    Math.random() < (potionEffects.special.chance || 0.25)
                ) {
                    battleLog.push(`👻 **Phase Dodge!** Your **${pal.nickname}** phases through the attack!`);
                    dodged = true;
                }

                if (!dodged) {
                    let enemyAttack = calculateDamage(
                        enemy.stats,
                        palStatusResult.creature.stats,
                        enemyType,
                        palType,
                        palResistances
                    );

                    // Apply damage reduction
                    if (enhancedPal.skillBonuses?.damageReduction) {
                        const originalDamage = enemyAttack.damage;
                        enemyAttack.damage = Math.floor(enemyAttack.damage * (1 - enhancedPal.skillBonuses.damageReduction));
                        if (originalDamage !== enemyAttack.damage) {
                            battleLog.push(`🛡️ **Armor Plating** reduces damage by ${originalDamage - enemyAttack.damage}!`);
                        }
                    }

                    palCurrentHp -= enemyAttack.damage;

                    let counterMessage = `⚔️ The **${enemy.name}** retaliates for **${enemyAttack.damage}** damage!`;
                    if (enemyAttack.typeMultiplier > 1) {
                        counterMessage += ` ✨ **Super effective!**`;
                    } else if (enemyAttack.typeMultiplier < 1) {
                        counterMessage += ` 🛡️ *Not very effective...*`;
                    }
                    if (enemyAttack.isCrit) {
                        counterMessage += ` 💥 **Critical hit!**`;
                    }
                    battleLog.push(counterMessage);

                    if (palCurrentHp <= 0) {
                        // Check for death resistance
                        if (enhancedPal.skillBonuses?.deathResistance && Math.random() < enhancedPal.skillBonuses.deathResistance) {
                            palCurrentHp = 1;
                            battleLog.push(`💀 **Undying Will!** ${pal.nickname} refuses to fall!`);
                        }
                        // Check for revive ability
                        else if (!reviveUsed && equipmentEffects.revive_once) {
                            palCurrentHp = Math.floor(enhancedPal.stats.hp * 0.5);
                            reviveUsed = true;
                            battleLog.push(`🌟 **Revival!** ${pal.nickname}'s equipment grants a second chance!`);
                        }
                        // Check for skill-based revival
                        else if (!reviveUsed && enhancedPal.skillBonuses?.reviveChance && Math.random() < enhancedPal.skillBonuses.reviveChance) {
                            palCurrentHp = Math.floor(enhancedPal.stats.hp * 0.3);
                            reviveUsed = true;
                            battleLog.push(`🌟 **Miraculous Revival!** ${pal.nickname} refuses to stay down!`);
                        } else {
                            battleLog.push(`💀 Your **${pal.nickname}** has been defeated!`);
                            break;
                        }
                    }
                    battleLog.push(`> *${pal.nickname} HP: ${palCurrentHp}/${enhancedPal.stats.hp}*`);
                }
            }
        }

        // Apply healing over time effects
        if (enhancedPal.skillBonuses?.hpRegen) {
            const healing = Math.floor(enhancedPal.stats.hp * enhancedPal.skillBonuses.hpRegen);
            palCurrentHp = Math.min(enhancedPal.stats.hp, palCurrentHp + healing);
            if (healing > 0) {
                battleLog.push(`💚 **Regeneration:** ${pal.nickname} recovers ${healing} HP!`);
            }
        }

        if (enhancedPal.skillBonuses?.selfRepair) {
            const repairAmount = Math.floor(enhancedPal.stats.hp * enhancedPal.skillBonuses.selfRepair);
            palCurrentHp = Math.min(enhancedPal.stats.hp, palCurrentHp + repairAmount);
            if (repairAmount > 0) {
                battleLog.push(`🔧 **Self Repair:** ${pal.nickname} repairs ${repairAmount} HP!`);
            }
        }

        // Check for end-of-turn healing skills
        const healingSkill = checkSkillActivation(enhancedPal, "hpRegen", palCurrentHp, enhancedPal.stats.hp);
        if (healingSkill?.type === "hpRegen") {
            palCurrentHp = Math.min(enhancedPal.stats.hp, palCurrentHp + healingSkill.heal);
            battleLog.push(healingSkill.message);
        }

        if (lichFormActive > 0) lichFormActive--;
    }

    if (turn >= 50) {
        battleLog.push("⏱️ The battle lasted too long and both combatants retreat");
    }

    return {
        playerWon: palCurrentHp > 0,
        log: battleLog.join("\n"),
        remainingHp: Math.max(0, palCurrentHp),
    };
}