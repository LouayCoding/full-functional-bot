const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor, footerText } = require('../../config.json');
const Jail = require('../../models/jail');

module.exports = {
    name: 'jailstatus',
    description: "Bekijk wie er in de gevangenis zit of informatie over een specifieke gebruiker.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 5000,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker waarvan je de gevangenisstatus wilt bekijken',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }

            const targetUser = interaction.options.getUser('gebruiker');
            
            // Als een specifieke gebruiker is opgegeven, toon informatie over die gebruiker
            if (targetUser) {
                const jailRecord = await Jail.findOne({ 
                    userID: targetUser.id,
                    guildID: interaction.guild.id
                });
                
                if (!jailRecord) {
                    return interaction.reply({
                        content: `${targetUser.username} zit niet in de gevangenis.`,
                        ephemeral: false
                    });
                }
                
                // Haal de moderator gebruiker op
                const moderator = await interaction.client.users.fetch(jailRecord.moderatorID).catch(() => null);
                const moderatorName = moderator ? moderator.username : 'Onbekende moderator';
                
                const jailEmbed = new EmbedBuilder()
                    .setColor('#FF4136')
                    .setTitle(`${targetUser.username}'s gevangenisstatus`)
                    .setDescription(`${targetUser} zit momenteel in de gevangenis!`)
                    .addFields(
                        { name: 'Reden', value: jailRecord.reason, inline: false },
                        { name: 'In gevangenis sinds', value: `<t:${Math.floor(jailRecord.jailedAt / 1000)}:F> (<t:${Math.floor(jailRecord.jailedAt / 1000)}:R>)`, inline: false },
                        { name: 'Opgesloten door', value: moderatorName, inline: false },
                        { name: 'Borgsom', value: jailRecord.bailAmount > 0 ? `€${jailRecord.bailAmount}` : 'Geen borgsom (alleen een moderator kan vrijlaten)', inline: false }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                return interaction.reply({
                    embeds: [jailEmbed]
                });
            }
            
            // Anders, toon een lijst van alle gebruikers in de gevangenis
            const jailRecords = await Jail.find({ guildID: interaction.guild.id });
            
            if (jailRecords.length === 0) {
                return interaction.reply({
                    content: 'Er zitten momenteel geen gebruikers in de gevangenis.',
                    ephemeral: false
                });
            }
            
            // Haal informatie op voor elke gevangen gebruiker
            const jailList = [];
            let totalUsers = 0;
            
            for (const record of jailRecords) {
                try {
                    const user = await interaction.client.users.fetch(record.userID);
                    if (user) {
                        totalUsers++;
                        const jailTime = `<t:${Math.floor(record.jailedAt / 1000)}:R>`;
                        const bailInfo = record.bailAmount > 0 ? `€${record.bailAmount}` : 'Geen borgsom';
                        jailList.push(`${totalUsers}. **${user.username}** - ${jailTime} - Borgsom: ${bailInfo}`);
                    }
                } catch (error) {
                    console.log(`Kon gebruiker niet ophalen: ${error}`);
                }
                
                // Beperk tot maximaal 25 gebruikers in de lijst om te voorkomen dat het bericht te lang wordt
                if (totalUsers >= 25) break;
            }
            
            const listEmbed = new EmbedBuilder()
                .setColor('#FF4136')
                .setTitle('Gevangenis Lijst')
                .setDescription(`Er ${jailRecords.length === 1 ? 'zit' : 'zitten'} momenteel ${jailRecords.length} ${jailRecords.length === 1 ? 'gebruiker' : 'gebruikers'} in de gevangenis.`)
                .addFields(
                    { name: 'Gevangenen', value: jailList.join('\n') || 'Geen gevangenen kunnen weergeven.', inline: false }
                )
                .setFooter({ text: `${footerText} | Gebruik /jailstatus gebruiker:@naam voor meer details` })
                .setTimestamp();
            
            return interaction.reply({
                embeds: [listEmbed]
            });
            
        } catch (error) {
            console.error('Fout bij jailstatus commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 