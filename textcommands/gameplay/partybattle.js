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
const { grantPalXp } = require("../../utils/leveling");

// Global party battle sessions
const partyBattleSessions = new Map();

module.exports = {
    name: "partybattle",
    description: "Challenge another player to a 3v3 Pal battle!",
    usage: "<@user> | add <pet_id> [pet_id2] [pet_id3] | remove <pet_id> | clear",
    aliases: ["pb", "3v3", "partyfight"],
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

            const subcommand = args[0]?.toLowerCase();

            if (subcommand === "add") {
                return await handlePartyPetAdd(
                    message,
                    args,
                    client,
                    prefix,
                    challengerId,
                );
            } else if (subcommand === "remove") {
                return await handlePartyPetRemove(
                    message,
                    args,
                    client,
                    prefix,
                    challengerId,
                );
            } else if (subcommand === "clear") {
                return await handlePartyClear(
                    message,
                    client,
                    prefix,
                    challengerId,
                );
            } else {
                const targetUser = message.mentions.users.first();
                if (!targetUser) {
                    return message.reply({
                        embeds: [
                            createErrorEmbed(
                                "Invalid Usage",
                                `Please use:\n` +
                                `• \`${prefix}partybattle @user\` - Challenge a player\n` +
                                `• \`${prefix}partybattle add <pet_id> [pet_id2] [pet_id3]\` - Add pets (up to 3)\n` +
                                `• \`${prefix}partybattle remove <pet_id>\` - Remove a pet\n` +
                                `• \`${prefix}partybattle clear\` - Clear your party`,
                            ),
                        ],
                    });
                }
                return await handlePartyBattleChallenge(
                    message,
                    targetUser,
                    client,
                    prefix,
                    challengerId,
                    challenger,
                );
            }
        } catch (error) {
            console.error("Party battle command error:", error);
            message.reply({
                embeds: [
                    createErrorEmbed(
                        "An Error Occurred",
                        "There was a problem processing the party battle command.",
                    ),
                ],
            });
        }
    },
};

async function handlePartyPetAdd(message, args, client, prefix, challengerId) {
    if (args.length < 2) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Invalid Usage",
                    `Please use: \`${prefix}partybattle add <pet_id> [pet_id2] [pet_id3]\``,
                ),
            ],
        });
    }

    const petIds = args.slice(1).filter(id => id.trim());
    
    if (petIds.length === 0) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "No Pet IDs",
                    "Please provide at least one valid pet ID.",
                ),
            ],
        });
    }

    if (petIds.length > 3) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Too Many Pets",
                    "You can only add up to 3 pets at once.",
                ),
            ],
        });
    }

    // Find active party battle session involving this player
    let battleSession = null;
    for (const [sessionId, session] of partyBattleSessions.entries()) {
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
                    "You are not in an active party battle. Use `partybattle @user` to challenge someone first.",
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

    const playerData = battleSession.challenger.id === challengerId 
        ? battleSession.challenger 
        : battleSession.opponent;

    // Check if adding these pets would exceed the limit
    if (playerData.pals.length + petIds.length > 3) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Party Would Be Full",
                    `Adding ${petIds.length} pets would exceed the 3-pet limit. You currently have ${playerData.pals.length} pets.`,
                ),
            ],
        });
    }

    const addedPets = [];
    const errors = [];
    const alreadyAdded = [];

    for (const petId of petIds) {
        // Validate pet
        const pal = await Pet.findOne({
            ownerId: challengerId,
            shortId: petId,
            status: "Idle",
        });

        if (!pal) {
            errors.push(`Pet ID "${petId}" not found or not idle`);
            continue;
        }

        // Check if pet is already added
        if (playerData.pals.find(p => p.petId === pal.petId)) {
            alreadyAdded.push(`${pal.nickname} (${petId})`);
            continue;
        }

        playerData.pals.push(pal);
        addedPets.push(pal);
    }

    // Build response message
    let responseMessage = "";
    
    if (addedPets.length > 0) {
        const petsList = addedPets.map(p => `**${p.nickname}** (Lv.${p.level})`).join(", ");
        responseMessage += `✅ Added to party: ${petsList}\n`;
    }

    if (alreadyAdded.length > 0) {
        responseMessage += `⚠️ Already in party: ${alreadyAdded.join(", ")}\n`;
    }

    if (errors.length > 0) {
        responseMessage += `❌ Errors: ${errors.join(", ")}\n`;
    }

    responseMessage += `\n**Party Status:** ${playerData.pals.length}/3 pets`;

    const embedType = addedPets.length > 0 ? "success" : "warning";
    const title = addedPets.length > 0 ? "Pets Added to Party!" : "Party Update";

    const responseEmbed = embedType === "success" 
        ? createSuccessEmbed(title, responseMessage)
        : createWarningEmbed(title, responseMessage);

    await message.reply({ embeds: [responseEmbed] });

    // Check if both players have selected 3 pets
    if (battleSession.challenger.pals.length === 3 && battleSession.opponent.pals.length === 3) {
        battleSession.status = "potion_selection";
        await sendPartyPotionSelectionMessage(message, battleSession, client);
    }
}

