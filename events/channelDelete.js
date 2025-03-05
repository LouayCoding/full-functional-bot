const { EmbedBuilder } = require('discord.js');
const client = require('..');

const logChannelId = '1299059030114959544'; // Vervang dit door de ID van je logkanaal

client.on('channelDelete', async (channel) => {
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'Kanaal verwijderd', iconURL: client.user.displayAvatarURL() })
        .setDescription(`**#${channel.name}**`)
        .setFooter({ text: `ID: ${channel.id}` })
        .setTimestamp()
        .setColor('Purple'); // Oranje kleur voor verwijderd kanaal

    logChannel.send({ embeds: [embed] });
});