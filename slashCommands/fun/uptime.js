const { EmbedBuilder, ApplicationCommandType } = require('discord.js');
const { footerText, embedColor } = require('../../config.json')

module.exports = {
    name: 'uptime',
    description: "Toon de uptime van de bot.",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        // Bereken de uptime
        const totalSeconds = Math.floor(client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Maak een paarse embed met de uptime-informatie
        const uptimeEmbed = new EmbedBuilder()
            .setTitle('Bot Uptime')
            .setColor(embedColor)
            .setDescription(`De bot is online voor: **${uptime}**`)
            .setTimestamp()
            .setFooter({ text: footerText });

        // Stuur de embed als reactie
        return interaction.reply({ embeds: [uptimeEmbed] });
    }
};
