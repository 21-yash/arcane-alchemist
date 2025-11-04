
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
} = require("discord.js");
const Player = require("../../models/Player");
const {
    createErrorEmbed,
    createSuccessEmbed,
    createInfoEmbed,
    createWarningEmbed,
} = require("../../utils/embed");
const allBiomes = require("../../gamedata/biomes");
const allDungeons = require("../../gamedata/dungeons");
const Pet = require("../../models/Pet");
const allPals = require("../../gamedata/pets");

module.exports = {
    name: "select",
    description: "Set your preferred biome, dungeon, and pet for quick access",
    usage: "<biome|dungeon|pet>",
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({
                    embeds: [
                        createWarningEmbed(
                            "No Adventure Started",
                            `You haven't started your journey yet! Use \`${prefix}start\` to begin.`,
                        ),
                    ],
                });
            }

            if (!args[0]) {
                // Show current selections
                const currentSelections = {
                    biome: player.preferences?.selectedBiome || "None",
                    dungeon: player.preferences?.selectedDungeon || "None",
                    pet: player.preferences?.selectedPet || "None",
                };

                const pal = await Pet.findOne({ petId: player.preferences?.selectedPet });

                let description = "**Current Selections:**\n";
                description += `🌲 **Biome:** ${currentSelections.biome === "None" ? "None" : allBiomes[currentSelections.biome]?.name || "Unknown"}\n`;
                description += `🏰 **Dungeon:** ${currentSelections.dungeon === "None" ? "None" : allDungeons[currentSelections.dungeon]?.name || "Unknown"}\n`;
                description += `🐾 **Pet:** ${currentSelections.pet === "None" ? "None" : pal?.nickname}\n\n`;
                description += `Use \`${prefix}select <biome|dungeon|pet>\` to change your selections.`;

                return message.reply({
                    embeds: [createInfoEmbed("Your Selections", description, { footer: { text: message.author.username, iconURL: message.member.displayAvatarURL()} })],
                });
            }

            const type = args[0].toLowerCase();

            switch (type) {
                case "biome":
                    await handleBiomeSelection(message, player, client, prefix);
                    break;
                case "dungeon":
                    await handleDungeonSelection(message, player, client, prefix);
                    break;
                case "pet":
                    await handlePetSelection(message, player, client, prefix, args);
                    break;
                default:
                    return message.reply({
                        embeds: [
                            createWarningEmbed(
                                "Invalid Type",
                                `Please use: \`${prefix}select <biome|dungeon|pet>\``,
                            ),
                        ],
                    });
            }
        } catch (error) {
            console.error("Select command error:", error);
            message.reply({
                embeds: [
                    createErrorEmbed(
                        "An Error Occurred",
                        "There was a problem with the select command.",
                    ),
                ],
            });
        }
    },
};

async function handleBiomeSelection(message, player, client, prefix) {
    const biomeOptions = Object.entries(allBiomes)
        .filter(([, biome]) => player.level >= biome.levelRequirement)
        .map(([biomeId, biome]) => ({
            label: biome.name,
            description: `Level ${biome.levelRequirement} - ${biome.staminaCost} stamina`,
            value: biomeId,
        }));

    if (biomeOptions.length === 0) {
        return message.reply({
            embeds: [
                createWarningEmbed(
                    "No Available Biomes",
                    "You don't have access to any biomes yet!",
                ),
            ],
        });
    }

    // Add clear option
    biomeOptions.unshift({
        label: "Clear Selection",
        description: "Remove current biome selection",
        value: "clear",
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_biome")
        .setPlaceholder("Choose a biome...")
        .addOptions(biomeOptions.slice(0, 25));

    const reply = await message.reply({
        embeds: [createInfoEmbed("Select Biome", "Choose your preferred biome for foraging:")],
        components: [new ActionRowBuilder().addComponents(selectMenu)],
    });

    const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 60000,
        componentType: ComponentType.StringSelect,
    });

    collector.on("collect", async (interaction) => {
        const selectedBiome = interaction.values[0];

        if (!player.preferences) {
            player.preferences = {};
        }

        if (selectedBiome === "clear") {
            player.preferences.selectedBiome = null;
            await player.save();
            await interaction.update({
                embeds: [createSuccessEmbed("Biome Cleared", "Your biome selection has been cleared.")],
                components: [],
            });
        } else {
            player.preferences.selectedBiome = selectedBiome;
            await player.save();
            const biomeName = allBiomes[selectedBiome].name;
            await interaction.update({
                embeds: [createSuccessEmbed("Biome Selected", `Your preferred biome is now **${biomeName}**.`)],
                components: [],
            });
        }
    });

    collector.on("end", (collected) => {
        if (collected.size === 0) {
            reply.edit({ components: [] }).catch(() => {});
        }
    });
}

