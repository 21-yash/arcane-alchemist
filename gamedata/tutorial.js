/**
 * Interactive Tutorial — Step Definitions
 * 
 * Each step is a guided task that requires the player to use an actual command.
 * The tutorial intercepts command execution and provides narrative context.
 * 
 * tutorialStep values:
 *   0    = Not started (just created account)
 *   1-10 = Active step number
 *  -1    = Completed or Skipped
 */

const MENTOR_NAME = 'Eldric, the Grand Alchemist';
const MENTOR_ICON = '🧙‍♂️';
const TUTORIAL_COLOR = 0x9B59B6;

// Guaranteed loot for the first tutorial forage
const TUTORIAL_FORAGE_LOOT = [
    { itemId: 'moonpetal_herb', quantity: 2 },
    { itemId: 'crystal_shard', quantity: 1 },
];

// The recipe granted during tutorial research
const TUTORIAL_RECIPE_ID = 'recipe_minor_healing';

const COMPLETION_REWARDS = {
    gold: 150,
    stamina: 50,
    xp: 150
};

/**
 * Tutorial steps definition
 * 
 * expectedCommands: array of command names that trigger step completion (via messageCreate)
 * waitForEvent: if set, listen for this client event instead of messageCreate
 * text: V2 markdown content shown to the player
 * hint: short hint shown as a footer
 */
