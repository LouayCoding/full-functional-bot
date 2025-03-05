const { ApplicationCommandType, ApplicationCommandOptionType, AttachmentBuilder } = require('discord.js');
const Levels = require('discord-xp');
const { Font, RankCardBuilder } = require('canvacord');
const mongoose = require('mongoose');
const config = require('../../config.json');

// Laad het standaard lettertype voor de rankkaart
// Dit moet worden uitgevoerd bij het laden van het bestand
try {
    Font.loadDefault();
    console.log('Canvacord standaard font geladen');
} catch (err) {
    console.error('Kon canvacord font niet laden:', err);
}

// Haal het RankCard model op voor persoonlijke instellingen
let RankCard;
try {
    RankCard = mongoose.model('RankCard');
} catch {
    // Als het model nog niet bestaat, zal het worden gemaakt door het rankcard.js commando
    // We maken hier een leeg schema dat alleen als placeholder dient
    const Schema = new mongoose.Schema({
        userId: String,
        guildId: String,
        background: String,
        progressBarColor: String,
        overlayOpacity: Number,
        textColor: String
    });
    RankCard = mongoose.model('RankCard', Schema);
}

module.exports = {
    name: 'rank',
    description: 'Bekijk jouw rank of die van een andere gebruiker',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker waarvan je de rank wilt zien',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
            // Check of het levelsysteem is ingeschakeld
            if (!config.levels || !config.levels.enabled) {
                return interaction.reply({
                    content: 'Het levelsysteem is momenteel uitgeschakeld.',
                    ephemeral: true
                });
            }
            
            await interaction.deferReply(); // Defer de reply omdat het genereren van de afbeelding even kan duren

            // Haal de gebruiker op
            const target = interaction.options.getUser('gebruiker') || interaction.user;
            
            // Haal de level data op
            const user = await Levels.fetch(target.id, interaction.guild.id, true);
            
            if (!user) {
                return interaction.editReply(`**${target.username}** heeft nog geen XP verdiend in deze server.`);
            }

            // Bepaal de huidige level rol informatie
            let currentRoleName = "Geen level rol";
            let nextRoleName = "Geen volgende rol";
            let nextRoleLevel = null;
            
            // Alleen rol info opvragen als rollen zijn ingeschakeld
            if (config.levels.roles && config.levels.roles.enabled && config.levels.roles.levelRoles) {
                const levelRoles = config.levels.roles.levelRoles;
                const roleLevels = Object.keys(levelRoles).map(level => parseInt(level)).sort((a, b) => a - b);
                
                // Vind de huidige rol op basis van level
                let highestRoleLevel = 0;
                let highestRoleId = null;
                
                for (const level of roleLevels) {
                    if (user.level >= level && level > highestRoleLevel) {
                        highestRoleLevel = level;
                        highestRoleId = levelRoles[level.toString()];
                    }
                }
                
                // Als er een huidige rol is gevonden
                if (highestRoleId) {
                    try {
                        // Probeer rolnaam op te halen
                        const role = await interaction.guild.roles.fetch(highestRoleId);
                        if (role) {
                            currentRoleName = role.name;
                        }
                        
                        // Probeer de volgende rol te vinden
                        for (const level of roleLevels) {
                            if (level > user.level) {
                                nextRoleLevel = level;
                                const nextRoleId = levelRoles[level.toString()];
                                const nextRole = await interaction.guild.roles.fetch(nextRoleId);
                                if (nextRole) {
                                    nextRoleName = nextRole.name;
                                }
                                break;
                            }
                        }
                    } catch (error) {
                        console.error('Fout bij het ophalen van rol informatie:', error);
                    }
                }
            }
            
            // Voorbereiden van rol informatie tekst
            let roleInfo = '';
            if (nextRoleLevel) {
                roleInfo = `\nHuidige rol: **${currentRoleName}**\nVolgende rol (**${nextRoleName}**) op level **${nextRoleLevel}**`;
            } else {
                roleInfo = `\nHuidige rol: **${currentRoleName}**`;
                if (currentRoleName !== "Geen level rol") {
                    roleInfo += "\nJe hebt de hoogste level rol bereikt!";
                }
            }
            
            try {
                // Haal persoonlijke instellingen op
                const cardSettings = await RankCard.findOne({
                    userId: target.id,
                    guildId: interaction.guild.id
                });
                
                // Maak een nieuwe RankCardBuilder volgens de officiële canvacord documentatie
                const card = new RankCardBuilder()
                    .setAvatar(target.displayAvatarURL({ extension: 'png', size: 512 }))
                    .setUsername(`@${target.username}`) // Kleine naam onderin
                    .setDisplayName(target.displayName || target.username) // Grote naam bovenaan
                    .setLevel(user.level)
                    .setRank(user.position || 1)
                    .setCurrentXP(user.cleanXp)
                    .setRequiredXP(user.cleanNextLevelXp)
                    .setStatus(target.presence?.status || 'offline');
                
                // Pas de achtergrond aan op basis van persoonlijke instellingen of config
                if (cardSettings?.background) {
                    card.setBackground(cardSettings.background);
                } else {
                    card.setBackground(config.levels.rankCard?.background || '#23272A');
                }
                
                // Pas de overlay doorzichtigheid aan
                const overlayOpacity = cardSettings?.overlayOpacity !== undefined ? 
                    cardSettings.overlayOpacity : 70; // standaard 70%
                card.setOverlay(overlayOpacity);
                
                // Pas de teksten aan naar het Nederlands
                card.setTextStyles({
                    level: "LEVEL :",
                    rank: "RANK :",
                    xp: "XP :"
                });
                
                // Pas de voortgangsberekening aan
                card.setProgressCalculator((currentXP, requiredXP) => {
                    return Math.min(100, Math.max(0, Math.floor((currentXP / requiredXP) * 100)));
                });
                
                // Pas de kleuren aan op basis van persoonlijke instellingen of config
                const progressColor = cardSettings?.progressBarColor || 
                    config.levels.rankCard?.progressBar || '#3498db';
                
                card.setStyles({
                    progressbar: {
                        thumb: {
                            style: {
                                backgroundColor: progressColor
                            }
                        }
                    }
                });
                
                // Genereer de rank card als afbeelding
                const rankCard = await card.build({
                    format: 'png'
                });
                
                // Stuur de rank card als afbeelding
                const attachment = new AttachmentBuilder(rankCard, { name: 'rank.png' });
                
                return interaction.editReply({
                    content: `**${target.username}** is level **${user.level}** met **${user.xp}** XP in totaal!${roleInfo}`,
                    files: [attachment]
                });
            } catch (rankError) {
                console.error('Fout bij het genereren van de rank card:', rankError);
                
                // Fallback naar een eenvoudig tekstbericht als rank card generatie mislukt
                return interaction.editReply({
                    content: `**${target.username}** is level **${user.level}** met **${user.xp}** XP in totaal!\n` +
                             `XP tot volgend level: **${user.cleanXp}/${user.cleanNextLevelXp}**\n` +
                             `Rank positie: **#${user.position || 'Onbekend'}**${roleInfo}`
                });
            }
            
        } catch (error) {
            console.error('Fout bij het uitvoeren van het rank commando:', error);
            return interaction.editReply({
                content: 'Er is een fout opgetreden bij het genereren van de rank informatie. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 