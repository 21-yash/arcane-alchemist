const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const { createErrorEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');
const config = require('../../config/config.json');
const emojis = require('../../utils/emojis');

// ── Constants ───────────────────────────────────────────────────────

const STATION_COLOR = 0x5865F2;

const RARITY_COLORS = {
    Common:    0x9CA3AF,
    Uncommon:  0x22C55E,
    Rare:      0x3B82F6,
    Epic:      0xA855F7,
    Legendary: 0xF59E0B,
};

// ── Format Helpers ──────────────────────────────────────────────────

function formatTime(ms) {
    if (ms <= 0) return 'Ready!';
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatSacrifices(sacrifices) {
    return sacrifices.map(s => {
        const rEmoji = emojis[s.rarity?.toLowerCase()] || '';
        return `${rEmoji} **${s.count}x** ${s.rarity} ingredient`;
    }).join(' + ');
}

function progressBar(current, total, length = 10) {
    const pct = total > 0 ? current / total : 0;
    const filled = Math.round(pct * length);
    return '▰'.repeat(filled) + '▱'.repeat(length - filled);
}

// ── Text Builders ───────────────────────────────────────────────────

function buildIdleText(player, lab, effects) {
    const dustEmoji = config.emojis.arcaneDust || '✨';
    const goldEmoji = config.emojis.gold || '🪙';
    const board = lab.researchExpeditions?.board || [];
    const refreshMs = LabManager.getTimeUntilRefresh(lab, effects);

    let text = `# 🔬 Research Station\n`;
    text += `-# Research to discover new recipes\n\n`;

    // Resources
    text += `### 💰 Resources\n`;
    text += `${dustEmoji} **${(player.arcaneDust || 0).toLocaleString()}** Arcane Dust · ${goldEmoji} **${(player.gold || 0).toLocaleString()}** Gold\n\n`;

    if (board.length === 0) {
        text += `### 📋 No Research Available\n`;
        text += `-# The board is empty. Refresh or wait for new research.\n`;
    } else {
        text += `### 📋 Research Board\n`;
        text += `-# Board refreshes in **${formatTime(refreshMs)}**\n\n`;

        for (const exp of board) {
            const tierData = LabManager.EXPEDITION_TIERS[exp.tier];
            const domainData = LabManager.EXPEDITION_DOMAINS[exp.domain];
            const tierEmoji = tierData?.emoji || '⚪';
            const domainEmoji = domainData?.emoji || '📦';

            const expLabel = `${tierData?.label || exp.tier} ${domainData?.label || exp.domain}`;
            text += `${tierEmoji} **${expLabel}**\n`;
            text += `> ${domainEmoji} ${exp.rarityPool.join('–')} recipes\n`;
            text += `> ${dustEmoji} ${exp.dustCost} dust · ${goldEmoji} ${exp.goldCost.toLocaleString()} gold · ${emojis.loading} ${exp.timerHours}h\n`;
            text += `> 📦 ${formatSacrifices(exp.sacrifices)}\n\n`;
        }
    }

    return text;
}

function buildActiveText(player, lab, effects) {
    const active = lab.researchExpeditions.active;
    const dustEmoji = config.emojis.arcaneDust || '✨';
    const goldEmoji = config.emojis.gold || '🪙';
    const tierData = LabManager.EXPEDITION_TIERS[active.tier];
    const domainData = LabManager.EXPEDITION_DOMAINS[active.domain];
    const tierEmoji = tierData?.emoji || '⚪';
    const domainEmoji = domainData?.emoji || '📦';

    const now = Date.now();
    const start = new Date(active.startedAt).getTime();
    const end = new Date(active.completesAt).getTime();
    const remaining = Math.max(0, end - now);
    const total = end - start;
    const elapsed = total - remaining;
    const pct = total > 0 ? Math.round((elapsed / total) * 100) : 100;
    const isComplete = remaining <= 0;

    let text = `# 🔬 Research Station\n`;
    text += `-# Research in progress...\n\n`;

    text += `### 💰 Resources\n`;
    text += `${dustEmoji} **${(player.arcaneDust || 0).toLocaleString()}** Arcane Dust · ${goldEmoji} **${(player.gold || 0).toLocaleString()}** Gold\n\n`;

    if (isComplete) {
        const completeLabel = `${tierData?.label || active.tier} ${domainData?.label || active.domain}`;
        text += `### ${emojis.success} Research Complete!\n`;
        text += `${tierEmoji} **${completeLabel}**\n`;
        text += `> ${domainEmoji} ${active.rarityPool.join('–')} recipes\n`;
        text += `> 🎉 Your researchers have discovered something!\n`;
    } else {
        const activeLabel = `${tierData?.label || active.tier} ${domainData?.label || active.domain}`;
        text += `### ${emojis.loading} Active Research\n`;
        text += `${tierEmoji} **${activeLabel}**\n`;
        text += `> ${domainEmoji} ${active.rarityPool.join('–')} recipes\n`;
        text += `> ${emojis.loading} Completes in **${formatTime(remaining)}**\n`;
        text += `> ${progressBar(elapsed, total)} \`${pct}%\`\n`;
    }

    return text;
}

function buildRevealText(recipe, xp) {
    const item = recipe.item;
    const rEmoji = emojis[item.rarity?.toLowerCase()] || '';
    const itemEmoji = CommandHelpers.getItemEmoji(recipe.data.result.itemId) || CommandHelpers.getItemEmoji(item.name);
    const typeLabel = item.type === 'potion' ? '🧪 Potion' : item.type === 'equipment' ? '⚔️ Equipment' : '🔧 Item';

    let text = `# ${emojis.success} Recipe Discovered!\n`;
    text += `-# Your researchers have made a breakthrough!\n\n`;

    text += `${rEmoji} **${item.rarity}** · ${typeLabel}\n\n`;
    text += `### ${itemEmoji} ${item.name}\n`;
    text += `-# ${item.description}\n\n`;

    // Stats for equipment
    if (item.stats) {
        const statLines = Object.entries(item.stats)
            .filter(([k]) => k !== 'special')
            .map(([stat, value]) => `**${stat.toUpperCase()}** ${value >= 0 ? '+' : ''}${value}`)
            .join(' · ');
        if (statLines) text += `📊 ${statLines}\n\n`;
    }

    // Effect for potions
    if (item.effect) {
        const effectStr = formatPotionEffect(item);
        if (effectStr) text += `🔮 ${effectStr}\n\n`;
    }

    // Recipe ingredients
    text += `### 📜 Recipe Unlocked\n`;
    const ings = recipe.data.ingredients.map(ing => {
        const emoji = CommandHelpers.getItemEmoji(ing.itemId);
        const name = GameData.getItem(ing.itemId)?.name || 'Unknown';
        return `${emoji} \`x${ing.quantity}\` ${name}`;
    }).join('\n');
    text += `${ings}\n\n`;
    text += `> 🎓 **+${xp || 0} XP** earned · ⚒️ **Level ${recipe.data.level}** required\n`;

    return text;
}

function formatPotionEffect(potion) {
    if (!potion.effect) return null;
    const e = potion.effect;
    if (e.type === 'heal') return `Restores **${e.value}** HP`;
    if (e.type === 'stat_boost' || e.type === 'multi_boost') {
        const stats = Object.entries(e.stats).map(([s, v]) => `+${v} ${s.toUpperCase()}`).join(', ');
        return `${stats}`;
    }
    if (e.type === 'special') return `${e.ability.replace(/_/g, ' ')}`;
    if (e.type === 'level_up') return `Level up by **${e.value}**`;
    if (e.type === 'resistance') return `**${e.value}%** ${e.element} resistance`;
    if (e.type === 'trade_boost') {
        const gains = Object.entries(e.gain).map(([s, v]) => `+${v} ${s.toUpperCase()}`).join(', ');
        const loses = Object.entries(e.lose).map(([s, v]) => `-${v} ${s.toUpperCase()}`).join(', ');
        return `${gains} / ${loses}`;
    }
    if (e.type === 'familiar_type_boost') {
        const stats = Object.entries(e.stats).map(([s, v]) => `+${v} ${s.toUpperCase()}`).join(', ');
        return `${stats} for ${e.target} pals`;
    }
    return null;
}

// ── Container Builders ──────────────────────────────────────────────

function buildIdleContainer(player, lab, effects) {
    const board = lab.researchExpeditions?.board || [];
    const container = new ContainerBuilder().setAccentColor(STATION_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(buildIdleText(player, lab, effects)));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    if (board.length > 0) {
        // Expedition select menu
        const select = new StringSelectMenuBuilder()
            .setCustomId('research_select')
            .setPlaceholder('🔬 Choose a research...');

        for (const exp of board) {
            const tierData = LabManager.EXPEDITION_TIERS[exp.tier];
            const domainData = LabManager.EXPEDITION_DOMAINS[exp.domain];
            const afford = LabManager.canAffordExpedition(player, exp);

            select.addOptions({
                label: `${tierData?.label || exp.tier} ${domainData?.label || exp.domain}`,
                description: `${exp.dustCost} dust · ${exp.goldCost} gold · ${exp.timerHours}h${!afford.can ? ' (can\'t afford)' : ''}`,
                value: exp.id,
                emoji: domainData?.emoji || tierData?.emoji || '⚪'
            });
        }

        container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    }

    // Refresh button
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('research_refresh')
                .setLabel('Refresh Board (15 dust)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(emojis.reload)
        )
    );

    return container;
}

function buildActiveContainer(player, lab, effects) {
    const active = lab.researchExpeditions.active;
    const now = Date.now();
    const end = new Date(active.completesAt).getTime();
    const isComplete = now >= end;

    const container = new ContainerBuilder().setAccentColor(STATION_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(buildActiveText(player, lab, effects)));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    if (isComplete) {
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('research_collect')
                    .setLabel('Collect Results')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📜')
            )
        );
    } else {
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('research_check')
                    .setLabel('Check Progress')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emojis.reload)
            )
        );
    }

    return container;
}

