const { ApplicationCommandType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { syncLandRollen } = require('../../utils/landRollen');
const { embedColor } = require('../../config.json');

// Bouw de slash command met delay optie
const builder = new SlashCommandBuilder()
    .setName('synclanden')
    .setDescription('Synchroniseert landen als rollen en bewaart ze in de database')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addNumberOption(option => 
        option.setName('vertraging')
            .setDescription('Vertraging tussen het aanmaken van rollen in seconden (standaard 5)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(30)
    );

module.exports = {
    ...builder.toJSON(),
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.Administrator,
    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guild = interaction.guild;
            
            // Haal de vertraging op uit de opties (standaard 5 seconden)
            const delayInSeconds = interaction.options.getNumber('vertraging') || 5;
            const delayInMs = delayInSeconds * 1000;
            
            // Informatie bericht dat het proces is gestart
            await interaction.editReply({
                content: `🔄 Synchronisatie gestart met een vertraging van ${delayInSeconds} seconden tussen elke rol.
Dit kan even duren om anti-nuke systemen te omzeilen. Ik laat je weten wanneer het klaar is.`,
                ephemeral: true
            });
            
            // Synchroniseer de landen met de server rollen
            const result = await syncLandRollen(client, guild, delayInMs);
            
            // Maak een embed met het resultaat
            const embed = new EmbedBuilder()
                .setTitle('Land Rollen Synchronisatie')
                .setColor(embedColor)
                .setDescription(result.message)
                .addFields(
                    { name: 'Nieuwe rollen aangemaakt', value: `${result.createdRoles}`, inline: true },
                    { name: 'Bestaande rollen gevonden', value: `${result.existingRoles}`, inline: true },
                    { name: 'Gebruikte vertraging', value: `${delayInSeconds} seconden`, inline: true }
                )
                .setTimestamp();
            
            await interaction.editReply({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('Fout bij uitvoeren van sync landen command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('Fout!')
                .setDescription(`Er is een fout opgetreden: ${error.message}`)
                .setColor('Red');
                
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}; 