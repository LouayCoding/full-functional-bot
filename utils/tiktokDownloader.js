const path = require('path');
const config = require('../config.json');
const axios = require('axios');

// Functie die TikTok video's downloadt met een API
async function downloadTikTokWithApi(url) {
    try {
        console.log('Downloaden van TikTok video met API...');
        
        // API URL voor TikTok download zonder watermerk
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        
        // Request naar de API
        const response = await axios.get(apiUrl);
        
        if (response.data && response.data.data && response.data.data.play) {
            // Download de video
            const videoUrl = response.data.data.play;
            const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
            
            // Geef de video terug als buffer
            return {
                buffer: Buffer.from(videoResponse.data),
                originalUrl: url,
                authorName: response.data.data.author && response.data.data.author.nickname ? response.data.data.author.nickname : 'TikTok gebruiker'
            };
        } else {
            throw new Error('Kon geen video-URL uit de API-response halen');
        }
    } catch (error) {
        console.error('Fout bij gebruik van API voor TikTok download:', error);
        throw new Error('Kon de TikTok video niet downloaden via de API. Probeer een andere URL.');
    }
}

// Functie voor het downloaden van TikTok video's
async function get_tiktok_data(url) {
    try {
        // Probeer eerst met de API methode
        return await downloadTikTokWithApi(url);
    } catch (error) {
        console.error('Fout bij TikTok download met API, proberen met fallback...', error);
        
        // Als alternatief, probeer een andere publieke API als fallback
        try {
            // Een andere API URL als fallback
            const fallbackApiUrl = `https://api.tiktok-video.org/public/api/convert?url=${encodeURIComponent(url)}`;
            
            const response = await axios.get(fallbackApiUrl);
            
            if (response.data && response.data.data && response.data.data.watermark_removed_url) {
                const videoUrl = response.data.data.watermark_removed_url;
                const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
                
                return {
                    buffer: Buffer.from(videoResponse.data),
                    originalUrl: url,
                    authorName: 'TikTok gebruiker' // Fallback API geeft geen auteursnaam
                };
            } else {
                throw new Error('Kon geen video-URL uit de fallback API-response halen');
            }
        } catch (fallbackError) {
            console.error('Fallback API mislukt:', fallbackError);
            throw new Error('Kon de TikTok video niet downloaden. Alle methoden mislukt.');
        }
    }
}

function is_too_large_attachment(guild, stream) {
    const filesizeLimit = {
        default: 25 * 1024 * 1024 - 1000,
        tier2: 50 * 1024 * 1024 - 1000,
        tier3: 100 * 1024 * 1024 - 1000
    };

    let limit = filesizeLimit.default;
    if (guild) {
        switch (guild.premiumTier) {
            case 2:
                limit = filesizeLimit.tier2;
                break;
            case 3:
                limit = filesizeLimit.tier3;
                break;
        }
    }
    return stream.buffer.length >= limit;
}

module.exports = { 
    get_tiktok_data, 
    is_too_large_attachment
};

