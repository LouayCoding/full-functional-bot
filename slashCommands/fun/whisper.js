const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = require('../../config.json')

module.exports = {
    name: 'whisper',
    description: "Stuur een privébericht naar een specifieke gebruiker.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 3000,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker naar wie je wilt fluisteren',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'bericht',
            description: 'Het bericht dat je wilt sturen',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    run: async (client, interaction) => {
        const gebruiker = interaction.options.getUser('gebruiker');
        const bericht = interaction.options.getString('bericht');
        const logChannel = client.channels.cache.get(config.whisperChannel);


        try {
            // Maak een "Reply" knop
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reply_modal_${interaction.user.id}`) // Gebruik de ID van de oorspronkelijke gebruiker
                        .setLabel('Reply')
                        .setStyle(ButtonStyle.Primary)
                );

            // Stuur het bericht naar de gebruiker met de "Reply" knop
            await gebruiker.send({ content: bericht, components: [row] });
            await interaction.reply({ content: `Bericht succesvol verzonden naar ${gebruiker}.`, ephemeral: true });

            // Log embed voor het logkanaal
            const logEmbed = new EmbedBuilder()
            .setColor('#fafafa')
                .setThumbnail(gebruiker.displayAvatarURL({ dynamic: true }))
                .setAuthor({
                    name: `Whisper ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .addFields(
                    { name: 'Gebruiker', value: interaction.user.tag, inline: true },
                    { name: 'Ontvanger', value: gebruiker.tag, inline: true },
                    { name: 'Bericht', value: bericht }
                )
                .setFooter({ text: `${interaction.guild.name}` })
                .setTimestamp();

            // Verstuur de log naar het logkanaal en sla het bericht en gebruiker-ID op
            if (logChannel) {
                const sentMessage = await logChannel.send({ embeds: [logEmbed] });
                saveLogMessage(interaction.user.id, sentMessage.id, bericht); // Sla het bericht-ID en de inhoud op
            }

        } catch (error) {
            if (error.code === 50007) {
                await interaction.reply({ content: `Het is niet mogelijk om een bericht naar ${gebruiker} te sturen. Deze gebruiker heeft waarschijnlijk privéberichten uitgeschakeld.`, ephemeral: true });
            } else {
                console.error(error);
                await interaction.reply({ content: 'Er is iets fout gegaan bij het verzenden van het bericht.', ephemeral: true });
            }
        }
    }
};

// Functie om logbericht-ID en berichtinhoud op te slaan in logs.json
function saveLogMessage(userId, messageId, bericht) {
    let logs = {};
    if (fs.existsSync(logFilePath)) {
        logs = JSON.parse(fs.readFileSync(logFilePath));
    }
    logs[userId] = { messageId, bericht }; // Sla bericht op naast messageId
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}
