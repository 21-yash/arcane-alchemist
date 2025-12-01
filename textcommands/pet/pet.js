const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed, createCustomEmbed, createInfoEmbed } = require('../../utils/embed');
const { calculateXpForNextLevel } = require('../../utils/leveling');
const GameData = require('../../utils/gameData');
const config = require('../../config/config.json');
const { restorePetHp } = require('../../utils/stamina');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');

const PALS_PER_PAGE = 10;

// Import the cleanup function from use.js (or define it here)
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

// Helper function for the detailed Pal view embed
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

module.exports = {
    name: 'pet',
    description: 'View your or another player\'s collection of Pals.',
    usage: '[@user] [--rarity <rarity>] [--type <type>] [--lvl] OR info <pal_id>',
    aliases: ['pals', 'collection', 'pal', 'pets'],
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

            // --- Main Command: List Pals with Filters ---
            const member = await CommandHelpers.getMemberFromMessage(message, args.filter(arg => !arg.startsWith('--')).join(' ')) || message.member;

            const playerResult = await CommandHelpers.validatePlayer(member.id, prefix);
            if (!playerResult.success) {
                const notStartedMsg = member.id === message.author.id
                    ? `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    : `**${member.displayName}** has not started their alchemical journey yet.`;
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', notStartedMsg)] });
            }
            const player = playerResult.player;

            let pals = await Pet.find({ ownerId: member.id });
            if (pals.length === 0) {
                const noPalsMsg = member.id === message.author.id
                    ? `You don't have any Pals yet! Try foraging to find one.`
                    : `**${member.displayName}** does not own any Pals.`;
                return message.reply({ embeds: [createInfoEmbed('No Pals Found', noPalsMsg)] });
            }

            // --- Apply Filters ---
            const filters = args.filter(arg => arg.startsWith('--'));
            let filteredPals = [...pals];
            let filterDescription = 'Showing all Pals.';

            for (const filter of filters) {
                const [key, value] = filter.slice(2).split('=');
                if (key === 'rarity' && value) {
                    filteredPals = filteredPals.filter(p => GameData.getPet(p.basePetId)?.rarity?.toLowerCase() === value.toLowerCase());
                    filterDescription = `Filtering by Rarity: **${value}**`;
                }
                if (key === 'type' && value) {
                    filteredPals = filteredPals.filter(p => GameData.getPet(p.basePetId)?.type?.toLowerCase() === value.toLowerCase());
                    filterDescription = `Filtering by Type: **${value}**`;
                }
                if (key === 'lvl') {
                    filteredPals.sort((a, b) => b.level - a.level);
                    filterDescription = 'Sorting by Level (Highest First).';
                }
            }
            
            if (filteredPals.length === 0) {
                return message.reply({ embeds: [createInfoEmbed('No Pals Found', 'No Pals matched your filters.')] });
            }

            // --- Pagination for List View ---
            let currentPage = 0;
            const totalPages = Math.ceil(filteredPals.length / PALS_PER_PAGE);

            const generateListEmbed = (page) => {
                const start = page * PALS_PER_PAGE;
                const end = start + PALS_PER_PAGE;
                const pagePals = filteredPals.slice(start, end);

                const list = pagePals.map(pal => {
                    const base = GameData.getPet(pal.basePetId);
                    return `**${pal.shortId}** ${config.emojis[pal.nickname]} **Lvl** \`${pal.level}\` • **${pal.nickname}** *\`${base.type}\`*`;
                }).join('\n');

                return createCustomEmbed(
                    `${member.displayName}'s Pal Collection`,
                    `${filterDescription}\n\n${list}`,
                    '#3498DB',
                    { footer: { text: `Page ${page + 1} of ${totalPages}` }, timestamp: false }
                );
            };

            const generateButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('previous_pal').setLabel('Previous').setStyle(ButtonStyle.Primary).setEmoji('⬅️').setDisabled(page === 0),
                    new ButtonBuilder().setCustomId('next_pal').setLabel('Next').setStyle(ButtonStyle.Primary).setEmoji('➡️').setDisabled(page >= totalPages - 1)
                );
            };

            const reply = await message.reply({
                embeds: [generateListEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
            
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000, // 5 minutes
                componentType: ComponentType.Button
            });

            collector.on('collect', async i => {
                if (i.customId === 'next_pal') currentPage++;
                else if (i.customId === 'previous_pal') currentPage--;
                await i.update({ embeds: [generateListEmbed(currentPage)], components: [generateButtons(currentPage)] });
            });

            collector.on('end', () => {
                const finalComponents = generateButtons(currentPage);
                finalComponents.components.forEach(button => button.setDisabled(true));
                reply.edit({ components: [finalComponents] }).catch(() => {});
            });

        } catch (error) {
            console.error('Pet command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching the Pal collection.')] });
        }
    }
};