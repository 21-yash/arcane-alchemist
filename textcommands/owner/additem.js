const Player = require("../../models/Player");
const GameData = require("../../utils/gameData");
const {
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    createInfoEmbed,
} = require("../../utils/embed");
const { getMember } = require("../../utils/functions");
const config = require("../../config/config.json");

module.exports = {
    name: "additem",
    description: "Add an item to a player's inventory (Admin only)",
    usage: "<@user or user_id> <item_id> [quantity]",
    ownerOnly: true,
    async execute(message, args, client, prefix) {
        
        if (args.length < 2) {
            return message.reply({
                embeds: [
                    createWarningEmbed(
                        "Invalid Usage",
                        `Usage: \`${prefix}additem <@user or user_id> <item_id> [quantity]\`\n\n` +
                        `Examples:\n` +
                        `• \`${prefix}additem @user iron_sword 1\`\n` +
                        `• \`${prefix}additem 123456789012345678 health_potion 5\`\n` +
                        `• \`${prefix}additem @user gold_coin\` (defaults to 1)`
                    ),
                ],
            });
        }

        try {
            
            const member = getMember(message, args[0]);
            const targetUserId = member.id
            const itemId = args[1].toLowerCase();
            const quantity = args[2] ? parseInt(args[2]) : 1;

            if (isNaN(quantity) || quantity <= 0) {
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "Invalid Quantity",
                            "Quantity must be a positive number."
                        ),
                    ],
                });
            }

            if (quantity > 9999) {
                return message.reply({
                    embeds: [
                        createWarningEmbed(
                            "Quantity Too High",
                            "Maximum quantity per command is 9999 to prevent accidents."
                        ),
                    ],
                });
            }

            if (!GameData.getItem(itemId)) {
                const availableItems = Object.keys(GameData.items).slice(0, 10).join(", ");
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "Item Not Found",
                            `The item "${itemId}" does not exist.\n\n` +
                            `Some available items: ${availableItems}...\n` +
                            `Use item IDs exactly as they appear in the game data.`
                        ),
                    ],
                });
            }

            let targetPlayer = await Player.findOne({ userId: targetUserId });
            
            if (!targetPlayer) {
                return message.reply({
                    embeds: [
                        createErrorEmbed(
                            "Player Not Found",
                            "This user hasn't started their adventure yet or the user ID is invalid."
                        ),
                    ],
                });
            }

            const existingItem = targetPlayer.inventory.find(item => item.itemId === itemId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                targetPlayer.inventory.push({
                    itemId: itemId,
                    quantity: quantity
                });
            }

            await targetPlayer.save();

            const itemData = GameData.getItem(itemId);
            
            let targetUserDisplay = targetUserId;
            try {
                const targetUser = await client.users.fetch(targetUserId);
                targetUserDisplay = targetUser.username;
            } catch (error) {
                targetUserDisplay = `User ID: ${targetUserId}`;
            }

            const itemRarityStr = itemData.rarity || 'Common';
            const rarityEmoji = config.emojis[itemRarityStr.charAt(0).toUpperCase() + itemRarityStr.slice(1).toLowerCase()] || '⬜';

            return message.reply({
                embeds: [
                    createSuccessEmbed(
                        "Item Added Successfully",
                        `Added **${quantity}x ${itemData.name}** to ${targetUserDisplay}'s inventory.\n\n` +
                        `**Item Details:**\n` +
                        `• **Type:** ${itemData.type || 'Unknown'}\n` +
                        `• **Description:** ${itemData.description || 'No description available'}\n` +
                        `• **Rarity:** ${rarityEmoji} ${itemRarityStr}`
                    ),
                ],
            });

        } catch (error) {
            console.error("Add item command error:", error);
            return message.reply({
                embeds: [
                    createErrorEmbed(
                        "Command Error",
                        "An error occurred while adding the item. Please check the console for details."
                    ),
                ],
            });
        }
    },
};