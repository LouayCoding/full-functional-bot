const { EmbedBuilder } = require('discord.js');

module.exports = {
    id: 'server_avatar',
    async run(client, interaction) {
        const [_, __, userId] = interaction.customId.split('_');
        const guild = interaction.guild;
        const member =  await client.users.fetch(userId, { force: true });

        const embed = new EmbedBuilder()
            .setTitle(`Server Avatar van ${member.user.username}`)
            .setImage(member.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: 'Gegenereerd door Liberte Bot' })
            .setTimestamp();

        await interaction.update({ embeds: [embed] });
    }
};
