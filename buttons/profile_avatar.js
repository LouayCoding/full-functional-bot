const { EmbedBuilder } = require('discord.js');

module.exports = {
    id: 'profile_avatar',
    async run(client, interaction) {
        const [_, __, userId] = interaction.customId.split('_');
        const targetUser = await client.users.fetch(userId, { force: true });
        const embed = new EmbedBuilder()
            .setTitle(`Profiel Avatar van ${targetUser.username}`)
            .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: 'Gegenereerd door Liberte Bot' })
            .setTimestamp();

        await interaction.update({ embeds: [embed] });
    }
};
