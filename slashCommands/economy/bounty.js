const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor, footerText, bounty } = require('../../config.json');
const ms = require('ms');

// Gebruik de bounty instellingen uit config.json
const BOUNTY_PRICE = bounty?.price || 1000;
const TIMEOUT_DURATION = bounty?.timeoutDuration || 2 * 60 * 1000; // 2 minuten in milliseconden

module.exports = {
    name: 'bounty',
    description: "Plaats een bounty op een gebruiker voor een tijdelijke timeout (2 minuten)",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker die je wilt timeoutten',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'reden',
            description: 'De reden voor de bounty',
            type: ApplicationCommandOptionType.String,
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

            // Haal parameters op
            const targetUser = interaction.options.getUser('gebruiker');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const reason = interaction.options.getString('reden') || 'Geen reden opgegeven';
            
            // Controleer of de target geldig is
            if (!targetMember) {
                return interaction.reply({
                    content: 'Deze gebruiker kon niet worden gevonden in de server.',
                    ephemeral: true
                });
            }
            
            // Controleer of de target niet de gebruiker zelf is
            if (targetUser.id === interaction.user.id) {
                return interaction.reply({
                    content: 'Je kunt geen bounty op jezelf plaatsen!',
                    ephemeral: true
                });
            }
            
            // Controleer of de target geen bot is
            if (targetUser.bot) {
                return interaction.reply({
                    content: 'Je kunt geen bounty op een bot plaatsen!',
                    ephemeral: true
                });
            }
            
            // Controleer of de target geen administrator of moderator is
            if (targetMember.permissions.has(PermissionFlagsBits.Administrator) || 
                targetMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({
                    content: 'Je kunt geen bounty plaatsen op een administrator of moderator!',
                    ephemeral: true
                });
            }
            
            // Controleer of de bot zelf de permissie heeft om te timeoutten
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({
                    content: 'Ik heb niet de juiste permissies om timeouts te geven.',
                    ephemeral: true
                });
            }

            // Controleer of economy systeem beschikbaar is
            if (!client.eco || !client.eco.cache || !client.eco.cache.users) {
                return interaction.reply({
                    content: 'Het economy systeem is momenteel niet beschikbaar. Probeer het later opnieuw.',
                    ephemeral: true
                });
            }
            
            // Haal economy gebruiker op
            const economyUser = client.eco.cache.users.get({
                memberID: interaction.user.id,
                guildID: interaction.guild.id
            });
            
            if (!economyUser) {
                return interaction.reply({
                    content: 'Je economy profiel kon niet worden geladen. Probeer het later opnieuw.',
                    ephemeral: true
                });
            }
            
            // Controleer of gebruiker genoeg geld heeft
            const userBalance = await economyUser.balance.get();
            
            if (userBalance < BOUNTY_PRICE) {
                return interaction.reply({
                    content: `Je hebt niet genoeg geld! Een bounty kost €${BOUNTY_PRICE} en je hebt maar €${userBalance}.`,
                    ephemeral: true
                });
            }
            
            await interaction.deferReply();
            
            try {
                // Trek het geld af van de gebruiker
                await economyUser.balance.subtract(BOUNTY_PRICE, `Bounty geplaatst op ${targetUser.username}`);
                
                // Timeout de target gebruiker
                await targetMember.timeout(TIMEOUT_DURATION, `Bounty door ${interaction.user.tag}: ${reason}`);
                
                // Bereken timeout duur in minuten voor weergave
                const timeoutMinutes = TIMEOUT_DURATION / 60000;
                
                // Maak embed voor bevestiging
                const bountyEmbed = new EmbedBuilder()
                    .setColor('#FF4136')
                    .setTitle('Bounty Uitgevoerd!')
                    .setDescription(`${targetUser} is getimeout voor ${timeoutMinutes} minuten!`)
                    .addFields(
                        { name: 'Bounty Hunter', value: `${interaction.user}`, inline: true },
                        { name: 'Kosten', value: `€${BOUNTY_PRICE}`, inline: true },
                        { name: 'Reden', value: reason, inline: false },
                        { name: 'Duur', value: `${timeoutMinutes} minuten`, inline: false }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                // Antwoord op de interactie
                await interaction.editReply({
                    embeds: [bountyEmbed]
                });
                
                // Stuur DM naar de getimeoute gebruiker
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#FF4136')
                        .setTitle(`Je bent getimeout in ${interaction.guild.name}!`)
                        .setDescription(`${interaction.user.username} heeft een bounty op je geplaatst!`)
                        .addFields(
                            { name: 'Reden', value: reason, inline: false },
                            { name: 'Duur', value: `${timeoutMinutes} minuten`, inline: false },
                            { name: 'Bounty bedrag', value: `€${BOUNTY_PRICE}`, inline: false }
                        )
                        .setFooter({ text: footerText })
                        .setTimestamp();
                    
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log(`Kon geen DM sturen naar ${targetUser.tag}: ${error}`);
                }
                
            } catch (error) {
                console.error('Fout bij het uitvoeren van bounty:', error);
                
                // Probeer het geld terug te geven
                try {
                    await economyUser.balance.add(BOUNTY_PRICE, 'Bounty terugbetaling wegens fout');
                } catch (refundError) {
                    console.error('Fout bij bounty terugbetaling:', refundError);
                }
                
                return interaction.editReply({
                    content: 'Er is een fout opgetreden bij het uitvoeren van de bounty. Je geld is teruggestort.',
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Fout bij bounty commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van dit commando.',
                ephemeral: true
            });
        }
    }
}; 