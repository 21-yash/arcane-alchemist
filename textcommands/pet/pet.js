const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, SectionBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createCustomEmbed, createInfoEmbed } = require('../../utils/embed');
const { calculateXpForNextLevel } = require('../../utils/leveling');
const GameData = require('../../utils/gameData');
const config = require('../../config/config.json');
const { restorePetHp } = require('../../utils/stamina');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');
const e = require('../../utils/emojis');

const PALS_PER_PAGE = 12;
const PET_COLOR = 0x3498DB;

const TYPE_META = {
    beast:      { label: 'Beast',      emoji: '🐾', sort: 1 },
    elemental:  { label: 'Elemental',  emoji: '🌋', sort: 2 },
    mystic:     { label: 'Mystic',     emoji: '🔮', sort: 3 },
    undead:     { label: 'Undead',     emoji: '💀', sort: 4 },
    mechanical: { label: 'Mechanical', emoji: '⚙️', sort: 5 },
    abyssal:    { label: 'Abyssal',    emoji: '🌑', sort: 6 },
    aeonic:     { label: 'Aeonic',     emoji: '⏳', sort: 7 }
};

// ── Shared Helpers ──────────────────────────────────────────────────

function cleanExpiredPotionEffects(pal) {
    if (!pal.potionEffects || pal.potionEffects.length === 0) return false;
    
    const now = Date.now();
    const expiredEffects = pal.potionEffects.filter(effect => effect.expiresAt && effect.expiresAt < now);
    
    if (expiredEffects.length === 0) return false;
    
    // Revert stats from expired effects
    expiredEffects.forEach(effect => {
        switch (effect.type) {
            case 'stat_boost':
            case 'multi_boost':
                if (effect.stats) {
                    Object.entries(effect.stats).forEach(([stat, value]) => {
                        if (pal.stats[stat] !== undefined) {
                            pal.stats[stat] = Math.max(stat === 'hp' ? 1 : 0, pal.stats[stat] - value);
                        }
                    });
                }
                break;
                
            case 'trade_boost':
                if (effect.gain) {
                    Object.entries(effect.gain).forEach(([stat, value]) => {
                        if (pal.stats[stat] !== undefined) {
                            pal.stats[stat] = Math.max(stat === 'hp' ? 1 : 0, pal.stats[stat] - value);
                        }
                    });
                }
                if (effect.lose) {
                    Object.entries(effect.lose).forEach(([stat, value]) => {
                        if (pal.stats[stat] !== undefined) {
                            pal.stats[stat] += value;
                        }
                    });
                }
                break;
                
            case 'familiar_type_boost':
                const palData = GameData.getPet(pal.basePetId);
                const palType = palData?.type || "Beast";
                
                if (effect.target && palType.toLowerCase() === effect.target.toLowerCase()) {
                    if (effect.stats) {
                        Object.entries(effect.stats).forEach(([stat, value]) => {
                            if (pal.stats[stat] !== undefined) {
                                pal.stats[stat] = Math.max(stat === 'hp' ? 1 : 0, pal.stats[stat] - value);
                            }
                        });
                    }
                }
                break;
                
            case 'special':
                if (effect.bonus_luck) {
                    pal.stats.luck = Math.max(0, pal.stats.luck - effect.bonus_luck);
                }
                if (effect.crit_bonus) {
                    pal.stats.luck = Math.max(0, pal.stats.luck - effect.crit_bonus);
                }
                break;
        }
    });
    
    // Remove expired effects from array
    pal.potionEffects = pal.potionEffects.filter(effect => !effect.expiresAt || effect.expiresAt >= now);
    
    return expiredEffects.length > 0;
}

