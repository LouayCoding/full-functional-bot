require('dotenv').config(); // Laad .env variabelen

const express = require('express');
const axios = require('axios'); // Gebruik axios voor HTTP-requests

const app = express();
const port = 3000;

// OpenAI API key uit environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json());

// Endpoint voor GPT (OpenAI)
app.post('/api/gpt', async (req, res) => {
  try {
    const { prompt, model = 'gpt-3.5-turbo' } = req.body;

    // Valideer de input
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Ongeldige prompt' });
    }

    // Aanroepen van de OpenAI API
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
      }
    });

    // Verzend het antwoord terug naar de client
    res.json({ 
      response: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: model
    });
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message || error);
    res.status(500).json({ 
      error: 'Fout bij het aanroepen van de OpenAI API', 
      details: error.response?.data?.error || error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'OpenAI API Server is running',
    version: '1.0.0'
  });
});

app.listen(port, () => {
  console.log(`OpenAI GPT API Server draait op http://localhost:${port}`);
  console.log('Beschikbare endpoints:');
  console.log('- POST /api/gpt - Voor vragen aan OpenAI GPT modellen');
  console.log('- GET /health - Voor server status check');
}); 