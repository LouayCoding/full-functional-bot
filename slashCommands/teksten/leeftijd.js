const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embedColor } = require('../../config.json');

module.exports = {
    name: 'leeftijd',
    description: "Selecteer je leeftijdsgroep door op een knop te klikken",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        const guild = client.guilds.cache.get(interaction.guildId);

        // Leeftijdsgroepen en bijbehorende rollen
        const ageGroups = [
            { name: '13-15 jaar', roleId: '1331971902498930693' },
            { name: '16-18 jaar', roleId: '1331971902498930694' },
            { name: '18+ jaar', roleId: '1331971902498930695' }
        ];

        // Embed voor leeftijdselectie
        const embed = new EmbedBuilder()
            .setTitle('Selecteer je leeftijdsgroep')
            .setDescription('Klik op de knop van je leeftijdsgroep om een rol te krijgen. Klik nogmaals om de rol te verwijderen.')
            .setColor(embedColor);

        // Maak knoppen aan voor elke leeftijdsgroep
        const row = new ActionRowBuilder();

        ageGroups.forEach((group) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`age_${group.roleId}`)  // Gebruik rol-ID in CustomId voor identificatie
                    .setLabel(group.name)
                    .setStyle(ButtonStyle.Secondary)
            );
        });

        // Verstuur het embed-bericht met knoppen
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};
