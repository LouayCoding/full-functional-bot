const { EmbedBuilder } = require('discord.js');
const { embedColor } = require('../config.json'); // Zorg dat je embedColor in config.json staat

module.exports = (client) => {
    client.on('guildMemberAdd', async (member) => {
        console.log('dd')
        const welcomeChannelId = '1331971904281514040'; // Welkomkanaal-ID
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

        if (!welcomeChannel) return console.log('Het welkomkanaal is niet gevonden.');

        // Maak de embed
        const embed = new EmbedBuilder()
            .setColor(embedColor) // Gebruik de kleur uit config.json
            .setTitle(`Welkom ${member.user.username}!`)
            .setDescription(
                `Welkom in **${member.guild.name}**, ${member.user}! 🎉 We zijn blij je te verwelkomen. Lees de regels en geniet van je verblijf!`
            )
            .setThumbnail(member.guild.iconURL()) // Gebruik het servericoon als thumbnail
            
            .setFooter({
                text: `${member.guild.name}`, // Servernaam in de footer
            })
            .setTimestamp();

        // Stuur de embed naar het welkomkanaal
        await welcomeChannel.send({ embeds: [embed] });
    });
};
