const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
} = require("discord.js");
const Player = require("../../models/Player");
const {
    createErrorEmbed,
    createSuccessEmbed,
    createCustomEmbed,
} = require("../../utils/embed");
const GameData = require("../../utils/gameData");
const config = require("../../config/config.json");
const CommandHelpers = require("../../utils/commandHelpers");
const LabManager = require('../../utils/labManager');

// --- Shop Configuration ---
const SHOP_CONFIG = {
    dailyStockCount: 3,
    dailyScrollCount: 8, // Increased for more scroll variety
    refreshHours: 12, // Changed from 24 to 12 hours
    priceMultiplier: 3,
    currency: "arcaneDust",
    // Pool of common ingredients that can appear in the shop
    itemPool: [
        "moonpetal_herb",
        "crystal_shard",
        "scrap_metal",
        "silver_leaf",
        "ember_moss",
        "wind_crystal",
        "feathered_plume",
        "oil_essence",
        "gear_component",
    ],
};

// --- Recipe Scroll Configuration - ONLY recipes that actually exist in recipes.js ---
const RECIPE_SCROLLS = {
    // === BREWING RECIPES (Potions) ===
    scroll_minor_healing: {
        name: "Scroll of Minor Healing Recipe",
        recipeId: "recipe_minor_healing",
        price: 150,
        description: "Unlocks the recipe for Minor Healing Potion",
    },
    scroll_elixir_strength: {
        name: "Scroll of Strength Elixir Recipe",
        recipeId: "recipe_elixir_strength",
        price: 300,
        description: "Unlocks the recipe for Elixir of Strength",
    },
    scroll_mana_draught: {
        name: "Scroll of Mana Draught Recipe",
        recipeId: "recipe_mana_draught",
        price: 250,
        description: "Unlocks the recipe for Mana Draught",
    },
    scroll_greater_healing: {
        name: "Scroll of Greater Healing Recipe",
        recipeId: "recipe_greater_healing",
        price: 500,
        description: "Unlocks the recipe for Greater Healing Potion",
    },
    scroll_storm_elixir: {
        name: "Scroll of Storm Elixir Recipe",
        recipeId: "recipe_storm_elixir",
        price: 750,
        description: "Unlocks the recipe for Storm Elixir",
    },
    scroll_level_potion: {
        name: "Scroll of Level Potion Recipe",
        recipeId: "recipe_level_potion",
        price: 400,
        description: "Unlocks the recipe for Level Potion",
    },
    scroll_void_tonic: {
        name: "Scroll of Void Tonic Recipe",
        recipeId: "recipe_void_tonic",
        price: 600,
        description: "Unlocks the recipe for Void Tonic",
    },
    scroll_celestial_elixir: {
        name: "Scroll of Celestial Elixir Recipe",
        recipeId: "recipe_celestial_elixir",
        price: 1000,
        description: "Unlocks the recipe for Celestial Elixir",
    },
    scroll_elixir_focus: {
        name: "Scroll of Focus Elixir Recipe",
        recipeId: "recipe_elixir_focus",
        price: 350,
        description: "Unlocks the recipe for Elixir of Focus",
    },
    scroll_shadow_draught: {
        name: "Scroll of Shadow Draught Recipe",
        recipeId: "recipe_shadow_draught",
        price: 550,
        description: "Unlocks the recipe for Shadow Draught",
    },
    scroll_ice_resistance_potion: {
        name: "Scroll of Ice Resistance Potion Recipe",
        recipeId: "recipe_ice_resistance_potion",
        price: 300,
        description: "Unlocks the recipe for Ice Resistance Potion",
    },
    scroll_fire_resistance_draught: {
        name: "Scroll of Fire Resistance Draught Recipe", 
        recipeId: "recipe_fire_resistance_draught",
        price: 300,
        description: "Unlocks the recipe for Fire Resistance Draught",
    },
    scroll_berserker_elixir: {
        name: "Scroll of Berserker Elixir Recipe",
        recipeId: "recipe_berserker_elixir", 
        price: 800,
        description: "Unlocks the recipe for Berserker Elixir",
    },
    scroll_spirit_communion_brew: {
        name: "Scroll of Spirit Communion Brew Recipe",
        recipeId: "recipe_spirit_communion_brew",
        price: 700,
        description: "Unlocks the recipe for Spirit Communion Brew",
    },

    // === WEAPON RECIPES ===
    scroll_wooden_sword: {
        name: "Scroll of Wooden Sword Recipe",
        recipeId: "recipe_wooden_sword",
        price: 200,
        description: "Unlocks the recipe for Wooden Sword",
    },
    scroll_iron_sword: {
        name: "Scroll of Iron Sword Recipe",
        recipeId: "recipe_iron_sword",
        price: 400,
        description: "Unlocks the recipe for Iron Sword",
    },
    scroll_bronze_sword: {
        name: "Scroll of Bronze Sword Recipe",
        recipeId: "recipe_bronze_sword",
        price: 450,
        description: "Unlocks the recipe for Bronze Sword",
    },
    scroll_ember_blade: {
        name: "Scroll of Ember Blade Recipe",
        recipeId: "recipe_ember_blade",
        price: 800,
        description: "Unlocks the recipe for Ember Blade",
    },
    scroll_frost_spear: {
        name: "Scroll of Frost Spear Recipe",
        recipeId: "recipe_frost_spear",
        price: 750,
        description: "Unlocks the recipe for Frost Spear",
    },
    scroll_shadow_dagger: {
        name: "Scroll of Shadow Dagger Recipe",
        recipeId: "recipe_shadow_dagger",
        price: 900,
        description: "Unlocks the recipe for Shadow Dagger",
    },
    scroll_crystal_mace: {
        name: "Scroll of Crystal Mace Recipe",
        recipeId: "recipe_crystal_mace", 
        price: 1000,
        description: "Unlocks the recipe for Crystal Mace",
    },
    scroll_wind_bow: {
        name: "Scroll of Wind Bow Recipe",
        recipeId: "recipe_wind_bow",
        price: 850,
        description: "Unlocks the recipe for Wind Bow",
    },
    scroll_soul_scythe: {
        name: "Scroll of Soul Scythe Recipe",
        recipeId: "recipe_soul_scythe",
        price: 1200,
        description: "Unlocks the recipe for Soul Scythe",
    },
    scroll_stormcaller_staff: {
        name: "Scroll of Stormcaller Staff Recipe",
        recipeId: "recipe_stormcaller_staff",
        price: 1100,
        description: "Unlocks the recipe for Stormcaller Staff",
    },

    // === ARMOR & EQUIPMENT RECIPES ===
    scroll_leather_helmet: {
        name: "Scroll of Leather Helmet Recipe",
        recipeId: "recipe_leather_helmet",
        price: 250,
        description: "Unlocks the recipe for Leather Helmet",
    },
    scroll_mechanical_gauntlets: {
        name: "Scroll of Mechanical Gauntlets Recipe",
        recipeId: "recipe_mechanical_gauntlets",
        price: 600,
        description: "Unlocks the recipe for Mechanical Gauntlets",
    },
    scroll_storm_boots: {
        name: "Scroll of Storm Boots Recipe",
        recipeId: "recipe_storm_boots",
        price: 700,
        description: "Unlocks the recipe for Storm Boots",
    },
    scroll_void_cloak: {
        name: "Scroll of Void Cloak Recipe",
        recipeId: "recipe_void_cloak",
        price: 1000,
        description: "Unlocks the recipe for Void Cloak",
    },
    scroll_celestial_crown: {
        name: "Scroll of Celestial Crown Recipe",
        recipeId: "recipe_celestial_crown",
        price: 1500,
        description: "Unlocks the recipe for Celestial Crown",
    },
    scroll_guardian_shield: {
        name: "Scroll of Guardian Shield Recipe",
        recipeId: "recipe_guardian_shield",
        price: 500,
        description: "Unlocks the recipe for Guardian Shield",
    },
    scroll_void_shield: {
        name: "Scroll of Void Shield Recipe", 
        recipeId: "recipe_void_shield",
        price: 800,
        description: "Unlocks the recipe for Void Shield",
    },

    // === ACCESSORY RECIPES ===
    scroll_enchanted_charm: {
        name: "Scroll of Enchanted Charm Recipe",
        recipeId: "recipe_enchanted_charm",
        price: 400,
        description: "Unlocks the recipe for Enchanted Charm",
    },
    scroll_glowing_amulet: {
        name: "Scroll of Glowing Amulet Recipe", 
        recipeId: "recipe_glowing_amulet",
        price: 350,
        description: "Unlocks the recipe for Glowing Amulet",
    },
    scroll_ancient_signet: {
        name: "Scroll of Ancient Signet Recipe",
        recipeId: "recipe_ancient_signet", 
        price: 900,
        description: "Unlocks the recipe for Ancient Signet",
    },
    scroll_soul_pendant: {
        name: "Scroll of Soul Pendant Recipe",
        recipeId: "recipe_soul_pendant",
        price: 800,
        description: "Unlocks the recipe for Soul Pendant",
    },

    // === CRAFTING COMPONENTS ===
    scroll_alchemical_incubator: {
        name: "Scroll of Alchemical Incubator Recipe",
        recipeId: "recipe_alchemical_incubator",
        price: 1000,
        description: "Unlocks the recipe for Alchemical Incubator",
    },
    scroll_breeding_pen: {
        name: "Scroll of Breeding Pen Recipe", 
        recipeId: "recipe_breeding_pen",
        price: 2000,
        description: "Unlocks the recipe for Breeding Pen",
    },
};

