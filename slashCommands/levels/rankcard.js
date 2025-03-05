const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const mongoose = require('mongoose');
const config = require('../../config.json');

// MongoDB Schema voor rankkaart aanpassingen
const RankCardSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    background: { type: String, default: null },
    progressBarColor: { type: String, default: null },
    overlayOpacity: { type: Number, min: 0, max: 100, default: 70 },
    textColor: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
});

// Maak het model als het nog niet bestaat
let RankCard;
try {
    RankCard = mongoose.model('RankCard');
} catch {
    RankCard = mongoose.model('RankCard', RankCardSchema);
}

// Helper functie om HEX kleurcode te valideren
function isValidHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

module.exports = {
    name: 'rankcard',
    description: 'Personaliseer je rankkaart',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'achtergrond',
            description: 'Pas de achtergrond van je rankkaart aan',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'kleur',
                    description: 'Stel een achtergrondkleur in (HEX code, bijv. #FF5500)',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'hex',
                            description: 'De HEX kleurcode (#RRGGBB format)',
                            type: ApplicationCommandOptionType.String,
                            required: true
                        }
                    ]
                },
                {
                    name: 'afbeelding',
                    description: 'Stel een afbeelding in als achtergrond (upload een afbeelding)',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'bestand',
                            description: 'De afbeelding die je wilt gebruiken als achtergrond',
                            type: ApplicationCommandOptionType.Attachment,
                            required: true
                        }
                    ]
                },
                {
                    name: 'reset',
                    description: 'Reset de achtergrond naar de standaardinstelling',
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        {
            name: 'progressbar',
            description: 'Pas de voortgangsbalk van je rankkaart aan',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'kleur',
                    description: 'De kleur van de voortgangsbalk (HEX code, bijv. #FF5500)',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: 'overlay',
            description: 'Pas de doorzichtigheid van de overlay aan',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'percentage',
                    description: 'De doorzichtigheid van de overlay (0-100)',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 100
                }
            ]
        },
        {
            name: 'reset',
            description: 'Reset alle aanpassingen van je rankkaart',
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    run: async (client, interaction) => {
        // Check of het levelsysteem is ingeschakeld
        if (!config.levels || !config.levels.enabled) {
            return interaction.reply({
                content: 'Het levelsysteem is momenteel uitgeschakeld.',
                ephemeral: true
            });
        }
        
        const subCommand = interaction.options.getSubcommand();
        const subCommandGroup = interaction.options.getSubcommandGroup(false);
        
        // Haal huidige instellingen op of maak nieuwe aan
        let userSettings = await RankCard.findOne({
            userId: interaction.user.id,
            guildId: interaction.guild.id
        });
        
        if (!userSettings) {
            userSettings = new RankCard({
                userId: interaction.user.id,
                guildId: interaction.guild.id
            });
        }
        
        try {
            // Verwerk het reset commando
            if (subCommand === 'reset' && !subCommandGroup) {
                await RankCard.findOneAndDelete({
                    userId: interaction.user.id,
                    guildId: interaction.guild.id
                });
                
                return interaction.reply({
                    content: '✅ Alle aanpassingen van je rankkaart zijn gereset naar de standaardinstellingen.',
                    ephemeral: true
                });
            }
            
            // Verwerk achtergrond subcommands
            if (subCommandGroup === 'achtergrond') {
                if (subCommand === 'kleur') {
                    const hexColor = interaction.options.getString('hex');
                    
                    if (!isValidHexColor(hexColor)) {
                        return interaction.reply({
                            content: '❌ Ongeldige HEX kleurcode. Gebruik het formaat #RRGGBB of #RGB.',
                            ephemeral: true
                        });
                    }
                    
                    userSettings.background = hexColor;
                    await userSettings.save();
                    
                    return interaction.reply({
                        content: `✅ Je rankkaart achtergrondkleur is ingesteld op ${hexColor}.`,
                        ephemeral: true
                    });
                }
                
                if (subCommand === 'afbeelding') {
                    const attachment = interaction.options.getAttachment('bestand');
                    
                    // Controleer of de bijlage een afbeelding is
                    if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
                        return interaction.reply({
                            content: '❌ Je moet een afbeelding uploaden. Ondersteunde formaten zijn: jpg, png, gif en webp.',
                            ephemeral: true
                        });
                    }
                    
                    // Controleer bestandsgrootte (max 8MB)
                    if (attachment.size > 8 * 1024 * 1024) {
                        return interaction.reply({
                            content: '❌ De afbeelding is te groot. De maximale grootte is 8MB.',
                            ephemeral: true
                        });
                    }
                    
                    // Gebruik de URL van de bijlage
                    userSettings.background = attachment.url;
                    await userSettings.save();
                    
                    return interaction.reply({
                        content: `✅ Je rankkaart achtergrondafbeelding is ingesteld.`,
                        files: [{
                            attachment: attachment.url,
                            name: 'background-preview.png'
                        }],
                        ephemeral: true
                    });
                }
                
                if (subCommand === 'reset') {
                    userSettings.background = null;
                    await userSettings.save();
                    
                    return interaction.reply({
                        content: '✅ Je rankkaart achtergrond is gereset naar de standaardinstelling.',
                        ephemeral: true
                    });
                }
            }
            
            // Verwerk progressbar commando
            if (subCommand === 'progressbar') {
                const progressColor = interaction.options.getString('kleur');
                
                if (!isValidHexColor(progressColor)) {
                    return interaction.reply({
                        content: '❌ Ongeldige HEX kleurcode. Gebruik het formaat #RRGGBB of #RGB.',
                        ephemeral: true
                    });
                }
                
                userSettings.progressBarColor = progressColor;
                await userSettings.save();
                
                return interaction.reply({
                    content: `✅ Je voortgangsbalk kleur is ingesteld op ${progressColor}.`,
                    ephemeral: true
                });
            }
            
            // Verwerk overlay commando
            if (subCommand === 'overlay') {
                const overlayOpacity = interaction.options.getInteger('percentage');
                
                userSettings.overlayOpacity = overlayOpacity;
                await userSettings.save();
                
                return interaction.reply({
                    content: `✅ Je overlay doorzichtigheid is ingesteld op ${overlayOpacity}%.`,
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Fout bij het uitvoeren van het rankcard commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het aanpassen van je rankkaart. Probeer het later opnieuw.',
                ephemeral: true
            });
        }
    }
}; 