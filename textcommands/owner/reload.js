const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config/config.json');

module.exports = {
    name: 'reload',
    description: 'Reload commands or events (Owner only)',
    usage: '<command/commands/event/events> [name] [type]',
    aliases: ['rl'],
    user_perm: [],
    bot_perm: [],
    ownerOnly: true,
    async execute(message, args, client, prefix) {

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} Missing Arguments`)
                .setDescription(`Usage: \`${config.prefix}reload <command/commands/event/events> [name] [type]\``)
                .addFields([
                    { name: 'Examples', value: `\`${config.prefix}reload command ping slash\`\n\`${config.prefix}reload commands all\`\n\`${config.prefix}reload event ready\`\n\`${config.prefix}reload events\``, inline: false }
                ]);
            
            return await message.reply({ embeds: [embed] });
        }

        const action = args[0].toLowerCase();

        try {
            switch (action) {
                case 'command':
                    await reloadSpecificCommand(message, args, client);
                    break;
                case 'commands':
                    await reloadAllCommands(message, args, client);
                    break;
                case 'event':
                    await reloadSpecificEvent(message, args, client);
                    break;
                case 'events':
                    await reloadAllEvents(message, client);
                    break;
                default:
                    const embed = new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle(`${config.emojis.error} Invalid Action`)
                        .setDescription('Action must be: `command`, `commands`, `event`, or `events`.');
                    
                    await message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in reload command:', error);
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} Reload Failed`)
                .setDescription(`Failed to reload: ${error.message}`);
            
            await message.reply({ embeds: [embed] });
        }
    },
};

async function reloadSpecificCommand(message, args, client) {
    const commandName = args[1];
    const commandType = args[2];

    if (!commandName) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Missing Command Name`)
            .setDescription(`Usage: \`${config.prefix}reload command <name> <slash/text>\``);
        
        return await message.reply({ embeds: [embed] });
    }

    if (!commandType || (commandType !== 'slash' && commandType !== 'text')) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Invalid Command Type`)
            .setDescription('Command type must be either `slash` or `text`.');
        
        return await message.reply({ embeds: [embed] });
    }

    if (commandType === 'slash') {
        const command = client.slashCommands.get(commandName);
        if (!command) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} Command Not Found`)
                .setDescription(`Slash command \`${commandName}\` not found.`);
            
            return await message.reply({ embeds: [embed] });
        }

        // Find and reload the command file
        const commandPath = findCommandFile(commandName, 'slashcommands');
        if (!commandPath) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} File Not Found`)
                .setDescription(`Could not find file for slash command \`${commandName}\`.`);
            
            return await message.reply({ embeds: [embed] });
        }

        delete require.cache[require.resolve(commandPath)];
        const newCommand = require(commandPath);
        client.slashCommands.set(newCommand.data.name, newCommand);

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.success} Command Reloaded`)
            .setDescription(`Successfully reloaded slash command \`${commandName}\`.`)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

    } else if (commandType === 'text') {
        const command = client.textCommands.get(commandName);
        if (!command) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} Command Not Found`)
                .setDescription(`Text command \`${commandName}\` not found.`);
            
            return await message.reply({ embeds: [embed] });
        }

        // Find and reload the command file
        const commandPath = findCommandFile(commandName, 'textcommands');
        if (!commandPath) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.error} File Not Found`)
                .setDescription(`Could not find file for text command \`${commandName}\`.`);
            
            return await message.reply({ embeds: [embed] });
        }

        delete require.cache[require.resolve(commandPath)];
        const newCommand = require(commandPath);
        client.textCommands.set(newCommand.name, newCommand);

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.success} Command Reloaded`)
            .setDescription(`Successfully reloaded text command \`${commandName}\`.`)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
}