function buildRevealContainer(recipe, xp) {
    const color = RARITY_COLORS[recipe.item.rarity] || STATION_COLOR;
    const container = new ContainerBuilder().setAccentColor(color);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(buildRevealText(recipe, xp)));
    return container;
}

function buildConfirmContainer(expedition, player, selectedSacrifices = {}) {
    const tierData = LabManager.EXPEDITION_TIERS[expedition.tier];
    const domainData = LabManager.EXPEDITION_DOMAINS[expedition.domain];
    const dustEmoji = config.emojis.arcaneDust || '✨';
    const goldEmoji = config.emojis.gold || '🪙';

    let text = `# ${emojis.warning} Confirm Research\n\n`;
    const confirmLabel = `${tierData?.label || expedition.tier} ${domainData?.label || expedition.domain}`;
    text += `${tierData?.emoji || '⚪'} **${confirmLabel}**\n`;
    text += `> ${domainData?.emoji || '📦'} ${expedition.rarityPool.join('–')} recipes\n`;
    text += `> ${emojis.loading} Duration: **${expedition.timerHours}h**\n\n`;
    text += `### 💸 Cost\n`;
    text += `${dustEmoji} **${expedition.dustCost}** Arcane Dust\n`;
    text += `${goldEmoji} **${expedition.goldCost.toLocaleString()}** Gold\n\n`;

    // Show sacrifice status per rarity
    text += `### 📦 Ingredient Sacrifice\n`;
    let allSatisfied = true;
    for (const sac of expedition.sacrifices) {
        const rEmoji = emojis[sac.rarity.toLowerCase()] || '';
        const selected = selectedSacrifices[sac.rarity] || [];
        if (selected.length > 0) {
            const names = selected.map(id => GameData.getItem(id)?.name || id).join(', ');
            let totalQty = 0;
            for (const id of selected) {
                const inv = player.inventory?.find(i => i.itemId === id);
                totalQty += inv?.quantity || 0;
            }
            const enough = totalQty >= sac.count;
            if (!enough) allSatisfied = false;
            text += `${enough ? emojis.success : emojis.error} ${rEmoji} **${sac.count}x** ${sac.rarity}: ${names}\n`;
        } else {
            allSatisfied = false;
            text += `⬜ ${rEmoji} **${sac.count}x** ${sac.rarity}: *select below*\n`;
        }
    }
    text += `\n-# Selected ingredients will be consumed from your inventory`;

    const container = new ContainerBuilder().setAccentColor(STATION_COLOR);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Add ingredient select menu for each sacrifice rarity
    for (const sac of expedition.sacrifices) {
        const ingredients = LabManager.getIngredientsByRarity(player, sac.rarity);
        if (ingredients.length === 0) continue;

        const selected = selectedSacrifices[sac.rarity] || [];
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`research_sacrifice_${sac.rarity.toLowerCase()}`)
            .setPlaceholder(`Choose ${sac.rarity} ingredients (need ${sac.count})`)
            .setMinValues(1)
            .setMaxValues(Math.min(ingredients.length, 25));

        for (const ing of ingredients.slice(0, 25)) {
            const ingEmoji = CommandHelpers.getItemEmoji(ing.itemId);
            const opt = {
                label: `${ing.name} (x${ing.quantity})`,
                value: ing.itemId,
                default: selected.includes(ing.itemId),
            };
            if (ingEmoji) opt.emoji = ingEmoji;
            menu.addOptions(opt);
        }

        container.addActionRowComponents(new ActionRowBuilder().addComponents(menu));
    }

    // Start + Cancel buttons
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`research_confirm_${expedition.id}`)
                .setLabel('Start Research')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🚀')
                .setDisabled(!allSatisfied),
            new ButtonBuilder()
                .setCustomId('research_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(emojis.previous)
        )
    );

    return container;
}

