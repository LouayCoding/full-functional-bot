const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unlock',
    description: "Ontgrendel het huidige kanaal.",
    options: [
        {
            name: 'reden',
            description: 'Een optionele reden voor het ontgrendelen.',
            type: ApplicationCommandOptionType.String,
            required: false,
        }
    ],
    run: async (client, interaction) => {
        const reason = interaction.options.getString('reden') || 'De lockdown is opgeheven.';
        const lockdownRoleId = '1299059028684705839'; // Specifieke rol-ID die ook moet worden ontgrendeld
        const channel = interaction.channel;

        // Embed template for unlock message
        const unlockEmbed = new EmbedBuilder()
            .setColor('#6A0DAD') // Paars
            .setTitle('🔓 Kanaal Lockdown Beëindigd')
            .setDescription(reason)
            .setTimestamp();

        try {
            // Ontgrendel het kanaal door SendMessages-rechten in te schakelen voor @everyone en de specifieke rol
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { [PermissionsBitField.Flags.SendMessages]: true });
            await channel.permissionOverwrites.edit(lockdownRoleId, { [PermissionsBitField.Flags.SendMessages]: true });
            
            // Stuur het unlock-bericht in een paarse embed
            await channel.send({ embeds: [unlockEmbed] });

            return interaction.reply({ content: `Het kanaal is succesvol ontgrendeld.`, ephemeral: true });
        
        } catch (error) {
            console.error("Error bij het uitvoeren van de unlock:", error);
            return interaction.reply({ content: "Er is een fout opgetreden bij het uitvoeren van de unlock. Controleer mijn machtigingen en probeer het opnieuw.", ephemeral: true });
        }
    }
};
