const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../distube/events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        client.distube.on(event.name, (...args) => event.execute(...args));
        console.log(`Loaded DisTube event: ${event.name}`);
    }
};
