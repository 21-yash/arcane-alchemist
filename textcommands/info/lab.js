const Player = require('../../models/Player');
const GameData = require('../../utils/gameData');
const { createInfoEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embed');
const CommandHelpers = require('../../utils/commandHelpers');
const LabManager = require('../../utils/labManager');

module.exports = {
    name: 'lab',
    description: 'View and upgrade your laboratory.',
    usage: '[upgrade <id> | upgrades | auto <set|clear|collect|status> | collect dust]',
    aliases: ['laboratory', 'labupgrades'],
    async execute(message, args, client, prefix) {
        const playerResult = await CommandHelpers.validatePlayer(message.author.id, prefix);
        if (!playerResult.success) {
            return message.reply({ embeds: [playerResult.embed] });
        }
        const player = playerResult.player;

        const { lab, effects } = await LabManager.getLabData(message.author.id);
        await LabManager.syncLabSystems(player, lab, effects);

        const sub = (args[0] || '').toLowerCase();

        switch (sub) {
            case 'upgrade':
                return this.handleUpgrade(message, player, lab, effects, args.slice(1), prefix);
            case 'upgrades':
                return this.showUpgrades(message, lab);
            case 'auto':
                return this.handleAuto(message, player, lab, effects, args.slice(1));
            case 'collect':
                return this.handleCollect(message, player, lab, args.slice(1));
            default:
                return this.showOverview(message, player, lab, effects, prefix);
        }
    },

    showOverview(message, player, lab, effects, prefix) {
        const researchRate = effects.researchGeneration
            ? `${effects.researchGeneration.points} pts / ${effects.researchGeneration.interval} min`
            : 'None (upgrade Research Station)';
        const autoStatus = lab.autoBrewer?.recipeId
            ? `Recipe: \`${lab.autoBrewer.recipeId}\`\nStored: ${lab.autoBrewer.storage?.reduce((sum, entry) => sum + entry.quantity, 0) || 0}`
            : 'Not configured';

        const embed = createInfoEmbed(
            '🔬 Laboratory Overview',
            `**Level:** ${lab.level || 1}\n` +
            `**Upgrades Owned:** ${lab.upgrades?.length || 0}\n` +
            `**Research Points:** ${lab.researchPoints || 0} (${researchRate})\n` +
            `**Arcane Dust Stored:** ${lab.arcaneDustStored || 0}\n` +
            `\n**Auto-Brewer:**\n${autoStatus}\n` +
            `\nUse \`${prefix}lab upgrades\` to see available upgrades.\n` +
            `Use \`${prefix}lab upgrade <id>\` to purchase an upgrade.`
        );

        return message.reply({ embeds: [embed] });
    },

    showUpgrades(message, lab) {
        const labUpgrades = GameData.labUpgrades || {};
        const lines = Object.entries(labUpgrades).map(([id, data]) => {
            const currentLevel = LabManager.getUpgradeLevel(lab, id);
            const nextCost = currentLevel < data.maxLevel ? data.costs[currentLevel] : 'Maxed';
            return `**${data.name}** (\`${id}\`)\nLevel: ${currentLevel}/${data.maxLevel} | Next Cost: ${nextCost}`;
        });

        return message.reply({
            embeds: [createInfoEmbed('Available Lab Upgrades', lines.join('\n\n') || 'No upgrades defined.')]
        });
    },

    async handleUpgrade(message, player, lab, effects, args, prefix) {
        const upgradeId = (args[0] || '').toLowerCase();
        if (!upgradeId) {
            return message.reply({ embeds: [createErrorEmbed('Upgrade ID Missing', `Usage: \`${prefix}lab upgrade <upgrade_id>\``)] });
        }

        const upgradeData = GameData.labUpgrades?.[upgradeId];
        if (!upgradeData) {
            return message.reply({ embeds: [createErrorEmbed('Unknown Upgrade', 'That upgrade ID does not exist. Use `lab upgrades` to see all IDs.')] });
        }

        const currentLevel = LabManager.getUpgradeLevel(lab, upgradeId);
        if (currentLevel >= upgradeData.maxLevel) {
            return message.reply({ embeds: [createErrorEmbed('Max Level Reached', `${upgradeData.name} is already at max level.`)] });
        }

        const cost = upgradeData.costs[currentLevel];
        if (player.gold < cost) {
            return message.reply({ embeds: [createErrorEmbed('Not Enough Gold', `You need **${cost}** gold to buy this upgrade.`)] });
        }

        player.gold -= cost;
        LabManager.setUpgradeLevel(lab, upgradeId, currentLevel + 1);

        const updatedEffects = LabManager.calculateEffects(lab);
        await LabManager.syncLabSystems(player, lab, updatedEffects);
        await player.save();
        await lab.save();

        return message.reply({
            embeds: [createSuccessEmbed(
                'Upgrade Purchased',
                `Upgraded **${upgradeData.name}** to level **${currentLevel + 1}/${upgradeData.maxLevel}**.\n` +
                `You have **${player.gold}** gold remaining.`
            )]
        });
    },

    async handleAuto(message, player, lab, effects, args) {
        const sub = (args[0] || '').toLowerCase();
        switch (sub) {
            case 'set': {
                const recipeId = args[1];
                if (!recipeId) {
                    return message.reply({ embeds: [createErrorEmbed('Missing Recipe', 'Specify a recipe ID from your grimoire.')] });
                }
                if (!player.grimoire.includes(recipeId)) {
                    return message.reply({ embeds: [createErrorEmbed('Recipe Locked', 'You have not learned that recipe yet.')] });
                }
                const recipe = GameData.recipes[recipeId];
                if (!recipe) {
                    return message.reply({ embeds: [createErrorEmbed('Unknown Recipe', 'That recipe does not exist.')] });
                }
                lab.autoBrewer = {
                    recipeId,
                    storage: [],
                    lastTick: new Date()
                };
                await lab.save();
                return message.reply({ embeds: [createSuccessEmbed('Auto-Brewer Configured', `Auto-Brewer will attempt to brew **${recipeId}** whenever ingredients are available.`)] });
            }
            case 'clear': {
                lab.autoBrewer = { recipeId: null, storage: [], lastTick: null };
                await lab.save();
                return message.reply({ embeds: [createSuccessEmbed('Auto-Brewer Cleared', 'Auto brewing has been disabled.')] });
            }
            case 'collect': {
                const collected = LabManager.collectAutoBrewedPotions(player, lab);
                if (!collected) {
                    return message.reply({ embeds: [createInfoEmbed('No Potions Ready', 'There are no auto-brewed potions to collect.')] });
                }
                await player.save();
                await lab.save();
                return message.reply({ embeds: [createSuccessEmbed('Potions Collected', `Transferred **${collected}** auto-brewed potions to your inventory.`)] });
            }
            default: {
                const stored = lab.autoBrewer?.storage || [];
                const total = stored.reduce((sum, entry) => sum + entry.quantity, 0);
                const description = lab.autoBrewer?.recipeId
                    ? `**Recipe:** \`${lab.autoBrewer.recipeId}\`\n**Stored Potions:** ${total}`
                    : 'Auto-Brewer not configured. Use `lab auto set <recipeId>` to assign one.';
                return message.reply({ embeds: [createInfoEmbed('Auto-Brewer Status', description)] });
            }
        }
    },

    async handleCollect(message, player, lab, args) {
        const target = (args[0] || '').toLowerCase();
        if (target !== 'dust') {
            return message.reply({ embeds: [createErrorEmbed('Invalid Resource', 'You can currently collect `dust` only.')] });
        }

        const amount = LabManager.collectArcaneDust(player, lab);
        if (!amount) {
            return message.reply({ embeds: [createInfoEmbed('No Dust Stored', 'Your Arcane Reactor has no dust ready to collect.')] });
        }

        await player.save();
        await lab.save();
        return message.reply({ embeds: [createSuccessEmbed('Dust Collected', `Collected **${amount}** Arcane Dust from your lab.`)] });
    }
};

