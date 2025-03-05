const { EmbedBuilder } = require('discord.js');
const { embedColor } = require('../../config.json')

module.exports = {
    name: 'membercount',
    description: "Toon het totale aantal leden in de server!",
    run: async (client, interaction) => {
        const memberCount = interaction.guild.memberCount;

        const embed = new EmbedBuilder()
            .setDescription(`We hebben momenteel **${memberCount} leden** in de server!`)
            .setColor(embedColor)

        return interaction.reply({ embeds: [embed] });
    }
};
