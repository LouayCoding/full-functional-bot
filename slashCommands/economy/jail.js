const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const { embedColor, footerText, modRoles, jailLogChannel, jailChannel } = require('../../config.json');
const Jail = require('../../models/jail');

module.exports = {
    name: 'jail',
    description: "Zet een gebruiker in de gevangenis met optioneel een borgsom om vrij te komen.",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker die je in de gevangenis wilt zetten',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'reden',
            description: 'De reden waarom de gebruiker in de gevangenis wordt gezet',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'borgsom',
            description: 'Bedrag dat betaald moet worden voor vrijlating (0 = alleen moderator kan vrijlaten)',
            type: ApplicationCommandOptionType.Integer,
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
            const borgsom = interaction.options.getInteger('borgsom') || 0;
            
            // Controleer of de gebruiker een moderator is
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const hasModRole = member.roles.cache.some(role => modRoles.includes(role.id));
            
            if (!hasModRole && !member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({
                    content: 'Je hebt geen toestemming om deze command te gebruiken!',
                    ephemeral: true
                });
            }
            
            // Controleer of de doelgebruiker zelf een moderator is
            const targetMember = await interaction.guild.members.fetch(targetUser.id);
            const isTargetMod = targetMember.roles.cache.some(role => modRoles.includes(role.id)) ||
                               targetMember.permissions.has(PermissionFlagsBits.ModerateMembers);
            
            if (isTargetMod) {
                return interaction.reply({
                    content: 'Je kunt geen moderator in de gevangenis zetten!',
                    ephemeral: true
                });
            }
            
            // Controleer of de gebruiker al in de gevangenis zit
            const existingJail = await Jail.findOne({ 
                userID: targetUser.id,
                guildID: interaction.guild.id
            });
            
            if (existingJail) {
                return interaction.reply({
                    content: `${targetUser.username} zit al in de gevangenis!`,
                    ephemeral: true
                });
            }
            
            // Controleer of borgsom een geldig bedrag is
            if (borgsom < 0) {
                return interaction.reply({
                    content: 'De borgsom moet €0 of hoger zijn!',
                    ephemeral: true
                });
            }
            
            // Sla de huidige rollen van de gebruiker op
            const userRoles = targetMember.roles.cache
                .filter(role => role.id !== interaction.guild.id) // Exclude @everyone role
                .map(role => role.id);
                
            // Haal het jail kanaal op
            const jailChan = interaction.guild.channels.cache.get(jailChannel);
            if (!jailChan) {
                return interaction.reply({
                    content: 'Het jail kanaal kon niet worden gevonden. Controleer de configuratie.',
                    ephemeral: true
                });
            }
            
            // Antwoord eerst om de timeout te voorkomen
            await interaction.deferReply();
            
            // Verwijder alle rollen van de gebruiker
            try {
                for (const roleId of userRoles) {
                    await targetMember.roles.remove(roleId, `Jailed door ${interaction.user.tag}: ${reason}`);
                }
            } catch (error) {
                console.error('Fout bij verwijderen van rollen:', error);
                return interaction.editReply({
                    content: 'Er is een fout opgetreden bij het verwijderen van rollen. Controleer de botpermissies.',
                    ephemeral: true
                });
            }
            
            // Verberg alle kanalen voor de gevangen gebruiker behalve het jail kanaal
            try {
                // Verberg eerst alle kanalen
                const allChannels = interaction.guild.channels.cache.filter(
                    channel => channel.id !== jailChannel && channel.permissionsFor && channel.permissionsFor(targetMember) && channel.permissionsFor(targetMember).has(PermissionFlagsBits.ViewChannel)
                );
                
                for (const [id, channel] of allChannels) {
                    // Controleer of het kanaal permissionOverwrites heeft en of create beschikbaar is
                    if (channel.permissionOverwrites && typeof channel.permissionOverwrites.create === 'function') {
                        await channel.permissionOverwrites.create(targetMember, {
                            ViewChannel: false
                        }, { reason: `Jailed door ${interaction.user.tag}: ${reason}` });
                    }
                }
                
                // Zorg dat de gebruiker toegang heeft tot het jail kanaal
                if (jailChan.permissionOverwrites && typeof jailChan.permissionOverwrites.create === 'function') {
                    await jailChan.permissionOverwrites.create(targetMember, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    }, { reason: `Jailed door ${interaction.user.tag}: ${reason}` });
                } else {
                    throw new Error('Kan permissionOverwrites.create niet aanroepen op het jail kanaal');
                }
                
            } catch (error) {
                console.error('Fout bij het instellen van kanaalrechten:', error);
                // Probeer rollen te herstellen bij een fout
                for (const roleId of userRoles) {
                    await targetMember.roles.add(roleId).catch(console.error);
                }
                
                return interaction.editReply({
                    content: 'Er is een fout opgetreden bij het instellen van kanaalrechten. Controleer de botpermissies.',
                    ephemeral: true
                });
            }
            
            // Maak embed en actieknoppen voor bail
            const jailEmbed = new EmbedBuilder()
                .setColor('#FF4136')
                .setTitle('Gebruiker in de gevangenis gezet!')
                .setDescription(`${targetUser} is in de gevangenis gezet door ${interaction.user}`)
                .addFields(
                    { name: 'Reden', value: reason, inline: false },
                    { name: 'Borgsom', value: borgsom > 0 ? `€${borgsom}` : 'Geen borgsom (alleen een moderator kan vrijlaten)', inline: false },
                    { name: 'Geplaatst op', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: footerText })
                .setTimestamp();
            
            // Maak actieknoppen voor bail als er een borgsom is
            const row = new ActionRowBuilder();
            
            if (borgsom > 0) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`bail_${targetUser.id}`)
                        .setLabel(`Betaal Borgsom: €${borgsom}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💰')
                );
            }
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`jailinfo_${targetUser.id}`)
                    .setLabel('Bekijk Jail Info')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️')
            );
            
            // Antwoord op de interactie
            await interaction.editReply({
                embeds: [jailEmbed],
                components: [row]
            });
            
            // Stuur een bericht naar het jaillog kanaal
            const jailLogChannelObj = interaction.guild.channels.cache.get(jailLogChannel);
            let jailMessageID = '';
            
            if (jailLogChannelObj) {
                const logMessage = await jailLogChannelObj.send({
                    embeds: [jailEmbed.setTitle('Jail Log').setDescription(`${targetUser.username} is in de gevangenis gezet door ${interaction.user.username}`)],
                    components: [row]
                });
                jailMessageID = logMessage.id;
            }
            
            // Stuur een welkomstbericht naar het jail kanaal om de gebruiker te informeren
            let jailMessage;
            if (borgsom > 0) {
                jailMessage = await jailChan.send({
                    content: `${targetUser}, je bent in de gevangenis geplaatst door ${interaction.user}.\n\n**Reden:** ${reason}\n**Borgsom:** €${borgsom}\n\nOm vrij te komen kan iemand de borgsom voor je betalen door op de knop te klikken.\nJe kunt alleen in dit kanaal chatten totdat je wordt vrijgelaten.`,
                    components: [row]
                });
            } else {
                jailMessage = await jailChan.send({
                    content: `${targetUser}, je bent in de gevangenis geplaatst door ${interaction.user}.\n\n**Reden:** ${reason}\n**Borgsom:** Geen borgsom (alleen een moderator kan je vrijlaten)\n\nJe kunt alleen in dit kanaal chatten totdat je wordt vrijgelaten.`
                });
            }
            
            // Sla informatie op in database
            const jailRecord = new Jail({
                userID: targetUser.id,
                guildID: interaction.guild.id,
                moderatorID: interaction.user.id,
                reason: reason,
                bailAmount: borgsom,
                jailedAt: Date.now(),
                jailMessageID: jailMessageID,
                originalRoles: userRoles
            });
            
            await jailRecord.save();
            
            // Stuur DM naar de gevangen gebruiker
            try {
                // Basis DM embed
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FF4136')
                    .setTitle(`Je bent in de gevangenis gezet in ${interaction.guild.name}!`)
                    .setDescription(`Je bent in de gevangenis gezet door ${interaction.user.username}`)
                    .addFields(
                        { name: 'Reden', value: reason, inline: false },
                        { name: 'Let op', value: 'Je kunt alleen het jail kanaal zien totdat je wordt vrijgelaten.', inline: false }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp();
                
                // Voeg informatie toe over de borgsom
                if (borgsom > 0) {
                    dmEmbed.addFields(
                        { name: 'Borgsom', value: `€${borgsom}`, inline: false },
                        { name: 'Hoe word je vrijgelaten?', value: 'Iemand kan de "Betaal Borgsom" knop gebruiken in het jail kanaal om je vrij te kopen.', inline: false }
                    );
                } else {
                    dmEmbed.addFields(
                        { name: 'Borgsom', value: 'Geen borgsom - alleen een moderator kan je vrijlaten', inline: false }
                    );
                }
                
                await targetUser.send({ embeds: [dmEmbed] });
                
                // Als er een borgsom is, stuur nog een bericht met bail instructies
                if (borgsom > 0) {
                    const bailInstructionsEmbed = new EmbedBuilder()
                        .setColor('#FFC300')
                        .setTitle('Hoe werkt borgsom betalen?')
                        .setDescription('Iemand anders in de server kan je borgsom betalen om je vrij te laten.')
                        .addFields(
                            { name: 'Borgsom bedrag', value: `€${borgsom}`, inline: false },
                            { name: 'Hoe te betalen', value: 'De persoon die wil betalen moet naar het jail kanaal gaan en op de "Betaal Borgsom" knop klikken onder het bericht waar je in de gevangenis bent gezet.', inline: false },
                            { name: 'Let op', value: 'De persoon die betaalt moet voldoende geld hebben op hun balance om de borgsom te kunnen betalen.', inline: false }
                        )
                        .setFooter({ text: 'Je wordt direct vrijgelaten zodra iemand je borgsom betaalt.' });
                    
                    await targetUser.send({ embeds: [bailInstructionsEmbed] });
                }
            } catch (error) {
                console.log(`Kon geen DM sturen naar ${targetUser.tag}: ${error}`);
            }
            
        } catch (error) {
            console.error('Fout bij jail commando:', error);
            return interaction.editReply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 