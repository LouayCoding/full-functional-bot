const { ButtonStyle, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

module.exports = {
    name: 'serie',
    description: "Zoek naar series en bekijk details!",
    options: [
        {
            name: 'titel',
            description: 'Voer de naam van de serie in die je wilt zoeken.',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    run: async (client, interaction) => {
        const titel = interaction.options.getString('titel');
        const apiKey = 'aae853390cbe83787f23c19ac39a0db1'; // Vervang door je eigen TMDb API-sleutel

        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(titel)}`)
            .then(response => response.json())
            .then(seriesInfoo => {
                // Controleer of er resultaten zijn
                if (!seriesInfoo.results || seriesInfoo.results.length === 0) {
                    return interaction.reply({ 
                        content: `Geen series gevonden met de titel "${titel}". Probeer een andere zoekopdracht.`, 
                        ephemeral: true 
                    });
                }
                
                let seriesInfo = seriesInfoo.results[0];
                console.log(seriesInfo);

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Bekijk deze serie')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://vidsrc.icu/embed/tv/${seriesInfo.id}/1/1`)
                    );

                const embed = new EmbedBuilder()
                    .setTitle(seriesInfo.name)
                    .setDescription(seriesInfo.overview || "Geen beschrijving beschikbaar.")
                    .setImage(seriesInfo.poster_path ? `https://image.tmdb.org/t/p/original${seriesInfo.poster_path}` : null)
                    .addFields(
                        { name: 'Eerste uitzenddatum', value: seriesInfo.first_air_date || 'Onbekend', inline: true },
                        { name: 'Gemiddelde beoordeling', value: seriesInfo.vote_average?.toString() || 'N.v.t.', inline: true }
                    )
                    .setFooter({ text: "Bron: The Movie Database" })
                    .setTimestamp();

                interaction.reply({ embeds: [embed], components: [row] });
            })
            .catch(error => {
                console.error('Error:', error);
                interaction.reply({ content: "Er ging iets mis bij het ophalen van de seriegegevens. Probeer het opnieuw.", ephemeral: true });
            });
    }
};
