
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const Egg = require('../../models/Egg');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const { updateQuestProgress } = require('../../utils/questSystem');
const LabManager = require('../../utils/labManager');
const allSkillTrees = require('../../gamedata/skillTrees');
const config = require('../../config/config.json');
const e = require('../../utils/emojis');

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const BREEDING_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RARITY_GAP = 2; // Max tier difference allowed
const BREED_COLOR = 0xE91E63; // Pink

// ── Text Content Builders ──────────────────────────────────────────

function buildPenStatusText(player, pet1, pet2, pet1Data, pet2Data, prefix) {
    const penEmoji = config.emojis['Breeding Pen'] || '🏠';
    let text = `## ${penEmoji} Breeding Pen\n`;

    if (!pet1 || !pet2) {
        text += `### 📭 Empty Pen\n`;
        text += `Place two pals to start breeding.\n\n`;
        text += `-# Use the **Add Pets** button or \`${prefix}breed add <id1> <id2>\``;
        return text;
    }

    const pet1Emoji = config.emojis[pet1Data.name] || '🐾';
    const pet2Emoji = config.emojis[pet2Data.name] || '🐾';
    const r1Emoji = config.emojis[pet1Data.rarity] || '';
    const r2Emoji = config.emojis[pet2Data.rarity] || '';

    // Pet 1 display
    text += `${pet1Emoji} **${pet1Data.name}** #${pet1.shortId}  ${r1Emoji}\n`;
    text += `-# Lv.${pet1.level} • ${pet1Data.type}\n\n`;

    // Status display
    if (player.breedingSlot.finishesAt) {
        const now = new Date();
        const timeLeft = player.breedingSlot.finishesAt - now;

        if (timeLeft <= 0) {
            text += `### ✨ Ready to Collect!\n`;
            text += `-# Press **Claim Egg** to collect your new egg\n\n`;
        } else {
            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            text += `### 💕 Breeding in progress...\n`;
            text += `⏳ **${hoursLeft}h ${minutesLeft}m** remaining\n\n`;
        }
    } else {
        text += `### 💫 Getting to know each other...\n\n`;
    }

    // Pet 2 display
    text += `${pet2Emoji} **${pet2Data.name}** #${pet2.shortId}  ${r2Emoji}\n`;
    text += `-# Lv.${pet2.level} • ${pet2Data.type}`;

    return text;
}

function buildPet1SelectText(prefix) {
    const penEmoji = config.emojis['Breeding Pen'] || '🏠';
    return (
        `## ${penEmoji} Breeding Pen\n` +
        `### Select First Pet\n` +
        `Choose a pal from the dropdown below.\n\n` +
        `-# ⏱️ 24h cooldown per pet  •  Max 2 rarity tier gap  •  Lv.5+`
    );
}

function buildPet2SelectText(pet1, pet1Data) {
    const penEmoji = config.emojis['Breeding Pen'] || '🏠';
    const pet1Emoji = config.emojis[pet1Data.name] || '🐾';
    const r1Emoji = config.emojis[pet1Data.rarity] || '';
    return (
        `## ${penEmoji} Breeding Pen\n` +
        `### Select Second Pet\n` +
        `${pet1Emoji} **${pet1Data.name}** #${pet1.shortId} ${r1Emoji} is waiting...\n\n` +
        `Now pick a partner from below.`
    );
}

function buildBreedingStartedText(pet1, pet2, pet1Data, pet2Data, timeStr) {
    const penEmoji = config.emojis['Breeding Pen'] || '🏠';
    const pet1Emoji = config.emojis[pet1Data.name] || '🐾';
    const pet2Emoji = config.emojis[pet2Data.name] || '🐾';
    const r1Emoji = config.emojis[pet1Data.rarity] || '';
    const r2Emoji = config.emojis[pet2Data.rarity] || '';

    return (
        `## ${penEmoji} Breeding Started!\n\n` +
        `${pet1Emoji} **${pet1Data.name}** #${pet1.shortId} ${r1Emoji}\n` +
        `-# Lv.${pet1.level} • ${pet1Data.type}\n\n` +
        `### 💕 Pets placed in pen!\n` +
        `⏳ **${timeStr}** breeding time\n\n` +
        `${pet2Emoji} **${pet2Data.name}** #${pet2.shortId} ${r2Emoji}\n` +
        `-# Lv.${pet2.level} • ${pet2Data.type}`
    );
}

