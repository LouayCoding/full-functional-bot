const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { embedColor, footerText, modRoles } = require('../../config.json');

module.exports = {
    name: 'setmoney',
    description: "Stel het exacte geldbedrag in voor een gebruiker (alleen voor staff).",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker voor wie je het saldo wilt instellen',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'bedrag',
            description: 'Het exacte bedrag dat je wilt instellen',
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: 'locatie',
            description: 'Waar het bedrag moet worden ingesteld',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Cash', value: 'cash' },
                { name: 'Bank', value: 'bank' }
            ],
            required: true
        },
        {
            name: 'reden',
            description: 'De reden voor het instellen van dit bedrag',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    run: async (client, interaction) => {

        console.log(interaction.user.id);
        // Check of het de specifieke gebruiker is
        if (interaction.user.id !== '935943312815300699') {
            return interaction.reply({
                content: 'Deze command is momenteel niet beschikbaar.',
                ephemeral: true
            });
        }
        try {
            // Controleer of de gebruiker een staff lid is
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const hasModRole = member.roles.cache.some(role => modRoles.includes(role.id));
            
            if (!hasModRole && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({
                    content: 'Je hebt geen toestemming om deze command te gebruiken!',
                    ephemeral: true
                });
            }
            
            const targetUser = interaction.options.getUser('gebruiker');
            const amount = interaction.options.getInteger('bedrag');
            const location = interaction.options.getString('locatie');
            const reason = interaction.options.getString('reden') || 'Geen reden opgegeven';
            
            // Controleer of het bedrag niet negatief is
            if (amount < 0) {
                return interaction.reply({
                    content: 'Het bedrag mag niet negatief zijn!',
                    ephemeral: true
                });
            }
            
            // Haal de economy gebruiker op
            const economyUser = client.eco.cache.users.get({
                memberID: targetUser.id,
                guildID: interaction.guild.id
            });
            
            if (!economyUser) {
                return interaction.reply({
                    content: 'Deze gebruiker kon niet worden gevonden in het economy systeem.',
                    ephemeral: true
                });
            }
            
            // Haal het huidige saldo op
            let huidigeBalans;
            if (location === 'cash') {
                huidigeBalans = await economyUser.balance.get();
            } else { // bank
                huidigeBalans = await economyUser.bank.get();
            }
            
            // Stel het exacte bedrag in
            const transactionReason = `Saldo ingesteld door ${interaction.user.username}: ${reason}`;
            
            if (location === 'cash') {
                await economyUser.balance.set(amount, transactionReason);
            } else { // bank
                await economyUser.bank.set(amount, transactionReason);
            }
            
            // Maak een embed voor de bevestiging
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('💰 Saldo Ingesteld')
                .setDescription(`Het ${location === 'cash' ? 'cash' : 'bank'} saldo van ${targetUser} is ingesteld op €${amount}`)
                .addFields(
                    { name: 'Ingesteld door', value: interaction.user.toString(), inline: true },
                    { name: 'Reden', value: reason, inline: true },
                    { name: 'Vorige balans', value: `€${huidigeBalans}`, inline: true }
                )
                .setFooter({ text: footerText })
                .setTimestamp();
            
            // Stuur de bevestiging
            await interaction.reply({
                embeds: [embed]
            });
            
            // Stuur een DM naar de gebruiker
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#0074D9')
                    .setTitle(`💰 Saldo Ingesteld in ${interaction.guild.name}`)
                    .setDescription(`Je ${location === 'cash' ? 'cash' : 'bank'} saldo is ingesteld op €${amount}.`)
                    .addFields(
                        { name: 'Ingesteld door', value: interaction.user.username, inline: true },
                        { name: 'Reden', value: reason, inline: true },
                        { name: 'Vorige balans', value: `€${huidigeBalans}`, inline: true }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Kon geen DM sturen naar ${targetUser.tag}: ${error}`);
            }
            
        } catch (error) {
            console.error('Fout bij setmoney commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het instellen van het saldo. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 