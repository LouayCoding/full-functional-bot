const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { embedColor, footerText, ruleChannel } = require('../../config.json');

module.exports = {
    name: 'regels',
    description: "Stuur de serverregels in het regelkanaal",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        const guild = client.guilds.cache.get(interaction.guildId);
        const rulesChannel = guild.channels.cache.get(ruleChannel);
        const serverIcon = guild.iconURL();

        const embed = new EmbedBuilder()
            .setTitle('Serverregels')
            .setDescription('Welkom bij Back2Back! Om een veilige en prettige omgeving te waarborgen voor iedereen, hanteren wij de volgende regels:')
            .addFields(
                { 
                    name: '1. Geen discriminatie', 
                    value: 'Onder andere op basis van ras, nationaliteit, seksualiteit of geloof.'
                },
                {
                    name: '2. Reclame',
                    value: 'Alle vormen van promotie wat niet gerelateerd is, is verboden.'
                },
                {
                    name: '3. Geen intimidatie/pestgedrag',
                    value: 'Onder andere seksuele intimidatie, pesten of het aanmoedigen hiervan. Spam of onnodige discussies creëren is niet toegestaan. Discussie voeren is toegestaan, mits het respectvol gebeurd. Wij vinden het belangrijk dat iedereen zich welkom voelt en zichzelf kan zijn. Haatdragende reacties en vrouwonvriendelijk gedrag is derhalve dus ook niet toegestaan.'
                }
            )
            .setColor(embedColor)
            .setThumbnail(serverIcon)
            .setTimestamp()
            .setFooter({ text: footerText });

        await rulesChannel.send({ embeds: [embed] });
        await interaction.reply({ content: 'De regels zijn succesvol verzonden!', ephemeral: true });
    }
};

