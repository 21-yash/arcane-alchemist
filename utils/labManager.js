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
            successRateBonus: 0,
            ingredientSaveChance: 0,
            maxBatch: DEFAULT_BATCH_LIMIT,
            autoBrewer: null,
            hatchTimeReduction: 0,
            additionalHatchingSlot: 0,
            rarePetChanceBonus: 0,
            breedingExtraEggChance: 0,
            breedingTimeReduction: 0,
            expedition: { boardSlots: 2, maxTier: 'basic', timerReduction: 0, refreshHours: 24 },
            healingSpeedMultiplier: 1,
            playerXpBonus: 0,
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
            globalCooldownReduction: 0,
            arcaneDustGeneration: null,
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
                    effects.successRateBonus = levelEffect.successRateBonus || 0;
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
                    effects.additionalHatchingSlot = levelEffect.additionalHatchingSlot || 0;
                    break;
                case 'hatching_booster':
                    effects.rarePetChanceBonus = levelEffect.rarePetChanceBonus || 0;
                    break;
                case 'fertility_enhancer':
                    effects.breedingExtraEggChance = levelEffect.breedingExtraEggChance || 0;
                    break;
                case 'breeding_accelerator':
                    effects.breedingTimeReduction = levelEffect.breedingTimeReduction || 0;
                    break;
                case 'research_station':
                    if (levelEffect.expedition) {
                        effects.expedition = {
                            boardSlots: levelEffect.expedition.boardSlots || 2,
                            maxTier: levelEffect.expedition.maxTier || 'basic',
                            timerReduction: levelEffect.expedition.timerReduction || 0,
                            refreshHours: levelEffect.expedition.refreshHours || 24
                        };
                    }
                    break;
                case 'rest_area':
                    effects.healingSpeedMultiplier = levelEffect.healingSpeedMultiplier || effects.healingSpeedMultiplier;
                    break;
                case 'trophy_case':
                    effects.playerXpBonus = levelEffect.xpBonus || effects.playerXpBonus;
                    effects.prestigeDisplay = levelEffect.prestigeDisplay || false;
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
                    effects.expeditionSuccessBonus = levelEffect.expeditionSuccessBonus || effects.expeditionSuccessBonus;
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
                    break;
                case 'quick_access_panel':
                    effects.globalCooldownReduction = levelEffect.globalCooldownReduction || 0;
                    break;
                case 'arcane_reactor':
                    effects.arcaneDustGeneration = levelEffect.arcaneDustGeneration;
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

        // Research generation removed — replaced by expedition board
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

    // ── Expedition Board System ──────────────────────────────────

    static EXPEDITION_TIERS = {
        basic:    { label: 'Basic',    emoji: '🟢', rarityPool: ['Common', 'Uncommon'],   dustCost: 10,  goldCost: 500,   sacrifices: [{ rarity: 'Common', count: 5 }],                                  timerHours: 2,  xp: 15  },
        advanced: { label: 'Advanced', emoji: '🔵', rarityPool: ['Uncommon', 'Rare'],     dustCost: 25,  goldCost: 2000,  sacrifices: [{ rarity: 'Uncommon', count: 4 }, { rarity: 'Rare', count: 2 }],   timerHours: 4,  xp: 35  },
        arcane:   { label: 'Arcane',   emoji: '🟣', rarityPool: ['Rare', 'Epic'],         dustCost: 50,  goldCost: 5000,  sacrifices: [{ rarity: 'Rare', count: 5 }, { rarity: 'Epic', count: 1 }],       timerHours: 8,  xp: 60  },
        master:   { label: 'Master',   emoji: '🟡', rarityPool: ['Epic', 'Legendary'],    dustCost: 100, goldCost: 12000, sacrifices: [{ rarity: 'Epic', count: 3 }, { rarity: 'Legendary', count: 1 }],  timerHours: 16, xp: 100 },
    };

    static EXPEDITION_DOMAINS = {
        potions:   { label: 'Alchemy',   emoji: '🧪', filter: (item) => item.type === 'potion' },
        equipment: { label: 'Forging',   emoji: '⚔️', filter: (item) => item.type === 'equipment' },
    };

    static TIER_ORDER = ['basic', 'advanced', 'arcane', 'master'];

    static getExpeditionConfig(effects) {
        return effects?.expedition || { boardSlots: 2, maxTier: 'basic', timerReduction: 0, refreshHours: 24 };
    }

    static getAvailableTiers(effects) {
        const config = this.getExpeditionConfig(effects);
        const maxIdx = this.TIER_ORDER.indexOf(config.maxTier);
        return this.TIER_ORDER.slice(0, maxIdx + 1);
    }

    static needsBoardRefresh(lab, effects) {
        const config = this.getExpeditionConfig(effects);
        const last = lab.researchExpeditions?.lastBoardRefresh;
        if (!last) return true;
        const refreshMs = (config.refreshHours || 24) * 60 * 60 * 1000;
        return (Date.now() - new Date(last).getTime()) >= refreshMs;
    }

    static getTimeUntilRefresh(lab, effects) {
        const config = this.getExpeditionConfig(effects);
        const last = lab.researchExpeditions?.lastBoardRefresh;
        if (!last) return 0;
        const refreshMs = (config.refreshHours || 24) * 60 * 60 * 1000;
        const elapsed = Date.now() - new Date(last).getTime();
        return Math.max(0, refreshMs - elapsed);
    }

    static generateExpeditionBoard(lab, player, effects) {
        const config = this.getExpeditionConfig(effects);
        const availableTiers = this.getAvailableTiers(effects);
        const boardSlots = config.boardSlots || 2;

        const board = [];
        // Shuffle domains so each slot gets a different domain when possible
        const domains = Object.keys(this.EXPEDITION_DOMAINS)
            .sort(() => Math.random() - 0.5);

        for (let i = 0; i < boardSlots; i++) {
            // Cycle through shuffled domains to ensure variety
            const domain = domains[i % domains.length];

            // Pick a random tier from available
            const tierKey = availableTiers[Math.floor(Math.random() * availableTiers.length)];
            const tierData = this.EXPEDITION_TIERS[tierKey];

            // Check if any undiscovered recipes exist for this domain+rarity
            const hasRecipes = this._hasUndiscoveredRecipes(player, domain, tierData.rarityPool);
            if (!hasRecipes) {
                // Try other domains as fallback
                let found = false;
                for (const fallbackDomain of domains) {
                    if (fallbackDomain === domain) continue;
                    if (this._hasUndiscoveredRecipes(player, fallbackDomain, tierData.rarityPool)) {
                        const adjustedTimer = tierData.timerHours * (1 - (config.timerReduction || 0));
                        board.push({
                            id: `exp_${Date.now()}_${i}`,
                            domain: fallbackDomain,
                            tier: tierKey,
                            rarityPool: tierData.rarityPool,
                            dustCost: tierData.dustCost,
                            goldCost: tierData.goldCost,
                            sacrifices: tierData.sacrifices,
                            timerHours: Math.max(0.005, parseFloat(adjustedTimer.toFixed(3))),
                        });
                        found = true;
                        break;
                    }
                }
                if (!found) continue;
            } else {
                // Apply timer reduction from research station
                const adjustedTimer = tierData.timerHours * (1 - (config.timerReduction || 0));

                board.push({
                    id: `exp_${Date.now()}_${i}`,
                    domain,
                    tier: tierKey,
                    rarityPool: tierData.rarityPool,
                    dustCost: tierData.dustCost,
                    goldCost: tierData.goldCost,
                    sacrifices: tierData.sacrifices,
                    timerHours: Math.max(0.005, parseFloat(adjustedTimer.toFixed(3))),
                });
            }
        }

        if (!lab.researchExpeditions) lab.researchExpeditions = {};
        lab.researchExpeditions.board = board;
        lab.researchExpeditions.lastBoardRefresh = new Date();
        lab.markModified?.('researchExpeditions');
        return board;
    }

    static _hasUndiscoveredRecipes(player, domain, rarityPool) {
        const domainInfo = this.EXPEDITION_DOMAINS[domain];
        if (!domainInfo) return false;

        return Object.entries(GameData.recipes || {}).some(([id, recipe]) => {
            const item = GameData.getItem(recipe.result?.itemId);
            if (!item) return false;
            if (!domainInfo.filter(item)) return false;
            if (!rarityPool.includes(item.rarity)) return false;
            const isKnown = player.grimoire?.includes(id) || player.craftingJournal?.includes(id);
            return !isKnown;
        });
    }

    static _getUndiscoveredRecipes(player, domain, rarityPool) {
        const domainInfo = this.EXPEDITION_DOMAINS[domain];
        if (!domainInfo) return [];

        return Object.entries(GameData.recipes || {}).filter(([id, recipe]) => {
            const item = GameData.getItem(recipe.result?.itemId);
            if (!item) return false;
            if (!domainInfo.filter(item)) return false;
            if (!rarityPool.includes(item.rarity)) return false;
            const isKnown = player.grimoire?.includes(id) || player.craftingJournal?.includes(id);
            return !isKnown;
        }).map(([id, data]) => ({
            id,
            data,
            item: GameData.getItem(data.result.itemId)
        }));
    }

    static canAffordExpedition(player, expedition) {
        if ((player.arcaneDust || 0) < expedition.dustCost) return { can: false, reason: 'Not enough Arcane Dust' };
        if ((player.gold || 0) < expedition.goldCost) return { can: false, reason: 'Not enough Gold' };

        // Check sacrifices
        for (const sac of expedition.sacrifices) {
            const available = this.getIngredientsByRarity(player, sac.rarity)
                .reduce((sum, ing) => sum + ing.quantity, 0);
            if (available < sac.count) {
                return { can: false, reason: `Need ${sac.count}x ${sac.rarity} ingredients (have ${available})` };
            }
        }
        return { can: true };
    }

    static getIngredientsByRarity(player, rarity) {
        if (!player.inventory) return [];
        const results = [];
        for (const inv of player.inventory) {
            if (inv.quantity <= 0) continue;
            const item = GameData.getItem(inv.itemId);
            if (!item) continue;
            if (item.rarity !== rarity) continue;
            if (!['ingredient', 'crafting_material'].includes(item.type)) continue;
            results.push({ itemId: inv.itemId, name: item.name, quantity: inv.quantity });
        }
        return results;
    }

    static startExpedition(player, lab, expeditionId, sacrificeSelections = {}) {
        const board = lab.researchExpeditions?.board || [];
        const expedition = board.find(e => e.id === expeditionId);
        if (!expedition) return { success: false, error: 'Research not found on board.' };

        // Check if already active
        if (lab.researchExpeditions?.active?.expeditionId) {
            return { success: false, error: 'A research is already in progress.' };
        }

        // Check dust + gold
        if ((player.arcaneDust || 0) < expedition.dustCost) return { success: false, error: 'Not enough Arcane Dust.' };
        if ((player.gold || 0) < expedition.goldCost) return { success: false, error: 'Not enough Gold.' };

        // Validate sacrifice selections
        for (const sac of expedition.sacrifices) {
            const selectedItems = sacrificeSelections[sac.rarity] || [];
            if (selectedItems.length === 0) {
                return { success: false, error: `Select ${sac.rarity} ingredients to sacrifice.` };
            }
            let totalAvailable = 0;
            for (const itemId of selectedItems) {
                const inv = player.inventory.find(i => i.itemId === itemId);
                totalAvailable += inv?.quantity || 0;
            }
            if (totalAvailable < sac.count) {
                return { success: false, error: `Not enough ${sac.rarity} ingredients from your selection (need ${sac.count}).` };
            }
        }

        // Deduct costs
        player.arcaneDust -= expedition.dustCost;
        player.gold -= expedition.goldCost;

        // Consume selected ingredients
        for (const sac of expedition.sacrifices) {
            let remaining = sac.count;
            const selectedItems = sacrificeSelections[sac.rarity] || [];
            for (const itemId of selectedItems) {
                if (remaining <= 0) break;
                const inv = player.inventory.find(i => i.itemId === itemId);
                if (!inv) continue;
                const take = Math.min(remaining, inv.quantity);
                inv.quantity -= take;
                remaining -= take;
            }
        }
        player.inventory = player.inventory.filter(inv => inv.quantity > 0);
        player.markModified?.('inventory');

        // Start research
        const now = new Date();
        const completesAt = new Date(now.getTime() + expedition.timerHours * 60 * 60 * 1000);

        lab.researchExpeditions.active = {
            expeditionId: expedition.id,
            startedAt: now,
            completesAt,
            domain: expedition.domain,
            tier: expedition.tier,
            rarityPool: expedition.rarityPool,
        };

        // Remove from board
        lab.researchExpeditions.board = board.filter(e => e.id !== expeditionId);
        lab.markModified?.('researchExpeditions');
        player.markModified?.('arcaneDust');
        player.markModified?.('gold');

        return { success: true, completesAt, expedition };
    }

    static collectExpedition(player, lab) {
        const active = lab.researchExpeditions?.active;
        if (!active?.expeditionId) return { success: false, error: 'No active expedition.' };

        const now = new Date();
        if (now < new Date(active.completesAt)) {
            return { success: false, error: 'Expedition is still in progress.' };
        }

        // Find a random undiscovered recipe
        const candidates = this._getUndiscoveredRecipes(player, active.domain, active.rarityPool);
        if (!candidates.length) {
            // Clear active
            lab.researchExpeditions.active = { expeditionId: null, startedAt: null, completesAt: null, domain: null, tier: null, rarityPool: [] };
            lab.markModified?.('researchExpeditions');
            return { success: false, error: 'No undiscovered recipes available for this expedition type.' };
        }

        const recipe = candidates[Math.floor(Math.random() * candidates.length)];

        // Unlock recipe — potions go to grimoire, everything else to craftingJournal
        if (recipe.item.type === 'potion') {
            if (!player.grimoire) player.grimoire = [];
            player.grimoire.push(recipe.id);
            player.markModified?.('grimoire');
        } else {
            if (!player.craftingJournal) player.craftingJournal = [];
            player.craftingJournal.push(recipe.id);
            player.markModified?.('craftingJournal');
        }

        // Award XP
        const tierData = this.EXPEDITION_TIERS[active.tier];
        const xpReward = tierData?.xp || 15;
        player.xp = (player.xp || 0) + xpReward;
        player.markModified?.('xp');

        // Clear active
        lab.researchExpeditions.active = { expeditionId: null, startedAt: null, completesAt: null, domain: null, tier: null, rarityPool: [] };
        lab.markModified?.('researchExpeditions');

        return { success: true, recipe, xp: xpReward };
    }

    static refreshBoard(player, lab, effects) {
        const REFRESH_COST = 15;
        if ((player.arcaneDust || 0) < REFRESH_COST) {
            return { success: false, error: `Need ${REFRESH_COST} Arcane Dust to force-refresh the board.` };
        }
        player.arcaneDust -= REFRESH_COST;
        player.markModified?.('arcaneDust');
        this.generateExpeditionBoard(lab, player, effects);
        return { success: true };
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
        const extraSlots = effects.additionalHatchingSlot || 0;
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
        return effects?.additionalHatchingSlot || 0;
    }
}

module.exports = LabManager;

