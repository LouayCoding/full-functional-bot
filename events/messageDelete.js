const { EmbedBuilder } = require('discord.js');
const client = require('..');
const config = require('../config.json');

// Map om verwijderde berichten op te slaan per kanaal
const snipes = new Map();
// Map om verwijderde berichten in het telkanaal bij te houden
const countingDeletedMessages = new Map();

client.on('messageDelete', async message => {
    // Sla het verwijderde bericht op voor snipe command
    if (!message.author?.bot) {
        snipes.set(message.channel.id, {
            content: message.content,
            author: message.author,
            timestamp: Date.now(),
            attachments: message.attachments.first() ? message.attachments.first().proxyURL : null
        });

        // Verwijder het bericht na 5 minuten uit de cache
        setTimeout(() => {
            const snipedMessage = snipes.get(message.channel.id);
            if (snipedMessage && snipedMessage.timestamp === Date.now()) {
                snipes.delete(message.channel.id);
            }
        }, 300000); // 5 minuten
        
        // NIEUW: Controleer of dit een bericht in het telkanaal is
        if (message.channel.id === config.countingChannel) {
            // Controleer of het een getal was
            const messageContent = message.content.trim();
            const number = parseInt(messageContent);
            
            if (!isNaN(number)) {
                console.log(`Verwijderd bericht gedetecteerd in telkanaal: ${message.author.tag} verwijderde nummer ${number}`);
                
                // In plaats van een waarschuwingsbericht te sturen, plaatst de bot het nummer opnieuw
                try {
                    // Stuur hetzelfde nummer opnieuw, maar nu als bot-bericht
                    const botMessage = await message.channel.send(`${number}`);
                    
                    // Voeg het vinkje toe aan het nieuwe bericht
                    await botMessage.react('✅');
                    
                    console.log(`Bot heeft verwijderd nummer ${number} opnieuw geplaatst met een vinkje`);
                } catch (error) {
                    console.error('Kon verwijderd nummer niet opnieuw plaatsen:', error);
                }
            }
        }
    }

    // Log kanaal functionaliteit
    if (!message.guild || message?.author?.bot) return;
    const logChannel = client.channels.cache.get(config.messageDeleteChannel);

    if (logChannel) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription(
                `Bericht verzonden door ${message.author.tag} verwijderd in ${message.channel}\n\n**Inhoud:**\n${message.content || '*Geen tekst*'}`
            )
            .setFooter({
                text: `ID: ${message.author.id}`
            })
            .setColor('#252a36');

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                embed.setImage(attachment.proxyURL);
            }
        }

        await logChannel.send({ embeds: [embed] }).catch(console.error);
    }
});

// Exporteer alleen de snipes map voor de snipe command
module.exports = { snipes };
