const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'playSong',
    execute(queue, song) {
        const embed = new EmbedBuilder()
            .setColor('Purple') // Zwarte achtergrondkleur
            .setDescription(`Begonnen met spelen: **[${song.name}](${song.url})**`);

        queue.textChannel.send({ embeds: [embed] });
    },
};
