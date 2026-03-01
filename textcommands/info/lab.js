const Player = require('../../models/Player');
const GameData = require('../../utils/gameData');
const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');
const config = require('../../config/config.json');
const e = require('../../utils/emojis');

// ── Category metadata ──────────────────────────────────────────────
const CATEGORIES = {
    brewing:    { label: 'Brewing',      emoji: '🧪', color: 0xA855F7, desc: 'Enhance your potion crafting capabilities' },
    incubation: { label: 'Incubation',   emoji: '🥚', color: 0xF59E0B, desc: 'Speed up hatching and improve egg outcomes' },
    breeding:   { label: 'Breeding',     emoji: '💕', color: 0xEC4899, desc: 'Boost breeding results and timings' },
    research:   { label: 'Research',     emoji: '📚', color: 0x3B82F6, desc: 'Generate research points over time' },
    healing:    { label: 'Healing',      emoji: '💚', color: 0x10B981, desc: 'Accelerate pal recovery times' },
    decoration: { label: 'Decoration',   emoji: '🏆', color: 0xF97316, desc: 'Cosmetic and prestige upgrades' },
    resource:   { label: 'Resources',    emoji: '🔮', color: 0x8B5CF6, desc: 'Improve foraging and dust generation' },
    stamina:    { label: 'Stamina',      emoji: '⚡', color: 0xEAB308, desc: 'Expand and regenerate stamina faster' },
    expedition: { label: 'Expeditions',  emoji: '🗺️', color: 0x14B8A6, desc: 'Optimize expedition performance and safety' },
    combat:     { label: 'Combat',       emoji: '⚔️', color: 0xEF4444, desc: 'Increase battle XP gains' },
    economy:    { label: 'Economy',      emoji: '💰', color: 0xF59E0B, desc: 'Earn more gold and better shop prices' },
    utility:    { label: 'Utility',      emoji: '🔧', color: 0x6B7280, desc: 'Quality of life improvements' },
};

const LAB_COLOR = 0x7C3AED;

// ── Helpers ─────────────────────────────────────────────────────────

function progressBar(current, max, length = 8) {
    const filled = Math.round((current / max) * length);
    const empty  = length - filled;
    return '▰'.repeat(filled) + '▱'.repeat(empty);
}

function formatCost(cost) {
    if (cost >= 1000) return `${(cost / 1000).toFixed(cost % 1000 === 0 ? 0 : 1)}k`;
    return cost.toLocaleString();
}

function getEffectSummary(upgradeId, effectObj) {
    if (!effectObj) return 'No effect data';
    const entries = Object.entries(effectObj).filter(([k]) => k !== 'level');
    if (entries.length === 0) return 'Active';

    return entries.map(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
            return Object.entries(val).map(([k, v]) => `${humanize(k)}: **${v}**`).join(', ');
        }
        if (typeof val === 'boolean') return val ? `${humanize(key)} ${e.success}` : '';
        if (typeof val === 'number' && val < 1 && val > 0) return `${humanize(key)}: **${(val * 100).toFixed(0)}%**`;
        if (typeof val === 'number' && val >= 1 && val < 10) return `${humanize(key)}: **${val}x**`;
        return `${humanize(key)}: **${val}**`;
    }).filter(Boolean).join(' · ');
}

function humanize(str) {
    return str.replace(/([A-Z])/g, ' $1')
              .replace(/_/g, ' ')
              .replace(/^\w/, c => c.toUpperCase())
              .trim();
}

// ── Text content builders ───────────────────────────────────────────

