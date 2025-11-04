const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
} = require("discord.js");
const Player = require("../../models/Player");
const Pet = require("../../models/Pet");
const SkillTree = require("../../models/SkillTree");
const {
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    createCustomEmbed,
    createInfoEmbed,
} = require("../../utils/embed");
const allItems = require("../../gamedata/items");
const allPals = require("../../gamedata/pets");
const allSkillTrees = require("../../gamedata/skillTrees");

// Global battle sessions to track ongoing battles
const battleSessions = new Map();

module.exports = {
    name: "battle",
    description: "Challenge another player to a Pal battle!",
    usage: "<@user> | add <pet_id>",
    aliases: ["fight", "duel", "pvp"],
    async execute(message, args, client, prefix) {
        try {
            const challengerId = message.author.id;
            const challenger = await Player.findOne({ userId: challengerId });

            if (!challenger) {
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "No Adventure Started",
                            `You haven't started your journey yet! Use \`${prefix}start\` to begin.`,
                        ),
                    ],
                });
            }

            // Check for subcommand
            const subcommand = args[0]?.toLowerCase();

            if (subcommand === "add") {
                return await handlePetAdd(
                    message,
                    args,
                    client,
                    prefix,
                    challengerId,
                );
            } else {
                // Challenge mode - battle @user
                const targetUser = message.mentions.users.first();
                if (!targetUser) {
                    return message.reply({
                        embeds: [
                            createErrorEmbed(
                                "Invalid Usage",
                                `Please use: \`${prefix}battle @user\` to challenge or \`${prefix}battle add <pet_id>\` to add your pet to an accepted battle`,
                            ),
                        ],
                    });
                }
                return await handleBattleChallenge(
                    message,
                    targetUser,
                    client,
                    prefix,
                    challengerId,
                    challenger,
                );
            }
        } catch (error) {
            console.error("Battle command error:", error);
            message.reply({
                embeds: [
                    createErrorEmbed(
                        "An Error Occurred",
                        "There was a problem processing the battle command.",
                    ),
                ],
            });
        }
    },
};

async function handlePetAdd(message, args, client, prefix, challengerId) {
    if (args.length < 2) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Invalid Usage",
                    `Please use: \`${prefix}battle add <pet_id>\``,
                ),
            ],
        });
    }

    const petId = args[1];

    // Find active battle session involving this player
    let battleSession = null;
    for (const [sessionId, session] of battleSessions.entries()) {
        if (
            session.challenger.id === challengerId ||
            session.opponent.id === challengerId
        ) {
            battleSession = session;
            break;
        }
    }

    if (!battleSession) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "No Active Battle",
                    "You are not in an active battle. Use `battle @user` to challenge someone first.",
                ),
            ],
        });
    }

    if (battleSession.status !== "pet_selection") {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Invalid State",
                    "This battle is not in the pet selection phase.",
                ),
            ],
        });
    }

    // Validate pet
    const pal = await Pet.findOne({
        ownerId: challengerId,
        shortId: petId,
        status: "Idle",
    });

    if (!pal) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Pet Not Found",
                    "You don't have an idle pet with that ID!",
                ),
            ],
        });
    }

    // Add pet to battle session
    if (battleSession.challenger.id === challengerId) {
        battleSession.challenger.pal = pal;
    } else {
        battleSession.opponent.pal = pal;
    }

    const successEmbed = createSuccessEmbed(
        "Pet Added!",
        `**${pal.nickname}** (Level ${pal.level}) has been added to the battle!`,
    );
    await message.reply({ embeds: [successEmbed] });

    // Check if both players have selected pets
    if (battleSession.challenger.pal && battleSession.opponent.pal) {
        battleSession.status = "potion_selection";
        await sendPotionSelectionMessage(message, battleSession, client);
    }
}

