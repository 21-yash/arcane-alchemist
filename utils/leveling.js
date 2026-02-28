const Player = require('../models/Player');
const Pet = require('../models/Pet');
const allPals = require('../gamedata/pets');
const { createInfoEmbed } = require('./embed');
const SkillTree = require('../models/SkillTree');
const LabManager = require('./labManager');

/**
 * Calculates the total XP required to reach a certain level using a scaling formula.
 * @param {number} level The target level.
 * @returns {number} The total XP needed for that level.
 */
function calculateXpForNextLevel(level) {
    // Gentler scaling: 50 * (level ^ 1.3)
    // Still progressively harder, but not as punishing at high levels
    const baseXP = 50;
    const exponent = 1.3;
    return Math.floor(baseXP * Math.pow(level, exponent));
}

/**
 * Handles XP gain and potential level-ups for a Player (Alchemist).
 * @param {import('discord.js').Client} client The Discord client.
 * @param {import('discord.js').Message} message The message that triggered the action.
 * @param {string} userId The ID of the user gaining XP.
 * @param {number} xpGained The amount of XP to grant.
 */
async function grantPlayerXp(client, message, userId, xpGained, options = {}) {
    const player = await Player.findOne({ userId });
    if (!player) return;

    let labEffects = options.labEffects;
    if (!labEffects) {
        const { effects } = await LabManager.getLabData(userId);
        labEffects = effects;
    }

    const finalXp = LabManager.applyPlayerXpBonus(xpGained, labEffects);

    player.xp += finalXp;

    let xpNeeded = calculateXpForNextLevel(player.level);
    let leveledUp = false;

    while (player.xp >= xpNeeded) {
        player.level++;
        player.xp -= xpNeeded;
        leveledUp = true;
        xpNeeded = calculateXpForNextLevel(player.level);

        player.maxStamina += 10;
        player.stamina = player.maxStamina;

        // Announce the level up
        const levelUpEmbed = createInfoEmbed(
            '🎉 Alchemist Level Up!',
            `Congratulations, you are now **Level ${player.level}**!`
        ).setThumbnail(message.author.displayAvatarURL());
        await message.channel.send({ embeds: [levelUpEmbed] });
    }

    await player.save();
    return leveledUp;
}

/**
 * Handles XP gain and potential level-ups for a Pal.
 * @param {import('discord.js').Client} client The Discord client.
 * @param {import('discord.js').Message} message The message that triggered the action.
 * @param {object} palDocument The Mongoose document for the Pal gaining XP.
 * @param {number} xpGained The amount of XP to grant.
 */
async function grantPalXp(client, message, palDocument, xpGained, options = {}) {
    let labEffects = options.labEffects;
    if (!labEffects && palDocument.ownerId) {
        const { effects } = await LabManager.getLabData(palDocument.ownerId);
        labEffects = effects;
    }

    const finalXp = LabManager.applyPalXpBonus(xpGained, labEffects);

    palDocument.xp += finalXp;

    let xpNeeded = calculateXpForNextLevel(palDocument.level);
    let leveledUp = false;

    while (palDocument.xp >= xpNeeded && palDocument.level < 100) {
        palDocument.level++;
        palDocument.xp -= xpNeeded;
        leveledUp = true;
        
        // Apply stat gains
        const basePal = allPals[palDocument.basePetId];
        if (basePal && basePal.statGrowth) {
            palDocument.stats.hp += basePal.statGrowth.hp;
            palDocument.stats.atk += basePal.statGrowth.atk;
            palDocument.stats.def += basePal.statGrowth.def;
            palDocument.stats.spd += basePal.statGrowth.spd;
            palDocument.stats.luck += basePal.statGrowth.luck;
        }

        if (palDocument.level % 5 === 0) {
            let skillTree = await SkillTree.findOne({ palId: palDocument.petId });
            if (!skillTree) {
                skillTree = new SkillTree({
                    palId: palDocument.petId,
                    skillPoints: 0,
                    unlockedSkills: []
                });
            }

            skillTree.skillPoints += 1;
            await skillTree.save();

            const skillPointEmbed = createInfoEmbed(
                `🌟 Skill Point Gained!`,
                `**${palDocument.nickname}** gained a skill point! Use the skills command to spend it.`
            );
            await message.channel.send({ embeds: [skillPointEmbed] });
        }

        xpNeeded = calculateXpForNextLevel(palDocument.level);

        // Announce the level up
        const levelUpEmbed = createInfoEmbed(
            `🐾 Your ${palDocument.nickname} Leveled Up!`,
            `It is now **Level ${palDocument.level}**!`
        );
        await message.channel.send({ embeds: [levelUpEmbed] });

        // Check for evolution
        if (basePal.evolution && palDocument.level >= basePal.evolution.level) {
            const evolutionData = allPals[basePal.evolution.evolvesTo];
            const oldName = palDocument.nickname;
            let skillTree = await SkillTree.findOne({ palId: palDocument.petId });
            if (!skillTree) {
                skillTree = new SkillTree({
                    palId: palDocument.petId,
                    skillPoints: 0,
                    unlockedSkills: []
                });
            }

            skillTree.skillPoints = 0;
            skillTree.unlockedSkills = [];
            await skillTree.save();
            
            palDocument.basePetId = basePal.evolution.evolvesTo;
            palDocument.nickname = evolutionData.name; // Update nickname to new species name
            palDocument.stats = evolutionData.baseStats;
            palDocument.level = 1;
            palDocument.xp = 0;
            
            const evolutionEmbed = createInfoEmbed(
                `✨ What's this? Your ${oldName} is evolving! ✨`,
                `Congratulations! Your Pal evolved into a **${evolutionData.name}**!`
            );
            await message.channel.send({ embeds: [evolutionEmbed] });
        }
    }

    await palDocument.save();
    return leveledUp;
}

