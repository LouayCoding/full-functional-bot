module.exports = {
    id: 'why_button',
    permissions: [],
    run: async (client, interaction) => {
        // Stuur een ephemeral bericht met uitleg over de reden voor verificatie
        await interaction.reply({
            content: 'Verificatie helpt ons om spam te verminderen en de veiligheid van onze server te waarborgen. Door jezelf te verifiëren, krijgen we een extra bevestiging dat je een echte gebruiker bent.',
            ephemeral: true
        });
    }
};
