const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createInfoEmbed, createCustomEmbed } = require('../../utils/embed');
const config = require('../../config/config.json');

// Guide content organized by topic
const GUIDE_TOPICS = {
    foraging: {
        title: '🌿 Foraging Guide',
        description: 'Master the art of gathering ingredients from mystical biomes.',
        content: `**What is Foraging?**
Foraging allows you to explore various biomes to gather rare alchemical ingredients for brewing potions and crafting items.

**How to Forage:**
• Use the \`forage [biome_name]\` command to start gathering
• Each biome requires specific stamina and player levels
• You can also use \`select biome\` to set a preferred biome for quick foraging

**Foraging Events:**
During foraging, you may encounter special events:
• **Common Events:** Standard gathering with normal rewards
• **Rare Events:** Lucky finds with bonus materials or gold
• **Negative Events:** Mishaps that reduce loot or cost gold
• **Pet Bonuses:** Your selected Pal can increase luck and find better items

**What You Can Get:**
• **Ingredients:** Used for brewing potions and crafting
• **Materials:** Crafting materials for equipment
• **Rare Finds:** Special items with low drop rates
• **Wild Pals:** Occasionally encounter tameable Pals
• **Gold & XP:** Earn rewards for each expedition

**Pro Tips:**
• Different biomes have different loot tables and difficulty
• Take a Pal with you for better luck and bonuses
• Higher-level biomes give better rewards but require more stamina
• Use potions like Lure Essence to increase Pal encounter rates
• Lab upgrades can reduce cooldowns and increase rare item chances`,
        color: config.colors.success
    },
    
    dungeons: {
        title: '⚔️ Dungeon Guide',
        description: 'Brave corrupted dungeons to earn powerful rewards.',
        content: `**What are Dungeons?**
Dungeons are multi-floor challenges where you battle enemies with one of your Pals to earn valuable loot, gold, and XP.

**How to Enter Dungeons:**
• Use \`dungeon [dungeon_name]\` to enter a specific dungeon
• Or use \`select dungeon\` to set a preferred dungeon, then \`dungeon quick\`
• Select a Pal that meets the level requirement
• Optionally use a combat potion to boost your Pal's stats

**Dungeon Structure:**
• Each dungeon has multiple floors with increasing difficulty
• Face enemies with unique abilities and stats
• Choose to fight or run from each floor
• Collect rewards after defeating each floor's enemy
• Your Pal can become injured if defeated (recovers over time)

**What You Can Get:**
• **Gold:** Substantial gold rewards per floor
• **XP:** Both player and Pal gain experience
• **Materials:** Rare crafting materials
• **Eggs:** Special eggs that hatch into powerful Pals
• **Equipment:** Gear for your Pals (from certain dungeons)

**Combat Tips:**
• Choose Pals with type advantages against dungeon enemies
• Use combat potions for challenging dungeons
• Higher-tier dungeons give better rewards but are harder
• Skills and equipment greatly affect combat effectiveness
• Running from battles forfeits floor rewards but saves your Pal

**Recovery:**
• Injured Pals heal 1 HP per minute automatically
• Lab equipment can speed up recovery`,
        color: config.colors.error
    },
    
    battles: {
        title: '⚔️ Battle System Guide',
        description: 'Understand the combat mechanics and status effects.',
        content: `**Combat Basics:**
Combat in Arcane Alchemist uses a turn-based system where Pals fight using their stats and equipped skills.

**Core Stats:**
• **HP:** Health points - when it reaches 0, the Pal is defeated
• **ATK:** Attack power - determines damage dealt
• **DEF:** Defense - reduces incoming damage
• **SPD:** Speed - determines turn order (higher goes first)
• **LUCK:** Luck - affects critical hit chance and drops

**Turn Flow:**
1. Speed determines who attacks first
2. Attacker uses a skill (random from equipped skills)
3. Damage is calculated: ATK vs DEF with modifiers
4. Status effects activate (poison, stun, burn, etc.)
5. Turn switches to the other Pal

**Status Effects:**
• **Poison:** Deals damage over time each turn
• **Burn:** Similar to poison but fire-based
• **Stun:** Skip next turn completely
• **Freeze:** Chance to skip turns
• **Bleed:** Increasing damage over time
• **Shield:** Absorbs damage for several turns
• **Regen:** Heals HP each turn
• **Decay:** Lowers defense over time

**Type System:**
Different Pal types (Beast, Elemental, Mystic, Mechanical, etc.) have varying stat distributions and unlock different skills.

**Skills:**
• Each Pal can equip up to 4 skills
• Skills unlock as your Pal levels up
• Use \`skills\` command to manage your Pal's skill tree
• Skills have various effects: damage, healing, buffs, debuffs

**Equipment:**
• Equip items to boost your Pal's stats
• Use \`equip\` and \`unequip\` commands to manage gear`,
        color: config.colors.warning
    },
    
    breeding: {
        title: '💕 Breeding Guide',
        description: 'Create new Pals by breeding compatible parents.',
        content: `**What is Breeding?**
Breeding allows you to pair two of your Pals to produce eggs, which can hatch into new Pals.

**Requirements:**
• **Breeding Pen:** Must craft one first at the workshop
• **Two Pals:** Both must be level 5+ and in "Idle" status
• **Different Pals:** Cannot breed a Pal with itself

**How to Breed:**
• Use \`breed add [pet1_id] [pet2_id]\` to place Pals in the pen
• Or use \`breed\` for an interactive selection menu
• Wait for the breeding timer to complete (default ~4-8 hours)
• Use \`breed claim\` when ready to collect the egg

**Breeding Mechanics:**
• **Special Combinations:** Some specific Pal pairs create unique eggs
• **Type-Based:** Otherwise, eggs are based on parent types
• **Rarity Inheritance:** Egg rarity reflects parent rarities
• **Lab Bonuses:** Lab upgrades can reduce breeding time and give bonus eggs

**Egg Types:**
Different eggs hatch different types of Pals:
• Beast Egg → Beast-type Pals
• Elemental Egg → Elemental-type Pals
• Mystic Egg → Mystic-type Pals
• Mechanical Egg → Mechanical-type Pals
• And special eggs for unique combinations!

**Managing Breeding:**
• \`breed status\` - Check current breeding progress
• \`breed claim\` - Collect finished egg
• \`breed remove\` - Remove Pals before completion (no egg)

**Pro Tips:**
• Higher level parents don't directly affect offspring
• Special Pal combinations can create legendary Pals
• Breeding is a great way to get more Pals without dungeon grinding
• Lab equipment reduces breeding time significantly`,
        color: config.colors.info
    },
    
    incubation: {
        title: '🥚 Incubation Guide',
        description: 'Hatch eggs into powerful Pals.',
        content: `**What is Incubation?**
Incubation is the process of hatching eggs to obtain new Pals for your collection.

**Requirements:**
• **Alchemical Incubator:** Craft one at the workshop first
• **Eggs:** Obtained from breeding, dungeons, or events

**How to Incubate:**
• Use \`incubate [egg_name]\` to place a specific egg
• Or use \`incubate\` for an interactive selection menu
• Wait for the hatching timer to complete (varies by egg type)
• Use \`incubate claim\` when ready to hatch

**Incubator Slots:**
• **Main Slot:** Everyone starts with 1 base incubator slot
• **Lab Slots:** Unlock additional slots with lab equipment
• You can hatch multiple eggs simultaneously!

**Egg Rarity:**
Eggs come in various rarities affecting hatch chances:
• **Common Eggs:** More likely to hatch common Pals
• **Rare Eggs:** Better chance for uncommon/rare Pals
• **Epic Eggs:** High chance for epic Pals
• **Legendary Eggs:** May hatch legendary Pals
• **Special Eggs:** Specific Pal pools

**Hatching Mechanics:**
• Each egg has specific Pals it can hatch
• Rarity weights determine which Pal hatches
• Lab bonuses increase rare Pal chances
• Hatching grants player XP

**Managing Incubation:**
• \`incubate status\` - Check all incubator slots
• \`incubate claim [slot]\` - Hatch a specific slot (e.g., lab1, lab2)
• \`incubate claim\` - Claim any ready egg

**Pro Tips:**
• Lab equipment reduces hatch time considerably
• Save rare eggs for when you have lab bonuses active
• Keep your incubator running - don't waste time with empty slots
• Different egg types hatch different Pal types`,
        color: config.colors.info
    },
    
    brewing: {
        title: '⚗️ Brewing Guide',
        description: 'Brew powerful potions from gathered ingredients.',
        content: `**What is Brewing?**
Brewing transforms ingredients into useful potions that provide various benefits and bonuses.

**How to Brew:**
• Use the \`brew\` command to open the brewing interface
• Enter ingredients in format: \`quantity ingredient_name, quantity ingredient_name\`
• Example: \`2 moonpetal_herb, 1 crystal_shard\`
• For multiple batches: \`2 moonpetal_herb, 1 crystal_shard x3\`

**Brewing Mechanics:**
• **Recipe Matching:** Your ingredients must match a known recipe exactly
• **Success Rate:** Base 70% success rate (can be boosted by lab)
• **Recipe Discovery:** Learn recipes through the Grimoire
• **Failures:** Failed brews give Arcane Dust

**What Potions Do:**
• **Healing Potions:** Restore Pal HP
• **Stat Boosting:** Temporarily increase stats for battles/dungeons
• **Resistance Potions:** Add elemental resistances
• **Special Effects:** Unique abilities like life steal or multi-element damage
• **Lure Essences:** Increase wild Pal encounter rates

**Grimoire:**
• Contains all your known recipe
• Use \`grimoire\` to view learned recipes
• Discover new recipes through exploration and events

**Lab Bonuses:**
• **Success Rate:** Increase brewing success chance
• **Ingredient Save:** Recover ingredients from failed brews
• **Batch Brewing:** Brew multiple potions at once

**Pro Tips:**
• Always check your Grimoire before brewing
• Save rare ingredients for important potions
• Invest in lab upgrades for better success rates
• Failed brews still give Arcane Dust, which is valuable
• Match exact quantities - close doesn't count!`,
        color: config.colors.warning
    },
    
    crafting: {
        title: '🔨 Crafting Guide',
        description: 'Forge equipment and essential items.',
        content: `**What is Crafting?**
Crafting allows you to create equipment, tools, and structures using materials found in dungeons and biomes.

**How to Craft:**
• Use the \`craft\` command to open the workshop
• Enter materials in format: \`quantity material_name, quantity material_name\`
• Example: \`5 iron_ore, 3 crystal_shard\`

**What You Can Craft:**
• **Pal Equipment:** Weapons, armor, and accessories for your Pals
• **Tools:** Breeding Pen, Alchemical Incubator
• **Lab Equipment:** Upgrades for your laboratory
• **Utility Items:** Various helpful items

**Crafting Journal:**
• Tracks all crafting recipes you've discovered
• Some recipes are available from the start
• Discover advanced recipes through gameplay
• Use \`craftbook\` to view known recipes

**Crafting vs Brewing:**
• **Crafting:** Creates permanent items and equipment (100% success)
• **Brewing:** Creates consumable potions (70%+ success rate)
• **Different Recipes:** Grimoire for brewing, Craftbook for crafting

**Material Sources:**
• **Dungeons:** Best source for crafting materials
• **Foraging:** Some basic materials
• **Events:** Special materials from random events

**Pro Tips:**
• Craft the Breeding Pen and Incubator early
• Lab equipment gives permanent bonuses
• Pal equipment significantly boosts combat effectiveness
• Some materials are biome-specific`,
        color: config.colors.success
    },
    
    pals: {
        title: '🐾 Pals Guide', 
        description: 'Everything about your companions.',
        content: `**What are Pals?**
Pals are mystical creatures that fight alongside you in dungeons and battles. They can be tamed, trained, bred, and equipped.

**Getting Pals:**
• **Foraging:** Encounter and tame wild Pals while gathering
• **Hatching:** Incubate eggs from breeding or dungeons
• **Starting Pal:** Received when you begin your journey

**Pal Types:**
• **Beast:** Balanced stats, good for beginners
• **Elemental:** Strong magical attacks
• **Mystic:** High luck and special abilities
• **Mechanical:** High defense and unique skills
• **Undead:** Life-steal and dark abilities
• **Abyssal/Aeonic:** Rare, powerful types

**Pal Stats:**
• **HP:** Health - higher is tankier
• **ATK:** Damage output
• **DEF:** Damage reduction
• **SPD:** Turn order in combat
• **LUCK:** Critical hits and better drops

**Leveling Pals:**
• Gain XP from dungeons and battles
• Each level increases stats
• Unlock new skills at certain levels
• Use \`pet info [id]\` to view details

**Skills System:**
• Each Pal has a skill tree
• Earn skill points when leveling
• Spend points to unlock new skills
• Equip up to 4 skills for battle
• Use \`skills\` command to manage

**Equipment:**
• Equip weapons, armor, accessories
• Boosts stats significantly
• Use \`equip [pal_id] [item]\` to equip
• Use \`equipment [pal_id]\` to view equipped gear

**Pal Status:**
• **Idle:** Available for dungeons/breeding
• **Breeding:** Currently in breeding pen
• **Injured:** Recovering HP (1 per minute)

**Managing Pals:**
• \`pet info [id]\` - View detailed stats
• \`select pet [id]\` - Set active Pal for foraging
• \`dex\` - View all Pals you've encountered
• \`skills\` - Manage skill trees

**Pro Tips:**
• Keep a variety of types for different situations
• Skills make a huge difference in combat
• Equipment is as important as levels
• Breed high-rarity Pals for better offspring`,
        color: config.colors.info
    }
};

