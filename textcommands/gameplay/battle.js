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
const {
    CombatEngine,
    SkillManager,
    EquipmentManager,
    StatManager,
    COMBAT_CONFIG
} = require("../../utils/combat");
const { StatusEffectManager } = require("../../utils/statusEffects");

// Enhanced battle session management with better error handling
class BattleSessionManager {
    constructor() {
        this.sessions = new Map();
        this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60000); // Cleanup every minute
    }

    createSession(challengerId, opponentId) {
        const sessionId = `${challengerId}_${opponentId}_${Date.now()}`;
        const session = {
            id: sessionId,
            challenger: {
                id: challengerId,
                pal: null,
                potion: null,
                ready: false,
            },
            opponent: {
                id: opponentId,
                pal: null,
                potion: null,
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

// Global battle session manager
const battleSessionManager = new BattleSessionManager();

// Enhanced input validation
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
            
            // Validate challenger
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

            // Validate pet
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
                session.status = "potion_selection";
                await this.sendPotionSelectionMessage(message, session, client);
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
            // Validate mention
            const mentionValidation = BattleValidator.validateMention(message);
            if (!mentionValidation.valid) {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Target", mentionValidation.error)],
                });
            }

            const targetUser = mentionValidation.targetUser;

            // Validate opponent
            const opponentValidation = await BattleValidator.validatePlayer(targetUser.id);
            if (!opponentValidation.valid) {
                return message.reply({
                    embeds: [createErrorEmbed("Invalid Opponent", "The mentioned user hasn't started their adventure yet!")],
                });
            }

            // Check if players have available pets
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

            // Check for existing sessions
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

            // Create battle invitation
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
                    // Create battle session
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

    async sendPotionSelectionMessage(message, battleSession, client) {
        try {
            const challengerUser = await client.users.fetch(battleSession.challenger.id);
            const opponentUser = await client.users.fetch(battleSession.opponent.id);

            const selectionEmbed = createCustomEmbed(
                "🧪 Potion Selection Phase",
                `Both players have selected their pets!\n\n` +
                    `**${challengerUser.displayName}:** ${battleSession.challenger.pal.nickname} (Lvl ${battleSession.challenger.pal.level})\n` +
                    `**${opponentUser.displayName}:** ${battleSession.opponent.pal.nickname} (Lvl ${battleSession.opponent.pal.level})\n\n` +
                    `Now select your battle potions (optional) and click Ready!`,
                "#4ECDC4"
            );

            await message.channel.send({ embeds: [selectionEmbed] });

            // Send potion selection to both players
            await this.sendPotionMessage(message, battleSession.challenger.id, battleSession, client, true);
            await this.sendPotionMessage(message, battleSession.opponent.id, battleSession, client, false);
        } catch (error) {
            console.error('Error sending potion selection message:', error);
            battleSessionManager.deleteSession(battleSession.id);
        }
    },

    async sendPotionMessage(message, userId, battleSession, client, isChallenger) {
        try {
            const player = await Player.findOne({ userId });
            if (!player) return;

            // Get available battle potions
            const potions = player.inventory.filter((item) => {
                const itemData = GameData.getItem(item.itemId);
                return itemData && itemData.type === "potion" && itemData.usable === false && item.quantity > 0;
            });

            const potionOptions = [
                {
                    label: "No Potion",
                    description: "Fight without any potion boost",
                    value: "none",
                },
                ...potions.slice(0, 24).map((potion, index) => {
                    const itemData = GameData.getItem(potion.itemId);
                    return {
                        label: itemData.name,
                        description: itemData.description.substring(0, 100),
                        value: `${potion.itemId}_${index}`,
                    };
                }),
            ];

            const playerData = isChallenger ? battleSession.challenger : battleSession.opponent;
            const preparationEmbed = createCustomEmbed(
                "⚔️ Battle Preparation",
                `Your **${playerData.pal.nickname}** is ready for battle!\n` +
                    `Select a battle potion to enhance your Pal's abilities.\n\n` +
                    `**Available Battle Potions:** ${potions.length}`,
                "#4ECDC4"
            );

            const components = [];

            if (potionOptions.length > 1) {
                const potionSelect = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`select_battle_potion_${userId}`)
                        .setPlaceholder("Choose a battle potion (optional)")
                        .addOptions(potionOptions)
                );
                components.push(potionSelect);
            }

            const readyButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ready_for_battle_${userId}`)
                    .setLabel("Ready for Battle!")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("⚔️")
            );
            components.push(readyButton);

            const preparationMessage = await message.channel.send({
                content: `<@${userId}>`,
                embeds: [preparationEmbed],
                components: components,
            });

            const preparationCollector = preparationMessage.createMessageComponentCollector({
                filter: (i) => i.user.id === userId,
                time: 5 * 60 * 1000,
            });

            preparationCollector.on("collect", async (interaction) => {
                try {
                    if (interaction.customId === `select_battle_potion_${userId}`) {
                        await this.handlePotionSelection(interaction, battleSession, isChallenger);
                    }

                    if (interaction.customId === `ready_for_battle_${userId}`) {
                        await this.handlePlayerReady(interaction, battleSession, isChallenger, message, client);
                    }
                } catch (error) {
                    console.error('Error handling preparation interaction:', error);
                    await interaction.followUp({
                        embeds: [createErrorEmbed("Error", "An error occurred while processing your selection.")],
                        ephemeral: true,
                    }).catch(() => {});
                }
            });

            preparationCollector.on("end", () => {
                preparationMessage.edit({ components: [] }).catch(() => {});
            });
        } catch (error) {
            console.error('Error sending potion message:', error);
        }
    },

    async handlePotionSelection(interaction, battleSession, isChallenger) {
        const selectedPotionId = interaction.values[0];
        const [itemId] = selectedPotionId.split("_");
        const selectedPotion = selectedPotionId === "none" ? null : GameData.getItem(itemId);

        if (isChallenger) {
            battleSession.challenger.potion = selectedPotion;
        } else {
            battleSession.opponent.potion = selectedPotion;
        }

        const potionName = selectedPotion ? selectedPotion.name : "No Potion";
        await interaction.reply({
            content: `✅ Selected **${potionName}** for battle!`,
            ephemeral: true,
        });
    },

    async handlePlayerReady(interaction, battleSession, isChallenger, message, client) {
        if (isChallenger) {
            battleSession.challenger.ready = true;
        } else {
            battleSession.opponent.ready = true;
        }

        await interaction.update({
            components: interaction.message.components.map((row) => {
                const newRow = ActionRowBuilder.from(row);
                newRow.components.forEach((component) => {
                    if (component.data.custom_id === `ready_for_battle_${interaction.user.id}`) {
                        component.setDisabled(true).setLabel("Ready!").setStyle(ButtonStyle.Secondary);
                    }
                });
                return newRow;
            }),
        });

        // Check if both players are ready
        if (battleSession.challenger.ready && battleSession.opponent.ready) {
            await this.startBattle(message, battleSession, client);
            battleSessionManager.deleteSession(battleSession.id);
        }
    },

    async startBattle(message, battleSession, client) {
        try {
            const { challenger, opponent } = battleSession;

            // Apply potion effects
            const challengerPal = this.applyPotionEffects(challenger.pal, challenger.potion);
            const opponentPal = this.applyPotionEffects(opponent.pal, opponent.potion);

            // Get equipment effects
            const challengerEquipmentEffects = EquipmentManager.getEffects(challenger.pal.equipment);
            const opponentEquipmentEffects = EquipmentManager.getEffects(opponent.pal.equipment);

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
                challenger, opponent, challengerPal, opponentPal,
                challengerEquipmentEffects, opponentEquipmentEffects,
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
            
            const challengerPotionEffects = this.getPotionEffects(challenger.potion);
            const opponentPotionEffects = this.getPotionEffects(opponent.potion);
            
            combatEngine.logger.clear();
            combatEngine.logger.add(`🎯 **${challengerUser.displayName}'s ${challengerPal.nickname}** (${challengerType}) vs **${opponentUser.displayName}'s ${opponentPal.nickname}** (${opponentType})`);
            
            // Apply Crushing Pressure (Abyssal skill) - reduces opponent's ATK and SPD
            if (enhancedChallengerPal.skillBonuses?.enemyAtkDown || enhancedChallengerPal.skillBonuses?.enemySpdDown) {
                const atkReduction = enhancedChallengerPal.skillBonuses.enemyAtkDown || 0;
                const spdReduction = enhancedChallengerPal.skillBonuses.enemySpdDown || 0;
                if (atkReduction > 0 || spdReduction > 0) {
                    const originalAtk = enhancedOpponentPal.stats.atk;
                    const originalSpd = enhancedOpponentPal.stats.spd;
                    enhancedOpponentPal.stats.atk = Math.floor(enhancedOpponentPal.stats.atk * (1 - atkReduction));
                    enhancedOpponentPal.stats.spd = Math.floor(enhancedOpponentPal.stats.spd * (1 - spdReduction));
                    const atkLost = originalAtk - enhancedOpponentPal.stats.atk;
                    const spdLost = originalSpd - enhancedOpponentPal.stats.spd;
                    combatEngine.logger.add(`🌊 **Crushing Pressure!** The abyss squeezes ${opponentPal.nickname}!`);
                    if (atkLost > 0) {
                        combatEngine.logger.add(`${opponentPal.nickname}'s ATK reduced by ${atkLost} (${originalAtk} → ${enhancedOpponentPal.stats.atk})`);
                    }
                    if (spdLost > 0) {
                        combatEngine.logger.add(`${opponentPal.nickname}'s SPD reduced by ${spdLost} (${originalSpd} → ${enhancedOpponentPal.stats.spd})`);
                    }
                }
            }
            
            // Apply Crushing Pressure from opponent to challenger
            if (enhancedOpponentPal.skillBonuses?.enemyAtkDown || enhancedOpponentPal.skillBonuses?.enemySpdDown) {
                const atkReduction = enhancedOpponentPal.skillBonuses.enemyAtkDown || 0;
                const spdReduction = enhancedOpponentPal.skillBonuses.enemySpdDown || 0;
                if (atkReduction > 0 || spdReduction > 0) {
                    const originalAtk = enhancedChallengerPal.stats.atk;
                    const originalSpd = enhancedChallengerPal.stats.spd;
                    enhancedChallengerPal.stats.atk = Math.floor(enhancedChallengerPal.stats.atk * (1 - atkReduction));
                    enhancedChallengerPal.stats.spd = Math.floor(enhancedChallengerPal.stats.spd * (1 - spdReduction));
                    const atkLost = originalAtk - enhancedChallengerPal.stats.atk;
                    const spdLost = originalSpd - enhancedChallengerPal.stats.spd;
                    combatEngine.logger.add(`🌊 **Crushing Pressure!** The abyss squeezes ${challengerPal.nickname}!`);
                    if (atkLost > 0) {
                        combatEngine.logger.add(`${challengerPal.nickname}'s ATK reduced by ${atkLost} (${originalAtk} → ${enhancedChallengerPal.stats.atk})`);
                    }
                    if (spdLost > 0) {
                        combatEngine.logger.add(`${challengerPal.nickname}'s SPD reduced by ${spdLost} (${originalSpd} → ${enhancedChallengerPal.stats.spd})`);
                    }
                }
            }
            
            // Apply Terror From Below (defReduction) - reduces opponent's defense
            if (enhancedChallengerPal.skillBonuses?.defReduction) {
                const defReduction = enhancedChallengerPal.skillBonuses.defReduction;
                const originalDef = enhancedOpponentPal.stats.def;
                enhancedOpponentPal.stats.def = Math.floor(enhancedOpponentPal.stats.def * (1 - defReduction));
                const defLost = originalDef - enhancedOpponentPal.stats.def;
                if (defLost > 0) {
                    combatEngine.logger.add(`😱 **Terror From Below!** ${challengerPal.nickname} strikes fear into ${opponentPal.nickname}, reducing their defenses!`);
                    combatEngine.logger.add(`> ${opponentPal.nickname}'s DEF reduced by ${defLost} (${originalDef} → ${enhancedOpponentPal.stats.def})`);
                }
            }
            
            // Apply Terror From Below from opponent to challenger
            if (enhancedOpponentPal.skillBonuses?.defReduction) {
                const defReduction = enhancedOpponentPal.skillBonuses.defReduction;
                const originalDef = enhancedChallengerPal.stats.def;
                enhancedChallengerPal.stats.def = Math.floor(enhancedChallengerPal.stats.def * (1 - defReduction));
                const defLost = originalDef - enhancedChallengerPal.stats.def;
                if (defLost > 0) {
                    combatEngine.logger.add(`😱 **Terror From Below!** ${opponentPal.nickname} strikes fear into ${challengerPal.nickname}, reducing their defenses!`);
                    combatEngine.logger.add(`> ${challengerPal.nickname}'s DEF reduced by ${defLost} (${originalDef} → ${enhancedChallengerPal.stats.def})`);
                }
            }
            
            if (challenger.potion) {
                combatEngine.logger.add(`💉 ${challengerUser.displayName}'s ${challengerPal.nickname} uses ${challenger.potion.name}!`);
            }
            if (opponent.potion) {
                combatEngine.logger.add(`💉 ${opponentUser.displayName}'s ${opponentPal.nickname} uses ${opponent.potion.name}!`);
            }
            combatEngine.logger.add("");
            
            let turn = 0;
            let challengerReviveUsed = false;
            let opponentReviveUsed = false;
            const createParadoxState = () => ({
                active: false,
                pendingRecoil: false,
                storedDamage: 0,
                recoilPercent: 0.5
            });
            const challengerParadox = createParadoxState();
            const opponentParadox = createParadoxState();

            const applyParadoxRecoil = (state, currentHp, palLabel) => {
                if (!state.pendingRecoil) return currentHp;
                if (state.storedDamage > 0) {
                    combatEngine.logger.add(`⏰ **Temporal Recoil!** ${palLabel} takes ${state.storedDamage} delayed damage!`);
                    currentHp = Math.max(0, currentHp - state.storedDamage);
                }
                state.storedDamage = 0;
                state.pendingRecoil = false;
                return currentHp;
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
                // combatEngine.logger.add(`🔮 **${defenderCtx.name}** exists outside of time - attacks pass through harmlessly!`);
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
                // CRITICAL FIX: Apply modified stats back to the creature for damage calculation
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
                // CRITICAL FIX: Apply modified stats back to the creature for damage calculation
                enhancedOpponentPal.stats = opponentStatusResult.creature.stats;
                combatEngine.logger.addMultiple(opponentStatusResult.battleLog);
                
                challengerHp = applyParadoxRecoil(
                    challengerParadox,
                    challengerHp,
                    `${challengerUser.displayName}'s ${challengerPal.nickname}`
                );
                opponentHp = applyParadoxRecoil(
                    opponentParadox,
                    opponentHp,
                    `${opponentUser.displayName}'s ${opponentPal.nickname}`
                );
                
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
                    reviveUsed: challengerReviveUsed
                } : {
                    pal: enhancedOpponentPal,
                    hp: opponentHp,
                    name: `${opponentUser.displayName}'s ${opponentPal.nickname}`,
                    type: opponentType,
                    equipment: opponentEquipmentEffects,
                    potion: opponentPotionEffects,
                    skillTree: opponentSkillTree,
                    statusResult: opponentStatusResult,
                    reviveUsed: opponentReviveUsed
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
                    reviveUsed: opponentReviveUsed
                } : {
                    pal: enhancedChallengerPal,
                    hp: challengerHp,
                    name: `${challengerUser.displayName}'s ${challengerPal.nickname}`,
                    type: challengerType,
                    equipment: challengerEquipmentEffects,
                    potion: challengerPotionEffects,
                    skillTree: challengerSkillTree,
                    statusResult: challengerStatusResult,
                    reviveUsed: challengerReviveUsed
                };
                
                if (firstAttacker.statusResult.canAct !== false && secondAttacker.hp > 0) {
                    const defenderParadoxState = turnOrder.first === enhancedChallengerPal ? opponentParadox : challengerParadox;
                    tryActivateParadox(secondAttacker.pal, secondAttacker.name, defenderParadoxState);
                    const attackBlocked = handleParadoxBlock(firstAttacker, secondAttacker, defenderParadoxState);

                    if (!attackBlocked) {
                        const attackResult = combatEngine.executeAttack(
                            firstAttacker.pal,
                            secondAttacker.pal,
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
                        firstAttacker.hp = Math.min(firstAttacker.pal.stats.hp, firstAttacker.hp + (attackResult.lifesteal || 0));
                        
                        if (attackResult.counterDamage > 0) {
                            firstAttacker.hp = Math.max(0, firstAttacker.hp - attackResult.counterDamage);
                            combatEngine.logger.add(`💥 **Reflected damage:** ${firstAttacker.name} takes **${attackResult.counterDamage}** damage!`);
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
                                targetIsChallenger: turnOrder.first !== enhancedChallengerPal
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
                                
                                // Update HP before breaking - CRITICAL FIX
                                if (turnOrder.first === enhancedChallengerPal) {
                                    challengerHp = firstAttacker.hp;
                                    opponentHp = 0; // secondAttacker is opponent, they're defeated
                                } else {
                                    challengerHp = 0; // secondAttacker is challenger, they're defeated
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
                            secondAttacker.pal,
                            firstAttacker.pal,
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
                        secondAttacker.hp = Math.min(secondAttacker.pal.stats.hp, secondAttacker.hp + (counterResult.lifesteal || 0));
                        
                        if (counterResult.counterDamage > 0) {
                            firstAttacker.hp = Math.max(0, firstAttacker.hp - counterResult.counterDamage);
                            combatEngine.logger.add(`💥 **Reflected damage:** ${firstAttacker.name} takes **${counterResult.counterDamage}** damage!`);
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
                                
                                // Update HP before breaking - CRITICAL FIX
                                if (turnOrder.first === enhancedChallengerPal) {
                                    challengerHp = 0; // firstAttacker is challenger, they're defeated
                                    opponentHp = secondAttacker.hp;
                                } else {
                                    challengerHp = secondAttacker.hp;
                                    opponentHp = 0; // firstAttacker is opponent, they're defeated
                                }
                                break;
                            }
                        }
                        combatEngine.logger.add(`❤️ *${firstAttacker.name} HP: ${firstAttacker.hp}/${firstAttacker.pal.stats.hp}*`);
                    }
                }
                
                // Update HP values after normal turn completion
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
                
                // Display HP after each turn
                if (challengerHp > 0 && opponentHp > 0) {
                    combatEngine.logger.add(`\n💚 **${challengerPal.nickname}:** ${challengerHp}/${enhancedChallengerPal.stats.hp} HP | **${opponentPal.nickname}:** ${opponentHp}/${enhancedOpponentPal.stats.hp} HP`);
                }
            }
            
            if (turn >= COMBAT_CONFIG.MAX_TURNS) {
                combatEngine.logger.add("⏱️ The battle ended in a draw!");
            }
            
            // FIXED: Properly determine winner based on who has HP > 0
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
                // Draw or both dead
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

    async executeFullAttack(attacker, defender, attackerType, defenderType, 
                       attackerEquipmentEffects, defenderEquipmentEffects,
                       potionEffects, attackerName, defenderName, combatEngine) {
        try {
            const attackResult = combatEngine.executeAttack(
                attacker, defender, attackerType, defenderType,
                attackerEquipmentEffects, potionEffects, {},
                attackerName, defenderName
            );
            
            let totalDamage = attackResult.damage;
            let lifesteal = attackResult.lifesteal;
            let statusEffects = [];
            let counterStatusEffects = [];
            
            // Process defensive equipment effects
            const { EquipmentEffectProcessor } = require("../../utils/combat");
            const defensiveResult = EquipmentEffectProcessor.processDefensive(
                defender, defenderEquipmentEffects, defenderName, totalDamage, combatEngine.logger
            );
            
            // Reduce damage by defensive effects
            totalDamage = Math.max(0, totalDamage - defensiveResult.damageReduction);
            
            // Add counter status effects from defender's equipment
            counterStatusEffects = counterStatusEffects.concat(defensiveResult.statusEffects);
            
            return {
                totalDamage,
                lifesteal,
                statusEffects,
                counterStatusEffects
            };
        } catch (error) {
            console.error('Error in executeFullAttack:', error);
            return {
                totalDamage: 1,
                lifesteal: 0,
                statusEffects: [],
                counterStatusEffects: []
            };
        }
    },

    calculateAreaDamage(pal) {
        // For 1v1 battles, area damage is not applicable, but we calculate it for logging purposes
        // Elemental storm
        if (pal.skillBonuses?.damage && pal.skillBonuses?.areaAttack) {
            return Math.floor(pal.stats.atk * (pal.skillBonuses.damage || 2.5) * 0.3);
        }
        
        // Abyssal devourer
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

    applyPotionEffects(pal, potion) {
        if (!potion) return StatManager.cloneCreature(pal);

        try {
            const enhancedPal = StatManager.cloneCreature(pal);
            const effect = potion.effect;

            if (!effect) return enhancedPal;

            switch (effect.type) {
                case "heal":
                    enhancedPal.stats.hp += effect.value;
                    break;
                    
                case "stat_boost":
                    // Handle both formats: { stat: 'atk', value: 10 } or { stats: { atk: 10 } }
                    if (effect.stats) {
                        // New format: stats object
                        Object.entries(effect.stats).forEach(([stat, value]) => {
                            if (enhancedPal.stats[stat] !== undefined) {
                                enhancedPal.stats[stat] += value;
                            }
                        });
                    } else if (effect.stat && effect.value !== undefined) {
                        // Old format: stat and value
                        if (enhancedPal.stats[effect.stat] !== undefined) {
                            enhancedPal.stats[effect.stat] += effect.value;
                        }
                    }
                    break;
                    
                case "multi_boost":
                    Object.entries(effect.stats || {}).forEach(([stat, value]) => {
                        if (enhancedPal.stats[stat] !== undefined) {
                            enhancedPal.stats[stat] += value;
                        }
                    });
                    break;
                    
                case "trade_boost":
                    // Apply gains
                    Object.entries(effect.gain || {}).forEach(([stat, value]) => {
                        if (enhancedPal.stats[stat] !== undefined) {
                            enhancedPal.stats[stat] += value;
                        }
                    });
                    // Apply losses
                    Object.entries(effect.lose || {}).forEach(([stat, value]) => {
                        if (enhancedPal.stats[stat] !== undefined) {
                            enhancedPal.stats[stat] -= value;
                        }
                    });
                    break;
                    
                case "resistance":
                    if (!enhancedPal.resistances) enhancedPal.resistances = {};
                    enhancedPal.resistances[effect.element] = 
                        (enhancedPal.resistances[effect.element] || 0) + effect.value;
                    break;
                    
                case "familiar_type_boost":
                    const palData = GameData.getPet(pal.basePetId);
                    const palType = palData?.type || "Beast";
                    if (palType.toLowerCase() === effect.target.toLowerCase()) {
                        Object.entries(effect.stats || {}).forEach(([stat, value]) => {
                            if (enhancedPal.stats[stat] !== undefined) {
                                enhancedPal.stats[stat] += value;
                            }
                        });
                    }
                    break;
                    
                case "special":
                    // Special abilities handled in getPotionEffects
                    // But apply bonus stats here
                    if (effect.bonus_luck) {
                        enhancedPal.stats.luck = (enhancedPal.stats.luck || 0) + effect.bonus_luck;
                    }
                    if (effect.crit_bonus) {
                        enhancedPal.stats.luck = (enhancedPal.stats.luck || 0) + effect.crit_bonus;
                    }
                    break;
            }

            // Ensure stats remain valid
            enhancedPal.stats = StatManager.validateStats(enhancedPal.stats);
            return enhancedPal;
        } catch (error) {
            console.error("Error applying potion effects:", error);
            return StatManager.cloneCreature(pal);
        }
    },

    getPotionEffects(potion) {
        if (!potion?.effect) return {};

        const effects = {};
        const effect = potion.effect;

        if (effect.type === "special") {
            effects.special = {
                ability: effect.ability,
                chance: effect.chance || 0.25,
                duration: effect.duration,
            };
            // Handle bonus stats from special effects
            if (effect.bonus_luck) {
                effects.bonus_luck = effect.bonus_luck;
            }
            if (effect.crit_bonus) {
                effects.crit_bonus = effect.crit_bonus;
            }
        }
        
        // Handle multi_element type
        if (effect.type === "multi_element") {
            effects.multi_element = {
                elements: effect.elements || [],
                damage_boost: effect.damage_boost || 0,
                duration: effect.duration,
            };
        }

        return effects;
    },
};

// Graceful shutdown handling
process.on('SIGINT', () => {
    battleSessionManager.destroy();
});

process.on('SIGTERM', () => {
    battleSessionManager.destroy();
});