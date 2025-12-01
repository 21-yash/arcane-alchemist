const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
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
const {
    CombatEngine,
    SkillManager,
    EquipmentManager,
    StatManager,
    COMBAT_CONFIG
} = require("../../utils/combat");
const { StatusEffectManager } = require("../../utils/statusEffects");

// Enhanced battle session management
class BattleSessionManager {
    constructor() {
        this.sessions = new Map();
        this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60000);
    }

    createSession(challengerId, opponentId) {
        const sessionId = `${challengerId}_${opponentId}_${Date.now()}`;
        const session = {
            id: sessionId,
            challenger: {
                id: challengerId,
                pal: null,
                ready: false,
            },
            opponent: {
                id: opponentId,
                pal: null,
                ready: false,
            },
            status: "pet_selection",
            createdAt: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        };
        
        this.sessions.set(sessionId, session);
        return session;
    }

    getSessionByPlayer(playerId) {
        for (const session of this.sessions.values()) {
            if (session.challenger.id === playerId || session.opponent.id === playerId) {
                return session;
            }
        }
        return null;
    }

    deleteSession(sessionId) {
        this.sessions.delete(sessionId);
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.expiresAt < now) {
                this.sessions.delete(sessionId);
            }
        }
    }

    validateSession(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session) return { valid: false, error: "Session not found" };
        if (session.expiresAt < Date.now()) {
            this.sessions.delete(sessionId);
            return { valid: false, error: "Session expired" };
        }
        if (session.challenger.id !== playerId && session.opponent.id !== playerId) {
            return { valid: false, error: "Player not in session" };
        }
        return { valid: true, session };
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.sessions.clear();
    }
}

const battleSessionManager = new BattleSessionManager();

class BattleValidator {
    static async validatePlayer(userId) {
        try {
            const player = await Player.findOne({ userId });
            if (!player) {
                return { valid: false, error: "Player not found. Use `start` to begin your adventure." };
            }
            return { valid: true, player };
        } catch (error) {
            console.error('Error validating player:', error);
            return { valid: false, error: "Database error occurred." };
        }
    }

    static async validatePet(ownerId, petId) {
        try {
            const pet = await Pet.findOne({
                ownerId,
                shortId: petId,
                status: "Idle",
            });
            
            if (!pet) {
                return { valid: false, error: "Pet not found or not idle." };
            }

            // Validate pet stats
            pet.stats = StatManager.validateStats(pet.stats);
            await pet.save();

            return { valid: true, pet };
        } catch (error) {
            console.error('Error validating pet:', error);
            return { valid: false, error: "Error accessing pet data." };
        }
    }

    static validateMention(message) {
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return { valid: false, error: "Please mention a user to challenge." };
        }
        if (targetUser.id === message.author.id) {
            return { valid: false, error: "You cannot battle yourself." };
        }
        if (targetUser.bot) {
            return { valid: false, error: "You cannot battle bots." };
        }
        return { valid: true, targetUser };
    }

    static async validatePetAvailability(userId, minLevel = 1) {
        try {
            const petsCount = await Pet.countDocuments({
                ownerId: userId,
                status: "Idle",
                level: { $gte: minLevel },
            });
            return petsCount > 0;
        } catch (error) {
            console.error('Error validating pet availability:', error);
            return false;
        }
    }
}

