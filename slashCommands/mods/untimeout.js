const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'untimeout',
    description: "Verwijder de timeout van een gebruiker.",
    options: [
        {
            name: 'gebruiker',
            description: 'Selecteer de gebruiker waarvan je de timeout wilt verwijderen.',
            type: ApplicationCommandOptionType.User,
            required: true,
        }
    ],
    run: async (client, interaction) => {
        const targetUser = interaction.options.getUser('gebruiker');
        const moderator = interaction.user;
        const logChannelId = '1299059030114959548'; // Vervang dit door je logkanaal-ID

        try {
            const targetMember = await interaction.guild.members.fetch(targetUser.id);

            // Verwijder de timeout
            await targetMember.timeout(null);

            // Log de verwijderde timeout in het logkanaal
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            const logEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Timeout Verwijderd - ${targetUser.tag}`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setColor('#57F287') // Discord groen
                .addFields(
                    { name: 'Gebruiker', value: `${targetUser.tag}`, inline: true },
                    { name: 'Moderator', value: `${moderator.tag}`, inline: true }
                )
                .setFooter({ text: `Gebruiker ID: ${targetUser.id}` })
                .setTimestamp();

            if (logChannel) logChannel.send({ embeds: [logEmbed] });

            // Stuur een DM naar de gebruiker om te laten weten dat de timeout is verwijderd
            const dmEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Je timeout in ${interaction.guild.name} is verwijderd`,
                    iconURL: interaction.guild.iconURL()
                })
                .setColor('#57F287') // Groen om aan te geven dat de timeout is verwijderd
                .setFooter({ text: `Gebruiker ID: ${targetUser.id}` })
                .setTimestamp();

            try {
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.error("Kan geen DM sturen naar de gebruiker:", dmError);
            }

            return interaction.reply({ content: `De timeout van ${targetUser.tag} is succesvol verwijderd.`, ephemeral: true });

        } catch (error) {
            console.error("Error bij het verwijderen van de timeout:", error);
            return interaction.reply({ content: "Er is een fout opgetreden bij het verwijderen van de timeout. Controleer mijn machtigingen en probeer het opnieuw.", ephemeral: true });
        }
    }
};
