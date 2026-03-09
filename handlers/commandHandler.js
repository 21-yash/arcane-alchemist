const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client) => {
    // Load slash commands
    const loadSlashCommands = (dir = './slashcommands') => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.lstatSync(filePath);
            
            if (stat.isDirectory()) {
                loadSlashCommands(filePath);
            } else if (file.endsWith('.js')) {
                try {
                    const command = require(path.resolve(filePath));
                    if (command.data && command.execute) {
                        client.slashCommands.set(command.data.name, command);
                      //  console.log(`✅ Loaded slash command: ${command.data.name}`);
                    } else {
                        console.warn(`⚠️ Invalid slash command structure: ${filePath}`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading slash command ${filePath}:`, error);
                }
            }
        }
    };

    // Load text commands
    const loadTextCommands = (dir = './textcommands') => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.lstatSync(filePath);
            
            if (stat.isDirectory()) {
                loadTextCommands(filePath);
            } else if (file.endsWith('.js')) {
                try {
                    const command = require(path.resolve(filePath));
                    if (command.name && command.execute) {
                        client.textCommands.set(command.name, command);
                        
                        // Populate aliases to avoid linear scan
                        if (command.aliases && Array.isArray(command.aliases)) {
                            command.aliases.forEach(alias => {
                                client.aliases.set(alias, command.name);
                            });
                        }
                        
                      //  console.log(`✅ Loaded text command: ${command.name}`);
                    } else {
                        console.warn(`⚠️ Invalid text command structure: ${filePath}`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading text command ${filePath}:`, error);
                }
            }
        }
    };

    // Load commands
    if (fs.existsSync('./slashcommands')) {
        loadSlashCommands();
    }
    
    if (fs.existsSync('./textcommands')) {
        loadTextCommands();
    }

    console.log(`📦 Loaded ${client.slashCommands.size} slash commands and ${client.textCommands.size} text commands`);
};
