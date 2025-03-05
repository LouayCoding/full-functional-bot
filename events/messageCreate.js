const { EmbedBuilder, Collection, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { get_tiktok_data, is_too_large_attachment } = require('../utils/tiktokDownloader');

const ms = require('ms');
const client = require('..');
const config = require('../config.json');

const urlRegex = require('url-regex-safe');
const cooldown_users = new Set();
const supress_embeds = new Set();


const prefix = client.prefix;
const cooldown = new Collection();



 
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (/pic\s?perms/i.test(message.content)) {
        const embed = new EmbedBuilder()
            .setDescription("Zet **.gg/back2back** in je status voor picperms!")
            .setColor(config.embedColor);
        return message.reply({ embeds: [embed] });
    }

    let found_match = false;

    function report_error(msg, error) {
        msg.reply({ content: `Error on trying to download this TikTok:\n\`${error}\``, allowedMentions: { repliedUser: false } })
            .catch(console.error);
    }

    function report_filesize_error(msg) {
        msg.reply({ content: "TikTok video is te groot om te uploaden.", allowedMentions: { repliedUser: false } })
            .catch(console.error);
    }

    Array.from(new Set(message.content.match(urlRegex()))).slice(0, config.MAX_TIKTOKS_PER_MESSAGE).forEach((url) => {
        if (/(www\.tiktok\.com)|(vm\.tiktok\.com)/.test(url)) {
            cooldown_users.add(message.author.id);
            found_match = true;
            message.channel.sendTyping().catch(console.error);

            get_tiktok_data(url).then(tiktok_data => {
                let too_large = is_too_large_attachment(message.guild, tiktok_data);
                
                // Encoded URL voor buttons (voorkomt problemen met speciale tekens)
                const encodedUrl = encodeURIComponent(tiktok_data.originalUrl);
                
                // Maak de buttons met customId volgens het button system
                const viewButton = new ButtonBuilder()
                    .setLabel('Ga naar video')
                    .setStyle(ButtonStyle.Link)
                    .setURL(tiktok_data.originalUrl);
                
                const deleteButton = new ButtonBuilder()
                    .setLabel('Verwijderen')
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(`tiktok_delete_${encodedUrl}`);
                
                const buttonRow = new ActionRowBuilder().addComponents(viewButton, deleteButton);
                
                // Bericht met informatie over wie de TikTok deelde
                const content = `<@${message.author.id}> heeft een TikTok gedeeld van ${tiktok_data.authorName}!`;
                
                // Probeer het originele bericht te verwijderen
                if (message.deletable) {
                    message.delete().catch(err => console.error('Kon origineel bericht niet verwijderen:', err));
                }
                
                if (too_large && !config.BOOSTED_CHANNEL_ID) {
                    report_filesize_error(message);
                } else if (too_large) {
                    client.channels.fetch(config.BOOSTED_CHANNEL_ID).then(channel => {
                        if (is_too_large_attachment(channel.guild, tiktok_data)) {
                            report_filesize_error(message);
                        } else {
                            channel.send({ 
                                files: [{ attachment: tiktok_data.buffer, name: `${Date.now()}.mp4` }] 
                            }).then(boosted_message => {
                                message.channel.send({ 
                                    content: content,
                                    components: [buttonRow],
                                    files: [{ 
                                        attachment: boosted_message.attachments.first().url, 
                                        name: `${Date.now()}.mp4` 
                                    }]
                                }).catch(console.error);
                            }).catch(console.error);
                        }
                    }).catch(() => report_filesize_error(message));
                } else {
                    message.channel.send({ 
                        content: content,
                        components: [buttonRow],
                        files: [{ attachment: tiktok_data.buffer, name: `${Date.now()}.mp4` }] 
                    }).catch(error => {
                        console.error('Fout bij versturen van TikTok bericht:', error);
                        message.channel.send('Er ging iets mis bij het versturen van de TikTok video.').catch(console.error);
                    });
                }
            }).catch(err => report_error(message, err));
        }
    });

    if (found_match) {
        if (message.embeds.length) {
            if (message.guild.members.me.permissionsIn(message.channel).has('ManageMessages'))
                message.suppressEmbeds().catch(console.error);
        } else {
            supress_embeds.add(message.id);
        }

        (async (id = message.id) => {
            await new Promise(x => setTimeout(x, 10000));
            supress_embeds.delete(id);
        })();

        (async (id = message.author.id) => {
            await new Promise(x => setTimeout(x, config.COOLDOWN_PER_USER));
            cooldown_users.delete(id);
        })();
    };

    if (!message.guild) return; // Alleen voor berichten in servers


    // **2. Commando afhandeling**
    if (message.channel.type !== 0) return;
    
    // Check voor alle beschikbare prefixes
    const prefixArray = client.prefix;
    let usedPrefix = null;
    
    for (const thisPrefix of prefixArray) {
        if (message.content.startsWith(thisPrefix)) {
            usedPrefix = thisPrefix;
            break;
        }
    }
    
    // Als er geen geldige prefix is gebruikt, stop dan
    if (!usedPrefix) return;
    
    const args = message.content.slice(usedPrefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    if (cmd.length === 0) return;

    let command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
    if (command) {
        if (command.cooldown) {
            if (cooldown.has(`${command.name}${message.author.id}`)) {
                return message.channel.send({ content: config.messages["COOLDOWN_MESSAGE"].replace('<duration>', ms(cooldown.get(`${command.name}${message.author.id}`) - Date.now(), { long: true })) });
            }
            checkPermissions(command, message);
            command.run(client, message, args);
            cooldown.set(`${command.name}${message.author.id}`, Date.now() + command.cooldown);
            setTimeout(() => cooldown.delete(`${command.name}${message.author.id}`), command.cooldown);
        } else {
            checkPermissions(command, message);
            command.run(client, message, args);
        }
    }
});

function checkPermissions(command, message) {
    if (command.userPerms && !message.member.permissions.has(PermissionsBitField.resolve(command.userPerms))) {
        const userPerms = new EmbedBuilder()
            .setDescription(`🚫 ${message.author}, You don't have \`${command.userPerms}\` permissions to use this command!`)
            .setColor('Red');
        return message.reply({ embeds: [userPerms] });
    }
    if (command.botPerms && !message.guild.members.cache.get(client.user.id).permissions.has(PermissionsBitField.resolve(command.botPerms))) {
        const botPerms = new EmbedBuilder()
            .setDescription(`🚫 ${message.author}, I don't have \`${command.botPerms}\` permissions to use this command!`)
            .setColor('Red');
        return message.reply({ embeds: [botPerms] });
    }
}
