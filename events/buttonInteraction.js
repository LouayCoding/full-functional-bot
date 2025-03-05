const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const client = require('..');

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // Controleer op dynamische CustomId voor "untimeout_" en "unban_"
    let buttonId;
    if (interaction.customId.startsWith('untimeout_')) {
        buttonId = 'untimeout';
    } else if (interaction.customId.startsWith('unban_')) {
        buttonId = 'unban';
    } else if (interaction.customId.startsWith('country_')) {
        buttonId = 'country';
    } else if (interaction.customId.startsWith('age_')) {
        buttonId = 'age';
    } else if (interaction.customId.startsWith('betaal_')) {
        buttonId = 'betaal';
    } else {
        buttonId = interaction.customId;
    }

    const button = client.buttons.get(buttonId);
    if (!button) return;

    try {
        if (button.permissions) {
            if (!interaction.memberPermissions.has(PermissionsBitField.resolve(button.permissions || []))) {
                const perms = new EmbedBuilder()
                    .setDescription(`🚫 ${interaction.user}, You don't have \`${button.permissions}\` permissions to interact with this button!`)
                    .setColor('Red');
                return interaction.reply({ embeds: [perms], ephemeral: true });
            }
        }

        // Voer de button uit met de volledige interactie
        await button.run(client, interaction);
    } catch (error) {
        console.log(error);
    }
});
