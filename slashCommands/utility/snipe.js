const { EmbedBuilder } = require('discord.js');
const { embedColor } = require('../../config.json');
const { snipes } = require('../../events/messageDelete');

module.exports = {
    name: 'snipe',
    description: 'Laat het laatst verwijderde bericht zien in dit kanaal',
    
    run: async (client, interaction) => {
        const snipedMessage = snipes.get(interaction.channel.id);
        
        if (!snipedMessage) {
            return interaction.reply({
                content: 'Er zijn geen recent verwijderde berichten in dit kanaal!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setAuthor({
                name: snipedMessage.author.tag,
                iconURL: snipedMessage.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription(snipedMessage.content || 'Geen tekst (mogelijk alleen een afbeelding)')
            .setTimestamp(snipedMessage.timestamp)
            .setFooter({ text: `Bericht verwijderd in #${interaction.channel.name}` });

        // Als er een afbeelding was in het bericht
        if (snipedMessage.attachments) {
            embed.setImage(snipedMessage.attachments);
        }

        await interaction.reply({ embeds: [embed] });
    },
}; 