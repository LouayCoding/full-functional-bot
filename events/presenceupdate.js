const { EmbedBuilder } = require('discord.js');
const client = require('..');
const config = require('../config.json');

const triggerKeywords = ['back2back', '.gg/back2back', '/back2Back', 'discord.gg/back2back']; // Voeg 'back2back' toe als keyword
const logChannelId = config.vanityChannel;
const targetRoleId = config.vanityRole;

client.on('presenceUpdate', async (oldPresence, newPresence) => {
    // Check of de presence en guild bestaan
    if (!newPresence?.guild || !newPresence?.member) return;

    const member = newPresence.member;
    
    // Check of de member geldig is
    if (!member.manageable) return;

    // Zoek naar custom status
    const customStatus = newPresence.activities?.find(activity => 
        activity.type === 4 && activity.state
    );

    // Check of er een trigger keyword in de status staat (case insensitive)
    const hasTriggerInStatus = customStatus?.state && triggerKeywords.some(keyword => 
        customStatus.state.toLowerCase().includes(keyword.toLowerCase())
    );



    // Haal role en logChannel op
    const role = newPresence.guild.roles.cache.get(targetRoleId);
    const logChannel = newPresence.guild.channels.cache.get(logChannelId);

    // Check of role en logChannel bestaan
    if (!role || !logChannel) {
        console.error('Role of logChannel niet gevonden');
        return;
    }

    try {
        // Voeg rol toe als trigger aanwezig is
        if (hasTriggerInStatus && !member.roles.cache.has(targetRoleId)) {
            await member.roles.add(role);

            const embed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setAuthor({ 
                    name: member.user.tag, 
                    iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                })
                .setDescription(`${member} heeft de vanity link in hun status en kreeg de rol.`)
                .addFields({ 
                    name: 'Status', 
                    value: customStatus.state || 'Geen status tekst' 
                })
                .setTimestamp()
                .setFooter({ text: config.footerText });

            await logChannel.send({ embeds: [embed] });
        }

        // Check of de gebruiker de rol heeft maar geen trigger meer in status
        if (member.roles.cache.has(targetRoleId)) {
            const hasAnyTrigger = newPresence.activities?.some(activity =>
                activity.type === 4 && 
                activity.state && 
                triggerKeywords.some(keyword => 
                    activity.state.toLowerCase().includes(keyword.toLowerCase())
                )
            );

            if (!hasAnyTrigger) {
                await member.roles.remove(role);

                const embed = new EmbedBuilder()
                    .setColor(config.embedColor)
                    .setAuthor({ 
                        name: member.user.tag, 
                        iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setDescription(`${member} heeft de vanity link niet meer in hun status en verloor de rol.`)
                    .setTimestamp()
                    .setFooter({ text: config.footerText });

                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error(`Fout bij het updaten van rol voor ${member.user.tag}:`, error);
    }
});

module.exports = client;
