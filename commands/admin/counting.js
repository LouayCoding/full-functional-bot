const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Counting = require('../../models/Counting');
const CountingStats = require('../../models/CountingStats');
const CountingChallenge = require('../../models/CountingChallenge');

module.exports = {
    name: 'counting',
    description: 'Beheer het counting systeem',
    usage: '!counting <reset|status|enable|disable|set|theme|challenge|leaderboard|stats>',
    category: 'Admin',
    aliases: ['count'],
    cooldown: 5,
    userPermissions: ['ADMINISTRATOR'],
    
    run: async (client, message, args) => {
        // Config laden voor basisinstellingen
        const configPath = path.join(__dirname, '../../config.json');
        let config = require('../../config.json');
        
        // Als het counting object niet bestaat, maak het aan
        if (!config.counting) {
            config.counting = {
                enabled: true,
                saveInterval: 5,
                embedColor: '#FF0000'
            };
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
        }
        
        // Haal de huidige counting data op uit de database
        let countingData = await Counting.findOne({});
        
        // Als er geen data is, maak deze aan
        if (!countingData) {
            countingData = new Counting({
                currentNumber: 0,
                lastUserId: null
            });
            await countingData.save();
        }
        
        // Als er geen args zijn, toon de status
        if (!args[0]) {
            args[0] = 'status';
        }
        
        switch (args[0].toLowerCase()) {
            case 'reset':
                // Reset de teller
                countingData.currentNumber = 0;
                countingData.lastUserId = null;
                await countingData.save();
                
                const resetEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle('Counting Reset')
                    .setDescription('Het counting systeem is gereset. Het volgende nummer is nu 1.')
                    .setTimestamp();
                
                message.channel.send({ embeds: [resetEmbed] });
                break;
                
            case 'status':
                // Toon de status
                const statusEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle('Counting Status')
                    .addFields([
                        { name: 'Ingeschakeld', value: config.counting.enabled ? 'Ja' : 'Nee', inline: true },
                        { name: 'Huidig nummer', value: countingData.currentNumber.toString(), inline: true },
                        { name: 'Volgende nummer', value: (countingData.currentNumber + 1).toString(), inline: true },
                        { name: 'Laatste gebruiker', value: countingData.lastUserId ? `<@${countingData.lastUserId}>` : 'Niemand', inline: true },
                        { name: 'Kanaal', value: `<#${config.countingChannel}>`, inline: true },
                        { name: 'Hoogste score', value: config.counting.highestScore.value.toString(), inline: true },
                        { name: 'Recordhouder', value: config.counting.highestScore.userId ? `<@${config.counting.highestScore.userId}>` : 'Niemand', inline: true },
                        { name: 'Thema', value: config.counting.themes.enabled ? config.counting.themes.themes[config.counting.themes.currentTheme].name : 'Standaard', inline: true }
                    ])
                    .setTimestamp();
                
                message.channel.send({ embeds: [statusEmbed] });
                break;
                
            case 'enable':
                // Zet counting aan
                config.counting.enabled = true;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                
                const enableEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle('Counting Ingeschakeld')
                    .setDescription('Het counting systeem is nu ingeschakeld.')
                    .setTimestamp();
                
                message.channel.send({ embeds: [enableEmbed] });
                break;
                
            case 'disable':
                // Zet counting uit
                config.counting.enabled = false;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                
                const disableEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle('Counting Uitgeschakeld')
                    .setDescription('Het counting systeem is nu uitgeschakeld.')
                    .setTimestamp();
                
                message.channel.send({ embeds: [disableEmbed] });
                break;
                
            case 'set':
                // Controleer of er een nummer is opgegeven
                if (!args[1] || isNaN(parseInt(args[1]))) {
                    message.channel.send('Je moet een geldig nummer opgeven!');
                    return;
                }
                
                // Zet het huidige nummer
                const newNumber = parseInt(args[1]);
                countingData.currentNumber = newNumber;
                countingData.lastUserId = null; // Reset de laatste gebruiker
                await countingData.save();
                
                const setEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle('Counting Nummer Ingesteld')
                    .setDescription(`Het huidige nummer is nu ingesteld op **${newNumber}**. Het volgende nummer is **${newNumber + 1}**.`)
                    .setTimestamp();
                
                message.channel.send({ embeds: [setEmbed] });
                break;

            case 'theme':
                // Beheer het thema
                if (!args[1]) {
                    // Toon beschikbare thema's
                    const themesEmbed = new EmbedBuilder()
                        .setColor(config.embedColor || '#fafafa')
                        .setTitle('Counting Thema\'s')
                        .setDescription(`Huidig thema: **${config.counting.themes.themes[config.counting.themes.currentTheme].name}**`)
                        .setFooter({ text: 'Gebruik !counting theme <naam> om het thema te wijzigen.' });
                    
                    // Voeg alle beschikbare thema's toe
                    Object.keys(config.counting.themes.themes).forEach(key => {
                        const theme = config.counting.themes.themes[key];
                        themesEmbed.addFields([
                            { name: theme.name, value: theme.description, inline: false }
                        ]);
                    });
                    
                    message.channel.send({ embeds: [themesEmbed] });
                } else {
                    // Wijzig het thema
                    const themeKey = args[1].toLowerCase();
                    
                    if (!config.counting.themes.themes[themeKey]) {
                        message.channel.send(`Thema "${themeKey}" bestaat niet. Gebruik !counting theme voor een lijst met beschikbare thema's.`);
                        return;
                    }
                    
                    // Update het thema
                    config.counting.themes.enabled = true;
                    config.counting.themes.currentTheme = themeKey;
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                    
                    const themeEmbed = new EmbedBuilder()
                        .setColor(config.embedColor || '#fafafa')
                        .setTitle('Counting Thema Gewijzigd')
                        .setDescription(`Het thema is gewijzigd naar **${config.counting.themes.themes[themeKey].name}**.`)
                        .addFields([
                            { name: 'Beschrijving', value: config.counting.themes.themes[themeKey].description, inline: false }
                        ])
                        .setTimestamp();
                    
                    message.channel.send({ embeds: [themeEmbed] });
                }
                break;
                
            case 'challenge':
                // Beheer uitdagingen
                if (!args[1]) {
                    // Toon de huidige uitdaging
                    const challenge = await CountingChallenge.findOne({ 
                        guildId: message.guild.id, 
                        isCompleted: false,
                        endDate: { $gt: new Date() }
                    });
                    
                    if (!challenge) {
                        message.channel.send('Er is momenteel geen actieve uitdaging. Gebruik !counting challenge create <daily|weekly> <target> om een nieuwe uitdaging te maken.');
                        return;
                    }
                    
                    const challengeEmbed = new EmbedBuilder()
                        .setColor(config.embedColor || '#fafafa')
                        .setTitle(`${challenge.type === 'daily' ? 'Dagelijkse' : 'Wekelijkse'} Counting Uitdaging`)
                        .setDescription(`Bereik **${challenge.targetNumber}** voor <t:${Math.floor(challenge.endDate.getTime() / 1000)}:R>!`)
                        .addFields([
                            { name: 'Huidige stand', value: countingData.currentNumber.toString(), inline: true },
                            { name: 'Nog te gaan', value: (challenge.targetNumber - countingData.currentNumber).toString(), inline: true },
                            { name: 'Beloning', value: `${challenge.type === 'daily' ? config.counting.challenges.dailyReward : config.counting.challenges.weeklyReward} ${config.counting.rewards.economy.currencyName}`, inline: true }
                        ])
                        .setTimestamp();
                    
                    // Voeg top deelnemers toe
                    if (challenge.participants.length > 0) {
                        // Sorteer op bijdragen
                        challenge.participants.sort((a, b) => b.contributions - a.contributions);
                        
                        let topParticipants = challenge.participants.slice(0, 5).map((p, i) => 
                            `${i + 1}. ${p.username} - ${p.contributions} bijdragen`
                        ).join('\n');
                        
                        challengeEmbed.addFields([
                            { name: 'Top Deelnemers', value: topParticipants, inline: false }
                        ]);
                    }
                    
                    message.channel.send({ embeds: [challengeEmbed] });
                } else if (args[1] === 'create') {
                    // Maak een nieuwe uitdaging
                    if (!args[2] || !['daily', 'weekly'].includes(args[2])) {
                        message.channel.send('Je moet een geldig type opgeven (daily of weekly)!');
                        return;
                    }
                    
                    if (!args[3] || isNaN(parseInt(args[3]))) {
                        message.channel.send('Je moet een geldig doelnummer opgeven!');
                        return;
                    }
                    
                    const type = args[2];
                    const targetNumber = parseInt(args[3]);
                    
                    // Bereken de einddatum
                    const endDate = new Date();
                    if (type === 'daily') {
                        endDate.setDate(endDate.getDate() + 1);
                    } else {
                        endDate.setDate(endDate.getDate() + 7);
                    }
                    
                    // Maak de uitdaging
                    const newChallenge = new CountingChallenge({
                        guildId: message.guild.id,
                        type,
                        targetNumber,
                        startNumber: countingData.currentNumber,
                        startDate: new Date(),
                        endDate,
                        isCompleted: false,
                        participants: []
                    });
                    
                    await newChallenge.save();
                    
                    const newChallengeEmbed = new EmbedBuilder()
                        .setColor(config.embedColor || '#fafafa')
                        .setTitle(`Nieuwe ${type === 'daily' ? 'Dagelijkse' : 'Wekelijkse'} Uitdaging`)
                        .setDescription(`Bereik **${targetNumber}** voor <t:${Math.floor(endDate.getTime() / 1000)}:R>!`)
                        .addFields([
                            { name: 'Huidige stand', value: countingData.currentNumber.toString(), inline: true },
                            { name: 'Nog te gaan', value: (targetNumber - countingData.currentNumber).toString(), inline: true },
                            { name: 'Beloning', value: `${type === 'daily' ? config.counting.challenges.dailyReward : config.counting.challenges.weeklyReward} ${config.counting.rewards.economy.currencyName}`, inline: true }
                        ])
                        .setTimestamp();
                    
                    // Update config
                    config.counting.challenges.enabled = true;
                    config.counting.challenges.currentChallenge = {
                        type,
                        targetNumber,
                        endDate: endDate.toISOString()
                    };
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                    
                    message.channel.send({ embeds: [newChallengeEmbed] });
                }
                break;
                
            case 'leaderboard':
                // Toon een leaderboard
                const type = args[1] || 'correct';
                
                let stats;
                let title;
                let sortField;
                
                switch (type) {
                    case 'correct':
                        title = 'Meeste Correcte Tellingen';
                        sortField = 'correctCounts';
                        break;
                    case 'mistakes':
                        title = 'Meeste Fouten';
                        sortField = 'mistakes';
                        break;
                    case 'streak':
                        title = 'Hoogste Reeks';
                        sortField = 'highestStreak';
                        break;
                    case 'contribution':
                        title = 'Hoogste Bijdrage';
                        sortField = 'highestContribution';
                        break;
                    default:
                        title = 'Meeste Correcte Tellingen';
                        sortField = 'correctCounts';
                }
                
                // Haal top 10 stats op
                stats = await CountingStats.find({ guildId: message.guild.id })
                    .sort({ [sortField]: -1 })
                    .limit(10);
                
                const leaderboardEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle(`Counting Leaderboard - ${title}`)
                    .setTimestamp();
                
                if (stats.length === 0) {
                    leaderboardEmbed.setDescription('Er zijn nog geen statistieken beschikbaar.');
                } else {
                    let description = '';
                    
                    stats.forEach((stat, index) => {
                        description += `**${index + 1}.** <@${stat.userId}> - **${stat[sortField]}** ${sortField === 'correctCounts' ? 'correcte tellingen' : 
                            sortField === 'mistakes' ? 'fouten' : 
                            sortField === 'highestStreak' ? 'op rij' : 
                            'hoogste nummer'}\n`;
                    });
                    
                    leaderboardEmbed.setDescription(description);
                }
                
                message.channel.send({ embeds: [leaderboardEmbed] });
                break;
                
            case 'stats':
                // Toon statistieken voor een gebruiker
                const targetId = args[1] ? args[1].replace(/[<@!>]/g, '') : message.author.id;
                
                const userStats = await CountingStats.findOne({ 
                    guildId: message.guild.id, 
                    userId: targetId 
                });
                
                if (!userStats) {
                    message.channel.send(`Er zijn nog geen statistieken beschikbaar voor <@${targetId}>.`);
                    return;
                }
                
                const userStatsEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle(`Counting Statistieken - ${userStats.username}`)
                    .addFields([
                        { name: 'Correcte tellingen', value: userStats.correctCounts.toString(), inline: true },
                        { name: 'Fouten', value: userStats.mistakes.toString(), inline: true },
                        { name: 'Succesratio', value: `${userStats.correctCounts + userStats.mistakes > 0 ? Math.round((userStats.correctCounts / (userStats.correctCounts + userStats.mistakes)) * 100) : 0}%`, inline: true },
                        { name: 'Huidige reeks', value: userStats.currentStreak.toString(), inline: true },
                        { name: 'Hoogste reeks', value: userStats.highestStreak.toString(), inline: true },
                        { name: 'Hoogste bijdrage', value: userStats.highestContribution.toString(), inline: true }
                    ])
                    .setTimestamp();
                
                message.channel.send({ embeds: [userStatsEmbed] });
                break;

            default:
                // Onbekend commando
                const helpEmbed = new EmbedBuilder()
                    .setColor(config.embedColor || '#fafafa')
                    .setTitle('Counting Help')
                    .setDescription('Gebruik een van de volgende subcommando\'s:')
                    .addFields([
                        { name: '!counting reset', value: 'Reset de teller naar 0', inline: false },
                        { name: '!counting status', value: 'Toon de huidige status', inline: false },
                        { name: '!counting enable', value: 'Schakel het counting systeem in', inline: false },
                        { name: '!counting disable', value: 'Schakel het counting systeem uit', inline: false },
                        { name: '!counting set <nummer>', value: 'Stel het huidige nummer in', inline: false },
                        { name: '!counting theme [naam]', value: 'Bekijk of wijzig het huidige thema', inline: false },
                        { name: '!counting challenge [create <daily|weekly> <target>]', value: 'Bekijk of maak uitdagingen', inline: false },
                        { name: '!counting leaderboard [correct|mistakes|streak|contribution]', value: 'Toon een leaderboard', inline: false },
                        { name: '!counting stats [user]', value: 'Toon statistieken voor een gebruiker', inline: false }
                    ])
                    .setTimestamp();
                
                message.channel.send({ embeds: [helpEmbed] });
                break;
        }
    }
}; 