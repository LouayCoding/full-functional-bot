const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const client = require('..');
const { embedColor } = require('../config.json');
require('dotenv').config();

// OpenAI API key uit .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Beperk tot ALLEEN de eigenaar met het specifieke ID
const ALLOWED_USER_ID = '935943312815300699';

// Lijst met toegestane acties
const ALLOWED_ACTIONS = [
    'createChannel', 'deleteChannel', 'sendMessage', 'createRole',
    'deleteRole', 'giveRole', 'removeRole', 'kick', 'ban', 'timeout'
];

// Acties die in een commandopatroon moeten worden gezocht
const ACTION_PATTERNS = [
    /maak .* kanaal/i,
    /verwijder .* kanaal/i,
    /stuur .* bericht/i,
    /maak .* rol/i,
    /verwijder .* rol/i,
    /geef .* rol/i,
    /verwijder .* rol van/i,
    /kick .*/i,
    /ban .*/i,
    /timeout .*/i,
    /verban .*/i
];

client.on('messageCreate', async (message) => {
    // Negeer berichten van bots
    if (message.author.bot) return;

    // Controleer of het bericht van de specifiek toegestane gebruiker is
    if (message.author.id !== ALLOWED_USER_ID) return;

    // Controleer of de bot is gementioned EN er is een actiepatroon
    if (!message.mentions.has(client.user.id)) return;
    
    // Extract het commando uit het bericht (verwijder de mention)
    let instruction = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

    // Als er geen instructie is, negeer het
    if (!instruction) return;

    // Controleer of er een actiepatroon aanwezig is
    const containsActionPattern = ACTION_PATTERNS.some(pattern => pattern.test(instruction));
    if (!containsActionPattern) return; // Als er geen actiepatroon is, negeer het bericht

    // Laat de gebruiker weten dat de bot bezig is
    await message.channel.sendTyping();

    try {
        // Stuur de instructie naar OpenAI om te analyseren wat er gedaan moet worden
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { 
                    role: 'system', 
                    content: `Je bent een Discord bot beheertool. Je taak is om gebruikersinstructies te vertalen naar Discord.js acties.

Antwoord ALTIJD in het volgende JSON-formaat:
{
  "action": "actieNaam", // Eén van: ${ALLOWED_ACTIONS.join(', ')}
  "targetId": "id", // Discord ID van het doelwit (kanaal, rol, gebruiker)
  "additionalData": {}, // Extra gegevens die nodig zijn voor de actie
  "confirmation": "bevestigingsbericht", // Bevestiging van wat je gaat doen (in Nederlands)
  "explanation": "uitleg" // Uitleg van wat je begrepen hebt en gaat doen (in Nederlands)
}

Voorbeelden:
1. "Verwijder het kanaal met ID 123456789"
{
  "action": "deleteChannel",
  "targetId": "123456789",
  "additionalData": {},
  "confirmation": "Ik ga het kanaal met ID 123456789 verwijderen.",
  "explanation": "Je hebt me gevraagd om een specifiek kanaal te verwijderen op basis van het ID."
}

2. "Maak een nieuw kanaal genaamd welkom"
{
  "action": "createChannel",
  "targetId": "",
  "additionalData": {"name": "welkom", "type": "text"},
  "confirmation": "Ik ga een nieuw tekstkanaal maken met de naam 'welkom'",
  "explanation": "Je hebt me gevraagd om een nieuw tekstkanaal aan te maken."
}

BELANGRIJK: Als de instructie niet duidelijk is of je geen actie kunt bepalen, stel dan meer vragen. 
Als de instructie niet gerelateerd is aan Discord moderatie of beheer, geef dan aan dat je alleen Discord beheertaken kunt uitvoeren.
ALS DE ACTIE NIET IN DE TOEGESTANE LIJST STAAT OF GEVAARLIJK IS, ANTWOORD DAN:
{
  "action": "invalid",
  "explanation": "Deze actie wordt niet ondersteund of is te gevaarlijk."
}
` 
                },
                { role: 'user', content: instruction }
            ],
            temperature: 0.2,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            timeout: 60000
        });

        // Haal de actionData uit het antwoord
        let responseText = response.data.choices[0].message.content.trim();
        let actionData;
        
        try {
            // Zoek naar JSON in de tekst (voor het geval dat GPT extra tekst ervoor/erna plaatst)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                actionData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Geen JSON gevonden in antwoord");
            }
        } catch (jsonError) {
            console.error("JSON parsing error:", jsonError, responseText);
            return message.reply("Ik kon je instructie niet goed verwerken. Probeer het opnieuw met duidelijkere bewoording.");
        }

        // Laat zien wat de AI gaat doen
        const confirmEmbed = new EmbedBuilder()
            .setTitle("AI Actie")
            .setDescription(actionData.explanation)
            .addFields(
                { name: 'Actie', value: actionData.action },
                { name: 'Bevestiging', value: actionData.confirmation }
            )
            .setColor(embedColor)
            .setTimestamp();

        // Als de actie ongeldig is, stop hier
        if (actionData.action === 'invalid') {
            return message.reply({ embeds: [confirmEmbed] });
        }

        // Voer de actie uit op basis van het type
        let actionResult = "Actie uitgevoerd!";
        
        switch (actionData.action) {
            case 'deleteChannel':
                // Controleer of het kanaal bestaat
                const channelToDelete = await message.guild.channels.fetch(actionData.targetId).catch(() => null);
                if (channelToDelete) {
                    await channelToDelete.delete(`Verwijderd door ${message.author.tag} via AI Direct Action`);
                    actionResult = `Kanaal ${actionData.targetId} succesvol verwijderd.`;
                } else {
                    actionResult = `Kanaal met ID ${actionData.targetId} niet gevonden.`;
                }
                break;
                
            case 'createChannel':
                const { name, type = 'text' } = actionData.additionalData;
                const channelType = type === 'voice' ? 2 : 0; // 0 voor text, 2 voor voice
                const newChannel = await message.guild.channels.create({
                    name: name,
                    type: channelType,
                    reason: `Aangemaakt door ${message.author.tag} via AI Direct Action`
                });
                actionResult = `Kanaal ${newChannel.name} succesvol aangemaakt.`;
                break;
                
            case 'sendMessage':
                const { channelId, message: msgText } = actionData.additionalData;
                const targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
                if (targetChannel) {
                    await targetChannel.send(msgText);
                    actionResult = `Bericht verzonden naar ${targetChannel.name}.`;
                } else {
                    actionResult = `Kanaal met ID ${channelId} niet gevonden.`;
                }
                break;
            
            case 'createRole':
                const { roleName, roleColor = '#99AAB5' } = actionData.additionalData;
                const newRole = await message.guild.roles.create({
                    name: roleName,
                    color: roleColor,
                    reason: `Aangemaakt door ${message.author.tag} via AI Direct Action`
                });
                actionResult = `Rol ${newRole.name} succesvol aangemaakt.`;
                break;
                
            case 'deleteRole':
                const roleToDelete = await message.guild.roles.fetch(actionData.targetId).catch(() => null);
                if (roleToDelete) {
                    await roleToDelete.delete(`Verwijderd door ${message.author.tag} via AI Direct Action`);
                    actionResult = `Rol ${roleToDelete.name} succesvol verwijderd.`;
                } else {
                    actionResult = `Rol met ID ${actionData.targetId} niet gevonden.`;
                }
                break;
                
            case 'giveRole':
                const { userId, roleId } = actionData.additionalData;
                const memberForRole = await message.guild.members.fetch(userId).catch(() => null);
                const roleToGive = await message.guild.roles.fetch(roleId).catch(() => null);
                
                if (memberForRole && roleToGive) {
                    await memberForRole.roles.add(roleToGive, `Toegewezen door ${message.author.tag} via AI Direct Action`);
                    actionResult = `Rol ${roleToGive.name} succesvol toegewezen aan ${memberForRole.user.tag}.`;
                } else {
                    actionResult = `Gebruiker of rol niet gevonden.`;
                }
                break;
                
            case 'removeRole':
                const { userIdRemove, roleIdRemove } = actionData.additionalData;
                const memberForRoleRemove = await message.guild.members.fetch(userIdRemove).catch(() => null);
                const roleToRemove = await message.guild.roles.fetch(roleIdRemove).catch(() => null);
                
                if (memberForRoleRemove && roleToRemove) {
                    await memberForRoleRemove.roles.remove(roleToRemove, `Verwijderd door ${message.author.tag} via AI Direct Action`);
                    actionResult = `Rol ${roleToRemove.name} succesvol verwijderd van ${memberForRoleRemove.user.tag}.`;
                } else {
                    actionResult = `Gebruiker of rol niet gevonden.`;
                }
                break;
                
            case 'kick':
                const memberToKick = await message.guild.members.fetch(actionData.targetId).catch(() => null);
                if (memberToKick) {
                    if (memberToKick.kickable) {
                        const reason = actionData.additionalData?.reason || `Gekickt door ${message.author.tag} via AI Direct Action`;
                        await memberToKick.kick(reason);
                        actionResult = `${memberToKick.user.tag} is succesvol gekickt.`;
                    } else {
                        actionResult = `Geen toestemming om ${memberToKick.user.tag} te kicken.`;
                    }
                } else {
                    actionResult = `Gebruiker met ID ${actionData.targetId} niet gevonden.`;
                }
                break;
                
            case 'ban':
                const memberToBan = await message.guild.members.fetch(actionData.targetId).catch(() => null);
                if (memberToBan) {
                    if (memberToBan.bannable) {
                        const reason = actionData.additionalData?.reason || `Verbannen door ${message.author.tag} via AI Direct Action`;
                        const deleteDays = actionData.additionalData?.deleteDays || 0;
                        await memberToBan.ban({ deleteMessageDays: deleteDays, reason: reason });
                        actionResult = `${memberToBan.user.tag} is succesvol verbannen.`;
                    } else {
                        actionResult = `Geen toestemming om ${memberToBan.user.tag} te verbannen.`;
                    }
                } else {
                    actionResult = `Gebruiker met ID ${actionData.targetId} niet gevonden.`;
                }
                break;
                
            case 'timeout':
                const memberToTimeout = await message.guild.members.fetch(actionData.targetId).catch(() => null);
                if (memberToTimeout) {
                    if (memberToTimeout.moderatable) {
                        const reason = actionData.additionalData?.reason || `Timeout door ${message.author.tag} via AI Direct Action`;
                        const duration = actionData.additionalData?.duration || 60000; // Standaard 1 minuut in ms
                        await memberToTimeout.timeout(duration, reason);
                        actionResult = `${memberToTimeout.user.tag} heeft een timeout gekregen voor ${duration/60000} minuten.`;
                    } else {
                        actionResult = `Geen toestemming om ${memberToTimeout.user.tag} een timeout te geven.`;
                    }
                } else {
                    actionResult = `Gebruiker met ID ${actionData.targetId} niet gevonden.`;
                }
                break;
                
            default:
                actionResult = "Deze actie wordt niet ondersteund.";
                break;
        }

        // Voeg het resultaat toe aan de embed
        confirmEmbed.addFields({ name: 'Resultaat', value: actionResult });
        
        // Stuur het resultaat terug
        await message.reply({ embeds: [confirmEmbed] });
        
    } catch (error) {
        console.error('AI Direct Action Error:', error.response?.data || error.message || error);
        await message.reply('Er is iets misgegaan bij het uitvoeren van je instructie. Controleer de console voor meer details.');
    }
}); 