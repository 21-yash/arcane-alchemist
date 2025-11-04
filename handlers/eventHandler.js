const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        try {
            const event = require(path.resolve(`./events/${file}`));
            const eventName = file.split('.')[0];

            if (event.once) {
                client.once(eventName, (...args) => event.execute(...args, client));
            } else {
                client.on(eventName, (...args) => event.execute(...args, client));
            }

            client.events.set(eventName, event);
           // console.log(`✅ Loaded event: ${eventName}`);
        } catch (error) {
            console.error(`❌ Error loading event ${file}:`, error);
        }
    }

    console.log(`🎯 Loaded ${client.events.size} events`);
};
