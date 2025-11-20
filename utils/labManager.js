const Laboratory = require('../models/Lab');
const GameData = require('./gameData');

const DEFAULT_BATCH_LIMIT = 1;

class LabManager {
    static async getOrCreateLab(userId) {
        let lab = await Laboratory.findOne({ userId });
        if (!lab) {
            lab = new Laboratory({ userId });
        }
        if (!lab.upgrades) lab.upgrades = [];
        if (!lab.autoBrewer) {
            lab.autoBrewer = {
                recipeId: null,
                storage: [],
                lastTick: null
            };
        }
        if (!lab.appliedBonuses) {
            lab.appliedBonuses = { stamina: 0 };
        }
        return lab;
    }

    static getUpgradeLevel(lab, upgradeId) {
        const upgrade = lab.upgrades.find((entry) => entry.upgradeId === upgradeId);
        return upgrade ? upgrade.level : 0;
    }

    static setUpgradeLevel(lab, upgradeId, level) {
        let upgrade = lab.upgrades.find((entry) => entry.upgradeId === upgradeId);
        if (!upgrade) {
            upgrade = { upgradeId, level };
            lab.upgrades.push(upgrade);
        } else {
            upgrade.level = level;
        }
        lab.level = this.calculateLabLevel(lab);
    }

    static calculateLabLevel(lab) {
        if (!lab.upgrades || !lab.upgrades.length) return 1;
        return lab.upgrades.reduce((sum, upgrade) => sum + (upgrade.level || 0), 0);
    }

