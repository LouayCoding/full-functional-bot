const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { footerText, embedColor } = require('../../config.json')

module.exports = {
  name: 'prijs',
  description: 'Bekijk de prijs van een cryptocurrency',
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'crypto',
      description: 'De naam of symbool van de cryptocurrency (bijv. bitcoin of BTC)',
      type: 3, // String
      required: true,
    },
    {
      name: 'valuta',
      description: 'De fiat-valuta waarin je de prijs wilt zien (bijv. USD, EUR)',
      type: 3, // String
      required: false,
    },
  ],
  run: async (client, interaction) => {
    const crypto = interaction.options.getString('crypto');
    const fiat = interaction.options.getString('valuta') || 'usd'; // Standaard naar USD

    try {
      // CoinGecko API-aanroep
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${crypto.toLowerCase()}`
      );

      const coinData = response.data;
      const price = coinData.market_data.current_price[fiat.toLowerCase()];
      const iconUrl = coinData.image.thumb; // Kleine versie van het icoon
      const coinName = coinData.name;
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${coinName}`, iconURL: iconUrl })
        .setDescription(
          `De huidige prijs van **${coinName}** is **${formattedPrice} ${fiat.toUpperCase()}**.`
        )
        .setColor(embedColor)
        .setFooter({ text: footerText })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching price or coin data:', error);
      return interaction.reply({
        content: 'Er is iets misgegaan bij het ophalen van de prijs of coin-gegevens. Controleer de naam en probeer opnieuw.',
        ephemeral: true,
      });
    }
  },
};
