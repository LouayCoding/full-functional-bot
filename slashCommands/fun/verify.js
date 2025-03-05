const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { verifyChannel, embedColor } = require('../../config.json');

module.exports = {
    name: 'verify',
    description: "Stuur een verificatiebericht in het verificatiekanaal",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        const guild = client.guilds.cache.get(interaction.guildId);
        const verificationChannel = guild.channels.cache.get(verifyChannel);
        const serverIcon = guild.iconURL(); // Server logo als thumbnail

        // Embed voor het verificatiebericht
        const embed = new EmbedBuilder()
            .setTitle('Verificatie')
            .setDescription('Klik op de knop **verifieren** om jezelf te verifiëren en toegang te krijgen tot de server. Klik op **waarom?** voor meer informatie over de verificatie.')
            .setThumbnail(serverIcon)
            .setColor(embedColor);

        // Knoppen voor Verifieren en Waarom
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('Verifieren')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('why_button')
                    .setLabel('Waarom?')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Verstuur het embed-bericht in het verificatiekanaal
        await verificationChannel.send({ embeds: [embed], components: [row] });
    }
};
