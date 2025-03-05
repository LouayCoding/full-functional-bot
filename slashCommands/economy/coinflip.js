const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config.json');

module.exports = {
    name: 'coinflip',
    description: "Zet geld in op kop of munt met een 50/50 kans om je inzet te verdubbelen of te verliezen.",
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
            description: 'Kies kop of munt',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Kop', value: 'kop' },
                { name: 'Munt', value: 'munt' }
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
            
            // Genereer het resultaat (kop of munt)
            const resultaat = Math.random() < 0.5 ? 'kop' : 'munt';
            
            // Bepaal of de gebruiker heeft gewonnen
            const gewonnen = resultaat === keuze;
            
            // Update de balans van de gebruiker
            let nieuweBalans;
            if (gewonnen) {
                await economyUser.balance.add(inzet, 'Gewonnen bij coinflip');
                nieuweBalans = userBalance + inzet;
            } else {
                await economyUser.balance.subtract(inzet, 'Verloren bij coinflip');
                nieuweBalans = userBalance - inzet;
            }
            
            // Voorbereiding van het bericht
            const embed = new EmbedBuilder()
                .setColor(gewonnen ? '#00FF00' : '#FF0000')
                .setAuthor({ name: `Coinflip`, iconURL: gebruiker.displayAvatarURL() })
                .setDescription(`De coin viel op ${resultaat} - €${inzet}`)
                .setFooter({ text: `${gewonnen ? 'Gewonnen!' : 'Verloren...'} | Nieuw saldo: €${nieuweBalans}` })
                .setTimestamp()
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Fout bij coinflip commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 