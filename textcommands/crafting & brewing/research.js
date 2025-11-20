const Player = require('../../models/Player');
const GameData = require('../../utils/gameData');
const { createInfoEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embed');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');

module.exports = {
    name: 'research',
    description: 'Spend research points to discover new recipes.',
    usage: '[status | convert | potion | craft]',
    aliases: ['labresearch', 'discover'],
    async execute(message, args, client, prefix) {
        const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
        if (!playerResult.success) {
            return message.reply({ embeds: [playerResult.embed] });
        }
        const player = playerResult.player;

        const { lab, effects } = await LabManager.getLabData(message.author.id);
        await LabManager.syncLabSystems(player, lab, effects);

        const sub = (args[0] || '').toLowerCase();
        if (sub === 'status') {
            return this.showStatus(message, lab, effects);
        }
        if (sub === 'convert') {
            return this.convertNotes(message, player, lab);
        }

        let focus = null;
        if (['potion', 'brew', 'brewing'].includes(sub)) focus = 'brewing';
        if (['craft', 'crafting', 'gear'].includes(sub)) focus = 'crafting';

        return this.performResearch(message, player, lab, effects, focus);
    },

    showStatus(message, lab, effects) {
        const researchRate = effects.researchGeneration
            ? `${effects.researchGeneration.points} pts every ${effects.researchGeneration.interval} min`
            : 'No passive research. Upgrade the Research Station.';
        const embed = createInfoEmbed(
            '📚 Research Status',
            `**Research Points:** ${lab.researchPoints || 0}\n` +
            `**Generation:** ${researchRate}\n` +
            `**Auto-Brewer Storage:** ${(lab.autoBrewer?.storage || []).reduce((sum, entry) => sum + entry.quantity, 0)}\n\n` +
            `Use \`research potion\` or \`research craft\` to focus on a category.\n` +
            `Use \`research convert\` to turn Research Notes into points.`
        );
        return message.reply({ embeds: [embed] });
    },

    async convertNotes(message, player, lab) {
        const notes = player.inventory.find(item => item.itemId === 'research_notes');
        if (!notes) {
            return message.reply({ embeds: [createErrorEmbed('No Notes', 'You do not have any Research Notes to convert.')] });
        }

        const pointsPerNote = 4;
        const totalPoints = notes.quantity * pointsPerNote;
        lab.researchPoints += totalPoints;
        player.inventory = player.inventory.filter(item => item.itemId !== 'research_notes');

        await player.save();
        await lab.save();

        return message.reply({
            embeds: [createSuccessEmbed('Notes Converted', `Converted notes into **${totalPoints}** research points.`)]
        });
    },

    async performResearch(message, player, lab, effects, focus) {
        const allowAdvanced = !!effects.advancedRecipesUnlocked;
        const baseCost = allowAdvanced ? 10 : 6;

        if ((lab.researchPoints || 0) < baseCost) {
            return message.reply({
                embeds: [createErrorEmbed('Not Enough Points', `You need at least **${baseCost}** research points to perform research.`)]
            });
        }

        const recipe = this.selectResearchRecipe(player, allowAdvanced, focus);
        if (!recipe) {
            return message.reply({
                embeds: [createInfoEmbed('All Caught Up', 'You have already discovered every recipe currently available for this research tier.')]
            });
        }

        lab.researchPoints -= baseCost;
        this.applyRecipeUnlock(player, recipe);

        let extraDiscovery = null;
        if (effects.recipeDiscoveryChance && Math.random() < effects.recipeDiscoveryChance) {
            const secondRecipe = this.selectResearchRecipe(player, allowAdvanced, focus);
            if (secondRecipe) {
                this.applyRecipeUnlock(player, secondRecipe);
                extraDiscovery = secondRecipe;
            }
        }

        await player.save();
        await lab.save();

        let description = `Unlocked the recipe for **${recipe.displayName}**!`;
        if (extraDiscovery) {
            description += `\nBonus insight! You also discovered **${extraDiscovery.displayName}**.`;
        }

        return message.reply({
            embeds: [createSuccessEmbed('Research Complete', description)]
        });
    },

    selectResearchRecipe(player, allowAdvanced, focus) {
        const candidates = Object.entries(GameData.recipes || {}).filter(([id, data]) => {
            const item = GameData.getItem(data.result?.itemId);
            if (!item) return false;
            const source = item.source;
            if (focus && source !== focus) return false;
            const advanced = isAdvancedRecipe(data);
            if (advanced && !allowAdvanced) return false;
            const alreadyKnown = (source === 'brewing' && player.grimoire.includes(id)) ||
                (source === 'crafting' && player.craftingJournal.includes(id));
            if (alreadyKnown) return false;
            return source === 'brewing' || source === 'crafting';
        }).map(([id, data]) => {
            const item = GameData.getItem(data.result.itemId);
            return { id, data, item, displayName: item?.name || id };
        });

        if (!candidates.length) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    },

    applyRecipeUnlock(player, recipe) {
        const source = recipe.item.source;
        if (source === 'brewing') {
            player.grimoire.push(recipe.id);
            player.markModified?.('grimoire');
        } else if (source === 'crafting') {
            player.craftingJournal.push(recipe.id);
            player.markModified?.('craftingJournal');
        }
    }
};

function isAdvancedRecipe(recipeData) {
    const item = GameData.getItem(recipeData.result?.itemId);
    if (!item) return false;
    const highRarity = item.rarity && ['Epic', 'Legendary'].includes(item.rarity);
    return highRarity || recipeData.level >= 10;
}

