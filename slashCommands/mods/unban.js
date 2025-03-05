const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unban',
    description: "Haal een gebande gebruiker van de server.",
    options: [
        {
            name: 'user_id',
            description: 'Voer het ID in van de gebruiker die je wilt unbannen.',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'reden',
            description: 'Geef een reden voor het unbannen.',
            type: ApplicationCommandOptionType.String,
            required: false,
        }
    ],
    run: async (client, interaction) => {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reden') || 'Geen reden opgegeven';
        const moderator = interaction.user;
        const logChannelId = '1299059030114959545';

        // Controleer of de gebruiker de juiste permissies heeft
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({
                content: "Je hebt geen toestemming om dit commando te gebruiken.",
                ephemeral: true
            });
        }

        try {
            // Voer de unban-actie uit
            await interaction.guild.members.unban(userId, reason);

            const InstantEmbed = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setColor('Green')
            .setDescription(`**${interaction.user.username}** is succesvol ge-unbanned.`)
            .setFooter({ text: 'Liberte' })
            .setTimestamp();

        await interaction.reply({ embeds: [InstantEmbed], ephemeral: true });


            // Log de unban-actie
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            const logEmbed = new EmbedBuilder()
                .setTitle('Unban Actie')
                .setColor('Green')
                .addFields(
                    { name: 'Gebruiker ID', value: userId, inline: true },
                    { name: 'Moderator', value: moderator.tag, inline: true },
                    { name: 'Reden', value: reason }
                )
                .setFooter({ text: 'Unban uitgevoerd' })
                .setTimestamp();

            if (logChannel) logChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error('Error bij het unbannen van de gebruiker:', error);
            await interaction.reply({
                content: `Er is iets fout gegaan bij het unbannen van de gebruiker. Controleer of het ID juist is en probeer het opnieuw.`,
                ephemeral: true
            });
        }
    }
};
