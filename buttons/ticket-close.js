module.exports = {
    id: 'close_ticket',
    permissions: [],
    run: async (client, interaction) => {
        const channel = interaction.channel;

        // Controleer of het kanaal een ticket is
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: 'Dit kanaal is geen ticketkanaal.',
                ephemeral: true,
            });
        }

        // Waarschuw dat het ticket wordt gesloten
        await interaction.reply({
            content: 'Het ticket wordt binnen **5 seconden** verwijderd.',
        });

        // Wacht 5 seconden en verwijder daarna het kanaal
        setTimeout(() => {
            channel.delete().catch((error) => {
                console.error('Fout bij het verwijderen van een kanaal:', error);
            });
        }, 5000);
    },
};