const generatePalDetailEmbed = (pal, member) => {
    const basePalInfo = GameData.getPet(pal.basePetId);
    
    const xpForNextLevel = calculateXpForNextLevel(pal.level);
    const progressPercentage = Math.floor((pal.xp / xpForNextLevel) * 100);
    const filledBlocks = Math.round(progressPercentage / 10);
    const emptyBlocks = 10 - filledBlocks;
    const progressBar = '▓'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

    // Calculate base stats (without potion boosts)
    const baseStats = { ...pal.stats };
    const potionBoosts = { hp: 0, atk: 0, def: 0, spd: 0, luck: 0 };
    
    // Calculate potion boosts by reverting applied effects
    if (pal.potionEffects && pal.potionEffects.length > 0) {
        const now = Date.now();
        pal.potionEffects.forEach(effect => {
            if (effect.expiresAt && effect.expiresAt < now) return; // Skip expired
            
            switch (effect.type) {
                case 'stat_boost':
                case 'multi_boost':
                    if (effect.stats) {
                        Object.entries(effect.stats).forEach(([stat, value]) => {
                            if (potionBoosts[stat] !== undefined) {
                                potionBoosts[stat] += value;
                            }
                        });
                    }
                    break;
                    
                case 'trade_boost':
                    if (effect.gain) {
                        Object.entries(effect.gain).forEach(([stat, value]) => {
                            if (potionBoosts[stat] !== undefined) {
                                potionBoosts[stat] += value;
                            }
                        });
                    }
                    if (effect.lose) {
                        Object.entries(effect.lose).forEach(([stat, value]) => {
                            if (potionBoosts[stat] !== undefined) {
                                potionBoosts[stat] -= value;
                            }
                        });
                    }
                    break;
                    
                case 'familiar_type_boost':
                    const palType = basePalInfo?.type || "Beast";
                    if (effect.target && palType.toLowerCase() === effect.target.toLowerCase()) {
                        if (effect.stats) {
                            Object.entries(effect.stats).forEach(([stat, value]) => {
                                if (potionBoosts[stat] !== undefined) {
                                    potionBoosts[stat] += value;
                                }
                            });
                        }
                    }
                    break;
                    
                case 'special':
                    if (effect.bonus_luck) {
                        potionBoosts.luck += effect.bonus_luck;
                    }
                    if (effect.crit_bonus) {
                        potionBoosts.luck += effect.crit_bonus;
                    }
                    break;
            }
        });
    }

    // Format stat display with boosts
    const formatStat = (current, boost) => {
        if (boost > 0) {
            return `\`${current}\` \`(+${boost})\``;
        } else if (boost < 0) {
            return `\`${current}\` \`(${boost})\``;
        }
        return `\`${current}\``;
    };

    const fields = [
        { name: '❤️ HP', value: formatStat(pal.currentHp || pal.stats.hp, potionBoosts.hp), inline: true },
        { name: '⚔️ ATK', value: formatStat(pal.stats.atk, potionBoosts.atk), inline: true },
        { name: '🛡️ DEF', value: formatStat(pal.stats.def, potionBoosts.def), inline: true },
        { name: '💨 SPD', value: formatStat(pal.stats.spd, potionBoosts.spd), inline: true },
        { name: '🍀 LUCK', value: formatStat(pal.stats.luck, potionBoosts.luck), inline: true },
    ];

    // Add active potions field if there are any
    if (pal.potionEffects && pal.potionEffects.length > 0) {
        const now = Date.now();
        const activeEffects = pal.potionEffects.filter(e => !e.expiresAt || e.expiresAt > now);
        
        if (activeEffects.length > 0) {
            const formatDuration = (ms) => {
                const minutes = Math.floor(ms / (1000 * 60));
                const hours = Math.floor(minutes / 60);
                if (hours > 0) {
                    const remainingMinutes = minutes % 60;
                    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
                }
                return `${minutes}m`;
            };
            
            const potionList = activeEffects.map(effect => {
                const timeLeft = formatDuration(effect.expiresAt - now);
                return `\`${effect.source} (${timeLeft})\``;
            }).join('\n');
            
            fields.push({ name: '🧪 Active Potions', value: potionList, inline: false });
        }
    }

    const abilityEffect = pal.potionEffects.find(effect => effect.ability);
    let ability;

    if (abilityEffect) {
        // Replaces underscores with spaces and Capitalizes Words
        ability = abilityEffect.ability
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()); 
    } else {
        ability = null;
    }
    const footer = ability ? `Status: ${pal.status} | Ability: ${ability}` : `Status: ${pal.status}`;

    return createCustomEmbed(
        `${pal.nickname} (Lvl. ${pal.level} ${basePalInfo.name})`,
        `**XP:** \`${pal.xp} / ${xpForNextLevel}\`\n\`${progressBar}\` (${progressPercentage}%)`,
        '#3498DB',
        {
            fields: fields,
            timestamp: false,
            footer: { text: footer }
        }
    );
};

