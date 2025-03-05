const { ActivityType, EmbedBuilder } = require('discord.js');
const client = require('..');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { syncLandRollen } = require('../utils/landRollen');

// Gebruik de oorspronkelijke import methode voor de economy module
const Economy = require('discord-economy-super/mongodb');

module.exports = {
    name: 'ready',
    once: true,
    execute: async () => {
        // Initialiseer de economy module met een duidelijk logbericht
        console.log(chalk.blue('Economie module initialiseren...'));
        try {
            client.eco = new Economy({
                connection: {
                    connectionURI: process.env.MONGODB_URI,
                    dbName: 'test',
                    collectionName: 'economy'
                },
                dailyAmount: 100,
                workAmount: [50, 200],
                weeklyAmount: 5000
            });
            console.log(chalk.green('Economie module succesvol geïnitialiseerd.'));
        } catch (error) {
            console.error(chalk.red('Fout bij het initialiseren van de economie module:'), error);
        }

        console.log(chalk.green(`Logged in as ${client.user.tag}!`));

        // Set activiteiten voor de bot
        const activities = [
            { name: `${client.users.cache.size} Leden`, type: ActivityType.Watching },
            { name: `.gg/Liberte`, type: ActivityType.Competing }
        ];
        const status = ['online', 'dnd', 'idle'];

        let i = 0;
        setInterval(() => {
            if (i >= activities.length) i = 0;
            client.user.setActivity(activities[i]);
            i++;
        }, 5000);

        let s = 0;
        setInterval(() => {
            if (s >= status.length) s = 0;
            client.user.setStatus(status[s]);
            s++;
        }, 30000);

        // Synchronisatie van landen met rollen
        try {
            // Na het opstarten, synchroniseer de landen in alle servers
            console.log(chalk.blue('Landen synchronisatie starten...'));
            
            // Hogere vertraging bij opstarten om anti-nuke systemen te vermijden
            const delayBetweenRoles = 8000; // 8 seconden vertraging
            
            for (const guild of client.guilds.cache.values()) {
                try {
                    // Synchroniseer de landen als de guild volledig beschikbaar is
                    console.log(`Synchroniseren van landen voor server: ${guild.name} met ${delayBetweenRoles/1000}s vertraging`);
                    const result = await syncLandRollen(client, guild, delayBetweenRoles);
                    console.log(`Landen synchronisatie resultaat voor ${guild.name}: ${result.createdRoles} nieuwe rollen, ${result.existingRoles} bestaande rollen`);
                } catch (error) {
                    console.error(`Fout bij synchroniseren van landen voor server ${guild.name}:`, error);
                }
            }
            console.log(chalk.green('Landen synchronisatie voltooid'));
        } catch (error) {
            console.error(chalk.red('Fout bij initiële synchronisatie van landen:'), error);
        }
        
        // Laad jail knoppen opnieuw
        try {
            const { reloadJailButtons } = require('../utils/jailButtonReloader');
            await reloadJailButtons(client);
            console.log(chalk.green('Jail knoppen herladen succesvol'));
        } catch (error) {
            console.error(chalk.red('Fout bij het herladen van jail knoppen:'), error);
        }
    }
};