// ── Main Command ────────────────────────────────────────────────────

module.exports = {
    name: 'research',
    description: 'Research in your lab to discover new recipes.',
    usage: '',
    aliases: ['discover'],
    cooldown: 3,
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const { lab, effects } = await LabManager.getLabData(message.author.id);
            await LabManager.syncLabSystems(player, lab, effects);

            // Check if research station exists
            const stationLevel = LabManager.getUpgradeLevel(lab, 'research_station');
            if (stationLevel === 0) {
                return message.reply({
                    embeds: [createErrorEmbed('No Research Station', `You need to upgrade your **Research Station** in the lab first.\nUse \`${prefix}lab\` to view upgrades.`)]
                });
            }

            // Auto-refresh board if needed
            if (LabManager.needsBoardRefresh(lab, effects)) {
                LabManager.generateExpeditionBoard(lab, player, effects);
                await lab.save();
            }

            // Determine initial state
            const hasActive = !!lab.researchExpeditions?.active?.expeditionId;

            let currentState = hasActive ? 'active' : 'idle';
            let selectedExpeditionId = null;
            let selectedSacrifices = {};

            const initialContainer = hasActive
                ? buildActiveContainer(player, lab, effects)
                : buildIdleContainer(player, lab, effects);

            const reply = await message.reply({
                components: [initialContainer],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 120_000
            });

            collector.on('collect', async (interaction) => {
                try {
                    // Reload fresh data
                    const fresh = await CommandHelpers.validatePlayer(message.author.id, prefix);
                    if (!fresh.success) return;
                    const fp = fresh.player;
                    const { lab: freshLab, effects: freshEffects } = await LabManager.getLabData(message.author.id);
                    await LabManager.syncLabSystems(fp, freshLab, freshEffects);

                    if (interaction.isStringSelectMenu() && interaction.customId === 'research_select') {
                        const expId = interaction.values[0];
                        const board = freshLab.researchExpeditions?.board || [];
                        const expedition = board.find(e => e.id === expId);

                        if (!expedition) {
                            await interaction.reply({ content: `${emojis.error} Research no longer available.`, ephemeral: true });
                            return;
                        }

                        selectedExpeditionId = expId;
                        selectedSacrifices = {};
                        currentState = 'confirm';
                        const container = buildConfirmContainer(expedition, fp, selectedSacrifices);
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

                    } else if (interaction.customId.startsWith('research_sacrifice_')) {
                        const rarityLower = interaction.customId.replace('research_sacrifice_', '');
                        const rarityKey = rarityLower.charAt(0).toUpperCase() + rarityLower.slice(1);
                        selectedSacrifices[rarityKey] = interaction.values;

                        // Rebuild confirm with updated selections
                        const board = freshLab.researchExpeditions?.board || [];
                        const expedition = board.find(e => e.id === selectedExpeditionId);
                        if (!expedition) {
                            await interaction.reply({ content: `${emojis.error} Research no longer available.`, ephemeral: true });
                            return;
                        }
                        const container = buildConfirmContainer(expedition, fp, selectedSacrifices);
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

                    } else if (interaction.customId.startsWith('research_confirm_')) {
                        const expId = interaction.customId.replace('research_confirm_', '');

                        const result = LabManager.startExpedition(fp, freshLab, expId, selectedSacrifices);
                        if (!result.success) {
                            await interaction.reply({ content: `${emojis.error} ${result.error}`, ephemeral: true });
                            return;
                        }

                        await fp.save();
                        await freshLab.save();

                        currentState = 'active';
                        selectedExpeditionId = null;
                        selectedSacrifices = {};
                        const container = buildActiveContainer(fp, freshLab, freshEffects);
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

                    } else if (interaction.customId === 'research_cancel') {
                        currentState = 'idle';
                        selectedExpeditionId = null;
                        selectedSacrifices = {};
                        const container = buildIdleContainer(fp, freshLab, freshEffects);
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

                    } else if (interaction.customId === 'research_collect') {
                        const result = LabManager.collectExpedition(fp, freshLab);

                        if (!result.success) {
                            await interaction.reply({ content: `${emojis.error} ${result.error}`, ephemeral: true });
                            return;
                        }

                        await fp.save();
                        await freshLab.save();

                        currentState = 'reveal';
                        const container = buildRevealContainer(result.recipe, result.xp);
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                        collector.stop('collected');

                    } else if (interaction.customId === 'research_check') {
                        // Refresh the active view
                        const container = buildActiveContainer(fp, freshLab, freshEffects);
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

                    } else if (interaction.customId === 'research_refresh') {
                        const result = LabManager.refreshBoard(fp, freshLab, freshEffects);

                        if (!result.success) {
                            await interaction.reply({ content: `${emojis.error} ${result.error}`, ephemeral: true });
                            return;
                        }

                        await fp.save();
                        await freshLab.save();

                        currentState = 'idle';
                        const container = buildIdleContainer(fp, freshLab, freshEffects);
                        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

                    } else {
                        await interaction.deferUpdate();
                    }
                } catch (error) {
                    console.error('Research interaction error:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: `${emojis.error} An error occurred.`, ephemeral: true }).catch(() => {});
                    }
                }
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'collected') return; // Don't modify reveal screen
                try {
                    const fresh = await CommandHelpers.validatePlayer(message.author.id, prefix);
                    if (!fresh.success) return;
                    const fp = fresh.player;
                    const { lab: freshLab, effects: freshEffects } = await LabManager.getLabData(message.author.id);

                    let finalContainer;
                    if (currentState === 'active') {
                        finalContainer = buildActiveContainer(fp, freshLab, freshEffects);
                    } else {
                        finalContainer = buildIdleContainer(fp, freshLab, freshEffects);
                    }

                    if (finalContainer) {
                        finalContainer.components.forEach(component => {
                            if (component.components) {
                                component.components.forEach(inner => {
                                    if (inner.setDisabled) inner.setDisabled(true);
                                });
                            }
                        });
                        reply.edit({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                    }
                } catch {
                    // Silently fail
                }
            });

        } catch (error) {
            console.error('Research command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem with the research station.')]
            });
        }
    }
};
