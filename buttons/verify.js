const { verifyRole } = require('../config.json');  // Zorg ervoor dat dit de juiste rol-ID is

module.exports = {
    id: 'verify_button',
    permissions: [],
    run: async (client, interaction) => {
        // Controleer of de interactie in een guild is
        if (!interaction.guild) return;
        const member = await interaction.guild.members.fetch(interaction.user.id);

        // Stuur een ephemeral bericht als bevestiging
        await interaction.reply({ content: 'Je bent geverifieerd! Je ontvangt nu toegang tot de server.', ephemeral: true });

        try {
            // Controleer of de rol-ID geldig is en of de rol bestaat in de server
            const role = interaction.guild.roles.cache.get(verifyRole);
            if (!role) {
                console.error('De rol met ID ' + verifyRole + ' bestaat niet in de server.');
                return;
            }

            // Controleer of de member al de rol heeft
            if (member && !member.roles.cache.has(verifyRole)) {
                await member.roles.add(verifyRole);
            }
        } catch (error) {
            console.error('Fout bij het toevoegen van de rol:', error);
        }
    }
};
