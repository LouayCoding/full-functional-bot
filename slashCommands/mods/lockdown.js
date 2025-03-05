const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'lockdown',
    description: "Vergrendel het huidige kanaal.",
    options: [
        {
            name: 'reden',
            description: 'Een optionele reden voor de lockdown.',
            type: ApplicationCommandOptionType.String,
            required: false,
        }
    ],
    run: async (client, interaction) => {
        const reason = interaction.options.getString('reden') || 'Dit kanaal is tijdelijk vergrendeld.';
        const lockdownRoleId = '1299059028684705839'; // Specifieke rol-ID die ook moet worden vergrendeld
        const channel = interaction.channel;

        // Embed template for lockdown message
        const lockdownEmbed = new EmbedBuilder()
            .setColor('#6A0DAD') // Paars
            .setTitle('🔒 Kanaal Lockdown Gestart')
            .setDescription(reason)
            .setTimestamp();

        try {
            // Vergrendel het kanaal door SendMessages-rechten uit te schakelen voor @everyone en de specifieke rol
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { [PermissionsBitField.Flags.SendMessages]: false });
            await channel.permissionOverwrites.edit(lockdownRoleId, { [PermissionsBitField.Flags.SendMessages]: false });
            
            // Stuur het lockdown-bericht in een paarse embed
            await channel.send({ embeds: [lockdownEmbed] });

            return interaction.reply({ content: `Het kanaal is succesvol vergrendeld.`, ephemeral: true });
        
        } catch (error) {
            console.error("Error bij het uitvoeren van de lockdown:", error);
            return interaction.reply({ content: "Er is een fout opgetreden bij het uitvoeren van de lockdown. Controleer mijn machtigingen en probeer het opnieuw.", ephemeral: true });
        }
    }
};
