const https = require('https');
const fs = require('fs');
const path = require('path');

// Paden
const binDir = path.join(process.cwd(), 'bin');
const ytDlpPath = path.join(binDir, 'yt-dlp.exe');

// URL voor yt-dlp
const ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

// Maak de bin directory aan als deze nog niet bestaat
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
    console.log('Bin directory aangemaakt.');
}

console.log('Bezig met downloaden van yt-dlp.exe...');

// Download het bestand
const file = fs.createWriteStream(ytDlpPath);
https.get(ytDlpUrl, (response) => {
    if (response.statusCode !== 200) {
        console.error(`Download mislukt. Status code: ${response.statusCode}`);
        fs.unlinkSync(ytDlpPath); // Verwijder het gedeeltelijk gedownloade bestand
        return;
    }

    response.pipe(file);

    file.on('finish', () => {
        file.close();
        fs.chmodSync(ytDlpPath, 0o755); // Maak het bestand uitvoerbaar
        console.log('yt-dlp.exe succesvol gedownload en geïnstalleerd in bin/');
    });
}).on('error', (err) => {
    fs.unlinkSync(ytDlpPath); // Verwijder het gedeeltelijk gedownloade bestand
    console.error(`Download error: ${err.message}`);
}); 