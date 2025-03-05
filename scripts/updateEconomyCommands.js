const fs = require('fs');
const path = require('path');

/**
 * Dit script voegt de channelCheck functie toe aan alle economy commands
 * Het controleert of het commando in het juiste kanaal wordt gebruikt
 */

const economyDir = path.join(__dirname, '..', 'slashCommands', 'economy');
const files = fs.readdirSync(economyDir).filter(file => file.endsWith('.js'));

let updateCount = 0;

// Loop over alle bestanden in de economy directory
files.forEach(file => {
    const filePath = path.join(economyDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Sla setmoney.js, addmoney.js en removemoney.js over (staff commands)
    if (['setmoney.js', 'addmoney.js', 'removemoney.js'].includes(file)) {
        console.log(`Bestand overgeslagen (staff command): ${file}`);
        return;
    }
    
    // Controleer of het bestand al is aangepast
    if (content.includes('checkChannel(interaction, economyChannelId)')) {
        console.log(`Bestand al aangepast: ${file}`);
        return;
    }
    
    // Log voor debug
    console.log(`Bezig met aanpassen van: ${file}`);
    
    // Voeg de import toe
    if (!content.includes('const { checkChannel }')) {
        // Zoek de eerste require statement
        const requireIndex = content.indexOf('require');
        if (requireIndex !== -1) {
            // Zoek het einde van de regel
            const endOfLineIndex = content.indexOf('\n', requireIndex);
            if (endOfLineIndex !== -1) {
                // Voeg de import toe na de eerste require statement
                content = content.slice(0, endOfLineIndex + 1) + 
                          "const { checkChannel } = require('../../utils/channelCheck');\n" +
                          content.slice(endOfLineIndex + 1);
            }
        }
    }
    
    // Voeg de channel check toe aan het begin van de run functie
    const runIndex = content.indexOf('run: async (client, interaction)');
    if (runIndex !== -1) {
        // Zoek de eerste { na run: async
        const openBraceIndex = content.indexOf('{', runIndex);
        if (openBraceIndex !== -1) {
            // Voeg de code toe na de eerste {
            const channelCheckCode = `\n        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }\n`;
            
            content = content.slice(0, openBraceIndex + 1) + channelCheckCode + content.slice(openBraceIndex + 1);
        }
    }
    
    // Schrijf het aangepaste bestand terug
    fs.writeFileSync(filePath, content);
    updateCount++;
    console.log(`Bestand succesvol aangepast: ${file}`);
});

console.log(`Totaal aantal aangepaste bestanden: ${updateCount}`); 