const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embedColor, footerText } = require('../../config.json')

module.exports = {
    name: 'avatar',
    description: "Bekijk je eigen avatar of die van iemand anders.",
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker wiens avatar je wilt bekijken.',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    run: async (client, interaction) => {
        // Haal de opgegeven gebruiker op of gebruik de interactiegebruiker als er geen is opgegeven
        const targetUser = interaction.options.getUser('gebruiker') || interaction.user;

        // Force fetch om volledige gebruikersinformatie op te halen, inclusief banner
        const fetchedUser = await client.users.fetch(targetUser.id, { force: true });
        const member = await interaction.guild.members.fetch(targetUser.id);
        
        // Embed voor de avatar
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`Avatar van ${fetchedUser.username}`)
            .setImage(fetchedUser.displayAvatarURL({ dynamic: true, size: 4096, format: "png" }))
            .setFooter({ text: footerText })
            .setTimestamp();

        // Knoppen voor avatar opties met unieke CustomId
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`profile_avatar_${fetchedUser.id}`)
                    .setLabel('Profiel Avatar')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`server_avatar_${fetchedUser.id}`)
                    .setLabel('Server Avatar')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!member.avatar),
                new ButtonBuilder()
                    .setCustomId(`banner_${fetchedUser.id}`)
                    .setLabel('Banner')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!fetchedUser.banner) // Banner beschikbaarheid controleren na force fetch
            );

        // Verstuur het embed-bericht met knoppen
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
    }
};
