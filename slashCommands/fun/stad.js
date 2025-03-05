const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { embedColor } = require('../../config.json');
const Stad = require('../../models/Stad');
const axios = require('axios');

module.exports = {
    name: 'stad',
    description: "Stel je stad in",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'stad',
            description: 'De stad waar je woont',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        if (!focusedValue) return interaction.respond([]);

        try {
            const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
                params: {
                    input: focusedValue,
                    types: '(cities)',
                    key: process.env.GOOGLE_API_KEY
                }
            });

            const suggestions = response.data.predictions
                .map(prediction => ({
                    name: prediction.description,
                    value: prediction.description
                }))
                .slice(0, 25);

            await interaction.respond(suggestions);
        } catch (error) {
            console.error('Fout bij ophalen stadssuggesties:', error);
            await interaction.respond([]);
        }
    },
    run: async (client, interaction) => {
        const stad = interaction.options.getString('stad');
        
        try {
            await Stad.findOneAndUpdate(
                { userId: interaction.user.id },
                { stad: stad },
                { upsert: true, new: true }
            );

            const embed = new EmbedBuilder()
                .setDescription(`Je stad is ingesteld op **${stad}**!\nJe zult nu elke ochtend om 9:00 een herinnering ontvangen.`)
                .setColor(embedColor)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Fout bij opslaan stad:', error);
            await interaction.reply({ 
                content: 'Er is een fout opgetreden bij het opslaan van je stad.',
                ephemeral: true 
            });
        }
    }
};
