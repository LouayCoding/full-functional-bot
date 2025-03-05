const { EmbedBuilder } = require('discord.js');
const { embedColor, footerText } = require('../../config.json');

module.exports = {
    name: 'avatar',
    aliases: ['av'],
    description: "Bekijk iemands avatar",
    cooldown: 3000,
    userPerms: [],
    botPerms: [],
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
                .setTimestamp()
                .setFooter({ text: footerText });

            await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

        } catch (error) {
            console.error('Fout bij avatar commando:', error);
            await message.reply({ content: 'Er is een fout opgetreden bij het ophalen van de avatar.', allowedMentions: { repliedUser: false } });
        }
    }
};
