
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const Egg = require('../../models/Egg');
const SkillTree = require('../../models/SkillTree');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed, createInfoEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const { updateQuestProgress } = require('../../utils/questSystem');
const LabManager = require('../../utils/labManager');
const allSkillTrees = require('../../gamedata/skillTrees');
const config = require('../../config/config.json');
const e = require('../../utils/emojis');

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const INCUBATE_COLOR = 0x9B59B6; // Purple

// ── Text Content Builders ──────────────────────────────────────────

function buildStatusText(player, prefix) {
    const incEmoji = config.emojis['Alchemical Incubator'] || '🧪';
    let text = `## ${incEmoji} Incubator\n`;

    const slots = getAllHatchingSlots(player);
    let readyCount = 0;

    for (const slot of slots) {
        const label = getSlotLabel(slot);
        if (!slot.eggId) {
            text += `**${label}**\n> 🔲 *Empty*\n\n`;
        } else {
            const eggItem = GameData.getItem(slot.eggId);
            const name = eggItem?.name || slot.eggId;
            const eggEmoji = config.emojis[name] || '🥚';
            const idTag = slot.eggDocId ? ` (#${slot.eggDocId})` : '';

            if (!slot.hatchesAt || new Date() >= slot.hatchesAt) {
                text += `**${label}**\n> ${eggEmoji} ${name}${idTag} — ✨ **Ready!**\n\n`;
                readyCount++;
            } else {
                const remaining = formatTimeRemaining(slot.hatchesAt - new Date());
                text += `**${label}**\n> ${eggEmoji} ${name}${idTag} — ⏳ ${remaining}\n\n`;
            }
        }
    }

    return { text, readyCount };
}

function buildEggsText(bredEggs, invEggs) {
    if (bredEggs.length === 0 && invEggs.length === 0) {
        return '-# No eggs available. Breed or find some!';
    }

    let text = `### 🥚 Your Eggs\n`;

    for (const egg of bredEggs) {
        const eggItem = GameData.getItem(egg.eggItemId);
        const name = eggItem?.name || egg.eggItemId;
        const eggEmoji = config.emojis[name] || '🥚';
        const inheritCount = egg.inheritedSkills?.filter(s => s.fromType !== eggItem?.eggType).length || 0;
        const inheritTag = inheritCount > 0 ? ` 🧬${inheritCount}` : '';
        const parentInfo = egg.parentRarities?.length === 2
            ? ` ${config.emojis[egg.parentRarities[0]] || ''}`
            : '';
        text += `> **#${egg.eggId}** ${eggEmoji} ${name}${inheritTag}${parentInfo} *(bred)*\n`;
    }

    for (const inv of invEggs) {
        const eggItem = GameData.getItem(inv.itemId);
        const name = eggItem?.name || inv.itemId;
        const eggEmoji = config.emojis[name] || '🥚';
        text += `> ${eggEmoji} ${name} x${inv.quantity}\n`;
    }

    return text;
}

function buildHatchText(petData, eggItem, nextShortId, slotLabel, eggDoc, prefix) {
    const incEmoji = config.emojis['Alchemical Incubator'] || '🧪';
    const petEmoji = config.emojis[petData.name] || '🐾';
    const eggEmoji = config.emojis[eggItem.name] || '🥚';
    const rarityEmoji = config.emojis[petData.rarity] || '';

    let text = `## ${incEmoji} Egg Hatched!\n\n`;
    text += `${eggEmoji} → 🐣 → ${petEmoji}\n\n`;
    text += `### ${petEmoji} ${petData.name}\n`;
    text += `**Pet ID:** #${nextShortId}\n`;
    text += `**Rarity:** ${rarityEmoji} ${petData.rarity}\n`;
    text += `**Type:** ${petData.type}\n`;
    text += `-# Hatched in your ${slotLabel}\n`;

    // Show inherited skills
    const hasInheritance = eggDoc?.inheritedSkills?.length > 0 &&
        eggDoc.inheritedSkills.some(s => s.fromType !== petData.type);

    if (hasInheritance) {
        text += `\n**🧬 Inherited Skills:**\n`;
        for (const skill of eggDoc.inheritedSkills) {
            if (skill.fromType !== petData.type) {
                const sourceTree = allSkillTrees[skill.fromType];
                const skillData = sourceTree?.skills?.[skill.skillId];
                const defaultSkillId = allSkillTrees[petData.type]?.slots?.[skill.slot];
                const defaultSkill = allSkillTrees[petData.type]?.skills?.[defaultSkillId];
                text += `> Slot ${skill.slot + 1}: **${skillData?.name || skill.skillId}** *(${skill.fromType})* ← ${defaultSkill?.name || 'default'}\n`;
            }
        }
    }

    text += `\n-# Use \`${prefix}pet info ${nextShortId}\` to view your new pal!`;
    return text;
}

