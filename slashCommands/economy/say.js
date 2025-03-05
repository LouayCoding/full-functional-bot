const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor, whisperChannel } = require('../../config.json')


module.exports = {
    name: 'say',
    description: "Toont het huidige saldo van een gebruiker in de economie.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 3000,
    options: [
        {
            name: 'bericht',
            description: 'Het bericht dat je wilt verzenden',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    run: async (client, interaction) => {
        
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }
const bericht = interaction.options.getString('bericht');
        await interaction.channel.send({ content: bericht });
        interaction.reply({ content: `Bericht succesvol verzonden in ${interaction.channel}`, ephemeral: true });

        const logChannel = client.channels.cache.get(whisperChannel);
        const logEmbed = new EmbedBuilder()
            .setAuthor({ name: `Say Command`, iconURL: interaction.user.displayAvatarURL() })
            .setColor(embedColor)
            .setFooter({ text: `${interaction.guild.name}` })
            .setTimestamp()
            .addFields(
                { name: 'Gebruiker', value: `${interaction.user}`, inline: true },
                { name: 'Kanaal', value: `${interaction.channel}`, inline: true },
                { name: 'Bericht', value: `${bericht}`, inline: true },
            );
            

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ga naar bericht')
                    .setStyle(ButtonStyle.Link)
                    .setURL(interaction.channel.lastMessage.url)
            );

        logChannel.send({ embeds: [logEmbed], components: [row] });
    }
}