function buildOverviewText(player, lab, effects, prefix) {
    const labUpgrades = GameData.labUpgrades || {};
    const totalUpgrades = Object.keys(labUpgrades).length;
    const ownedCount = lab.upgrades?.length || 0;
    const totalLevels = Object.values(labUpgrades).reduce((s, u) => s + u.maxLevel, 0);
    const currentLevels = (lab.upgrades || []).reduce((s, u) => s + (u.level || 0), 0);

    const researchStatus = effects.researchGeneration
        ? `${effects.researchGeneration.points} pts / ${effects.researchGeneration.interval}min`
        : '`Not Active`';
    const dustStatus = effects.arcaneDustGeneration
        ? `${effects.arcaneDustGeneration.amount} dust / ${effects.arcaneDustGeneration.interval}min`
        : '`Not Active`';

    return (
        `# 🔬 The Arcane Laboratory\n` +
        `## Lab Level ${lab.level || 1}\n` +
        `${progressBar(currentLevels, totalLevels, 12)}  \`${currentLevels}/${totalLevels}\`\n` +
        `-# ${ownedCount}/${totalUpgrades} upgrades researched\n\n` +
        `### 💰 Resources\n` +
        `${config.emojis.gold || '🪙'} **Gold:** ${player.gold?.toLocaleString() || 0}\n` +
        `${config.emojis.arcane_dust || '✨'} **Arcane Dust:** ${player.arcaneDust?.toLocaleString() || 0}\n` +
        `📊 **Research Points:** ${lab.researchPoints || 0}\n\n` +
        `### ⚡ Active Systems\n` +
        `📚 **Research Station:** ${researchStatus}\n` +
        `🔮 **Arcane Reactor:** ${dustStatus} · \`${Math.floor(lab.arcaneDustStored || 0)} stored\``
    );
}

function buildCategoryText(categoryKey, lab, player) {
    const cat = CATEGORIES[categoryKey];
    if (!cat) return null;

    const labUpgrades = GameData.labUpgrades || {};
    const upgrades = Object.entries(labUpgrades).filter(([, data]) => data.type === categoryKey);

    if (upgrades.length === 0) return null;

    let text = `# ${cat.emoji}  ${cat.label}\n-# ${cat.desc}\n\n`;

    for (const [id, data] of upgrades) {
        const currentLevel = LabManager.getUpgradeLevel(lab, id);
        const isMaxed = currentLevel >= data.maxLevel;
        const nextCost = isMaxed ? null : data.costs[currentLevel];
        const currentEffect = currentLevel > 0 ? data.effects[currentLevel - 1] : null;
        const nextEffect = !isMaxed ? data.effects[currentLevel] : null;

        const statusIcon = isMaxed ? e.success : e.up;
        text += `${statusIcon} **${data.name}**\n`;
        text += `${progressBar(currentLevel, data.maxLevel)}  \`Lv ${currentLevel}/${data.maxLevel}\`\n`;
        text += `-# ${data.description}\n`;

        if (currentEffect) {
            text += `> 📊 ${getEffectSummary(id, currentEffect)}\n`;
        }

        if (!isMaxed) {
            const canAfford = player.gold >= nextCost;
            const costEmoji = canAfford ? '🟢' : '🔴';
            text += `> ${costEmoji} Next: ${config.emojis.gold || '🪙'} **${formatCost(nextCost)}** gold`;
            if (nextEffect) {
                text += ` → ${getEffectSummary(id, nextEffect)}`;
            }
            text += `\n`;
        }

        text += `> \`ID: ${id}\`\n\n`;
    }

    return text;
}

