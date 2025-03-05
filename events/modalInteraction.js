// const client = require('..');

// client.on('interactionCreate', async interaction => {
//     // Controleer of het een modal-submissie is
//     if (interaction.isModalSubmit()) {
//         const modalId = interaction.customId.split('_')[0]; // Haal het modal-id op zonder parameters
//         const modal = client.modals.get(modalId);

//         if (!modal) return;

//         try {
//             await modal.run(client, interaction);
//         } catch (error) {
//             console.error(`Er is een fout opgetreden bij het verwerken van de modal: ${modalId}`);
//             console.error(error);
//             await interaction.reply({ content: 'Er is iets fout gegaan bij het verwerken van je invoer.', ephemeral: true });
//         }
//     }
// });
