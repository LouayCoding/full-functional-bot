const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { embedColor } = require('../../config.json');

module.exports = {
    name: 'copyprofile',
    description: "Kopieer het profiel van een andere gebruiker",
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker waarvan je het profiel wilt kopiëren',
            type: 6,
            required: true
        }
    ],
    run: async (client, interaction) => {
        // Check permissies
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "Je hebt geen administrator permissies om dit commando te gebruiken!",
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('gebruiker');
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        const botMember = interaction.guild.members.me;

        try {
            // Kopieer nickname van de bot
            await botMember.setNickname(targetMember.displayName);

            // Update bot profiel foto
            await client.user.setAvatar(targetMember.user.displayAvatarURL({ dynamic: true, size: 1024 }));

            // Kopieer hoogste rol kleur naar bot's hoogste rol
            const targetHighestRole = targetMember.roles.highest;
            if (targetHighestRole && targetHighestRole.color !== 0) {
                const botHighestRole = botMember.roles.highest;
                if (botHighestRole.editable) {
                    await botHighestRole.setColor(targetHighestRole.color);
                }
            }

            // Maak embed voor succesvolle kopie
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setAuthor({
                    name: targetUser.tag,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`${targetUser} zijn profiel is succesvol gekopieerd naar de bot!`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: "Er is een fout opgetreden bij het kopiëren van het profiel naar de bot.",
                ephemeral: true
            });
        }
    }
};