function buildUpgradeDetailText(upgradeId, lab, player) {
    const labUpgrades = GameData.labUpgrades || {};
    const data = labUpgrades[upgradeId];
    if (!data) return null;

    const cat = CATEGORIES[data.type] || { emoji: '🔬' };
    const currentLevel = LabManager.getUpgradeLevel(lab, upgradeId);
    const isMaxed = currentLevel >= data.maxLevel;

    let text = `# ${cat.emoji}  ${data.name}\n`;
    text += `-# ${data.description}\n\n`;
    text += `### Level Progress\n`;
    text += `${progressBar(currentLevel, data.maxLevel, 10)}  **${currentLevel}/${data.maxLevel}**\n\n`;

    text += `### Upgrade Tiers\n`;
    for (let i = 0; i < data.maxLevel; i++) {
        const level = i + 1;
        const effect = data.effects[i];
        const cost = data.costs[i];
        const isUnlocked = currentLevel >= level;
        const isNext = currentLevel === level - 1;

        let prefix_;
        if (isUnlocked) prefix_ = e.success;
        else if (isNext) prefix_ = e.next;
        else prefix_ = '🔒';

        text += `${prefix_} **Lv ${level}**`;
        if (!isUnlocked) text += ` · ${config.emojis.gold || '🪙'} ${formatCost(cost)}`;
        text += `\n`;
        text += `> ${getEffectSummary(upgradeId, effect)}\n`;
    }

    if (!isMaxed) {
        const nextCost = data.costs[currentLevel];
        const canAfford = player.gold >= nextCost;
        text += `\n### ${canAfford ? '🟢' : '🔴'} Upgrade Cost\n`;
        text += `${config.emojis.gold || '🪙'} **${nextCost.toLocaleString()}** gold`;
        text += canAfford ? ` *(You have ${player.gold.toLocaleString()})*` : ` *(Need ${(nextCost - player.gold).toLocaleString()} more)*`;
    } else {
        text += `\n### ${e.success} Fully Maxed!`;
    }

    return text;
}

// ── Container builders (Components V2) ──────────────────────────────

function buildOverviewContainer(player, lab, effects, prefix, labUpgrades) {
    const container = new ContainerBuilder()
        .setAccentColor(LAB_COLOR);

    // Text content
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(buildOverviewText(player, lab, effects, prefix))
    );

    // Separator before controls
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Category select menu
    const selectMenu = buildCategorySelect(lab, labUpgrades);
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
    );

    // Separator before controls
    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );
    
    // Action buttons
    container.addActionRowComponents(buildButtonRow(lab));

    return container;
}

function buildCategoryContainer(categoryKey, lab, player, labUpgrades) {
    const cat = CATEGORIES[categoryKey];
    if (!cat) return null;

    const text = buildCategoryText(categoryKey, lab, player);
    if (!text) return null;

    const container = new ContainerBuilder()
        .setAccentColor(cat.color);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Main category select
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(buildCategorySelect(lab, labUpgrades))
    );

    // Upgrade detail select for this category
    const catUpgrades = Object.entries(labUpgrades).filter(([, d]) => d.type === categoryKey);
    if (catUpgrades.length > 0) {
        const upgradeSelect = new StringSelectMenuBuilder()
            .setCustomId('lab_upgrade_select')
            .setPlaceholder('🔍 View upgrade details...');

        for (const [id, data] of catUpgrades) {
            const level = LabManager.getUpgradeLevel(lab, id);
            const isMaxed = level >= data.maxLevel;
            upgradeSelect.addOptions({
                label: `${data.name} (Lv ${level}/${data.maxLevel})`,
                description: isMaxed ? `Maxed` : `Next: ${formatCost(data.costs[level])} gold`,
                value: id
            });
        }
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(upgradeSelect)
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Action buttons
    container.addActionRowComponents(buildButtonRow(lab));

    return container;
}

function buildUpgradeDetailContainer(upgradeId, lab, player, labUpgrades) {
    const data = labUpgrades[upgradeId];
    if (!data) return null;

    const cat = CATEGORIES[data.type] || { color: LAB_COLOR };
    const text = buildUpgradeDetailText(upgradeId, lab, player);
    if (!text) return null;

    const currentLevel = LabManager.getUpgradeLevel(lab, upgradeId);
    const isMaxed = currentLevel >= data.maxLevel;
    const nextCost = isMaxed ? Infinity : data.costs[currentLevel];
    const canAfford = player.gold >= nextCost;

    const container = new ContainerBuilder()
        .setAccentColor(cat.color);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Main category select
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(buildCategorySelect(lab, labUpgrades))
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Buy + Back buttons
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lab_buy_upgrade')
                .setLabel(isMaxed ? 'Already Maxed' : `Upgrade → Lv ${currentLevel + 1} (${formatCost(nextCost)} gold)`)
                .setStyle(isMaxed ? ButtonStyle.Secondary : canAfford ? ButtonStyle.Success : ButtonStyle.Danger)
                .setDisabled(isMaxed || !canAfford)
                .setEmoji(isMaxed ? e.success : e.up),
            new ButtonBuilder()
                .setCustomId('lab_back_category')
                .setLabel('Back to Category')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.previous)
        )
    );

    return container;
}