function buildEggPlacedText(eggItem, slot, eggDocId, hatchTime, inheritCount) {
    const incEmoji = config.emojis['Alchemical Incubator'] || '🧪';
    const eggEmoji = config.emojis[eggItem.name] || '🥚';
    const remaining = formatTimeRemaining(hatchTime - new Date());
    const inheritMsg = inheritCount > 0 ? `\n🧬 This egg has **${inheritCount} inherited skill${inheritCount > 1 ? 's' : ''}**!` : '';
    const idTag = eggDocId ? ` (#${eggDocId})` : '';
    const label = getSlotLabel(slot);

    return (
        `## ${incEmoji} Egg Placed!\n\n` +
        `${eggEmoji} **${eggItem.name}**${idTag}\n` +
        `> Slot: **${label}**\n` +
        `> Hatches in: ⏳ **${remaining}**${inheritMsg}`
    );
}

// ── Container Builders ─────────────────────────────────────────────

function buildMainContainer(player, prefix) {
    const container = new ContainerBuilder().setAccentColor(INCUBATE_COLOR);

    const { text: statusText, readyCount } = buildStatusText(player, prefix);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusText));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Action buttons
    const buttons = [];

    if (readyCount > 0) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('incubate_claim')
                .setLabel('Hatch Egg')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🐣')
        );
    }

    const hasAvailableSlot = !!findFirstAvailableSlot(player);

    if (hasAvailableSlot) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('incubate_place')
                .setLabel('Place Egg')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🥚')
        );
    }

    buttons.push(
        new ButtonBuilder()
            .setCustomId('incubate_refresh')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(e.reload)
    );

    container.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# •  \`${prefix}incubate <egg id>\` to place  •  \`${prefix}incubate claim\` to hatch`
        )
    );

    return container;
}

function buildEggSelectContainer(bredEggs, invEggs, prefix) {
    const incEmoji = config.emojis['Alchemical Incubator'] || '🧪';
    const container = new ContainerBuilder().setAccentColor(INCUBATE_COLOR);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## ${incEmoji} Place an Egg\n` +
            `Select an egg from the dropdown to start incubating.\n\n` +
            `-# Bred eggs are listed first with their IDs`
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Build select menu
    const eggOptions = [];

    for (const egg of bredEggs.slice(0, 20)) {
        const eggItem = GameData.getItem(egg.eggItemId);
        const name = eggItem?.name || egg.eggItemId;
        const eggEmoji = config.emojis[name];
        const inheritCount = egg.inheritedSkills?.filter(s => s.fromType !== eggItem?.eggType).length || 0;
        const inheritTag = inheritCount > 0 ? ` (🧬${inheritCount})` : '';
        const opt = {
            label: `#${egg.eggId} ${name}${inheritTag}`,
            value: `bred_${egg.eggId}`,
            description: `${eggItem?.hatchTimeMinutes || 0} min · Bred`
        };
        if (eggEmoji) opt.emoji = eggEmoji;
        eggOptions.push(opt);
    }

    for (const inv of invEggs.slice(0, 25 - eggOptions.length)) {
        const eggItem = GameData.getItem(inv.itemId);
        const name = eggItem?.name || inv.itemId;
        const eggEmoji = config.emojis[name];
        const opt = {
            label: `${name} (x${inv.quantity})`,
            value: `inv_${inv.itemId}`,
            description: `${eggItem?.hatchTimeMinutes || 0} min`
        };
        if (eggEmoji) opt.emoji = eggEmoji;
        eggOptions.push(opt);
    }

    // Guard: Discord requires at least 1 option
    if (eggOptions.length === 0) {
        eggOptions.push({ label: 'No eggs available', value: 'none', description: 'You have no eggs to incubate' });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('incubate_select_egg')
        .setPlaceholder('🥚 Select an egg...')
        .addOptions(eggOptions);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('incubate_back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.previous)
        )
    );

    return container;
}

