const { createArgEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embed');
const Pet = require('../../models/Pet');
const Player = require('../../models/Player');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');

module.exports = {
    name: 'equip',
    description: 'Equip your Pal with gear to boost its stats.',
    aliases: ['gear', 'equipitem'],
    usage: '<pal_id> <item_name>',
    cooldown: 5,
    async execute(message, args, client, prefix) {
        try {
            // Validate player
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            // Validate arguments
            const argValidation = CommandHelpers.validateArguments(args, { min: 2 });
            if (!argValidation.success) {
                return message.reply({ embeds: [createArgEmbed(prefix, this.name, this.usage)] });
            }

            const shortId = parseInt(args[0]);
            const itemName = args.slice(1).join('_').toLowerCase();

            // Validate pet
            const petResult = await CommandHelpers.validatePet(message.author.id, shortId, prefix);
            if (!petResult.success) {
                return message.reply({ embeds: [petResult.embed] });
            }
            const pal = petResult.pet;

            // Find item in inventory
            const itemInInventory = CommandHelpers.getInventoryItem(player, itemName);
            if (!itemInInventory) {
                const itemData = CommandHelpers.getItemData(itemName);
                const cleanItemName = itemData ? itemData.name : itemName.replace(/_/g, ' ');
                return message.reply({ 
                    embeds: [createWarningEmbed(
                        'Item Not Found', 
                        `You don't have a **${cleanItemName}** in your inventory.`
                    )]
                });
            }

            // Validate item is equipment
            const newItemData = CommandHelpers.getItemData(itemName);
            if (!newItemData || newItemData.type !== 'equipment') {
                return message.reply({ 
                    embeds: [createWarningEmbed(
                        'Not Equipment', 
                        `**${newItemData?.name || itemName}** is not an equippable item.`
                    )]
                });
            }

            const slot = newItemData.slot;
            const oldItemId = pal.equipment[slot];
            const oldItemData = oldItemId ? CommandHelpers.getItemData(oldItemId) : null;

            // Calculate stat changes before modifying
            const statChanges = this.calculateStatChanges(pal, oldItemData, newItemData);
            const { specialGained, specialLost } = this.getSpecialAbilityChanges(oldItemData, newItemData);

            // Unequip old item if exists
            if (oldItemData) {
                this.removeItemStats(pal, oldItemData);
                this.returnItemToInventory(player, oldItemId);
            }

            // Equip new item
            this.removeItemFromInventory(player, itemName);
            this.applyItemStats(pal, newItemData);
            pal.equipment[slot] = itemName;
            pal.markModified('equipment');
            pal.markModified('stats');

            // Save changes
            await pal.save();
            await player.save();

            // Get item emoji
            const itemEmoji = CommandHelpers.getItemEmoji(itemName);

            // Build success embed
            const successEmbed = createSuccessEmbed(
                'Item Equipped!',
                `${itemEmoji} **${pal.nickname}** has equipped the **${newItemData.name}**.`,
                {
                    fields: [
                        ...(statChanges.length > 0 ? [{
                            name: 'Stat Changes',
                            value: statChanges.join('\n')
                        }] : []),
                        ...(specialGained || specialLost ? [{
                            name: 'Ability Changes',
                            value: [specialGained, specialLost].filter(Boolean).join('\n')
                        }] : [])
                    ],
                    footer: {
                        text: `${pal.nickname} • ${slot.charAt(0).toUpperCase() + slot.slice(1)} slot`,
                        iconURL: message.author.displayAvatarURL()
                    }
                }
            );

            message.reply({ embeds: [successEmbed] });

        } catch (err) {
            console.error('Equip command error:', err);
            await CommandHelpers.handleCommandError(err, 'Equip', message);
        }
    },

    /**
     * Calculate stat changes between old and new items
     */
    calculateStatChanges(pal, oldItemData, newItemData) {
        const statChanges = [];
        const allStatKeys = new Set([
            ...Object.keys(oldItemData?.stats || {}),
            ...Object.keys(newItemData.stats || {})
        ]);

        allStatKeys.forEach(stat => {
            if (stat === 'special') return; // Handle separately

            const oldBonus = (typeof oldItemData?.stats?.[stat] === 'number') ? oldItemData.stats[stat] : 0;
            const newBonus = (typeof newItemData.stats?.[stat] === 'number') ? newItemData.stats[stat] : 0;
            const change = newBonus - oldBonus;

            if (change !== 0) {
                const currentTotal = pal.stats[stat];
                const previousTotal = currentTotal - change;
                const sign = change > 0 ? '+' : '';
                statChanges.push(`**${stat.toUpperCase()}:** \`${previousTotal}\` → \`${currentTotal}\` (${sign}${change})`);
            }
        });

        return statChanges;
    },

    /**
     * Get special ability changes
     */
    getSpecialAbilityChanges(oldItemData, newItemData) {
        const oldSpecial = oldItemData?.stats?.special;
        const newSpecial = newItemData.stats?.special;

        let specialGained = null;
        let specialLost = null;

        if (newSpecial && newSpecial !== oldSpecial) {
            const formattedSpecial = newSpecial.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            specialGained = `**Gained Ability:** ${formattedSpecial}`;
        }

        if (oldSpecial && newSpecial !== oldSpecial) {
            const formattedSpecial = oldSpecial.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            specialLost = `**Lost Ability:** ${formattedSpecial}`;
        }

        return { specialGained, specialLost };
    },

    /**
     * Remove item stats from pal
     */
    removeItemStats(pal, itemData) {
        if (!itemData.stats) return;

        for (const stat in itemData.stats) {
            if (typeof itemData.stats[stat] === 'number') {
                pal.stats[stat] -= itemData.stats[stat] || 0;
            }
        }
    },

    /**
     * Apply item stats to pal
     */
    applyItemStats(pal, itemData) {
        if (!itemData.stats) return;

        for (const stat in itemData.stats) {
            if (typeof itemData.stats[stat] === 'number') {
                pal.stats[stat] = (pal.stats[stat] || 0) + itemData.stats[stat];
            }
        }
    },

    /**
     * Return item to player inventory
     */
    returnItemToInventory(player, itemId) {
        const existingItem = player.inventory.find(i => i.itemId === itemId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            player.inventory.push({ itemId: itemId, quantity: 1 });
        }
    },

    /**
     * Remove item from player inventory
     */
    removeItemFromInventory(player, itemId) {
        const item = player.inventory.find(i => i.itemId === itemId);
        if (item) {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId !== itemId);
            }
        }
    }
};