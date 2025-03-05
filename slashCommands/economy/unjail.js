const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor, footerText, modRoles, jailLogChannel, jailChannel } = require('../../config.json');
const Jail = require('../../models/jail');

module.exports = {
    name: 'unjail',
    description: "Laat een gebruiker vrij uit de gevangenis (alleen voor moderators).",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker die je wilt vrijlaten uit de gevangenis',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'reden',
            description: 'De reden waarom de gebruiker wordt vrijgelaten',
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

            const targetUser = interaction.options.getUser('gebruiker');
            const reason = interaction.options.getString('reden') || "Geen reden opgegeven";
            
            // Controleer of de gebruiker een moderator is
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const hasModRole = member.roles.cache.some(role => modRoles.includes(role.id));
            
            if (!hasModRole && !member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({
                    content: 'Je hebt geen toestemming om deze command te gebruiken!',
                    ephemeral: true
                });
            }
            
            // Controleer of de gebruiker in de gevangenis zit
            const jailRecord = await Jail.findOne({ 
                userID: targetUser.id,
                guildID: interaction.guild.id
            });
            
            if (!jailRecord) {
                return interaction.reply({
                    content: `${targetUser.username} zit niet in de gevangenis!`,
                    ephemeral: true
                });
            }
            
            // Gebruik deferReply om timeout te voorkomen
            await interaction.deferReply();
            
            // Haal de gebruiker op als GuildMember
            const targetMember = await interaction.guild.members.fetch(targetUser.id);
            
            // Reset alle kanaal permissie overwrites
            try {
                // Haal alle kanalen op
                const allChannels = interaction.guild.channels.cache.filter(
                    channel => channel.type !== 'GUILD_CATEGORY'
                );
                
                // Voor het jail kanaal specifiek
                const jailChan = interaction.guild.channels.cache.get(jailChannel);
                if (jailChan) {
                    // Verwijder de persoonlijke overwrites voor het jail kanaal
                    await jailChan.permissionOverwrites.delete(targetUser.id).catch(console.error);
                }
                
                // Voor alle andere kanalen waar er permissies zijn ingesteld
                for (const [id, channel] of allChannels) {
                    const userOverwrites = channel.permissionOverwrites.cache.get(targetUser.id);
                    if (userOverwrites) {
                        await channel.permissionOverwrites.delete(targetUser.id).catch(console.error);
                    }
                }
                
                // Herstel de originele rollen
                if (jailRecord.originalRoles && jailRecord.originalRoles.length > 0) {
                    for (const roleId of jailRecord.originalRoles) {
                        const role = interaction.guild.roles.cache.get(roleId);
                        if (role) {
                            await targetMember.roles.add(role, `Unjailed door ${interaction.user.tag}: ${reason}`).catch(console.error);
                        }
                    }
                }
                
            } catch (error) {
                console.error('Fout bij het herstellen van permissies:', error);
                return interaction.editReply({
                    content: 'Er is een fout opgetreden bij het herstellen van permissies. De gebruiker is wel uit de gevangenis, maar mogelijk moeten rechten handmatig worden hersteld.',
                    ephemeral: true
                });
            }
            
            // Maak een embed voor de vrijlating
            const unjailEmbed = new EmbedBuilder()
                .setColor('#2ECC40')
                .setTitle('Gebruiker vrijgelaten uit de gevangenis!')
                .setDescription(`${targetUser} is vrijgelaten uit de gevangenis door ${interaction.user}`)
                .addFields(
                    { name: 'Reden voor vrijlating', value: reason, inline: false },
                    { name: 'Oorspronkelijke reden voor gevangenisstraf', value: jailRecord.reason, inline: false },
                    { name: 'Tijd in gevangenis', value: `<t:${Math.floor(jailRecord.jailedAt / 1000)}:R>`, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: footerText })
                .setTimestamp();
            
            // Antwoord op de interactie
            await interaction.editReply({
                embeds: [unjailEmbed]
            });
            
            // Stuur een bericht naar het jaillog kanaal
            const jailLogChannelObj = interaction.guild.channels.cache.get(jailLogChannel);
            
            if (jailLogChannelObj) {
                await jailLogChannelObj.send({
                    embeds: [unjailEmbed.setTitle('Unjail Log')]
                });
            }
            
            // Stuur een bericht naar het specifieke kanaal
            const specificChannel = interaction.guild.channels.cache.get('1337061426300321873');
            if (specificChannel) {
                await specificChannel.send({
                    content: `${targetUser} is vrijgelaten uit de gevangenis door ${interaction.user}. Reden: ${reason}`
                });
            }
            
            // Update het oorspronkelijke jail bericht als het bestaat
            if (jailRecord.jailMessageID) {
                try {
                    const jailChannel = interaction.guild.channels.cache.get(jailLogChannel);
                    const jailMessage = await jailChannel.messages.fetch(jailRecord.jailMessageID);
                    
                    if (jailMessage) {
                        const originalEmbed = jailMessage.embeds[0];
                        const updatedEmbed = EmbedBuilder.from(originalEmbed)
                            .setColor('#2ECC40')
                            .setTitle('Jail Log - Vrijgelaten')
                            .addFields(
                                { name: 'Vrijgelaten door', value: interaction.user.username, inline: false },
                                { name: 'Reden voor vrijlating', value: reason, inline: false },
                                { name: 'Vrijgelaten op', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                            );
                        
                        await jailMessage.edit({ embeds: [updatedEmbed], components: [] });
                    }
                } catch (error) {
                    console.log(`Kon het originele jail bericht niet updaten: ${error}`);
                }
            }
            
            // Stuur een bericht naar het jail kanaal dat de gebruiker is vrijgelaten
            const jailChan = interaction.guild.channels.cache.get(jailChannel);
            if (jailChan) {
                await jailChan.send({
                    content: `${targetUser} is vrijgelaten uit de gevangenis door ${interaction.user}.\nReden: ${reason}`
                });
            }
            
            // Stuur DM naar de vrijgelaten gebruiker
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#2ECC40')
                    .setTitle(`Je bent vrijgelaten uit de gevangenis in ${interaction.guild.name}!`)
                    .setDescription(`Je bent vrijgelaten door ${interaction.user.username}`)
                    .addFields(
                        { name: 'Reden voor vrijlating', value: reason, inline: false },
                        { name: 'Let op', value: 'Je kanaalrechten en rollen zijn hersteld.', inline: false }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Kon geen DM sturen naar ${targetUser.tag}: ${error}`);
            }
            
            // Verwijder de gebruiker uit de database
            await Jail.findOneAndDelete({
                userID: targetUser.id,
                guildID: interaction.guild.id
            });
            
        } catch (error) {
            console.error('Fout bij unjail commando:', error);
            return interaction.editReply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 