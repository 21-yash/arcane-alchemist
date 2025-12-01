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
const GameData = require("../../utils/gameData");
const { grantPalXp } = require("../../utils/leveling");
const {
    CombatEngine,
    StatManager,
    EquipmentManager,
    TypeAdvantage,
    SkillManager,
    TurnOrderManager,
    COMBAT_CONFIG,
    Utils
} = require("../../utils/combat");
const { StatusEffectManager } = require("../../utils/statusEffects");

// Global party battle sessions
const partyBattleSessions = new Map();

// Configuration constants
const PARTY_BATTLE_CONFIG = {
    MAX_PETS: 3,
    PREPARATION_TIME: 5 * 60 * 1000,
    CHALLENGE_TIMEOUT: 60000,
    XP_REWARD: 75,
    AREA_DAMAGE_MULTIPLIER: 0.1,
};

module.exports = {
    name: "partybattle",
    description: "Challenge another player to a 3v3 Pal battle with true PvP mechanics!",
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

            switch (subcommand) {
                case "add":
                    return await this.handlePartyPetAdd(message, args, client, prefix, challengerId);
                case "remove":
                    return await this.handlePartyPetRemove(message, args, client, prefix, challengerId);
                case "clear":
                    return await this.handlePartyClear(message, client, prefix, challengerId);
                default:
                    const targetUser = message.mentions.users.first();
                    if (!targetUser) {
                        return message.reply({
                            embeds: [
                                createErrorEmbed(
                                    "Invalid Usage",
                                    `Please use:\n` +
                                    `• \`${prefix}partybattle @user\` - Challenge a player\n` +
                                    `• \`${prefix}partybattle add <pet_id> [pet_id2] [pet_id3]\` - Add pets\n` +
                                    `• \`${prefix}partybattle remove <pet_id>\` - Remove a pet\n` +
                                    `• \`${prefix}partybattle clear\` - Clear your party`,
                                ),
                            ],
                        });
                    }
                    return await this.handlePartyBattleChallenge(
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
                        "There was a problem processing the party battle command. Please try again.",
                    ),
                ],
            });
        }
    },

    async handlePartyPetAdd(message, args, client, prefix, challengerId) {
        try {
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

            const petIds = args.slice(1).filter(id => id?.trim()).slice(0, PARTY_BATTLE_CONFIG.MAX_PETS);
            
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

            const battleSession = this.findPlayerBattleSession(challengerId);
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

            if (playerData.pals.length + petIds.length > PARTY_BATTLE_CONFIG.MAX_PETS) {
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "Party Would Be Full",
                            `Adding ${petIds.length} pets would exceed the ${PARTY_BATTLE_CONFIG.MAX_PETS}-pet limit. You currently have ${playerData.pals.length} pets.`,
                        ),
                    ],
                });
            }

            const result = await this.processPetAdditions(challengerId, petIds, playerData);
            await this.sendPetAdditionResponse(message, result);

            // Check if both parties are full
            if (battleSession.challenger.pals.length === PARTY_BATTLE_CONFIG.MAX_PETS && 
                battleSession.opponent.pals.length === PARTY_BATTLE_CONFIG.MAX_PETS) {
                battleSession.status = "ready_check";
                await this.sendReadyConfirmation(message, battleSession, client);
            }
        } catch (error) {
            console.error("Error handling party pet addition:", error);
            message.reply({
                embeds: [createErrorEmbed("Error", "Failed to add pets to party. Please try again.")],
            });
        }
    },

    async processPetAdditions(challengerId, petIds, playerData) {
        const addedPets = [];
        const errors = [];
        const alreadyAdded = [];

        for (const petId of petIds) {
            try {
                const pal = await Pet.findOne({
                    ownerId: challengerId,
                    shortId: petId,
                    status: "Idle",
                });

                if (!pal) {
                    errors.push(`Pet ID "${petId}" not found or not idle`);
                    continue;
                }

                if (playerData.pals.find(p => p.petId === pal.petId)) {
                    alreadyAdded.push(`${pal.nickname} (${petId})`);
                    continue;
                }

                const enhancedPal = StatManager.cloneCreature(pal);
                playerData.pals.push(enhancedPal);
                addedPets.push(enhancedPal);
            } catch (error) {
                console.error(`Error processing pet ${petId}:`, error);
                errors.push(`Failed to process pet "${petId}"`);
            }
        }

        return { addedPets, errors, alreadyAdded };
    },

    async sendPetAdditionResponse(message, result) {
        const { addedPets, errors, alreadyAdded } = result;
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

        const battleSession = this.findPlayerBattleSession(message.author.id);
        const playerData = battleSession.challenger.id === message.author.id 
            ? battleSession.challenger 
            : battleSession.opponent;
        
        const actualPartySize = playerData.pals.length;
        responseMessage += `\n**Party Status:** ${actualPartySize}/${PARTY_BATTLE_CONFIG.MAX_PETS} pets`;

        const embedType = addedPets.length > 0 ? "success" : "warning";
        const title = addedPets.length > 0 ? "Pets Added to Party!" : "Party Update";

        const responseEmbed = embedType === "success" 
            ? createSuccessEmbed(title, responseMessage)
            : createWarningEmbed(title, responseMessage);

        await message.reply({ embeds: [responseEmbed] });
    },

    async handlePartyPetRemove(message, args, client, prefix, challengerId) {
        try {
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
            const battleSession = this.findPlayerBattleSession(challengerId);

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
                `**${removedPet.nickname}** has been removed from your party.\n\n**Party Status:** ${playerData.pals.length}/${PARTY_BATTLE_CONFIG.MAX_PETS} pets`,
            );
            await message.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error("Error handling party pet removal:", error);
            message.reply({
                embeds: [createErrorEmbed("Error", "Failed to remove pet from party.")],
            });
        }
    },

    async handlePartyClear(message, client, prefix, challengerId) {
        try {
            const battleSession = this.findPlayerBattleSession(challengerId);

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
        } catch (error) {
            console.error("Error handling party clear:", error);
            message.reply({
                embeds: [createErrorEmbed("Error", "Failed to clear party.")],
            });
        }
    },

    async handlePartyBattleChallenge(message, targetUser, client, prefix, challengerId, challenger) {
        try {
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

            const validationResult = await this.validatePlayersForBattle(challengerId, targetUser.id);
            if (!validationResult.valid) {
                return message.reply({
                    embeds: [createErrorEmbed("Cannot Start Battle", validationResult.reason)],
                });
            }

            await this.sendBattleInvitation(message, targetUser, client, prefix, challengerId);
        } catch (error) {
            console.error("Error handling party battle challenge:", error);
            message.reply({
                embeds: [createErrorEmbed("Error", "Failed to create battle challenge.")],
            });
        }
    },

    async validatePlayersForBattle(challengerId, opponentId) {
        try {
            const challengerPals = await Pet.find({ ownerId: challengerId, status: "Idle" });
            const opponentPals = await Pet.find({ ownerId: opponentId, status: "Idle" });

            if (challengerPals.length < PARTY_BATTLE_CONFIG.MAX_PETS) {
                return {
                    valid: false,
                    reason: `You need at least ${PARTY_BATTLE_CONFIG.MAX_PETS} idle Pals for a party battle!`,
                };
            }

            if (opponentPals.length < PARTY_BATTLE_CONFIG.MAX_PETS) {
                return {
                    valid: false,
                    reason: `Your opponent needs at least ${PARTY_BATTLE_CONFIG.MAX_PETS} idle Pals for a party battle!`,
                };
            }

            return { valid: true };
        } catch (error) {
            console.error("Error validating players for battle:", error);
            return { valid: false, reason: "Failed to validate player requirements." };
        }
    },

    async sendBattleInvitation(message, targetUser, client, prefix, challengerId) {
        const inviteEmbed = createCustomEmbed(
            "⚔️ 3v3 Party Battle Challenge!",
            `**${message.author.displayName}** has challenged **${targetUser.displayName}** to a ${PARTY_BATTLE_CONFIG.MAX_PETS}v${PARTY_BATTLE_CONFIG.MAX_PETS} party battle!\n\n` +
                `${targetUser.displayName}, do you accept this challenge?\n\n` +
                `*After accepting, both players add ${PARTY_BATTLE_CONFIG.MAX_PETS} pets using:*\n` +
                `• \`${prefix}partybattle add <pet_id>\`\n` +
                `• \`${prefix}partybattle add <id1> <id2> <id3>\``,
            "#FF6B6B",
            {
                footer: { text: `Challenge expires in ${PARTY_BATTLE_CONFIG.CHALLENGE_TIMEOUT / 1000} seconds` },
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

        this.handleBattleInvitationResponse(inviteMessage, targetUser, challengerId, message, client, prefix);
    },

    handleBattleInvitationResponse(inviteMessage, targetUser, challengerId, originalMessage, client, prefix) {
        const inviteCollector = inviteMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === targetUser.id,
            time: PARTY_BATTLE_CONFIG.CHALLENGE_TIMEOUT,
            componentType: ComponentType.Button,
        });

        inviteCollector.on("collect", async (interaction) => {
            try {
                if (interaction.customId === "decline_party_battle") {
                    const declineEmbed = createWarningEmbed(
                        "Challenge Declined",
                        `${targetUser.displayName} has declined the party battle challenge.`,
                    );
                    await interaction.update({ embeds: [declineEmbed], components: [] });
                    return;
                }

                if (interaction.customId === "accept_party_battle") {
                    const battleSession = this.createBattleSession(challengerId, targetUser.id, originalMessage.channel.id);
                    partyBattleSessions.set(battleSession.id, battleSession);

                    const acceptEmbed = createSuccessEmbed(
                        "Challenge Accepted!",
                        `${targetUser.displayName} has accepted the challenge!\n\n` +
                            `**Both players add ${PARTY_BATTLE_CONFIG.MAX_PETS} pets:**\n` +
                            `• \`${prefix}partybattle add <pet_id>\`\n` +
                            `• \`${prefix}partybattle add <id1> <id2> <id3>\`\n\n` +
                            `*You have ${PARTY_BATTLE_CONFIG.PREPARATION_TIME / 60000} minutes to select your party.*`,
                    );
                    await interaction.update({ embeds: [acceptEmbed], components: [] });

                    setTimeout(() => {
                        if (partyBattleSessions.has(battleSession.id)) {
                            partyBattleSessions.delete(battleSession.id);
                        }
                    }, PARTY_BATTLE_CONFIG.PREPARATION_TIME);
                }
            } catch (error) {
                console.error("Error handling battle invitation response:", error);
                await interaction.reply({
                    content: "An error occurred while processing your response.",
                    ephemeral: true,
                });
            }
        });

        inviteCollector.on("end", (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = createWarningEmbed(
                    "Challenge Expired",
                    "The party battle challenge has expired due to no response.",
                );
                inviteMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    },

    createBattleSession(challengerId, opponentId, channelId) {
        const sessionId = `party_${challengerId}_${opponentId}_${Date.now()}`;
        return {
            id: sessionId,
            challenger: {
                id: challengerId,
                pals: [],
                ready: false,
            },
            opponent: {
                id: opponentId,
                pals: [],
                ready: false,
            },
            status: "pet_selection",
            channelId: channelId,
            createdAt: Date.now(),
        };
    },

    findPlayerBattleSession(playerId) {
        for (const [sessionId, session] of partyBattleSessions.entries()) {
            if (session.challenger.id === playerId || session.opponent.id === playerId) {
                return session;
            }
        }
        return null;
    },

    async sendReadyConfirmation(message, battleSession, client) {
        try {
            const challengerUser = await client.users.fetch(battleSession.challenger.id);
            const opponentUser = await client.users.fetch(battleSession.opponent.id);

            const challengerParty = battleSession.challenger.pals
                .map((p, i) => `${i+1}. **${p.nickname}** (Lv.${p.level})`)
                .join('\n');
            const opponentParty = battleSession.opponent.pals
                .map((p, i) => `${i+1}. **${p.nickname}** (Lv.${p.level})`)
                .join('\n');

            const readyEmbed = createCustomEmbed(
                "⚔️ Party Battle Ready!",
                `Both parties are assembled!\n\n` +
                    `**${challengerUser.displayName}'s Party:**\n${challengerParty}\n\n` +
                    `**${opponentUser.displayName}'s Party:**\n${opponentParty}\n\n` +
                    `Click **Start Battle** when you are ready to begin!`,
                "#4ECDC4"
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ready_for_party_battle_${battleSession.challenger.id}`)
                    .setLabel(`${challengerUser.username}: Start`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ready_for_party_battle_${battleSession.opponent.id}`)
                    .setLabel(`${opponentUser.username}: Start`)
                    .setStyle(ButtonStyle.Success)
            );

            const readyMessage = await message.channel.send({
                content: `<@${battleSession.challenger.id}> <@${battleSession.opponent.id}>`,
                embeds: [readyEmbed],
                components: [row],
            });

            const collector = readyMessage.createMessageComponentCollector({
                time: 60000,
            });

            collector.on("collect", async (interaction) => {
                const userId = interaction.user.id;
                
                if (userId !== battleSession.challenger.id && userId !== battleSession.opponent.id) {
                    return interaction.reply({ content: "You are not part of this battle!", ephemeral: true });
                }

                await this.handlePlayerReady(interaction, battleSession, userId === battleSession.challenger.id, message, client);
            });

            collector.on("end", (collected) => {
                if (partyBattleSessions.has(battleSession.id)) {
                    readyMessage.edit({ components: [] }).catch(() => {});
                    message.channel.send("Battle cancelled - players did not ready up in time.");
                    partyBattleSessions.delete(battleSession.id);
                }
            });

        } catch (error) {
            console.error('Error sending ready confirmation:', error);
            partyBattleSessions.delete(battleSession.id);
        }
    },

    async handlePlayerReady(interaction, battleSession, isChallenger, originalMessage, client) {
        if (isChallenger) {
            battleSession.challenger.ready = true;
        } else {
            battleSession.opponent.ready = true;
        }

        const components = interaction.message.components.map((row) => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach((component) => {
                if (component.data.custom_id === interaction.customId) {
                    component
                        .setDisabled(true)
                        .setLabel("Ready!")
                        .setStyle(ButtonStyle.Secondary);
                }
            });
            return newRow;
        });

        await interaction.update({ components });

        if (battleSession.challenger.ready && battleSession.opponent.ready) {
            partyBattleSessions.delete(battleSession.id); // Remove session to prevent timeout
            await this.startEnhancedPartyBattle(originalMessage, battleSession, client);
        }
    },

    async startEnhancedPartyBattle(message, battleSession, client) {
        try {
            const { challenger, opponent } = battleSession;
            const challengerUser = await client.users.fetch(challenger.id);
            const opponentUser = await client.users.fetch(opponent.id);

            let challengerActiveIndex = 0;
            let opponentActiveIndex = 0;
            const battleLog = [];
            
            battleLog.push(`🎯 **${challengerUser.displayName}** vs **${opponentUser.displayName}** - ${PARTY_BATTLE_CONFIG.MAX_PETS}v${PARTY_BATTLE_CONFIG.MAX_PETS} Party Battle!`);
            
            battleLog.push(`\n**${challengerUser.displayName}'s Party:**`);
            challenger.pals.forEach((pal, i) => {
                const palData = GameData.getPet(pal.basePetId);
                const type = palData?.type || "Beast";
                battleLog.push(`${i+1}. **${pal.nickname}** (Lv.${pal.level}) - ${type}`);
            });
            
            battleLog.push(`\n**${opponentUser.displayName}'s Party:**`);
            opponent.pals.forEach((pal, i) => {
                const palData = GameData.getPet(pal.basePetId);
                const type = palData?.type || "Beast";
                battleLog.push(`${i+1}. **${pal.nickname}** (Lv.${pal.level}) - ${type}`);
            });
            
            battleLog.push(`\n**First Battle:** ${challenger.pals[0].nickname} vs ${opponent.pals[0].nickname}`);
            battleLog.push("");

            // Battle loop with true PvP mechanics
            while (challengerActiveIndex < PARTY_BATTLE_CONFIG.MAX_PETS && opponentActiveIndex < PARTY_BATTLE_CONFIG.MAX_PETS) {
                const challengerPal = challenger.pals[challengerActiveIndex];
                const opponentPal = opponent.pals[opponentActiveIndex];

                if (challengerPal.areaDamage > 0) {
                    const maxhp = challengerPal.stats.hp;
                    challengerPal.stats.hp = Math.max(1, challengerPal.stats.hp - challengerPal.areaDamage);
                    battleLog.push(`💥 **${challengerPal.nickname}** enters with ${challengerPal.areaDamage} accumulated area damage!`);
                    battleLog.push(`❤️ *${challengerPal.nickname} HP: ${challengerPal.stats.hp}/${maxhp}*`);
                    challengerPal.areaDamage = 0;
                }
                
                if (opponentPal.areaDamage > 0) {
                    const maxhp = opponentPal.stats.hp;
                    opponentPal.stats.hp = Math.max(1, opponentPal.stats.hp - opponentPal.areaDamage);
                    battleLog.push(`💥 **${opponentPal.nickname}** enters with ${opponentPal.areaDamage} accumulated area damage!`);
                    battleLog.push(`❤️ *${opponentPal.nickname} HP: ${opponentPal.stats.hp}/${maxhp}*`);
                    opponentPal.areaDamage = 0;
                }

                const enhancedChallengerPal = StatManager.cloneCreature(challengerPal);
                const enhancedOpponentPal = StatManager.cloneCreature(opponentPal);

                // Get pal types
                const challengerPalData = GameData.getPet(challengerPal.basePetId);
                const opponentPalData = GameData.getPet(opponentPal.basePetId);
                const challengerType = challengerPalData?.type || "Beast";
                const opponentType = opponentPalData?.type || "Beast";

                // Get equipment effects
                const challengerEquipmentEffects = EquipmentManager.getEffects(enhancedChallengerPal.equipment);
                const opponentEquipmentEffects = EquipmentManager.getEffects(enhancedOpponentPal.equipment);

                // Get skill trees
                const challengerSkillTree = await SkillManager.ensureSkillTree(challengerPal);
                const opponentSkillTree = await SkillManager.ensureSkillTree(opponentPal);

                // Count beast types for pack leader bonus
                const challengerBeastCount = challenger.pals.filter(p => {
                    const palData = GameData.getPet(p.basePetId);
                    return palData?.type === "Beast";
                }).length;
                
                const opponentBeastCount = opponent.pals.filter(p => {
                    const palData = GameData.getPet(p.basePetId);
                    return palData?.type === "Beast";
                }).length;

                // Apply skill bonuses with party context
                const finalChallengerPal = await SkillManager.applySkillBonuses(
                    enhancedChallengerPal, 
                    challengerSkillTree,
                    'party',
                    { beastCount: challengerBeastCount }
                );
                const finalOpponentPal = await SkillManager.applySkillBonuses(
                    enhancedOpponentPal, 
                    opponentSkillTree,
                    'party',
                    { beastCount: opponentBeastCount }
                );

                // Get potion effects via Utils helper
                const challengerPotionEffects = Utils.extractPotionAbilities(finalChallengerPal);
                const opponentPotionEffects = Utils.extractPotionAbilities(finalOpponentPal);

                // Simulate single battle
                const result = await this.simulateSinglePvPBattle(
                    finalChallengerPal,
                    finalOpponentPal,
                    challengerType,
                    opponentType,
                    challengerEquipmentEffects,
                    opponentEquipmentEffects,
                    challengerPotionEffects,
                    opponentPotionEffects,
                    challengerUser,
                    opponentUser,
                    challengerPal.nickname,
                    opponentPal.nickname
                );

                challengerPal.stats.hp = result.challengerRemainingHp;
                opponentPal.stats.hp = result.opponentRemainingHp;

                battleLog.push(result.log);
                battleLog.push("");

                if (result.areaAttackData) {
                    const areaLogs = await this.processAreaDamage(
                        result.areaAttackData,
                        challenger,
                        opponent,
                        challengerActiveIndex,
                        opponentActiveIndex
                    );
                    battleLog.push(...areaLogs);
                    battleLog.push("");
                }

                if (result.winnerId === null) {
                    battleLog.push(`⚔️ **${challengerPal.nickname}** and **${opponentPal.nickname}** both exhausted in a draw!`);
                    challengerActiveIndex++;
                    opponentActiveIndex++;
                } else if (result.winnerId === challengerUser.id) {
                    battleLog.push(`🏆 **${challengerPal.nickname}** defeats **${opponentPal.nickname}**!`);
                    
                    opponentActiveIndex++;
                    if (opponentActiveIndex < PARTY_BATTLE_CONFIG.MAX_PETS) {
                        battleLog.push(`**${opponentUser.displayName}** sends out **${opponent.pals[opponentActiveIndex].nickname}**!`);
                        battleLog.push("");
                    }
                } else if (result.winnerId === opponentUser.id) {
                    battleLog.push(`🏆 **${opponentPal.nickname}** defeats **${challengerPal.nickname}**!`);
                    
                    challengerActiveIndex++;
                    if (challengerActiveIndex < PARTY_BATTLE_CONFIG.MAX_PETS) {
                        battleLog.push(`**${challengerUser.displayName}** sends out **${challenger.pals[challengerActiveIndex].nickname}**!`);
                        battleLog.push("");
                    }
                }
            }

            const challengerWon = challengerActiveIndex < PARTY_BATTLE_CONFIG.MAX_PETS;
            const overallWinner = challengerWon ? challengerUser : opponentUser;
            const remainingPets = challengerWon ? 
                PARTY_BATTLE_CONFIG.MAX_PETS - challengerActiveIndex : 
                PARTY_BATTLE_CONFIG.MAX_PETS - opponentActiveIndex;
            
            battleLog.push(`🎉 **${overallWinner.displayName}** wins the 3v3 party battle!`);
            battleLog.push(`💪 Victory achieved with ${remainingPets} pet${remainingPets !== 1 ? 's' : ''} remaining!`);

            await this.sendBattleResults(message, battleLog, overallWinner, challengerWon);

        } catch (error) {
            console.error("Error in enhanced party battle:", error);
            message.channel.send({
                embeds: [createErrorEmbed("Battle Error", "An error occurred during the enhanced battle.")],
            });
        }
    },

    async simulateSinglePvPBattle(challengerPal, opponentPal, challengerType, opponentType,
                               challengerEquipment, opponentEquipment,
                               challengerPotionEffects, opponentPotionEffects,
                               challengerUser, opponentUser,
                               challengerNickname, opponentNickname) {
        try {
            const combatEngine = new CombatEngine();
            
            let challengerHp = challengerPal.stats.hp;
            let opponentHp = opponentPal.stats.hp;
            
            if (!challengerPal.statusEffects) challengerPal.statusEffects = [];
            if (!opponentPal.statusEffects) opponentPal.statusEffects = [];
            
            combatEngine.logger.clear();
            combatEngine.logger.add(`\n⚔️ **${challengerNickname}** vs **${opponentNickname}**`);
            
            // Apply Crushing Pressure (Abyssal skill)
            if (challengerPal.skillBonuses?.enemyAtkDown || challengerPal.skillBonuses?.enemySpdDown) {
                const atkReduction = challengerPal.skillBonuses.enemyAtkDown || 0;
                const spdReduction = challengerPal.skillBonuses.enemySpdDown || 0;
                if (atkReduction > 0 || spdReduction > 0) {
                    const originalAtk = opponentPal.stats.atk;
                    const originalSpd = opponentPal.stats.spd;
                    opponentPal.stats.atk = Math.floor(opponentPal.stats.atk * (1 - atkReduction));
                    opponentPal.stats.spd = Math.floor(opponentPal.stats.spd * (1 - spdReduction));
                    const atkLost = originalAtk - opponentPal.stats.atk;
                    const spdLost = originalSpd - opponentPal.stats.spd;
                    combatEngine.logger.add(`🌊 **Crushing Pressure!** The abyss squeezes ${opponentNickname}!`);
                    if (atkLost > 0) combatEngine.logger.add(`${opponentNickname}'s ATK reduced by ${atkLost}`);
                    if (spdLost > 0) combatEngine.logger.add(`${opponentNickname}'s SPD reduced by ${spdLost}`);
                }
            }
            
            if (opponentPal.skillBonuses?.enemyAtkDown || opponentPal.skillBonuses?.enemySpdDown) {
                const atkReduction = opponentPal.skillBonuses.enemyAtkDown || 0;
                const spdReduction = opponentPal.skillBonuses.enemySpdDown || 0;
                if (atkReduction > 0 || spdReduction > 0) {
                    const originalAtk = challengerPal.stats.atk;
                    const originalSpd = challengerPal.stats.spd;
                    challengerPal.stats.atk = Math.floor(challengerPal.stats.atk * (1 - atkReduction));
                    challengerPal.stats.spd = Math.floor(challengerPal.stats.spd * (1 - spdReduction));
                    const atkLost = originalAtk - challengerPal.stats.atk;
                    const spdLost = originalSpd - challengerPal.stats.spd;
                    combatEngine.logger.add(`🌊 **Crushing Pressure!** The abyss squeezes ${challengerNickname}!`);
                    if (atkLost > 0) combatEngine.logger.add(`${challengerNickname}'s ATK reduced by ${atkLost} (${originalAtk} → ${challengerPal.stats.atk})`);
                    if (spdLost > 0) combatEngine.logger.add(`${challengerNickname}'s SPD reduced by ${spdLost} (${originalSpd} → ${challengerPal.stats.spd})`);
                }
            }
            
            // Apply Terror From Below
            if (challengerPal.skillBonuses?.defReduction) {
                const defReduction = challengerPal.skillBonuses.defReduction;
                const originalDef = opponentPal.stats.def;
                opponentPal.stats.def = Math.floor(opponentPal.stats.def * (1 - defReduction));
                const defLost = originalDef - opponentPal.stats.def;
                if (defLost > 0) {
                    combatEngine.logger.add(`😱 **Terror From Below!** ${challengerNickname} strikes fear into ${opponentNickname}, reducing their defenses!`);
                    combatEngine.logger.add(`> ${opponentNickname}'s DEF reduced by ${defLost} (${originalDef} → ${opponentPal.stats.def})`);
                }
            }
            
            if (opponentPal.skillBonuses?.defReduction) {
                const defReduction = opponentPal.skillBonuses.defReduction;
                const originalDef = challengerPal.stats.def;
                challengerPal.stats.def = Math.floor(challengerPal.stats.def * (1 - defReduction));
                const defLost = originalDef - challengerPal.stats.def;
                if (defLost > 0) {
                    combatEngine.logger.add(`😱 **Terror From Below!** ${opponentNickname} strikes fear into ${challengerNickname}, reducing their defenses!`);
                    combatEngine.logger.add(`> ${challengerNickname}'s DEF reduced by ${defLost} (${originalDef} → ${challengerPal.stats.def})`);
                }
            }
            
            let turn = 0;
            let challengerReviveUsed = false;
            let opponentReviveUsed = false;
            let areaAttackData = null;
            let challengerResonanceStacks = 0;
            let opponentResonanceStacks = 0;    
            const createParadoxState = () => ({
                active: false,
                pendingRecoil: false,
                storedDamage: 0,
                recoilPercent: 0.4,
                recoilTurn: null
            });
            const challengerParadox = createParadoxState();
            const opponentParadox = createParadoxState();

            const applyParadoxRecoil = (state, defenderHp, attackerHp, defenderLabel, attackerLabel, currentTurn) => {
                if (!state.pendingRecoil) return { defenderHp, attackerHp };
                if (state.recoilTurn !== null && currentTurn < state.recoilTurn) return { defenderHp, attackerHp };
                if (state.storedDamage > 0) {
                    combatEngine.logger.add(`⏰ **Temporal Reflection!** The attack reverses through time!`);
                    combatEngine.logger.add(`💫 **${attackerLabel}** takes ${state.storedDamage} reflected damage!`);
                    attackerHp = Math.max(0, attackerHp - state.storedDamage);
                }
                state.storedDamage = 0;
                state.pendingRecoil = false;
                state.recoilTurn = null;
                return { defenderHp, attackerHp };
            };

            const tryActivateParadox = (creature, creatureLabel, state) => {
                if (state.active || state.pendingRecoil) return;
                const paradoxCheck = SkillManager.checkActivation(creature, "paradox_loop");
                if (paradoxCheck?.type === "paradox_loop") {
                    combatEngine.logger.add(paradoxCheck.message);
                    state.active = true;
                    state.recoilPercent = paradoxCheck.recoilPercent || 0.5;
                    state.storedDamage = 0;
                }
            };

            const handleParadoxBlock = (attackerCtx, defenderCtx, defenderState) => {
                if (!defenderState.active) return false;
                const simulation = combatEngine.simulatePlayerAttack(
                    attackerCtx.pal,
                    defenderCtx.pal,
                    attackerCtx.type,
                    defenderCtx.type,
                    attackerCtx.equipment,
                    attackerCtx.potion,
                    {},
                    attackerCtx.name,
                    defenderCtx.name,
                    defenderCtx.equipment
                );
                const preventedDamage = Math.max(0, simulation.damage);
                const storedChunk = Math.floor(preventedDamage * defenderState.recoilPercent);
                defenderState.storedDamage += storedChunk;
                combatEngine.logger.add(`⏰ *Storing ${storedChunk} temporal damage (total ${defenderState.storedDamage}).*`);
                defenderState.active = false;
                defenderState.pendingRecoil = true;
                defenderState.recoilTurn = turn + 1;
                return true;
            };
            
            while (challengerHp > 0 && opponentHp > 0 && turn < COMBAT_CONFIG.MAX_TURNS) {
                turn++;
                combatEngine.logger.add(`\n**--- Turn ${turn} ---**`);
                
                const challengerStatusResult = StatusEffectManager.processStatusEffects(
                    { ...challengerPal, currentHp: challengerHp, maxHp: challengerPal.stats.hp, name: challengerNickname },
                    []
                );
                challengerHp = challengerStatusResult.creature.currentHp;
                challengerPal.statusEffects = challengerStatusResult.creature.statusEffects;
                challengerPal.stats = challengerStatusResult.creature.stats;
                combatEngine.logger.addMultiple(challengerStatusResult.battleLog);
                
                const opponentStatusResult = StatusEffectManager.processStatusEffects(
                    { ...opponentPal, currentHp: opponentHp, maxHp: opponentPal.stats.hp, name: opponentNickname },
                    []
                );
                opponentHp = opponentStatusResult.creature.currentHp;
                opponentPal.statusEffects = opponentStatusResult.creature.statusEffects;
                opponentPal.stats = opponentStatusResult.creature.stats;
                combatEngine.logger.addMultiple(opponentStatusResult.battleLog);
                
                if (challengerHp <= 0 || opponentHp <= 0) break;
                
                const turnOrder = TurnOrderManager.calculate(
                    challengerPal, opponentPal,
                    `${challengerUser.displayName}'s ${challengerNickname}`,
                    `${opponentUser.displayName}'s ${opponentNickname}`
                );
                
                const firstAttacker = turnOrder.first === challengerPal ? {
                    pal: challengerPal, hp: challengerHp, name: `${challengerUser.displayName}'s ${challengerNickname}`,
                    type: challengerType, equipment: challengerEquipment, potion: challengerPotionEffects,
                    statusResult: challengerStatusResult, reviveUsed: challengerReviveUsed, user: challengerUser
                } : {
                    pal: opponentPal, hp: opponentHp, name: `${opponentUser.displayName}'s ${opponentNickname}`,
                    type: opponentType, equipment: opponentEquipment, potion: opponentPotionEffects,
                    statusResult: opponentStatusResult, reviveUsed: opponentReviveUsed, user: opponentUser
                };
                
                const secondAttacker = turnOrder.first === challengerPal ? {
                    pal: opponentPal, hp: opponentHp, name: `${opponentUser.displayName}'s ${opponentNickname}`,
                    type: opponentType, equipment: opponentEquipment, potion: opponentPotionEffects,
                    statusResult: opponentStatusResult, reviveUsed: opponentReviveUsed, user: opponentUser
                } : {
                    pal: challengerPal, hp: challengerHp, name: `${challengerUser.displayName}'s ${challengerNickname}`,
                    type: challengerType, equipment: challengerEquipment, potion: challengerPotionEffects,
                    statusResult: challengerStatusResult, reviveUsed: challengerReviveUsed, user: challengerUser
                };
                
                if (firstAttacker.statusResult.canAct !== false && secondAttacker.hp > 0) {
                    const defenderParadoxState = turnOrder.first === challengerPal ? opponentParadox : challengerParadox;
                    tryActivateParadox(secondAttacker.pal, secondAttacker.name, defenderParadoxState);
                    const attackBlocked = handleParadoxBlock(firstAttacker, secondAttacker, defenderParadoxState);

                    if (firstAttacker.pal.skillBonuses?.resonanceStacks) {
                        firstAttacker.pal.resonanceStack = firstAttacker.pal === challengerPal ? challengerResonanceStacks : opponentResonanceStacks;
                    }

                    if (!attackBlocked) {
                        const attackResult = combatEngine.executeAttack(
                            { ...firstAttacker.pal, currentHp: firstAttacker.hp },
                            { ...secondAttacker.pal, currentHp: secondAttacker.hp },
                            firstAttacker.type, secondAttacker.type,
                            firstAttacker.equipment, firstAttacker.potion, {},
                            firstAttacker.name, secondAttacker.name, secondAttacker.equipment,
                            { defenderPotionEffects: secondAttacker.potion }
                        );
                        
                        secondAttacker.hp = Math.max(0, secondAttacker.hp - attackResult.damage);

                        if (attackResult.hpSacrificed) {
                            firstAttacker.hp = Math.max(1, firstAttacker.hp - attackResult.hpSacrificed);
                        }

                        if (attackResult.resonanceStacks !== undefined) {
                            if (firstAttacker.pal === challengerPal) {
                                challengerResonanceStacks = attackResult.resonanceStacks;
                            } else {
                                opponentResonanceStacks = attackResult.resonanceStacks;
                            }
                        }

                        firstAttacker.hp = Math.min(firstAttacker.pal.stats.hp, firstAttacker.hp + (attackResult.lifesteal || 0));
                        
                        if (attackResult.counterDamage > 0) {
                            firstAttacker.hp = Math.max(0, firstAttacker.hp - attackResult.counterDamage);
                            combatEngine.logger.add(`💥 **Counter damage:** ${firstAttacker.name} takes **${attackResult.counterDamage}** damage!`);
                        }

                        if (attackResult.reflectedDamage > 0) {
                            firstAttacker.hp = Math.max(0, firstAttacker.hp - attackResult.reflectedDamage);
                            combatEngine.logger.add(`⚡ **${firstAttacker.name} takes ${attackResult.reflectedDamage} reflected damage!**`);
                        }
                        
                        if (attackResult.elementalStormTriggered || attackResult.abyssalDevourerTriggered) {
                            areaAttackData = {
                                damage: this.calculateAreaDamage(firstAttacker.pal),
                                attackerUser: firstAttacker.user,
                                attackerType: firstAttacker.type,
                                targetIsChallenger: turnOrder.first !== challengerPal
                            };
                        }
                        
                        if (secondAttacker.hp <= 0) {
                            const reviveCheck = combatEngine.handleDeath(secondAttacker.pal, secondAttacker.equipment, secondAttacker.reviveUsed);
                            if (reviveCheck) {
                                secondAttacker.hp = Math.floor(secondAttacker.pal.stats.hp * 0.3);
                                secondAttacker.reviveUsed = true;
                                combatEngine.logger.add(`🌟 **${secondAttacker.name}** refuses to fall!`);
                            } else {
                                combatEngine.logger.add(`💀 **${secondAttacker.name}** has been defeated!`);
                                
                                if (turnOrder.first === challengerPal) {
                                    challengerHp = firstAttacker.hp;
                                    opponentHp = secondAttacker.hp;
                                } else {
                                    challengerHp = secondAttacker.hp;
                                    opponentHp = firstAttacker.hp;
                                }
                                break;
                            }
                        }
                        combatEngine.logger.add(`❤️ *${secondAttacker.name} HP: ${secondAttacker.hp}/${secondAttacker.pal.stats.hp}*`);
                    }
                }
                
                if (secondAttacker.hp > 0 && firstAttacker.hp > 0 && secondAttacker.statusResult.canAct !== false) {
                    const defenderParadoxState = turnOrder.first === challengerPal ? challengerParadox : opponentParadox;
                    tryActivateParadox(firstAttacker.pal, firstAttacker.name, defenderParadoxState);
                    const attackBlocked = handleParadoxBlock(secondAttacker, firstAttacker, defenderParadoxState);

                    if (!attackBlocked) {
                        const counterResult = combatEngine.executeAttack(
                            { ...secondAttacker.pal, currentHp: secondAttacker.hp },
                            { ...firstAttacker.pal, currentHp: firstAttacker.hp },
                            secondAttacker.type, firstAttacker.type,
                            secondAttacker.equipment, secondAttacker.potion, {},
                            secondAttacker.name, firstAttacker.name, firstAttacker.equipment,
                            { defenderPotionEffects: firstAttacker.potion }
                        );
                        
                        firstAttacker.hp = Math.max(0, firstAttacker.hp - counterResult.damage);
                        if (counterResult.hpSacrificed) {
                            secondAttacker.hp = Math.max(1, secondAttacker.hp - counterResult.hpSacrificed);
                        }
                        secondAttacker.hp = Math.min(secondAttacker.pal.stats.hp, secondAttacker.hp + (counterResult.lifesteal || 0));
                        
                        if (counterResult.counterDamage > 0) {
                            secondAttacker.hp = Math.max(0, secondAttacker.hp - counterResult.counterDamage);
                            combatEngine.logger.add(`💥 **Counter damage:** ${secondAttacker.name} takes **${counterResult.counterDamage}** damage!`);
                        }

                        if (counterResult.reflectedDamage > 0) {
                            secondAttacker.hp = Math.max(0, secondAttacker.hp - counterResult.reflectedDamage);
                            combatEngine.logger.add(`⚡ **${secondAttacker.name} takes ${counterResult.reflectedDamage} reflected damage!**`);
                        }
                        
                        if (firstAttacker.hp <= 0) {
                            const reviveCheck = combatEngine.handleDeath(firstAttacker.pal, firstAttacker.equipment, firstAttacker.reviveUsed);
                            if (reviveCheck) {
                                firstAttacker.hp = Math.floor(firstAttacker.pal.stats.hp * 0.3);
                                firstAttacker.reviveUsed = true;
                                combatEngine.logger.add(`🌟 **${firstAttacker.name}** refuses to fall!`);
                            } else {
                                combatEngine.logger.add(`💀 **${firstAttacker.name}** has been defeated!`);
                                
                                if (turnOrder.first === challengerPal) {
                                    challengerHp = 0;
                                    opponentHp = secondAttacker.hp;
                                } else {
                                    challengerHp = secondAttacker.hp;
                                    opponentHp = 0;
                                }
                                break;
                            }
                        }
                        combatEngine.logger.add(`❤️ *${firstAttacker.name} HP: ${firstAttacker.hp}/${firstAttacker.pal.stats.hp}*`);
                    }
                }
                
                if (turnOrder.first === challengerPal) {
                    challengerHp = firstAttacker.hp;
                    opponentHp = secondAttacker.hp;
                    challengerReviveUsed = firstAttacker.reviveUsed;
                    opponentReviveUsed = secondAttacker.reviveUsed;
                } else {
                    challengerHp = secondAttacker.hp;
                    opponentHp = firstAttacker.hp;
                    challengerReviveUsed = secondAttacker.reviveUsed;
                    opponentReviveUsed = firstAttacker.reviveUsed;
                }
                
                challengerHp = combatEngine.applyHealingEffects(challengerPal, challengerHp, challengerNickname);
                opponentHp = combatEngine.applyHealingEffects(opponentPal, opponentHp, opponentNickname);
            
                const challengerReflect = applyParadoxRecoil(
                    challengerParadox,
                    challengerHp,
                    opponentHp,
                    `${challengerUser.displayName}'s ${challengerNickname}`,
                    `${opponentUser.displayName}'s ${opponentNickname}`,
                    turn
                );
                challengerHp = challengerReflect.defenderHp;
                opponentHp = challengerReflect.attackerHp;

                const opponentReflect = applyParadoxRecoil(
                    opponentParadox,
                    opponentHp,
                    challengerHp,
                    `${opponentUser.displayName}'s ${opponentNickname}`,
                    `${challengerUser.displayName}'s ${challengerNickname}`,
                    turn
                );
                opponentHp = opponentReflect.defenderHp;
                challengerHp = opponentReflect.attackerHp;          
                
                if (challengerHp > 0 && opponentHp > 0) {
                    combatEngine.logger.add(`\n💚 **${challengerNickname}:** ${challengerHp}/${challengerPal.stats.hp} HP | **${opponentNickname}:** ${opponentHp}/${opponentPal.stats.hp} HP`);
                    combatEngine.logger.add("\u200B");
                }
            }
            
            let winnerId;
            if (turn >= COMBAT_CONFIG.MAX_TURNS) {
                combatEngine.logger.add("\n⏱️ Battle ended in a draw - both pets exhausted");
                winnerId = null;
            } else if (challengerHp > 0 && opponentHp <= 0) {
                winnerId = challengerUser.id;
            } else if (opponentHp > 0 && challengerHp <= 0) {
                winnerId = opponentUser.id;
            } else {
                winnerId = null;
            }
            
            return {
                winnerId,
                log: combatEngine.logger.getLog(),
                areaAttackData,
                challengerRemainingHp: Math.max(0, challengerHp),
                opponentRemainingHp: Math.max(0, opponentHp)
            };
        } catch (error) {
            console.error('Error in single PvP battle:', error);
            return {
                winnerId: null,
                log: "Battle simulation encountered an error.",
                areaAttackData: null
            };
        }
    },

    calculateAreaDamage(pal) {
        const baseMultiplier = PARTY_BATTLE_CONFIG.AREA_DAMAGE_MULTIPLIER;
        
        if (pal.skillBonuses?.damage && pal.skillBonuses?.areaAttack) {
            return Math.floor(pal.stats.atk * (pal.skillBonuses.damage || 2.5) * baseMultiplier);
        }
        
        if (pal.skillBonuses?.areaDamage) {
            return Math.floor(pal.stats.atk * pal.skillBonuses.areaDamage * baseMultiplier);
        }
        
        return 0;
    },

    async processAreaDamage(areaAttackData, challenger, opponent, challengerActiveIndex, opponentActiveIndex) {
        const areaLogs = [];
        
        if (!areaAttackData || areaAttackData.damage <= 0) return areaLogs;

        areaLogs.push(`🌪️ **Area Attack Effect!**`);
        areaLogs.push(`**${areaAttackData.attackerUser.displayName}**'s attack affects waiting pets!`);

        try {
            const targetTeam = areaAttackData.targetIsChallenger ? challenger : opponent;
            const targetActiveIndex = areaAttackData.targetIsChallenger ? challengerActiveIndex : opponentActiveIndex;

            for (let i = targetActiveIndex + 1; i < PARTY_BATTLE_CONFIG.MAX_PETS; i++) {
                const waitingPet = targetTeam.pals[i];
                if (!waitingPet) continue;

                const waitingPetSkillTree = await SkillTree.findOne({ palId: waitingPet.petId });
                const enhancedWaitingPet = waitingPetSkillTree ? await SkillManager.applySkillBonuses(waitingPet, waitingPetSkillTree, 'party', {}) : waitingPet;
                const petData = GameData.getPet(waitingPet.basePetId);
                const petType = petData?.type || "Beast";
                const resistances = EquipmentManager.getResistances(waitingPet.equipment);
                
                let actualDamage = areaAttackData.damage;
                
                const typeMultiplier = TypeAdvantage.calculate(areaAttackData.attackerType, petType);
                actualDamage = Math.floor(actualDamage * typeMultiplier);
                
                if (resistances.fire || resistances.ice || resistances.storm) {
                    const totalResist = (resistances.fire || 0) + (resistances.ice || 0) + (resistances.storm || 0);
                    const resistMultiplier = Math.max(0.1, 1 - totalResist / 300);
                    actualDamage = Math.floor(actualDamage * resistMultiplier);
                }

                if (enhancedWaitingPet.skillBonuses?.aoeProtect && enhancedWaitingPet.skillBonuses?.barrierAbsorb) {
                    const absorbedAmount = Math.floor(actualDamage * enhancedWaitingPet.skillBonuses.barrierAbsorb);
                    actualDamage -= absorbedAmount;
                    areaLogs.push(`🛡️ **${waitingPet.nickname}**'s Celestial Barrier absorbs ${absorbedAmount} area damage!`);
                }

                actualDamage = Math.max(1, actualDamage);

                if (!waitingPet.areaDamage) waitingPet.areaDamage = 0;
                waitingPet.areaDamage += actualDamage;

                let damageMessage = `💥 **${waitingPet.nickname}** will take ${actualDamage} area damage when entering battle!`;
                if (typeMultiplier > 1) {
                    damageMessage += ` ✨ **Super effective!**`;
                } else if (typeMultiplier < 1) {
                    damageMessage += ` 🛡️ *Resisted*`;
                }
                
                areaLogs.push(damageMessage);
            }
        } catch (error) {
            console.error("Error processing area damage:", error);
            areaLogs.push("⚠️ Area damage calculation encountered an error.");
        }

        return areaLogs;
    },

    async sendBattleResults(message, battleLog, overallWinner, challengerWon) {
        try {
            const logs = this.splitBattleLog(battleLog.join('\n'));
            
            for (let i = 0; i < logs.length; i++) {
                const color = challengerWon ? "#4CAF50" : "#FF5722";
                const title = i === 0 ? "⚔️ 3v3 Party Battle Results" : `⚔️ Results (${i + 1}/${logs.length})`;

                const resultEmbed = createCustomEmbed(title, logs[i], color);

                if (i === logs.length - 1) {
                    resultEmbed.addFields([
                        {
                            name: "🏆 Victory",
                            value: `**${overallWinner.displayName}** wins the 3v3 party battle!`,
                            inline: false,
                        }
                    ]);
                }

                await message.channel.send({ embeds: [resultEmbed] });

                if (i < logs.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                }
            }
        } catch (error) {
            console.error("Error sending battle results:", error);
            message.channel.send({
                embeds: [createErrorEmbed("Results Error", "There was an error displaying the battle results.")],
            });
        }
    },

    splitBattleLog(log, maxLength = 4000) {
        if (log.length <= maxLength) return [log];

        const logs = [];
        const lines = log.split("\n");
        let currentLog = "";

        for (const line of lines) {
            if (currentLog.length + line.length + 1 > maxLength) {
                if (currentLog.trim()) {
                    logs.push(currentLog.trim());
                    currentLog = "";
                }
            }
            currentLog += line + "\n";
        }

        if (currentLog.trim()) {
            logs.push(currentLog.trim());
        }

        return logs.length > 0 ? logs : [log.substring(0, maxLength)];
    }
};