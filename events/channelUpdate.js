const { EmbedBuilder } = require('discord.js');
const client = require('..');

const logChannelId = '1299059030114959544'; // Vervang dit door de ID van je logkanaal

client.on('channelUpdate', async (oldChannel, newChannel) => {
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel || oldChannel.name === newChannel.name) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'Kanaal bijgewerkt', iconURL: client.user.displayAvatarURL() })
        .setDescription(`Naam gewijzigd: **#${oldChannel.name} → #${newChannel.name}**`)
        .setFooter({ text: `ID: ${newChannel.id}` })
        .setTimestamp()
        .setColor('Purple'); 

    logChannel.send({ embeds: [embed] });
});