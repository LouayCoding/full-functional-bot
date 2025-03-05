const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config');// Zorg ervoor dat je deze hebt geconfigureerd in je config

module.exports = {
    name: 'work',
    description: "Werk hard en claim je beloning binnen de economiemodule.",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        try {
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }

            // Controleer of de economy module correct is geladen
            if (!client.eco) {
                console.error('Economy module is niet correct geladen!');
                return interaction.reply({
                    content: 'Het economiesysteem is momenteel niet beschikbaar. Neem contact op met de botbeheerder.',
                    ephemeral: true
                });
            }
            
            // Haal de gebruiker op uit de cache van de economie
            let user = await client.eco.users.get(interaction.member.id, interaction.guild.id);
            
            // Controleer of de gebruiker correct is opgehaald
            if (!user) {
                console.error('Gebruiker kon niet worden opgehaald uit de economie cache.');
                return interaction.reply({
                    content: 'Je profiel kon niet worden geladen. Probeer het later opnieuw.',
                    ephemeral: true
                });
            }

            // Haal de work reward informatie op
            const workResult = await user.rewards.getWork();

            // Als de work reward nog niet geclaimd is, geef de cooldown tijd weer
            if (!workResult.claimed) {
                const cooldownTime = workResult.cooldown.time;

                // Formatteer de cooldown tijd (dagen, uren, minuten, seconden)
                const cooldownTimeString =
                    `${cooldownTime.days ? `**${cooldownTime.days}** dagen, ` : ''}` +
                    `${cooldownTime.hours ? `**${cooldownTime.hours}** uren, ` : ''}` +
                    `${cooldownTime.minutes ? `**${cooldownTime.minutes}** minuten, ` : ''}` +
                    `**${cooldownTime.seconds}** seconden`;

                // Reageer met de cooldown tijd
                return interaction.reply({
                    content: `Je kunt weer werken over ${cooldownTimeString}.`,
                    ephemeral: true
                });
            }

            // Maak de embed aan als de werkbeloning is geclaimd
            
            // Array met verschillende werkteksten
            const werkVerhalen = [
                "Je hebt een dag doorgebracht als vuilnisman en vond een waardevol horloge tussen het afval. Je hebt het verkocht voor **{bedrag}** euro!",
                "Als pizzabezorger heb je zoveel bestellingen afgeleverd dat je **{bedrag}** euro aan fooien hebt gekregen!",
                "Je hebt meegeholpen bij een filmopname als figurant en **{bedrag}** euro verdiend!",
                "Na een dag programmeren heb je een belangrijke bug gevonden. Je baas was zo blij dat je **{bedrag}** euro bonus kreeg!",
                "Je hebt een middag gewerkt als hondenuitlater en **{bedrag}** euro verdiend terwijl je met schattige hondjes speelde!",
                "Je dagje als tuinman heeft je **{bedrag}** euro opgeleverd. De buren waren zo onder de indruk dat ze je aanraden bij hun vrienden!",
                "Als barista heb je zoveel perfecte koffie gemaakt dat klanten speciaal terugkwamen voor jou. Je hebt **{bedrag}** euro aan fooien ontvangen!",
                "Je hebt een middag geholpen bij de lokale boerderij en **{bedrag}** euro plus een krat verse groenten verdiend!",
                "Als oppas heb je een wild feestje onder controle weten te houden. De dankbare ouders gaven je **{bedrag}** euro!",
                "Je dagje als rondleider in het museum heeft je **{bedrag}** euro opgeleverd. De bezoekers waren dol op je grappige anekdotes!"
            ];

            // Kies een willekeurig werkverhaal
            const randomWerkIndex = Math.floor(Math.random() * werkVerhalen.length);
            let werkTekst = werkVerhalen[randomWerkIndex].replace('{bedrag}', workResult.reward);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.username}'s work`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(werkTekst)
                .setColor(embedColor) // Kleur die je graag wilt
                .setFooter({ text: 'Kom morgen terug voor meer werk!' })
                .setTimestamp();

            // Stuur de embed als reactie
            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Fout bij ophalen werkbeloning:', error);

            // Toon een foutmelding als er iets mis gaat
            return interaction.reply({
                content: 'Er is een probleem opgetreden bij het claimen van je werkbeloning. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};
