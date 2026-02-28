const Player = require('../../models/Player');
const { createErrorEmbed } = require('../../utils/embed');
const GameData = require('../../utils/gameData');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const config = require('../../config/config.json');
const CommandHelpers = require('../../utils/commandHelpers');
const e = config.emojis;

const ITEMS_PER_PAGE = 12;
const INV_COLOR = 0x87CEEB;

// ── Category metadata ──────────────────────────────────────────────
const TYPE_META = {
    ingredient:        { label: 'Ingredients',        emoji: e.ingredients || '🌿', sort: 1 },
    crafting_material: { label: 'Crafting Materials',  emoji: e.crafting || '⚒️',   sort: 2 },
    potion:            { label: 'Potions',             emoji: e.potion || '🧪',     sort: 3 },
    equipment:         { label: 'Equipment',           emoji: e.equipment || '⚔️',  sort: 4 },
    egg:               { label: 'Eggs',                emoji: '🥚',                  sort: 5 },
    hatcher:           { label: 'Structures',          emoji: e['Alchemical Incubator'] || '🏗️', sort: 6 },
    essence:           { label: 'Essences',            emoji: e.essence || '✨',     sort: 7 },
    taming_lure:       { label: 'Lures',               emoji: e['Taming Lure'] || '🎣', sort: 8 },
    crate:             { label: 'Crates',              emoji: '📦',                  sort: 9 },
    voter_luck:        { label: 'Special',             emoji: '🍀',                  sort: 10 }
};


// ── Helpers ─────────────────────────────────────────────────────────

function sortInventory(inventory) {
    const rarityOrder = { legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };

    // Pre-compute sort keys for stable sorting
    const withKeys = inventory.map(inv => {
        const item = GameData.getItem(inv.itemId);
        return {
            inv,
            typeSort: item ? (TYPE_META[item.type]?.sort || 99) : 999,
            raritySort: item ? (rarityOrder[item.rarity?.toLowerCase()] || 99) : 999,
            name: item?.name || inv.itemId
        };
    });

    withKeys.sort((a, b) => {
        if (a.typeSort !== b.typeSort) return a.typeSort - b.typeSort;
        if (a.raritySort !== b.raritySort) return a.raritySort - b.raritySort;
        return a.name.localeCompare(b.name);
    });

    return withKeys.map(w => w.inv);
}

function applyFilters(inventory, typeFilter) {
    if (!typeFilter || typeFilter === 'all') return inventory;
    return inventory.filter(inv => {
        const item = GameData.getItem(inv.itemId);
        return item && item.type === typeFilter;
    });
}

// ── Container builders ──────────────────────────────────────────────