    static calculateEffects(lab) {
        const effects = {
            brewingSuccessBonus: 0,
            ingredientSaveChance: 0,
            maxBatch: DEFAULT_BATCH_LIMIT,
            autoBrewer: null,
            hatchTimeReduction: 0,
            additionalHatchingSlots: 0,
            rarePetChanceBonus: 0,
            breedingExtraEggChance: 0,
            breedingTimeReduction: 0,
            breedingSuccessBonus: 0,
            researchGeneration: null,
            healingSpeedMultiplier: 1,
            playerXpBonus: 0,
            forageYieldBonus: 0,
            rareItemChanceBonus: 0,
            forageCooldownReduction: 0,
            maxStaminaBonus: 0,
            staminaRegenMultiplier: 1,
            expeditionTimeReduction: 0,
            expeditionSuccessBonus: 0,
            expeditionRewardMultiplier: 1,
            expeditionInjuryReduction: 0,
            expeditionLostReduction: 0,
            palXpBonus: 0,
            goldEarnedBonus: 0,
            shopSellBonus: 0,
            shopDiscount: 0,
            recipeDiscoveryChance: 0,
            globalCooldownReduction: 0,
            arcaneDustGeneration: null,
            advancedRecipesUnlocked: false,
            prestigeDisplay: false
        };

        const labData = GameData.labUpgrades || {};
        if (!lab.upgrades) return effects;

        for (const entry of lab.upgrades) {
            const upgradeInfo = labData[entry.upgradeId];
            if (!upgradeInfo) continue;

            const levelIndex = Math.min(entry.level, upgradeInfo.maxLevel) - 1;
            const levelEffect = upgradeInfo.effects[levelIndex];
            if (!levelEffect) continue;

            switch (entry.upgradeId) {
                case 'precision_mixer':
                    effects.brewingSuccessBonus = levelEffect.successRateBonus || 0;
                    break;
                case 'ingredient_preserver':
                    effects.ingredientSaveChance = levelEffect.ingredientSaveChance || 0;
                    break;
                case 'batch_brewer':
                    effects.maxBatch = levelEffect.batchBrewing?.maxBatch || effects.maxBatch;
                    break;
                case 'auto_brewer':
                    effects.autoBrewer = levelEffect.autoBrew;
                    break;
                case 'temperature_control':
                    effects.hatchTimeReduction = levelEffect.hatchTimeReduction || 0;
                    break;
                case 'dual_incubator':
                    effects.additionalHatchingSlots = levelEffect.additionalHatchingSlot || 0;
                    break;
                case 'hatching_booster':
                    effects.rarePetChanceBonus = levelEffect.rarePetChanceBonus || 0;
                    break;
                case 'fertility_enhancer':
                    effects.breedingExtraEggChance = levelEffect.breedingSuccessBonus || 0;
                    break;
                case 'breeding_accelerator':
                    effects.breedingTimeReduction = levelEffect.breedingTimeReduction || 0;
                    break;
                case 'research_station':
                    effects.researchGeneration = levelEffect.researchGeneration;
                    break;
                case 'rest_area':
                    effects.healingSpeedMultiplier = levelEffect.healingSpeedMultiplier || effects.healingSpeedMultiplier;
                    break;
                case 'trophy_case':
                    effects.playerXpBonus = levelEffect.xpBonus || effects.playerXpBonus;
                    effects.prestigeDisplay = levelEffect.prestigeDisplay || false;
                    break;
                case 'foraging_boost':
                    effects.forageYieldBonus = levelEffect.forageYieldBonus || 0;
                    break;
                case 'rare_finder':
                    effects.rareItemChanceBonus = levelEffect.rareItemChanceBonus || 0;
                    break;
                case 'foraging_cooldown_reducer':
                    effects.forageCooldownReduction = levelEffect.forageCooldownReduction || 0;
                    break;
                case 'stamina_well':
                    effects.maxStaminaBonus = levelEffect.maxStaminaBonus || 0;
                    break;
                case 'stamina_regenerator':
                    effects.staminaRegenMultiplier = levelEffect.staminaRegenMultiplier || 1;
                    break;
                case 'expedition_planner':
                    effects.expeditionTimeReduction = levelEffect.expeditionTimeReduction || 0;
                    effects.expeditionSuccessBonus = levelEffect.successRateBonus || effects.expeditionSuccessBonus;
                    break;
                case 'expedition_rewards_boost':
                    effects.expeditionRewardMultiplier = levelEffect.expeditionRewardMultiplier || effects.expeditionRewardMultiplier;
                    break;
                case 'expedition_safety_net':
                    effects.expeditionInjuryReduction = levelEffect.injuryChanceReduction || 0;
                    effects.expeditionLostReduction = levelEffect.lostChanceReduction || 0;
                    break;
                case 'combat_training_ground':
                    effects.palXpBonus = levelEffect.battleXpBonus || 0;
                    break;
                case 'gold_magnet':
                    effects.goldEarnedBonus = levelEffect.goldEarnedBonus || 0;
                    break;
                case 'merchant_connection':
                    effects.shopSellBonus = levelEffect.sellPriceBonus || 0;
                    effects.shopDiscount = levelEffect.sellPriceBonus || 0;
                    break;
                case 'recipe_scanner':
                    effects.recipeDiscoveryChance = levelEffect.recipeDiscoveryChance || 0;
                    break;
                case 'quick_access_panel':
                    effects.globalCooldownReduction = levelEffect.globalCooldownReduction || 0;
                    break;
                case 'arcane_reactor':
                    effects.arcaneDustGeneration = levelEffect.arcaneDustGeneration;
                    break;
                case 'master_alchemist_table':
                    effects.advancedRecipesUnlocked = !!levelEffect.advancedRecipesUnlocked;
                    break;
                default:
                    break;
            }
        }

        return effects;
    }

    static async getLabData(userId) {
        const lab = await this.getOrCreateLab(userId);
        const effects = this.calculateEffects(lab);
        return { lab, effects };
    }

    static async loadPlayerLab(player) {
        const { lab, effects } = await this.getLabData(player.userId);
        await this.syncLabSystems(player, lab, effects);
        player._labContext = { lab, effects };
        return player._labContext;
    }

    static getPlayerLabEffects(player) {
        return player?._labContext?.effects || null;
    }

