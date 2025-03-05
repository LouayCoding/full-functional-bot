const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embedColor } = require('../../config.json')

module.exports = {
    name: 'ticket',
    description: "Stuur een bericht om een ticket aan te maken",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {

        const category = interaction.guild.channels.cache.get('1332005924839358525');
        console.log(category.type)
        const embed = new EmbedBuilder()
            .setTitle("Open een ticket")
            .setDescription("Klik op de onderstaande knop om een ticket aan te maken. Ons team helpt je zo snel mogelijk verder!")
            .setColor(embedColor);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket') // Moet overeenkomen met de button handler
                    .setLabel('🎟️ Maak een ticket')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.channel.send({ embeds: [embed], components: [row], ephemeral: false });
    },
};
