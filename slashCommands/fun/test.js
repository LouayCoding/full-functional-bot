const { ApplicationCommandType } = require('discord.js');

module.exports = {
    name: 'createroles',
    description: "Maakt de voorgedefinieerde rollen aan in de server",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        const roles = [
            'Marokko', 'Nederland', 'Algerije', 'Pakistan', 'Afghanistan',
            'België', 'Duitsland', 'Frankrijk', 'Spanje', 'Italië',
            'Turkije', 'Egypte', 'Saoedi-Arabië', 'China', 'Rusland',
            'Brazilië', 'Mexico', 'VS', 'Vietnam', 'Polen',
            'Suriname', 'Curaçao', 'Indonesië', 'Filipijnen', 'Palestina'
        ];

        const guild = interaction.guild;

        await interaction.reply({ content: "Rollen worden aangemaakt...", ephemeral: true });

        for (const roleName of roles) {
            // Controleer of de rol al bestaat om duplicaten te voorkomen
            let role = guild.roles.cache.find(r => r.name === roleName);

            if (!role) {
                try {
                    // Maak de rol aan
                    role = await guild.roles.create({
                        name: roleName,
                        color: 'Grey', // Pas eventueel de kleur aan
                        reason: 'Rol aangemaakt via het /createroles commando'
                    });
                    console.log(`Rol ${roleName} aangemaakt`);
                } catch (error) {
                    console.error(`Fout bij het aanmaken van de rol ${roleName}:`, error);
                }
            } else {
                console.log(`Rol ${roleName} bestaat al`);
            }
        }

        await interaction.followUp({ content: "Alle rollen zijn gecontroleerd en aangemaakt waar nodig!" });
    }
};