function buildSuccessContainer(upgradeId, lab, player, labUpgrades, newLevel) {
    const data = labUpgrades[upgradeId];
    const cat = CATEGORIES[data.type] || { color: LAB_COLOR };
    const isMaxed = newLevel >= data.maxLevel;
    const nextCost = isMaxed ? Infinity : data.costs[newLevel];
    const canAfford = player.gold >= nextCost;

    const container = new ContainerBuilder()
        .setAccentColor(0x10B981);

    // Success banner
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### ${e.success} Upgrade Successful!\n**${data.name}** upgraded to **Level ${newLevel}** · ${config.emojis.gold || '🪙'} **${player.gold.toLocaleString()}** gold remaining`
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Updated detail text
    const detailText = buildUpgradeDetailText(upgradeId, lab, player);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(detailText)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Main category select
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(buildCategorySelect(lab, labUpgrades))
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // Buy + Back buttons
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lab_buy_upgrade')
                .setLabel(isMaxed ? 'Already Maxed' : `Upgrade → Lv ${newLevel + 1} (${formatCost(nextCost)} gold)`)
                .setStyle(isMaxed ? ButtonStyle.Secondary : canAfford ? ButtonStyle.Success : ButtonStyle.Danger)
                .setDisabled(isMaxed || !canAfford)
                .setEmoji(isMaxed ? e.success : e.up),
            new ButtonBuilder()
                .setCustomId('lab_back_category')
                .setLabel('Back to Category')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(e.previous)
        )
    );

    return container;
}

// ── Shared component builders ───────────────────────────────────────

function buildCategorySelect(lab, labUpgrades) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('lab_category_select')
        .setPlaceholder('🔬 Browse Upgrade Categories...')
        .addOptions({ label: '🏠 Overview', description: 'Return to lab overview', value: 'overview', emoji: '🔬' });

    const usedCategories = [...new Set(Object.values(labUpgrades).map(u => u.type))];
    for (const catKey of usedCategories) {
        const cat = CATEGORIES[catKey];
        if (!cat) continue;
        const catUpgradesList = Object.values(labUpgrades).filter(u => u.type === catKey);
        const totalOwned = catUpgradesList.reduce((sum, u) => {
            const id = Object.entries(labUpgrades).find(([, d]) => d === u)?.[0];
            return sum + (id ? LabManager.getUpgradeLevel(lab, id) : 0);
        }, 0);
        const totalMax = catUpgradesList.reduce((sum, u) => sum + u.maxLevel, 0);
        selectMenu.addOptions({
            label: `${cat.label}  (${totalOwned}/${totalMax})`,
            description: cat.desc,
            value: catKey,
            emoji: cat.emoji.length <= 2 ? cat.emoji : undefined
        });
    }

    return selectMenu;
}

function buildButtonRow(lab) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lab_collect_dust')
            .setLabel(`Collect Dust (${Math.floor(lab.arcaneDustStored || 0)})`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(CommandHelpers.getItemEmoji('arcane_dust'))
            .setDisabled(!lab.arcaneDustStored || lab.arcaneDustStored < 1),
        new ButtonBuilder()
            .setCustomId('lab_refresh')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(e.reload)
    );
}

// ── Main command ────────────────────────────────────────────────────

