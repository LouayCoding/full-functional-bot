const { EmbedBuilder } = require('discord.js');
const client = require('..');

client.on('userUpdate', async (oldUser, newUser) => {
    // Controleer of de profielafbeelding is gewijzigd
    if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
        const logChannel = client.channels.cache.get('1302270769660690442'); 

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${newUser.username}`, iconURL: newUser.displayAvatarURL({ dynamic: true }) })
                .setDescription(`${newUser} heeft zijn/haar profielfoto gewijzigd.`)
                .addFields(
                    { name: 'Oude afbeelding', value: `[Klik hier](${oldUser.displayAvatarURL({ dynamic: true })})`, inline: true },
                    { name: 'Nieuwe afbeelding', value: `[Klik hier](${newUser.displayAvatarURL({ dynamic: true })})`, inline: true }
                )
                .setColor('Purple')
                .setFooter('Liberte')
                .setTimestamp();

            logChannel.send({ embeds: [embed] }).catch(console.error);
        }
    }
});
