const { ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Levels = require('discord-xp');
const config = require('../../config.json');
const { addXP } = require('../../utils/xphandler');

module.exports = {
    name: 'givexp',
    description: 'Geef XP aan een gebruiker (alleen voor moderators)',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild, // Alleen toegankelijk voor mensen met Manage Server permissie
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker die XP moet ontvangen',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'hoeveelheid',
            description: 'Hoeveel XP je wilt geven',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 1,
            maxValue: 10000
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
            
            // Haal parameters op
            const target = interaction.options.getUser('gebruiker');
            const amount = interaction.options.getInteger('hoeveelheid');
            
            await interaction.deferReply();
            
            // Gebruik de gecentraliseerde addXP functie met extra opties
            const result = await addXP(client, target, interaction.guild.id, amount, {
                checkCooldown: false,  // Geen cooldown voor het /givexp commando
                source: 'givexp'      // Geef de bron aan voor speciale afhandeling
            });
            
            if (!result.success) {
                return interaction.editReply({
                    content: 'Er is een fout opgetreden bij het geven van XP. Probeer het later opnieuw.',
                });
            }
            
            // Stel het bericht samen op basis van het resultaat
            let responseMessage = '';
            
            if (result.leveledUp) {
                // Level-up bericht
                responseMessage = `<@${target.id}> heeft **${amount}** XP ontvangen en is gestegen van level **${result.oldLevel}** naar level **${result.newLevel}**! 🎉`;
                
                // Voeg beloningsinformatie toe als die beschikbaar is
                if (result.reward > 0) {
                    responseMessage += `\n💰 De gebruiker ontvangt **${result.reward}** euro als level up beloning.`;
                }
                
                // Voeg rolinformatie toe als die beschikbaar is
                if (result.roleMessage) {
                    responseMessage += result.roleMessage;
                }
            } else {
                // Normaal XP bericht zonder level-up
                responseMessage = `<@${target.id}> heeft **${amount}** XP ontvangen en is nu op level **${result.user.level}** met **${result.user.xp}** XP in totaal.`;
                // Bereken en toon hoeveel XP nog nodig is voor het volgende level
                const xpNeeded = Levels.xpFor(result.user.level + 1) - result.user.xp;
                responseMessage += `\nNog **${xpNeeded}** XP nodig voor level **${result.user.level + 1}**.`;
            }
            
            await interaction.editReply({ content: responseMessage });
            
        } catch (error) {
            console.error('Fout bij het uitvoeren van het givexp commando:', error);
            return interaction.editReply({
                content: 'Er is een fout opgetreden bij het geven van XP. Probeer het later opnieuw.',
            });
        }
    }
}; 