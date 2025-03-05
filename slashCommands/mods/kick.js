const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'kick',
    description: "Kick een gebruiker van de server.",
    options: [
        {
            name: 'gebruiker',
            description: 'Selecteer de gebruiker die je wilt kicken.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'reden',
            description: 'De reden voor de kick.',
            type: ApplicationCommandOptionType.String,
            required: false,
        }
    ],
    run: async (client, interaction) => {
        const targetUser = interaction.options.getUser('gebruiker');
        const reason = interaction.options.getString('reden') || 'Geen reden opgegeven';
        const moderator = interaction.user;
        const logChannelId = '1299059030114959545'; // Zet je log kanaal ID hier

        try {
            const targetMember = await interaction.guild.members.fetch(targetUser.id);

            // Controleer of de gebruiker kicken is
            if (!targetMember.kickable) {
                return interaction.reply({ content: 'Deze gebruiker kan niet worden gekicked. Controleer mijn rechten en probeer het opnieuw.', ephemeral: true });
            }

            // Kick de gebruiker
            await targetMember.kick(reason);

            // Log de kick in het logkanaal
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            const logEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Kick - ${targetUser.tag}`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setColor('#FFA500') // Oranje kleur voor kicks
                .addFields(
                    { name: 'Gebruiker', value: `${targetUser.tag}`, inline: true },
                    { name: 'Moderator', value: `${moderator.tag}`, inline: true },
                    { name: 'Reden', value: reason }
                )
                .setFooter({ text: `Gebruiker ID: ${targetUser.id}` })
                .setTimestamp();

            if (logChannel) logChannel.send({ embeds: [logEmbed] });

            // Stuur een DM naar de gebruiker met kick-details in een embed
            const dmEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Je bent gekicked van ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setColor('#FFA500') // Oranje kleur
                .addFields(
                    { name: 'Reden', value: reason }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Gebruiker ID: ${targetUser.id}` })
                .setTimestamp();

            try {
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.error("Kan geen DM sturen naar de gebruiker:", dmError);
            }

            return interaction.reply({ content: `${targetUser.tag} is succesvol gekicked.`, ephemeral: true });

        } catch (error) {
            console.error("Error bij het uitvoeren van de kick:", error);
            return interaction.reply({ content: "Er is een fout opgetreden bij het uitvoeren van de kick. Controleer mijn machtigingen en probeer het opnieuw.", ephemeral: true });
        }
    }
};
