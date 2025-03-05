/**
 * Controleert of een interactie in het gespecificeerde kanaal plaatsvindt
 * @param {Object} interaction - De Discord interactie
 * @param {String} requiredChannelId - Het kanaal ID waarin de interactie moet plaatsvinden
 * @param {String} channelName - De naam van het kanaal (voor foutmelding)
 * @returns {Boolean} - True als de interactie in het juiste kanaal plaatsvindt, anders false
 */
async function checkChannel(interaction, requiredChannelId, channelName = "economy") {
    // Controleer of de interactie in het juiste kanaal plaatsvindt
    if (interaction.channelId !== requiredChannelId) {
        // Als niet in het juiste kanaal, stuur een melding
        await interaction.reply({
            content: `Je kunt deze command alleen gebruiken in <#${requiredChannelId}>!`,
            ephemeral: true
        });
        return false;
    }
    
    // In het juiste kanaal
    return true;
}

module.exports = { checkChannel }; 