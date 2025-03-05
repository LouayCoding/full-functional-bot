// levelingSystem.js - Handelt XP toekenning af voor Discord berichten
const { handleXP } = require('../utils/xphandler');

/**
 * Initialiseert het leveling systeem voor de bot
 * @param {Object} client - De Discord client
 */
function initLevelingSystem(client) {
    // Luister naar berichten voor XP toekenning
    client.on('messageCreate', async (message) => {
        try {
            // Negeer berichten van bots en berichten buiten servers
            if (message.author.bot || !message.guild) return;
            
            // Verwerk het bericht voor XP toekenning
            const result = await handleXP(message);
            
            // Als de gebruiker level up is gegaan, log dat
            if (result && result.leveledUp) {
                console.log(`${message.author.username} is level up naar ${result.newLevel}!`);
            }
        } catch (error) {
            console.error('Fout bij het verwerken van XP:', error);
        }
    });
    
    console.log('Leveling systeem geïnitialiseerd');
}

module.exports = { initLevelingSystem }; 