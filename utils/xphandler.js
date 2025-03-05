const { EmbedBuilder } = require('discord.js');
const Levels = require('discord-xp'); // Importeer discord-xp
const config = require('../config.json');

// Zorg ervoor dat Levels verbonden is met de database
try {
    // Laad environment variables indien nodig
    if (!process.env.MONGODB_URI) {
        require('dotenv').config();
    }
    
    // Stel de database URL in
    const dbURI = process.env.MONGODB_URI;
    Levels.setURL(dbURI);
} catch (error) {
    console.error('Fout bij het instellen van de database verbinding:', error);
}

// Map voor het bijhouden van cooldowns
const cooldowns = new Map();

/**
 * Voegt XP toe aan een gebruiker en handelt level-up af
 * @param {Object} client - De Discord client
 * @param {Object} user - De Discord gebruiker
 * @param {String} guildId - De server ID
 * @param {Number} xpAmount - Hoeveelheid toe te voegen XP (optioneel)
 * @param {Object} options - Extra opties
 * @returns {Object} Een object met informatie over de level-up
 */
async function addXP(client, user, guildId, xpAmount = null, options = {}) {
    const userId = user.id;
    const { checkCooldown = true, source = 'message' } = options;
    
    // Anti-spam cooldown check als dit is ingeschakeld
    if (checkCooldown) {
        const now = Date.now();
        // Controleer of config.levels.xp bestaat
        if (!config.levels.xp) {
            config.levels.xp = { min: 10, max: 25, cooldown: 0 };
        }
        const cooldownSeconds = config.levels.xp.cooldown || 0; // Default naar 60 als niet ingesteld
        console.log(cooldownSeconds)
        if (cooldowns.has(userId)) {
            const cooldownExpiry = cooldowns.get(userId);
            
            if (now < cooldownExpiry) {
                // De gebruiker is nog in cooldown, geen XP toekennen
                return { success: false, reason: 'cooldown' };
            }
        }
        
        // Stel een nieuwe cooldown in
        cooldowns.set(userId, now + (cooldownSeconds * 1000));
        
        // Voor zeer lange cooldowns, clean up de map na een tijdje
        setTimeout(() => {
            if (cooldowns.has(userId)) {
                cooldowns.delete(userId);
            }
        }, cooldownSeconds * 1000);
    }
    
    // Als geen XP is aangegeven, genereer een willekeurige hoeveelheid
    if (xpAmount === null) {
        const minXp = config.levels.xp.min || 10;
        const maxXp = config.levels.xp.max || 25;
        xpAmount = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
    }
    
    // Haal het oude level op (als nodig voor vergelijking)
    let oldLevel = 0;
    if (source === 'givexp') {
        const oldUserData = await Levels.fetch(userId, guildId);
        oldLevel = oldUserData ? oldUserData.level : 0;
    }
    
    try {
        // Voeg XP toe en controleer of de gebruiker een level omhoog is gegaan
        const hasLeveledUp = await Levels.appendXp(userId, guildId, xpAmount);
        
        // Als de gebruiker niet level-up is gegaan, return simpele informatie
        if (!hasLeveledUp) {
            const userData = await Levels.fetch(userId, guildId);
            return {
                success: true,
                leveledUp: false,
                user: userData,
                xpAdded: xpAmount
            };
        }
        
        // De gebruiker is een level omhoog gegaan, haal de gegevens op
        const userData = await Levels.fetch(userId, guildId);
        const newLevel = userData.level;
        
        // Return object voor resultaten
        const result = {
            success: true,
            leveledUp: true,
            user: userData,
            xpAdded: xpAmount,
            oldLevel: oldLevel || newLevel - 1,
            newLevel: newLevel,
            reward: 0,
            roleAwarded: null,
            roleMessage: ''
        };
        
        // Controleer of beloningen zijn ingeschakeld
        if (config.levels.rewards && config.levels.rewards.enabled) {
            // Check of er een specifieke beloning is ingesteld voor dit level
            if (config.levels.rewards.currency.perLevel && config.levels.rewards.currency.perLevel[newLevel.toString()]) {
                result.reward = config.levels.rewards.currency.perLevel[newLevel.toString()];
                result.specialMessage = `🏆 **Speciale level ${newLevel} beloning!** Je ontvangt **${result.reward}** euro!`;
            } else {
                // Anders de standaard beloning gebruiken
                result.reward = config.levels.rewards.currency.defaultAmount || 50;
            }
            
            // Voeg geld toe aan de gebruiker's economie profiel als de economy module beschikbaar is
            if (client.eco) {
                try {
                    const ecoUser = await client.eco.users.get(userId, guildId);
                    await ecoUser.balance.add(result.reward, `Level up beloning: Level ${newLevel}`);
                } catch (err) {
                    console.error('Fout bij het toevoegen van economy beloningen:', err);
                }
            }
        }
        
        // Controleer of rollen moeten worden toegekend
        if (config.levels.roles && config.levels.roles.enabled && config.levels.roles.levelRoles) {
            const levelRoles = config.levels.roles.levelRoles;
            const roleLevels = Object.keys(levelRoles).map(level => parseInt(level)).sort((a, b) => a - b);
            
            try {
                const guild = client.guilds.cache.get(guildId);
                const guildMember = await guild.members.fetch(userId);
                
                // Vind de hoogste rol die de gebruiker mag hebben op basis van level
                let highestRoleLevel = 0;
                let highestRoleForLevel = null;
                
                for (const level of roleLevels) {
                    if (newLevel >= level && level > highestRoleLevel) {
                        highestRoleLevel = level;
                        highestRoleForLevel = levelRoles[level.toString()];
                    }
                }
                
                // Als er een rol gevonden is
                if (highestRoleForLevel) {
                    // Verwijder oude level rollen als dat is ingesteld
                    if (config.levels.roles.removeOldRoles) {
                        for (const level of roleLevels) {
                            if (level !== highestRoleLevel) {
                                const roleId = levelRoles[level.toString()];
                                if (guildMember.roles.cache.has(roleId)) {
                                    await guildMember.roles.remove(roleId);
                                }
                            }
                        }
                    }
                    
                    // Voeg de nieuwe rol toe
                    if (!guildMember.roles.cache.has(highestRoleForLevel)) {
                        await guildMember.roles.add(highestRoleForLevel);
                        result.roleAwarded = highestRoleForLevel;
                        result.roleMessage = `\n🎭 Je hebt de <@&${highestRoleForLevel}> rol ontvangen!`;
                    }
                }
            } catch (error) {
                console.error('Fout bij het toewijzen van level rollen:', error);
            }
        }
        
        // Stuur een level-up notificatie als dat is ingeschakeld
        if (config.levels.notifications && config.levels.notifications.enabled) {
            await sendLevelUpNotification(client, user, guildId, result);
        }
        
        return result;
    } catch (error) {
        console.error('Kritieke fout in addXP functie:', error);
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Stuurt een level-up notificatie naar het geconfigureerde kanaal
 * @param {Object} client - De Discord client
 * @param {Object} user - De Discord gebruiker
 * @param {String} guildId - De server ID
 * @param {Object} levelData - Informatie over de level-up
 */
async function sendLevelUpNotification(client, user, guildId, levelData) {
    try {
        // Gebruik de kleur uit de config
        const embedColor = config.levels.notifications.embedColor || config.embedColor || '#3498db';
        
        function getHex() {
            return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padEnd(6, '0');
          }
        // Maak de level-up embed
        const levelUpEmbed = new EmbedBuilder()
            .setTitle(`🎉 Level Up! 🎉`)
            .setDescription(`Gefeliciteerd <@${user.id}>! Je bent gestegen naar **level ${levelData.newLevel}**!${levelData.roleMessage || ''}`)
            .addFields(
                { name: 'Level', value: `${levelData.newLevel}`, inline: true },
                { name: 'Totale XP', value: `${levelData.user.xp}`, inline: true },
                { name: 'Beloning', value: `${levelData.reward} euro`, inline: true }
            )
            .setColor(getHex())
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: config.levels.notifications.footerText || config.footerText || 'Blijf chatten om meer XP te verdienen!' })
            .setTimestamp();
            
        // Stel de author in met de gebruikersnaam en avatar
        levelUpEmbed.setAuthor({
            name: `${user.username} is level up!`,
            iconURL: user.displayAvatarURL({ dynamic: true })
        });
        
        // Voeg een speciale boodschap toe als die er is
        if (levelData.specialMessage) {
            levelUpEmbed.addFields({ name: 'Bonus', value: levelData.specialMessage });
        }
        
        // Stuur de notificatie naar het geconfigureerde kanaal
        const levelUpChannelId = config.levels.notifications.levelUpChannelId || "1331689733704650946";
        const levelUpChannel = client.channels.cache.get(levelUpChannelId);
        
        if (levelUpChannel) {
            await levelUpChannel.send({ 
                embeds: [levelUpEmbed] 
            });
        } else {
            console.error(`Level up kanaal niet gevonden: ${levelUpChannelId}`);
        }
    } catch (error) {
        console.error('Fout bij het sturen van level up notificatie:', error);
    }
}

/**
 * Functie voor het afhandelen van XP bij berichten
 */
async function handleXP(message) {
    if (message.author.bot) {
        return;
    }
    
    // Controleer of het levelsysteem is ingeschakeld
    if (!config.levels || !config.levels.enabled) {
        return;
    }
    
    return await addXP(message.client, message.author, message.guild.id);
}

// Exporteer de functies
module.exports = { 
    handleXP,
    addXP,
    sendLevelUpNotification
};
