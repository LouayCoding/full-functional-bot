const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkperms')
        .setDescription('Controleer de permissies van de bot in dit kanaal of in het telkanaal')
        .addChannelOption(option => 
            option.setName('kanaal')
                .setDescription('Het kanaal om te controleren (standaard: huidige kanaal)')
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        // Bepaal welk kanaal te controleren
        const targetChannel = interaction.options.getChannel('kanaal') || 
                             interaction.channel;
        
        // Haal de bot member op
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        
        // Verkrijg de permissies
        const globalPermissions = botMember.permissions;
        const channelPermissions = botMember.permissionsIn(targetChannel);
        
        // Belangrijke permissies om te controleren
        const criticalPermissions = [
            { name: 'Berichten Beheren', flag: PermissionsBitField.Flags.MANAGE_MESSAGES },
            { name: 'Berichten Verzenden', flag: PermissionsBitField.Flags.SEND_MESSAGES },
            { name: 'Embed Links', flag: PermissionsBitField.Flags.EMBED_LINKS },
            { name: 'Bestanden Toevoegen', flag: PermissionsBitField.Flags.ATTACH_FILES },
            { name: 'Reacties Toevoegen', flag: PermissionsBitField.Flags.ADD_REACTIONS },
            { name: 'Externe Emoji\'s Gebruiken', flag: PermissionsBitField.Flags.USE_EXTERNAL_EMOJIS },
            { name: 'Kanaal Bekijken', flag: PermissionsBitField.Flags.VIEW_CHANNEL }
        ];
        
        // Bouw lijsten van permissies
        let globalPermList = '';
        let channelPermList = '';
        
        for (const perm of criticalPermissions) {
            const hasGlobal = globalPermissions.has(perm.flag);
            const hasChannel = channelPermissions.has(perm.flag);
            
            globalPermList += `${hasGlobal ? '✅' : '❌'} ${perm.name}\n`;
            channelPermList += `${hasChannel ? '✅' : '❌'} ${perm.name}\n`;
        }
        
        // Speciale check voor telkanaal (als dit niet het doelkanaal is)
        let countingChannelPermList = '';
        if (targetChannel.id !== config.countingChannel) {
            const countingChannel = interaction.guild.channels.cache.get(config.countingChannel);
            if (countingChannel) {
                const countingPerms = botMember.permissionsIn(countingChannel);
                
                for (const perm of criticalPermissions) {
                    const hasCountingPerm = countingPerms.has(perm.flag);
                    countingChannelPermList += `${hasCountingPerm ? '✅' : '❌'} ${perm.name}\n`;
                }
            } else {
                countingChannelPermList = 'Telkanaal niet gevonden.';
            }
        }
        
        // Bouw de embed
        const embed = new EmbedBuilder()
            .setTitle('Bot Permissie Check')
            .setColor('#2F3136')
            .addFields(
                { name: 'Globale Permissies', value: globalPermList, inline: true },
                { name: `Permissies in ${targetChannel.name}`, value: channelPermList, inline: true }
            );
        
        // Voeg telkanaal toe als het anders is
        if (countingChannelPermList && targetChannel.id !== config.countingChannel) {
            embed.addFields(
                { name: '\u200B', value: '\u200B', inline: true }, // Lege field als spacer
                { name: 'Permissies in Telkanaal', value: countingChannelPermList, inline: true }
            );
        }
        
        // Stuur de embed
        await interaction.editReply({ embeds: [embed] });
    }
}; 