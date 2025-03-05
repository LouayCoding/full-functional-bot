const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const client = require('..');
const VoiceUser = require('../models/VoiceUser');
const config = require('../config.json');

client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;

    if (!oldState.channelId && newState.channelId) {
        await VoiceUser.findOneAndUpdate(
            { userId },
            { lastJoin: Date.now() },
            { upsert: true }
        );
    } else if (oldState.channelId && !newState.channelId) {
        const userRecord = await VoiceUser.findOne({ userId });

        if (userRecord && userRecord.lastJoin) {
            const joinTime = userRecord.lastJoin;
            const timeSpent = (Date.now() - joinTime) / 1000;

            await VoiceUser.findOneAndUpdate(
                { userId },
                {
                    $inc: { totalVoiceTime: timeSpent },
                    $set: { lastJoin: null }
                }
            );
        }
    }

    const logChannel = client.channels.cache.get(config.voiceStateUpdateChannel);
    if (!logChannel) return;

    const member = newState.member || oldState.member;

    // Check voor verplaatsing door moderator
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Wacht kort om zeker te zijn dat audit log is bijgewerkt
        await new Promise(resolve => setTimeout(resolve, 750));

        try {
            const auditLogs = await oldState.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberMove,
            });

            const moveLog = auditLogs.entries.first();
            const moveLogTimestamp = moveLog?.createdTimestamp || 0;
            const currentTimestamp = Date.now();

            // Check of de verplaatsing recent is (binnen 1 seconde) en voor de juiste gebruiker
            if (moveLog && 
                currentTimestamp - moveLogTimestamp < 1000 && 
                moveLog.target?.id === member.user.id &&
                moveLog.executor?.id !== member.user.id) {

                console.log('Verplaatsing gedetecteerd:', {
                    mover: moveLog.executor.tag,
                    target: member.user.tag,
                    timeDiff: currentTimestamp - moveLogTimestamp
                });

                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`👉 ${member} is verplaatst door ${moveLog.executor}\n**Van:** ${oldState.channel}\n**Naar:** ${newState.channel}`)
                    .setFooter({ text: `Verplaatst door: ${moveLog.executor.tag} • ID: ${member.user.id}` })
                    .setTimestamp()
                    .setColor(config.embedColor);

                await logChannel.send({ embeds: [embed] });
                return;
            } else {
                // Log normale kanaalwissel
                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`↔️ ${member} is gewisseld van spraakkanaal\n**Van:** ${oldState.channel}\n**Naar:** ${newState.channel}`)
                    .setFooter({ text: `ID: ${member.user.id}` })
                    .setTimestamp()
                    .setColor(config.embedColor);

                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Fout bij het ophalen van audit logs:', error);
        }
    }

    // Normale join logging
    if (!oldState.channelId && newState.channelId) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`🎙️ ${member} heeft een spraakkanaal betreden: **${newState.channel}**`)
            .setFooter({ text: `ID: ${member.user.id}` })
            .setTimestamp()
            .setColor(config.embedColor);

        await logChannel.send({ embeds: [embed] });
    }

    // Normale leave logging
    else if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`🚪 ${member} heeft het spraakkanaal verlaten: **${oldState.channel ? oldState.channel : '#unknown'}**`)
            .setFooter({ text: `ID: ${member.user.id}` })
            .setTimestamp()
            .setColor(config.embedColor);

        await logChannel.send({ embeds: [embed] });
    }

    // Stream start logging
    if (!oldState.streaming && newState.streaming) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`🎥 ${member} is begonnen met streamen in **${newState.channel ? newState.channel : 'een onbekend kanaal'}**`)
            .setFooter({ text: `ID: ${member.user.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    }

    // Stream stop logging
    else if (oldState.streaming && !newState.streaming) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`⏹️ ${member} is gestopt met streamen in **${oldState.channel ? oldState.channel : 'een onbekend kanaal'}**`)
            .setFooter({ text: `ID: ${member.user.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    }
});
