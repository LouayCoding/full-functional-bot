const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const client = require('..');
const { embedColor } = require('../config.json');
require('dotenv').config();

// OpenAI API key uit .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Owner ID uit .env
const OWNER_ID = process.env.OWNER_ID;

// Beperk tot de eigenaar met het specifieke ID
const ALLOWED_USER_ID = '935943312815300699';

client.on('messageCreate', async (message) => {
    // Negeer berichten van bots
    if (message.author.bot) return;

    // Controleer of het bericht van de specifiek toegestane gebruiker is
    if (message.author.id !== ALLOWED_USER_ID) return;

    // Controleer of de bot is gementioned
    if (!message.mentions.has(client.user.id)) return;

    // Extraheer de vraag van het bericht (verwijder de mention)
    let prompt = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

    // Als er geen prompt is, geef een hint
    if (!prompt) {
        return message.reply('Wat wil je dat ik voor je doe?');
    }

    // Laat de gebruiker weten dat de bot bezig is
    await message.channel.sendTyping();

    try {
        // Aanroepen van de OpenAI API
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { 
                    role: 'system', 
                    content: `Je bent een behulpzame Discord bot assistent. 
                    Je reageert op berichten van de bot eigenaar.
                    Geef duidelijke, behulpzame en beknopte antwoorden.
                    Als je een vraag krijgt over Discord server beheer, leg uit hoe dit kan worden gedaan.
                    Je kunt zelf geen directe acties uitvoeren op de server, maar je kunt uitleggen hoe dit kan worden gedaan met /aiaction.
                    Antwoord altijd in het Nederlands.`
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        let aiResponse = response.data.choices[0].message.content;
        
        // Zorg ervoor dat het antwoord niet te lang is voor Discord
        if (aiResponse.length > 2000) {
            // Als het antwoord langer is dan 2000 tekens, gebruik een embed
            const responseEmbed = new EmbedBuilder()
                .setDescription(aiResponse.substring(0, 4000))
                .setColor(embedColor)
                .setFooter({ text: 'Aangedreven door OpenAI GPT' })
                .setTimestamp();

            await message.reply({ embeds: [responseEmbed] });
        } else {
            // Als het antwoord kort genoeg is, stuur het direct als tekst
            await message.reply({ content: aiResponse, allowedMentions: { repliedUser: true } });
        }
    } catch (error) {
        console.error('AI Response Error:', error.response?.data || error.message || error);
        await message.reply('Er is iets misgegaan bij het verkrijgen van een antwoord. Probeer het later nog eens.');
    }
}); 