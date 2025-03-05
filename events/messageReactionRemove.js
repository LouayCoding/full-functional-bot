const { EmbedBuilder } = require('discord.js');
const client = require('..');
const config = require('../config.json');

// Verbeterde versie van het messageReactionRemove event
client.on('messageReactionRemove', async (reaction, user) => {
    console.log(`[DEBUG] Reactie verwijderd event ontvangen`);
    
    // Direct extra loggen voor debugging
    console.log(`[DEBUG] Reactie info: naam=${reaction?.emoji?.name || 'onbekend'}, gebruiker=${user?.tag || 'onbekend'}`);
    console.log(`[DEBUG] Kanaal ID: ${reaction?.message?.channel?.id || 'onbekend'}`);
    
    // Controleer of dit een partiele reactie is die eerst gevuld moet worden
    if (reaction.partial) {
        console.log(`[DEBUG] Partiele reactie gedetecteerd, bezig met fetchen...`);
        try {
            await reaction.fetch();
            console.log(`[DEBUG] Reactie succesvol gefetcht`);
        } catch (error) {
            console.error('[ERROR] Kon reactie niet laden:', error);
            return;
        }
    }
    
    // Als het bericht een partiele is, laad het volledig
    if (reaction.message.partial) {
        console.log(`[DEBUG] Partieel bericht gedetecteerd, bezig met fetchen...`);
        try {
            await reaction.message.fetch();
            console.log(`[DEBUG] Bericht succesvol gefetcht: ${reaction.message.content}`);
        } catch (error) {
            console.error('[ERROR] Kon bericht niet laden:', error);
            return;
        }
    }
    
    // Negeer reacties van de bot zelf (dit voorkomt oneindige lussen)
    if (user.id === client.user.id) {
        console.log(`[DEBUG] Negeer bot eigen reactie verwijdering`);
        return;
    }
    
    // Reload config to make sure we have the latest settings
    delete require.cache[require.resolve('../config.json')];
    const freshConfig = require('../config.json');
    
    console.log(`[DEBUG] Counting channel volgens config: ${freshConfig.countingChannel}`);
    
    // Controleer of dit een reactie is in het telkanaal
    if (reaction.message.channel.id === freshConfig.countingChannel) {
        // Bepaal de correcte reactie emoji
        const correctReaction = freshConfig.counting?.correctReaction || '✅';
        
        console.log(`[DEBUG] Reactie verwijderd in telkanaal: ${reaction.emoji.name} door ${user.tag}`);
        console.log(`[DEBUG] Correcte reactie volgens config: ${correctReaction}`);
        
        // Log alle emoji's op het bericht om te zien welke er al zijn
        const currentReactions = reaction.message.reactions.cache;
        console.log(`[DEBUG] Huidige reacties op bericht: ${Array.from(currentReactions.keys()).join(', ')}`);
        
        // Controleer of er al een vinkje is
        const hasCheckmark = reaction.message.reactions.cache.some(r => 
            r.emoji.name === correctReaction || r.emoji.name === '✅');
        
        console.log(`[DEBUG] Bericht heeft al een vinkje: ${hasCheckmark}`);
        
        // Als er al een vinkje is, hoeven we niets te doen
        if (hasCheckmark) {
            console.log(`[DEBUG] Geen actie nodig, bericht heeft al een vinkje`);
            return;
        }
        
        // Controleer of het een verwijderd vinkje was of een relevante emoji
        if (['✅', '✓', '☑', '☑️', '✓️', '✔️', '✔', correctReaction].includes(reaction.emoji.name)) {
            console.log(`[DEBUG] Vinkje-achtige emoji verwijderd: ${reaction.emoji.name}`);
            
            // Controleer of het bericht een geldig getal is
            const messageContent = reaction.message.content.trim();
            const number = parseInt(messageContent);
            
            if (!isNaN(number)) {
                console.log(`[DEBUG] Vinkje herstellen op geldig telbericht: ${number}`);
                
                // DIRECT vinkje toevoegen, zonder controles op bestaande vinkjes
                try {
                    // Gebruik Unicode emoji want dat werkt altijd
                    await reaction.message.react('✅');
                    console.log(`[DEBUG] Unicode vinkje (✅) succesvol toegevoegd aan bericht ${reaction.message.id}`);
                } catch (reactError) {
                    console.error(`[ERROR] Kon unicode vinkje niet toevoegen:`, reactError);
                    
                    // Als laatste redmiddel, andere emoji's proberen
                    try {
                        await reaction.message.react('✔️');
                        console.log(`[DEBUG] Alternatief vinkje (✔️) succesvol toegevoegd`);
                    } catch (altError) {
                        console.error(`[ERROR] Kon ook alternatief vinkje niet toevoegen:`, altError);
                    }
                }
            } else {
                console.log(`[DEBUG] Geen geldig getal in bericht: "${messageContent}"`);
            }
        } else {
            console.log(`[DEBUG] Verwijderde reactie was geen vinkje-achtige emoji, maar: ${reaction.emoji.name}`);
        }
    } else {
        console.log(`[DEBUG] Reactie verwijderd in ander kanaal: ${reaction.message.channel.id} (niet het telkanaal)`);
    }
}); 