const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const client = require('..');
const config = require('../config.json');

client.on('messageUpdate', async (oldMessage, newMessage) => {
    // Controleer of het bericht afkomstig is uit een tekstkanaal, niet van een bot, en daadwerkelijk is gewijzigd
    console.log(`[DEBUG] Bericht bewerkt: ${oldMessage.author.tag} veranderde "${oldMessage.content}" naar "${newMessage.content}"`);
    if (!oldMessage.guild || oldMessage?.author?.bot || oldMessage.content === newMessage.content) return;

    // NIEUW: Controleer of dit een bericht is in het telkanaal
    if (oldMessage.channel.id === config.countingChannel) {
        console.log(`[DEBUG] Telling bericht bewerkt: ${oldMessage.author.tag} veranderde "${oldMessage.content}" naar "${newMessage.content}"`);
        
        // Controleer of de oude inhoud een getal was
        const oldContent = oldMessage.content.trim();
        const oldNumber = parseInt(oldContent);
        const wasNumber = !isNaN(oldNumber);
        
        // Controleer of de nieuwe inhoud een getal is
        const newContent = newMessage.content.trim();
        const newNumber = parseInt(newContent);
        const isNumber = !isNaN(newNumber);
        
        console.log(`[DEBUG] Bewerkt bericht info: wasNumber=${wasNumber}, isNumber=${isNumber}, oldNumber=${oldNumber}, newNumber=${newNumber}`);
        
        // Controleer bot permissies
        const botMember = oldMessage.guild.members.cache.get(client.user.id);
        const hasManageMessages = botMember.permissions.has(PermissionsBitField.Flags.MANAGE_MESSAGES);
        
        // Probeer rechtstreeks de kanaal permissies te checken
        let hasChannelManageMessages = false;
        try {
            // Direct fetch permissions voor dit specifieke kanaal
            const channelPermissions = oldMessage.channel.permissionsFor(client.user.id);
            hasChannelManageMessages = channelPermissions.has(PermissionsBitField.Flags.MANAGE_MESSAGES);
            console.log(`[DEBUG] Rechstreekse kanaal permissie check voor MANAGE_MESSAGES: ${hasChannelManageMessages}`);
        } catch (permError) {
            console.error(`[ERROR] Probleem bij checken kanaal permissies:`, permError);
        }
        
        console.log(`[DEBUG] Bot permissies: Global MANAGE_MESSAGES=${hasManageMessages}, In kanaal MANAGE_MESSAGES=${hasChannelManageMessages}`);
        console.log(`[DEBUG] Bericht eigenaar ID: ${newMessage.author.id}, Bot ID: ${client.user.id}`);
        
        // Als het bericht veranderd is en het een getal bevat (zowel oud als nieuw), neem actie
        if (isNumber) {
            try {
                // NIEUW: Laad de huidige telling status om te bepalen of dit het juiste nummer is
                try {
                    // Probeer de huidige status van het counting systeem te laden
                    const countingData = await require('../models/Counting').findOne({});
                    if (countingData) {
                        const currentNumber = countingData.currentNumber;
                        console.log(`[DEBUG] Huidige teller: ${currentNumber}, verwachte volgende nummer: ${currentNumber + 1}`);
                        
                        // Controleer of het gewijzigde nummer het juiste volgende nummer is
                        if (newNumber !== currentNumber + 1) {
                            console.log(`[DEBUG] Gewijzigd nummer ${newNumber} is niet het verwachte volgende nummer ${currentNumber + 1}`);
                            
                            // Verwijder het bewerkte bericht zonder een nieuw bericht te sturen
                            if (hasChannelManageMessages) {
                                try {
                                    await newMessage.delete();
                                    console.log(`[DEBUG] Onjuist bewerkt bericht verwijderd`);
                                    return; // Stop verdere verwerking
                                } catch (deleteError) {
                                    console.error(`[ERROR] Kon onjuist bewerkt bericht niet verwijderen:`, deleteError);
                                }
                            }
                            return; // Stop verdere verwerking ook als het bericht niet verwijderd kon worden
                        }
                    }
                } catch (loadError) {
                    console.error(`[ERROR] Probleem bij laden van telling status:`, loadError);
                }
                
                // Als we hier komen, is het nummer correct of konden we niet laden
                // Stuur eerst een nieuw bericht - dit doen we altijd, ongeacht of we het oude kunnen verwijderen
                const botMessage = await newMessage.channel.send(`${newNumber}`);
                console.log(`[DEBUG] Bot bericht verstuurd met ID: ${botMessage.id}`);
                
                // Voeg direct het vinkje toe aan het nieuwe bericht
                await botMessage.react('✅');
                console.log(`[DEBUG] Vinkje toegevoegd aan bot bericht`);
                
                // Probeer het originele bericht te verwijderen
                console.log(`[DEBUG] Poging tot verwijderen bericht ${newMessage.id}`);
                
                // Controleer eerst of we rechten hebben
                if (!hasChannelManageMessages && newMessage.author.id !== client.user.id) {
                    console.log(`[WARN] Bot heeft geen MANAGE_MESSAGES permissie in dit kanaal - kan bericht niet verwijderen`);
                    // Geen waarschuwingsberichten meer
                } else {
                    // We hebben de permissies, probeer te verwijderen
                    try {
                        await newMessage.delete();
                        console.log(`[DEBUG] Bericht succesvol verwijderd!`);
                    } catch (deleteError) {
                        console.error(`[ERROR] Kon bericht niet verwijderen ondanks schijnbare permissies:`, deleteError);
                        // Geen waarschuwingsberichten meer
                    }
                }
                
                // Voeg het vinkje weer toe zonder waarschuwingsbericht
                try {
                    await botMessage.react('✅');
                } catch (error) {
                    console.error('Kon reactie niet herstellen:', error);
                }
            } catch (error) {
                console.error(`[ERROR] Algemene fout bij verwerken bewerkt bericht: ${error.message}`);
                console.error(`[ERROR] Error stack: ${error.stack}`);
            }
        }
    }

    // Logkanaal-ID (vervang door je logkanaal-ID)
    const logChannel = client.channels.cache.get('1299059030114959548');

    if (logChannel) {
        // Maak de embed voor het logbericht
        const embed = new EmbedBuilder()
            .setAuthor({
                name: oldMessage.author.tag,
                iconURL: oldMessage.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`Bericht bewerkt in ${oldMessage.channel}\n\n**Voor:**\n${oldMessage.content || '*Geen tekst*'}\n\n**Na:**\n${newMessage.content || '*Geen tekst*'}`)
            .setFooter({
                text: `ID: ${oldMessage.author.id}`
            })
            .setColor('Purple'); // Paarse kleur voor de embed

        // Voeg een knop toe om naar het originele bericht te gaan
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ga naar bericht')
                    .setStyle(ButtonStyle.Link)
                    .setURL(newMessage.url)
            );

        // Stuur de embed met de knop naar het logkanaal
        logChannel.send({ embeds: [embed], components: [row] }).catch(console.error);
    }
});