    static async syncLabSystems(player, lab, effects) {
        const now = new Date();
        let labChanged = false;
        let playerChanged = false;

        if (this.processResearchGeneration(lab, effects, now)) {
            labChanged = true;
        }
        if (this.processArcaneReactor(lab, effects, now)) {
            labChanged = true;
        }
        const autoResult = await this.processAutoBrewer(player, lab, effects, now);
        labChanged = labChanged || autoResult.labChanged;
        playerChanged = playerChanged || autoResult.playerChanged;

        if (this.applyPersistentBonuses(player, lab, effects)) {
            labChanged = true;
            playerChanged = true;
        }

        if (labChanged) {
            await lab.save();
        }
        if (playerChanged) {
            await player.save();
        }

        return { lab, effects };
    }

    static processResearchGeneration(lab, effects, now) {
        if (!effects.researchGeneration) return false;
        const { points, interval } = effects.researchGeneration;
        if (!points || !interval) return false;

        if (!lab.lastResearchTick) {
            lab.lastResearchTick = now;
            return true;
        }

        const lastTick = lab.lastResearchTick;
        const elapsedMinutes = (now - lastTick) / 60000;
        if (elapsedMinutes < interval) return false;

        const ticks = Math.floor(elapsedMinutes / interval);
        if (ticks <= 0) return false;

        lab.researchPoints += points * ticks;
        lab.lastResearchTick = new Date(lastTick.getTime() + ticks * interval * 60000);
        return true;
    }

    static processArcaneReactor(lab, effects, now) {
        if (!effects.arcaneDustGeneration) return false;
        const { amount, interval } = effects.arcaneDustGeneration;
        if (!amount || !interval) return false;

        if (!lab.lastArcaneDustTick) {
            lab.lastArcaneDustTick = now;
            return true;
        }

        const lastTick = lab.lastArcaneDustTick;
        const elapsedMinutes = (now - lastTick) / 60000;
        if (elapsedMinutes < interval) return false;

        const ticks = Math.floor(elapsedMinutes / interval);
        if (ticks <= 0) return false;

        lab.arcaneDustStored += amount * ticks;
        lab.lastArcaneDustTick = new Date(lastTick.getTime() + ticks * interval * 60000);
        return true;
    }

    static async processAutoBrewer(player, lab, effects, now) {
        const result = { labChanged: false, playerChanged: false };
        if (!effects.autoBrewer) return result;

        if (!lab.autoBrewer) {
            lab.autoBrewer = {
                recipeId: null,
                storage: [],
                lastTick: now
            };
            result.labChanged = true;
            return result;
        }

        if (!lab.autoBrewer.recipeId) {
            lab.autoBrewer.lastTick = now;
            result.labChanged = true;
            return result;
        }

        const recipe = GameData.getRecipe(lab.autoBrewer.recipeId);
        if (!recipe) {
            lab.autoBrewer.recipeId = null;
            lab.autoBrewer.storage = [];
            result.labChanged = true;
            return result;
        }

        const intervalMinutes = effects.autoBrewer.interval;
        const batchSize = effects.autoBrewer.capacity || 1;
        if (!intervalMinutes) return result;

        if (!lab.autoBrewer.lastTick) {
            lab.autoBrewer.lastTick = now;
            result.labChanged = true;
            return result;
        }

        const lastTick = lab.autoBrewer.lastTick;
        const elapsedMinutes = (now - lastTick) / 60000;
        const batches = Math.floor(elapsedMinutes / intervalMinutes);
        if (batches <= 0) return result;

        let batchesProcessed = 0;
        for (let i = 0; i < batches; i++) {
            const canBrew = recipe.ingredients.every((ingredient) => {
                const playerItem = player.inventory.find((inv) => inv.itemId === ingredient.itemId);
                return playerItem && playerItem.quantity >= ingredient.quantity * batchSize;
            });

            if (!canBrew) {
                break;
            }

            recipe.ingredients.forEach((ingredient) => {
                const playerItem = player.inventory.find((inv) => inv.itemId === ingredient.itemId);
                if (playerItem) {
                    playerItem.quantity -= ingredient.quantity * batchSize;
                }
            });

            player.inventory = player.inventory.filter((item) => item.quantity > 0);

            const producedAmount = recipe.result.quantity * batchSize;
            this._addToAutoBrewerStorage(lab, recipe.result.itemId, producedAmount);

            batchesProcessed++;
            result.labChanged = true;
            result.playerChanged = true;
        }

        if (batchesProcessed > 0) {
            lab.autoBrewer.lastTick = new Date(lastTick.getTime() + batchesProcessed * intervalMinutes * 60000);
        } else {
            lab.autoBrewer.lastTick = now;
        }

        if (result.playerChanged) {
            player.markModified?.('inventory');
        }

        return result;
    }

