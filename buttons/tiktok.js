module.exports = {
    id: 'tiktok',  // Dit id-veld moet overeenkomen met de prefix van je CustomId (in dit geval `tiktok`)
    async run(client, interaction) {
        try {
            // Haal de actie en URL op uit de customId
            const [_, action, encodedUrl] = interaction.customId.split('_');
            const url = decodeURIComponent(encodedUrl);
            
            if (action === 'view') {
                // Stuur een ephemeral bericht met de originele URL
                await interaction.reply({ 
                    content: `Hier is de originele TikTok link: ${url}`, 
                    ephemeral: true 
                });
            } else if (action === 'delete') {
                // Controleer of de gebruiker de eigenaar is van het bericht of moderator rechten heeft
                const message = interaction.message;
                
                // Controleer of de gebruiker een mod is
                const isMod = interaction.member.roles.cache.some(role => 
                    client.config.modRoles.includes(role.id)
                );
                
                // Verkrijg de mentions in het bericht om de originele poster te identificeren
                const mentionedUser = message.mentions.users.first();
                const isOriginalPoster = mentionedUser && mentionedUser.id === interaction.user.id;
                
                if (isOriginalPoster || isMod) {
                    await message.delete().catch(err => {
                        console.error('Kon bericht niet verwijderen:', err);
                        interaction.reply({ 
                            content: 'Er is een fout opgetreden bij het verwijderen van het bericht.', 
                            ephemeral: true 
                        });
                    });
                    
                    // Als we hier komen en geen error hebben, is het bericht verwijderd
                    // We hoeven niets te doen want het originele bericht is nu weg
                } else {
                    await interaction.reply({ 
                        content: 'Je hebt geen toestemming om dit bericht te verwijderen.', 
                        ephemeral: true 
                    });
                }
            }
        } catch (error) {
            console.error('Fout in TikTok button handler:', error);
            await interaction.reply({ 
                content: 'Er is een fout opgetreden bij het verwerken van deze actie.', 
                ephemeral: true 
            });
        }
    }
}; 