function buildClaimText(pet1Data, pet2Data, pet1, pet2, eggItem, nextEggId, inheritCount, bonusEggMsg) {
    const penEmoji = config.emojis['Breeding Pen'] || '🏠';
    const pet1Emoji = config.emojis[pet1Data.name] || '🐾';
    const pet2Emoji = config.emojis[pet2Data.name] || '🐾';
    const eggEmoji = config.emojis[eggItem.name] || '🥚';
    const inheritMsg = inheritCount > 0 ? `\n🧬 **${inheritCount} inherited skill${inheritCount > 1 ? 's' : ''}** from parents!` : '';

    return (
        `## ${penEmoji} Breeding Complete!\n\n` +
        `${pet1Emoji} **${pet1Data.name}** #${pet1.shortId}  +  ${pet2Emoji} **${pet2Data.name}** #${pet2.shortId}\n\n` +
        `### ${eggEmoji} ${eggItem.name}\n` +
        `**Egg ID:** #${nextEggId}${inheritMsg}${bonusEggMsg}\n\n` +
        `-# Use \`incubate\` to hatch this egg!`
    );
}

function buildRemovedText(pet1, pet2, pet1Data, pet2Data) {
    const penEmoji = config.emojis['Breeding Pen'] || '🏠';
    const pet1Emoji = pet1Data ? (config.emojis[pet1Data.name] || '🐾') : '🐾';
    const pet2Emoji = pet2Data ? (config.emojis[pet2Data.name] || '🐾') : '🐾';

    return (
        `## ${penEmoji} Pets Removed\n\n` +
        `${pet1Emoji} **${pet1Data?.name || 'Pet'}** #${pet1?.shortId || '?'}  &  ` +
        `${pet2Emoji} **${pet2Data?.name || 'Pet'}** #${pet2?.shortId || '?'}\n\n` +
        `-# Pets returned to idle. The pen is now empty.`
    );
}

// ── Container Builders ─────────────────────────────────────────────

function buildStatusContainer(player, pet1, pet2, pet1Data, pet2Data, prefix) {
    const container = new ContainerBuilder().setAccentColor(BREED_COLOR);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            buildPenStatusText(player, pet1, pet2, pet1Data, pet2Data, prefix)
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Action buttons based on state
    const buttons = [];

    if (pet1 && pet2 && player.breedingSlot.finishesAt) {
        const now = new Date();
        const isReady = now >= player.breedingSlot.finishesAt;

        buttons.push(
            new ButtonBuilder()
                .setCustomId('breed_claim')
                .setLabel(isReady ? 'Claim Egg' : 'Not Ready')
                .setStyle(isReady ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(!isReady)
                .setEmoji(isReady ? '🥚' : '⏳')
        );

        buttons.push(
            new ButtonBuilder()
                .setCustomId('breed_remove')
                .setLabel('Remove')
                .setStyle(ButtonStyle.Danger)
                .setEmoji(e.error)
        );
    } else if (pet1 && pet2) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('breed_remove')
                .setLabel('Remove Pets')
                .setStyle(ButtonStyle.Danger)
                .setEmoji(e.error)
        );
    } else {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('breed_add')
                .setLabel('Add Pets')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🐾')
        );
    }

    buttons.push(
        new ButtonBuilder()
            .setCustomId('breed_refresh')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(e.reload)
    );

    container.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# ⏱️ 24h cooldown per pet  •  Max 2 rarity tier gap  •  Lv.5+`
        )
    );

    return container;
}