function buildResultContainer(text, color) {
    const container = new ContainerBuilder().setAccentColor(color || INCUBATE_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return container;
}

// ── Main Command ───────────────────────────────────────────────────

module.exports = {
    name: "incubate",
    description: "Manage your alchemical incubator to hatch eggs into pets.",
    aliases: ['incubator', 'hatch'],
    cooldown: 15,
    usage: '[<egg id/name>] | [claim [slot]] | [status]',

    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) return message.reply({ embeds: [playerResult.embed] });
            const player = playerResult.player;
            const { effects: labEffects } = await LabManager.getLabData(message.author.id);

            const sub = (args[0] || '').toLowerCase();

            // ── CLI: claim ──
            if (sub === 'claim') {
                return this.performClaim(message, player, client, prefix, labEffects, args[1]);
            }

            // ── CLI: place by ID (numeric) ──
            const numericId = parseInt(args[0]);
            if (!isNaN(numericId) && numericId > 0) {
                return this.performPlaceById(message, player, numericId, prefix, labEffects);
            }

            // ── CLI: place by name ──
            if (args.length > 0 && sub !== 'status') {
                return this.performPlaceByName(message, player, args.join(' ').toLowerCase(), prefix, labEffects);
            }

            // ── Interactive V2 Panel ──
            return this.showPanel(message, player, client, prefix, labEffects);

        } catch (error) {
            console.error('Error in text command incubate:', error);
            message.reply({ embeds: [createErrorEmbed("An Error Occurred", "There was a problem with the incubator.")] });
        }
    },

    async showPanel(message, player, client, prefix, labEffects) {
        const container = buildMainContainer(player, prefix);

        const reply = await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        // ── Collector ──
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120_000
        });

        collector.on('collect', async (interaction) => {
            try {
                // Reload fresh data
                const fp = (await CommandHelpers.validatePlayer(message.author.id, prefix)).player;
                const { effects: freshEffects } = await LabManager.getLabData(message.author.id);

                // ── REFRESH ──
                if (interaction.customId === 'incubate_refresh' || interaction.customId === 'incubate_back') {
                    const c = buildMainContainer(fp, prefix);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                }

                // ── PLACE EGG (open egg select) ──
                else if (interaction.customId === 'incubate_place') {
                    const incIds = getIncubatingEggDocIds(fp);
                    const bred = (await Egg.find({ ownerId: message.author.id }).sort({ eggId: 1 })).filter(e => !incIds.includes(e.eggId));
                    const inv = fp.inventory.filter(item =>
                        GameData.getItem(item.itemId) && GameData.getItem(item.itemId).type === 'egg'
                    );

                    if (bred.length === 0 && inv.length === 0) {
                        await interaction.reply({ content: `${e.error} No eggs available!`, flags: MessageFlags.Ephemeral });
                        return;
                    }

                    const c = buildEggSelectContainer(bred, inv, prefix);
                    await interaction.update({ components: [c], flags: MessageFlags.IsComponentsV2 });
                }

                // ── SELECT EGG (place it) ──
                else if (interaction.isStringSelectMenu() && interaction.customId === 'incubate_select_egg') {
                    const selectedValue = interaction.values[0];
                    if (selectedValue === 'none') {
                        await interaction.reply({ content: `${e.error} No eggs available to incubate!`, flags: MessageFlags.Ephemeral });
                        return;
                    }
                    const isBred = selectedValue.startsWith('bred_');
                    const slot = findFirstAvailableSlot(fp);

                    if (!slot) {
                        await interaction.reply({ content: `${e.error} All slots are occupied!`, flags: MessageFlags.Ephemeral });
                        return;
                    }

                    let resultText;

                    if (isBred) {
                        const eggDocId = parseInt(selectedValue.replace('bred_', ''));

                        // Guard: check if already incubating (race condition / retry)
                        const incIds = getIncubatingEggDocIds(fp);
                        if (incIds.includes(eggDocId)) {
                            await interaction.reply({ content: `${e.error} Egg #${eggDocId} is already in an incubator slot!`, flags: MessageFlags.Ephemeral });
                            return;
                        }

                        const eggDoc = await Egg.findOne({ ownerId: message.author.id, eggId: eggDocId });
                        if (!eggDoc) {
                            await interaction.reply({ content: `${e.error} Egg no longer exists!`, flags: MessageFlags.Ephemeral });
                            return;
                        }
                        const eggItem = GameData.getItem(eggDoc.eggItemId);
                        if (!eggItem) {
                            await interaction.reply({ content: `${e.error} Egg type not found!`, flags: MessageFlags.Ephemeral });
                            return;
                        }
                        const hatchTime = getHatchTimestamp(eggItem, freshEffects);
                        setSlotEgg(slot, eggDoc.eggItemId, eggDocId, hatchTime);
                        await fp.save();
                        const inheritCount = eggDoc.inheritedSkills?.filter(s => s.fromType !== eggItem?.eggType).length || 0;
                        resultText = buildEggPlacedText(eggItem, slot, eggDocId, hatchTime, inheritCount);
                    } else {
                        const itemId = selectedValue.replace('inv_', '');
                        const playerEgg = fp.inventory.find(item => item.itemId === itemId);
                        if (!playerEgg || playerEgg.quantity <= 0) {
                            await interaction.reply({ content: `${e.error} You no longer have that egg!`, flags: MessageFlags.Ephemeral });
                            return;
                        }
                        const eggItem = GameData.getItem(itemId);
                        const hatchTime = getHatchTimestamp(eggItem, freshEffects);
                        playerEgg.quantity--;
                        if (playerEgg.quantity <= 0) {
                            fp.inventory = fp.inventory.filter(item => item.itemId !== itemId);
                        }
                        setSlotEgg(slot, itemId, null, hatchTime);
                        await fp.save();
                        resultText = buildEggPlacedText(eggItem, slot, null, hatchTime, 0);
                    }

                    const resultC = buildResultContainer(resultText, 0x10B981);
                    resultC.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                    resultC.addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('incubate_refresh')
                                .setLabel('Back to Incubator')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(e.previous)
                        )
                    );
                    await interaction.update({ components: [resultC], flags: MessageFlags.IsComponentsV2 });
                }

                // ── CLAIM EGG ──
                else if (interaction.customId === 'incubate_claim') {
                    const result = await this.performHatchLogic(fp, message.author.id, client, prefix, freshEffects, null);
                    if (result.error) {
                        await interaction.reply({ content: `${e.error} ${result.error}`, flags: MessageFlags.Ephemeral });
                    } else {
                        const resultC = buildResultContainer(result.text, 0x10B981);
                        resultC.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
                        resultC.addActionRowComponents(
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('incubate_refresh')
                                    .setLabel('Back to Incubator')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji(e.reload)
                            )
                        );
                        await interaction.update({ components: [resultC], flags: MessageFlags.IsComponentsV2 });
                    }
                }

                else {
                    await interaction.deferUpdate();
                }

            } catch (error) {
                console.error('Incubate interaction error:', error);
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
                const finalC = buildMainContainer(fp, prefix);
                finalC.components.forEach(comp => {
                    if (comp.components) comp.components.forEach(inner => { if (inner.setDisabled) inner.setDisabled(true); });
                });
                reply.edit({ components: [finalC], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            } catch {
                reply.edit({ components: [] }).catch(() => {});
            }
        });
    },

    // ── Core Hatch Logic ────────────────────────────────────────

    async performHatchLogic(player, ownerId, client, prefix, labEffects, slotArg) {
        let targetSlot = slotArg ? resolveSlotArg(player, slotArg) : findFirstReadySlot(player);
        if (slotArg && !targetSlot) return { error: 'That incubator slot does not exist.' };
        if (!targetSlot) return { error: 'None of your eggs are ready to hatch yet.' };
        if (!targetSlot.eggId) return { error: "This slot doesn't contain an egg." };

        const now = new Date();
        if (targetSlot.hatchesAt && now < targetSlot.hatchesAt) {
            return { error: `That egg still needs **${formatTimeRemaining(targetSlot.hatchesAt - now)}** to finish hatching!` };
        }

        const eggItem = GameData.getItem(targetSlot.eggId);
        if (!eggItem) {
            clearSlot(targetSlot);
            await player.save();
            return { error: 'Egg data not found. Slot reset.' };
        }

        // Find Egg doc for inheritance
        let eggDoc = null;
        if (targetSlot.eggDocId) {
            eggDoc = await Egg.findOne({ ownerId, eggId: targetSlot.eggDocId });
        }

        const hatchedPetId = selectPetFromEgg(eggItem, labEffects, eggDoc);
        if (!hatchedPetId) {
            clearSlot(targetSlot);
            await player.save();
            return { error: 'No suitable Pal found for this egg.' };
        }

        const petData = GameData.getPet(hatchedPetId);
        const maxShortId = await Pet.findOne({ ownerId }).sort({ shortId: -1 }).select('shortId').exec();
        const nextShortId = maxShortId ? maxShortId.shortId + 1 : 1;

        const newPet = new Pet({
            ownerId, nickname: petData.name, basePetId: hatchedPetId,
            shortId: nextShortId, stats: { ...petData.baseStats }, type: petData.type
        });
        await newPet.save();

        // Skill tree
        const hasInheritance = eggDoc?.inheritedSkills?.length > 0 &&
            eggDoc.inheritedSkills.some(s => s.fromType !== petData.type);

        const skillTree = new SkillTree({
            palId: newPet.petId, skillPoints: 0, unlockedSkills: [],
            ...(hasInheritance ? { customSkillSet: eggDoc.inheritedSkills } : {})
        });
        await skillTree.save();

        if (eggDoc) await Egg.deleteOne({ _id: eggDoc._id });

        const slotLabel = getSlotLabel(targetSlot);
        clearSlot(targetSlot);
        player.stats.eggsHatched = (player.stats.eggsHatched || 0) + 1;
        player.palCounter = (player.palCounter || 0) + 1;
        await player.save();

        await updateQuestProgress(ownerId, 'hatch_pals', 1, null);
        client.emit('eggHatch', ownerId);

        return { text: buildHatchText(petData, eggItem, nextShortId, slotLabel, eggDoc, prefix) };
    },

    // ── CLI Subcommand Wrappers ─────────────────────────────────

    async performClaim(message, player, client, prefix, labEffects, slotArg) {
        const result = await this.performHatchLogic(player, message.author.id, client, prefix, labEffects, slotArg);
        if (result.error) return message.reply({ embeds: [createErrorEmbed("Cannot Hatch", result.error)] });
        const container = buildResultContainer(result.text, 0x10B981);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },

    async performPlaceById(message, player, eggDocId, prefix, labEffects) {
        const availableSlot = findFirstAvailableSlot(player);
        if (!availableSlot) return message.reply({ embeds: [createErrorEmbed("All Slots Occupied", "Free up a slot first.")] });

        const eggDoc = await Egg.findOne({ ownerId: message.author.id, eggId: eggDocId });
        if (!eggDoc) return message.reply({ embeds: [createErrorEmbed("Not Found", `No egg with ID #${eggDocId}.`)] });

        const incubatingIds = getIncubatingEggDocIds(player);
        if (incubatingIds.includes(eggDocId)) return message.reply({ embeds: [createErrorEmbed("Already Incubating", `Egg #${eggDocId} is already in a slot!`)] });

        const eggItem = GameData.getItem(eggDoc.eggItemId);
        if (!eggItem) return message.reply({ embeds: [createErrorEmbed("Error", "Egg type data not found.")] });

        const hatchTime = getHatchTimestamp(eggItem, labEffects);
        setSlotEgg(availableSlot, eggDoc.eggItemId, eggDocId, hatchTime);
        await player.save();

        const inheritCount = eggDoc.inheritedSkills?.filter(s => s.fromType !== eggItem.eggType).length || 0;
        const text = buildEggPlacedText(eggItem, availableSlot, eggDocId, hatchTime, inheritCount);
        const container = buildResultContainer(text, 0x10B981);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },

    async performPlaceByName(message, player, eggName, prefix, labEffects) {
        const availableSlot = findFirstAvailableSlot(player);
        if (!availableSlot) return message.reply({ embeds: [createErrorEmbed("All Slots Occupied", "Free up a slot first.")] });

        const playerEggs = player.inventory.filter(item =>
            GameData.getItem(item.itemId) && GameData.getItem(item.itemId).type === 'egg'
        );
        const matchingEgg = playerEggs.find(item =>
            GameData.getItem(item.itemId)?.name?.toLowerCase().includes(eggName)
        );
        if (!matchingEgg) return message.reply({ embeds: [createErrorEmbed("Not Found", `No egg matching "${eggName}".`)] });

        const eggItem = GameData.getItem(matchingEgg.itemId);
        const hatchTime = getHatchTimestamp(eggItem, labEffects);

        matchingEgg.quantity--;
        if (matchingEgg.quantity <= 0) {
            player.inventory = player.inventory.filter(item => item.itemId !== matchingEgg.itemId);
        }
        setSlotEgg(availableSlot, matchingEgg.itemId, null, hatchTime);
        await player.save();

        const text = buildEggPlacedText(eggItem, availableSlot, null, hatchTime, 0);
        const container = buildResultContainer(text, 0x10B981);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};

