const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { embedColor } = require('../../config.json');
require('dotenv').config(); // Laad .env variabelen

// OpenAI API key uit .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

module.exports = {
    name: 'gpt',
    description: "Stel een vraag aan GPT (OpenAI model)",
    type: ApplicationCommandType.ChatInput,
    cooldown: 10000,
    options: [
        {
            name: 'vraag',
            description: 'De vraag die je aan GPT wilt stellen',
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'model',
            description: 'Welk GPT model wil je gebruiken?',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: 'GPT-3.5 Turbo (standaard)', value: 'gpt-3.5-turbo' },
                { name: 'GPT-4o', value: 'gpt-4o' },
                { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' }
            ]
        }
    ],
    run: async (client, interaction) => {
        await interaction.deferReply(); // Laat de gebruiker weten dat de bot bezig is

        try {
            const prompt = interaction.options.getString('vraag');
            const model = interaction.options.getString('model') || 'gpt-3.5-turbo';
            
            if (!prompt) {
                return interaction.editReply('Je moet een vraag stellen!');
            }

            // Stuur een loading bericht
            const loadingEmbed = new EmbedBuilder()
                .setDescription('⌛ Ik denk na over je vraag...')
                .setColor(embedColor);
            
            // Rechtstreeks OpenAI API aanroepen
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model,
                messages: [
                    { role: 'system', content: 'Je bent een behulpzame assistent die duidelijke en beknopte antwoorden geeft in het Nederlands.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                timeout: 60000 // 60 seconden timeout
            });

            let aiResponse = response.data.choices[0].message.content;
            
            // Zorg ervoor dat het antwoord niet te lang is voor Discord
            if (aiResponse.length > 4000) {
                aiResponse = aiResponse.substring(0, 4000) + '... (antwoord afgekapt omdat het te lang was)';
            }

            // Maak een embed voor het antwoord
            const responseEmbed = new EmbedBuilder()
                .setAuthor({ name: `Vraag van ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTitle(`OpenAI ${model} Antwoord`)
                .setDescription(aiResponse)
                .setColor(embedColor)
                .setFooter({ text: `Aangedreven door OpenAI ${model}` })
                .setTimestamp();

            // Stuur het antwoord terug naar Discord
            await interaction.editReply({ embeds: [responseEmbed] });
        } catch (error) {
            console.error('GPT Command Error:', error.response?.data || error.message || error);
            await interaction.editReply('Er is iets misgegaan bij het ophalen van een antwoord van OpenAI GPT. Controleer de console voor meer details.');
        }
    }
}; 