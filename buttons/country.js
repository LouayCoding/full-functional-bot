module.exports = {
    id: 'country',  // Dit id-veld moet overeenkomen met de prefix van je CustomId (in dit geval `country`)
    async run(client, interaction) {
        const guild = client.guilds.cache.get(interaction.guildId);
        const roleId = interaction.customId.split('_')[1];  // Haal de rol-ID op uit CustomId
        const role = guild.roles.cache.get(roleId);

        if (!role) {
            return interaction.reply({ content: `De rol bestaat niet.`, ephemeral: true });
        }

        const member = guild.members.cache.get(interaction.user.id);

        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            await interaction.reply({ content: `De rol **${role}** is van je verwijderd.`, ephemeral: true });
        } else {
            await member.roles.add(role);
            await interaction.reply({ content: `Je hebt de rol **${role}** gekregen.`, ephemeral: true });
        }
    }
};
