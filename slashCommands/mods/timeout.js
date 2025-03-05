const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'timeout',
    description: "Geef een gebruiker een timeout.",
    options: [
        {
            name: 'gebruiker',
            description: 'Selecteer de gebruiker die je een timeout wilt geven.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'duur',
            description: 'Duur van de timeout (bijvoorbeeld 5d, 10m). Standaard is 1 uur.',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: 'reden',
            description: 'De reden voor de timeout.',
            type: ApplicationCommandOptionType.String,
            required: false,
        }
    ],
    run: async (client, interaction) => {
        const targetUser = interaction.options.getUser('gebruiker');
        const durationInput = interaction.options.getString('duur') || '1h';
        const reason = interaction.options.getString('reden') || 'Geen reden opgegeven';
        const moderator = interaction.user;

        const durationMs = ms(durationInput);
        const logChannelId = '1299059030114959548';

        try {
            const targetMember = await interaction.guild.members.fetch(targetUser.id);
            await targetMember.timeout(durationMs, reason);

            // Log de timeout in het logkanaal met UnTimeout knop
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            const logEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Timeout - ${targetUser.tag}`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setColor('#ED4245') // Discord rood
                .addFields(
                    { name: 'Gebruiker', value: `${targetUser.tag}`, inline: true },
                    { name: 'Moderator', value: `${moderator.tag}`, inline: true },
                    { name: 'Duur', value: ms(durationMs, { long: true }), inline: true },
                    { name: 'Reden', value: reason }
                )
                .setFooter({ text: `Gebruiker ID: ${targetUser.id}` })
                .setTimestamp();

            // Maak de UnTimeout knop met permissie beperking
            const untimeoutButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`untimeout_${targetUser.id}`)
                        .setLabel('UnTimeout')
                        .setStyle(ButtonStyle.Danger)
                );

            if (logChannel) logChannel.send({ embeds: [logEmbed], components: [untimeoutButton] });

            // Stuur een DM naar de gebruiker met timeout-details in een embed
            const dmEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `Je hebt een timeout ontvangen in ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setColor('#ED4245') // Discord rood
                .addFields(
                    { name: 'Duur', value: ms(durationMs, { long: true }), inline: true },
                    { name: 'Reden', value: reason }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Gebruiker ID: ${targetUser.id}` })
                .setTimestamp();

            try {
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.error("Kan geen DM sturen naar de gebruiker:", dmError);
            }

            return interaction.reply({ content: `${targetUser.tag} is succesvol een timeout gegeven voor ${ms(durationMs, { long: true })}.`, ephemeral: true });

        } catch (error) {
            console.error("Error bij het geven van een timeout:", error);
            return interaction.reply({ content: "Er is een fout opgetreden bij het uitvoeren van de timeout. Controleer mijn machtigingen en probeer het opnieuw.", ephemeral: true });
        }
    }
};