    static _addToAutoBrewerStorage(lab, itemId, quantity) {
        if (!lab.autoBrewer.storage) {
            lab.autoBrewer.storage = [];
        }
        const entry = lab.autoBrewer.storage.find((stored) => stored.itemId === itemId);
        if (entry) {
            entry.quantity += quantity;
        } else {
            lab.autoBrewer.storage.push({ itemId, quantity });
        }
        lab.markModified?.('autoBrewer.storage');
    }

    static collectAutoBrewedPotions(player, lab) {
        if (!lab.autoBrewer || !lab.autoBrewer.storage || !lab.autoBrewer.storage.length) {
            return 0;
        }

        let totalCollected = 0;
        for (const stored of lab.autoBrewer.storage) {
            const existing = player.inventory.find((item) => item.itemId === stored.itemId);
            if (existing) {
                existing.quantity += stored.quantity;
            } else {
                player.inventory.push({
                    itemId: stored.itemId,
                    quantity: stored.quantity
                });
            }
            totalCollected += stored.quantity;
        }

        lab.autoBrewer.storage = [];
        lab.markModified?.('autoBrewer.storage');
        player.markModified?.('inventory');
        return totalCollected;
    }

    static collectArcaneDust(player, lab) {
        const available = Math.floor(lab.arcaneDustStored || 0);
        if (!available) return 0;
        player.arcaneDust = (player.arcaneDust || 0) + available;
        lab.arcaneDustStored -= available;
        player.markModified?.('arcaneDust');
        return available;
    }

    static applyGoldBonus(amount, effects) {
        if (!effects || !effects.goldEarnedBonus) return amount;
        return Math.round(amount * (1 + effects.goldEarnedBonus));
    }

    static applyPlayerXpBonus(amount, effects) {
        if (!effects || !effects.playerXpBonus) return amount;
        return Math.round(amount * (1 + effects.playerXpBonus));
    }

    static applyPalXpBonus(amount, effects) {
        if (!effects || !effects.palXpBonus) return amount;
        return Math.round(amount * (1 + effects.palXpBonus));
    }

    static applyPersistentBonuses(player, lab, effects) {
        const applied = lab.appliedBonuses?.stamina || 0;
        const bonus = effects.maxStaminaBonus || 0;

        if (applied === bonus) {
            return false;
        }

        const difference = bonus - applied;
        player.maxStamina = Math.max(10, player.maxStamina + difference);
        player.stamina = Math.min(player.maxStamina, player.stamina + difference);

        lab.appliedBonuses.stamina = bonus;
        lab.markModified?.('appliedBonuses');
        return true;
    }

    static ensureLabHatchingSlots(player, effects) {
        const extraSlots = effects.additionalHatchingSlots || 0;
        if (!player.labHatchingSlots) {
            player.labHatchingSlots = [];
        }

        if (player.labHatchingSlots.length < extraSlots) {
            const slotsToAdd = extraSlots - player.labHatchingSlots.length;
            for (let i = 0; i < slotsToAdd; i++) {
                player.labHatchingSlots.push({ eggId: null, hatchesAt: null });
            }
            player.markModified?.('labHatchingSlots');
        } else if (player.labHatchingSlots.length > extraSlots) {
            player.labHatchingSlots = player.labHatchingSlots.slice(0, extraSlots);
            player.markModified?.('labHatchingSlots');
        }
    }

    static getMaxBrewBatch(effects) {
        return effects?.maxBatch || DEFAULT_BATCH_LIMIT;
    }

    static getExtraHatchingSlots(effects) {
        return effects?.additionalHatchingSlots || 0;
    }
}

module.exports = LabManager;

