const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { embedColor, footerText } = require('../../config.json')

const API_KEY = process.env.WEATHERSTACK_KEY;

module.exports = {
  name: 'weer',
  description: "Bekijk het weer voor een specifieke locatie",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'plaats',
      description: 'De naam van de stad of het land waarvoor je het weer wilt zien',
      type: 3, // String
      required: true,
    },
  ],
  run: async (client, interaction) => {
    const plaats = interaction.options.getString('plaats');

    try {
      // Haal weergegevens op via de API
      const response = await fetch(
        `http://api.weatherstack.com/current?access_key=${API_KEY}&query=${plaats}`
      );
      const data = await response.json();

      if (!data.location) {
        return await interaction.reply({
          content: `Geen weergegevens gevonden voor "${plaats}". Controleer de naam en probeer het opnieuw.`,
          ephemeral: true,
        });
      }

      // Maak de embed met de weergegevens
      const embed = new EmbedBuilder()
        .setTitle(`Weer in ${data.location.name}, ${data.location.country}`)
        .setColor(embedColor)
        .setThumbnail(data.current.weather_icons[0] || '')
        .addFields(
          { name: 'Temperatuur', value: `${data.current.temperature}°C`, inline: true },
          { name: 'Weersomstandigheden', value: data.current.weather_descriptions[0], inline: true },
          { name: 'Wind', value: `${data.current.wind_speed} km/h (${data.current.wind_dir})`, inline: true },
          { name: 'Luchtvochtigheid', value: `${data.current.humidity}%`, inline: true },
          { name: 'Bewolking', value: `${data.current.cloudcover}%`, inline: true }
        )
        .setFooter({ text: footerText })
        .setTimestamp();

      // Stuur de embed als reactie
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'Er is een fout opgetreden bij het ophalen van het weer. Probeer het later opnieuw.',
        ephemeral: true,
      });
    }
  },
};
