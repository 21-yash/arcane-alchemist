const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const GameData = require('../../utils/gameData');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embed');
const config = require('../../config/config.json');
const SkillTree = require('../../models/SkillTree');

module.exports = {
    name: 'addpal',
    description: 'Adds a specific pal to a user\'s collection. (Owner only)',
    usage: '<@user/ID> <pal_id> [level] [nickname...]',
    ownerOnly: true,

    async execute(message, args, client) {

        if (args.length < 2) {
            return message.reply({ embeds: [createErrorEmbed("Invalid Usage", `Correct usage: \`${this.usage}\``)] });
        }

        try {
            // --- 1. Identify Target User ---
            const userArg = args[0];
            const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
            const targetId = mentionMatch ? mentionMatch[1] : userArg;

            const targetUser = await client.users.fetch(targetId).catch(() => null);
            if (!targetUser) {
                return message.reply({ embeds: [createErrorEmbed("Invalid User", "Could not find the specified user.")] });
            }

            let targetPlayer = await Player.findOne({ userId: targetUser.id });
            if (!targetPlayer) {
                return message.reply({ embeds: [createErrorEmbed("Player Not Found", `**${targetUser.tag}** hasn't started their adventure yet.`)] });
            }

            // --- 2. Identify Pal and Optional Args ---
            const palId = args[1].toLowerCase();
            const palData = GameData.getPet(palId);

            if (!palData) {
                return message.reply({ embeds: [createErrorEmbed("Invalid Pal ID", `No pal found with the ID \`${palId}\`.`)] });
            }

            const level = parseInt(args[2]) || 1;
            const nickname = args.slice(3).join(' ') || palData.name; // Default to base name if no nickname is given

            // --- 3. Create and Save the New Pal ---

            // Increment the player's counter to get a new unique shortId for the pet
            targetPlayer.palCounter = (targetPlayer.palCounter || 0) + 1;
            const newShortId = targetPlayer.palCounter;

            const newPet = new Pet({
                ownerId: targetUser.id,
                basePetId: palId,
                nickname: nickname,
                shortId: newShortId,
                level: level,
                xp: 0, 
                stats: { ...palData.baseStats }, 
                type: palData.type,
            });

            // Create a corresponding skill tree for the new pet
            const skillTree = new SkillTree({
                palId: newPet.petId, 
                skillPoints: level/5,
                unlockedSkills: []
            });
            
            // Save everything to the database
            await newPet.save();
            await skillTree.save();
            await targetPlayer.save(); // Save the updated palCounter

            // --- 4. Send Confirmation ---
            const successEmbed = createSuccessEmbed(
                "Pal Added Successfully!",
                `Added a **Level ${level} ${palData.name}** (named \`${nickname}\`) to **${targetUser.tag}**'s collection.`
            );
            await message.channel.send({ embeds: [successEmbed] });

            // Optionally, send a DM to the user
            const dmEmbed = createSuccessEmbed(
                "🎁 A Gift!",
                `A **Level ${level} ${palData.name}** named **${nickname}** has been added to your collection by a game administrator!`
            ).setThumbnail(palData.pic); // Assuming palData has an image link

            await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                console.log(`Could not DM user ${targetUser.tag}. They may have DMs disabled.`);
            });

        } catch (error) {
            console.error("Addpal command error:", error);
            message.reply({ embeds: [createErrorEmbed("An Error Occurred", "Something went wrong while executing the command.")] });
        }
    }
};