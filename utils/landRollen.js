const Land = require('../models/Land');
const { PermissionsBitField } = require('discord.js');

/**
 * Wacht een aantal milliseconden
 * @param {number} ms - Aantal milliseconden om te wachten
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Haalt landen op uit de afkomst slash command en maakt de rollen aan indien nodig
 * @param {Client} client - De Discord client
 * @param {Guild} guild - De Discord guild/server
 * @param {number} delayBetweenRoles - Vertraging tussen het aanmaken van elke rol in ms (standaard 5 seconden)
 * @returns {Promise<{success: boolean, message: string, createdRoles: number, existingRoles: number}>}
 */
async function syncLandRollen(client, guild, delayBetweenRoles = 5000) {
    try {
        // Haal de lijst met landen uit het afkomst command
        const { countries, specialLands } = getLandenLijst();
        
        // Haal bestaande rollen op
        const existingRoles = await guild.roles.fetch();
        
        let stats = {
            success: true,
            message: 'Landen succesvol gesynchroniseerd',
            createdRoles: 0,
            existingRoles: 0
        };
        
        // Loop door alle landen
        for (const country of countries) {
            const { name, emoji, roleId } = country;
            
            // Controleer of het land al in de database staat
            let landRecord = await Land.findOne({ name });
            
            // Controleer of de rol al bestaat in de server
            let role = existingRoles.get(roleId);
            
            if (!role) {
                // Rol bestaat niet, maak deze aan
                try {
                    // Voeg log toe om te laten zien dat we wachten
                    console.log(`Wacht ${delayBetweenRoles}ms voordat rol voor ${name} wordt aangemaakt...`);
                    
                    // Wacht de opgegeven tijd voordat we de rol aanmaken
                    await delay(delayBetweenRoles);
                    
                    role = await guild.roles.create({
                        name: name,
                        // Geen kleur specificeren zodat de rol de standaard grijze kleur krijgt
                        permissions: [PermissionsBitField.Flags.ViewChannel],
                        reason: 'Automatisch aangemaakt door land synchronisatie'
                    });
                    
                    stats.createdRoles++;
                    console.log(`Rol voor ${name} (${emoji}) aangemaakt: ${role.id}`);
                    
                    // Update land object met nieuwe roleId
                    country.roleId = role.id;
                } catch (error) {
                    console.error(`Fout bij aanmaken rol voor ${name}:`, error);
                    stats.success = false;
                    stats.message = `Fout bij aanmaken van rollen: ${error.message}`;
                    
                    // Als er een fout optreedt, wacht even voordat we verdergaan
                    await delay(delayBetweenRoles * 2);
                }
            } else {
                stats.existingRoles++;
            }
            
            // Update of maak land record in database
            if (!landRecord) {
                await Land.create({
                    name,
                    emoji,
                    roleId: role.id
                });
            } else if (landRecord.roleId !== role.id) {
                // Update roleId als deze is veranderd
                landRecord.roleId = role.id;
                await landRecord.save();
            }
        }
        
        // Voeg speciale landen toe aan de database voor referentie, maar maak geen rol aan
        for (const specialLand of specialLands) {
            const { name, emoji } = specialLand;
            
            // Controleer of het speciale land al in de database staat
            let landRecord = await Land.findOne({ name });
            
            if (!landRecord) {
                await Land.create({
                    name,
                    emoji,
                    roleId: 'special', // Speciale markering voor landen zonder rol
                    special: true
                });
            }
        }
        
        return stats;
    } catch (error) {
        console.error('Fout bij synchroniseren van landrollen:', error);
        return {
            success: false,
            message: `Er is een fout opgetreden: ${error.message}`,
            createdRoles: 0,
            existingRoles: 0
        };
    }
}

/**
 * Haalt de lijst met landen op uit het afkomst command
 * @returns {Object} Object met countries array en specialLands array
 */
function getLandenLijst() {
    // Deze lijst is gebaseerd op slashCommands/teksten/afkomst.js
    const countries = [
        { name: 'Marokko', emoji: '🇲🇦', roleId: '1331986256023912509' },
        { name: 'Nederland', emoji: '🇳🇱', roleId: '1331986451847581850' },
        { name: 'Algerije', emoji: '🇩🇿', roleId: '1331986495338184715' },
        { name: 'Pakistan', emoji: '🇵🇰', roleId: '1331986667934056518' },
        { name: 'Afghanistan', emoji: '🇦🇫', roleId: '1331987576311255101' },
        { name: 'België', emoji: '🇧🇪', roleId: '1331987662956924998' },
        { name: 'Duitsland', emoji: '🇩🇪', roleId: '1331987740849344641' },
        { name: 'Frankrijk', emoji: '🇫🇷', roleId: '1331987818855010344' },
        { name: 'Spanje', emoji: '🇪🇸', roleId: '1331988241762484224' },
        { name: 'Italië', emoji: '🇮🇹', roleId: '1331988287220486184' },
        { name: 'Turkije', emoji: '🇹🇷', roleId: '1331988336939761756' },
        { name: 'Egypte', emoji: '🇪🇬', roleId: '1331988419580264549' },
        { name: 'Saoedi-Arabië', emoji: '🇸🇦', roleId: '1331988503072084093' },
        { name: 'China', emoji: '🇨🇳', roleId: '1331988570491326634' },
        // Rusland is verwijderd
        { name: 'Brazilië', emoji: '🇧🇷', roleId: '1331988687361146901' },
        { name: 'Mexico', emoji: '🇲🇽', roleId: '1331988768395104306' },
        { name: 'Verenigde Staten', emoji: '🇺🇸', roleId: '1331988831490146355' },
        { name: 'Vietnam', emoji: '🇻🇳', roleId: '1331988914398953482' },
        { name: 'Polen', emoji: '🇵🇱', roleId: '1331988982913044553' },
        { name: 'Suriname', emoji: '🇸🇷', roleId: '1331989061010722888' },
        { name: 'Curaçao', emoji: '🇨🇼', roleId: '1331989178191184005' },
        { name: 'Indonesië', emoji: '🇮🇩', roleId: '1331989221337989170' },
        { name: 'Filipijnen', emoji: '🇵🇭', roleId: '1331989277051064360' },
        { name: 'Palestina', emoji: '🇵🇸', roleId: '1331989336677417120' }
    ];
    
    // Speciale landen zonder rol
    const specialLands = [
        { name: 'Koerdistan', emoji: '🏴', special: true, message: 'Koerdistan is geen erkend land.' }
    ];
    
    return { countries, specialLands };
}

module.exports = { syncLandRollen, getLandenLijst }; 