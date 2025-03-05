const { EmbedBuilder } = require('discord.js');
const { embedColor } = require('../../config.json')

module.exports = {
    name: 'serverinfo',
    description: "Krijg alle details over deze server in een oogopslag!",
    run: async (client, interaction) => {
        const guild = interaction.guild;
        const guildName = guild.name;
        const guildIcon = guild.iconURL({ dynamic: true, size: 512 });
        const guildOwner = await guild.fetchOwner().then(owner => owner.user.tag).catch(() => "None");
        const memberCount = guild.memberCount;
        const humanCount = guild.members.cache.filter(member => !member.user.bot).size;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const verificationLevel = guild.verificationLevel;
        const boosts = guild.premiumSubscriptionCount || 0;
        const boostLevel = guild.premiumTier;
        const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
        const categoryChannels = guild.channels.cache.filter(channel => channel.type === 4).size;
        const rolesCount = guild.roles.cache.size;
        const emojisCount = guild.emojis.cache.size;
        const boosterCount = guild.members.cache.filter(member => member.premiumSince).size;

        // Ontwerpdetails
        const splash = guild.splashURL({ dynamic: true, size: 512 }) || "N/A";
        const banner = guild.bannerURL({ dynamic: true, size: 512 }) || "N/A";
        const iconLink = guildIcon ? `[Click here](${guildIcon})` : "N/A";

        const createdDate = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`;
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: guildName, iconURL: guildIcon })
            .setThumbnail(guildIcon)
            .setDescription(`Server gemaakt op ${createdDate}`)
            .addFields(
                { name: "Owner", value: `${guildOwner}`, inline: true },
                { name: "Members", value: `**Total**: ${memberCount}\n**Humans**: ${humanCount}\n**Bots**: ${botCount}`, inline: true },
                { name: "Information", value: `**Verification**: ${verificationLevel}\n**Boosts**: ${boosts} (level ${boostLevel})`, inline: true },
                { name: "Design", value: `**Splash**: ${splash}\n**Banner**: ${banner}\n**Icon**: ${iconLink}`, inline: true },
                { name: `Channels (${textChannels + voiceChannels + categoryChannels})`, value: `**Text**: ${textChannels}\n**Voice**: ${voiceChannels}\n**Category**: ${categoryChannels}`, inline: true },
                { name: "Counts", value: `**Roles**: ${rolesCount}/250\n**Emojis**: ${emojisCount}/500\n**Boosters**: ${boosterCount}`, inline: true }
            )
            .setFooter({ text: `Server ID: ${guild.id}` })
            .setColor(embedColor)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
