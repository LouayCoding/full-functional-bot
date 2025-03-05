const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { embedColor } = require('../../config.json');
module.exports = {
    name: 'gebedstijden',
    description: 'Bekijk de gebedstijden voor jouw stad',
    options: [
        {
            name: 'stad',
            description: 'Voer je stad in',
            type: 3,
            required: true
        }
    ],

    run: async (client, interaction) => {
        await interaction.deferReply();
        
        const stad = interaction.options.getString('stad');
        
        try {
            const response = await axios.get(`http://api.aladhan.com/v1/timingsByCity`, {
                params: {
                    city: stad,
                    country: 'NL',
                    method: 2, // Muslim World League methode
                    school: 0, // Hanafi berekeningswijze
                    adjustment: -1 // Kleine tijdcorrectie
                }
            });

            const timings = response.data.data.timings;
            
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`Gebedstijden voor ${stad}`)
                .addFields(
                    { name: 'Fajr', value: timings.Fajr, inline: true },
                    { name: 'Zonsopgang', value: timings.Sunrise, inline: true },
                    { name: 'Dhuhr', value: timings.Dhuhr, inline: true },
                    { name: 'Asr', value: timings.Asr, inline: true }, 
                    { name: 'Maghrib', value: timings.Maghrib, inline: true },
                    { name: 'Isha', value: timings.Isha, inline: true }
                )
                .setFooter({ text: 'Bot is gebaseerd op Islamic Society of North America (ISNA) & Hanafi School' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error(error);
            await interaction.editReply('Er is een fout opgetreden bij het ophalen van de gebedstijden. Controleer of je de juiste stadsnaam hebt ingevoerd.');
        }
    },
};