async function handlePartyPetRemove(message, args, client, prefix, challengerId) {
    if (args.length < 2) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Invalid Usage",
                    `Please use: \`${prefix}partybattle remove <pet_id>\``,
                ),
            ],
        });
    }

    const petId = args[1];

    // Find active party battle session involving this player
    let battleSession = null;
    for (const [sessionId, session] of partyBattleSessions.entries()) {
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
                    "You are not in an active party battle.",
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

    const playerData = battleSession.challenger.id === challengerId 
        ? battleSession.challenger 
        : battleSession.opponent;

    const petIndex = playerData.pals.findIndex(p => p.shortId === petId);
    
    if (petIndex === -1) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Pet Not Found",
                    "That pet is not in your current party.",
                ),
            ],
        });
    }

    const removedPet = playerData.pals.splice(petIndex, 1)[0];

    const successEmbed = createSuccessEmbed(
        "Pet Removed!",
        `**${removedPet.nickname}** has been removed from your party.\n\n**Party Status:** ${playerData.pals.length}/3 pets`,
    );
    await message.reply({ embeds: [successEmbed] });
}

async function handlePartyClear(message, client, prefix, challengerId) {
    // Find active party battle session involving this player
    let battleSession = null;
    for (const [sessionId, session] of partyBattleSessions.entries()) {
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
                    "You are not in an active party battle.",
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

    const playerData = battleSession.challenger.id === challengerId 
        ? battleSession.challenger 
        : battleSession.opponent;

    playerData.pals = [];

    const successEmbed = createSuccessEmbed(
        "Party Cleared!",
        "All pets have been removed from your party.",
    );
    await message.reply({ embeds: [successEmbed] });
}

async function handlePartyBattleChallenge(
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

    // Check if both players have at least 3 idle Pals
    const challengerPals = await Pet.find({
        ownerId: challengerId,
        status: "Idle",
    });
    const opponentPals = await Pet.find({
        ownerId: targetUser.id,
        status: "Idle",
    });

    if (challengerPals.length < 3) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Not Enough Pals",
                    "You need at least 3 idle Pals for a party battle!",
                ),
            ],
        });
    }

    if (opponentPals.length < 3) {
        return message.reply({
            embeds: [
                createErrorEmbed(
                    "Opponent Not Ready",
                    "Your opponent needs at least 3 idle Pals for a party battle!",
                ),
            ],
        });
    }

    // Create battle invitation embed
    const inviteEmbed = createCustomEmbed(
        "⚔️ Party Battle Challenge!",
        `**${message.author.displayName}** has challenged **${targetUser.displayName}** to a 3v3 Pal party battle!\n\n` +
            `${targetUser.displayName}, do you accept this challenge?\n\n` +
            `*After accepting, both players need to add 3 pets using:*\n` +
            `• \`${prefix}partybattle add <pet_id>\` - Add one pet\n` +
            `• \`${prefix}partybattle add <id1> <id2> <id3>\` - Add multiple pets\n` +
            `• \`${prefix}partybattle remove <pet_id>\` - Remove a pet\n` +
            `• \`${prefix}partybattle clear\` - Clear party`,
        "#FF6B6B",
        {
            footer: { text: "Challenge expires in 60 seconds" },
            timestamp: true,
        },
    );

    const inviteButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("accept_party_battle")
            .setLabel("Accept Challenge")
            .setStyle(ButtonStyle.Success)
            .setEmoji("⚔️"),
        new ButtonBuilder()
            .setCustomId("decline_party_battle")
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
        if (interaction.customId === "decline_party_battle") {
            const declineEmbed = createWarningEmbed(
                "Challenge Declined",
                `${targetUser.displayName} has declined the party battle challenge.`,
            );
            await interaction.update({
                embeds: [declineEmbed],
                components: [],
            });
            return;
        }

        if (interaction.customId === "accept_party_battle") {
            // Create party battle session
            const sessionId = `party_${challengerId}_${targetUser.id}_${Date.now()}`;
            const battleSession = {
                id: sessionId,
                challenger: {
                    id: challengerId,
                    pals: [],
                    potion: null,
                    ready: false,
                },
                opponent: {
                    id: targetUser.id,
                    pals: [],
                    potion: null,
                    ready: false,
                },
                status: "pet_selection",
                channelId: message.channel.id,
            };

            partyBattleSessions.set(sessionId, battleSession);

            const acceptEmbed = createSuccessEmbed(
                "Party Battle Challenge Accepted!",
                `${targetUser.displayName} has accepted the challenge!\n\n` +
                    `**Both players need to add 3 pets:**\n` +
                    `• \`${prefix}partybattle add <pet_id>\` - Add one pet\n` +
                    `• \`${prefix}partybattle add <id1> <id2> <id3>\` - Add multiple pets\n` +
                    `• \`${prefix}partybattle remove <pet_id>\` - Remove a pet\n` +
                    `• \`${prefix}partybattle clear\` - Clear party\n\n` +
                    `*You have 5 minutes to select your party.*`,
            );
            await interaction.update({ embeds: [acceptEmbed], components: [] });

            // Set timeout to cleanup battle session
            setTimeout(
                () => {
                    if (partyBattleSessions.has(sessionId)) {
                        partyBattleSessions.delete(sessionId);
                    }
                },
                5 * 60 * 1000,
            );
        }
    });

    inviteCollector.on("end", (collected) => {
        if (collected.size === 0) {
            const timeoutEmbed = createWarningEmbed(
                "Challenge Expired",
                "The party battle challenge has expired due to no response.",
            );
            inviteMessage
                .edit({ embeds: [timeoutEmbed], components: [] })
                .catch(() => {});
        }
    });
}

