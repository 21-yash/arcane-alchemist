const Player = require('../../models/Player');
const Pet = require('../../models/Pet'); 
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embed');
const { calculateXpForNextLevel } = require('../../utils/leveling');
const GameData = require('../../utils/gameData');
const { restoreStamina } = require('../../utils/stamina');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');

module.exports = {
    name: 'profile',
    description: 'View your or another player\'s alchemist profile.',
    usage: '[@user]',
    aliases: ['p', 'bal'],
    cooldown: 3,
    async execute(message, args, client, prefix) {
        try {
            // Get target member (self or mentioned user)
            const member = await CommandHelpers.getMemberFromMessage(message, args.join(' ')) || message.member;

            const playerResult = await CommandHelpers.validatePlayer(member.id, prefix);
            if (!playerResult.success) {
                const notStartedMsg = member.id === message.author.id 
                    ? `You haven't started your journey yet! Use \`${prefix}start\` to begin.`
                    : `**${member.displayName}** has not started their alchemical journey yet.`;
                return message.reply({ embeds: [createErrorEmbed('No Adventure Started', notStartedMsg)] });
            }
            let player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;
            const lab = labContext.lab;
            player = await restoreStamina(player, labEffects);

            // Fetch the count of pals owned by the player
            const palCount = await Pet.countDocuments({ ownerId: member.id });

            // --- Calculate XP Progress ---
            const xpForNextLevel = calculateXpForNextLevel(player.level);
            const progressBar = CommandHelpers.createXPProgressBar(player.xp, xpForNextLevel);
            const progressPercentage = Math.floor((player.xp / xpForNextLevel) * 100);
            // ---------------------------

            const totalAchievements = GameData.achievement.length;

            const profileEmbed = createCustomEmbed(
                `Alchemist Profile: ${member.displayName}`,
                `**Level ${player.level}**\n\`${progressBar}\`\nXP: ${player.xp} / ${xpForNextLevel} (${progressPercentage}%)`,
                '#D2B48C', // A nice parchment color
                {
                    thumbnail: member.user.displayAvatarURL(),
                    fields: [
                        { name: '💰 Gold', value: `\`${player.gold}\``, inline: true },
                        { name: '⚡ Stamina', value: `\`${player.stamina}/${player.maxStamina}\``, inline: true },
                        { name: '🐾 Pals Owned', value: `\`${palCount}\``, inline: true },
                        { name: '🏆 Achievements', value: `\`${player.achievements.length}/${totalAchievements}\``, inline: true },
                        { name: '📊 Stats', value: `Forages: \`${player.stats.forageCount}\`\nDungeons Cleared: \`${player.stats.dungeonClears}\`\nExpeditions: \`${player.stats.expeditionsCompleted || 0}\`\nArena Wins: \`${player.stats.arenaWins || 0}\`\nPotions Brewed: \`${player.stats.potionsBrewed}\`\nItems Crafted: \`${player.stats.itemsCrafted}\`` },
                        { name: '🧪 Laboratory', value: `Level: \`${lab.level || 1}\`\nUpgrades Owned: \`${lab.upgrades?.length || 0}\`\nResearch Points: \`${lab.researchPoints || 0}\`` , inline: true }
                    ],
                    timestamp: false
                }
            );

            await message.reply({ embeds: [profileEmbed] });

        } catch (error) {
            console.error('Profile command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem fetching the profile.')] });
        }
    }
};