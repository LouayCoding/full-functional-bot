const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'role',
    description: "Voeg een rol toe aan of verwijder een rol van een gebruiker.",
    options: [
        {
            name: 'actie',
            description: 'Kies of je de rol wilt toevoegen of verwijderen.',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'Toevoegen', value: 'add' },
                { name: 'Verwijderen', value: 'remove' }
            ],
        },
        {
            name: 'gebruiker',
            description: 'Selecteer de gebruiker.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'rol',
            description: 'Selecteer de rol die je wilt beheren.',
            type: ApplicationCommandOptionType.Role,
            required: true,
        }
    ],
    run: async (client, interaction) => {
        const actie = interaction.options.getString('actie');
        const targetUser = interaction.options.getUser('gebruiker');
        const role = interaction.options.getRole('rol');
        const moderator = interaction.user;
        const logChannelId = '1299059030114959548'; // Vervang dit door je logkanaal-ID

        try {
            const targetMember = await interaction.guild.members.fetch(targetUser.id);

            if (actie === 'add') {
                // Controleer of de rol al aanwezig is
                if (targetMember.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${targetUser.tag} heeft deze rol al.`, ephemeral: true });
                }
                
                await targetMember.roles.add(role);

                // Log de actie
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: `Rol Toegevoegd - ${role.name} aan ${targetUser.tag}`,
                        iconURL: targetUser.displayAvatarURL({ dynamic: true })
                    })
                    .setColor('#57F287') // Groen voor toevoegen
                    .addFields(
                        { name: 'Gebruiker', value: `${targetUser.tag}`, inline: true },
                        { name: 'Moderator', value: `${moderator.tag}`, inline: true },
                        { name: 'Rol', value: role.name, inline: true }
                    )
                    .setFooter({ text: `Gebruiker ID: ${targetUser.id} | Rol ID: ${role.id}` })
                    .setTimestamp();

                if (logChannel) logChannel.send({ embeds: [logEmbed] });

                return interaction.reply({ content: `De rol ${role.name} is succesvol toegevoegd aan ${targetUser.tag}.`, ephemeral: true });

            } else if (actie === 'remove') {
                // Controleer of de rol niet aanwezig is
                if (!targetMember.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${targetUser.tag} heeft deze rol niet.`, ephemeral: true });
                }

                await targetMember.roles.remove(role);

                // Log de actie
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: `Rol Verwijderd - ${role.name} van ${targetUser.tag}`,
                        iconURL: targetUser.displayAvatarURL({ dynamic: true })
                    })
                    .setColor('#ED4245') // Rood voor verwijderen
                    .addFields(
                        { name: 'Gebruiker', value: `${targetUser.tag}`, inline: true },
                        { name: 'Moderator', value: `${moderator.tag}`, inline: true },
                        { name: 'Rol', value: role.name, inline: true }
                    )
                    .setFooter({ text: `Gebruiker ID: ${targetUser.id} | Rol ID: ${role.id}` })
                    .setTimestamp();

                if (logChannel) logChannel.send({ embeds: [logEmbed] });

                return interaction.reply({ content: `De rol ${role.name} is succesvol verwijderd van ${targetUser.tag}.`, ephemeral: true });
            }

        } catch (error) {
            console.error("Error bij rolbeheer:", error);
            return interaction.reply({ content: "Er is een fout opgetreden bij het beheren van de rol. Controleer mijn machtigingen en probeer het opnieuw.", ephemeral: true });
        }
    }
};
