const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'summon',
    description: "Sleep iedereen die in een voice channel zit naar jouw channel",

    run: async (client, interaction) => {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)

        // Check of gebruiker in voice channel zit
        if (!interaction.member.voice.channel) {
            embed.setDescription('Je moet in een voice channel zitten om dit commando te gebruiken!')
            return interaction.reply({ 
                embeds: [embed],
                ephemeral: true 
            });
        }

        const targetChannel = interaction.member.voice.channel;
        let movedMembers = 0;

        // Loop door alle voice channels
        interaction.guild.channels.cache
            .filter(channel => channel.type === 2) // 2 = voice channel
            .forEach(channel => {
                channel.members.forEach(member => {
                    if (member.id !== interaction.member.id) {
                        member.voice.setChannel(targetChannel)
                            .catch(console.error);
                        movedMembers++;
                    }
                });
            });

        embed.setDescription(`${movedMembers} leden naar jouw kanaal verplaatst!`)
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};