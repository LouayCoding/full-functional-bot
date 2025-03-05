const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'ban',
    description: "Verban een gebruiker van de server.",
    options: [
        {
            name: 'gebruiker',
            description: 'Selecteer de gebruiker die je wilt verbannen.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'reden',
            description: 'De reden voor de ban.',
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

            // Controleer of de gebruiker al verbannen is
            if (!targetMember.bannable) {
                return interaction.reply({ content: 'Deze gebruiker kan niet worden verbannen. Controleer mijn rechten en probeer het opnieuw.', ephemeral: true });
            }

            // Verban de gebruiker
            await targetMember.ban({ reason });

            // Log de ban in het logkanaal met een Unban-knop
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            const logEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Ban - ${targetUser.tag}`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setColor('#ED4245') // Discord rood
                .addFields(
                    { name: 'Gebruiker', value: `${targetUser.tag}`, inline: true },
                    { name: 'Moderator', value: `${moderator.tag}`, inline: true },
                    { name: 'Reden', value: reason }
                )
                .setFooter({ text: `Gebruiker ID: ${targetUser.id}` })
                .setTimestamp();

            const unbanButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`unban_${targetUser.id}`)
                        .setLabel('Unban')
                        .setStyle(ButtonStyle.Danger)
                );

            if (logChannel) logChannel.send({ embeds: [logEmbed], components: [unbanButton] });

            // Stuur een DM naar de gebruiker met ban-details in een embed
            const dmEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Je bent verbannen van ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setColor('#ED4245') // Discord rood
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

            return interaction.reply({ content: `${targetUser.tag} is succesvol verbannen.`, ephemeral: true });

        } catch (error) {
            console.error("Error bij het uitvoeren van de ban:", error);
            return interaction.reply({ content: "Er is een fout opgetreden bij het uitvoeren van de ban. Controleer mijn machtigingen en probeer het opnieuw.", ephemeral: true });
        }
    }
};
