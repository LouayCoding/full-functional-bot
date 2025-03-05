const { EmbedBuilder } = require('discord.js');
const { embedColor, prefix } = require('../../config.json');

module.exports = {
    name: 'avatar',
    description: "Bekijk iemands avatar",
    run: async (client, message, args) => {
        try {
            const targetUser = message.mentions.users.first() || message.author;

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setAuthor({ 
                    name: targetUser.username,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setTitle('Server Avatar')
                .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 4096 }))
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Fout bij avatar commando:', error);
            await message.reply('Er is een fout opgetreden bij het ophalen van de avatar.');
        }
    }
};