function buildInventoryContainer(player, user, sortedItems, page, totalPages, activeFilter) {
    const container = new ContainerBuilder()
        .setAccentColor(INV_COLOR);

    // ── Header ──
    const totalItemCount = player.inventory.reduce((sum, i) => sum + i.quantity, 0);
    let header = `### 🎒 ${user.username}'s Inventory\n`;
    header += `${e.gold} **${player.gold.toLocaleString()}** Gold  •  ${e.arcane_dust} **${player.arcaneDust.toLocaleString()}** Arcane Dust  •  📦 **${totalItemCount}** Items`;

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(header)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // ── Filter select menu ──
    const filterSelect = new StringSelectMenuBuilder()
        .setCustomId('inv_filter')
        .setPlaceholder('🔍 Filter by item type...');

    filterSelect.addOptions({
        label: 'All Items',
        description: `Show all ${player.inventory.length} item types`,
        value: 'all',
        emoji: '📋',
        default: activeFilter === 'all'
    });

    // Only show types the player actually has items of
    const ownedTypes = new Set();
    player.inventory.forEach(inv => {
        const item = GameData.getItem(inv.itemId);
        if (item) ownedTypes.add(item.type);
    });

    for (const [type, meta] of Object.entries(TYPE_META)) {
        if (!ownedTypes.has(type)) continue;
        const count = player.inventory.filter(inv => {
            const item = GameData.getItem(inv.itemId);
            return item && item.type === type;
        }).length;
        filterSelect.addOptions({
            label: `${meta.label}  (${count})`,
            description: `Show ${meta.label.toLowerCase()} only`,
            value: type,
            default: activeFilter === type
        });
    }

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(filterSelect)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // ── Item list ──
    if (sortedItems.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('*No items match this filter.*')
        );
    } else {
        const start = page * ITEMS_PER_PAGE;
        const pageItems = sortedItems.slice(start, start + ITEMS_PER_PAGE);

        let content = '';
        // Track the type of the last item on the previous page so we know
        // whether to print a type header for the first item on this page
        let lastType = '';
        if (start > 0) {
            const prevItem = GameData.getItem(sortedItems[start - 1].itemId);
            lastType = prevItem?.type || '';
        }

        pageItems.forEach(invItem => {
            const itemData = GameData.getItem(invItem.itemId);
            if (!itemData) return;
            const itemEmoji = CommandHelpers.getItemEmoji(invItem.itemId);

            if (itemData.type !== lastType) {
                const meta = TYPE_META[itemData.type] || { label: itemData.type, emoji: '❓' };
                if (content) content += '\n'; // spacing between groups
                content += `${meta.emoji} **${meta.label}**\n`;
                lastType = itemData.type;
            }

            content += `> ${itemEmoji} \`${invItem.quantity}x\` **${itemData.name}** *(${itemData.rarity})*\n`;
        });

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content || '*No items to display.*')
        );
    }

    // Helper to safely extract emoji ID or fallback to string for buttons
    const getBtnEmoji = (emojiStr, fallback) => {
        if (!emojiStr) return fallback;
        const match = emojiStr.match(/<a?:.+:(\d+)>/);
        return match ? match[1] : emojiStr;
    };

    // ── Pagination buttons ──
    if (totalPages > 1) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true)
        );

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('inv_first')
                    .setEmoji(getBtnEmoji(e.first, '⏮️'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('inv_prev')
                    .setEmoji(getBtnEmoji(e.previous, '◀️'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('inv_page')
                    .setLabel(`${page + 1} / ${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('inv_next')
                    .setEmoji(getBtnEmoji(e.next, '▶️'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('inv_last')
                    .setEmoji(getBtnEmoji(e.last, '⏭️'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            )
        );
    } else if (sortedItems.length > 0) {
        // Show page count even if single page
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Page 1 of 1 • ${sortedItems.length} items`)
        );
    }

    return container;
}

// ── Main command ────────────────────────────────────────────────────

module.exports = {
    name: 'inventory',
    description: 'View your alchemical ingredients, potions, and equipment.',
    usage: '[@user]',
    aliases: ['inv', 'bag'],
    cooldown: 3,
    async execute(message, args, client, prefix) {
        try {
            const user = message.author;

            const playerResult = await CommandHelpers.validatePlayer(user.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            if (!player.inventory || player.inventory.length === 0) {
                return message.reply({
                    embeds: [createErrorEmbed('Empty Inventory', `Your inventory is empty. Use \`${prefix}forage\` to find some ingredients!`)]
                });
            }

            let activeFilter = 'all';
            let currentPage = 0;

            const getFilteredSorted = () => {
                const filtered = applyFilters(player.inventory, activeFilter);
                return sortInventory(filtered);
            };

            let sortedItems = getFilteredSorted();
            let totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE));

            const container = buildInventoryContainer(player, user, sortedItems, currentPage, totalPages, activeFilter);

            const reply = await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            // ── Collector ───────────────────────────────────────────
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000
            });

            collector.on('collect', async (interaction) => {
                try {
                    if (interaction.isStringSelectMenu() && interaction.customId === 'inv_filter') {
                        activeFilter = interaction.values[0];
                        currentPage = 0;
                    } else if (interaction.isButton()) {
                        switch (interaction.customId) {
                            case 'inv_first': currentPage = 0; break;
                            case 'inv_prev':  currentPage = Math.max(0, currentPage - 1); break;
                            case 'inv_next':  currentPage = Math.min(totalPages - 1, currentPage + 1); break;
                            case 'inv_last':  currentPage = totalPages - 1; break;
                        }
                    }

                    sortedItems = getFilteredSorted();
                    totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE));
                    currentPage = Math.min(currentPage, totalPages - 1);

                    const updated = buildInventoryContainer(player, user, sortedItems, currentPage, totalPages, activeFilter);

                    await interaction.update({
                        components: [updated],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (err) {
                    if (err.code === 10062) return; // Expired interaction
                    console.error('Inventory interaction error:', err);
                }
            });

            collector.on('end', () => {
                // Disable all components on timeout
                sortedItems = getFilteredSorted();
                totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE));
                const finalContainer = buildInventoryContainer(player, user, sortedItems, currentPage, totalPages, activeFilter);
                reply.edit({
                    components: [finalContainer],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
            });

        } catch (error) {
            console.error('Inventory command error:', error);
            message.reply({
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching your inventory.')]
            });
        }
    }
};