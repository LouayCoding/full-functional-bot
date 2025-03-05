const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { footerText, embedColor } = require('../../config.json');

module.exports = {
  name: 'trending',
  description: 'Bekijk de meest trending cryptocurrencies',
  type: ApplicationCommandType.ChatInput,
  run: async (client, interaction) => {
    try {
      // Haal trending munten op van CoinGecko
      const response = await axios.get('https://api.coingecko.com/api/v3/search/trending');
      const trendingCoins = response.data.coins;

      if (!trendingCoins || trendingCoins.length === 0) {
        return interaction.reply({
          content: 'Er zijn op dit moment geen trending munten beschikbaar.',
          ephemeral: true,
        });
      }

      // Haal prijzen op voor de trending munten in USD
      const coinIds = trendingCoins.slice(0, 5).map((coin) => coin.item.id).join(',');
      const pricesResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: coinIds,
          vs_currencies: 'usd',
        },
      });

      const prices = pricesResponse.data;

      const embed = new EmbedBuilder()
        .setTitle('Trending Cryptocurrencies')
        .setDescription(
          trendingCoins
            .slice(0, 5)
            .map((coin, index) => {
              const price = prices[coin.item.id]?.usd;
              return `${index + 1}. **${coin.item.name} (${coin.item.symbol.toUpperCase()})**
                - Rank: ${coin.item.market_cap_rank}
                - Price: $${price ? price.toFixed(2) : 'N/A'}`;
            })
            .join('\n\n')
        )
        .setColor(embedColor)
        .setFooter({ text: footerText })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching trending coins:', error);
      return interaction.reply({
        content: 'Er is iets misgegaan bij het ophalen van de trending munten. Probeer het later opnieuw.',
        ephemeral: true,
      });
    }
  },
};