async function handleBattleChallenge(
    message,
    targetUser,
    client,
    prefix,
    challengerId,
    challenger,
) {
    if (targetUser.id === challengerId) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Invalid Target",
                    "You cannot battle yourself!",
                ),
            ],
        });
    }

    const opponent = await Player.findOne({ userId: targetUser.id });
    if (!opponent) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Player Not Found",
                    "The mentioned user has not started their adventure yet!",
                ),
            ],
        });
    }

    // Check if both players have Pals
    const challengerPals = await Pet.find({
        ownerId: challengerId,
        status: "Idle",
    });
    const opponentPals = await Pet.find({
        ownerId: targetUser.id,
        status: "Idle",
    });

    if (challengerPals.length === 0) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "No Available Pals",
                    "You have no idle Pals available for battle!",
                ),
            ],
        });
    }

    if (opponentPals.length === 0) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Opponent Has No Pals",
                    "Your opponent has no idle Pals available for battle!",
                ),
            ],
        });
    }

    // Create battle invitation embed
    const inviteEmbed = createCustomEmbed(
        "⚔️ Battle Challenge!",
        `**${message.author.displayName}** has challenged **${targetUser.displayName}** to a Pal battle!\n\n` +
            `${targetUser.displayName}, do you accept this challenge?\n\n` +
            `*After accepting, both players can use \`${prefix}battle add <pet_id>\` to select their pets.*`,
        "#FF6B6B",
        {
            footer: { text: "Challenge expires in 60 seconds" },
            timestamp: true,
        },
    );

    const inviteButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("accept_battle")
            .setLabel("Accept Challenge")
            .setStyle(ButtonStyle.Success)
            .setEmoji("⚔️"),
        new ButtonBuilder()
            .setCustomId("decline_battle")
            .setLabel("Decline")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("❌"),
    );

    const inviteMessage = await message.reply({
        content: `${targetUser}`,
        embeds: [inviteEmbed],
        components: [inviteButtons],
    });

    // Handle battle invitation response
    const inviteCollector = inviteMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === targetUser.id,
        time: 60000,
        componentType: ComponentType.Button,
    });

    inviteCollector.on("collect", async (interaction) => {
        if (interaction.customId === "decline_battle") {
            const declineEmbed = createWarningEmbed(
                "Challenge Declined",
                `${targetUser.displayName} has declined the battle challenge.`,
            );
            await interaction.update({
                embeds: [declineEmbed],
                components: [],
            });
            return;
        }

        if (interaction.customId === "accept_battle") {
            // Create battle session
            const sessionId = `${challengerId}_${targetUser.id}_${Date.now()}`;
            const battleSession = {
                id: sessionId,
                challenger: {
                    id: challengerId,
                    pal: null,
                    potion: null,
                    ready: false,
                },
                opponent: {
                    id: targetUser.id,
                    pal: null,
                    potion: null,
                    ready: false,
                },
                status: "pet_selection",
                channelId: message.channel.id,
            };

            battleSessions.set(sessionId, battleSession);

            const acceptEmbed = createSuccessEmbed(
                "Challenge Accepted!",
                `${targetUser.displayName} has accepted the challenge!\n\n` +
                    `**Both players can now use \`${prefix}battle add <pet_id>\` to select their pets.**\n` +
                    `You have 5 minutes to select your pets.`,
            );
            await interaction.update({ embeds: [acceptEmbed], components: [] });

            // Set timeout to cleanup battle session
            setTimeout(
                () => {
                    if (battleSessions.has(sessionId)) {
                        battleSessions.delete(sessionId);
                    }
                },
                5 * 60 * 1000,
            ); // 5 minutes
        }
    });

    inviteCollector.on("end", (collected) => {
        if (collected.size === 0) {
            const timeoutEmbed = createWarningEmbed(
                "Challenge Expired",
                "The battle challenge has expired due to no response.",
            );
            inviteMessage
                .edit({ embeds: [timeoutEmbed], components: [] })
                .catch(() => {});
        }
    });
}

async function sendPotionSelectionMessage(message, battleSession, client) {
    const challengerUser = await client.users.fetch(
        battleSession.challenger.id,
    );
    const opponentUser = await client.users.fetch(battleSession.opponent.id);

    const selectionEmbed = createCustomEmbed(
        "🧪 Potion Selection Phase",
        `Both players have selected their pets!\n\n` +
            `**${challengerUser.displayName}:** ${battleSession.challenger.pal.nickname} (Lvl ${battleSession.challenger.pal.level})\n` +
            `**${opponentUser.displayName}:** ${battleSession.opponent.pal.nickname} (Lvl ${battleSession.opponent.pal.level})\n\n` +
            `Now select your battle potions (optional) and click Ready!`,
        "#4ECDC4",
    );

    // Send potion selection to both players
    await sendPotionMessage(
        message,
        battleSession.challenger.id,
        battleSession,
        client,
        true,
    );
    await sendPotionMessage(
        message,
        battleSession.opponent.id,
        battleSession,
        client,
        false,
    );

    await message.channel.send({ embeds: [selectionEmbed] });
}

