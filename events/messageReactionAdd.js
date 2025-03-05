const { EmbedBuilder } = require('discord.js');
const client = require('..');
const config = require('../config.json');

client.on('messageReactionAdd', async (reaction, user) => {
    // Controleer of dit een partiele reactie is die eerst gevuld moet worden
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Kon reactie niet laden:', error);
            return;
        }
    }
    
    // Als het bericht een partiele is, laad het volledig
    if (reaction.message.partial) {
        try {
            await reaction.message.fetch();
        } catch (error) {
            console.error('Kon bericht niet laden:', error);
            return;
        }
    }
    
    // Negeer reacties van de bot zelf
    if (user.id === client.user.id) return;
    
    // Controleer of dit een reactie is in het telkanaal
    if (reaction.message.channel.id === config.countingChannel) {
        // Controleer of de toegevoegde reactie een vinkje was
        if (reaction.emoji.name === '✅') {
            console.log(`Gebruiker ${user.tag} heeft een vinkje toegevoegd aan een bericht in telkanaal`);
            
            // Controleer of het bericht een geldig getal is
            const messageContent = reaction.message.content.trim();
            const number = parseInt(messageContent);
            
            if (!isNaN(number)) {
                // Verwijder het handmatig toegevoegde vinkje zonder waarschuwingsbericht
                try {
                    await reaction.users.remove(user.id);
                    console.log(`Handmatig toegevoegd vinkje verwijderd van gebruiker ${user.tag}`);
                } catch (error) {
                    console.error('Kon reactie niet verwijderen:', error);
                }
            }
        }
    }
}); 