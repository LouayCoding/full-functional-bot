const { EmbedBuilder, ApplicationCommandType } = require('discord.js');

module.exports = {
    name: 'randomcolor',
    description: "Genereer een willekeurige hex-kleur en bekijk een voorbeeld.",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        // Genereer een willekeurige hex-kleur
        const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

        // Maak een embed met de gegenereerde kleur
        const colorEmbed = new EmbedBuilder()
            .setDescription(`Hex-kleur: **${randomColor}**`)
            .setColor(randomColor) // Stel de embed-kleur in op de gegenereerde kleur


        // Stuur de embed als reactie
        return interaction.reply({ embeds: [colorEmbed] });
    }
};
