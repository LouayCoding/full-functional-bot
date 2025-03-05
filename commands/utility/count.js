const { EmbedBuilder } = require('discord.js');
const CountingStats = require('../../models/CountingStats');

module.exports = {
    name: 'count',
    description: 'Bekijk je counting statistieken',
    usage: '!count [user]',
    category: 'Utility',
    aliases: ['countingstats', 'countstats'],
    cooldown: 5,
    
    run: async (client, message, args) => {
        const config = require('../../config.json');
        
        // Controleer of counting is ingeschakeld
        if (!config.counting || !config.counting.enabled || !config.counting.userStats.enabled) {
            message.channel.send('Het counting statistieken systeem is momenteel uitgeschakeld.');
            return;
        }
        
        // Bepaal voor welke gebruiker we statistieken moeten ophalen
        const targetId = args[0] ? args[0].replace(/[<@!>]/g, '') : message.author.id;
        let targetUser;
        
        try {
            targetUser = await message.guild.members.fetch(targetId);
        } catch (error) {
            targetUser = message.author;
        }
        
        // Haal statistieken op
        const stats = await CountingStats.findOne({ 
            guildId: message.guild.id, 
            userId: targetUser.id 
        });
        
        if (!stats) {
            message.channel.send(`Er zijn nog geen counting statistieken beschikbaar voor ${targetUser}.`);
            return;
        }
        
        // Maak embed
        const statsEmbed = new EmbedBuilder()
            .setColor(config.counting.embedColor || config.embedColor || '#fafafa')
            .setTitle(`Counting Statistieken - ${targetUser.user.username}`)
            .setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                { name: 'Correcte tellingen', value: stats.correctCounts.toString(), inline: true },
                { name: 'Fouten', value: stats.mistakes.toString(), inline: true },
                { name: 'Succesratio', value: `${stats.correctCounts + stats.mistakes > 0 ? Math.round((stats.correctCounts / (stats.correctCounts + stats.mistakes)) * 100) : 0}%`, inline: true },
                { name: 'Huidige reeks', value: stats.currentStreak.toString(), inline: true },
                { name: 'Hoogste reeks', value: stats.highestStreak.toString(), inline: true },
                { name: 'Hoogste bijdrage', value: stats.highestContribution.toString(), inline: true }
            ])
            .setFooter({ text: `Laatste update: ${new Date(stats.lastUpdated).toLocaleString()}` })
            .setTimestamp();
        
        // Als hoogste score ingeschakeld is, voeg deze toe
        if (config.counting.highestScore.enabled && config.counting.highestScore.userId === targetUser.id) {
            statsEmbed.addFields([
                { name: '🏆 Recordhouder', value: `Hoogste score: **${config.counting.highestScore.value}**`, inline: false }
            ]);
        }
        
        message.channel.send({ embeds: [statsEmbed] });
    }
}; 