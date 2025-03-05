const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor, footerText } = require('../../config.json');

module.exports = {
    name: 'leaderboard',
    description: "Toont een leaderboard van de rijkste gebruikers in de server.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 10000,
    run: async (client, interaction) => {
        try {
            // Controleer of het commando in het juiste kanaal wordt gebruikt
            const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
            if (!(await checkChannel(interaction, economyChannelId))) {
                return; // Als niet in het juiste kanaal, stop de uitvoering
            }

            await interaction.deferReply();
            
            // Controleer of de economy module correct is geladen
            if (!client.eco) {
                console.error('Economy module is niet correct geladen!');
                return interaction.editReply({
                    content: 'Het economiesysteem is momenteel niet beschikbaar. Neem contact op met de botbeheerder.',
                    ephemeral: true
                });
            }
            
            // Haal direct alle gebruikers op van de mongodb collection
            const guildID = interaction.guild.id;
            let allUsers = [];
            
            try {
                const result = await client.eco.database.pull('economy', {
                    guildID: guildID
                });
                
                // Zorg ervoor dat allUsers altijd een array is
                allUsers = Array.isArray(result) ? result : [];
                
                console.log(`Leaderboard: ${allUsers.length} gebruikers gevonden in de database`);
            } catch (dbError) {
                console.error('Database fout bij ophalen leaderboard:', dbError);
                // Als er een fout is, gebruik een lege array
                allUsers = [];
            }
            
            if (!allUsers || allUsers.length === 0) {
                return interaction.editReply({
                    content: `${interaction.user}, er zijn geen gebruikers in het leaderboard.`,
                    ephemeral: true
                });
            }
            
            // Verzamel de balance data voor alle gebruikers
            const leaderboardData = [];
            
            // Loop door alle gebruikers en haal hun balans op
            for (const userData of allUsers) {
                try {
                    // Haal de Discord user op om te controleren of het geen bot is
                    const discordUser = await interaction.client.users.fetch(userData.memberID).catch(() => null);
                    
                    if (discordUser && !discordUser.bot && userData.balance && userData.balance > 0) {
                        leaderboardData.push({
                            userID: userData.memberID,
                            money: userData.balance
                        });
                    }
                } catch (error) {
                    console.error(`Fout bij ophalen gebruiker ${userData.memberID}:`, error);
                    // Ga door naar de volgende gebruiker
                }
            }
            
            // Sorteer de leaderboard data op basis van geld (hoogste eerst)
            const leaderboard = leaderboardData.sort((a, b) => b.money - a.money);
            
            if (!leaderboard.length) {
                return interaction.editReply({
                    content: `${interaction.user}, er zijn geen gebruikers in het leaderboard.`,
                    ephemeral: true
                });
            }

            // Maak een embed voor het leaderboard
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`💰 ${interaction.guild.name} - Geld Leaderboard [${leaderboard.length}]`)
                .setDescription(
                    leaderboard
                        .map((lb, index) => `${index + 1} - <@${lb.userID}> - **${lb.money}** coins`)
                        .join('\n')
                )
                .setFooter({ text: footerText })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Fout bij leaderboard commando:', error);
            return interaction.editReply({
                content: 'Er is een fout opgetreden bij het maken van het leaderboard. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 