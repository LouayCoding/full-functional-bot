const Jail = require('../models/jail');

/**
 * Controleert of een gebruiker in de gevangenis zit en stuurt een bericht als dat zo is
 * @param {Object} interaction - De Discord interactie
 * @param {String} userId - De gebruiker ID om te controleren
 * @param {String} guildId - De guild ID om te controleren
 * @returns {Promise<boolean>} - True als gebruiker in de gevangenis zit, anders false
 */
async function isUserJailed(interaction, userId, guildId) {
    try {
        // Controleer of de gebruiker in de gevangenis zit
        const jailRecord = await Jail.findOne({ 
            userID: userId,
            guildID: guildId
        });
        
        // Als de gebruiker niet in de gevangenis zit, return false
        if (!jailRecord) {
            return false;
        }
        
        // Haal informatie op over borgsom
        const bailInfo = jailRecord.bailAmount > 0 
            ? `\nJe kunt vrijkomen door een borgsom van €${jailRecord.bailAmount} te betalen.`
            : '\nJe kunt alleen vrijkomen als een moderator je vrijlaat.';
        
        // Stuur een bericht dat de gebruiker in de gevangenis zit
        await interaction.reply({
            content: `Je zit momenteel in de gevangenis en kunt deze command niet gebruiken!${bailInfo}\nGebruik \`/jailstatus\` om je gevangenisstatus te bekijken.`,
            ephemeral: true
        });
        
        // Gebruiker zit in de gevangenis
        return true;
    } catch (error) {
        console.error('Fout bij het controleren van gevangenisstatus:', error);
        return false;
    }
}

module.exports = { isUserJailed }; 