async function sendPotionMessage(
    message,
    userId,
    battleSession,
    client,
    isChallenger,
) {
    const player = await Player.findOne({ userId });

    // Get available battle potions (usable: false)
    const potions = player.inventory.filter((item) => {
        const itemData = allItems[item.itemId];
        return (
            itemData &&
            itemData.type === "potion" &&
            itemData.usable === false &&
            item.quantity > 0
        );
    });

    const potionOptions = [
        {
            label: "No Potion",
            description: "Fight without any potion boost",
            value: "none",
        },
        ...potions.slice(0, 24).map((potion, index) => {
            const itemData = allItems[potion.itemId];
            return {
                label: itemData.name,
                description: itemData.description.substring(0, 100),
                value: `${potion.itemId}_${index}`,
            };
        }),
    ];

    const playerData = isChallenger
        ? battleSession.challenger
        : battleSession.opponent;
    const preparationEmbed = createCustomEmbed(
        "⚔️ Battle Preparation",
        `Your **${playerData.pal.nickname}** is ready for battle!\n` +
            `Select a battle potion to enhance your Pal's abilities.\n\n` +
            `**Available Battle Potions:** ${potions.length}`,
        "#4ECDC4",
    );

    const components = [];

    if (potionOptions.length > 1) {
        const potionSelect = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`select_battle_potion_${userId}`)
                .setPlaceholder("Choose a battle potion (optional)")
                .addOptions(potionOptions),
        );
        components.push(potionSelect);
    }

    const readyButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ready_for_battle_${userId}`)
            .setLabel("Ready for Battle!")
            .setStyle(ButtonStyle.Success)
            .setEmoji("⚔️"),
    );
    components.push(readyButton);

    const preparationMessage = await message.channel.send({
        content: `<@${userId}>`,
        embeds: [preparationEmbed],
        components: components,
    });

    // Handle preparation interactions
    const preparationCollector =
        preparationMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === userId,
            time: 5 * 60 * 1000,
        });

    preparationCollector.on("collect", async (interaction) => {
        if (interaction.customId === `select_battle_potion_${userId}`) {
            const selectedPotionId = interaction.values[0];
            const [itemId] = selectedPotionId.split("_");
            const selectedPotion =
                selectedPotionId === "none" ? null : allItems[itemId];

            if (isChallenger) {
                battleSession.challenger.potion = selectedPotion;
            } else {
                battleSession.opponent.potion = selectedPotion;
            }

            const potionName = selectedPotion
                ? selectedPotion.name
                : "No Potion";
            await interaction.reply({
                content: `✅ Selected **${potionName}** for battle!`,
                ephemeral: true,
            });
        }

        if (interaction.customId === `ready_for_battle_${userId}`) {
            if (isChallenger) {
                battleSession.challenger.ready = true;
            } else {
                battleSession.opponent.ready = true;
            }

            await interaction.update({
                components: interaction.message.components.map((row) => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach((component) => {
                        if (
                            component.data.custom_id ===
                            `ready_for_battle_${userId}`
                        ) {
                            component
                                .setDisabled(true)
                                .setLabel("Ready!")
                                .setStyle(ButtonStyle.Secondary);
                        }
                    });
                    return newRow;
                }),
            });

            // Check if both players are ready
            if (
                battleSession.challenger.ready &&
                battleSession.opponent.ready
            ) {
                await startBattle(message, battleSession, client);
                battleSessions.delete(battleSession.id);
            }
        }
    });

    preparationCollector.on("end", () => {
        preparationMessage.edit({ components: [] }).catch(() => {});
    });
}

async function startBattle(message, battleSession, client) {
    const { challenger, opponent } = battleSession;

    // Apply potion effects
    const challengerPal = applyPotionEffects(challenger.pal, challenger.potion);
    const opponentPal = applyPotionEffects(opponent.pal, opponent.potion);

    // Get potion effects for special abilities
    const challengerPotionEffects = getPotionEffects(challenger.potion);
    const opponentPotionEffects = getPotionEffects(opponent.potion);

    // Get equipment effects
    const challengerEquipmentEffects = getEquipmentEffects(challenger.pal);
    const opponentEquipmentEffects = getEquipmentEffects(opponent.pal);

    // Get skill trees for both players
    const challengerSkillTree = await SkillTree.findOne({ palId: challenger.pal.petId });
    const opponentSkillTree = await SkillTree.findOne({ palId: opponent.pal.petId });

    // Create skill trees if they don't exist
    const finalChallengerSkillTree = challengerSkillTree || new SkillTree({
        palId: challenger.pal.petId,
        skillPoints: 0,
        unlockedSkills: [],
    });

    const finalOpponentSkillTree = opponentSkillTree || new SkillTree({
        palId: opponent.pal.petId,
        skillPoints: 0,
        unlockedSkills: [],
    });

    // Get pal types
    const challengerPalData = allPals[challenger.pal.basePetId];
    const opponentPalData = allPals[opponent.pal.basePetId];
    const challengerType = challengerPalData?.type || "Beast";
    const opponentType = opponentPalData?.type || "Beast";

    // Determine turn order based on speed
    const challengerSpeed = challengerPal.stats.spd;
    const opponentSpeed = opponentPal.stats.spd;

    let firstPlayer,
        secondPlayer,
        firstPal,
        secondPal,
        firstPotionEffects,
        secondPotionEffects,
        firstEquipmentEffects,
        secondEquipmentEffects,
        firstSkillTree,
        secondSkillTree,
        firstType,
        secondType;

    if (
        challengerSpeed > opponentSpeed ||
        (challengerSpeed === opponentSpeed && Math.random() < 0.5)
    ) {
        firstPlayer = challenger;
        secondPlayer = opponent;
        firstPal = challengerPal;
        secondPal = opponentPal;
        firstPotionEffects = challengerPotionEffects;
        secondPotionEffects = opponentPotionEffects;
        firstEquipmentEffects = challengerEquipmentEffects;
        secondEquipmentEffects = opponentEquipmentEffects;
        firstSkillTree = finalChallengerSkillTree;
        secondSkillTree = finalOpponentSkillTree;
        firstType = challengerType;
        secondType = opponentType;
    } else {
        firstPlayer = opponent;
        secondPlayer = challenger;
        firstPal = opponentPal;
        secondPal = challengerPal;
        firstPotionEffects = opponentPotionEffects;
        secondPotionEffects = challengerPotionEffects;
        firstEquipmentEffects = opponentEquipmentEffects;
        secondEquipmentEffects = challengerEquipmentEffects;
        firstSkillTree = finalOpponentSkillTree;
        secondSkillTree = finalChallengerSkillTree;
        firstType = opponentType;
        secondType = challengerType;
    }

    // Start battle simulation
    const battleResult = await simulateEnhancedPvPBattle(
        firstPlayer,
        secondPlayer,
        firstPal,
        secondPal,
        firstPotionEffects,
        secondPotionEffects,
        firstEquipmentEffects,
        secondEquipmentEffects,
        firstSkillTree,
        secondSkillTree,
        firstType,
        secondType,
        client,
    );

    // Split long battle logs to prevent Discord crashes
    const logs = splitBattleLog(battleResult.log);

    for (let i = 0; i < logs.length; i++) {
        const color =
            battleResult.winnerId === challenger.id ? "#4CAF50" : "#F44336";
        const title =
            i === 0
                ? "⚔️ Battle Results"
                : `⚔️ Battle Results (${i + 1}/${logs.length})`;

        const resultEmbed = createCustomEmbed(title, logs[i], color);

        // Add fields only to the last embed
        if (i === logs.length - 1) {
            resultEmbed.addFields([
                {
                    name: "🏆 Winner",
                    value: `<@${battleResult.winnerId}> and **${battleResult.winnerPal.nickname}**!`,
                    inline: true,
                },
                {
                    name: "📊 Final Stats",
                    value:
                        `**${battleResult.winnerPal.nickname}:** ${battleResult.winnerRemainingHp}/${battleResult.winnerPal.stats.hp} HP\n` +
                        `**${battleResult.loserPal.nickname}:** 0/${battleResult.loserPal.stats.hp} HP`,
                    inline: true,
                },
            ]);
        }

        await message.channel.send({ embeds: [resultEmbed] });

        // Small delay between messages to prevent rate limiting
        if (i < logs.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

function splitBattleLog(log, maxLength = 4000) {
    const logs = [];
    const lines = log.split("\n");
    let currentLog = "";

    for (const line of lines) {
        if (currentLog.length + line.length + 1 > maxLength) {
            if (currentLog) {
                logs.push(currentLog.trim());
                currentLog = "";
            }
        }
        currentLog += line + "\n";
    }

    if (currentLog.trim()) {
        logs.push(currentLog.trim());
    }

    return logs.length > 0 ? logs : [log];
}

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

function getEquipmentEffects(pal) {
    const effects = {};

    if (pal.equipment) {
        Object.values(pal.equipment).forEach((equipmentId) => {
            if (equipmentId && allItems[equipmentId]) {
                const equipment = allItems[equipmentId];
                if (equipment.stats && equipment.stats.special) {
                    effects[equipment.stats.special] = true;
                }
            }
        });
    }

    return effects;
}

async function simulateEnhancedPvPBattle(
    firstPlayer,
    secondPlayer,
    firstPal,
    secondPal,
    firstPotionEffects,
    secondPotionEffects,
    firstEquipmentEffects,
    secondEquipmentEffects,
    firstSkillTree,
    secondSkillTree,
    firstType,
    secondType,
    client,
) {
    // Import required combat utilities
    const { 
        applySkillBonuses, 
        getTypeAdvantage, 
        getEquipmentResistances,
        checkSkillActivation,
        processWeaponAbilities,
        processStatusInfliction,
        calculateDamage,
        computeHitChance,
        processEquipmentEffects
    } = require('../../utils/combat');
    const { StatusEffectManager } = require('../../utils/statusEffects');

    // Apply skill bonuses to both pals
    const enhancedFirstPal = await applySkillBonuses(firstPal, firstSkillTree);
    const enhancedSecondPal = await applySkillBonuses(secondPal, secondSkillTree);

    let firstCurrentHp = enhancedFirstPal.stats.hp;
    let secondCurrentHp = enhancedSecondPal.stats.hp;
    const battleLog = [];
    let turn = 0;

    const firstUser = await client.users.fetch(firstPlayer.id);
    const secondUser = await client.users.fetch(secondPlayer.id);

    // Get equipment resistances
    const firstResistances = getEquipmentResistances(enhancedFirstPal.equipment);
    const secondResistances = getEquipmentResistances(enhancedSecondPal.equipment);

    // Initialize status effects
    if (!enhancedFirstPal.statusEffects) enhancedFirstPal.statusEffects = [];
    if (!enhancedSecondPal.statusEffects) enhancedSecondPal.statusEffects = [];

    // Determine initial turn order based on speed
    const { calculateTurnOrder } = require('../../utils/combat');
    let turnOrderResult = calculateTurnOrder(
        enhancedFirstPal, 
        enhancedSecondPal, 
        `${firstUser.displayName}'s ${firstPal.nickname}`,
        `${secondUser.displayName}'s ${secondPal.nickname}`
    );

    battleLog.push(`🎯 **${turnOrderResult.firstName}** goes first!`);

    // Show active effects
    if (firstPlayer.potion) {
        battleLog.push(
            `💉 **${firstUser.displayName}'s ${firstPal.nickname}** is enhanced by **${firstPlayer.potion.name}**!`,
        );
    }
    if (secondPlayer.potion) {
        battleLog.push(
            `💉 **${secondUser.displayName}'s ${secondPal.nickname}** is enhanced by **${secondPlayer.potion.name}**!`,
        );
    }

    // Show skill tree info
    if (firstSkillTree && firstSkillTree.unlockedSkills.length > 0) {
        battleLog.push(
            `🎯 **${firstUser.displayName}'s ${firstPal.nickname}** enters battle with ${firstSkillTree.unlockedSkills.length} active skills!`,
        );
    }
    if (secondSkillTree && secondSkillTree.unlockedSkills.length > 0) {
        battleLog.push(
            `🎯 **${secondUser.displayName}'s ${secondPal.nickname}** enters battle with ${secondSkillTree.unlockedSkills.length} active skills!`,
        );
    }

    battleLog.push("");

    while (firstCurrentHp > 0 && secondCurrentHp > 0 && turn < 50) {
        turn++;
        battleLog.push(`\n**--- Turn ${turn} ---**`);

        // Process status effects for both pals
        const firstStatusResult = StatusEffectManager.processStatusEffects(
            {
                ...enhancedFirstPal,
                currentHp: firstCurrentHp,
                maxHp: enhancedFirstPal.stats.hp,
            },
            [],
        );
        firstCurrentHp = firstStatusResult.creature.currentHp;
        enhancedFirstPal.statusEffects = firstStatusResult.creature.statusEffects;
        if (firstStatusResult.battleLog.length > 0) {
            battleLog.push(...firstStatusResult.battleLog);
        }

        const secondStatusResult = StatusEffectManager.processStatusEffects(
            { ...enhancedSecondPal, currentHp: secondCurrentHp, maxHp: enhancedSecondPal.stats.hp },
            [],
        );
        secondCurrentHp = secondStatusResult.creature.currentHp;
        enhancedSecondPal.statusEffects = secondStatusResult.creature.statusEffects;
        if (secondStatusResult.battleLog.length > 0) {
            battleLog.push(...secondStatusResult.battleLog);
        }

        // Check if creatures can act
        const firstCanAct = firstStatusResult.canAct !== false;
        const secondCanAct = secondStatusResult.canAct !== false;

        // Recalculate turn order each turn (speed can be affected by status effects)
        turnOrderResult = calculateTurnOrder(
            { ...enhancedFirstPal, currentHp: firstCurrentHp },
            { ...enhancedSecondPal, currentHp: secondCurrentHp },
            `${firstUser.displayName}'s ${firstPal.nickname}`,
            `${secondUser.displayName}'s ${secondPal.nickname}`
        );

        const firstGoesFirst = turnOrderResult.firstName === `${firstUser.displayName}'s ${firstPal.nickname}`;
        
        // Determine who attacks first this turn
        const attackOrder = firstGoesFirst ? 
            [
                { player: firstPlayer, pal: enhancedFirstPal, currentHp: firstCurrentHp, canAct: firstCanAct, 
                  user: firstUser, opponent: enhancedSecondPal, opponentHp: secondCurrentHp, 
                  potionEffects: firstPotionEffects, equipmentEffects: firstEquipmentEffects,
                  resistances: secondResistances, type: firstType, opponentType: secondType, equipment: firstPlayer.equipment },
                { player: secondPlayer, pal: enhancedSecondPal, currentHp: secondCurrentHp, canAct: secondCanAct, 
                  user: secondUser, opponent: enhancedFirstPal, opponentHp: firstCurrentHp,
                  potionEffects: secondPotionEffects, equipmentEffects: secondEquipmentEffects,
                  resistances: firstResistances, type: secondType, opponentType: firstType, equipment: secondPlayer.equipment }
            ] :
            [
                { player: secondPlayer, pal: enhancedSecondPal, currentHp: secondCurrentHp, canAct: secondCanAct, 
                  user: secondUser, opponent: enhancedFirstPal, opponentHp: firstCurrentHp,
                  potionEffects: secondPotionEffects, equipmentEffects: secondEquipmentEffects,
                  resistances: firstResistances, type: secondType, opponentType: firstType, equipment: secondPlayer.equipment },
                { player: firstPlayer, pal: enhancedFirstPal, currentHp: firstCurrentHp, canAct: firstCanAct, 
                  user: firstUser, opponent: enhancedSecondPal, opponentHp: secondCurrentHp, 
                  potionEffects: firstPotionEffects, equipmentEffects: firstEquipmentEffects,
                  resistances: secondResistances, type: firstType, opponentType: secondType, equipment: firstPlayer.equipment }
            ];

        // Execute attacks in order
        for (let i = 0; i < 2; i++) {
            const attacker = attackOrder[i];

            if (!attacker.canAct) continue;

            // Update HP values before attack
            if (attacker.player.id === firstPlayer.id) {
                attacker.currentHp = firstCurrentHp;
                attacker.opponentHp = secondCurrentHp;
            } else {
                attacker.currentHp = secondCurrentHp;
                attacker.opponentHp = firstCurrentHp;
            }

            if (attacker.opponentHp <= 0) break;

            const battleResult = await executeAttack(attacker, battleLog);

            // Update HP values after attack
            if (attacker.player.id === firstPlayer.id) {
                firstCurrentHp = attacker.currentHp;
                secondCurrentHp = attacker.opponentHp - battleResult.damage;
            } else {
                secondCurrentHp = attacker.currentHp;
                firstCurrentHp = attacker.opponentHp - battleResult.damage;
            }

            if (firstCurrentHp <= 0 || secondCurrentHp <= 0) break;
        }

        // Apply healing over time effects
        if (enhancedFirstPal.skillBonuses?.hpRegen && firstCurrentHp > 0) {
            const healing = Math.floor(enhancedFirstPal.stats.hp * enhancedFirstPal.skillBonuses.hpRegen);
            firstCurrentHp = Math.min(enhancedFirstPal.stats.hp, firstCurrentHp + healing);
            if (healing > 0) {
                battleLog.push(`💚 **Regeneration:** ${firstUser.displayName}'s **${firstPal.nickname}** recovers ${healing} HP!`);
            }
        }

        if (enhancedSecondPal.skillBonuses?.hpRegen && secondCurrentHp > 0) {
            const healing = Math.floor(enhancedSecondPal.stats.hp * enhancedSecondPal.skillBonuses.hpRegen);
            secondCurrentHp = Math.min(enhancedSecondPal.stats.hp, secondCurrentHp + healing);
            if (healing > 0) {
                battleLog.push(`💚 **Regeneration:** ${secondUser.displayName}'s **${secondPal.nickname}** recovers ${healing} HP!`);
            }
        }

        // Apply self-repair for mechanical pals
        if (enhancedFirstPal.skillBonuses?.selfRepair && firstCurrentHp > 0) {
            const repairAmount = Math.floor(enhancedFirstPal.stats.hp * enhancedFirstPal.skillBonuses.selfRepair);
            firstCurrentHp = Math.min(enhancedFirstPal.stats.hp, firstCurrentHp + repairAmount);
            if (repairAmount > 0) {
                battleLog.push(`🔧 **Self Repair:** ${firstUser.displayName}'s **${firstPal.nickname}** automatically repairs ${repairAmount} HP!`);
            }
        }

        if (enhancedSecondPal.skillBonuses?.selfRepair && secondCurrentHp > 0) {
            const repairAmount = Math.floor(enhancedSecondPal.stats.hp * enhancedSecondPal.skillBonuses.selfRepair);
            secondCurrentHp = Math.min(enhancedSecondPal.stats.hp, secondCurrentHp + repairAmount);
            if (repairAmount > 0) {
                battleLog.push(`🔧 **Self Repair:** ${secondUser.displayName}'s **${secondPal.nickname}** automatically repairs ${repairAmount} HP!`);
            }
        }

        battleLog.push("");
    }

    if (turn >= 50) {
        battleLog.push("⏱️ The battle lasted too long and ended in a draw!");
    }

    // Determine winner
    const winnerId = firstCurrentHp > 0 ? firstPlayer.id : secondPlayer.id;
    const winnerPal = firstCurrentHp > 0 ? firstPal : secondPal;
    const loserPal = firstCurrentHp > 0 ? secondPal : firstPal;
    const winnerRemainingHp = firstCurrentHp > 0 ? firstCurrentHp : secondCurrentHp;

    return {
        log: battleLog.join("\n"),
        winnerId,
        winnerPal,
        loserPal,
        winnerRemainingHp,
    };
}

