// commands/voicehours.js
const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const VoiceUser = require('../../models/VoiceUser');
const { embedColor, footerText } = require('../../config.json');

module.exports = {
    name: 'voicehours',
    description: "Bekijk je totale tijd in voice channels.",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        const userId = interaction.user.id;

        const userRecord = await VoiceUser.findOne({ userId });
        if (!userRecord) {
            return interaction.reply({ content: "Je hebt nog geen tijd doorgebracht in voice channels.", ephemeral: true });
        }

        const totalVoiceTime = userRecord.totalVoiceTime;
        const hours = Math.floor(totalVoiceTime / 3600);
        const minutes = Math.floor((totalVoiceTime % 3600) / 60);
        const seconds = Math.floor(totalVoiceTime % 60); // Zorgt ervoor dat seconden geen decimalen hebben

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${interaction.user.username}'s Voice Hours`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`Totale tijd in voice: **${hours} uur, ${minutes} minuten, en ${seconds} seconden**`)
            .setColor(embedColor)
            .setFooter({ text: footerText })
            .setTimestamp();

        interaction.reply({ embeds: [embed] });
    },
};
