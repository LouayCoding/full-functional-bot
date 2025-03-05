const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const Jail = require('../models/jail');

/**
 * Laadt de jail knoppen opnieuw door berichten in het jail kanaal te updaten
 * @param {Object} client - De Discord client
 * @returns {Promise<void>}
 */
async function reloadJailButtons(client) {
    try {
        console.log('Jail knoppen worden herladen...');
        
        // Haal alle jail records op uit de database
        const allJailRecords = await Jail.find({});
        
        if (allJailRecords.length === 0) {
            console.log('Geen actieve jail records gevonden.');
            return;
        }
        
        console.log(`${allJailRecords.length} jail records gevonden, knoppen worden gerestored...`);
        
        // Haal het jail kanaal op
        const jailChan = client.channels.cache.get(config.jailChannel);
        if (!jailChan) {
            console.error('Kon het jail kanaal niet vinden!');
            return;
        }
        
        // Voor elke jail record
        for (const jailRecord of allJailRecords) {
            try {
                // Haal de gebruiker op
                const user = await client.users.fetch(jailRecord.userID).catch(() => null);
                if (!user) {
                    console.log(`Kon gebruiker ${jailRecord.userID} niet ophalen, sla over.`);
                    continue;
                }
                
                // Maak de actieknoppen voor bail als er een borgsom is
                const row = new ActionRowBuilder();
                
                if (jailRecord.bailAmount > 0) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`bail_${jailRecord.userID}`)
                            .setLabel(`Betaal Borgsom: €${jailRecord.bailAmount}`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💰')
                    );
                }
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`jailinfo_${jailRecord.userID}`)
                        .setLabel('Bekijk Jail Info')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('ℹ️')
                );
                
                // Stuur een nieuw bericht naar het jail kanaal met de knoppen
                const content = jailRecord.bailAmount > 0
                    ? `<@${jailRecord.userID}>, je zit in de gevangenis.\n\n**Reden:** ${jailRecord.reason}\n**Borgsom:** €${jailRecord.bailAmount}\n\nOm vrij te komen kan iemand de borgsom voor je betalen door op de knop te klikken.\nJe kunt alleen in dit kanaal chatten totdat je wordt vrijgelaten.\n\n**[Dit bericht is hersteld na een herstart van de bot]**`
                    : `<@${jailRecord.userID}>, je zit in de gevangenis.\n\n**Reden:** ${jailRecord.reason}\n**Borgsom:** Geen borgsom (alleen een moderator kan je vrijlaten)\n\nJe kunt alleen in dit kanaal chatten totdat je wordt vrijgelaten.\n\n**[Dit bericht is hersteld na een herstart van de bot]**`;
                
                if (jailRecord.bailAmount > 0) {
                    await jailChan.send({
                        content,
                        components: [row]
                    });
                } else {
                    await jailChan.send({
                        content
                    });
                }
                
                console.log(`Jail bericht en knoppen hersteld voor gebruiker: ${user.username}`);
            } catch (error) {
                console.error(`Fout bij het herstellen van berichten voor gebruiker in jail: ${error}`);
            }
        }
        
        console.log('Jail knoppen herladen voltooid.');
    } catch (error) {
        console.error('Fout bij het herladen van jail knoppen:', error);
    }
}

module.exports = { reloadJailButtons }; 