module.exports = {
    name: 'lab',
    description: 'View and manage your laboratory upgrades.',
    usage: '[upgrade <id>]',
    aliases: ['laboratory'],
    cooldown: 5,
    async execute(message, args, client, prefix) {
        const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
        if (!playerResult.success) {
            return message.reply({ embeds: [playerResult.embed] });
        }
        const player = playerResult.player;
        const { lab, effects } = await LabManager.getLabData(message.author.id);
        await LabManager.syncLabSystems(player, lab, effects);

        // ── Direct upgrade subcommand (kept for quick CLI use) ──
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'upgrade' && args[1]) {
            return this.handleUpgrade(message, player, lab, effects, args[1].toLowerCase(), prefix);
        }

        // ── Interactive panel (Components V2) ───────────────────
        const labUpgrades = GameData.labUpgrades || {};
        const overviewContainer = buildOverviewContainer(player, lab, effects, prefix, labUpgrades);

        const reply = await message.reply({
            components: [overviewContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // ── Collector ───────────────────────────────────────────
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120_000
        });

        let currentView = 'overview';
        let selectedUpgradeId = null;

        collector.on('collect', async (interaction) => {
            try {
                // Reload data on every interaction for fresh state
                const freshPlayer = await CommandHelpers.validatePlayer(message.author.id, prefix);
                if (!freshPlayer.success) return;
                const fp = freshPlayer.player;
                const { lab: freshLab, effects: freshEffects } = await LabManager.getLabData(message.author.id);
                await LabManager.syncLabSystems(fp, freshLab, freshEffects);

                if (interaction.isStringSelectMenu() && interaction.customId === 'lab_category_select') {
                    const value = interaction.values[0];

                    if (value === 'overview') {
                        currentView = 'overview';
                        selectedUpgradeId = null;
                        const container = buildOverviewContainer(fp, freshLab, freshEffects, prefix, labUpgrades);
                        await interaction.update({
                            components: [container],
                            flags: MessageFlags.IsComponentsV2
                        });
                    } else {
                        currentView = value;
                        selectedUpgradeId = null;
                        const container = buildCategoryContainer(value, freshLab, fp, labUpgrades);
                        if (!container) {
                            await interaction.deferUpdate();
                            return;
                        }
                        await interaction.update({
                            components: [container],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                } else if (interaction.isStringSelectMenu() && interaction.customId === 'lab_upgrade_select') {
                    selectedUpgradeId = interaction.values[0];
                    const container = buildUpgradeDetailContainer(selectedUpgradeId, freshLab, fp, labUpgrades);
                    if (!container) {
                        await interaction.deferUpdate();
                        return;
                    }
                    await interaction.update({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else if (interaction.customId === 'lab_buy_upgrade' && selectedUpgradeId) {
                    const result = await this.performUpgrade(fp, freshLab, freshEffects, selectedUpgradeId);
                    if (result.success) {
                        const { lab: updatedLab } = await LabManager.getLabData(message.author.id);
                        const updatedPlayer = (await CommandHelpers.validatePlayer(message.author.id, prefix)).player;
                        const container = buildSuccessContainer(selectedUpgradeId, updatedLab, updatedPlayer, labUpgrades, result.newLevel);
                        await interaction.update({
                            components: [container],
                            flags: MessageFlags.IsComponentsV2
                        });
                    } else {
                        await interaction.reply({ content: `${e.error} ${result.error}`, ephemeral: true });
                    }
                } else if (interaction.customId === 'lab_back_category' && currentView !== 'overview') {
                    selectedUpgradeId = null;
                    const container = buildCategoryContainer(currentView, freshLab, fp, labUpgrades);
                    if (!container) {
                        await interaction.deferUpdate();
                        return;
                    }
                    await interaction.update({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else if (interaction.customId === 'lab_collect_dust') {
                    const amount = LabManager.collectArcaneDust(fp, freshLab);
                    if (amount > 0) {
                        await fp.save();
                        await freshLab.save();
                        await interaction.reply({
                            content: `${config.emojis.arcane_dust || '✨'} Collected **${amount}** Arcane Dust! You now have **${fp.arcaneDust.toLocaleString()}** total.`,
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({ content: '🔮 No dust available to collect.', ephemeral: true });
                    }
                } else if (interaction.customId === 'lab_refresh') {
                    currentView = 'overview';
                    selectedUpgradeId = null;
                    const container = buildOverviewContainer(fp, freshLab, freshEffects, prefix, labUpgrades);
                    await interaction.update({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else {
                    await interaction.deferUpdate();
                }
            } catch (error) {
                console.error('Lab interaction error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `${e.error} An error occurred. Please try again.`, ephemeral: true }).catch(() => {});
                }
            }
        });

        collector.on('end', async () => {
            try {
                // Rebuild the current view to keep the text, but disable inputs
                const freshPlayer = await CommandHelpers.validatePlayer(message.author.id, prefix);
                if (!freshPlayer.success) return;
                const fp = freshPlayer.player;
                const { lab: freshLab, effects: freshEffects } = await LabManager.getLabData(message.author.id);
                
                let finalContainer;
                if (currentView === 'overview') {
                    finalContainer = buildOverviewContainer(fp, freshLab, freshEffects, prefix, labUpgrades);
                } else if (selectedUpgradeId) {
                    finalContainer = buildUpgradeDetailContainer(selectedUpgradeId, freshLab, fp, labUpgrades);
                } else {
                    finalContainer = buildCategoryContainer(currentView, freshLab, fp, labUpgrades);
                }

                if (finalContainer) {
                    finalContainer.components.forEach(component => {
                        if (component.components) {
                            component.components.forEach(inner => {
                                if (inner.setDisabled) inner.setDisabled(true);
                            });
                        }
                    });

                    reply.edit({
                        components: [finalContainer],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                }
            } catch (err) {
                reply.edit({ components: [] }).catch(() => {});
            }
        });
    },

    // ── Direct upgrade handler (for text command) ───────────────
    async handleUpgrade(message, player, lab, effects, upgradeId, prefix) {
        const result = await this.performUpgrade(player, lab, effects, upgradeId);
        if (!result.success) {
            const { createErrorEmbed } = require('../../utils/embed');
            return message.reply({ embeds: [createErrorEmbed('Upgrade Failed', result.error)] });
        }

        const upgradeData = GameData.labUpgrades?.[upgradeId];
        const embed = new EmbedBuilder()
            .setColor('#10B981')
            .setDescription(
                `### ${e.success} Upgrade Purchased!\n` +
                `**${upgradeData.name}** upgraded to **Level ${result.newLevel}/${upgradeData.maxLevel}**\n` +
                `${config.emojis.gold || '🪙'} **${player.gold.toLocaleString()}** gold remaining`
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async performUpgrade(player, lab, effects, upgradeId) {
        const upgradeData = GameData.labUpgrades?.[upgradeId];
        if (!upgradeData) {
            return { success: false, error: 'That upgrade ID does not exist. Use the dropdown to browse upgrades.' };
        }

        const currentLevel = LabManager.getUpgradeLevel(lab, upgradeId);
        if (currentLevel >= upgradeData.maxLevel) {
            return { success: false, error: `**${upgradeData.name}** is already at max level.` };
        }

        const cost = upgradeData.costs[currentLevel];
        if (player.gold < cost) {
            return { success: false, error: `You need **${cost.toLocaleString()}** gold (have ${player.gold.toLocaleString()}).` };
        }

        player.gold -= cost;
        LabManager.setUpgradeLevel(lab, upgradeId, currentLevel + 1);

        const updatedEffects = LabManager.calculateEffects(lab);
        await LabManager.syncLabSystems(player, lab, updatedEffects);
        await player.save();
        await lab.save();

        return { success: true, newLevel: currentLevel + 1 };
    }
};
