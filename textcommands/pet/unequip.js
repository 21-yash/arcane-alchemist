const { createArgEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embed');
const Pet = require('../../models/Pet');
const Player = require('../../models/Player');
const GameData = require('../../utils/gameData');
const CommandHelpers = require('../../utils/commandHelpers');

module.exports = {
    name: 'unequip',
    description: 'Unequip an item from your Pal and return it to your inventory.',
    aliases: ['ungear', 'unequipitem', 'remove'],
    usage: '<pal_id> <slot>',
    async execute(message, args, client, prefix) {
        try {
            // Validate player
            const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
            if (!playerResult.success) {
                return message.reply({ embeds: [playerResult.embed] });
            }
            const player = playerResult.player;

            // Check arguments
            if (args.length < 2) {
                return message.reply({ 
                    embeds: [createArgEmbed(prefix, this.name, this.usage)],
                    content: 'Valid slots: `weapon`, `offhand`, `head`, `chest`, `leg`, `boots`, `accessory`'
                });
            }

            const shortId = parseInt(args[0]);
            const slotName = args[1].toLowerCase();

            // Validate slot name
            const validSlots = ['weapon', 'offhand', 'head', 'chest', 'leg', 'boots', 'accessory'];
            if (!validSlots.includes(slotName)) {
                return message.reply({ 
                    embeds: [createWarningEmbed(
                        'Invalid Slot', 
                        `Please specify a valid equipment slot.\n**Valid slots:** ${validSlots.join(', ')}`
                    )]
                });
            }

            // Validate pet
            const petResult = await CommandHelpers.validatePet(message.author.id, shortId, prefix);
            if (!petResult.success) {
                return message.reply({ embeds: [petResult.embed] });
            }
            const pal = petResult.pet;

            // Check if slot has equipment
            const equippedItemId = pal.equipment[slotName];
            if (!equippedItemId) {
                return message.reply({ 
                    embeds: [createWarningEmbed(
                        'Nothing Equipped', 
                        `**${pal.nickname}** doesn't have anything equipped in the **${slotName}** slot.`
                    )]
                });
            }

            // Get item data
            const itemData = GameData.getItem(equippedItemId);
            if (!itemData) {
                return message.reply({ 
                    embeds: [createErrorEmbed(
                        'Item Error', 
                        'The equipped item data could not be found.'
                    )]
                });
            }

            // Remove stat bonuses
            const statChanges = [];
            if (itemData.stats) {
                for (const stat in itemData.stats) {
                    const statValue = itemData.stats[stat];
                    if (typeof statValue === 'number') {
                        const previousTotal = pal.stats[stat];
                        pal.stats[stat] -= statValue;
                        const currentTotal = pal.stats[stat];
                        statChanges.push(`**${stat.toUpperCase()}:** \`${previousTotal}\` → \`${currentTotal}\` (-${statValue})`);
                    }
                }
            }

            // Handle special abilities
            let specialAbilityInfo = '';
            const lostSpecial = itemData.stats?.special;
            if (lostSpecial) {
                const formattedSpecial = lostSpecial.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                specialAbilityInfo = `**Lost Ability:** ${formattedSpecial}`;
            }

            // Return item to inventory
            const existingItem = player.inventory.find(i => i.itemId === equippedItemId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                player.inventory.push({ itemId: equippedItemId, quantity: 1 });
            }

            // Remove from equipment slot
            pal.equipment[slotName] = null;
            pal.markModified('equipment');
            pal.markModified('stats');

            // Save changes
            await pal.save();
            await player.save();

            // Get item emoji
            const itemEmoji = CommandHelpers.getItemEmoji(equippedItemId);

            // Send success message
            const successEmbed = createSuccessEmbed(
                'Item Unequipped!',
                `${itemEmoji} **${itemData.name}** has been unequipped from **${pal.nickname}** and returned to your inventory.`,
                {
                    fields: [
                        ...(statChanges.length > 0 ? [{ 
                            name: 'Stat Changes', 
                            value: statChanges.join('\n') 
                        }] : []),
                        ...(specialAbilityInfo ? [{ 
                            name: 'Ability Changes', 
                            value: specialAbilityInfo 
                        }] : [])
                    ],
                    footer: { 
                        text: `${pal.nickname} • ${slotName.charAt(0).toUpperCase() + slotName.slice(1)} slot emptied`,
                        iconURL: message.author.displayAvatarURL()
                    }
                }
            );

            message.reply({ embeds: [successEmbed] });

        } catch (err) {
            console.error('Unequip command error:', err);
            message.reply({ 
                embeds: [createErrorEmbed('An Error Occurred', 'There was a problem unequipping this item.')] 
            });
        }
    }
};