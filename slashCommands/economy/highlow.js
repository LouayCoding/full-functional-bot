const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config.json');

module.exports = {
    name: 'highlow',
    description: "Raad of de volgende kaart hoger of lager is en win geld.",
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
            name: 'keuze',
            description: 'Raad of de volgende kaart hoger of lager zal zijn',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Hoger', value: 'hoger' },
                { name: 'Lager', value: 'lager' }
            ],
            required: true
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
            const keuze = interaction.options.getString('keuze');
            
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
            
            // Genereer twee willekeurige kaarten (2-14, waarbij 11=J, 12=Q, 13=K, 14=A)
            const kaartWaarden = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            const kaartSoorten = ['♥', '♦', '♣', '♠'];
            
            const eersteKaartWaarde = Math.floor(Math.random() * 13);
            const eersteKaartSoort = Math.floor(Math.random() * 4);
            const tweedeKaartWaarde = Math.floor(Math.random() * 13);
            const tweedeKaartSoort = Math.floor(Math.random() * 4);
            
            const eersteKaart = `${kaartWaarden[eersteKaartWaarde]}${kaartSoorten[eersteKaartSoort]}`;
            const tweedeKaart = `${kaartWaarden[tweedeKaartWaarde]}${kaartSoorten[tweedeKaartSoort]}`;
            
            // Bepaal of de speler juist heeft geraden
            let juistGeraden;
            if (keuze === 'hoger') {
                juistGeraden = tweedeKaartWaarde > eersteKaartWaarde;
            } else { // lager
                juistGeraden = tweedeKaartWaarde < eersteKaartWaarde;
            }
            
            // Als de waarden gelijk zijn, is het altijd verloren
            if (tweedeKaartWaarde === eersteKaartWaarde) {
                juistGeraden = false;
            }
            
            // Update de balans van de gebruiker
            let nieuweBalans;
            if (juistGeraden) {
                await economyUser.balance.add(inzet, 'Gewonnen bij highlow');
                nieuweBalans = userBalance + inzet;
            } else {
                await economyUser.balance.subtract(inzet, 'Verloren bij highlow');
                nieuweBalans = userBalance - inzet;
            }
            
            // Voorbereiding van het bericht
            const embed = new EmbedBuilder()
                .setColor(juistGeraden ? '#00FF00' : '#FF0000')
                .setAuthor({ name: `Highlow`, iconURL: gebruiker.displayAvatarURL() })
                .setDescription(`Eerste kaart: **${eersteKaart}**
Tweede kaart: **${tweedeKaart}**
Je koos: **${keuze}**
${juistGeraden ? `Gewonnen: €${inzet}` : `Verloren: €${inzet}`}`)
                .setFooter({ text: `Nieuw saldo: €${nieuweBalans}` });
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Fout bij highlow commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 