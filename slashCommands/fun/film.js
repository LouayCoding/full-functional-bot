const { ButtonStyle, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { embedColor, footerText } = require('../../config.json')

module.exports = {
    name: 'film',
    description: "Zoek naar films of series en bekijk details!",
    options: [
        {
            name: 'titel',
            description: 'Voer de naam van de film of serie in die je wilt zoeken.',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    run: async (client, interaction) => {
        const titel = interaction.options.getString('titel');
        const apiKey = 'aae853390cbe83787f23c19ac39a0db1'; // Vervang door je eigen TMDb API-sleutel

        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(titel)}`)
            .then(response => response.json())
            .then(movieInfoo => {
                // Verwerk de verkregen gegevens
                let movieInfo = movieInfoo.results[0];
                console.log(movieInfo);

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Bekijk deze film')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://vidsrc.icu/embed/movie/${movieInfo.id}`)
                    );

                const embed = new EmbedBuilder()
                    .setTitle(movieInfo.title)
                    .setDescription(movieInfo.overview || "Geen beschrijving beschikbaar.")
                    .setImage(`https://image.tmdb.org/t/p/original${movieInfo.poster_path}`)
                    .setColor(embedColor)
                    .setTimestamp()
                    .setFooter({ text: footerText })

                interaction.reply({ embeds: [embed], components: [row] });
            })
            .catch(error => {
                // Afhandeling van fouten
                console.error('Error:', error);
                interaction.reply({ content: "Er ging iets mis bij het ophalen van de filmgegevens. Probeer het opnieuw.", ephemeral: true });
            });
    }
};
