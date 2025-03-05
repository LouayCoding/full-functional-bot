module.exports = {
    id: 'age',  // Dit id-veld moet overeenkomen met de prefix van je CustomId (in dit geval `age`)
    async run(client, interaction) {
        const guild = client.guilds.cache.get(interaction.guildId);
        const roleId = interaction.customId.split('_')[1];  // Haal de rol-ID op uit CustomId
        const role = guild.roles.cache.get(roleId);

        if (!role) {
            return interaction.reply({ content: `De rol bestaat niet.`, ephemeral: true });
        }

        const member = guild.members.cache.get(interaction.user.id);

        // Definieer alle leeftijdsrollen
        const ageRoleIds = [
            '1331971902498930693', // 13-15
            '1331971902498930694', // 16-18
            '1331971902498930695'  // 18+
        ];

        // Controleer of de gebruiker al een leeftijdsrol heeft
        const currentAgeRole = member.roles.cache.find(r => ageRoleIds.includes(r.id));

        if (currentAgeRole) {
            // Verwijder de huidige leeftijdsrol
            await member.roles.remove(currentAgeRole);
        }

        if (currentAgeRole && currentAgeRole.id === role.id) {
            // Als de gebruiker dezelfde rol opnieuw kiest, alleen verwijderen
            return interaction.reply({ content: `De rol **${role.name}** is van je verwijderd.`, ephemeral: true });
        }

        // Voeg de nieuwe leeftijdsrol toe
        await member.roles.add(role);
        await interaction.reply({ content: `Je hebt de rol **${role.name}** gekregen.`, ephemeral: true });
    }
};