/**
 * Handles XP gain and potential level-ups for a Pal.
 * @param {import('discord.js').Client} client The Discord client.
 * @param {import('discord.js').Message} message The message that triggered the action.
 * @param {object} palDocument The Mongoose document for the Pal gaining XP.
 * @param {number} levelsToGrant The amount of levels to grant.
 */
async function grantPalLevels(client, message, palDocument, levelsToGrant) {
    const MAX_LEVEL = 100;
    let totalLevelsGained = 0;
    let skillPointsGained = 0;
    let evolved = false;
    let evolutionInfo = null;

    for (let i = 0; i < levelsToGrant; i++) {
        // Check if already at max level
        if (palDocument.level >= MAX_LEVEL) {
            break;
        }

        // Increment level
        palDocument.level++;
        totalLevelsGained++;
        
        // Set XP to 0 for clean level (since we're directly setting level)
        palDocument.xp = 0;

        // Apply stat gains
        const basePal = allPals[palDocument.basePetId];
        if (basePal && basePal.statGrowth) {
            palDocument.stats.hp += basePal.statGrowth.hp;
            palDocument.stats.atk += basePal.statGrowth.atk;
            palDocument.stats.def += basePal.statGrowth.def;
            palDocument.stats.spd += basePal.statGrowth.spd;
            palDocument.stats.luck += basePal.statGrowth.luck;
        }

        // Check for skill points (every 5 levels)
        if (palDocument.level % 5 === 0) {
            skillPointsGained++;
        }

        // Check for evolution
        if (basePal.evolution && palDocument.level >= basePal.evolution.level && !evolved) {
            const evolutionData = allPals[basePal.evolution.evolvesTo];
            const oldName = palDocument.nickname;
            
            // Handle skill tree reset for evolution
            let skillTree = await SkillTree.findOne({ palId: palDocument.petId });
            if (!skillTree) {
                skillTree = new SkillTree({
                    palId: palDocument.petId,
                    skillPoints: 0,
                    unlockedSkills: []
                });
            }

            skillTree.skillPoints = 0;
            skillTree.unlockedSkills = [];
            await skillTree.save();
            
            // Apply evolution
            palDocument.basePetId = basePal.evolution.evolvesTo;
            palDocument.nickname = evolutionData.name;
            palDocument.stats = evolutionData.baseStats;
            palDocument.level = 1;
            palDocument.xp = 0;
            
            evolved = true;
            evolutionInfo = { oldName, newName: evolutionData.name };
            
            // Reset counters since evolution happened
            totalLevelsGained = 1;
            skillPointsGained = 0;
        }
    }

    // Add skill points in bulk
    if (skillPointsGained > 0) {
        let skillTree = await SkillTree.findOne({ palId: palDocument.petId });
        if (!skillTree) {
            skillTree = new SkillTree({
                palId: palDocument.petId,
                skillPoints: 0,
                unlockedSkills: []
            });
        }
        skillTree.skillPoints += skillPointsGained;
        await skillTree.save();
    }

    await palDocument.save();
    
    return { 
        totalLevelsGained, 
        skillPointsGained, 
        evolved, 
        evolutionInfo,
        reachedMaxLevel: palDocument.level >= MAX_LEVEL
    };
}


module.exports = { grantPlayerXp, grantPalXp, calculateXpForNextLevel, grantPalLevels };