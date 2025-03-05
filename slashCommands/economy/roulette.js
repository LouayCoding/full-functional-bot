const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config.json');

module.exports = {
    name: 'roulette',
    description: "Speel roulette en zet geld in op verschillende opties.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 5000,
    options: [
        {
            name: 'inzet',
            description: 'Het bedrag dat je wilt inzetten',
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: 'type',
            description: 'Type inzet',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Rood', value: 'rood' },
                { name: 'Zwart', value: 'zwart' },
                { name: 'Even', value: 'even' },
                { name: 'Oneven', value: 'oneven' },
                { name: 'Nummer', value: 'nummer' }
            ],
            required: true
        },
        {
            name: 'nummer',
            description: 'Kies een nummer (0-36) als je op een nummer inzet',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            minValue: 0,
            maxValue: 36
        }
    ],
    run: async (client, interaction) => {
        try {
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }

            const gebruiker = interaction.user;
            const inzet = interaction.options.getInteger('inzet');
            const inzetType = interaction.options.getString('type');
            const gekozenNummer = interaction.options.getInteger('nummer');
            
            // Controleer de eisen voor het type inzet
            if (inzetType === 'nummer' && gekozenNummer === null) {
                return interaction.reply({
                    content: 'Je moet een nummer kiezen als je op een nummer inzet!',
                    ephemeral: true
                });
            }
            
            // Controleer of de inzet positief is
            if (inzet <= 0) {
                return interaction.reply({
                    content: 'Je inzet moet een positief getal zijn!',
                    ephemeral: true
                });
            }
            
            // Haal gebruiker op uit economy systeem
            const economyUser = client.eco.cache.users.get({
                memberID: gebruiker.id,
                guildID: interaction.guild.id
            });
            
            if (!economyUser) {
                return interaction.reply({
                    content: 'Je economy profiel kon niet worden geladen. Probeer het later opnieuw.',
                    ephemeral: true
                });
            }
            
            // Controleer of gebruiker genoeg geld heeft
            const userBalance = await economyUser.balance.get();
            
            if (userBalance < inzet) {
                return interaction.reply({
                    content: `Je hebt niet genoeg geld! Je huidige saldo is €${userBalance}.`,
                    ephemeral: true
                });
            }
            
            // Toon een eerste bericht dat het spel bezig is
            const wachtEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setAuthor({ name: `Roulette`, iconURL: gebruiker.displayAvatarURL() })
                .setTitle('De roulette draait...')
                .setDescription(`${gebruiker.username} heeft €${inzet} ingezet op ${inzetType}${inzetType === 'nummer' ? ` (${gekozenNummer})` : ''}`)
                .setFooter({ text: 'De bal rolt... Even geduld...' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [wachtEmbed] });
            
            // Draai de roulette
            const resultaatNummer = Math.floor(Math.random() * 37); // 0-36
            
            // Bepaal de eigenschappen van het resultaat
            const isRood = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(resultaatNummer);
            const isZwart = resultaatNummer !== 0 && !isRood;
            const isEven = resultaatNummer !== 0 && resultaatNummer % 2 === 0;
            const isOneven = resultaatNummer !== 0 && resultaatNummer % 2 !== 0;
            
            // Controleer of de gebruiker heeft gewonnen
            let gewonnen = false;
            let uitbetaling = 0;
            
            switch (inzetType) {
                case 'rood':
                    gewonnen = isRood;
                    uitbetaling = inzet * 2;
                    break;
                case 'zwart':
                    gewonnen = isZwart;
                    uitbetaling = inzet * 2;
                    break;
                case 'even':
                    gewonnen = isEven;
                    uitbetaling = inzet * 2;
                    break;
                case 'oneven':
                    gewonnen = isOneven;
                    uitbetaling = inzet * 2;
                    break;
                case 'nummer':
                    gewonnen = resultaatNummer === gekozenNummer;
                    uitbetaling = inzet * 36;
                    break;
            }
            
            // Update de balans van de gebruiker
            let nieuweBalans;
            if (gewonnen) {
                const winst = uitbetaling - inzet;
                await economyUser.balance.add(winst, 'Gewonnen bij roulette');
                nieuweBalans = userBalance + winst;
            } else {
                await economyUser.balance.subtract(inzet, 'Verloren bij roulette');
                nieuweBalans = userBalance - inzet;
            }
            
            // Bepaal de kleur (voor visuele weergave in embed)
            const resultaatKleur = resultaatNummer === 0 ? '🟢' : (isRood ? '🔴' : '⚫');
            
            // Voorbereiding van het resultaat bericht
            const resultaatEmbed = new EmbedBuilder()
                .setColor(gewonnen ? '#00FF00' : '#FF0000')
                .setAuthor({ name: `Roulette`, iconURL: gebruiker.displayAvatarURL() })
                .setTitle(`De bal viel op ${resultaatKleur} ${resultaatNummer}`)
                .setDescription(`Je hebt ingezet op: ${inzetType}${inzetType === 'nummer' ? ` (${gekozenNummer})` : ''}`)
                .addFields(
                    { name: 'Inzet', value: `€${inzet}`, inline: true },
                    { name: 'Resultaat', value: gewonnen ? `Gewonnen! (+€${uitbetaling - inzet})` : 'Verloren...', inline: true },
                    { name: 'Nieuw saldo', value: `€${nieuweBalans}`, inline: true }
                )
                .setTimestamp();
            
            // Wacht 5 seconden voordat het resultaat getoond wordt
            setTimeout(async () => {
                await interaction.editReply({ embeds: [resultaatEmbed] });
            }, 5000);
            
        } catch (error) {
            console.error('Fout bij roulette commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 