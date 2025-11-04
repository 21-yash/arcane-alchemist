const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const SkillTree = require('../../models/SkillTree');
const { createErrorEmbed, createSuccessEmbed, createInfoEmbed, createCustomEmbed } = require('../../utils/embed');
const allPals = require('../../gamedata/pets');
const skillTrees = require('../../gamedata/skillTrees');

module.exports = {
    name: 'skills',
    description: 'Manage your Pal\'s skill tree and unlock new abilities.',
    aliases: ['skill', 'tree'],
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({
                    embeds: [createErrorEmbed('No Adventure Started', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`)]
                });
            }

            if (!args[0]) {
                return message.reply({
                    embeds: [createInfoEmbed('Skill System', 
                        `Use \`${prefix}skills <pal_id>\` to view and manage a Pal's skill tree.\n\n` +
                        `**How Skills Work:**\n` +
                        `• Pals earn 1 skill point every 5 levels\n` +
                        `• Each type has unique skill trees\n` +
                        `• Skills provide combat bonuses and special abilities\n` +
                        `• Some skills require prerequisites to unlock`
                    )]
                });
            }

            const palId = parseInt(args[0]);
            if (isNaN(palId)) {
                return message.reply({
                    embeds: [createErrorEmbed('Invalid Pal ID', 'Please provide a valid Pal ID number.')]
                });
            }

            const pal = await Pet.findOne({ ownerId: message.author.id, shortId: palId });
            if (!pal) {
                return message.reply({
                    embeds: [createErrorEmbed('Pal Not Found', `You don't own a Pal with ID #${palId}.`)]
                });
            }

            const palData = allPals[pal.basePetId];
            const typeSkills = skillTrees[palData.type];
            
            if (!typeSkills) {
                return message.reply({
                    embeds: [createErrorEmbed('No Skills Available', `${palData.type} type Pals don't have skill trees yet.`)]
                });
            }

            // Get or create skill tree
            let skillTree = await SkillTree.findOne({ palId: pal.petId });
            if (!skillTree) {
                skillTree = new SkillTree({ 
                    palId: pal.petId,
                    skillPoints: Math.floor(pal.level / 5) // 1 point every 5 levels
                });
                await skillTree.save();
            }

            await this.showSkillTree(message, pal, palData, typeSkills, skillTree, client);

        } catch (error) {
            console.error('Skills command error:', error);
            message.reply({
                embeds: [createErrorEmbed('Error', 'There was a problem accessing the skill system.')]
            });
        }
    },

    async showSkillTree(message, pal, palData, typeSkills, skillTree, client) {
        const generateSkillEmbed = () => {
            const embed = createCustomEmbed(
                `🌟 ${pal.nickname}'s ${typeSkills.name}`,
                `**Level:** ${pal.level} | **Available Skill Points:** ${skillTree.skillPoints}\n\n`,
                '#9B59B6'
            );

            let skillDescription = '';
            Object.entries(typeSkills.skills).forEach(([skillId, skill]) => {
                const unlockedSkill = skillTree.unlockedSkills.find(s => s.skillId === skillId);
                const currentLevel = unlockedSkill?.level || 0;
                const maxLevel = skill.maxLevel;
                
                let statusIcon = '🔒'; // Locked
                if (currentLevel > 0) statusIcon = '⭐'; // Unlocked
                if (currentLevel === maxLevel) statusIcon = '✨'; // Maxed

                skillDescription += `${statusIcon} **${skill.name}** [${currentLevel}/${maxLevel}]\n`;
                skillDescription += `*${skill.description}*\n`;
                
                // Show current effect if unlocked
                if (currentLevel > 0) {
                    const effect = skill.effects[currentLevel - 1];
                    skillDescription += `Current: ${this.formatEffectBonus(effect.bonus)}\n`;
                }
                
                // Show next level effect if can be upgraded
                if (currentLevel < maxLevel) {
                    const nextEffect = skill.effects[currentLevel];
                    skillDescription += `Next (${currentLevel + 1}): ${this.formatEffectBonus(nextEffect.bonus)}\n`;
                }
                
                skillDescription += '\n';
            });

            embed.setDescription(embed.data.description + skillDescription);
            return embed;
        };

        const generateSkillSelect = () => {
            const availableSkills = Object.entries(typeSkills.skills)
                .filter(([skillId, skill]) => {
                    const unlockedSkill = skillTree.unlockedSkills.find(s => s.skillId === skillId);
                    const currentLevel = unlockedSkill?.level || 0;
                    
                    // Can upgrade if not maxed and has skill points
                    return currentLevel < skill.maxLevel && skillTree.skillPoints > 0 && this.canUnlockSkill(skillId, skill, skillTree);
                })
                .slice(0, 25); // Discord limit

            if (availableSkills.length === 0) {
                return null;
            }

            return new StringSelectMenuBuilder()
                .setCustomId('upgrade_skill')
                .setPlaceholder('Choose a skill to upgrade...')
                .addOptions(
                    availableSkills.map(([skillId, skill]) => {
                        const unlockedSkill = skillTree.unlockedSkills.find(s => s.skillId === skillId);
                        const currentLevel = unlockedSkill?.level || 0;
                        
                        return {
                            label: `${skill.name} (${currentLevel}/${skill.maxLevel})`,
                            description: skill.description.substring(0, 100),
                            value: skillId
                        };
                    })
                );
        };

        const components = [];
        const skillSelect = generateSkillSelect();
        if (skillSelect) {
            components.push(new ActionRowBuilder().addComponents(skillSelect));
        }

        const reply = await message.reply({
            embeds: [generateSkillEmbed()],
            components: components
        });

        if (components.length === 0) return; // No upgradeable skills

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 5 * 60 * 1000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'upgrade_skill') {
                const skillId = i.values[0];
                const skill = typeSkills.skills[skillId];
                
                // Double-check requirements
                if (!this.canUnlockSkill(skillId, skill, skillTree) || skillTree.skillPoints <= 0) {
                    return i.reply({
                        embeds: [createErrorEmbed('Cannot Upgrade', 'You cannot upgrade this skill right now.')],
                        ephemeral: true
                    });
                }

                // Upgrade the skill
                const existingSkill = skillTree.unlockedSkills.find(s => s.skillId === skillId);
                if (existingSkill) {
                    existingSkill.level++;
                } else {
                    skillTree.unlockedSkills.push({
                        skillId: skillId,
                        level: 1
                    });
                }
                
                skillTree.skillPoints--;
                await skillTree.save();

                // Regenerate components after upgrade
                const newSkillSelect = generateSkillSelect();
                const newComponents = newSkillSelect ? [new ActionRowBuilder().addComponents(newSkillSelect)] : [];

                await i.update({
                    embeds: [generateSkillEmbed()],
                    components: newComponents
                });
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    },

    canUnlockSkill(skillId, skill, skillTree) {
        // Check prerequisites
        for (const prereqId of skill.prerequisites) {
            const prereqSkill = skillTree.unlockedSkills.find(s => s.skillId === prereqId);
            if (!prereqSkill || prereqSkill.level < 1) {
                return false;
            }
        }
        return true;
    },

    formatEffectBonus(bonus) {
        const effects = [];
        
        Object.entries(bonus).forEach(([key, value]) => {
            switch (key) {
                case 'atkMultiplier':
                    effects.push(`+${Math.round((value - 1) * 100)}% Attack`);
                    break;
                case 'magicDamage':
                    effects.push(`+${Math.round((value - 1) * 100)}% Magic Damage`);
                    break;
                case 'defBonus':
                    effects.push(`+${value} Defense`);
                    break;
                case 'spdBonus':
                    effects.push(`+${value} Speed`);
                    break;
                case 'critChance':
                    effects.push(`+${Math.round(value * 100)}% Crit Chance`);
                    break;
                case 'dodgeChance':
                    effects.push(`+${Math.round(value * 100)}% Dodge`);
                    break;
                case 'lifesteal':
                    effects.push(`${Math.round(value * 100)}% Lifesteal`);
                    break;
                case 'hpRegen':
                    effects.push(`${Math.round(value * 100)}% HP Regen`);
                    break;
                case 'luckBonus':
                    effects.push(`+${value} Luck`);
                    break;
                case 'damageReduction':
                    effects.push(`${Math.round(value * 100)}% Damage Reduction`);
                    break;
                case 'accuracy':
                    effects.push(`+${Math.round((value - 1) * 100)}% Accuracy`);
                    break;
                case 'manaEfficiency':
                    effects.push(`${Math.round((1 - value) * 100)}% Mana Cost Reduction`);
                    break;
                case 'statusResistance':
                    if (typeof value === 'object') {
                        Object.entries(value).forEach(([status, resist]) => {
                            effects.push(`${Math.round(resist * 100)}% ${status} resistance`);
                        });
                    } else {
                        effects.push(`${Math.round(value * 100)}% Status Resistance`);
                    }
                    break;
                case 'statusChance':
                    if (typeof value === 'object') {
                        Object.entries(value).forEach(([status, chance]) => {
                            effects.push(`${Math.round(chance * 100)}% ${status} chance`);
                        });
                    }
                    break;
                case 'statusInflict':
                    if (typeof value === 'object') {
                        Object.entries(value).forEach(([status, chance]) => {
                            effects.push(`${Math.round(chance * 100)}% ${status} inflict`);
                        });
                    }
                    break;
                case 'counterChance':
                    effects.push(`${Math.round(value * 100)}% Counter Attack`);
                    break;
                case 'multiAttack':
                    effects.push(`${Math.round(value * 100)}% Multi Attack`);
                    break;
                case 'reviveChance':
                    effects.push(`${Math.round(value * 100)}% Revive Chance`);
                    break;
                case 'deathResistance':
                    effects.push(`${Math.round(value * 100)}% Death Resistance`);
                    break;
                case 'executeThreshold':
                    effects.push(`Execute at ${Math.round(value * 100)}% HP`);
                    break;
                case 'powerBonus':
                    effects.push(`+${Math.round((value - 1) * 100)}% Power`);
                    break;
                case 'powerMultiplier':
                    effects.push(`${value}x Power`);
                    break;
                case 'allStats':
                    effects.push(`+${Math.round((value - 1) * 100)}% All Stats`);
                    break;
                case 'elementalAbsorb':
                    effects.push(`${Math.round(value * 100)}% Elemental Absorb`);
                    break;
                case 'reflection':
                    effects.push(`${Math.round(value * 100)}% Damage Reflection`);
                    break;
                case 'overloadChance':
                    effects.push(`${Math.round(value * 100)}% Overload Chance`);
                    break;
                case 'overloadDamage':
                    effects.push(`${value}x Overload Damage`);
                    break;
                case 'chainReaction':
                    effects.push(`${Math.round(value * 100)}% Chain Reaction`);
                    break;
                case 'selfRepair':
                    effects.push(`${Math.round(value * 100)}% Self Repair`);
                    break;
                case 'divineProtection':
                    effects.push(`${Math.round(value * 100)}% Divine Protection`);
                    break;
                case 'critResistance':
                    effects.push(`${Math.round(value * 100)}% Crit Resistance`);
                    break;
                case 'hpSacrifice':
                    effects.push(`${Math.round(value * 100)}% HP Sacrifice`);
                    break;
                case 'invulnerability':
                    effects.push(`${value} turns Invulnerability`);
                    break;
                case 'areaAttack':
                    effects.push('Area Attack');
                    break;
                case 'multiStatus':
                    effects.push('Multi Status Effects');
                    break;
                case 'damage':
                    effects.push(`${value}x Damage`);
                    break;
                case 'healOnDodge':
                    effects.push('Heal on Dodge');
                    break;
                case 'immuneToStatus':
                    effects.push('Immune to Status Effects');
                    break;
                default:
                    effects.push(`${key}: ${value}`);
            }
        });
        
        return effects.join(', ');
    }
};