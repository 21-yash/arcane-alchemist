const { createArgEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embed');
const Pet = require('../../models/Pet');
const Player = require('../../models/Player');
const allItems = require('../../gamedata/items');

module.exports = {
    name: 'equip',
    description: 'Equip your Pal with gear to boost its stats.',
    aliases: ['gear', 'equipitem'],
    usage: '<pal_id> <item_name>',
    async execute(message, args, client, prefix) {
        try {
            const player = await Player.findOne({ userId: message.author.id });
            if (!player) {
                return message.reply({ embeds: [ createErrorEmbed('No Adventure Started', `You haven't started your journey yet! Use \`${prefix}start\` to begin.`) ]});
            }

            if (args.length < 2) {
                return message.reply({ embeds: [ createArgEmbed(prefix, this.name, this.usage) ]});
            }

            const shortId = parseInt(args[0]);
            if (isNaN(shortId)) {
                return message.reply({ embeds: [ createWarningEmbed('Invalid Pal ID', 'The Pal ID must be a number.') ]});
            }

            const itemName = args.slice(1).join('_').toLowerCase();

            // --- 1. Fetch the Pal ---
            const pal = await Pet.findOne({ shortId, ownerId: message.author.id });
            if (!pal) {
                return message.reply({ embeds: [ createWarningEmbed(`Pal Not Found`, `You don't own a Pal with the ID **#${shortId}**.`) ]});
            }

            // --- 2. Find the new item in the player's inventory ---
            const itemInInventory = player.inventory.find(i => i.itemId === itemName);
            if (!itemInInventory) {
                const itemData = allItems[itemName];
                const cleanItemName = itemData ? itemData.name : itemName.replace(/_/g, ' ');
                return message.reply({ embeds: [ createWarningEmbed('Item Not Found', `You don't have a **${cleanItemName}** in your inventory.`) ]});
            }
            
            const newItemData = allItems[itemName];
            if (!newItemData || newItemData.type !== 'equipment') {
                return message.reply({ embeds: [ createWarningEmbed('Not Equipment', `**${newItemData.name}** is not an equippable item.`) ]});
            }
            const slot = newItemData.slot;

            // --- 3. Handle the swap logic ---
            const oldItemId = pal.equipment[slot];
            const oldItemData = oldItemId ? allItems[oldItemId] : null;

            // A. Unequip the old item (if one exists)
            if (oldItemData) {
                // Remove old stat bonuses
                if (oldItemData.stats) {
                    for (const stat in oldItemData.stats) {
                        if (typeof oldItemData.stats[stat] === 'number') {
                            pal.stats[stat] -= oldItemData.stats[stat] || 0;
                        }
                    }
                }
                // Add the old item back to inventory
                const oldItemInInventory = player.inventory.find(i => i.itemId === oldItemId);
                if (oldItemInInventory) {
                    oldItemInInventory.quantity += 1;
                } else {
                    player.inventory.push({ itemId: oldItemId, quantity: 1 });
                }
            }
            
            // B. Equip the new item
            // Remove 1 of the new item from inventory
            itemInInventory.quantity -= 1;
            if (itemInInventory.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId !== itemName);
            }
            // Add new stat bonuses
            if (newItemData.stats) {
                for (const stat in newItemData.stats) {
                     if (typeof newItemData.stats[stat] === 'number') {
                        pal.stats[stat] = (pal.stats[stat] || 0) + newItemData.stats[stat];
                    }
                }
            }
            // Update the Pal's equipment slot
            pal.equipment[slot] = itemName;
            pal.markModified('equipment');

            // --- 4. Prepare detailed feedback for the user ---
            const statChanges = [];
            const allStatKeys = new Set([
                ...Object.keys(oldItemData?.stats || {}),
                ...Object.keys(newItemData.stats || {})
            ]);

            allStatKeys.forEach(stat => {
                if (stat === 'special') return; // Handle special abilities separately
                
                const oldBonus = oldItemData?.stats?.[stat] || 0;
                const newBonus = newItemData.stats?.[stat] || 0;
                const change = newBonus - oldBonus;

                if (change !== 0) {
                    const currentTotal = pal.stats[stat];
                    const previousTotal = currentTotal - change;
                    const sign = change > 0 ? '+' : '';
                    statChanges.push(`**${stat.toUpperCase()}:** \`${previousTotal}\` → \`${currentTotal}\` (${sign}${change})`);
                }
            });

            let specialAbilityInfo = '';
            const oldSpecial = oldItemData?.stats?.special;
            const newSpecial = newItemData.stats?.special;

            if (newSpecial && newSpecial !== oldSpecial) {
                specialAbilityInfo += `\n**Gained Ability:** ${newSpecial.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
            }
            if (oldSpecial && newSpecial !== oldSpecial) {
                specialAbilityInfo += `\n**Lost Ability:** ${oldSpecial.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
            }

            // --- 5. Save changes and send confirmation ---
            await pal.save();
            await player.save();

            const successEmbed = createSuccessEmbed(
                'Item Equipped!',
                `**${pal.nickname}** has equipped the **${newItemData.name}**.`,
                {
                    fields: [
                        { name: 'Stat Changes', value: statChanges.length > 0 ? statChanges.join('\n') : 'No change in stats.' },
                        ...(specialAbilityInfo ? [{ name: 'Ability Changes', value: specialAbilityInfo.trim() }] : [])
                    ]
                }
            );
            
            message.reply({ embeds: [successEmbed] });

        } catch (err) {
            console.error('Equip command error:', err);
            message.reply({ embeds: [ createErrorEmbed('An Error Occurred', 'There was a problem equipping this item.') ]});
        }
    }
};