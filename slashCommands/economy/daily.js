const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { primaryColor } = require('../../config'); // Zorg ervoor dat je deze hebt geconfigureerd in je config

module.exports = {
    name: 'daily',
    description: "Claim je dagelijkse beloning binnen de economiemodule.",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }
// Haal de gebruiker op uit de cache van de economie
        let user = client.eco.cache.users.get({
            memberID: interaction.member.id,
            guildID: interaction.guild.id
        });

        try {
            // Haal de daily reward informatie op
            const dailyResult = await user.rewards.getDaily();

            // Als de daily reward nog niet geclaimd is, geef de cooldown tijd weer
            if (!dailyResult.claimed) {
                const cooldownTime = dailyResult.cooldown.time;

                // Formatteer de cooldown tijd (dagen, uren, minuten, seconden)
                const cooldownTimeString =
                    `${cooldownTime.days ? `**${cooldownTime.days}** dagen, ` : ''}` +
                    `${cooldownTime.hours ? `**${cooldownTime.hours}** uren, ` : ''}` +
                    `${cooldownTime.minutes ? `**${cooldownTime.minutes}** minuten, ` : ''}` +
                    `**${cooldownTime.seconds}** seconden`;

                // Reageer met de cooldown tijd
                return interaction.reply({
                    content: `Je kunt je dagelijkse beloning claimen over ${cooldownTimeString}.`,
                    ephemeral: true
                });
            }

            // Maak de embed aan als de dagelijkse beloning is geclaimd
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.username}'s daily`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(`${interaction.user}, je hebt je dagelijkse beloning van **${dailyResult.reward}** euro geclaimd!`)
                .setColor('#0C2F56') // Kleur die je graag wilt

            // Stuur de embed als reactie
            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Fout bij ophalen dagelijkse beloning:', error);

            // Toon een foutmelding als er iets mis gaat
            return interaction.reply({
                content: 'Er is een probleem opgetreden bij het claimen van je dagelijkse beloning. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};
