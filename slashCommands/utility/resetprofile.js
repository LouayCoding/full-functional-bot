const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { embedColor } = require('../../config.json');

module.exports = {
    name: 'resetprofile',
    description: "Reset het profiel van de bot naar de originele instellingen",
    options: [
        {
            name: 'avatar',
            description: 'De nieuwe profielfoto voor de bot (URL of upload)',
            type: 11, // Type 11 is voor attachments
            required: true
        }
    ],
    run: async (client, interaction) => {
        // Check permissies
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "Je hebt geen administrator permissies om dit commando te gebruiken!",
                ephemeral: true
            });
        }

        try {
            const attachment = interaction.options.getAttachment('avatar');
            
            // Reset nickname naar "Back2Back"
            await interaction.guild.members.me.setNickname("Back2Back");

            // Update profielfoto naar de geüploade afbeelding
            await client.user.setAvatar(attachment.url);

            // Maak embed voor succesvolle reset
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setDescription(`✅ Bot profiel is succesvol gereset naar de originele instellingen!`)
                .addFields(
                    { name: 'Nieuwe naam', value: 'Back2Back', inline: true },
                    { name: 'Profielfoto', value: 'Geüpdatet', inline: true }
                )
                .setImage(attachment.url)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: "Er is een fout opgetreden bij het resetten van het bot profiel.",
                ephemeral: true
            });
        }
    }
}; 