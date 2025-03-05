const { EmbedBuilder } = require('discord.js');
const { embedColor } = require('../config');

module.exports = {
    id: 'betaal',
    permissions: [],
    run: async (client, interaction) => {
        try {
            console.log('Betaal button aangeroepen met ID:', interaction.customId);
            
            // Extracteer de gegevens uit de customId
            // Format: betaal_verzoekId_bedrag_aanvragerId
            const [, verzoekId, bedragString, aanvragerId] = interaction.customId.split('_');
            console.log('Geëxtraheerde gegevens:', { verzoekId, bedragString, aanvragerId });
            
            const bedrag = parseInt(bedragString);
            const aanvrager = await client.users.fetch(aanvragerId);
            const betaler = interaction.user;
            
            console.log('Aanvrager:', aanvrager?.tag);
            console.log('Betaler:', betaler?.tag);
            
            // Controleer of de betaler niet de aanvrager is
            if (betaler.id === aanvragerId) {
                return interaction.reply({
                    content: 'Je kunt je eigen betaalverzoek niet betalen!',
                    ephemeral: true
                });
            }
            
            // Haal bericht info op
            const message = interaction.message;
            const embedData = message.embeds[0];
            
            // Veiliger manier om de reden te extraheren
            let reden = "Geen reden opgegeven";
            try {
                const beschrijving = embedData.description || "";
                if (beschrijving.includes("**Reden:**")) {
                    const redenSplit = beschrijving.split("**Reden:** ")[1];
                    if (redenSplit) {
                        reden = redenSplit.split("\n\n")[0] || reden;
                    }
                }
                console.log('Geëxtraheerde reden:', reden);
            } catch (e) {
                console.error('Fout bij extraheren reden:', e);
                // Gebruik de fallback waarde
            }
            
            // Haal betalende gebruiker op
            const betalerGebruiker = client.eco.cache.users.get({
                memberID: betaler.id,
                guildID: interaction.guild.id
            });
            
            if (!betalerGebruiker) {
                console.log(`Gebruiker niet gevonden in economy system: ${betaler.tag}`);
                return interaction.reply({
                    content: 'Je hebt nog geen account in het economiesysteem. Verdien eerst wat geld voordat je betalingen kunt doen.',
                    ephemeral: true
                });
            }
            
            // Haal directe balans op
            const betalerBalance = await betalerGebruiker.balance.get();
            console.log('Balans van betaler:', betalerBalance);
            
            // Haal ontvangende gebruiker op
            const aanvragerGebruiker = client.eco.cache.users.get({
                memberID: aanvrager.id,
                guildID: interaction.guild.id
            });
            
            if (!aanvragerGebruiker) {
                console.log(`Ontvanger niet gevonden in economy system: ${aanvrager.tag}`);
                return interaction.reply({
                    content: 'De ontvanger heeft nog geen account in het economiesysteem.',
                    ephemeral: true
                });
            }
            
            // Controleer of de gebruiker genoeg saldo heeft
            if (betalerBalance < bedrag) {
                return interaction.reply({
                    content: `Je hebt niet genoeg euro om dit betaalverzoek te voldoen. Je hebt ${betalerBalance} euro, maar je hebt ${bedrag} euro nodig.`,
                    ephemeral: true
                });
            }
            
            // Toon laadstatus
            await interaction.deferUpdate();
            console.log('Interactie gedeferred');
            
            // Voer de transfer uit
            const transferResult = await aanvragerGebruiker.balance.transfer({
                amount: bedrag,
                senderMemberID: betaler.id,
                sendingReason: `Betaald voor tikkie van ${aanvrager.tag}. Reden: ${reden}`,
                receivingReason: `Ontvangen van tikkie betaald door ${betaler.tag}. Reden: ${reden}`
            });
            console.log('Transfer uitgevoerd:', transferResult);
            
            // Update het bericht met de succesvolle betaling
            const betaalEmbed = new EmbedBuilder()
                .setAuthor({ name: `Betaalverzoek voldaan! ✅`, iconURL: betaler.displayAvatarURL() })
                .setDescription(`**${betaler.username}** heeft het tikkie van **${aanvrager.username}** betaald!`)
                .addFields(
                    { name: 'Bedrag', value: `€${transferResult.amount}`, inline: true },
                    { name: 'Reden', value: reden, inline: true }
                )
                .setThumbnail('https://play-lh.googleusercontent.com/PN68IUh5DjvRYw5JgnNCdIW0MW6rjWbEijadm6NjDFjR5ndqba4Sxj053101Lt7Few')
                .setColor('Green')
                .setFooter({ text: `Transactie ID: ${verzoekId}` })
                .setTimestamp();
            
            // Update het oorspronkelijke bericht
            try {
                await interaction.editReply({ embeds: [betaalEmbed], components: [] });
                console.log('Oorspronkelijk bericht bijgewerkt');
            } catch (error) {
                console.error('Fout bij bijwerken bericht:', error);
            }
            
            // Stuur een bericht in het kanaal dat het tikkie is betaald
            try {
                const channelNotificatieEmbed = new EmbedBuilder()
                    .setAuthor({ name: `Tikkie Betaald ✅`, iconURL: betaler.displayAvatarURL() })
                    .setDescription(`**${betaler.username}** heeft het tikkie van **${aanvrager.username}** betaald!`)
                    .addFields(
                        { name: 'Bedrag', value: `€${transferResult.amount}`, inline: true },
                        { name: 'Reden', value: reden, inline: true }
                    )
                    .setColor('Green')
                    .setTimestamp();
                
                await interaction.channel.send({ 
                    content: `${aanvrager}`, 
                    embeds: [channelNotificatieEmbed] 
                });
                console.log('Kanaal notificatie verstuurd');
            } catch (error) {
                console.error('Fout bij versturen kanaal notificatie:', error);
            }
            
            // Stuur een DM naar de aanvrager
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('💰 Je tikkie is betaald!')
                    .setDescription(`**${betaler.username}** heeft je tikkie van **€${transferResult.amount}** betaald!`)
                    .addFields(
                        { name: 'Reden', value: reden },
                        { name: 'Betaald door', value: betaler.tag },
                        { name: 'Server', value: interaction.guild.name }
                    )
                    .setColor('Green')
                    .setTimestamp();
                
                await aanvrager.send({ embeds: [dmEmbed] }).catch((e) => {
                    console.log(`Kon geen DM sturen naar ${aanvrager.tag}: ${e.message}`);
                });
                console.log('DM verstuurd naar aanvrager');
            } catch (e) {
                console.error('Fout bij het sturen van DM:', e);
            }
            
        } catch (error) {
            console.error('Fout bij het verwerken van betaalverzoek:', error);
            try {
                return interaction.reply({
                    content: 'Er is een fout opgetreden bij het verwerken van de betaling. Probeer het later opnieuw.',
                    ephemeral: true
                });
            } catch(replyError) {
                try {
                    return interaction.followUp({
                        content: 'Er is een fout opgetreden bij het verwerken van de betaling. Probeer het later opnieuw.',
                        ephemeral: true
                    });
                } catch(followUpError) {
                    console.error('Kon niet reageren op interactie na fout:', followUpError);
                }
            }
        }
    }
}; 