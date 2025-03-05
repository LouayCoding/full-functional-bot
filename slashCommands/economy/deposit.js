const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor } = require('../../config.json');

module.exports = {
    name: 'deposit',
    description: 'Stort euro naar je bank.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'bedrag',
            description: 'Het bedrag van euro dat je wilt storten.',
            type: 3, // Type 3 is voor strings
            required: true
        }
    ],
    run: async (client, interaction) => {
        
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }
const bedragString = interaction.options.getString('bedrag');
        const zender = interaction.user;

        // Haal de gebruiker op uit de cache van de economie
        let gebruiker = client.eco.cache.users.get({
            memberID: zender.id,
            guildID: interaction.guild.id
        });

        const gebruikerBalance = await gebruiker.balance.get();
        const bedrag = bedragString === 'all' ? gebruikerBalance : parseInt(bedragString);

        if (!bedrag || isNaN(bedrag) || bedrag <= 0) {
            return interaction.reply({
                content: `${zender}, geef een geldig bedrag euro op om te storten.`,
                ephemeral: true
            });
        }

        if (gebruikerBalance < bedrag) {
            return interaction.reply({
                content: `${zender}, je hebt niet genoeg euro om deze storting uit te voeren.`,
                ephemeral: true
            });
        }

        try {
            // Voer de storting uit
            await gebruiker.balance.subtract(bedrag, `gestort ${bedrag} euro`);
            await gebruiker.bank.add(bedrag, `gestort ${bedrag} euro`);

            // Stuur de embed reactie
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${zender.username}`, iconURL: zender.displayAvatarURL() })
                .setDescription(
                    `${zender}, je hebt **${bedrag}** euro gestort naar je bank.`
                )
                .setColor(embedColor)

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Fout bij het storten van euro:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het verwerken van de storting. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};
