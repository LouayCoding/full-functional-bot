const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { embedColor } = require('../../config.json');
const { checkChannel } = require('../../utils/channelCheck');

module.exports = {
	name: 'balance',
	description: "Toont het huidige saldo van een gebruiker in de economie.",
	type: ApplicationCommandType.ChatInput,
	cooldown: 3000,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker die je wilt knuffelen',
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
            
            const targetUser = interaction.options.getUser('gebruiker') || interaction.user;
            
            console.log(`Balance commando uitgevoerd voor gebruiker: ${targetUser.tag}`);
            
            // Haal de gebruiker op uit de cache
            const economyUser = client.eco.cache.users.get({
                memberID: targetUser.id,
                guildID: interaction.guild.id
            });
            
            if (!economyUser) {
                console.log(`Gebruiker niet gevonden in economy system: ${targetUser.tag}`);
                return interaction.reply({
                    content: `Kon geen gebruikersgegevens vinden. Deze gebruiker heeft mogelijk nog geen economie-activiteit gehad.`,
                    ephemeral: true
                });
            }
            
            // Haal balance direct op van de gebruiker
            const userBalance = await economyUser.balance.get();
            const userBank = await economyUser.bank.get();
            
            console.log(`Balans voor ${targetUser.tag}:`, { cash: userBalance, bank: userBank });
            
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setAuthor({ name: `${targetUser.username}'s balance`, iconURL: targetUser.displayAvatarURL()})
                .addFields(
                    { name: 'Cash', value: `€ ${userBalance || 0}`, inline: true},
                    { name: 'Bank', value: `€ ${userBank || 0}`, inline: true},
                    { name: 'Totaal', value: `€ ${(userBalance || 0) + (userBank || 0)}`, inline: true}
                );
            
            await interaction.reply({ embeds: [embed]});
        } catch (error) {
            console.error('Fout bij ophalen balance:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het ophalen van de balans. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
};