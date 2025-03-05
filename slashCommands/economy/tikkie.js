const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config');

module.exports = {
    name: 'tikkie',
    description: 'Maak een betaalverzoek dat iedereen kan betalen.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'bedrag',
            description: 'Het bedrag van euro dat je wilt vragen.',
            type: 3, // Type 3 is voor strings
            required: true
        },
        {
            name: 'reden',
            description: 'De reden voor het betaalverzoek.',
            type: 3, // Type 3 is voor strings
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }

            console.log('Tikkie commando uitgevoerd door:', interaction.user.tag);
            
            const bedragString = interaction.options.getString('bedrag');
            const reden = interaction.options.getString('reden') || 'Geen reden opgegeven';
            const aanvrager = interaction.user;
            
            console.log('Tikkie aangemaakt met bedrag:', bedragString, 'en reden:', reden);
            
            // Controleer of het bedrag geldig is
            const bedrag = parseInt(bedragString);
            if (!bedrag || isNaN(bedrag) || bedrag <= 0) {
                return interaction.reply({
                    content: `${aanvrager}, geef een geldig bedrag euro op voor het betaalverzoek.`,
                    ephemeral: true
                });
            }
            
            // Maak uniek ID voor dit betaalverzoek
            const verzoekId = Date.now().toString();
            console.log('Tikkie verzoek ID:', verzoekId);
            
            // Maak een knop om te betalen
            const betaalKnop = new ButtonBuilder()
                .setCustomId(`betaal_${verzoekId}_${bedrag}_${aanvrager.id}`)
                .setLabel(`Betaal €${bedrag}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('💶');
            
            const row = new ActionRowBuilder().addComponents(betaalKnop);
            
            // Maak embed voor het betaalverzoek
            const embed = new EmbedBuilder()
                .setAuthor({ name: `Betaalverzoek van ${aanvrager.username}`, iconURL: aanvrager.displayAvatarURL() })
                .setDescription(`**${aanvrager.username}** vraagt om een betaling van **€${bedrag}**.\n\n**Reden:** ${reden}\n\nKlik op de knop hieronder om te betalen.`)
                .setThumbnail('https://play-lh.googleusercontent.com/PN68IUh5DjvRYw5JgnNCdIW0MW6rjWbEijadm6NjDFjR5ndqba4Sxj053101Lt7Few')
                .setColor(embedColor)
                .setFooter({ text: `Tikkie • Verloopt <t:${Math.floor((Date.now() + 3600000) / 1000)}:R>` })
                .setTimestamp();
            
            // Stuur het betaalverzoek
            const reply = await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                fetchReply: true
            });
            
            console.log('Tikkie bericht verzonden met ID:', reply.id);
            
        } catch (error) {
            console.error('Fout bij het maken van betaalverzoek:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het maken van het betaalverzoek. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 