async function sendPartyPotionSelectionMessage(message, battleSession, client) {
    const challengerUser = await client.users.fetch(battleSession.challenger.id);
    const opponentUser = await client.users.fetch(battleSession.opponent.id);

    const challengerParty = battleSession.challenger.pals.map((p, i) => `${i+1}. **${p.nickname}** (Lv.${p.level})`).join('\n');
    const opponentParty = battleSession.opponent.pals.map((p, i) => `${i+1}. **${p.nickname}** (Lv.${p.level})`).join('\n');

    const selectionEmbed = createCustomEmbed(
        "🧪 Party Battle - Potion Selection Phase",
        `Both players have selected their party!\n\n` +
            `**${challengerUser.displayName}'s Party:**\n${challengerParty}\n\n` +
            `**${opponentUser.displayName}'s Party:**\n${opponentParty}\n\n` +
            `Now select your battle potions (optional) and click Ready!`,
        "#4ECDC4",
    );

    // Send potion selection to both players
    await sendPartyPotionMessage(message, battleSession.challenger.id, battleSession, client, true);
    await sendPartyPotionMessage(message, battleSession.opponent.id, battleSession, client, false);

    await message.channel.send({ embeds: [selectionEmbed] });
}

async function sendPartyPotionMessage(message, userId, battleSession, client, isChallenger) {
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

    const playerData = isChallenger ? battleSession.challenger : battleSession.opponent;
    const preparationEmbed = createCustomEmbed(
        "⚔️ Party Battle Preparation",
        `Your party is assembled and ready for battle!\n` +
            `Select a battle potion to enhance your Pals' abilities.\n\n` +
            `**Your Party:**\n${playerData.pals.map((p, i) => `${i+1}. **${p.nickname}** (Lv.${p.level})`).join('\n')}\n\n` +
            `**Available Battle Potions:** ${potions.length}`,
        "#4ECDC4",
    );

    const components = [];

    if (potionOptions.length > 1) {
        const potionSelect = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`select_party_battle_potion_${userId}`)
                .setPlaceholder("Choose a battle potion (optional)")
                .addOptions(potionOptions),
        );
        components.push(potionSelect);
    }

    const readyButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ready_for_party_battle_${userId}`)
            .setLabel("Ready for Party Battle!")
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
    const preparationCollector = preparationMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === userId,
        time: 5 * 60 * 1000,
    });

    preparationCollector.on("collect", async (interaction) => {
        if (interaction.customId === `select_party_battle_potion_${userId}`) {
            const selectedPotionId = interaction.values[0];
            const [itemId] = selectedPotionId.split("_");
            const selectedPotion = selectedPotionId === "none" ? null : allItems[itemId];

            if (isChallenger) {
                battleSession.challenger.potion = selectedPotion;
            } else {
                battleSession.opponent.potion = selectedPotion;
            }

            const potionName = selectedPotion ? selectedPotion.name : "No Potion";
            await interaction.reply({
                content: `✅ Selected **${potionName}** for party battle!`,
                ephemeral: true,
            });
        }

        if (interaction.customId === `ready_for_party_battle_${userId}`) {
            if (isChallenger) {
                battleSession.challenger.ready = true;
            } else {
                battleSession.opponent.ready = true;
            }

            await interaction.update({
                components: interaction.message.components.map((row) => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach((component) => {
                        if (component.data.custom_id === `ready_for_party_battle_${userId}`) {
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
            if (battleSession.challenger.ready && battleSession.opponent.ready) {
                await startEnhancedPartyBattle(message, battleSession, client);
                partyBattleSessions.delete(battleSession.id);
            }
        }
    });

    preparationCollector.on("end", () => {
        preparationMessage.edit({ components: [] }).catch(() => {});
    });
}

async function startEnhancedPartyBattle(message, battleSession, client) {
    const { challenger, opponent } = battleSession;
    const challengerUser = await client.users.fetch(challenger.id);
    const opponentUser = await client.users.fetch(opponent.id);

    // Initialize enhanced battle state
    let challengerActiveIndex = 0;
    let opponentActiveIndex = 0;
    const battleLog = [];
    
    battleLog.push(`🎯 **${challengerUser.displayName}** vs **${opponentUser.displayName}** - 3v3 Party Battle begins!`);
    
    // Show party compositions
    battleLog.push(`\n**${challengerUser.displayName}'s Party:**`);
    challenger.pals.forEach((pal, i) => {
        const palData = allPals[pal.basePetId];
        const type = palData?.type || "Beast";
        battleLog.push(`${i+1}. **${pal.nickname}** (Lv.${pal.level}) - ${type}`);
    });
    
    battleLog.push(`\n**${opponentUser.displayName}'s Party:**`);
    opponent.pals.forEach((pal, i) => {
        const palData = allPals[pal.basePetId];
        const type = palData?.type || "Beast";
        battleLog.push(`${i+1}. **${pal.nickname}** (Lv.${pal.level}) - ${type}`);
    });
    
    if (challenger.potion) {
        battleLog.push(`\n💉 **${challengerUser.displayName}** uses **${challenger.potion.name}**!`);
    }
    if (opponent.potion) {
        battleLog.push(`💉 **${opponentUser.displayName}** uses **${opponent.potion.name}**!`);
    }
    
    battleLog.push(`\n**First Battle:** ${challenger.pals[0].nickname} vs ${opponent.pals[0].nickname}`);
    battleLog.push("");

    while (challengerActiveIndex < 3 && opponentActiveIndex < 3) {
        const challengerPal = challenger.pals[challengerActiveIndex];
        const opponentPal = opponent.pals[opponentActiveIndex];

        // Apply potion effects to both pals
        let enhancedChallengerPal = applyPotionEffects(challengerPal, challenger.potion);
        let enhancedOpponentPal = applyPotionEffects(opponentPal, opponent.potion);

        const challengerPalData = allPals[challengerPal.basePetId];
        const opponentPalData = allPals[opponentPal.basePetId];
        const challengerType = challengerPalData?.type || "Beast";
        const opponentType = opponentPalData?.type || "Beast";

        // Apply pack leader bonus for beast types
        const { applyPackLeaderBonus } = require('../../utils/combat');
        const challengerBeastCount = challenger.pals.filter(p => {
            const palData = allPals[p.basePetId];
            return palData?.type === "Beast";
        }).length;
        const opponentBeastCount = opponent.pals.filter(p => {
            const palData = allPals[p.basePetId];
            return palData?.type === "Beast";
        }).length;

        if (challengerPalData?.type === "Beast" && challengerBeastCount > 1) {
            enhancedChallengerPal = applyPackLeaderBonus(enhancedChallengerPal, challengerBeastCount);
        }
        if (opponentPalData?.type === "Beast" && opponentBeastCount > 1) {
            enhancedOpponentPal = applyPackLeaderBonus(enhancedOpponentPal, opponentBeastCount);
        }

        // Get potion effects for special abilities
        const challengerPotionEffects = getPotionEffects(challenger.potion);
        const opponentPotionEffects = getPotionEffects(opponent.potion);

        // Get equipment effects
        const challengerEquipmentEffects = getEquipmentEffects(enhancedChallengerPal.equipment);
        const opponentEquipmentEffects = getEquipmentEffects(enhancedOpponentPal.equipment);

        // Get skill trees
        const challengerSkillTree = await SkillTree.findOne({ palId: challengerPal.petId }) || 
            new SkillTree({ palId: challengerPal.petId, skillPoints: 0, unlockedSkills: [] });
        const opponentSkillTree = await SkillTree.findOne({ palId: opponentPal.petId }) || 
            new SkillTree({ palId: opponentPal.petId, skillPoints: 0, unlockedSkills: [] });

        // Get pal types
        

        // Create player objects for battle simulation
        const challengerPlayer = { id: challenger.id, potion: challenger.potion, pal: enhancedChallengerPal, equipment: enhancedChallengerPal.equipment };
        const opponentPlayer = { id: opponent.id, potion: opponent.potion, pal: enhancedOpponentPal, equipment: enhancedOpponentPal.equipment };

        // Simulate enhanced battle between current active pets
        const result = await simulateEnhancedPvPBattle(
            challengerPlayer,
            opponentPlayer,
            enhancedChallengerPal,
            enhancedOpponentPal,
            challengerPotionEffects,
            opponentPotionEffects,
            challengerEquipmentEffects,
            opponentEquipmentEffects,
            challengerSkillTree,
            opponentSkillTree,
            challengerType,
            opponentType,
            client,
        );

        battleLog.push(result.log);
        battleLog.push("");

        // Determine winner and advance
        if (result.winnerId === challenger.id) {
            // Challenger won this round
            battleLog.push(`🏆 **${challengerPal.nickname}** defeats **${opponentPal.nickname}**!`);
            
            // Grant XP to winner
            await grantPalXp(client, message, challengerPal, 75);
            
            opponentActiveIndex++;
            if (opponentActiveIndex < 3) {
                battleLog.push(`**${opponentUser.displayName}** sends out **${opponent.pals[opponentActiveIndex].nickname}**!`);
                battleLog.push("");
            }
        } else {
            // Opponent won this round
            battleLog.push(`🏆 **${opponentPal.nickname}** defeats **${challengerPal.nickname}**!`);
            
            // Grant XP to winner
            await grantPalXp(client, message, opponentPal, 75);
            
            challengerActiveIndex++;
            if (challengerActiveIndex < 3) {
                battleLog.push(`**${challengerUser.displayName}** sends out **${challenger.pals[challengerActiveIndex].nickname}**!`);
                battleLog.push("");
            }
        }
    }

    // Determine overall winner
    const overallWinner = challengerActiveIndex < 3 ? challengerUser : opponentUser;
    const overallLoser = challengerActiveIndex < 3 ? opponentUser : challengerUser;
    const remainingPets = challengerActiveIndex < 3 ? 3 - challengerActiveIndex : 3 - opponentActiveIndex;
    
    battleLog.push(`🎉 **${overallWinner.displayName}** wins the party battle!`);
    battleLog.push(`💪 Victory achieved with ${remainingPets} pet${remainingPets !== 1 ? 's' : ''} remaining!`);

    // Split battle log and send results
    const logs = splitBattleLog(battleLog.join('\n'));
    
    for (let i = 0; i < logs.length; i++) {
        const color = overallWinner.id === challenger.id ? "#4CAF50" : "#F44336";
        const title = i === 0 ? "⚔️ Party Battle Results" : `⚔️ Party Battle Results (${i + 1}/${logs.length})`;

        const resultEmbed = createCustomEmbed(title, logs[i], color);

        if (i === logs.length - 1) {
            resultEmbed.addFields([
                {
                    name: "🏆 Victory",
                    value: `**${overallWinner.displayName}** wins the 3v3 party battle!`,
                    inline: false,
                },
                {
                    name: "📊 Final Score",
                    value: challengerActiveIndex < 3 
                        ? `**${challengerUser.displayName}**: ${3 - challengerActiveIndex} pets remaining\n**${opponentUser.displayName}**: 0 pets remaining`
                        : `**${challengerUser.displayName}**: 0 pets remaining\n**${opponentUser.displayName}**: ${3 - opponentActiveIndex} pets remaining`,
                    inline: false,
                }
            ]);
        }

        await message.channel.send({ embeds: [resultEmbed] });

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

    const enhancedPal = JSON.parse(JSON.stringify(pal)); // Use JSON.parse(JSON.stringify(pal)) to deep copy
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

function getEquipmentEffects(equipment) {
    const effects = {};

    if (equipment) {
        Object.values(equipment).forEach((equipmentId) => {
            if (equipmentId && allItems[equipmentId]) {
                const item = allItems[equipmentId];
                if (item.special) {
                    effects[item.special] = true;
                }
                // Also check for nested stats.special
                if (item.stats?.special) {
                    effects[item.stats.special] = true;
                }

                // Handle resistance effects
                if (item.fire_resist) effects.fire_resistance = item.fire_resist;
                if (item.ice_resist) effects.ice_resistance = item.ice_resist;
                if (item.storm_resist) effects.storm_resistance = item.storm_resist;
                if (item.wind_resist) effects.wind_resistance = item.wind_resist;
                if (item.physical_resist) effects.physical_resistance = item.physical_resist;

                // Handle damage bonuses
                if (item.fire_damage) effects.fire_damage = item.fire_damage;
                if (item.ice_damage) effects.ice_damage = item.ice_damage;
                if (item.storm_damage) effects.storm_damage = item.storm_damage;

                // Handle special combat effects
                if (item.stats?.dodge) effects.dodge_bonus = item.stats.dodge;
                if (item.dodge) effects.dodge_bonus = item.dodge;
                if (item.stats?.crit) effects.crit_bonus = item.stats.crit;
                if (item.crit) effects.crit_bonus = item.crit;
                if (item.stats?.accuracy) effects.accuracy_bonus = item.stats.accuracy;
                if (item.accuracy) effects.accuracy_bonus = item.accuracy;
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

    // Determine turn order based on speed
    const challengerSpeed = enhancedFirstPal.stats.spd;
    const opponentSpeed = enhancedSecondPal.stats.spd;

    let turnOrder = challengerSpeed >= opponentSpeed ? "first" : "second";
    if (challengerSpeed === opponentSpeed && Math.random() < 0.5) {
        turnOrder = turnOrder === "first" ? "second" : "first";
    }

    battleLog.push(`🎯 **${turnOrder === "first" ? firstUser.displayName : secondUser.displayName}'s ${turnOrder === "first" ? firstPal.nickname : secondPal.nickname}** goes first due to ${challengerSpeed === opponentSpeed ? "coin flip" : "higher speed"}!`);

    // Show active effects
    if (firstPlayer.potion) {
        battleLog.push(`💉 **${firstUser.displayName}'s ${firstPal.nickname}** is enhanced by **${firstPlayer.potion.name}**!`);
    }
    if (secondPlayer.potion) {
        battleLog.push(`💉 **${secondUser.displayName}'s ${secondPal.nickname}** is enhanced by **${secondPlayer.potion.name}**!`);
    }

    // Show skill tree info
    if (firstSkillTree && firstSkillTree.unlockedSkills.length > 0) {
        battleLog.push(`🎯 **${firstUser.displayName}'s ${firstPal.nickname}** enters battle with ${firstSkillTree.unlockedSkills.length} active skills!`);
    }
    if (secondSkillTree && secondSkillTree.unlockedSkills.length > 0) {
        battleLog.push(`🎯 **${secondUser.displayName}'s ${secondPal.nickname}** enters battle with ${secondSkillTree.unlockedSkills.length} active skills!`);
    }

    battleLog.push("");

    while (firstCurrentHp > 0 && secondCurrentHp > 0 && turn < 30) {
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

        // Determine who attacks first this turn
        const attackOrder = turnOrder === "first" ? 
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

            // Update current HP values
            if (attacker.player.id === firstPlayer.id) {
                attacker.currentHp = firstCurrentHp;
                attacker.opponentHp = secondCurrentHp;
            } else {
                attacker.currentHp = secondCurrentHp;
                attacker.opponentHp = firstCurrentHp;
            }

            if (attacker.opponentHp <= 0) break;

            const battleResult = await executeAttack(attacker, battleLog);
            
            // Update HP values
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

    if (turn >= 30) {
        battleLog.push("⏱️ The battle lasted too long and ended in a draw!");
        // Default to first player in case of draw
        return {
            log: battleLog.join("\n"),
            winnerId: firstPlayer.id,
            winnerPal: firstPal,
            loserPal: secondPal,
            winnerRemainingHp: firstCurrentHp,
        };
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
            const { processOffensiveEquipmentEffects, processDefensiveEquipmentEffects, getEquipmentEffects } = require('../../utils/combat');
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
            // Check for revive ability from equipment
            else if (attacker.opponent.equipment && getEquipmentEffects(attacker.opponent.equipment).revive_once) {
                // This would be handled in the main battle loop
            }
            // Check for skill-based revival
            else if (attacker.opponent.skillBonuses?.reviveChance && Math.random() < attacker.opponent.skillBonuses.reviveChance) {
                // This would be handled in the main battle loop
            }
        }

        battleLog.push(`❤️ *${attacker.opponent.nickname}: ${Math.max(0, attacker.opponentHp - damage)}/${attacker.opponent.stats.hp} HP*`);
    }

    return { damage };
}