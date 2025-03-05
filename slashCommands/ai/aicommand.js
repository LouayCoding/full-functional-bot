const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { embedColor } = require('../../config.json');
require('dotenv').config();

// OpenAI API key uit .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Lijst met ondersteunde acties
const ALLOWED_ACTIONS = [
    'createChannel', 'deleteChannel', 'sendMessage', 'createRole',
    'deleteRole', 'giveRole', 'removeRole', 'kick', 'ban', 'unban', 'timeout'
];

module.exports = {
    name: 'aicommand',
    description: "Laat de AI een actie uitvoeren voor jou (bijv. kanaal aanmaken, gebruiker verbannen)",
    type: ApplicationCommandType.ChatInput,
    cooldown: 5000,
    options: [
        {
            name: 'instructie',
            description: 'Wat wil je dat de AI voor je doet? (bijv. "maak een kanaal genaamd welkom")',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    run: async (client, interaction) => {
        await interaction.deferReply();

        const instructie = interaction.options.getString('instructie');

        try {
            // Stuur de instructie naar OpenAI om te analyseren wat er gedaan moet worden
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { 
                        role: 'system', 
                        content: `Je bent een Discord bot beheertool die gebruikersinstructies vertaalt naar Discord.js acties.
                        
Je taak is om het verzoek te analyseren en te bepalen welke actie moet worden uitgevoerd.
Geef je antwoord in het volgende formaat:

{
  "action": "actieNaam", // Een van: ${ALLOWED_ACTIONS.join(', ')}
  "targetId": "id", // Discord ID van het doelwit (kanaal, rol, gebruiker)
  "additionalData": {}, // Extra gegevens die nodig zijn voor de actie
  "explanation": "korte uitleg" // Zeer korte uitleg (max 10 woorden)
}

Voorbeeld instructies en acties:
- "Maak een kanaal genaamd welkom" → createChannel met name: "welkom"
- "Verwijder kanaal #algemeen" → deleteChannel met targetId
- "Ban gebruiker @spammer" → ban met targetId
- "Unban gebruiker met ID 123456789" → unban met targetId
- "Timeout gebruiker @lastig voor 10 minuten" → timeout met targetId en duration: 600000

Je hebt direct toegang tot alle benodigde permissies. Ga ervan uit dat je alle acties kunt uitvoeren.
Als je de actie niet kunt bepalen of de actie is ongeldig, geef dan { "action": "invalid", "explanation": "Ongeldige of onduidelijke actie" }`
                    },
                    { role: 'user', content: instructie }
                ],
                temperature: 0.2,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                timeout: 30000
            });

            const aiResponse = response.data.choices[0].message.content;
            let actionData;
            
            try {
                // Extract JSON from response (in case GPT adds extra text)
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    actionData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("Kon geen actie bepalen uit antwoord");
                }
            } catch (error) {
                console.error("JSON parsing error:", error);
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("❌ Actie Mislukt")
                            .setDescription("Ik kon je instructie niet goed begrijpen. Probeer specifieker te zijn.")
                            .setColor("Red")
                    ]
                });
            }

            // Als de actie ongeldig is, stop hier
            if (actionData.action === 'invalid') {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("❌ Ongeldige Actie")
                            .setDescription(actionData.explanation || "Deze actie wordt niet ondersteund.")
                            .setColor("Red")
                    ]
                });
            }

            // Voer de actie uit op basis van het type
            let success = true;
            let resultMessage = "Actie succesvol uitgevoerd!";
            
            try {
                switch (actionData.action) {
                    case 'deleteChannel':
                        const channelToDelete = await interaction.guild.channels.fetch(actionData.targetId).catch(() => null);
                        if (channelToDelete) {
                            await channelToDelete.delete(`Verwijderd door ${interaction.user.tag}`);
                            resultMessage = `Kanaal verwijderd ✅`;
                        } else {
                            resultMessage = `Kanaal niet gevonden ❌`;
                            success = false;
                        }
                        break;
                        
                    case 'createChannel':
                        const { name, type = 'text' } = actionData.additionalData;
                        const channelType = type === 'voice' ? 2 : 0;
                        const newChannel = await interaction.guild.channels.create({
                            name: name,
                            type: channelType,
                            reason: `Aangemaakt door ${interaction.user.tag}`
                        });
                        resultMessage = `Kanaal "${newChannel.name}" aangemaakt ✅`;
                        break;
                        
                    case 'sendMessage':
                        const { channelId, message } = actionData.additionalData;
                        const targetChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
                        if (targetChannel) {
                            await targetChannel.send(message);
                            resultMessage = `Bericht verzonden ✅`;
                        } else {
                            resultMessage = `Kanaal niet gevonden ❌`;
                            success = false;
                        }
                        break;
                    
                    case 'createRole':
                        const { roleName, roleColor = '#99AAB5' } = actionData.additionalData;
                        const newRole = await interaction.guild.roles.create({
                            name: roleName,
                            color: roleColor,
                            reason: `Aangemaakt door ${interaction.user.tag}`
                        });
                        resultMessage = `Rol "${newRole.name}" aangemaakt ✅`;
                        break;
                        
                    case 'deleteRole':
                        const roleToDelete = await interaction.guild.roles.fetch(actionData.targetId).catch(() => null);
                        if (roleToDelete) {
                            await roleToDelete.delete(`Verwijderd door ${interaction.user.tag}`);
                            resultMessage = `Rol verwijderd ✅`;
                        } else {
                            resultMessage = `Rol niet gevonden ❌`;
                            success = false;
                        }
                        break;
                        
                    case 'giveRole':
                        const { userId, roleId } = actionData.additionalData;
                        const memberForRole = await interaction.guild.members.fetch(userId).catch(() => null);
                        const roleToGive = await interaction.guild.roles.fetch(roleId).catch(() => null);
                        
                        if (memberForRole && roleToGive) {
                            await memberForRole.roles.add(roleToGive);
                            resultMessage = `Rol toegewezen aan gebruiker ✅`;
                        } else {
                            resultMessage = `Gebruiker of rol niet gevonden ❌`;
                            success = false;
                        }
                        break;
                        
                    case 'removeRole':
                        const { userIdRemove, roleIdRemove } = actionData.additionalData;
                        const memberForRoleRemove = await interaction.guild.members.fetch(userIdRemove).catch(() => null);
                        const roleToRemove = await interaction.guild.roles.fetch(roleIdRemove).catch(() => null);
                        
                        if (memberForRoleRemove && roleToRemove) {
                            await memberForRoleRemove.roles.remove(roleToRemove);
                            resultMessage = `Rol verwijderd van gebruiker ✅`;
                        } else {
                            resultMessage = `Gebruiker of rol niet gevonden ❌`;
                            success = false;
                        }
                        break;
                        
                    case 'kick':
                        const memberToKick = await interaction.guild.members.fetch(actionData.targetId).catch(() => null);
                        if (memberToKick) {
                            if (memberToKick.kickable) {
                                const reason = actionData.additionalData?.reason || `Gekickt door ${interaction.user.tag}`;
                                await memberToKick.kick(reason);
                                resultMessage = `Gebruiker gekickt ✅`;
                            } else {
                                resultMessage = `Geen toestemming om gebruiker te kicken ❌`;
                                success = false;
                            }
                        } else {
                            resultMessage = `Gebruiker niet gevonden ❌`;
                            success = false;
                        }
                        break;
                        
                    case 'ban':
                        const memberToBan = await interaction.guild.members.fetch(actionData.targetId).catch(() => null);
                        if (memberToBan) {
                            if (memberToBan.bannable) {
                                const reason = actionData.additionalData?.reason || `Verbannen door ${interaction.user.tag}`;
                                const deleteDays = actionData.additionalData?.deleteDays || 0;
                                await memberToBan.ban({ deleteMessageDays: deleteDays, reason: reason });
                                resultMessage = `Gebruiker verbannen ✅`;
                            } else {
                                resultMessage = `Geen toestemming om gebruiker te verbannen ❌`;
                                success = false;
                            }
                        } else {
                            // Probeer een gebruiker te bannen op basis van ID als de gebruiker niet in de server is
                            try {
                                await interaction.guild.members.ban(actionData.targetId, {
                                    reason: actionData.additionalData?.reason || `Verbannen door ${interaction.user.tag}`
                                });
                                resultMessage = `Gebruiker met ID ${actionData.targetId} verbannen ✅`;
                            } catch (banError) {
                                resultMessage = `Kon gebruiker niet verbannen: ${banError.message} ❌`;
                                success = false;
                            }
                        }
                        break;
                        
                    case 'unban':
                        try {
                            // Unban werkt direct op het gebruikers-ID
                            await interaction.guild.members.unban(actionData.targetId, 
                                `Ontbannen door ${interaction.user.tag}`);
                            resultMessage = `Gebruiker met ID ${actionData.targetId} is ontbannen ✅`;
                        } catch (unbanError) {
                            resultMessage = `Kon gebruiker niet ontbannen: ${unbanError.message} ❌`;
                            success = false;
                        }
                        break;
                        
                    case 'timeout':
                        const memberToTimeout = await interaction.guild.members.fetch(actionData.targetId).catch(() => null);
                        if (memberToTimeout) {
                            if (memberToTimeout.moderatable) {
                                const reason = actionData.additionalData?.reason || `Timeout door ${interaction.user.tag}`;
                                const duration = actionData.additionalData?.duration || 60000; // Default 1 minute
                                await memberToTimeout.timeout(duration, reason);
                                resultMessage = `Gebruiker heeft timeout gekregen (${duration/60000} min) ✅`;
                            } else {
                                resultMessage = `Geen toestemming om timeout te geven ❌`;
                                success = false;
                            }
                        } else {
                            resultMessage = `Gebruiker niet gevonden ❌`;
                            success = false;
                        }
                        break;
                        
                    default:
                        resultMessage = `Actie wordt niet ondersteund ❌`;
                        success = false;
                        break;
                }
            } catch (actionError) {
                console.error("Action execution error:", actionError);
                success = false;
                resultMessage = `Actie mislukt: ${actionError.message} ❌`;
            }

            // Stuur het resultaat terug
            const responseEmbed = new EmbedBuilder()
                .setTitle(success ? "✅ Actie Uitgevoerd" : "❌ Actie Mislukt")
                .setDescription(`**Opdracht:** ${instructie}`)
                .addFields({ name: 'Resultaat', value: resultMessage })
                .setColor(success ? embedColor : 'Red')
                .setFooter({ text: `Uitgevoerd door ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [responseEmbed] });
            
        } catch (error) {
            console.error('AI Command Error:', error.response?.data || error.message || error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("❌ Fout")
                        .setDescription("Er is iets misgegaan bij het uitvoeren van je instructie.")
                        .setColor("Red")
                ]
            });
        }
    }
}; 