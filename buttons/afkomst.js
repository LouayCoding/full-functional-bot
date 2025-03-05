const { EmbedBuilder } = require('discord.js');
const Land = require('../models/Land');
const { getLandenLijst } = require('../utils/landRollen');

module.exports = {
    customId: /^(country|special_country)/,
    
    async run(client, interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const customId = interaction.customId;
            
            // Controleer of het een speciale landknop is
            if (customId.startsWith('special_country_')) {
                const landNaam = customId.replace('special_country_', '');
                const { specialLands } = getLandenLijst();
                
                // Zoek het speciale land in de lijst
                const specialLand = specialLands.find(land => land.name === landNaam);
                
                if (specialLand) {
                    // Stuur een bericht dat het geen erkend land is
                    return await interaction.editReply({ 
                        content: `⚠️ ${specialLand.message || `${specialLand.name} is geen erkend land.`}`,
                        ephemeral: true 
                    });
                } else {
                    return await interaction.editReply({ 
                        content: `❌ Onbekend speciaal land.`,
                        ephemeral: true 
                    });
                }
            }
            
            // Normale land rol toewijzen/verwijderen
            if (customId.startsWith('country_')) {
                const roleId = customId.replace('country_', '');
                const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
                
                if (!role) {
                    return await interaction.editReply({
                        content: '❌ Deze rol bestaat niet meer.',
                        ephemeral: true
                    });
                }
                
                const member = interaction.member;
                
                // Zoek het land in de database
                const landRecord = await Land.findOne({ roleId });
                const landInfo = landRecord ? 
                    `${landRecord.emoji} ${landRecord.name}` : 
                    role.name;
                
                // Controleer of de gebruiker de rol al heeft
                if (member.roles.cache.has(role.id)) {
                    // Verwijder de rol
                    await member.roles.remove(role);
                    return await interaction.editReply({
                        content: `✅ Je hebt de ${landInfo} rol verwijderd.`,
                        ephemeral: true
                    });
                } else {
                    // Voeg de rol toe
                    await member.roles.add(role);
                    return await interaction.editReply({
                        content: `✅ Je hebt de ${landInfo} rol gekregen.`,
                        ephemeral: true
                    });
                }
            }
            
        } catch (error) {
            console.error('Fout bij het verwerken van afkomst knop:', error);
            return await interaction.editReply({
                content: '❌ Er is een fout opgetreden.',
                ephemeral: true
            }).catch(console.error);
        }
    }
}; 