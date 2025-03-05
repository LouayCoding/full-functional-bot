const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { primaryColor } = require('../../config'); // Zorg ervoor dat je deze hebt geconfigureerd in je config

module.exports = {
    name: 'weekly',
    description: "Claim je wekelijkse beloning binnen de economiemodule.",
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
            // Haal de weekly reward informatie op
            const weeklyResult = await user.rewards.getWeekly();

            // Als de weekly reward nog niet geclaimd is, geef de cooldown tijd weer
            if (!weeklyResult.claimed) {
                const cooldownTime = weeklyResult.cooldown.time;

                // Formatteer de cooldown tijd (dagen, uren, minuten, seconden)
                const cooldownTimeString =
                    `${cooldownTime.days ? `**${cooldownTime.days}** dagen, ` : ''}` +
                    `${cooldownTime.hours ? `**${cooldownTime.hours}** uren, ` : ''}` +
                    `${cooldownTime.minutes ? `**${cooldownTime.minutes}** minuten, ` : ''}` +
                    `**${cooldownTime.seconds}** seconden`;

                // Reageer met de cooldown tijd
                return interaction.reply({
                    content: `Je kunt je wekelijkse beloning claimen over ${cooldownTimeString}.`,
                    ephemeral: true
                });
            }

            // Maak de embed aan als de wekelijkse beloning is geclaimd
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.username}'s weekly`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(`${interaction.user}, je hebt je wekelijkse beloning van **${weeklyResult.reward}** euro geclaimd!`)
                .setColor(embedColor) // Kleur die je graag wilt

            // Stuur de embed als reactie
            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Fout bij ophalen wekelijkse beloning:', error);

            // Toon een foutmelding als er iets mis gaat
            return interaction.reply({
                content: 'Er is een probleem opgetreden bij het claimen van je wekelijkse beloning. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};
