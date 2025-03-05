const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');

module.exports = {
    name: 'withdraw',
    description: 'Haal euro uit je bank.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'bedrag',
            description: 'Het bedrag van euro dat je wilt opnemen.',
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

        const gebruikerBankBalance = await gebruiker.bank.get();
        const bedrag = bedragString === 'all' ? gebruikerBankBalance : parseInt(bedragString);

        if (!bedrag || isNaN(bedrag) || bedrag <= 0) {
            return interaction.reply({
                content: `${zender}, geef een geldig bedrag euro op om op te nemen.`,
                ephemeral: true
            });
        }

        if (gebruikerBankBalance < bedrag) {
            return interaction.reply({
                content: `${zender}, je hebt niet genoeg euro in je bank om deze opname uit te voeren.`,
                ephemeral: true
            });
        }

        try {
            // Voer de opname uit
            await gebruiker.balance.add(bedrag, `opgenomen ${bedrag} euro`);
            await gebruiker.bank.subtract(bedrag, `opgenomen ${bedrag} euro`);

            // Stuur de embed reactie
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${zender.username}`, iconURL: zender.displayAvatarURL() })
                .setDescription(
                    `${zender}, je hebt **${bedrag}** euro opgenomen uit je bank.`
                )
                .setColor('#0C2F56') // Kleur voor de embed

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Fout bij het opnemen van euro:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het verwerken van de opname. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};