// ── Components V2 List Builders ─────────────────────────────────────

function sortPals(pals, sortBy) {
    const rarityOrder = { legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };
    const withKeys = pals.map(pal => {
        const base = GameData.getPet(pal.basePetId);
        return {
            pal,
            level: pal.level,
            id: pal.shortId,
            raritySort: base ? (rarityOrder[base.rarity?.toLowerCase()] || 99) : 999
        };
    });

    withKeys.sort((a, b) => {
        if (sortBy === 'lvl') {
            if (a.level !== b.level) return b.level - a.level; // Highest level first
            if (a.raritySort !== b.raritySort) return a.raritySort - b.raritySort;
            return a.id - b.id;
        } else if (sortBy === 'rarity') {
            if (a.raritySort !== b.raritySort) return a.raritySort - b.raritySort; // Highest rarity first
            if (a.level !== b.level) return b.level - a.level;
            return a.id - b.id;
        } else {
            // Default: sort by ID
            return a.id - b.id;
        }
    });

    return withKeys.map(w => w.pal);
}

function applyFilters(pals, filterValue) {
    if (!filterValue || filterValue === 'all') return pals;
    
    if (filterValue.startsWith('type:')) {
        const type = filterValue.split(':')[1];
        return pals.filter(pal => {
            const item = GameData.getPet(pal.basePetId);
            return item && item.type?.toLowerCase() === type;
        });
    } else if (filterValue.startsWith('rarity:')) {
        const rarity = filterValue.split(':')[1];
        return pals.filter(pal => {
            const item = GameData.getPet(pal.basePetId);
            return item && item.rarity?.toLowerCase() === rarity;
        });
    }
    return pals;
}

