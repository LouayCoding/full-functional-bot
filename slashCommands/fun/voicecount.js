const { EmbedBuilder, ChannelType } = require('discord.js');
const timestampToDate = require('timestamp-to-date');
const { embedColor } = require('../../config.json')

module.exports = {
    name: 'voicecount',
    description: "Krijg het totale aantal leden in alle spraakkanalen van de server!",
    run: async (client, interaction) => {
        const voiceChannels = interaction.guild.channels.cache.filter(channel => channel.type === ChannelType.GuildVoice);
        let memberCount = 0;
        voiceChannels.forEach(channel => {
            memberCount += channel.members.size;
        });
        const embed = new EmbedBuilder()
            .setDescription(`Er zitten **${memberCount} leden** in alle spraakkanalen.`)
            .setColor(embedColor)

        return interaction.reply({ embeds: [embed] })
    }
};