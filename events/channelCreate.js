const { EmbedBuilder } = require('discord.js');
const client = require('..');

const logChannelId = '1299059030114959544'; // Vervang dit door de ID van je logkanaal

client.on('channelCreate', async (channel) => {
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'Kanaal aangemaakt', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${channel.name}`)
        .setFooter({ text: `ID: ${channel}` })
        .setTimestamp()
        .setColor('Purple'); // Groene kleur voor aangemaakt kanaal

    logChannel.send({ embeds: [embed] });
});