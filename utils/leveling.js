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
 * DOES NOT fetch or save the player — caller is responsible for both.
 * 
 * @param {import('discord.js').Client} client The Discord client.
 * @param {import('discord.js').Message} message The message that triggered the action.
 * @param {object} playerDoc The Mongoose Player document to mutate.
 * @param {number} xpGained The amount of XP to grant.
 * @param {object} [options]
 * @param {object} [options.labEffects] Pre-fetched lab effects to skip internal lab fetch.
 * @returns {{ leveledUp: boolean, newLevel: number }}
 */
async function grantPlayerXp(client, message, playerDoc, xpGained, options = {}) {
    if (!playerDoc) return { leveledUp: false, newLevel: 0 };

    let labEffects = options.labEffects;
    if (!labEffects) {
        const { effects } = await LabManager.getLabData(playerDoc.userId);
        labEffects = effects;
    }

    const finalXp = LabManager.applyPlayerXpBonus(xpGained, labEffects);
    playerDoc.xp += finalXp;

    let xpNeeded = calculateXpForNextLevel(playerDoc.level);
    let leveledUp = false;

    while (playerDoc.xp >= xpNeeded) {
        playerDoc.level++;
        playerDoc.xp -= xpNeeded;
        leveledUp = true;
        xpNeeded = calculateXpForNextLevel(playerDoc.level);

        playerDoc.maxStamina += 10;
        playerDoc.stamina = playerDoc.maxStamina;

        const levelUpEmbed = createInfoEmbed(
            '🎉 Alchemist Level Up!',
            `Congratulations, you are now **Level ${playerDoc.level}**!`
        ).setThumbnail(message.author?.displayAvatarURL?.() || message.user?.displayAvatarURL?.());
        await message.channel.send({ embeds: [levelUpEmbed] });
    }

    return { leveledUp, newLevel: playerDoc.level };
}

/**
 * Handles XP gain and potential level-ups for a Pal.
 * DOES NOT save palDocument — caller is responsible for saving.
 * SkillTree is saved internally (separate collection, no race condition with Pal/Player).
 * 
 * @param {import('discord.js').Client} client The Discord client.
 * @param {import('discord.js').Message} message The message that triggered the action.
 * @param {object} palDocument The Mongoose Pet document to mutate.
 * @param {number} xpGained The amount of XP to grant.
 * @param {object} [options]
 * @param {object} [options.labEffects] Pre-fetched lab effects.
 * @returns {{ leveledUp: boolean, newLevel: number, evolved: boolean, evolutionInfo: object|null }}
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
    let skillPointsGained = 0;
    let evolved = false;
    let evolutionInfo = null;

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

        // Accumulate skill points — saved in batch after the loop
        if (palDocument.level % 5 === 0) {
            skillPointsGained++;
        }

        xpNeeded = calculateXpForNextLevel(palDocument.level);

        // Check for evolution
        if (basePal.evolution && palDocument.level >= basePal.evolution.level) {
            const evolutionData = allPals[basePal.evolution.evolvesTo];
            const oldName = palDocument.nickname;

            // Evolution resets skill tree — atomic $set
            await SkillTree.findOneAndUpdate(
                { palId: palDocument.petId },
                { $set: { skillPoints: 0, unlockedSkills: [] } },
                { upsert: true }
            );
            
            palDocument.basePetId = basePal.evolution.evolvesTo;
            palDocument.nickname = evolutionData.name;
            palDocument.stats = evolutionData.baseStats;
            palDocument.level = 1;
            palDocument.xp = 0;
            skillPointsGained = 0; // Wipe — evolution resets everything
            evolved = true;
            evolutionInfo = { oldName, newName: evolutionData.name };
            
            const evolutionEmbed = createInfoEmbed(
                `✨ What's this? Your ${oldName} is evolving! ✨`,
                `Congratulations! Your Pal evolved into a **${evolutionData.name}**!`
            );
            await message.channel.send({ embeds: [evolutionEmbed] });
            break; // Stop leveling — stats were reset
        }
    }

    // Batch SkillTree update — single atomic $inc, no read needed
    if (skillPointsGained > 0) {
        await SkillTree.findOneAndUpdate(
            { palId: palDocument.petId },
            { $inc: { skillPoints: skillPointsGained } },
            { upsert: true, setDefaultsOnInsert: true }
        );

        const skillPointEmbed = createInfoEmbed(
            `🌟 Skill Point${skillPointsGained > 1 ? 's' : ''} Gained!`,
            `**${palDocument.nickname}** gained **${skillPointsGained}** skill point${skillPointsGained > 1 ? 's' : ''}! Use the skills command to spend ${skillPointsGained > 1 ? 'them' : 'it'}.`
        );
        await message.channel.send({ embeds: [skillPointEmbed] });
    }

    // Single consolidated level-up announcement
    if (leveledUp && !evolved) {
        const levelUpEmbed = createInfoEmbed(
            `🐾 Your ${palDocument.nickname} Leveled Up!`,
            `It is now **Level ${palDocument.level}**!`
        );
        await message.channel.send({ embeds: [levelUpEmbed] });
    }

    return { leveledUp, newLevel: palDocument.level, evolved, evolutionInfo };
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
            
            // Handle skill tree reset for evolution — atomic $set
            await SkillTree.findOneAndUpdate(
                { palId: palDocument.petId },
                { $set: { skillPoints: 0, unlockedSkills: [] } },
                { upsert: true }
            );
            
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

    // Add skill points in bulk — atomic $inc
    if (skillPointsGained > 0) {
        await SkillTree.findOneAndUpdate(
            { palId: palDocument.petId },
            { $inc: { skillPoints: skillPointsGained } },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }
    
    return { 
        totalLevelsGained, 
        skillPointsGained, 
        evolved, 
        evolutionInfo,
        reachedMaxLevel: palDocument.level >= MAX_LEVEL
    };
}


module.exports = { grantPlayerXp, grantPalXp, calculateXpForNextLevel, grantPalLevels };