function buildPet1SelectContainer(playerPets) {
    const container = new ContainerBuilder().setAccentColor(BREED_COLOR);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(buildPet1SelectText())
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const petOptions = playerPets.slice(0, 25).map(pet => {
        const petData = GameData.getPet(pet.basePetId);
        const petEmoji = config.emojis[petData.name];
        const opt = {
            label: `${petData.name} #${pet.shortId} (Lv.${pet.level})`,
            value: pet.shortId.toString(),
            description: `${petData.type} • ${petData.rarity}`
        };
        if (petEmoji) opt.emoji = petEmoji;
        return opt;
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('breed_select_pet1')
        .setPlaceholder('🐾 Select first pet...')
        .addOptions(petOptions);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('breed_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.error)
        )
    );

    return container;
}

function buildPet2SelectContainer(pet1, pet1Data, remainingPets) {
    const container = new ContainerBuilder().setAccentColor(BREED_COLOR);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(buildPet2SelectText(pet1, pet1Data))
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const petOptions = remainingPets.slice(0, 25).map(pet => {
        const petData = GameData.getPet(pet.basePetId);
        const petEmoji = config.emojis[petData.name];
        const opt = {
            label: `${petData.name} #${pet.shortId} (Lv.${pet.level})`,
            value: pet.shortId.toString(),
            description: `${petData.type} • ${petData.rarity}`
        };
        if (petEmoji) opt.emoji = petEmoji;
        return opt;
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('breed_select_pet2')
        .setPlaceholder('🐾 Select second pet...')
        .addOptions(petOptions);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('breed_back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.previous),
            new ButtonBuilder()
                .setCustomId('breed_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.error)
        )
    );

    return container;
}

function buildResultContainer(text, color) {
    const container = new ContainerBuilder().setAccentColor(color || BREED_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return container;
}

// ── Main Command ───────────────────────────────────────────────────

module.exports = {
    name: "breed",
    description: "Manage your breeding pen to breed pets and create eggs.",
    cooldown: 15,
    aliases: ['breeding'],
    usage: '[add <pet1 id> <pet2 id>] | [claim] | [remove] | [status]',

    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            const breedingPen = CommandHelpers.hasItem(player, 'breeding_pen');
            if (!breedingPen) {
                return message.reply({
                    embeds: [createErrorEmbed(
                        'No Breeding Pen',
                        `You need to craft a **Breeding Pen** first! \nUse \`${prefix}research\` to discover it's recipe, then use \`${prefix}craft\` to craft it.`
                    )] 
                });
            }

            const { effects: labEffects } = await LabManager.getLabData(message.author.id);

            // ── Direct CLI subcommands (kept for quick use) ──
            const sub = (args[0] || '').toLowerCase();

            if (sub === 'add' && args.length >= 3) {
                const shortId1 = parseInt(args[1]);
                const shortId2 = parseInt(args[2]);
                return this.performAddPets(message, player, shortId1, shortId2, prefix, labEffects);
            }

            if (sub === 'claim') {
                return this.performClaim(message, player, client, prefix, labEffects);
            }

            if (sub === 'remove') {
                return this.performRemove(message, player, prefix);
            }

            // ── Interactive V2 Panel ──
            return this.showPanel(message, player, client, prefix, labEffects);

        } catch (error) {
            console.error('Breed command error:', error);
            message.reply({
                embeds: [createErrorEmbed(
                    "An Error Occurred", 
                    "There was a problem accessing your breeding pen."
                )]
            });
        }
    },

    async showPanel(message, player, client, prefix, labEffects) {
        // Load current pen state
        let pet1 = null, pet2 = null, pet1Data = null, pet2Data = null;
        if (player.breedingSlot && player.breedingSlot.pet1Id && player.breedingSlot.pet2Id) {
            pet1 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet1Id });
            pet2 = await Pet.findOne({ ownerId: message.author.id, shortId: player.breedingSlot.pet2Id });
            if (pet1) pet1Data = GameData.getPet(pet1.basePetId);
            if (pet2) pet2Data = GameData.getPet(pet2.basePetId);
            if (!pet1 || !pet2) {
                player.breedingSlot = { pet1Id: null, pet2Id: null, finishesAt: null };
                await player.save();
                pet1 = pet2 = pet1Data = pet2Data = null;
            }
        }

        const container = buildStatusContainer(player, pet1, pet2, pet1Data, pet2Data, prefix);

        const reply = await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        // ── Collector ──
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120_000
        });

        let selectedPet1 = null;
        let playerPets = null;

        collector.on('collect', async (interaction) => {
            try {
                // Reload player data fresh
                const fp = (await CommandHelpers.validatePlayer(message.author.id, prefix)).player;
                const { effects: freshEffects } = await LabManager.getLabData(message.author.id);

                // ── REFRESH ──
                if (interaction.customId === 'breed_refresh') {
                    let p1 = null, p2 = null, p1d = null, p2d = null;
                    if (fp.breedingSlot && fp.breedingSlot.pet1Id && fp.breedingSlot.pet2Id) {
                        p1 = await Pet.findOne({ ownerId: message.author.id, shortId: fp.breedingSlot.pet1Id });
                        p2 = await Pet.findOne({ ownerId: message.author.id, shortId: fp.breedingSlot.pet2Id });
                        if (p1) p1d = GameData.getPet(p1.basePetId);
                        if (p2) p2d = GameData.getPet(p2.basePetId);
                    }
                    const c = buildStatusContainer(fp, p1, p2, p1d, p2d, prefix);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                }

                // ── ADD PETS (open pet 1 selection) ──
                else if (interaction.customId === 'breed_add') {
                    playerPets = await Pet.find({
                        ownerId: message.author.id,
                        status: 'Idle',
                        level: { $gte: 5 }
                    }).sort({ shortId: 1 });

                    if (playerPets.length < 2) {
                        await interaction.reply({ content: `${e.error} You need at least 2 idle pets at Lv.5+ to breed!`, flags: MessageFlags.Ephemeral });
                        return;
                    }
                    selectedPet1 = null;
                    const c = buildPet1SelectContainer(playerPets);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                }

                // ── SELECT PET 1 ──
                else if (interaction.isStringSelectMenu() && interaction.customId === 'breed_select_pet1') {
                    const shortId = parseInt(interaction.values[0]);
                    selectedPet1 = playerPets?.find(p => p.shortId === shortId);
                    if (!selectedPet1) {
                        await interaction.reply({ content: `${e.error} Pet not found!`, flags: MessageFlags.Ephemeral });
                        return;
                    }
                    const p1d = GameData.getPet(selectedPet1.basePetId);
                    const remaining = playerPets.filter(p => p.shortId !== shortId);
                    const c = buildPet2SelectContainer(selectedPet1, p1d, remaining);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                }

                // ── SELECT PET 2 (validate & start breeding) ──
                else if (interaction.isStringSelectMenu() && interaction.customId === 'breed_select_pet2') {
                    const shortId2 = parseInt(interaction.values[0]);
                    const selectedPet2 = playerPets?.find(p => p.shortId === shortId2);
                    if (!selectedPet2 || !selectedPet1) {
                        await interaction.reply({ content: `${e.error} Pet not found!`, flags: MessageFlags.Ephemeral });
                        return;
                    }

                    const p1d = GameData.getPet(selectedPet1.basePetId);
                    const p2d = GameData.getPet(selectedPet2.basePetId);

                    // Rarity gap check
                    const r1 = RARITY_ORDER.indexOf((p1d.rarity || 'common').toLowerCase());
                    const r2 = RARITY_ORDER.indexOf((p2d.rarity || 'common').toLowerCase());
                    if (Math.abs(r1 - r2) > MAX_RARITY_GAP) {
                        await interaction.reply({
                            content: `${e.error} **${p1d.name}** (${p1d.rarity}) and **${p2d.name}** (${p2d.rarity}) are too far apart in rarity. Max 2 tier gap.`,
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }

                    // Cooldown checks
                    const now = new Date();
                    if (selectedPet1.lastBredAt && (now - selectedPet1.lastBredAt) < BREEDING_COOLDOWN_MS) {
                        const remaining = new Date(selectedPet1.lastBredAt.getTime() + BREEDING_COOLDOWN_MS) - now;
                        const h = Math.floor(remaining / (1000 * 60 * 60));
                        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                        await interaction.reply({
                            content: `${e.clock} **${p1d.name} #${selectedPet1.shortId}** needs **${h}h ${m}m** to rest before breeding again.`,
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }
                    if (selectedPet2.lastBredAt && (now - selectedPet2.lastBredAt) < BREEDING_COOLDOWN_MS) {
                        const remaining = new Date(selectedPet2.lastBredAt.getTime() + BREEDING_COOLDOWN_MS) - now;
                        const h = Math.floor(remaining / (1000 * 60 * 60));
                        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                        await interaction.reply({
                            content: `${e.clock} **${p2d.name} #${selectedPet2.shortId}** needs **${h}h ${m}m** to rest before breeding again.`,
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }

                    // Start breeding
                    let breedingTime = 240;
                    if (p1d.breeding && p1d.breeding.partner === selectedPet2.basePetId) {
                        breedingTime = p1d.breeding.timeMinutes;
                    } else if (p2d.breeding && p2d.breeding.partner === selectedPet1.basePetId) {
                        breedingTime = p2d.breeding.timeMinutes;
                    }

                    selectedPet1.status = 'Breeding';
                    selectedPet2.status = 'Breeding';
                    await selectedPet1.save();
                    await selectedPet2.save();

                    const timeReduction = Math.min(freshEffects?.breedingTimeReduction || 0, 0.9);
                    breedingTime = Math.max(30, Math.round(breedingTime * (1 - timeReduction)));

                    const finishTime = new Date(Date.now() + breedingTime * 60 * 1000);
                    fp.breedingSlot = { pet1Id: selectedPet1.shortId, pet2Id: selectedPet2.shortId, finishesAt: finishTime };
                    await fp.save();

                    const hours = Math.floor(breedingTime / 60);
                    const minutes = breedingTime % 60;
                    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                    const resultText = buildBreedingStartedText(selectedPet1, selectedPet2, p1d, p2d, timeStr);
                    const c = buildResultContainer(resultText, 0x10B981);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                    collector.stop('done');
                }

                // ── BACK (return to pet 1 select) ──
                else if (interaction.customId === 'breed_back') {
                    selectedPet1 = null;
                    const c = buildPet1SelectContainer(playerPets);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                }

                // ── CANCEL ──
                else if (interaction.customId === 'breed_cancel') {
                    let p1 = null, p2 = null, p1d = null, p2d = null;
                    if (fp.breedingSlot && fp.breedingSlot.pet1Id && fp.breedingSlot.pet2Id) {
                        p1 = await Pet.findOne({ ownerId: message.author.id, shortId: fp.breedingSlot.pet1Id });
                        p2 = await Pet.findOne({ ownerId: message.author.id, shortId: fp.breedingSlot.pet2Id });
                        if (p1) p1d = GameData.getPet(p1.basePetId);
                        if (p2) p2d = GameData.getPet(p2.basePetId);
                    }
                    const c = buildStatusContainer(fp, p1, p2, p1d, p2d, prefix);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                }

                // ── CLAIM EGG ──
                else if (interaction.customId === 'breed_claim') {
                    const result = await this.performClaimLogic(fp, message.author.id, client, prefix, freshEffects);
                    if (result.error) {
                        await interaction.reply({ content: `${e.error} ${result.error}`, flags: MessageFlags.Ephemeral });
                    } else {
                        const c = buildResultContainer(result.text, 0x10B981);
                        await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                    }
                }

                // ── REMOVE PETS ──
                else if (interaction.customId === 'breed_remove') {
                    const result = await this.performRemoveLogic(fp, message.author.id);
                    if (result.error) {
                        await interaction.reply({ content: `${e.error} ${result.error}`, flags: MessageFlags.Ephemeral });
                    } else {
                        const c = buildResultContainer(result.text, 0xE74C3C);
                        c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                        c.addActionRowComponents(
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('breed_add')
                                    .setLabel('Add Pets')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('🐾'),
                                new ButtonBuilder()
                                    .setCustomId('breed_refresh')
                                    .setLabel('Refresh')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji(e.reload)
                            )
                        );
                        await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                    }
                }

                else {
                    await interaction.deferUpdate();
                }

            } catch (error) {
                console.error('Breed interaction error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `${e.error} An error occurred.`, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'done') return;
            try {
                const fp = (await CommandHelpers.validatePlayer(message.author.id, prefix))?.player;
                if (!fp) return;
                let p1 = null, p2 = null, p1d = null, p2d = null;
                if (fp.breedingSlot && fp.breedingSlot.pet1Id && fp.breedingSlot.pet2Id) {
                    p1 = await Pet.findOne({ ownerId: message.author.id, shortId: fp.breedingSlot.pet1Id });
                    p2 = await Pet.findOne({ ownerId: message.author.id, shortId: fp.breedingSlot.pet2Id });
                    if (p1) p1d = GameData.getPet(p1.basePetId);
                    if (p2) p2d = GameData.getPet(p2.basePetId);
                }
                const finalC = buildStatusContainer(fp, p1, p2, p1d, p2d, prefix);
                finalC.components.forEach(comp => {
                    if (comp.components) comp.components.forEach(inner => { if (inner.setDisabled) inner.setDisabled(true); });
                });
                reply.edit({ components: [finalC], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            } catch {
                reply.edit({ components: [] }).catch(() => {});
            }
        });
    },

    // ── Core Logic (shared by CLI and panel) ────────────────────

    async performClaimLogic(player, ownerId, client, prefix, labEffects) {
        if (!player.breedingSlot || !player.breedingSlot.pet1Id || !player.breedingSlot.pet2Id) {
            return { error: 'There are no pets in your breeding pen!' };
        }
        if (!player.breedingSlot.finishesAt) {
            return { error: "The pets haven't started breeding yet!" };
        }
        const now = new Date();
        if (now < player.breedingSlot.finishesAt) {
            const tl = player.breedingSlot.finishesAt - now;
            const h = Math.floor(tl / (1000 * 60 * 60));
            const m = Math.floor((tl % (1000 * 60 * 60)) / (1000 * 60));
            return { error: `The pets still need **${h}h ${m}m** to finish breeding!` };
        }

        const pet1 = await Pet.findOne({ ownerId, shortId: player.breedingSlot.pet1Id });
        const pet2 = await Pet.findOne({ ownerId, shortId: player.breedingSlot.pet2Id });
        if (!pet1 || !pet2) return { error: 'One or both breeding pets could not be found!' };

        const pet1Data = GameData.getPet(pet1.basePetId);
        const pet2Data = GameData.getPet(pet2.basePetId);

        // Determine egg type
        let eggItemId = null;
        if (pet1Data.breeding && pet1Data.breeding.partner === pet2.basePetId) {
            eggItemId = pet1Data.breeding.egg;
        } else if (pet2Data.breeding && pet2Data.breeding.partner === pet1.basePetId) {
            eggItemId = pet2Data.breeding.egg;
        } else {
            const parentTypes = [pet1Data.type, pet2Data.type];
            if (parentTypes.includes('Aeonic')) eggItemId = 'aeonic_egg';
            else if (parentTypes.includes('Abyssal')) eggItemId = 'abyssal_egg';
            else if (parentTypes.includes('Beast')) eggItemId = 'beast_egg';
            else if (parentTypes.includes('Elemental')) eggItemId = 'elemental_egg';
            else if (parentTypes.includes('Mystic')) eggItemId = 'mystic_egg';
            else if (parentTypes.includes('Undead')) eggItemId = 'undead_egg';
            else if (parentTypes.includes('Mechanical')) eggItemId = 'mechanical_egg';
            else eggItemId = 'beast_egg';
        }

        const inheritedSkills = await rollSkillInheritance(pet1, pet2, eggItemId);

        const maxEgg = await Egg.findOne({ ownerId }).sort({ eggId: -1 }).select('eggId').exec();
        const nextEggId = maxEgg ? maxEgg.eggId + 1 : 1;

        const newEgg = new Egg({
            ownerId, eggId: nextEggId, eggItemId, inheritedSkills,
            parentTypes: [pet1Data.type, pet2Data.type],
            parentRarities: [pet1Data.rarity, pet2Data.rarity],
            parentBasePetIds: [pet1.basePetId, pet2.basePetId],
            source: 'breeding'
        });
        await newEgg.save();

        let bonusEggMsg = '';
        if (labEffects?.breedingExtraEggChance && Math.random() < labEffects.breedingExtraEggChance) {
            const bonusInherited = await rollSkillInheritance(pet1, pet2, eggItemId);
            const bonusEgg = new Egg({
                ownerId, eggId: nextEggId + 1, eggItemId,
                inheritedSkills: bonusInherited,
                parentTypes: [pet1Data.type, pet2Data.type],
                parentRarities: [pet1Data.rarity, pet2Data.rarity],
                parentBasePetIds: [pet1.basePetId, pet2.basePetId],
                source: 'breeding'
            });
            await bonusEgg.save();
            bonusEggMsg = `\n🎁 **Bonus Egg!** Lab produced an extra egg! (#${nextEggId + 1})`;
        }

        pet1.status = 'Idle'; pet1.lastBredAt = new Date();
        pet2.status = 'Idle'; pet2.lastBredAt = new Date();
        await pet1.save(); await pet2.save();

        player.breedingSlot = { pet1Id: null, pet2Id: null, finishesAt: null };
        player.stats.eggsProduced = (player.stats.eggsProduced || 0) + 1;
        await player.save();

        await updateQuestProgress(ownerId, 'breed_pals', 1, null);
        client.emit('palsBred', ownerId);

        const eggItem = GameData.getItem(eggItemId);
        const inheritCount = inheritedSkills.filter(s => s.fromType !== (eggItem?.eggType || 'Beast')).length;

        return { text: buildClaimText(pet1Data, pet2Data, pet1, pet2, eggItem, nextEggId, inheritCount, bonusEggMsg) };
    },

    async performRemoveLogic(player, ownerId) {
        if (!player.breedingSlot || !player.breedingSlot.pet1Id || !player.breedingSlot.pet2Id) {
            return { error: 'There are no pets in your breeding pen!' };
        }
        const pet1 = await Pet.findOne({ ownerId, shortId: player.breedingSlot.pet1Id });
        const pet2 = await Pet.findOne({ ownerId, shortId: player.breedingSlot.pet2Id });
        if (pet1) { pet1.status = 'Idle'; await pet1.save(); }
        if (pet2) { pet2.status = 'Idle'; await pet2.save(); }
        player.breedingSlot = { pet1Id: null, pet2Id: null, finishesAt: null };
        await player.save();

        const pet1Data = pet1 ? GameData.getPet(pet1.basePetId) : null;
        const pet2Data = pet2 ? GameData.getPet(pet2.basePetId) : null;
        return { text: buildRemovedText(pet1, pet2, pet1Data, pet2Data) };
    },

    // ── CLI subcommand wrappers ─────────────────────────────────

    async performAddPets(message, player, shortId1, shortId2, prefix, labEffects) {
        if (player.breedingSlot && (player.breedingSlot.pet1Id || player.breedingSlot.pet2Id)) {
            return message.reply({ embeds: [createErrorEmbed("Breeding Pen Occupied", `Use \`${prefix}breed remove\` to clear it first.`)] });
        }
        if (shortId1 === shortId2) {
            return message.reply({ embeds: [createErrorEmbed("Invalid", "You cannot breed a pet with itself!")] });
        }

        const pet1 = await Pet.findOne({ ownerId: message.author.id, shortId: shortId1 });
        const pet2 = await Pet.findOne({ ownerId: message.author.id, shortId: shortId2 });
        if (!pet1) return message.reply({ embeds: [createErrorEmbed("Not Found", `No pet with ID #${shortId1}.`)] });
        if (!pet2) return message.reply({ embeds: [createErrorEmbed("Not Found", `No pet with ID #${shortId2}.`)] });
        if (pet1.status !== 'Idle') return message.reply({ embeds: [createErrorEmbed("Unavailable", `**${GameData.getPet(pet1.basePetId)?.name} #${pet1.shortId}** is ${pet1.status.toLowerCase()}.`)] });
        if (pet2.status !== 'Idle') return message.reply({ embeds: [createErrorEmbed("Unavailable", `**${GameData.getPet(pet2.basePetId)?.name} #${pet2.shortId}** is ${pet2.status.toLowerCase()}.`)] });
        if (pet1.level < 5) return message.reply({ embeds: [createErrorEmbed("Too Young", `Pet #${pet1.shortId} must be Lv.5+ (currently ${pet1.level}).`)] });
        if (pet2.level < 5) return message.reply({ embeds: [createErrorEmbed("Too Young", `Pet #${pet2.shortId} must be Lv.5+ (currently ${pet2.level}).`)] });

        const pet1Data = GameData.getPet(pet1.basePetId);
        const pet2Data = GameData.getPet(pet2.basePetId);

        const r1 = RARITY_ORDER.indexOf((pet1Data.rarity || 'common').toLowerCase());
        const r2 = RARITY_ORDER.indexOf((pet2Data.rarity || 'common').toLowerCase());
        if (Math.abs(r1 - r2) > MAX_RARITY_GAP) {
            return message.reply({ embeds: [createErrorEmbed("Rarity Mismatch", `**${pet1Data.name}** (${pet1Data.rarity}) and **${pet2Data.name}** (${pet2Data.rarity}) — max 2 tier gap.`)] });
        }

        const now = new Date();
        if (pet1.lastBredAt && (now - pet1.lastBredAt) < BREEDING_COOLDOWN_MS) {
            const remaining = new Date(pet1.lastBredAt.getTime() + BREEDING_COOLDOWN_MS) - now;
            const h = Math.floor(remaining / (1000 * 60 * 60)), m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply({ embeds: [createErrorEmbed("Cooldown", `**${pet1Data.name} #${pet1.shortId}** needs **${h}h ${m}m** to rest.`)] });
        }
        if (pet2.lastBredAt && (now - pet2.lastBredAt) < BREEDING_COOLDOWN_MS) {
            const remaining = new Date(pet2.lastBredAt.getTime() + BREEDING_COOLDOWN_MS) - now;
            const h = Math.floor(remaining / (1000 * 60 * 60)), m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            return message.reply({ embeds: [createErrorEmbed("Cooldown", `**${pet2Data.name} #${pet2.shortId}** needs **${h}h ${m}m** to rest.`)] });
        }

        let breedingTime = 240;
        if (pet1Data.breeding && pet1Data.breeding.partner === pet2.basePetId) breedingTime = pet1Data.breeding.timeMinutes;
        else if (pet2Data.breeding && pet2Data.breeding.partner === pet1.basePetId) breedingTime = pet2Data.breeding.timeMinutes;

        pet1.status = 'Breeding'; pet2.status = 'Breeding';
        await pet1.save(); await pet2.save();

        const timeReduction = Math.min(labEffects?.breedingTimeReduction || 0, 0.9);
        breedingTime = Math.max(30, Math.round(breedingTime * (1 - timeReduction)));

        const finishTime = new Date(Date.now() + breedingTime * 60 * 1000);
        player.breedingSlot = { pet1Id: shortId1, pet2Id: shortId2, finishesAt: finishTime };
        await player.save();

        const hours = Math.floor(breedingTime / 60), minutes = breedingTime % 60;
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        const text = buildBreedingStartedText(pet1, pet2, pet1Data, pet2Data, timeStr);
        const container = buildResultContainer(text, 0x10B981);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },

    async performClaim(message, player, client, prefix, labEffects) {
        const result = await this.performClaimLogic(player, message.author.id, client, prefix, labEffects);
        if (result.error) return message.reply({ embeds: [createErrorEmbed("Cannot Claim", result.error)] });
        const container = buildResultContainer(result.text, 0x10B981);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },

    async performRemove(message, player, prefix) {
        const result = await this.performRemoveLogic(player, message.author.id);
        if (result.error) return message.reply({ embeds: [createErrorEmbed("Nothing to Remove", result.error)] });
        const container = buildResultContainer(result.text, 0xE74C3C);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};

// ── Skill Inheritance Helpers ────────────────────────────────────────

const INHERITANCE_CHANCE = 0.28; // 28% per slot

// Roll skill inheritance for a bred egg.
// For each slot, 28% chance to inherit a parent's skill instead of the default.
// Returns array of { slot, skillId, fromType } or empty array (no inheritance).
async function rollSkillInheritance(pet1, pet2, eggItemId) {
    const eggItem = GameData.getItem(eggItemId);
    const eggType = eggItem?.eggType || 'Beast';
    const tree = allSkillTrees[eggType];
    if (!tree || !tree.slots) return [];

    const parent1Set = await getParentSkillSet(pet1);
    const parent2Set = await getParentSkillSet(pet2);
    const inherited = [];

    for (let slot = 0; slot < tree.slots.length; slot++) {
        if (Math.random() > INHERITANCE_CHANCE) continue;

        // Pick a random parent to inherit from
        const donor = Math.random() < 0.5 ? parent1Set : parent2Set;
        if (!donor || !donor[slot]) continue;

        const { skillId, fromType } = donor[slot];
        // Only count as "inherited" if it comes from a different type tree
        inherited.push({ slot, skillId, fromType });
    }

    return inherited;
}

// Get a parent pet's actual skill set at each slot, accounting for
// multi-generational inheritance (customSkillSet overrides).
// Returns array of { skillId, fromType } indexed by slot.
async function getParentSkillSet(pet) {
    const SkillTree = require('../../models/SkillTree');
    const petData = GameData.getPet(pet.basePetId);
    if (!petData) return [];
    const petType = petData.type;
    const tree = allSkillTrees[petType];
    if (!tree || !tree.slots) return [];

    const skillTreeDoc = await SkillTree.findOne({ palId: pet.petId });
    const customSet = skillTreeDoc?.customSkillSet;

    return tree.slots.map((defaultSkillId, slot) => {
        if (customSet && customSet[slot]) {
            return { skillId: customSet[slot].skillId, fromType: customSet[slot].fromType };
        }
        return { skillId: defaultSkillId, fromType: petType };
    });
}