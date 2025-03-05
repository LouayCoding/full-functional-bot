const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    id: 'unban',
    permissions: [PermissionsBitField.Flags.BanMembers], // Vereist de permissie BanMembers
    run: async (client, interaction) => {
        const userId = interaction.customId.split('_')[1];
        const logChannelId = '1299059030114959548'; // Zet je log kanaal ID hier

        try {
            await interaction.guild.members.unban(userId);

            await interaction.reply({ content: `De gebruiker is succesvol geunbaned.`, ephemeral: true });

            // Log dat de ban is verwijderd
            const logEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Unban`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setColor('#57F287') // Groene kleur
                .setDescription(`De gebruiker met ID: ${userId} is geunbaned door ${interaction.user.tag}.`)
                .setFooter({ text: `Moderator ID: ${interaction.user.id}` })
                .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) logChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error("Error bij het verwijderen van de ban:", error);
            return interaction.reply({ content: 'Er is een fout opgetreden bij het verwijderen van de ban.', ephemeral: true });
        }
    }
};
