/**
 * Tutorial step definitions for the Arcane Alchemist onboarding.
 * 
 * Each step follows a narrative structure:
 *   - A mentor character ("Eldric, the Grand Alchemist") guides the player
 *   - Each step teaches a core mechanic
 *   - Players can progress with "Next" or skip the entire tutorial
 * 
 * tutorialStep values:
 *   0  = Not started (just created account)
 *   1  = Welcome / Profile overview
 *   2  = Foraging basics
 *   3  = Inventory & Items
 *   4  = Brewing & Crafting
 *   5  = Pals & Companions
 *   6  = Dungeons & Combat
 *   7  = Advanced tips & Wrapping up
 *  -1  = Completed or Skipped
 */

const MENTOR_NAME = 'Eldric, the Grand Alchemist';
const MENTOR_ICON = '🧙‍♂️';
const TUTORIAL_COLOR = '#9B59B6'; // Rich purple — mystic/alchemist vibe

const steps = {
    1: {
        title: `${MENTOR_ICON} Welcome, Young Alchemist!`,
        description:
            `*A weathered figure in flowing robes approaches you, eyes gleaming with ancient wisdom...*\n\n` +
            `"Ah, a new apprentice! I am **${MENTOR_NAME}**, and I will guide you through the foundations of alchemy.\n\n` +
            `Let's begin with the basics. Every alchemist has a **Profile** — it shows your level, gold, stamina, and achievements."\n\n` +
            `📋 **Try it:** Use the \`{prefix}profile\` command to view your stats!\n\n` +
            `> **Gold** 💰 — Your currency for buying items from the shop.\n` +
            `> **Stamina** ⚡ — Spent when foraging. It regenerates over time.\n` +
            `> **Level** 📊 — Increases from gaining XP through activities.`,
        fields: [
            { name: '💡 Tip', value: 'Your stamina regenerates automatically! Higher levels unlock new biomes and dungeons.', inline: false }
        ],
        footer: 'Step 1 of 7 • Profile & Stats'
    },

    2: {
        title: `${MENTOR_ICON} The Art of Foraging`,
        description:
            `"Excellent! Now, every great potion begins with raw ingredients. The world is rich with magical flora — you just need to know where to look.\n\n` +
            `**Foraging** is your primary way to gather ingredients. Different **biomes** contain different materials."\n\n` +
            `📋 **Try it:** Use \`{prefix}forage\` to gather ingredients from the Whispering Forest!\n\n` +
            `> 🌲 **Biomes** — Each has unique loot tables and Pal encounters.\n` +
            `> 🐾 **Wild Pals** — You might stumble upon a wild creature while foraging!\n` +
            `> ⚡ **Stamina** — Each forage trip costs stamina, so plan wisely.`,
        fields: [
            { name: '🗺️ Starter Biome', value: 'The **Whispering Forest** is available at Level 1. New biomes unlock as you level up!', inline: false },
            { name: '💡 Tip', value: 'Bring a Pal with you using `{prefix}select pet <id>` for bonus luck and better loot!', inline: false }
        ],
        footer: 'Step 2 of 7 • Foraging'
    },

    3: {
        title: `${MENTOR_ICON} Your Alchemist's Satchel`,
        description:
            `"After foraging, your gathered materials are stored in your **Inventory**. Think of it as your alchemist's satchel — every herb, crystal, and hide has a purpose."\n\n` +
            `📋 **Try it:** Use \`{prefix}inventory\` to see what you've collected!\n\n` +
            `> 🌿 **Ingredients** — Used for brewing potions.\n` +
            `> ⚒️ **Materials** — Used for crafting equipment.\n` +
            `> 🧪 **Potions** — Consumable items that give buffs.\n` +
            `> 🗡️ **Equipment** — Gear up your Pals for combat!`,
        fields: [
            { name: '🔍 Item Info', value: 'Use `{prefix}iteminfo <item name>` to learn about any specific item — its rarity, uses, and where to find it.', inline: false },
            { name: '💡 Tip', value: 'Keep your inventory diverse! You\'ll need various materials for both brewing and crafting.', inline: false }
        ],
        footer: 'Step 3 of 7 • Inventory & Items'
    },

    4: {
        title: `${MENTOR_ICON} Brewing & Crafting`,
        description:
            `"Now we arrive at the heart of alchemy — **Brewing** and **Crafting**. These are what set us apart from mere adventurers!"\n\n` +
            `🧪 **Brewing** — Combine ingredients to create powerful potions.\n` +
            `> Use \`{prefix}brew\` to see available recipes and start brewing.\n` +
            `> Your **Grimoire** (\`{prefix}grimoire\`) holds all your discovered potion recipes.\n\n` +
            `⚒️ **Crafting** — Forge equipment and tools from gathered materials.\n` +
            `> Use \`{prefix}craft\` to see what you can create.\n` +
            `> Your **Craft Book** (\`{prefix}craftbook\`) tracks known crafting recipes.\n\n` +
            `*"Brewing has a chance to fail, but crafting always succeeds. Choose wisely!"*`,
        fields: [
            { name: '🏪 The Shop', value: 'Need materials? Visit the `{prefix}shop` to buy items with gold!', inline: false },
            { name: '💡 Tip', value: 'Craft an **Alchemical Incubator** early — you\'ll need it to hatch eggs into new Pals!', inline: false }
        ],
        footer: 'Step 4 of 7 • Brewing & Crafting'
    },

    5: {
        title: `${MENTOR_ICON} Pals — Your Loyal Companions`,
        description:
            `"An alchemist is only as strong as their companions! Your **Pals** are magical creatures that fight alongside you, assist in foraging, and can even be bred."\n\n` +
            `📋 **Try it:** Use \`{prefix}pet\` to view your current Pals!\n\n` +
            `> 🐾 **Managing Pals** — Use \`{prefix}pet <id>\` to see a Pal's details.\n` +
            `> ⚔️ **Equipment** — Equip gear with \`{prefix}equip <pal_id> <item>\` to boost stats.\n` +
            `> 🎯 **Skills** — Unlock powerful abilities via \`{prefix}skills <pal_id>\`.\n` +
            `> 🥚 **Breeding** — Combine two Pals with \`{prefix}breed\` to create eggs!\n` +
            `> 🥚 **Incubation** — Hatch eggs with \`{prefix}incubate\`.`,
        fields: [
            { name: '⭐ Pal Types', value: 'Beast 🐺 | Elemental 🔥 | Mystic ✨ | Undead 💀 | Mechanical ⚙️ | Aeonic 🌀 | Abyssal 🌑', inline: false },
            { name: '💡 Tip', value: 'Select an active Pal with `{prefix}select pet <id>` — they\'ll accompany you on foraging trips and provide bonuses!', inline: false }
        ],
        footer: 'Step 5 of 7 • Pals & Companions'
    },

    6: {
        title: `${MENTOR_ICON} Dungeons & Battle`,
        description:
            `"The world is not all peaceful meadows, apprentice. Dark **Dungeons** await those brave enough to enter. Send your Pals to conquer them for powerful rewards!"\n\n` +
            `⚔️ **Dungeons** — Multi-floor combat challenges.\n` +
            `> Use \`{prefix}dungeon\` to enter a dungeon with your Pals.\n` +
            `> Each floor has enemies to fight — defeat them all to clear it!\n\n` +
            `🏟️ **Arena Battles** — Test your Pals against other players.\n` +
            `> Use \`{prefix}battle @player\` for 1v1 Pal battles.\n` +
            `> Use \`{prefix}partybattle @player\` for full team battles!\n\n` +
            `🗺️ **Expeditions** — Send Pals on timed expeditions for passive rewards.\n` +
            `> Use \`{prefix}expedition\` to send a Pal out.`,
        fields: [
            { name: '⚡ Combat Tips', value: '• Type advantages matter!\n• Equip your Pals before dungeon runs.\n• Use combat potions for tough fights.', inline: false },
            { name: '💡 Tip', value: 'Start with lower-tier dungeons. The rewards scale with difficulty — don\'t rush into danger unprepared!', inline: false }
        ],
        footer: 'Step 6 of 7 • Dungeons & Combat'
    },

    7: {
        title: `${MENTOR_ICON} Your Journey Begins!`,
        description:
            `"You have learned the foundations, young alchemist. But the path ahead holds much more — **quests**, **achievements**, **the Laboratory**, and secrets yet to be discovered..."\n\n` +
            `📖 **Useful Commands:**\n` +
            `> \`{prefix}quest\` — Accept and complete daily/weekly quests for rewards.\n` +
            `> \`{prefix}lab\` — Upgrade your Laboratory for powerful bonuses.\n` +
            `> \`{prefix}achievements\` — Track your milestones.\n` +
            `> \`{prefix}guide\` — In-depth guides on all game mechanics.\n` +
            `> \`{prefix}help\` — Full list of all commands.\n` +
            `> \`{prefix}vote\` — Vote for the bot to earn crates & rewards!\n\n` +
            `*"Remember — the greatest alchemists didn't master everything in a day. Take your time, experiment, and most importantly... enjoy the journey."*\n\n` +
            `🎉 **Tutorial Complete!** You're ready to explore the world of Arcane Alchemist!`,
        fields: [
            { name: '🎁 Tutorial Reward', value: 'You\'ve earned a bonus of **50 Gold** and **25 Stamina** for completing the tutorial!', inline: false },
            { name: '📢 Join the Community', value: 'Use `{prefix}vote` to support the bot and earn awesome rewards!', inline: false }
        ],
        footer: 'Step 7 of 7 • Tutorial Complete!'
    }
};

const TOTAL_STEPS = Object.keys(steps).length;

// Reward for completing the full tutorial
const COMPLETION_REWARDS = {
    gold: 50,
    stamina: 25
};

module.exports = {
    MENTOR_NAME,
    MENTOR_ICON,
    TUTORIAL_COLOR,
    steps,
    TOTAL_STEPS,
    COMPLETION_REWARDS
};