// --- Helper Functions ---
function getDailyDeals() {
    const today = new Date();
    const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * SHOP_CONFIG.refreshHours)); // Changed to 12 hours
    const rng = seedRandom(daysSinceEpoch);

    const availableItems = [...SHOP_CONFIG.itemPool];
    const deals = [];

    for (let i = 0; i < SHOP_CONFIG.dailyStockCount; i++) {
        if (availableItems.length === 0) break;

        const randomIndex = Math.floor(rng() * availableItems.length);
        deals.push(availableItems.splice(randomIndex, 1)[0]);
    }

    return deals;
}

function getDailyScrolls() {
    const today = new Date();
    const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * SHOP_CONFIG.refreshHours)); // Changed to 12 hours
    const rng = seedRandom(daysSinceEpoch + 1000); // Different seed for scrolls

    const availableScrolls = Object.keys(RECIPE_SCROLLS);
    const scrolls = [];

    for (
        let i = 0;
        i < SHOP_CONFIG.dailyScrollCount && availableScrolls.length > 0;
        i++
    ) {
        const randomIndex = Math.floor(rng() * availableScrolls.length);
        scrolls.push(availableScrolls.splice(randomIndex, 1)[0]);
    }

    return scrolls;
}

// Simple seeded random function
function seedRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return function () {
        x = Math.sin(x) * 10000;
        return x - Math.floor(x);
    };
}

