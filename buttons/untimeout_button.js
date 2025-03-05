const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    id: 'untimeout',
    permissions: [PermissionsBitField.Flags.ModerateMembers], // Vereist de permissie ModerateMembers
    run: async (client, interaction) => {
        const userId = interaction.customId.split('_')[1];
        const targetMember = await interaction.guild.members.fetch(userId);

        // Controleer of de gebruiker nog in timeout is
        if (!targetMember.communicationDisabledUntil) {
            return interaction.reply({ content: 'Deze gebruiker heeft geen actieve timeout.', ephemeral: true });
        }

        // Verwijder de timeout
        try {
            await targetMember.timeout(null);
            await interaction.reply({ content: `${targetMember.user.tag} is succesvol uit timeout gehaald.`, ephemeral: true });

            // Stuur een DM naar de gebruiker om hen te informeren over de verwijdering van de timeout
            const dmEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Je timeout is opgeheven in ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setColor('#57F287') // Groene kleur
                .setDescription('Je hebt nu weer toegang tot de server. Zorg ervoor dat je de regels volgt om toekomstige timeouts te voorkomen.')
                .setFooter({ text: `Gebruiker ID: ${targetMember.user.id}` })
                .setTimestamp();

            try {
                await targetMember.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.error("Kan geen DM sturen naar de gebruiker:", dmError);
            }

            // Log dat de timeout is verwijderd
            const logEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `UnTimeout - ${targetMember.user.tag}`,
                    iconURL: targetMember.user.displayAvatarURL({ dynamic: true })
                })
                .setColor('#ED4245') // Discord rood
                .setDescription(`${targetMember.user.tag} is uit timeout gehaald.`)
                .setFooter({ text: `Gebruiker ID: ${targetMember.user.id}` })
                .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get('1299059030114959548');
            if (logChannel) logChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error("Error bij het verwijderen van de timeout:", error);
            return interaction.reply({ content: 'Er is een fout opgetreden bij het verwijderen van de timeout.', ephemeral: true });
        }
    }
};
