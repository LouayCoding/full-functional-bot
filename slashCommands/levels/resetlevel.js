const { ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const Levels = require('discord-xp');
const config = require('../../config.json');

module.exports = {
    name: 'resetlevel',
    description: 'Reset het level en XP van een gebruiker (alleen voor beheerders)',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.Administrator, // Alleen toegankelijk voor admins
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker waarvan je het level wilt resetten',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],
    run: async (client, interaction) => {
        try {
            // Check of het levelsysteem is ingeschakeld
            if (!config.levels || !config.levels.enabled) {
                return interaction.reply({
                    content: 'Het levelsysteem is momenteel uitgeschakeld.',
                    ephemeral: true
                });
            }
            
            await interaction.deferReply();
            
            // Haal parameters op
            const target = interaction.options.getUser('gebruiker');
            
            // Haal de huidige gegevens op voordat we ze resetten
            const userData = await Levels.fetch(target.id, interaction.guild.id);
            
            if (!userData) {
                return interaction.editReply({
                    content: `**${target.username}** heeft nog geen XP/levels om te resetten.`,
                    ephemeral: true
                });
            }
            
            // Onthoud het oude level en XP voor weergave
            const oldLevel = userData.level;
            const oldXP = userData.xp;
            
            // Reset de gebruiker's level en XP door deze volledig te verwijderen
            await Levels.deleteUser(target.id, interaction.guild.id);
            
            // Bevestig de reset
            return interaction.editReply({
                content: `De levelvoortgang van **${target.username}** is gereset.\nVorige status: Level **${oldLevel}** met **${oldXP}** XP.`,
            });
            
        } catch (error) {
            console.error('Fout bij het uitvoeren van het resetlevel commando:', error);
            return interaction.editReply({
                content: 'Er is een fout opgetreden bij het resetten van de level. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 