function buildPetListContainer(member, allPals, sortedPals, page, totalPages, activeFilter, sortBy) {
    const container = new ContainerBuilder()
        .setAccentColor(PET_COLOR);

    // ── Header Area ──
    let highestLevel = 0;
    allPals.forEach(p => { if (p.level > highestLevel) highestLevel = p.level });
    
    let header = `## 🐾 ${member.displayName}'s Pals\n`;
    let sortName = sortBy === 'id' ? 'ID' : (sortBy === 'lvl' ? 'Level' : 'Rarity');
    header += `Pals Owned: \`${allPals.length}\`  •  Sorting by: \`${sortName}\``;

    const sortBtn = new ButtonBuilder()
        .setCustomId('pet_sort')
        .setLabel(sortName)
        .setStyle(ButtonStyle.Secondary);

    const headerSection = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
        .setButtonAccessory(sortBtn);

    container.addSectionComponents(headerSection);

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // ── Filter Select Menu ──
    const filterSelect = new StringSelectMenuBuilder()
        .setCustomId('pet_filter')
        .setPlaceholder('🔍 Filter by Pal type or rarity...');

    filterSelect.addOptions({
        label: 'All Pals',
        description: `Show all ${allPals.length} Pals`,
        value: 'all',
        emoji: '📋',
        default: activeFilter === 'all'
    });

    const ownedTypes = new Set();
    const ownedRarities = new Set();
    allPals.forEach(pal => {
        const base = GameData.getPet(pal.basePetId);
        if (base) {
            if (base.type) ownedTypes.add(base.type.toLowerCase());
            if (base.rarity) ownedRarities.add(base.rarity.toLowerCase());
        }
    });

    const RARITY_META = {
        common: { label: 'Common', emoji: config.emojis.Common },
        uncommon: { label: 'Uncommon', emoji: config.emojis.Uncommon },
        rare: { label: 'Rare', emoji: config.emojis.Rare },
        epic: { label: 'Epic', emoji: config.emojis.Epic },
        legendary: { label: 'Legendary', emoji: config.emojis.Legendary }
    };

    // Add Type filters
    for (const [typeKey, meta] of Object.entries(TYPE_META)) {
        if (!ownedTypes.has(typeKey)) continue;
        const count = allPals.filter(p => GameData.getPet(p.basePetId)?.type?.toLowerCase() === typeKey).length;
        filterSelect.addOptions({
            label: `Type: ${meta.label} (${count})`,
            value: `type:${typeKey}`,
            emoji: meta.emoji,
            default: activeFilter === `type:${typeKey}`
        });
    }

    // Add Rarity filters
    for (const [rarityKey, meta] of Object.entries(RARITY_META)) {
        if (!ownedRarities.has(rarityKey)) continue;
        const count = allPals.filter(p => GameData.getPet(p.basePetId)?.rarity?.toLowerCase() === rarityKey).length;
        filterSelect.addOptions({
            label: `Rarity: ${meta.label} (${count})`,
            value: `rarity:${rarityKey}`,
            emoji: meta.emoji,
            default: activeFilter === `rarity:${rarityKey}`
        });
    }

   
    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(filterSelect)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
    );

    // ── Item List ──
    if (sortedPals.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('*No Pals match this filter.*')
        );
    } else {
        const start = page * PALS_PER_PAGE;
        const pagePals = sortedPals.slice(start, start + PALS_PER_PAGE);

        let content = '';

        pagePals.forEach(pal => {
            const base = GameData.getPet(pal.basePetId);
            if (!base) return;

            const emojiStr = config.emojis[pal.nickname] || config.emojis[base.name] || '🐾';
            const rarityMatch = config.emojis[base.rarity] || '⬜';
            const paddedId = pal.shortId < 10 ? `0${pal.shortId}` : pal.shortId;
            const paddedlvl = pal.level < 10 ? `0${pal.level}` : pal.level;
            
            // Format: `01` • 🐾 **Level 12** • **Nickname** <:legendary:id>
            content += `\`${paddedId}\` • ${emojiStr} **Level** \`${paddedlvl}\` • **${pal.nickname}** ${rarityMatch}\n`;
        });

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content || '*No Pals to display.*')
        );
    }

    // ── Pagination Buttons ──
    if (totalPages > 1) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true)
        );

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pet_first').setEmoji(e.first).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('pet_prev').setEmoji(e.previous).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('pet_page').setLabel(`${page + 1} / ${totalPages}`).setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('pet_next').setEmoji(e.next).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
                new ButtonBuilder().setCustomId('pet_last').setEmoji(e.last).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
            )
        );
    } else if (sortedPals.length > 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Page 1 of 1 • ${sortedPals.length} Pals`)
        );
    }

    return container;
}

// ── Main command ────────────────────────────────────────────────────

module.exports = {
    name: 'pet',
    description: 'View your or another player\'s collection of Pals.',
    usage: '[@user] OR info <pal_id>',
    aliases: ['pals', 'collection', 'pal', 'pets'],
    cooldown: 3,
    async execute(message, args, client, prefix) {
        try {
            // --- Subcommand: View specific Pal info ---
            if (args[0]?.toLowerCase() === 'info') {
                const palId = parseInt(args[1]);
                const petResult = await CommandHelpers.validatePet(message.author.id, palId, prefix);
                if (!petResult.success) {
                    return message.reply({ embeds: [petResult.embed] });
                }
                let pal = petResult.pet;

                if (cleanExpiredPotionEffects(pal)) {
                    await pal.save();
                }

                const { effects: ownerLabEffects } = await LabManager.getLabData(pal.ownerId);
                pal = await restorePetHp(pal, ownerLabEffects);
                // Fetch the owner's member object to display their avatar
                const ownerMember = await message.guild.members.fetch(pal.ownerId).catch(() => null);
                if (!ownerMember) {
                    return message.reply({ embeds: [createErrorEmbed('Owner Not Found', 'Could not find the owner of this Pal in the server.')] });
                }

                const filteredPal = GameData.getPet(pal.basePetId);
                
                const detailEmbed = generatePalDetailEmbed(pal, ownerMember);
                detailEmbed.setThumbnail(filteredPal.pic)
                return message.reply({ embeds: [detailEmbed] });
            }

            // --- Main Command: Component V2 List View ---
            // If they are checking another user, parse that (ignoring old CLI args)
            const targetQuery = args.join(' ');
            const member = await CommandHelpers.getMemberFromMessage(message, targetQuery) || message.member;

            const playerResult = await CommandHelpers.validatePlayer(member.id, prefix);
            if (!playerResult.success) {
                const notStartedMsg = member.id === message.author.id
                    ? `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    : `**${member.displayName}** has not started their alchemical journey yet.`;
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', notStartedMsg)] });
            }

            let pals = await Pet.find({ ownerId: member.id });
            if (pals.length === 0) {
                const noPalsMsg = member.id === message.author.id
                    ? `You don't have any Pals yet! Try foraging to find one.`
                    : `**${member.displayName}** does not own any Pals.`;
                return message.reply({ embeds: [createInfoEmbed('No Pals Found', noPalsMsg)] });
            }

            let activeFilter = 'all';
            let sortBy = 'id';
            let currentPage = 0;

            const getFilteredSorted = () => {
                const filtered = applyFilters(pals, activeFilter);
                return sortPals(filtered, sortBy);
            };

            let sortedItems = getFilteredSorted();
            let totalPages = Math.max(1, Math.ceil(sortedItems.length / PALS_PER_PAGE));

            const container = buildPetListContainer(member, pals, sortedItems, currentPage, totalPages, activeFilter, sortBy);

            const reply = await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            // --- Collector ---
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                try {
                    if (interaction.isStringSelectMenu() && interaction.customId === 'pet_filter') {
                        activeFilter = interaction.values[0];
                        currentPage = 0;
                    } else if (interaction.isButton()) {
                        switch (interaction.customId) {
                            case 'pet_sort':
                                if (sortBy === 'id') sortBy = 'lvl';
                                else if (sortBy === 'lvl') sortBy = 'rarity';
                                else sortBy = 'id';
                                currentPage = 0;
                                break;
                            case 'pet_first': currentPage = 0; break;
                            case 'pet_prev':  currentPage = Math.max(0, currentPage - 1); break;
                            case 'pet_next':  currentPage = Math.min(totalPages - 1, currentPage + 1); break;
                            case 'pet_last':  currentPage = totalPages - 1; break;
                        }
                    }

                    sortedItems = getFilteredSorted();
                    totalPages = Math.max(1, Math.ceil(sortedItems.length / PALS_PER_PAGE));
                    currentPage = Math.min(currentPage, totalPages - 1);

                    const updated = buildPetListContainer(member, pals, sortedItems, currentPage, totalPages, activeFilter, sortBy);

                    await interaction.update({
                        components: [updated],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (err) {
                    if (err.code === 10062) return; // Expired interaction
                    console.error('Pet list interaction error:', err);
                }
            });

            collector.on('end', () => {
                sortedItems = getFilteredSorted();
                totalPages = Math.max(1, Math.ceil(sortedItems.length / PALS_PER_PAGE));
                
                // Rebuild the container but disable interactive inputs
                const finalContainer = buildPetListContainer(member, pals, sortedItems, currentPage, totalPages, activeFilter, sortBy);
                
                // Iterate through the builder components to disable interactive elements
                finalContainer.components.forEach(component => {
                    if (component.components) {
                        component.components.forEach(inner => {
                            if (inner.setDisabled) {
                                inner.setDisabled(true);
                            }
                        });
                    }
                });

                // Disable section builder buttons
                if (finalContainer.components && finalContainer.components[0] && finalContainer.components[0].accessory) {
                    if (finalContainer.components[0].accessory.data) {
                         finalContainer.components[0].accessory.data.disabled = true;
                    }
                }

                reply.edit({
                    components: [finalContainer],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
            });

        } catch (error) {
            console.error('Pet command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching the Pal collection.')] });
        }
    }
};