// ── Helper Functions ─────────────────────────────────────────────────

function getAllHatchingSlots(player) {
    const slots = [];

    // Base incubation slot
    if (!player.hatchingSlot) {
        player.hatchingSlot = {};
    }
    slots.push({
        type: 'base',
        index: 0,
        ref: player.hatchingSlot,
        eggId: player.hatchingSlot.eggId,
        eggDocId: player.hatchingSlot.eggDocId,
        hatchesAt: player.hatchingSlot.hatchesAt
    });

    // Lab incubation slots
    if (!player.labHatchingSlots) {
        player.labHatchingSlots = [];
    }
    player.labHatchingSlots.forEach((slot, idx) => {
        slots.push({
            type: 'lab',
            index: idx,
            ref: slot,
            eggId: slot.eggId,
            eggDocId: slot.eggDocId,
            hatchesAt: slot.hatchesAt
        });
    });

    return slots;
}

function getSlotLabel(slotInfo) {
    return slotInfo.type === 'base' ? 'Main Slot' : `Lab Slot ${slotInfo.index + 1}`;
}

function formatSlotDisplay(slotInfo, label) {
    if (!slotInfo.eggId) {
        return `**${label}**\n> Empty`;
    }
    const eggItem = GameData.getItem(slotInfo.eggId);
    const name = eggItem?.name || slotInfo.eggId;
    const idTag = slotInfo.eggDocId ? ` (#${slotInfo.eggDocId})` : '';
    if (!slotInfo.hatchesAt) {
        return `**${label}**\n> ${name}${idTag} — Ready to hatch!`;
    }
    const now = new Date();
    if (now >= slotInfo.hatchesAt) {
        return `**${label}**\n> ${name}${idTag} — Ready to hatch!`;
    }
    return `**${label}**\n> ${name}${idTag} — ${formatTimeRemaining(slotInfo.hatchesAt - now)} remaining`;
}

