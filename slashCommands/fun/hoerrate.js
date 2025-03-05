const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { embedColor } = require('../../config.json')

// Object om de hoerrate per gebruiker op te slaan
const hoerRates = new Map();

module.exports = {
    name: 'hoerrate',
    description: "Bekijk hoe hoerig iemand is",
    type: ApplicationCommandType.ChatInput,
    cooldown: 3000,
    options: [
        {
            name: 'gebruiker', 
            description: 'De gebruiker die je wilt controleren.',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    run: async (client, interaction) => {
        const user = interaction.options.get('gebruiker')?.user || interaction.user;
        const text = kechRate(user, interaction.user);

        const embed = new EmbedBuilder()
            .setDescription(text)
            .setColor(embedColor)

        await interaction.reply({ embeds: [embed] });

        function kechRate(mentionedUser, author) {
            // Check of er al een rate bestaat voor deze gebruiker
            if (!hoerRates.has(mentionedUser.id)) {
                let result;
                // Speciale check voor specifieke gebruiker
                if (mentionedUser.id === '1211218077019279390') {
                    result = 100000;
                } else {
                    // Haal het member object op voor de genoemde gebruiker
                    const targetMember = interaction.guild.members.cache.get(mentionedUser.id);
                    const hasRole = targetMember.roles.cache.has('1331695082696347649');
                    if (hasRole) {
                        // Genereer een getal tussen 60 en 100 voor gebruikers met de specifieke rol
                        result = Math.floor(Math.random() * 41) + 60;
                    } else {
                        // Normaal getal tussen 1 en 100 voor anderen
                        result = Math.ceil(Math.random() * 100);
                    }
                }
                hoerRates.set(mentionedUser.id, result);
            }
            
            // Haal de opgeslagen rate op
            const rate = hoerRates.get(mentionedUser.id);
            return `${mentionedUser} is **${rate}%** hoer.`
        }
    }
};