const steps = {
    1: {
        id: 'welcome',
        text: (prefix) =>
            `# ${MENTOR_ICON} Welcome, Apprentice!\n` +
            `-# Eldric, the Grand Alchemist approaches you...\n\n` +
            `*"Ah, a new apprentice! I'll guide you through the basics — but we learn by **doing**, not reading!"*\n\n` +
            `### 📋 Task: Select Your Companion\n` +
            `> Your Pal fights alongside you, helps you forage, and grows stronger with you.\n` +
            `> Use \`${prefix}select pet 1\` to set your starter as your active Pal.\n\n` +
            `-# 💡 Your starter Pal was already assigned when you used ${prefix}start`,
        expectedCommands: ['select'],
        hint: `Use select pet <id> to pick your active companion`,
    },

    2: {
        id: 'forage',
        text: (prefix) =>
            `# 🌿 Gathering Ingredients\n` +
            `-# Step 2 of 10\n\n` +
            `*"Every great potion begins with raw ingredients. The Whispering Forest is a great place to start."*\n\n` +
            `### 📋 Task: Forage for Ingredients\n` +
            `> Use \`${prefix}forage\` to gather ingredients from the wild.\n` +
            `> Each forage costs **Stamina** ⚡ — it regenerates over time.\n\n` +
            `-# 💡 Different biomes drop different materials. More unlock as you level up!`,
        expectedCommands: ['forage', 'gather'],
        hint: `Type forage to gather your first ingredients`,
    },

    3: {
        id: 'inventory',
        text: (prefix) =>
            `# 🎒 Your Alchemist's Satchel\n` +
            `-# Step 3 of 10\n\n` +
            `*"Excellent gathering! Now let's see what you've collected."*\n\n` +
            `### 📋 Task: Check Your Inventory\n` +
            `> Use \`${prefix}inventory\` to see all your gathered materials.\n` +
            `> You'll see **ingredients** 🌿, **materials** ⚒️, **potions** 🧪, and **equipment** 🗡️\n\n` +
            `-# 💡 Use ${prefix}iteminfo <name> to learn about any item`,
        expectedCommands: ['inventory', 'inv'],
        hint: `Type inventory to check your satchel`,
    },

    4: {
        id: 'research',
        text: (prefix) =>
            `# 🔬 Discovering Recipes\n` +
            `-# Step 4 of 10\n\n` +
            `*"Before you can brew, you must know the recipe! Let me teach you how to research new recipes."*\n\n` +
            `### 📋 Task: Research a Recipe\n` +
            `> Use \`${prefix}research\` to discover your first recipe.\n` +
            `> Normally, research takes time and resources — but I'll speed this one up for you!\n\n` +
            `-# 💡 Research is how you unlock new potions and crafting recipes`,
        expectedCommands: ['research', 'discover'],
        hint: `Type research to discover your first recipe`,
    },

    5: {
        id: 'brew',
        text: (prefix) =>
            `# ⚗️ Your First Potion\n` +
            `-# Step 5 of 10\n\n` +
            `*"Now that you know the recipe for a **Minor Healing Potion**, let's put those ingredients to use!"*\n\n` +
            `### 📋 Task: Brew a Minor Healing Potion\n` +
            `> 1. Use \`${prefix}brew\` to open the cauldron\n` +
            `> 2. Type: \`2 moonpetal_herb, 1 crystal_shard\`\n` +
            `> 3. Hit the **Brew** button when the recipe matches!\n\n` +
            `> 📜 **Recipe:** 2x Moonpetal Herb + 1x Crystal Shard → Minor Healing Potion\n\n` +
            `-# 💡 This step completes when your potion is brewed successfully`,
        waitForEvent: 'potionBrewed',
        expectedCommands: [],
        hint: `Open the cauldron, add ingredients, and click Brew`,
    },

    6: {
        id: 'pet',
        text: (prefix) =>
            `# 🐾 Know Your Companion\n` +
            `-# Step 6 of 10\n\n` +
            `*"Your Pal is more than a pet — they're your partner in alchemy and combat!"*\n\n` +
            `### 📋 Task: View Your Pal's Details\n` +
            `> Use \`${prefix}pet info 1\` to see your Pal's stats, abilities, and equipment.\n` +
            `> Pals gain **XP** from dungeons and level up just like you!\n\n` +
            `> ⚔️ **Equip** gear with \`${prefix}equip <pal_id> <item>\`\n` +
            `> 🎯 **Skills** — unlock abilities with \`${prefix}skills <pal_id>\`\n\n` +
            `-# 💡 Higher rarity Pals have stronger base stats and unique abilities`,
        expectedCommands: ['pet'],
        hint: `Type pet info 1 to see your first Pal's details`,
    },

    7: {
        id: 'select_dungeon',
        text: (prefix) =>
            `# 🏰 Choosing Your Challenge\n` +
            `-# Step 7 of 10\n\n` +
            `*"Before storming a dungeon, you must choose which one to enter!"*\n\n` +
            `### 📋 Task: Select a Dungeon\n` +
            `> Use \`${prefix}select dungeon\` to pick from available dungeons.\n` +
            `> Dungeons have different tiers, enemies, and rewards.\n\n` +
            `> 📊 Pick one that matches your level!\n\n` +
            `-# 💡 You can change your selected dungeon anytime with ${prefix}select dungeon`,
        waitForEvent: 'dungeonSelected',
        expectedCommands: [],
        hint: `Type select dungeon to pick a dungeon`,
    },

    8: {
        id: 'dungeon',
        text: (prefix) =>
            `# ⚔️ Into the Dungeon\n` +
            `-# Step 8 of 10\n\n` +
            `*"Time for your first real challenge! Dungeons are how your Pal grows stronger."*\n\n` +
            `### 📋 Task: Enter a Dungeon\n` +
            `> Use \`${prefix}dungeon\` to enter the dungeon with your active Pal.\n` +
            `> Fight through floors • Earn loot & XP • Your Pal levels up!\n\n` +
            `> 🏃 You can **flee** from a floor if things get too tough\n` +
            `> 💀 If your Pal faints, use a healing potion with \`${prefix}use\`\n\n` +
            `-# 💡 Equip your Pal and use potions before tough fights`,
        waitForEvent: 'dungeonAttempt',    
        expectedCommands: [],
        hint: `Type dungeon to enter your first challenge`,
    },

    9: {
        id: 'profile',
        text: (prefix) =>
            `# 📊 Your Progress\n` +
            `-# Step 9 of 10\n\n` +
            `*"Let's see how far you've come, apprentice!"*\n\n` +
            `### 📋 Task: Check Your Profile\n` +
            `> Use \`${prefix}profile\` to see your level, gold, stats, and achievements.\n` +
            `> Everything you do earns **XP** — forage, brew, craft, dungeon!\n\n` +
            `-# 💡 Use ${prefix}quest to accept daily/weekly quests for bonus rewards`,
        expectedCommands: ['profile'],
        hint: `Type profile to see your progress`,
    },

    10: {
        id: 'complete',
        text: (prefix) =>
            `# 🎉 Tutorial Complete!\n\n` +
            `*"Well done, apprentice! You've learned the fundamentals of alchemy. But the journey has only just begun..."*\n\n` +
            `### 🎁 Rewards Earned\n` +
            `> 💰 **+${COMPLETION_REWARDS.gold} Gold**\n` +
            `> ⚡ **+${COMPLETION_REWARDS.stamina} Stamina**\n` +
            `> 📊 **+${COMPLETION_REWARDS.xp} XP**\n\n` +
            `### 🗺️ What's Next?\n` +
            `> 🔬 \`${prefix}research\` — Discover new recipes in your lab\n` +
            `> ⚒️ \`${prefix}craft\` — Forge equipment for your Pals\n` +
            `> 📋 \`${prefix}quest\` — Accept quests for daily rewards\n` +
            `> 🏠 \`${prefix}lab\` — Upgrade your laboratory\n` +
            `> 🥚 \`${prefix}breed\` — Breed Pals to create eggs\n` +
            `> ❓ \`${prefix}help\` — Full command list\n\n` +
            `-# Go forth and make your mark upon this world, alchemist! ✨`,
        expectedCommands: [],
        hint: `Click Finish to claim your rewards!`,
        isLast: true
    }
};

const TOTAL_STEPS = Object.keys(steps).length;

module.exports = {
    MENTOR_NAME,
    MENTOR_ICON,
    TUTORIAL_COLOR,
    TUTORIAL_FORAGE_LOOT,
    TUTORIAL_RECIPE_ID,
    COMPLETION_REWARDS,
    steps,
    TOTAL_STEPS,
};