async function handleDungeonSelection(message, player, client, prefix) {
    const dungeonOptions = Object.entries(allDungeons)
        .filter(([, dungeon]) => player.level >= dungeon.levelRequirement)
        .map(([dungeonId, dungeon]) => ({
            label: dungeon.name,
            description: `Tier ${dungeon.tier} - Level ${dungeon.levelRequirement} - ${dungeon.floors} floors`,
            value: dungeonId,
        }));

    if (dungeonOptions.length === 0) {
        return message.reply({
            embeds: [
                createWarningEmbed(
                    "No Available Dungeons",
                    "You don't have access to any dungeons yet!",
                ),
            ],
        });
    }

    // Add clear option
    dungeonOptions.unshift({
        label: "Clear Selection",
        description: "Remove current dungeon selection",
        value: "clear",
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_dungeon")
        .setPlaceholder("Choose a dungeon...")
        .addOptions(dungeonOptions.slice(0, 25));

    const reply = await message.reply({
        embeds: [createInfoEmbed("Select Dungeon", "Choose your preferred dungeon:")],
        components: [new ActionRowBuilder().addComponents(selectMenu)],
    });

    const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 60000,
        componentType: ComponentType.StringSelect,
    });

    collector.on("collect", async (interaction) => {
        const selectedDungeon = interaction.values[0];

        if (!player.preferences) {
            player.preferences = {};
        }

        if (selectedDungeon === "clear") {
            player.preferences.selectedDungeon = null;
            await player.save();
            await interaction.update({
                embeds: [createSuccessEmbed("Dungeon Cleared", "Your dungeon selection has been cleared.")],
                components: [],
            });
        } else {
            player.preferences.selectedDungeon = selectedDungeon;
            await player.save();
            const dungeonName = allDungeons[selectedDungeon].name;
            await interaction.update({
                embeds: [createSuccessEmbed("Dungeon Selected", `Your preferred dungeon is now **${dungeonName}**.`)],
                components: [],
            });
        }
    });

    collector.on("end", (collected) => {
        if (collected.size === 0) {
            reply.edit({ components: [] }).catch(() => {});
        }
    });
}

async function handlePetSelection(message, player, client, prefix, args) {

    if (args.length < 2) {
        return message.reply({ embeds: [
            createWarningEmbed('Invalie Usage', `Use \`${prefix}select pet <id>\` to select pet`)
        ]});
    }
        const shortId = parseInt(args[1]);
        
        if (isNaN(shortId)) {
            return message.reply({
                embeds: [
                    createWarningEmbed(
                        "Invalid Pet ID",
                        `Please provide a valid pet short ID. Use \`${prefix}pet\` to see your pets.`,
                    ),
                ],
            });
        }

        if (shortId === 0) {
            // Clear selection
            if (!player.preferences) {
                player.preferences = {};
            }
            player.preferences.selectedPet = null;
            await player.save();
            return message.reply({
                embeds: [createSuccessEmbed("Pet Cleared", "Your pet selection has been cleared.")],
            });
        }

        const selectedPet = await Pet.findOne({
            ownerId: message.author.id,
            shortId: shortId,
        });
        if (!selectedPet) {
            return message.reply({
                embeds: [
                    createWarningEmbed(
                        "Pet Not Found",
                        `No pet found with ID #${shortId}. Make sure the pet exists and is available.`,
                    ),
                ],
            });
        }

        if (!player.preferences) {
            player.preferences = {};
        }
        player.preferences.selectedPet = selectedPet.petId;
        await player.save();

        return message.reply({
            embeds: [createSuccessEmbed("Pet Selected", `Your preferred pet is now **${selectedPet.nickname}** (#${shortId}).`)],
        });

}