function formatTimeRemaining(ms) {
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function findFirstAvailableSlot(player) {
    return getAllHatchingSlots(player).find(slot => !slot.eggId) || null;
}

function findFirstReadySlot(player) {
    const now = new Date();
    return getAllHatchingSlots(player).find(slot => slot.eggId && (!slot.hatchesAt || now >= slot.hatchesAt)) || null;
}

function resolveSlotArg(player, slotArg) {
    if (!slotArg) return null;
    const normalized = slotArg.toLowerCase();
    if (normalized === 'base' || normalized === 'main' || normalized === 'slot0') {
        return getAllHatchingSlots(player)[0];
    }
    if (normalized.startsWith('lab')) {
        const idx = parseInt(normalized.replace('lab', ''), 10);
        if (!isNaN(idx) && idx > 0) {
            return getLabSlot(player, idx - 1);
        }
    }
    const numeric = parseInt(normalized, 10);
    if (!isNaN(numeric) && numeric > 0) {
        return getLabSlot(player, numeric - 1);
    }
    return null;
}

function getLabSlot(player, index) {
    return getAllHatchingSlots(player).find(slot => slot.type === 'lab' && slot.index === index) || null;
}

function clearSlot(slotInfo) {
    slotInfo.ref.eggId = null;
    slotInfo.ref.eggDocId = null;
    slotInfo.ref.hatchesAt = null;
}

/**
 * Get all eggDocIds currently incubating in hatching slots.
 * Used to prevent the same bred egg from being placed in multiple slots.
 */
function getIncubatingEggDocIds(player) {
    return getAllHatchingSlots(player)
        .filter(slot => slot.eggDocId != null)
        .map(slot => slot.eggDocId);
}

function setSlotEgg(slotInfo, eggItemId, eggDocId, hatchesAt) {
    slotInfo.ref.eggId = eggItemId;
    slotInfo.ref.eggDocId = eggDocId || null;
    slotInfo.ref.hatchesAt = hatchesAt;
}

function getHatchTimestamp(eggItem, labEffects) {
    const reduction = labEffects?.hatchTimeReduction || 0;
    const baseMinutes = eggItem?.hatchTimeMinutes || 60;
    const modifiedMinutes = Math.max(1, Math.round(baseMinutes * (1 - reduction)));
    return new Date(Date.now() + modifiedMinutes * 60000);
}

function selectPetFromEgg(eggItem, labEffects, eggDoc) {
    const candidatePets = getCandidatePets(eggItem);
    if (!candidatePets.length) {
        return null;
    }

    const baseWeights = buildRarityWeights(eggItem, eggDoc);
    const adjustedWeights = applyRareBonus(baseWeights, labEffects?.rarePetChanceBonus || 0);
    const chosenRarity = pickWeightedRarity(adjustedWeights);
    const selection = pickPetByRarity(candidatePets, chosenRarity);
    return selection?.id || candidatePets[0].id;
}

function getCandidatePets(eggItem) {
    if (eggItem?.possiblePals?.length) {
        return eggItem.possiblePals
            .map(id => ({ id, data: GameData.getPet(id) }))
            .filter(entry => entry.data);
    }
    const type = eggItem?.eggType || 'Beast';
    return Object.entries(GameData.pets || {})
        .filter(([_, pet]) => pet.type === type)
        .map(([id, data]) => ({ id, data }));
}

function buildRarityWeights(eggItem, eggDoc) {
    const defaultWeights = { common: 0.55, uncommon: 0.25, rare: 0.15, epic: 0.04, legendary: 0.01 };
    
    // If it's a bred egg with parent rarity metadata, build custom weights
    if (eggDoc && eggDoc.parentRarities && eggDoc.parentRarities.length === 2 && eggDoc.source === 'breeding') {
        const RARITY_ORDER_LOCAL = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const r1 = RARITY_ORDER_LOCAL.indexOf((eggDoc.parentRarities[0] || 'common').toLowerCase());
        const r2 = RARITY_ORDER_LOCAL.indexOf((eggDoc.parentRarities[1] || 'common').toLowerCase());
        
        const minIndex = Math.min(r1, r2);
        const maxIndex = Math.max(r1, r2);
        
        if (minIndex === 4 && maxIndex === 4) return { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 1.0 };
        if (minIndex === 3 && maxIndex === 3) return { common: 0, uncommon: 0, rare: 0, epic: 0.85, legendary: 0.15 };
        if (minIndex === 3 && maxIndex === 4) return { common: 0, uncommon: 0, rare: 0, epic: 0.60, legendary: 0.40 };
        if (minIndex === 2 && maxIndex === 4) return { common: 0, uncommon: 0, rare: 0.40, epic: 0.40, legendary: 0.20 };
        if (minIndex === 2 && maxIndex === 3) return { common: 0, uncommon: 0, rare: 0.40, epic: 0.50, legendary: 0.10 };
        if (minIndex === 2 && maxIndex === 2) return { common: 0, uncommon: 0, rare: 0.70, epic: 0.25, legendary: 0.05 };
        if (minIndex === 1 && maxIndex === 2) return { common: 0, uncommon: 0.30, rare: 0.60, epic: 0.08, legendary: 0.02 };
        if (minIndex === 1 && maxIndex === 1) return { common: 0, uncommon: 0.70, rare: 0.25, epic: 0.04, legendary: 0.01 };
        if (minIndex === 0 && maxIndex === 1) return { common: 0.30, uncommon: 0.55, rare: 0.12, epic: 0.02, legendary: 0.01 };
        return defaultWeights;
    }

    return { ...defaultWeights, ...(eggItem?.rarityWeights || {}) };
}

function applyRareBonus(weights, bonus) {
    if (!bonus) return normalizeWeights(weights);
    const adjusted = { ...weights };
    ['rare', 'epic', 'legendary'].forEach(key => {
        if (adjusted[key]) {
            adjusted[key] *= (1 + bonus);
        }
    });
    return normalizeWeights(adjusted);
}

function normalizeWeights(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total === 0) return weights;
    const normalized = {};
    for (const [key, val] of Object.entries(weights)) {
        normalized[key] = val / total;
    }
    return normalized;
}

function pickWeightedRarity(weights) {
    const rand = Math.random();
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (rand <= cumulative) return rarity;
    }
    return 'common';
}

function pickPetByRarity(pool, rarity) {
    // Filter by chosen rarity
    const matchingRarity = pool.filter(entry => 
        entry.data.rarity?.toLowerCase() === rarity
    );
    
    if (matchingRarity.length > 0) {
        return matchingRarity[Math.floor(Math.random() * matchingRarity.length)];
    }

    // Find closest rarity if no match
    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const idx = order.indexOf(rarity);
    
    // Try adjacent rarities, closest first
    for (let offset = 1; offset < order.length; offset++) {
        for (const dir of [-1, 1]) {
            const checkIdx = idx + (offset * dir);
            if (checkIdx >= 0 && checkIdx < order.length) {
                const candidates = pool.filter(e => 
                    e.data.rarity?.toLowerCase() === order[checkIdx]
                );
                if (candidates.length > 0) {
                    return candidates[Math.floor(Math.random() * candidates.length)];
                }
            }
        }
    }
    
    return pool[Math.floor(Math.random() * pool.length)];
}