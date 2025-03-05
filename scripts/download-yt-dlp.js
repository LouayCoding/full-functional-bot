const https = require('https');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const binDir = path.join(process.cwd(), 'bin');
const ytDlpFile = path.join(binDir, 'yt-dlp.exe');

// Maak de bin map als deze nog niet bestaat
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
    console.log('Bin map aangemaakt.');
}

console.log('Bezig met downloaden van yt-dlp.exe...');

async function downloadFile() {
    try {
        // Gebruik fetch om het bestand te downloaden (Node.js 18+ vereist)
        const response = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', {
            method: 'GET',
            redirect: 'follow',
        });

        if (!response.ok) {
            throw new Error(`Download mislukt met status: ${response.status}`);
        }

        // Schrijf de gedownloade data naar een bestand
        const fileStream = fs.createWriteStream(ytDlpFile);
        const body = await response.arrayBuffer();
        fileStream.write(Buffer.from(body));
        fileStream.end();

        console.log(`yt-dlp.exe succesvol gedownload naar ${ytDlpFile}`);
        console.log(`Bestandsgrootte: ${Buffer.from(body).length} bytes`);

        // Maak het bestand uitvoerbaar
        fs.chmodSync(ytDlpFile, 0o755);
    } catch (error) {
        console.error('Fout bij downloaden:', error.message);
        if (fs.existsSync(ytDlpFile)) {
            fs.unlinkSync(ytDlpFile);
        }
    }
}

downloadFile(); 