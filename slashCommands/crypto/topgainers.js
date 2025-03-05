const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { footerText, embedColor } = require('../../config.json');

module.exports = {
  name: 'topgainers',
  description: 'Bekijk de grootste stijgers in de cryptocurrency markt',
  type: ApplicationCommandType.ChatInput,
  run: async (client, interaction) => {
    try {
      // Haal de top stijgers op van CoinGecko
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'price_change_percentage_24h_desc',
          per_page: 5,
          page: 1,
        },
      });

      const topGainers = response.data;

      if (!topGainers || topGainers.length === 0) {
        return interaction.reply({
          content: 'Er zijn op dit moment geen gegevens over de grootste stijgers beschikbaar.',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Top 5 Gainers in de Laatste 24 Uur')
        .setDescription(
          topGainers
            .map((coin, index) => {
              const formattedPrice = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(coin.current_price);

              return `${index + 1}. **${coin.name} (${coin.symbol.toUpperCase()})**
                - Prijs: $${formattedPrice}
                - 24u Verandering: ${coin.price_change_percentage_24h.toFixed(2)}%`;
            })
            .join('\n\n')
        )
        .setColor(embedColor)
        .setFooter({ text: footerText })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching top gainers:', error);
      return interaction.reply({
        content: 'Er is iets misgegaan bij het ophalen van de gegevens over de grootste stijgers. Probeer het later opnieuw.',
        ephemeral: true,
      });
    }
  },
};
