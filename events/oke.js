const { ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, '../logs.json');
const client = require('..');
const { whisperChannel, footerText } = require('../config.json');

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('reply_modal_')) {
            const originalUserId = interaction.customId.split('_')[2];

            // Maak de modal voor de reactie
            const modal = new ModalBuilder()
                .setCustomId(`reply_modal_submit_${originalUserId}`)
                .setTitle('Beantwoord het bericht');

            // Voeg een tekstveld toe aan de modal
            const replyInput = new TextInputBuilder()
                .setCustomId('reply_content')
                .setLabel("Jouw reactie")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(replyInput);
            modal.addComponents(row);

            // Toon de modal aan de gebruiker
            await interaction.showModal(modal);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('reply_modal_submit_')) {
            const originalUserId = interaction.customId.split('_')[3];
            const replyContent = interaction.fields.getTextInputValue('reply_content');

            // Haal het originele bericht op uit logs.json
            const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
            const originalMessage = logs[originalUserId]?.bericht || 'Geen origineel bericht gevonden';


            const originalUser = await client.users.fetch(originalUserId);

            const whisperChannelCache = client.channels.cache.get(whisperChannel);

            const replyEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Whisper Reactie', iconURL: interaction.user.displayAvatarURL()})
                .setColor('#23272A')
                .setDescription(`**Origineel bericht:**\n${originalMessage}\n\n**Reactie:**\n${replyContent}`)
                .setFooter({ text: footerText })
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            try {
                if (whisperChannelCache) await whisperChannelCache.send({ embeds: [replyEmbed], content: `${interaction.user} reageerde op ${originalUser}` });
                await interaction.reply({ content: 'Je reactie is verzonden.', ephemeral: true });
            } catch (error) {
                console.error('Fout bij het verzenden van de reactie:', error);
                await interaction.reply({ content: 'Er is iets fout gegaan bij het verzenden van je reactie.', ephemeral: true });
            }
        }
    }
});