async function reloadAllCommands(message, args, client) {
    const reloadType = args[1] || 'all';
    let reloadedCount = 0;

    if (!['all', 'slash', 'text'].includes(reloadType)) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Invalid Type`)
            .setDescription('Type must be: `all`, `slash`, or `text`.');
        
        return await message.reply({ embeds: [embed] });
    }

    if (reloadType === 'all' || reloadType === 'slash') {
        // Clear slash commands
        client.slashCommands.clear();
        
        // Reload slash commands
        const slashCount = loadCommands(client, './slashcommands', 'slash');
        reloadedCount += slashCount;
    }

    if (reloadType === 'all' || reloadType === 'text') {
        // Clear text commands
        client.textCommands.clear();
        
        // Reload text commands
        const textCount = loadCommands(client, './textcommands', 'text');
        reloadedCount += textCount;
    }

    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.success} Commands Reloaded`)
        .setDescription(`Successfully reloaded ${reloadedCount} commands.`)
        .addFields([
            { name: 'Type', value: reloadType === 'all' ? 'All Commands' : `${reloadType} Commands`, inline: true },
            { name: 'Count', value: reloadedCount.toString(), inline: true }
        ])
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function reloadSpecificEvent(message, args, client) {
    const eventName = args[1];

    if (!eventName) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Missing Event Name`)
            .setDescription(`Usage: \`${config.prefix}reload event <name>\``);
        
        return await message.reply({ embeds: [embed] });
    }

    const eventPath = path.resolve(`./events/${eventName}.js`);
    if (!fs.existsSync(eventPath)) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.error} Event Not Found`)
            .setDescription(`Event file \`${eventName}.js\` not found.`);
        
        return await message.reply({ embeds: [embed] });
    }

    // Remove old event listeners
    client.removeAllListeners(eventName);

    // Clear require cache and reload
    delete require.cache[require.resolve(eventPath)];
    const event = require(eventPath);

    // Re-register event
    if (event.once) {
        client.once(eventName, (...args) => event.execute(...args, client));
    } else {
        client.on(eventName, (...args) => event.execute(...args, client));
    }

    client.events.set(eventName, event);

    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.success} Event Reloaded`)
        .setDescription(`Successfully reloaded event \`${eventName}\`.`)
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function reloadAllEvents(message, client) {
    // Remove all event listeners except built-in ones
    const eventsToKeep = ['error', 'warn', 'debug', 'rateLimit'];
    const allEvents = client.eventNames();
    
    allEvents.forEach(eventName => {
        if (!eventsToKeep.includes(eventName)) {
            client.removeAllListeners(eventName);
        }
    });

    // Clear events collection
    client.events.clear();

    // Reload all events
    const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    let reloadedCount = 0;

    for (const file of eventFiles) {
        try {
            const eventPath = path.resolve(`./events/${file}`);
            delete require.cache[require.resolve(eventPath)];
            
            const event = require(eventPath);
            const eventName = file.split('.')[0];

            if (event.once) {
                client.once(eventName, (...args) => event.execute(...args, client));
            } else {
                client.on(eventName, (...args) => event.execute(...args, client));
            }

            client.events.set(eventName, event);
            reloadedCount++;
        } catch (error) {
            console.error(`Error reloading event ${file}:`, error);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.success} Events Reloaded`)
        .setDescription(`Successfully reloaded ${reloadedCount} events.`)
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

function findCommandFile(commandName, baseDir) {
    const searchDirs = [baseDir];
    
    while (searchDirs.length > 0) {
        const currentDir = searchDirs.shift();
        const files = fs.readdirSync(currentDir);
        
        for (const file of files) {
            const filePath = path.join(currentDir, file);
            const stat = fs.lstatSync(filePath);
            
            if (stat.isDirectory()) {
                searchDirs.push(filePath);
            } else if (file === `${commandName}.js`) {
                return path.resolve(filePath);
            }
        }
    }
    
    return null;
}

function loadCommands(client, dir, type) {
    let count = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);
        
        if (stat.isDirectory()) {
            count += loadCommands(client, filePath, type);
        } else if (file.endsWith('.js')) {
            try {
                delete require.cache[require.resolve(path.resolve(filePath))];
                const command = require(path.resolve(filePath));
                
                if (type === 'slash' && command.data && command.execute) {
                    client.slashCommands.set(command.data.name, command);
                    count++;
                } else if (type === 'text' && command.name && command.execute) {
                    client.textCommands.set(command.name, command);
                    count++;
                }
            } catch (error) {
                console.error(`Error loading ${type} command ${filePath}:`, error);
            }
        }
    }
    
    return count;
}