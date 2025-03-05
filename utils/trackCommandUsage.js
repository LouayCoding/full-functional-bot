const CommandStats = require('../models/CommandStats');

/**
 * Houdt het gebruik van een slash command bij
 * @param {String} commandName - De naam van het commando
 * @param {Object} user - De gebruiker die het commando heeft uitgevoerd
 * @returns {Promise<Object>} - Het bijgewerkte statistics object
 */
async function trackCommandUsage(commandName, user) {
    try {
        if (!commandName || !user) return null;

        // Zoek bestaande stats of maak nieuwe aan
        let commandStat = await CommandStats.findOne({ commandName });
        
        if (!commandStat) {
            commandStat = new CommandStats({
                commandName,
                uses: 0,
                usedBy: []
            });
        }
        
        // Update algemene stats
        commandStat.uses += 1;
        commandStat.lastUsed = new Date();
        
        // Vind de gebruiker in de usedBy array of maak een nieuwe entry
        const userEntry = commandStat.usedBy.find(entry => entry.userId === user.id);
        
        if (userEntry) {
            // Update bestaande gebruiker
            userEntry.usageCount += 1;
            userEntry.lastUsed = new Date();
            userEntry.username = user.username; // Update username in geval van wijzigingen
        } else {
            // Voeg nieuwe gebruiker toe
            commandStat.usedBy.push({
                userId: user.id,
                username: user.username,
                usageCount: 1,
                lastUsed: new Date()
            });
        }
        
        // Sla de wijzigingen op
        await commandStat.save();
        return commandStat;
        
    } catch (error) {
        console.error('Fout bij het bijhouden van command gebruik:', error);
        return null;
    }
}

module.exports = { trackCommandUsage }; 