module.exports = {
    name: "shop",
    description: "Visit the shop to spend your Arcane Dust on ingredients and Gold on recipe scrolls.",
    cooldown: 5,
    async execute(message, args, client, prefix) {
        try {
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;
            const labContext = await LabManager.loadPlayerLab(player);
            const labEffects = labContext.effects;

            const dailyDeals = getDailyDeals();
            const dailyScrolls = getDailyScrolls();

            let shopDescription =
                "Welcome to the shop! Here are today's deals and recipe scrolls.\n\n";
            shopDescription += "**📜 Daily Ingredients** *(Arcane Dust)*\n";

            dailyDeals.forEach((itemId) => {
                const item = GameData.getItem(itemId);
                const itemEmoji = CommandHelpers.getItemEmoji(itemId);
                const basePrice = (item.rarity === "Common" ? 10 : 20) * SHOP_CONFIG.priceMultiplier;
                const price = basePrice;
                shopDescription += `> ${itemEmoji} **${item.name}** - \`${price}\` Dust\n`;
            });

            shopDescription += "\n**📚 Daily Recipe Scrolls** *(Gold)*\n";

            // Show today's scrolls (only ones player doesn't know yet)
            const availableScrolls = dailyScrolls.filter((scrollId) => {
                const scroll = RECIPE_SCROLLS[scrollId];
                return (
                    !player.grimoire.includes(scroll.recipeId) &&
                    !player.craftingJournal.includes(scroll.recipeId)
                );
            });

            availableScrolls.forEach((scrollId) => {
                const scroll = RECIPE_SCROLLS[scrollId];
                const price = scroll.price;
                shopDescription += `> ${CommandHelpers.getItemEmoji("scroll")} **${scroll.name}** - \`${price}\` Gold\n`;
            });

            if (availableScrolls.length === 0) {
                shopDescription +=
                    "> *No new recipes available today - you know them all or check back in 12 hours!*\n";
            }

            const shopEmbed = createCustomEmbed(
                "🔮 Alchemist's Shop",
                shopDescription,
                "#9B59B6",
                {
                    footer: {
                        text: `Arcane Dust: ${player.arcaneDust} | Gold: ${player.gold} | Stock refreshes every 12 hours!`,
                    },
                },
            );

            const components = [];

            // Create ingredient select menu
            if (dailyDeals.length > 0) {
                const ingredientOptions = dailyDeals.map((itemId) => {
                    const item = GameData.getItem(itemId);
                    const basePrice = (item.rarity === "Common" ? 10 : 20) * SHOP_CONFIG.priceMultiplier;
                    const price = basePrice;
                    return {
                        label: item.name,
                        description: `${item.description.substring(0, 80)} - ${price} Dust`,
                        value: itemId,
                    };
                });

                const ingredientMenu = new StringSelectMenuBuilder()
                    .setCustomId("buy_ingredient")
                    .setPlaceholder("Select an ingredient to buy...")
                    .addOptions(ingredientOptions);

                components.push(
                    new ActionRowBuilder().addComponents(ingredientMenu),
                );
            }

            // Create scroll select menu
            if (availableScrolls.length > 0) {
                const scrollOptions = availableScrolls.map((scrollId) => {
                    const scroll = RECIPE_SCROLLS[scrollId];
                    const price = scroll.price;
                    return {
                        label: scroll.name,
                        description: `${scroll.description.substring(0, 80)} - ${price} Gold`,
                        value: scrollId,
                    };
                });

                const scrollMenu = new StringSelectMenuBuilder()
                    .setCustomId("buy_scroll")
                    .setPlaceholder("Select a recipe scroll to buy...")
                    .addOptions(scrollOptions);

                components.push(
                    new ActionRowBuilder().addComponents(scrollMenu),
                );
            }

            const shopMessage = await message.reply({
                embeds: [shopEmbed],
                components: components,
            });

            if (components.length === 0) {
                return; // No interactive components, end here
            }

            // Handle purchases
            const collector = shopMessage.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 5 * 60000, // 5 minutes
                componentType: ComponentType.StringSelect,
            });

            collector.on("collect", async (interaction) => {
                try {
                    await interaction.deferUpdate();
                    
                    const currentPlayer = await Player.findOne({
                        userId: message.author.id,
                    });

                    if (interaction.customId === "buy_ingredient") {
                        const itemId = interaction.values[0];
                        const item = GameData.getItem(itemId);
                        const basePrice = (item.rarity === "Common" ? 10 : 20) * SHOP_CONFIG.priceMultiplier;
                        const price = basePrice;

                        if (currentPlayer.arcaneDust < price) {
                            return interaction.followUp({
                                embeds: [
                                    createErrorEmbed(
                                        "Insufficient Dust",
                                        `You need **${price}** Arcane Dust to buy **${item.name}**.\nYou currently have **${currentPlayer.arcaneDust}** Dust.`,
                                    ),
                                ],
                                ephemeral: true,
                            });
                        }

                        // Purchase the item
                        currentPlayer.arcaneDust -= price;
                        const existingItem = currentPlayer.inventory.find(
                            (inv) => inv.itemId === itemId,
                        );
                        if (existingItem) {
                            existingItem.quantity += 1;
                        } else {
                            currentPlayer.inventory.push({
                                itemId: itemId,
                                quantity: 1,
                            });
                        }

                        await currentPlayer.save();

                        await interaction.followUp({
                            embeds: [
                                createSuccessEmbed(
                                    "Purchase Successful!",
                                    `You bought **${CommandHelpers.getItemEmoji(itemId)} ${item.name}** for **${price}** Arcane Dust!\nRemaining Dust: **${currentPlayer.arcaneDust}**`,
                                ),
                            ],
                            ephemeral: true,
                        });
                    } else if (interaction.customId === "buy_scroll") {
                        const scrollId = interaction.values[0];
                        const scroll = RECIPE_SCROLLS[scrollId];
                        const scrollPrice = scroll.price;

                        if (currentPlayer.gold < scrollPrice) {
                            return interaction.followUp({
                                embeds: [
                                    createErrorEmbed(
                                        "Insufficient Gold",
                                        `You need **${scrollPrice}** Gold to buy **${scroll.name}**.\nYou currently have **${currentPlayer.gold}** Gold.`,
                                    ),
                                ],
                                ephemeral: true,
                            });
                        }

                        // Check if player already knows the recipe
                        if (
                            currentPlayer.grimoire.includes(scroll.recipeId) ||
                            currentPlayer.craftingJournal.includes(scroll.recipeId)
                        ) {
                            return interaction.followUp({
                                embeds: [
                                    createErrorEmbed(
                                        "Recipe Already Known",
                                        `You already know this recipe!`,
                                    ),
                                ],
                                ephemeral: true,
                            });
                        }

                        // Purchase the scroll and learn the recipe
                        currentPlayer.gold -= scrollPrice;

                        // Determine if it's a potion or equipment recipe based on result itemId
                        if (scroll.recipeId.includes("elixir") || scroll.recipeId.includes("healing") || scroll.recipeId.includes("brew") || scroll.recipeId.includes("draught") || scroll.recipeId.includes("potion") || scroll.recipeId.includes("tonic")) {
                            currentPlayer.grimoire.push(scroll.recipeId);
                        } else {
                            currentPlayer.craftingJournal.push(scroll.recipeId);
                        }

                        await currentPlayer.save();

                        const recipeType = currentPlayer.grimoire.includes(scroll.recipeId) ? "Grimoire" : "Crafting Journal";

                        await interaction.followUp({
                            embeds: [
                                createSuccessEmbed(
                                    "Recipe Learned!",
                                        `You purchased **${CommandHelpers.getItemEmoji("scroll")} ${scroll.name}** for **${scrollPrice}** Gold!\nThe recipe has been added to your **${recipeType}**.\nRemaining Gold: **${currentPlayer.gold}**`,
                                ),
                            ],
                            ephemeral: true,
                        });
                    }
                } catch (error) {
                    console.error("Shop purchase error:", error);
                    await interaction.followUp({
                        embeds: [
                            createErrorEmbed(
                                "Purchase Failed",
                                "There was an error processing your purchase. Please try again.",
                            ),
                        ],
                        ephemeral: true,
                    }).catch(() => {}); // Ignore if follow-up fails
                }
            });

            collector.on("end", () => {
                shopMessage.edit({ components: [] }).catch(() => {}); // Remove components when done
            });
        } catch (error) {
            console.error("Shop command error:", error);
            message.reply({
                embeds: [
                    createErrorEmbed(
                        "Shop Error",
                        "There was a problem accessing the shop. Please try again.",
                    ),
                ],
            });
        }
    },
};