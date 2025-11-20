const gameCache = require('./gameCache');

/**
 * Helper functions to access game data from cache
 */
const GameData = {
    // Direct access to cached data
    get items() {
        if (!gameCache.has("items")) {
            throw new Error("Items data not loaded");
        }
        return gameCache.get("items");
    },
    get pets() {
        if (!gameCache.has('pets')) {
            throw new Error('Pets data not loaded');
        }
        return gameCache.get("pets");
    },
    get biomes() {
        if (!gameCache.has('biomes')) {
            throw new Error('Biomes data not loaded');
        }
        return gameCache.get("biomes");
    },
    get dungeons() {
        if (!gameCache.has('dungeons')) {
            throw new Error('Dungeons data not loaded');
        }
        return gameCache.get("dungeons");
    },
    get recipes() {
        if (!gameCache.has('recipes')) {
            throw new Error('Recipes data not loaded');
        }
        return gameCache.get("recipes");
    },
    get monsters() {
        if (!gameCache.has('monsters')) {
            throw new Error('Monsters data not loaded');
        }
        return gameCache.get("monsters");
    },
    get skillTrees() {
        if (!gameCache.has('skillTrees')) {
            throw new Error('skillTrees data not loaded');
        }
        return gameCache.get("skillTrees");
    },
    get achievement() {
        if (!gameCache.has('achievement')) {
            throw new Error('Achievement data not loaded');
        }
        return gameCache.get("achievement");
    },
    get labUpgrades() {
        if (!gameCache.has('labUpgrades')) {
            throw new Error('LabUpgrades data not loaded');
        }
        return gameCache.get("labUpgrades");
    },
    get quests() {
        if (!gameCache.has('quests')) {
            throw new Error('Quests data not loaded');
        }
        return gameCache.get("quests");
    },

    // Helper functions for common operations
    getItem(itemId) {
        const items = this.items;
        return items[itemId] || null;
    },

    getPet(petId) {
        const pets = this.pets;
        return pets[petId] || null;
    },

    getBiome(biomeId) {
        const biomes = this.biomes;
        return biomes[biomeId] || null;
    },

    getDungeon(dungeonId) {
        const dungeons = this.dungeons;
        return dungeons[dungeonId] || null;
    },

    getRecipe(recipeId) {
        const recipes = this.recipes;
        return recipes[recipeId] || null;
    },

    getMonster(monsterId) {
        const monsters = this.monsters;
        return monsters[monsterId] || null;
    },

    getSkillTree(type) {
        const skillTrees = this.skillTrees;
        return skillTrees[type] || null;
    },

    getAchievement(achievementId) {
        const achievements = this.achievement;
        return achievements.find((a) => a.id === achievementId) || null;
    },

    getQuest(questId) {
        const quests = this.quests;
        return quests[questId] || null;
    },

    // Search functions
    searchItems(query) {
        const items = this.items;
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const [id, item] of Object.entries(items)) {
            if (
                item.name.toLowerCase().includes(lowerQuery) ||
                id.toLowerCase().includes(lowerQuery)
            ) {
                results.push({ id, ...item });
            }
        }
        return results;
    },

    searchPets(query) {
        const pets = this.pets;
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const [id, pet] of Object.entries(pets)) {
            if (
                pet.name.toLowerCase().includes(lowerQuery) ||
                id.toLowerCase().includes(lowerQuery)
            ) {
                results.push({ id, ...pet });
            }
        }
        return results;
    },
};

module.exports = GameData;