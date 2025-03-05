const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const CommandStats = require('../../models/CommandStats');
const { embedColor, footerText } = require('../../config.json');

module.exports = {
    name: 'commandstats',
    description: "Bekijk statistieken over command gebruik",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'command',
            description: 'Specifieke command om statistieken voor te bekijken (optioneel)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'user',
            description: 'Bekijk statistieken voor een specifieke gebruiker (optioneel)',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
            await interaction.deferReply();
            
            const specifiedCommand = interaction.options.getString('command');
            const specifiedUser = interaction.options.getUser('user');
            
            // Als een specifieke command is opgegeven
            if (specifiedCommand) {
                // Zoek de opgegeven command in de database
                const commandStat = await CommandStats.findOne({ commandName: specifiedCommand });
                
                if (!commandStat) {
                    return interaction.editReply({
                        content: `Geen statistieken gevonden voor het command \`${specifiedCommand}\`. Mogelijk is het nog niet gebruikt of bestaat het niet.`,
                        ephemeral: true
                    });
                }
                
                // Als ook een gebruiker is opgegeven, toon alleen die gebruiker's stats voor het command
                if (specifiedUser) {
                    const userStats = commandStat.usedBy.find(entry => entry.userId === specifiedUser.id);
                    
                    if (!userStats) {
                        return interaction.editReply({
                            content: `${specifiedUser.username} heeft het command \`${specifiedCommand}\` nog niet gebruikt.`,
                            ephemeral: true
                        });
                    }
                    
                    const userStatEmbed = new EmbedBuilder()
                        .setColor(embedColor)
                        .setTitle(`Command Statistieken: ${specifiedCommand}`)
                        .setDescription(`Gebruiksstatistieken voor ${specifiedUser.username}`)
                        .addFields(
                            { name: 'Aantal keer gebruikt', value: `${userStats.usageCount} keer`, inline: true },
                            { name: 'Laatst gebruikt', value: `<t:${Math.floor(new Date(userStats.lastUsed).getTime() / 1000)}:R>`, inline: true }
                        )
                        .setFooter({ text: footerText })
                        .setTimestamp();
                    
                    return interaction.editReply({ embeds: [userStatEmbed] });
                }
                
                // Sorteer top gebruikers op aantal gebruiken
                const topUsers = [...commandStat.usedBy]
                    .sort((a, b) => b.usageCount - a.usageCount)
                    .slice(0, 5);
                
                const commandStatEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(`Command Statistieken: ${commandStat.commandName}`)
                    .addFields(
                        { name: 'Totaal gebruikt', value: `${commandStat.uses} keer`, inline: true },
                        { name: 'Laatst gebruikt', value: `<t:${Math.floor(new Date(commandStat.lastUsed).getTime() / 1000)}:R>`, inline: true },
                        { name: 'Aantal gebruikers', value: `${commandStat.usedBy.length}`, inline: true }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                // Voeg top gebruikers toe als er zijn
                if (topUsers.length > 0) {
                    const topUsersField = topUsers.map((user, index) => 
                        `${index + 1}. **${user.username}**: ${user.usageCount} keer`
                    ).join('\n');
                    
                    commandStatEmbed.addFields({ name: 'Top Gebruikers', value: topUsersField, inline: false });
                }
                
                return interaction.editReply({ embeds: [commandStatEmbed] });
            }
            
            // Als geen specifieke command is opgegeven maar wel een gebruiker
            if (specifiedUser) {
                // Zoek alle commands die de gebruiker heeft gebruikt
                const allStats = await CommandStats.find({ 'usedBy.userId': specifiedUser.id });
                
                if (allStats.length === 0) {
                    return interaction.editReply({
                        content: `Geen statistieken gevonden voor ${specifiedUser.username}. Deze gebruiker heeft nog geen commands gebruikt.`,
                        ephemeral: true
                    });
                }
                
                // Bereken totaal gebruik en verzamel command gebruik
                let totalUses = 0;
                const commandUsage = [];
                
                for (const stat of allStats) {
                    const userEntry = stat.usedBy.find(entry => entry.userId === specifiedUser.id);
                    if (userEntry) {
                        totalUses += userEntry.usageCount;
                        commandUsage.push({
                            command: stat.commandName,
                            uses: userEntry.usageCount,
                            lastUsed: userEntry.lastUsed
                        });
                    }
                }
                
                // Sorteer op meest gebruikte commands
                commandUsage.sort((a, b) => b.uses - a.uses);
                
                // Top 10 meest gebruikte commands
                const topCommands = commandUsage.slice(0, 10).map((cmd, index) => 
                    `${index + 1}. **/${cmd.command}**: ${cmd.uses} keer`
                ).join('\n');
                
                const userStatsEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(`Command Statistieken voor ${specifiedUser.username}`)
                    .setThumbnail(specifiedUser.displayAvatarURL())
                    .addFields(
                        { name: 'Verschillende commands gebruikt', value: `${commandUsage.length}`, inline: true },
                        { name: 'Totaal aantal commands uitgevoerd', value: `${totalUses}`, inline: true }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                if (topCommands) {
                    userStatsEmbed.addFields({ name: 'Meest gebruikte commands', value: topCommands, inline: false });
                }
                
                return interaction.editReply({ embeds: [userStatsEmbed] });
            }
            
            // Als geen specifieke command of gebruiker is opgegeven, toon algemene statistieken
            const allStats = await CommandStats.find().sort({ uses: -1 });
            
            if (allStats.length === 0) {
                return interaction.editReply({
                    content: 'Nog geen command statistieken beschikbaar.',
                    ephemeral: true
                });
            }
            
            // Top 10 meest gebruikte commands
            const topCommands = allStats.slice(0, 10).map((stat, index) => 
                `${index + 1}. **/${stat.commandName}**: ${stat.uses} keer`
            ).join('\n');
            
            // Bereken totalen
            const totalExecutions = allStats.reduce((sum, stat) => sum + stat.uses, 0);
            const uniqueUsers = new Set();
            allStats.forEach(stat => {
                stat.usedBy.forEach(user => uniqueUsers.add(user.userId));
            });
            
            // Recent gebruikte commands (laatste 5)
            const recentCommands = [...allStats]
                .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
                .slice(0, 5)
                .map((stat, index) => 
                    `${index + 1}. **/${stat.commandName}**: <t:${Math.floor(new Date(stat.lastUsed).getTime() / 1000)}:R>`
                ).join('\n');
            
            const statsEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Command Gebruiksstatistieken')
                .addFields(
                    { name: 'Totaal aantal uitvoeringen', value: `${totalExecutions}`, inline: true },
                    { name: 'Unieke commands', value: `${allStats.length}`, inline: true },
                    { name: 'Unieke gebruikers', value: `${uniqueUsers.size}`, inline: true },
                    { name: 'Meest gebruikte commands', value: topCommands, inline: false }
                )
                .setFooter({ text: footerText })
                .setTimestamp();
            
            if (recentCommands) {
                statsEmbed.addFields({ name: 'Recent gebruikte commands', value: recentCommands, inline: false });
            }
            
            return interaction.editReply({ embeds: [statsEmbed] });
            
        } catch (error) {
            console.error('Fout bij commandstats command:', error);
            return interaction.editReply({
                content: 'Er is een fout opgetreden bij het ophalen van de command statistieken.',
                ephemeral: true
            });
        }
    }
}; 