module.exports = {
    name: "battle",
    description: "Challenge another player to a Pal battle!",
    usage: "<@user> | add <pet_id>",
    aliases: ["fight", "duel", "pvp"],
    
    async execute(message, args, client, prefix) {
        try {
            const challengerId = message.author.id;
            
            const challengerValidation = await BattleValidator.validatePlayer(challengerId);
            if (!challengerValidation.valid) {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Player", challengerValidation.error)],
                });
            }

            const subcommand = args[0]?.toLowerCase();

            if (subcommand === "add") {
                return await this.handlePetAdd(message, args, client, prefix, challengerId);
            } else {
                return await this.handleBattleChallenge(message, args, client, prefix, challengerId, challengerValidation.player);
            }
        } catch (error) {
            console.error("Battle command error:", error);
            return message.reply({
                embeds: [createErrorEmbed("System Error", "An unexpected error occurred. Please try again.")],
            });
        }
    },

    async handlePetAdd(message, args, client, prefix, challengerId) {
        try {
            if (args.length < 2) {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Usage", `Please use: \`${prefix}battle add <pet_id>\``)],
                });
            }

            const petId = args[1];
            const session = battleSessionManager.getSessionByPlayer(challengerId);

            if (!session) {
                return message.reply({
                    embeds: [createErrorEmbed("No Active Battle", "You are not in an active battle.")],
                });
            }

            if (session.status !== "pet_selection") {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Phase", "This battle is not in the pet selection phase.")],
                });
            }

            const petValidation = await BattleValidator.validatePet(challengerId, petId);
            if (!petValidation.valid) {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Pet", petValidation.error)],
                });
            }

            const pal = petValidation.pet;

            // Add pet to session
            if (session.challenger.id === challengerId) {
                session.challenger.pal = pal;
            } else {
                session.opponent.pal = pal;
            }

            const successEmbed = createSuccessEmbed(
                "Pet Added!",
                `**${pal.nickname}** (Level ${pal.level}) has been added to the battle!`
            );
            await message.reply({ embeds: [successEmbed] });

            // Check if both players have selected pets
            if (session.challenger.pal && session.opponent.pal) {
                session.status = "ready_check";
                await this.sendReadyConfirmation(message, session, client);
            }
        } catch (error) {
            console.error('Error in handlePetAdd:', error);
            return message.reply({
                embeds: [createErrorEmbed("Error", "Failed to add pet to battle.")],
            });
        }
    },

    async handleBattleChallenge(message, args, client, prefix, challengerId, challenger) {
        try {
            const mentionValidation = BattleValidator.validateMention(message);
            if (!mentionValidation.valid) {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Target", mentionValidation.error)],
                });
            }

            const targetUser = mentionValidation.targetUser;

            const opponentValidation = await BattleValidator.validatePlayer(targetUser.id);
            if (!opponentValidation.valid) {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Opponent", "The mentioned user hasn't started their adventure yet!")],
                });
            }

            const challengerHasPets = await BattleValidator.validatePetAvailability(challengerId);
            const opponentHasPets = await BattleValidator.validatePetAvailability(targetUser.id);

            if (!challengerHasPets) {
                return message.reply({
                    embeds: [createErrorEmbed("No Available Pals", "You have no idle Pals available for battle!")],
                });
            }

            if (!opponentHasPets) {
                return message.reply({
                    embeds: [createErrorEmbed("Opponent Has No Pals", "Your opponent has no idle Pals available for battle!")],
                });
            }

            const existingSession = battleSessionManager.getSessionByPlayer(challengerId);
            if (existingSession) {
                return message.reply({
                    embeds: [createWarningEmbed("Battle In Progress", "You are already in an active battle.")],
                });
            }

            const opponentSession = battleSessionManager.getSessionByPlayer(targetUser.id);
            if (opponentSession) {
                return message.reply({
                    embeds: [createWarningEmbed("Opponent Busy", "Your opponent is already in an active battle.")],
                });
            }

            await this.sendBattleInvitation(message, targetUser, challengerId, client, prefix);
        } catch (error) {
            console.error('Error in handleBattleChallenge:', error);
            return message.reply({
                embeds: [createErrorEmbed("Error", "Failed to create battle challenge.")],
            });
        }
    },

    async sendBattleInvitation(message, targetUser, challengerId, client, prefix) {
        const inviteEmbed = createCustomEmbed(
            "⚔️ Battle Challenge!",
            `**${message.author.displayName}** has challenged **${targetUser.displayName}** to a Pal battle!\n\n` +
                `${targetUser.displayName}, do you accept this challenge?\n\n` +
                `*After accepting, both players can use \`${prefix}battle add <pet_id>\` to select their pets.*`,
            "#FF6B6B",
            {
                footer: { text: "Challenge expires in 60 seconds" },
                timestamp: true,
            }
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
                .setEmoji("❌")
        );

        const inviteMessage = await message.reply({
            content: `${targetUser}`,
            embeds: [inviteEmbed],
            components: [inviteButtons],
        });

        const inviteCollector = inviteMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === targetUser.id,
            time: 60000,
            componentType: ComponentType.Button,
        });

        inviteCollector.on("collect", async (interaction) => {
            try {
                if (interaction.customId === "decline_battle") {
                    const declineEmbed = createWarningEmbed(
                        "Challenge Declined",
                        `${targetUser.displayName} has declined the battle challenge.`
                    );
                    await interaction.update({ embeds: [declineEmbed], components: [] });
                    return;
                }

                if (interaction.customId === "accept_battle") {
                    const battleSession = battleSessionManager.createSession(challengerId, targetUser.id);

                    const acceptEmbed = createSuccessEmbed(
                        "Challenge Accepted!",
                        `${targetUser.displayName} has accepted the challenge!\n\n` +
                            `**Both players can now use \`${prefix}battle add <pet_id>\` to select their pets.**\n` +
                            `You have 5 minutes to select your pets.`
                    );
                    await interaction.update({ embeds: [acceptEmbed], components: [] });
                }
            } catch (error) {
                console.error('Error handling battle invitation:', error);
                await interaction.followUp({
                    embeds: [createErrorEmbed("Error", "An error occurred while processing your response.")],
                    ephemeral: true,
                }).catch(() => {});
            }
        });

        inviteCollector.on("end", (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = createWarningEmbed(
                    "Challenge Expired",
                    "The battle challenge has expired due to no response."
                );
                inviteMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    },

    async sendReadyConfirmation(message, battleSession, client) {
        try {
            const challengerUser = await client.users.fetch(battleSession.challenger.id);
            const opponentUser = await client.users.fetch(battleSession.opponent.id);

            const readyEmbed = createCustomEmbed(
                "⚔️ Battle Ready!",
                `Both players have selected their pets!\n\n` +
                    `**${challengerUser.displayName}:** ${battleSession.challenger.pal.nickname} (Lvl ${battleSession.challenger.pal.level})\n` +
                    `**${opponentUser.displayName}:** ${battleSession.opponent.pal.nickname} (Lvl ${battleSession.opponent.pal.level})\n\n` +
                    `Click **Start Battle** when you are ready to begin!`,
                "#4ECDC4"
            );

            // Create buttons for both players
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ready_for_battle_${battleSession.challenger.id}`)
                    .setLabel(`${challengerUser.username}: Start`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ready_for_battle_${battleSession.opponent.id}`)
                    .setLabel(`${opponentUser.username}: Start`)
                    .setStyle(ButtonStyle.Success)
            );

            const readyMessage = await message.channel.send({
                content: `<@${battleSession.challenger.id}> <@${battleSession.opponent.id}>`,
                embeds: [readyEmbed],
                components: [row],
            });

            const collector = readyMessage.createMessageComponentCollector({
                time: 60000, // 1 minute to click ready
            });

            collector.on("collect", async (interaction) => {
                const userId = interaction.user.id;
                
                // Verify user is in battle
                if (userId !== battleSession.challenger.id && userId !== battleSession.opponent.id) {
                    return interaction.reply({ content: "You are not part of this battle!", ephemeral: true });
                }

                await this.handlePlayerReady(interaction, battleSession, userId === battleSession.challenger.id, message, client);
            });

            collector.on("end", (collected) => {
                // If battle started (deleted session), do nothing. If time ran out and session exists, show timeout.
                if (battleSessionManager.sessions.has(battleSession.id)) {
                    readyMessage.edit({ components: [] }).catch(() => {});
                    message.channel.send("Battle cancelled - players did not ready up in time.");
                    battleSessionManager.deleteSession(battleSession.id);
                }
            });

        } catch (error) {
            console.error('Error sending ready confirmation:', error);
            battleSessionManager.deleteSession(battleSession.id);
        }
    },

    async handlePlayerReady(interaction, battleSession, isChallenger, message, client) {
        if (isChallenger) {
            battleSession.challenger.ready = true;
        } else {
            battleSession.opponent.ready = true;
        }

        // Disable the clicked button
        const components = interaction.message.components.map(row => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach(comp => {
                if (comp.data.custom_id === interaction.customId) {
                    comp.setDisabled(true).setLabel("Ready!").setStyle(ButtonStyle.Secondary);
                }
            });
            return newRow;
        });

        await interaction.update({ components });

        // Check if both players are ready
        if (battleSession.challenger.ready && battleSession.opponent.ready) {
            battleSessionManager.deleteSession(battleSession.id); // Remove session prevents timeout logic
            await this.startBattle(message, battleSession, client);
        }
    },

    async startBattle(message, battleSession, client) {
        try {
            const { challenger, opponent } = battleSession;

            // Stats are already applied via 'use' command in DB
            const challengerPal = StatManager.cloneCreature(challenger.pal);
            const opponentPal = StatManager.cloneCreature(opponent.pal);

            // Get equipment effects
            const challengerEquipmentEffects = EquipmentManager.getEffects(challengerPal.equipment);
            const opponentEquipmentEffects = EquipmentManager.getEffects(opponentPal.equipment);

            // Get active potion abilities/effects from the database record
            const challengerPotionEffects = this.getPotionEffects(challenger.pal);
            const opponentPotionEffects = this.getPotionEffects(opponent.pal);

            // Get skill trees
            const challengerSkillTree = await SkillManager.ensureSkillTree(challenger.pal);
            const opponentSkillTree = await SkillManager.ensureSkillTree(opponent.pal);

            // Get pal types
            const challengerPalData = GameData.getPet(challenger.pal.basePetId);
            const opponentPalData = GameData.getPet(opponent.pal.basePetId);
            const challengerType = challengerPalData?.type || "Beast";
            const opponentType = opponentPalData?.type || "Beast";

            // Initialize combat engine
            const combatEngine = new CombatEngine();

            // Simulate PvP battle
            const battleResult = await this.simulatePvPBattle(
                challenger, opponent, 
                challengerPal, opponentPal,
                challengerEquipmentEffects, opponentEquipmentEffects,
                challengerPotionEffects, opponentPotionEffects,
                challengerSkillTree, opponentSkillTree,
                challengerType, opponentType, client, combatEngine
            );

            // Display results
            await this.displayBattleResults(message, battleResult, challenger, opponent, client);
        } catch (error) {
            console.error('Error starting battle:', error);
            await message.channel.send({
                embeds: [createErrorEmbed("Battle Error", "An error occurred during the battle simulation.")],
            });
        }
    },

    async simulatePvPBattle(challenger, opponent, challengerPal, opponentPal,
               challengerEquipmentEffects, opponentEquipmentEffects,
               challengerPotionEffects, opponentPotionEffects,
               challengerSkillTree, opponentSkillTree,
               challengerType, opponentType, client, combatEngine) {
        try {
            const challengerUser = await client.users.fetch(challenger.id);
            const opponentUser = await client.users.fetch(opponent.id);
            
            const enhancedChallengerPal = await SkillManager.applySkillBonuses(
                challengerPal, 
                challengerSkillTree, 
                'pvp', 
                {}
            );
            const enhancedOpponentPal = await SkillManager.applySkillBonuses(
                opponentPal, 
                opponentSkillTree, 
                'pvp', 
                {}
            );
            
            let challengerHp = enhancedChallengerPal.stats.hp;
            let opponentHp = enhancedOpponentPal.stats.hp;
            
            if (!enhancedChallengerPal.statusEffects) enhancedChallengerPal.statusEffects = [];
            if (!enhancedOpponentPal.statusEffects) enhancedOpponentPal.statusEffects = [];
            
            combatEngine.logger.clear();
            combatEngine.logger.add(`🎯 **${challengerUser.displayName}'s ${challengerPal.nickname}** (${challengerType}) vs **${opponentUser.displayName}'s ${opponentPal.nickname}** (${opponentType})`);
            
            // Check for special Ability Potion triggers at start
            if (challengerPotionEffects.special?.ability === 'shadow_strike') {
                 combatEngine.logger.add(`🌑 **${challengerPal.nickname}** emerges from the shadows!`);
            }
            if (opponentPotionEffects.special?.ability === 'shadow_strike') {
                 combatEngine.logger.add(`🌑 **${opponentPal.nickname}** emerges from the shadows!`);
            }

            // Apply Skills (Abyssal, Terror, etc)
            this.applyStartOfBattleSkills(enhancedChallengerPal, enhancedOpponentPal, combatEngine);
            this.applyStartOfBattleSkills(enhancedOpponentPal, enhancedChallengerPal, combatEngine);
            
            combatEngine.logger.add("");
            
            let turn = 0;
            let challengerReviveUsed = false;
            let opponentReviveUsed = false;
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
                combatEngine.logger.add(`\n\n**--- Turn ${turn} ---**`);
                
                const challengerStatusResult = StatusEffectManager.processStatusEffects(
                    { 
                        ...enhancedChallengerPal, 
                        currentHp: challengerHp, 
                        maxHp: enhancedChallengerPal.stats.hp,
                        name: challengerPal.nickname
                    },
                    []
                );
                challengerHp = challengerStatusResult.creature.currentHp;
                enhancedChallengerPal.statusEffects = challengerStatusResult.creature.statusEffects;
                enhancedChallengerPal.stats = challengerStatusResult.creature.stats;
                combatEngine.logger.addMultiple(challengerStatusResult.battleLog);
                
                const opponentStatusResult = StatusEffectManager.processStatusEffects(
                    { 
                        ...enhancedOpponentPal, 
                        currentHp: opponentHp, 
                        maxHp: enhancedOpponentPal.stats.hp,
                        name: opponentPal.nickname
                    },
                    []
                );
                opponentHp = opponentStatusResult.creature.currentHp;
                enhancedOpponentPal.statusEffects = opponentStatusResult.creature.statusEffects;
                enhancedOpponentPal.stats = opponentStatusResult.creature.stats;
                combatEngine.logger.addMultiple(opponentStatusResult.battleLog);
                
                if (challengerHp <= 0 || opponentHp <= 0) break;
                
                const { TurnOrderManager } = require("../../utils/combat");
                const turnOrder = TurnOrderManager.calculate(
                    enhancedChallengerPal,
                    enhancedOpponentPal,
                    `${challengerUser.displayName}'s ${challengerPal.nickname}`,
                    `${opponentUser.displayName}'s ${opponentPal.nickname}`
                );
                
                const firstAttacker = turnOrder.first === enhancedChallengerPal ? {
                    pal: enhancedChallengerPal,
                    hp: challengerHp,
                    name: `${challengerUser.displayName}'s ${challengerPal.nickname}`,
                    type: challengerType,
                    equipment: challengerEquipmentEffects,
                    potion: challengerPotionEffects,
                    skillTree: challengerSkillTree,
                    statusResult: challengerStatusResult,
                    reviveUsed: challengerReviveUsed,
                    user: challengerUser
                } : {
                    pal: enhancedOpponentPal,
                    hp: opponentHp,
                    name: `${opponentUser.displayName}'s ${opponentPal.nickname}`,
                    type: opponentType,
                    equipment: opponentEquipmentEffects,
                    potion: opponentPotionEffects,
                    skillTree: opponentSkillTree,
                    statusResult: opponentStatusResult,
                    reviveUsed: opponentReviveUsed,
                    user: opponentUser
                };
                
                const secondAttacker = turnOrder.first === enhancedChallengerPal ? {
                    pal: enhancedOpponentPal,
                    hp: opponentHp,
                    name: `${opponentUser.displayName}'s ${opponentPal.nickname}`,
                    type: opponentType,
                    equipment: opponentEquipmentEffects,
                    potion: opponentPotionEffects,
                    skillTree: opponentSkillTree,
                    statusResult: opponentStatusResult,
                    reviveUsed: opponentReviveUsed,
                    user: opponentUser
                } : {
                    pal: enhancedChallengerPal,
                    hp: challengerHp,
                    name: `${challengerUser.displayName}'s ${challengerPal.nickname}`,
                    type: challengerType,
                    equipment: challengerEquipmentEffects,
                    potion: challengerPotionEffects,
                    skillTree: challengerSkillTree,
                    statusResult: challengerStatusResult,
                    reviveUsed: challengerReviveUsed,
                    user: challengerUser
                };
                
                if (firstAttacker.statusResult.canAct !== false && secondAttacker.hp > 0) {
                    const defenderParadoxState = turnOrder.first === enhancedChallengerPal ? opponentParadox : challengerParadox;
                    tryActivateParadox(secondAttacker.pal, secondAttacker.name, defenderParadoxState);
                    const attackBlocked = handleParadoxBlock(firstAttacker, secondAttacker, defenderParadoxState);

                    // Restore resonance stacks
                    if (firstAttacker.pal.skillBonuses?.resonanceStacks) {
                        firstAttacker.pal.resonanceStack = firstAttacker.pal === enhancedChallengerPal ? challengerResonanceStacks : opponentResonanceStacks;
                    }

                    if (!attackBlocked) {
                        const attackResult = combatEngine.executeAttack(
                            { ...firstAttacker.pal, currentHp: firstAttacker.hp },
                            { ...secondAttacker.pal, currentHp: secondAttacker.hp },
                            firstAttacker.type,
                            secondAttacker.type,
                            firstAttacker.equipment,
                            firstAttacker.potion,
                            {},
                            firstAttacker.name,
                            secondAttacker.name,
                            secondAttacker.equipment
                        );
                        
                        secondAttacker.hp = Math.max(0, secondAttacker.hp - attackResult.damage);

                        if (attackResult.hpSacrificed) {
                            firstAttacker.hp = Math.max(1, firstAttacker.hp - attackResult.hpSacrificed);
                        }

                        if (attackResult.resonanceStacks !== undefined) {
                            if (firstAttacker.pal === enhancedChallengerPal) {
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
                            // Logic for area damage visual logging could go here if party battle supported it
                        }
                        
                        if (secondAttacker.hp <= 0) {
                            const reviveCheck = combatEngine.handleDeath(secondAttacker.pal, secondAttacker.equipment, secondAttacker.reviveUsed);
                            if (reviveCheck) {
                                secondAttacker.hp = Math.floor(secondAttacker.pal.stats.hp * 0.3);
                                secondAttacker.reviveUsed = true;
                                combatEngine.logger.add(`🌟 **${secondAttacker.name}** refuses to fall!`);
                            } else {
                                combatEngine.logger.add(`💀 **${secondAttacker.name}** has been defeated!`);
                                
                                if (turnOrder.first === enhancedChallengerPal) {
                                    challengerHp = firstAttacker.hp;
                                    opponentHp = 0; 
                                } else {
                                    challengerHp = 0;
                                    opponentHp = firstAttacker.hp;
                                }
                                break;
                            }
                        }
                        combatEngine.logger.add(`❤️ *${secondAttacker.name} HP: ${secondAttacker.hp}/${secondAttacker.pal.stats.hp}*`);
                    }
                }
                
                if (secondAttacker.hp > 0 && firstAttacker.hp > 0 && secondAttacker.statusResult.canAct !== false) {
                    const defenderParadoxState = turnOrder.first === enhancedChallengerPal ? challengerParadox : opponentParadox;
                    tryActivateParadox(firstAttacker.pal, firstAttacker.name, defenderParadoxState);
                    const attackBlocked = handleParadoxBlock(secondAttacker, firstAttacker, defenderParadoxState);

                    if (!attackBlocked) {
                        const counterResult = combatEngine.executeAttack(
                            { ...secondAttacker.pal, currentHp: secondAttacker.hp },
                            { ...firstAttacker.pal, currentHp: firstAttacker.hp },
                            secondAttacker.type,
                            firstAttacker.type,
                            secondAttacker.equipment,
                            secondAttacker.potion,
                            {},
                            secondAttacker.name,
                            firstAttacker.name,
                            firstAttacker.equipment
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
                                
                                if (turnOrder.first === enhancedChallengerPal) {
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
                
                if (turnOrder.first === enhancedChallengerPal) {
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
                
                challengerHp = combatEngine.applyHealingEffects(enhancedChallengerPal, challengerHp, challengerPal.nickname);
                opponentHp = combatEngine.applyHealingEffects(enhancedOpponentPal, opponentHp, opponentPal.nickname);

                const challengerReflect = applyParadoxRecoil(
                    challengerParadox,
                    challengerHp,
                    opponentHp,
                    `${challengerUser.displayName}'s ${challengerPal.nickname}`,
                    `${opponentUser.displayName}'s ${opponentPal.nickname}`,
                    turn
                );
                challengerHp = challengerReflect.defenderHp;
                opponentHp = challengerReflect.attackerHp;

                const opponentReflect = applyParadoxRecoil(
                    opponentParadox,
                    opponentHp,
                    challengerHp,
                    `${opponentUser.displayName}'s ${opponentPal.nickname}`,
                    `${challengerUser.displayName}'s ${challengerPal.nickname}`,
                    turn
                );
                opponentHp = opponentReflect.defenderHp;
                challengerHp = opponentReflect.attackerHp;
                
                if (challengerHp > 0 && opponentHp > 0) {
                    combatEngine.logger.add(`\n💚 **${challengerPal.nickname}:** ${challengerHp}/${enhancedChallengerPal.stats.hp} HP | **${opponentPal.nickname}:** ${opponentHp}/${enhancedOpponentPal.stats.hp} HP`);
                }
            }
            
            if (turn >= COMBAT_CONFIG.MAX_TURNS) {
                combatEngine.logger.add("⏱️ The battle ended in a draw!");
            }
            
            let winnerId, winnerPal, loserPal, winnerRemainingHp;
            
            if (challengerHp > 0 && opponentHp <= 0) {
                winnerId = challenger.id;
                winnerPal = challengerPal;
                loserPal = opponentPal;
                winnerRemainingHp = challengerHp;
            } else if (opponentHp > 0 && challengerHp <= 0) {
                winnerId = opponent.id;
                winnerPal = opponentPal;
                loserPal = challengerPal;
                winnerRemainingHp = opponentHp;
            } else {
                winnerId = challenger.id;
                winnerPal = challengerPal;
                loserPal = opponentPal;
                winnerRemainingHp = challengerHp;
            }
            
            return {
                log: combatEngine.logger.getLog(),
                winnerId,
                winnerPal,
                loserPal,
                winnerRemainingHp,
            };
        } catch (error) {
            console.error('Error in PvP battle simulation:', error);
            return {
                log: "Battle simulation encountered an error.",
                winnerId: challenger.id,
                winnerPal: challengerPal,
                loserPal: opponentPal,
                winnerRemainingHp: 1,
            };
        }
    },

    applyStartOfBattleSkills(attacker, defender, combatEngine) {
        // Crushing Pressure (Abyssal)
        if (attacker.skillBonuses?.enemyAtkDown || attacker.skillBonuses?.enemySpdDown) {
            const atkReduction = attacker.skillBonuses.enemyAtkDown || 0;
            const spdReduction = attacker.skillBonuses.enemySpdDown || 0;
            if (atkReduction > 0 || spdReduction > 0) {
                const originalAtk = defender.stats.atk;
                const originalSpd = defender.stats.spd;
                defender.stats.atk = Math.floor(defender.stats.atk * (1 - atkReduction));
                defender.stats.spd = Math.floor(defender.stats.spd * (1 - spdReduction));
                const atkLost = originalAtk - defender.stats.atk;
                const spdLost = originalSpd - defender.stats.spd;
                combatEngine.logger.add(`🌊 **Crushing Pressure!** The abyss squeezes ${defender.nickname || 'Enemy'}!`);
                if (atkLost > 0) combatEngine.logger.add(`> ATK reduced by ${atkLost}`);
                if (spdLost > 0) combatEngine.logger.add(`> SPD reduced by ${spdLost}`);
            }
        }
        
        // Terror From Below (Abyssal)
        if (attacker.skillBonuses?.defReduction) {
            const defReduction = attacker.skillBonuses.defReduction;
            const originalDef = defender.stats.def;
            defender.stats.def = Math.floor(defender.stats.def * (1 - defReduction));
            const defLost = originalDef - defender.stats.def;
            if (defLost > 0) {
                combatEngine.logger.add(`😱 **Terror From Below!** ${attacker.nickname || 'Attacker'} strikes fear, reducing defenses!`);
                combatEngine.logger.add(`> DEF reduced by ${defLost}`);
            }
        }
    },

    calculateAreaDamage(pal) {
        if (pal.skillBonuses?.damage && pal.skillBonuses?.areaAttack) {
            return Math.floor(pal.stats.atk * (pal.skillBonuses.damage || 2.5) * 0.3);
        }
        if (pal.skillBonuses?.areaDamage) {
            return Math.floor(pal.stats.atk * pal.skillBonuses.areaDamage * 0.3);
        }
        return 0;
    },

    async displayBattleResults(message, battleResult, challenger, opponent, client) {
        try {
            const logs = this.splitBattleLog(battleResult.log);

            for (let i = 0; i < logs.length; i++) {
                const color = battleResult.winnerId === challenger.id ? "#4CAF50" : "#F44336";
                const title = i === 0 ? "⚔️ Battle Results" : `⚔️ Battle Results (${i + 1}/${logs.length})`;

                const resultEmbed = createCustomEmbed(title, logs[i], color);

                if (i === logs.length - 1) {
                    resultEmbed.addFields([
                        {
                            name: "🏆 Winner",
                            value: `<@${battleResult.winnerId}> and **${battleResult.winnerPal.nickname}**!`,
                            inline: true,
                        },
                        {
                            name: "📊 Final Stats",
                            value: `**${battleResult.winnerPal.nickname}:** ${battleResult.winnerRemainingHp}/${battleResult.winnerPal.stats.hp} HP\n` +
                                  `**${battleResult.loserPal.nickname}:** 0/${battleResult.loserPal.stats.hp} HP`,
                            inline: true,
                        },
                    ]);
                }

                await message.channel.send({ embeds: [resultEmbed] });

                if (i < logs.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            console.error('Error displaying battle results:', error);
            await message.channel.send({
                embeds: [createErrorEmbed("Display Error", "Error displaying battle results.")],
            });
        }
    },

    splitBattleLog(log, maxLength = 4000) {
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
    },

    // Updated to only extract active abilities from DB effects
    getPotionEffects(pal) {
        if (!pal.potionEffects || !Array.isArray(pal.potionEffects)) return {};

        const effects = {};
        
        // Iterate through active potion effects on the pal
        pal.potionEffects.forEach(effect => {
            // Stats are already applied to pal.stats, so we only look for ability flags
            if (effect.type === "special") {
                effects.special = {
                    ability: effect.ability,
                    chance: effect.chance || 0.25,
                    duration: effect.duration,
                };
            }
            
            if (effect.type === "multi_element") {
                effects.multi_element = {
                    elements: effect.elements || [],
                    damage_boost: effect.damage_boost || 0,
                    duration: effect.duration,
                };
            }
        });

        return effects;
    },
};

process.on('SIGINT', () => {
    battleSessionManager.destroy();
});

process.on('SIGTERM', () => {
    battleSessionManager.destroy();
});