module.exports = {
    name: 'guide',
    description: 'Comprehensive guide to game mechanics and features.',
    aliases: ['guides', 'help-guide'],
    usage: '[topic]',
    
    async execute(message, args, client, prefix) {
        try {
            // If a specific topic is requested
            if (args.length > 0) {
                const requestedTopic = args[0].toLowerCase();
                const topic = GUIDE_TOPICS[requestedTopic];
                
                if (!topic) {
                    const availableTopics = Object.keys(GUIDE_TOPICS).map(t => `\`${t}\``).join(', ');
                    return message.reply({
                        embeds: [createCustomEmbed(
                            '❌ Topic Not Found',
                            `That guide topic doesn't exist.\n\n**Available Topics:**\n${availableTopics}\n\nUse \`${prefix}guide\` to see the interactive menu.`,
                            config.colors.error
                        )]
                    });
                }
                
                const embed = createCustomEmbed(topic.title, topic.content, topic.color)
                    .setFooter({ text: `Use ${prefix}guide to see all topics` });
                
                return message.reply({ embeds: [embed] });
            }
            
            // Show interactive menu
            const menuEmbed = createCustomEmbed(
                '📚 Arcane Alchemist Guide',
                `Welcome to the complete guide! Select a topic below to learn more about each game mechanic.\n\n` +
                `**Available Topics:**\n` +
                `🌿 **Foraging** - Gather ingredients from mystical biomes\n` +
                `⚔️ **Dungeons** - Battle through corrupted dungeons\n` +
                `⚔️ **Battles** - Combat mechanics and status effects\n` +
                `💕 **Breeding** - Create new Pals through breeding\n` +
                `🥚 **Incubation** - Hatch eggs into powerful Pals\n` +
                `⚗️ **Brewing** - Craft potions from ingredients\n` +
                `🔨 **Crafting** - Forge equipment and items\n` +
                `🐾 **Pals** - Everything about your companions\n\n` +
                `You can also use \`${prefix}guide [topic]\` to view a specific guide directly.`,
                config.colors.info
            ).setFooter({ text: 'Select a topic from the menu below' });
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('guide_menu_select')
                .setPlaceholder('Choose a guide topic...')
                .addOptions([
                    {
                        label: 'Foraging',
                        description: 'Learn about gathering ingredients',
                        value: 'foraging',
                        emoji: '🌿'
                    },
                    {
                        label: 'Dungeons',
                        description: 'Master dungeon exploration',
                        value: 'dungeons',
                        emoji: '⚔️'
                    },
                    {
                        label: 'Battles',
                        description: 'Understand combat mechanics',
                        value: 'battles',
                        emoji: '⚔️'
                    },
                    {
                        label: 'Breeding',
                        description: 'Breed Pals to create eggs',
                        value: 'breeding',
                        emoji: '💕'
                    },
                    {
                        label: 'Incubation',
                        description: 'Hatch eggs into Pals',
                        value: 'incubation',
                        emoji: '🥚'
                    },
                    {
                        label: 'Brewing',
                        description: 'Brew powerful potions',
                        value: 'brewing',
                        emoji: '⚗️'
                    },
                    {
                        label: 'Crafting',
                        description: 'Craft equipment and items',
                        value: 'crafting',
                        emoji: '🔨'
                    },
                    {
                        label: 'Pals',
                        description: 'All about your companions',
                        value: 'pals',
                        emoji: '🐾'
                    },
                    {
                        label: 'Main Menu',
                        description: 'Return to guide menu',
                        value: 'home',
                        emoji: '🏠'
                    }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            const reply = await message.reply({ 
                embeds: [menuEmbed], 
                components: [row] 
            });
            
            // Create collector for menu interactions
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 5 * 60 * 1000 // 5 minutes
            });
            
            collector.on('collect', async i => {
                const selection = i.values[0];
                
                if (selection === 'home') {
                    await i.update({ 
                        embeds: [menuEmbed],
                        components: [row]
                    });
                    return;
                }
                
                const topic = GUIDE_TOPICS[selection];
                if (!topic) {
                    await i.update({ 
                        embeds: [menuEmbed],
                        components: [row]
                    });
                    return;
                }
                
                const topicEmbed = createCustomEmbed(topic.title, topic.content, topic.color)
                    .setFooter({ text: 'Use the menu to view other topics or return to main menu' });
                
                await i.update({ 
                    embeds: [topicEmbed],
                    components: [row]
                });
            });
            
            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    selectMenu.setDisabled(true)
                );
                reply.edit({ components: [disabledRow] }).catch(() => {});
            });
            
        } catch (error) {
            console.error('Guide command error:', error);
            message.reply({
                embeds: [createCustomEmbed(
                    '❌ Error',
                    'There was a problem loading the guide. Please try again.',
                    config.colors.error
                )]
            });
        }
    }
};
