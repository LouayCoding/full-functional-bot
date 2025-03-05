const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { embedColor, footerText, modRoles } = require('../../config.json');

module.exports = {
    name: 'addmoney',
    description: "Voeg geld toe aan de balans van een gebruiker (alleen voor staff).",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker aan wie je geld wilt toevoegen',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'bedrag',
            description: 'Het bedrag dat je wilt toevoegen',
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: 'locatie',
            description: 'Waar het geld moet worden toegevoegd',
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'Cash', value: 'cash' },
                { name: 'Bank', value: 'bank' }
            ],
            required: true
        },
        {
            name: 'reden',
            description: 'De reden voor het toevoegen van geld',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    run: async (client, interaction) => {
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
            
            // Controleer of het bedrag positief is
            if (amount <= 0) {
                return interaction.reply({
                    content: 'Het bedrag moet een positief getal zijn!',
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
            
            // Voeg het geld toe aan de juiste locatie
            let nieuweBalans;
            const transactionReason = `Toegevoegd door ${interaction.user.username}: ${reason}`;
            
            if (location === 'cash') {
                await economyUser.balance.add(amount, transactionReason);
                nieuweBalans = await economyUser.balance.get();
            } else { // bank
                await economyUser.bank.add(amount, transactionReason);
                nieuweBalans = await economyUser.bank.get();
            }
            
            // Maak een embed voor de bevestiging
            const embed = new EmbedBuilder()
                .setColor('#2ECC40')
                .setTitle('💰 Geld Toegevoegd')
                .setDescription(`Er is €${amount} toegevoegd aan de ${location === 'cash' ? 'cash' : 'bank'} van ${targetUser}`)
                .addFields(
                    { name: 'Toegevoegd door', value: interaction.user.toString(), inline: true },
                    { name: 'Reden', value: reason, inline: true },
                    { name: `Nieuwe ${location === 'cash' ? 'Cash' : 'Bank'} Balans`, value: `€${nieuweBalans}`, inline: true }
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
                    .setColor('#2ECC40')
                    .setTitle(`💰 Geld Toegevoegd in ${interaction.guild.name}`)
                    .setDescription(`Er is €${amount} toegevoegd aan je ${location === 'cash' ? 'cash' : 'bank'} balans.`)
                    .addFields(
                        { name: 'Toegevoegd door', value: interaction.user.username, inline: true },
                        { name: 'Reden', value: reason, inline: true },
                        { name: `Nieuwe ${location === 'cash' ? 'Cash' : 'Bank'} Balans`, value: `€${nieuweBalans}`, inline: true }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Kon geen DM sturen naar ${targetUser.tag}: ${error}`);
            }
            
        } catch (error) {
            console.error('Fout bij addmoney commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het toevoegen van geld. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 