async function executeAttack(attacker, battleLog) {
    const { 
        checkSkillActivation,
        processWeaponAbilities,
        processStatusInfliction,
        processEquipmentEffects,
        calculateDamage,
        computeHitChance
    } = require('../../utils/combat');

    // Check for hit/miss first
    const hitResult = computeHitChance(
        attacker.pal.stats,
        attacker.opponent.stats,
        attacker.pal.equipment,
        attacker.opponent.equipment
    );

    if (Math.random() > hitResult.hitChance) {
        battleLog.push(`💨 **${attacker.user.displayName}'s ${attacker.pal.nickname}**'s attack misses!`);
        return { damage: 0 };
    }

    // Check for dodge skills for defender
    const divineProtection = checkSkillActivation(attacker.opponent, "divine_protection");
    const dodgeSkill = checkSkillActivation(attacker.opponent, "dodge");

    let dodged = false;
    let damage = 0;

    if (divineProtection?.type === "divine_protection") {
        battleLog.push(divineProtection.message);
        battleLog.push(`> The attack is completely negated!`);
        dodged = true;

        // Check for heal on dodge from divine intervention
        if (attacker.opponent.skillBonuses?.healOnDodge) {
            const healing = Math.floor(attacker.opponent.stats.hp * 0.1);
            attacker.opponentHp = Math.min(attacker.opponent.stats.hp, attacker.opponentHp + healing);
            battleLog.push(`✨ **Divine Grace** restores ${healing} HP to ${attacker.opponent.nickname}!`);
        }
    } else if (dodgeSkill?.type === "dodge") {
        battleLog.push(dodgeSkill.message);
        battleLog.push(`> The attack misses!`);
        dodged = true;

        // Check for counter-attack
        const counterSkill = checkSkillActivation(attacker.opponent, "counter");
        if (counterSkill?.type === "counter") {
            const counterAttack = calculateDamage(
                attacker.opponent.stats,
                attacker.pal.stats,
                attacker.opponentType,
                attacker.type,
                attacker.resistances,
            );
            attacker.currentHp -= counterAttack.damage;
            battleLog.push(`${counterSkill.message}`);

            let counterMessage = `⚔️ Counter-attack deals **${counterAttack.damage}** damage!`;
            if (counterAttack.typeMultiplier > 1) {
                counterMessage += ` ✨ **Super effective!**`;
            } else if (counterAttack.typeMultiplier < 1) {
                counterMessage += ` 🛡️ *Not very effective...*`;
            }
            if (counterAttack.isCrit) {
                counterMessage += ` 💥 **Critical hit!**`;
            }
            if (counterAttack.resistanceApplied) {
                counterMessage += ` 🛡️ *Damage reduced by equipment resistance!*`;
            }
            battleLog.push(counterMessage);

            // Apply status effects from counter attack
            const counterStatusMessages = processStatusInfliction(
                attacker.opponent,
                attacker.pal,
                attacker.opponent.nickname,
            );
            battleLog.push(...counterStatusMessages);
        }
    }
    // Check for potion phase dodge
    else if (
        attacker.potionEffects.special?.ability === "phase_dodge" &&
        Math.random() < (attacker.potionEffects.special.chance || 0.25)
    ) {
        battleLog.push(`👻 **Phase Dodge!** ${attacker.opponent.nickname} phases through the attack!`);
        dodged = true;
    }

    if (!dodged) {
        // Check for skill activations
        const darkRitual = checkSkillActivation(attacker.pal, "dark_ritual", attacker.currentHp, attacker.pal.stats.hp);
        const lichTransform = checkSkillActivation(attacker.pal, "lich_transformation");
        const executeSkill = checkSkillActivation(attacker.pal, "execute", attacker.currentHp, attacker.pal.stats.hp);
        const overloadSkill = checkSkillActivation(attacker.pal, "overload");
        const multiAttack = checkSkillActivation(attacker.pal, "multiAttack");
        const chainReaction = checkSkillActivation(attacker.pal, "chainReaction");

        let damageMultiplier = 1;
        let attackCount = 1;

        if (darkRitual?.type === "dark_ritual") {
            attacker.currentHp -= darkRitual.sacrifice;
            damageMultiplier = darkRitual.multiplier;
            battleLog.push(`🩸 **Dark Ritual!** ${attacker.user.displayName}'s **${attacker.pal.nickname}** sacrifices ${darkRitual.sacrifice} HP for power!`);
        }

        if (lichTransform?.type === "lich_transformation") {
            damageMultiplier *= lichTransform.multiplier;
            battleLog.push(`💀 **Lich Transformation!** ${attacker.user.displayName}'s **${attacker.pal.nickname}** becomes empowered!`);
        }

        if (multiAttack?.type === "multiAttack") {
            attackCount = 2;
            battleLog.push(multiAttack.message);
        }

        let totalDamage = 0;

        for (let attackNum = 0; attackNum < attackCount; attackNum++) {
            let attack = calculateDamage(
                attacker.pal.stats,
                attacker.opponent.stats,
                attacker.type,
                attacker.opponentType,
                attacker.resistances,
            );
            let specialActivated = false;

            // Apply skill multipliers first
            if (executeSkill?.type === "execute") {
                attack.damage = Math.floor(attack.damage * executeSkill.multiplier);
                battleLog.push(`💀 **Apex Predator!** ${attacker.user.displayName}'s **${attacker.pal.nickname}** delivers a devastating blow!`);
                specialActivated = true;
            } else if (overloadSkill?.type === "overload") {
                attack.damage = Math.floor(attack.damage * overloadSkill.multiplier);
                battleLog.push(`⚡ **System Overload!** ${attacker.user.displayName}'s **${attacker.pal.nickname}**'s systems surge with power!`);
                specialActivated = true;

                if (chainReaction?.type === "chainReaction") {
                    attack.damage += chainReaction.damage;
                    battleLog.push(chainReaction.message);
                }
            }

            // Apply damage multiplier from dark ritual/lich form
            if (damageMultiplier > 1) {
                attack.damage = Math.floor(attack.damage * damageMultiplier);
            }

            // Apply equipment abilities if no skill was activated
            if (!specialActivated) {
                const weaponResult = processWeaponAbilities(
                    attacker.pal.stats,
                    attacker.equipmentEffects,
                    `${attacker.user.displayName}'s ${attacker.pal.nickname}`
                );

                if (weaponResult.activated) {
                    attack.damage += weaponResult.damage;
                    battleLog.push(...weaponResult.messages);
                    specialActivated = true;

                    // Apply status effects from weapons
                    if (weaponResult.statusEffects) {
                        weaponResult.statusEffects.forEach(effect => {
                            const { StatusEffectManager } = require('../../utils/statusEffects');
                            StatusEffectManager.applyStatusEffect(attacker.opponent, effect);
                        });
                    }
                }
            }

            // Process offensive equipment effects
            const { processOffensiveEquipmentEffects, processDefensiveEquipmentEffects } = require('../../utils/combat');
            const offensiveResult = processOffensiveEquipmentEffects(
                attacker.pal,
                attacker.equipmentEffects,
                `${attacker.user.displayName}'s ${attacker.pal.nickname}`
            );
            if (offensiveResult.messages.length > 0) {
                battleLog.push(...offensiveResult.messages);
            }
            attack.damage = Math.floor(attack.damage * offensiveResult.damageModifier);

            // Apply status effects from offensive equipment
            if (offensiveResult.statusEffects) {
                offensiveResult.statusEffects.forEach(effect => {
                    const { StatusEffectManager } = require('../../utils/statusEffects');
                    StatusEffectManager.applyStatusEffect(attacker.opponent, effect);
                });
            }

            // Process defensive equipment effects for the defender
            const { getEquipmentEffects } = require('../../utils/combat');
            const opponentEquipmentEffects = getEquipmentEffects(attacker.opponent.equipment);
            const defensiveResult = processDefensiveEquipmentEffects(
                attacker.opponent,
                opponentEquipmentEffects,
                attacker.opponent.nickname,
                attack.damage
            );
            if (defensiveResult.messages.length > 0) {
                battleLog.push(...defensiveResult.messages);
            }
            attack.damage = Math.max(1, attack.damage - defensiveResult.damageReduction);

            // Apply counter status effects from defensive equipment
            if (defensiveResult.statusEffects) {
                defensiveResult.statusEffects.forEach(effect => {
                    const { StatusEffectManager } = require('../../utils/statusEffects');
                    StatusEffectManager.applyStatusEffect(attacker.pal, effect);
                });
            }

            // Apply potion special abilities if no other special was activated
            if (attacker.potionEffects.special && !specialActivated) {
                const { ability, chance } = attacker.potionEffects.special;

                if (ability === "shadow_strike" && Math.random() < (chance || 0.3)) {
                    attack.damage *= 2;
                    battleLog.push(`🌑 **Shadow Strike!** ${attacker.user.displayName}'s **${attacker.pal.nickname}** attacks from the shadows!`);
                    specialActivated = true;
                } else if (ability === "phase_dodge" && Math.random() < (chance || 0.15)) {
                    battleLog.push(`👻 **Phase Shift!** ${attacker.user.displayName}'s **${attacker.pal.nickname}** attacks from another dimension!`);
                    attack.damage = Math.floor(attack.damage * 1.3);
                }
            }

            totalDamage += attack.damage;

            if (attackNum === 0 || attackCount === 1) {
                // Build attack message with type effectiveness and critical hit
                let attackMessage = `⚔️ ${attacker.user.displayName}'s **${attacker.pal.nickname}** attacks for **${attack.damage}** damage!`;
                if (attack.typeMultiplier > 1) {
                    attackMessage += ` ✨ **Super effective!** (${attacker.type} vs ${attacker.opponentType})`;
                } else if (attack.typeMultiplier < 1) {
                    attackMessage += ` 🛡️ *Not very effective...* (${attacker.type} vs ${attacker.opponentType})`;
                }
                if (attack.isCrit && !specialActivated) {
                    attackMessage += ` 💥 **Critical hit!**`;
                }
                if (attack.resistanceApplied) {
                    attackMessage += ` 🛡️ *Damage reduced by equipment resistance!*`;
                }

                if (!specialActivated) {
                    battleLog.push(attackMessage);
                } else {
                    battleLog.push(`⚔️ The enhanced attack deals **${attack.damage}** damage!`);
                    if (attack.typeMultiplier > 1) {
                        battleLog.push(`✨ **Super effective!** (${attacker.type} vs ${attacker.opponentType})`);
                    } else if (attack.typeMultiplier < 1) {
                        battleLog.push(`🛡️ *Not very effective...* (${attacker.type} vs ${attacker.opponentType})`);
                    }
                    if (attack.resistanceApplied) {
                        battleLog.push(`🛡️ *Damage reduced by equipment resistance!*`);
                    }
                }
            } else {
                battleLog.push(`⚔️ Follow-up attack deals **${attack.damage}** damage!`);
            }
        }

        // Apply damage reduction from equipment/skills
        if (attacker.opponent.skillBonuses?.damageReduction) {
            const originalDamage = totalDamage;
            totalDamage = Math.floor(totalDamage * (1 - attacker.opponent.skillBonuses.damageReduction));
            if (originalDamage !== totalDamage) {
                battleLog.push(`🛡️ **Armor Plating** reduces incoming damage by ${originalDamage - totalDamage}!`);
            }
        }

        // Apply lifesteal if available
        if (attacker.pal.skillBonuses?.lifesteal) {
            const healing = Math.floor(totalDamage * attacker.pal.skillBonuses.lifesteal);
            attacker.currentHp = Math.min(attacker.pal.stats.hp, attacker.currentHp + healing);
            battleLog.push(`💉 **Life Drain!** ${attacker.user.displayName}'s **${attacker.pal.nickname}** recovers ${healing} HP!`);
        }

        damage = totalDamage;

        // Process status effect infliction from skills
        const statusMessages = processStatusInfliction(
            attacker.pal,
            attacker.opponent,
            `${attacker.user.displayName}'s ${attacker.pal.nickname}`,
        );
        battleLog.push(...statusMessages);

        // Check for death resistance on opponent
        if (attacker.opponentHp - damage <= 0) {
            if (
                attacker.opponent.skillBonuses?.deathResistance &&
                Math.random() < attacker.opponent.skillBonuses.deathResistance
            ) {
                damage = attacker.opponentHp - 1; // Leave with 1 HP
                battleLog.push(`💀 **Undying Will!** ${attacker.opponent.nickname} refuses to fall!`);
            }
        }

        battleLog.push(`❤️ *${attacker.opponent.nickname}: ${Math.max(0, attacker.opponentHp - damage)}/${attacker.opponent.stats.hp} HP*`);
    }

    return { damage };
}