const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config');

module.exports = {
    name: 'transfer',
    description: 'Verstuur euro naar een andere gebruiker in het economiemodule.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker naar wie je euro wilt versturen.',
            type: 6, // Type 6 is voor gebruikers
            required: true
        },  
        {
            name: 'bedrag',
            description: 'Het bedrag van euro dat je wilt versturen.',
            type: 3, // Type 3 is voor strings (om zowel getallen als "all" te ondersteunen)
            required: true
        }
    ],
    run: async (client, interaction) => {
        
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }
const ontvanger = interaction.options.getUser('gebruiker');
        const bedragString = interaction.options.getString('bedrag');
        const zender = interaction.user;

        // Controleer of de gebruiker niet naar zichzelf probeert te sturen
        if (ontvanger.id === zender.id) {
            return interaction.reply({
                content: `${zender}, je kunt geen geld naar jezelf versturen.`,
                ephemeral: true
            });
        }

        // Haal de gebruiker op uit de cache van de economie
        let gebruiker = client.eco.cache.users.get({
            memberID: zender.id,
            guildID: interaction.guild.id
        });

        let ontvangerGebruiker = client.eco.cache.users.get({
            memberID: ontvanger.id,
            guildID: interaction.guild.id
        });

        const zenderBalance = await gebruiker.balance.get();
        const bedrag = bedragString === 'all' ? zenderBalance : parseInt(bedragString);

        if (!ontvangerGebruiker) {
            return interaction.reply({
                content: `${zender}, gebruiker niet gevonden.`,
                ephemeral: true
            });
        }

        if (!bedrag || isNaN(bedrag) || bedrag <= 0) {
            return interaction.reply({
                content: `${zender}, geef een geldig bedrag geld op om te versturen.`,
                ephemeral: true
            });
        }

        if (zenderBalance < bedrag) {
            return interaction.reply({
                content: `${zender}, je hebt niet genoeg geld om deze transfer uit te voeren.`,
                ephemeral: true
            });
        }

        try {
            // Voer de transfer uit
            const transferResult = await ontvangerGebruiker.balance.transfer({
                amount: bedrag,
                senderMemberID: zender.id,
                sendingReason: `Verstuurde ${bedrag} euro naar ${ontvanger.tag}.`,
                receivingReason: `Ontvangen ${bedrag} euro van ${zender.tag}.`
            });

            // Stuur de embed reactie
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${zender.username}`, iconURL: zender.displayAvatarURL() })
                .setDescription(
                    `${zender}, je hebt **${transferResult.amount}** euro verstuurd naar ${ontvanger}.`
                )
                .setColor(embedColor) // Kleur voor de embed

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Fout bij het versturen van euro:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het verwerken van de transfer. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};
