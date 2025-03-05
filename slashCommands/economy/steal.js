const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const { checkChannel } = require('../../utils/channelCheck');
const mongoose = require('mongoose');

// Cooldown in milliseconden (5 minuten = 5 * 60 * 1000)
const COOLDOWN = 5 * 60 * 1000;

// Cooldown schema voor MongoDB
const cooldownSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    command: { type: String, required: true },
    lastUsed: { type: Date, required: true }
});

const Cooldown = mongoose.model('Cooldown', cooldownSchema);

// Lijst met leuke teksten voor succesvolle diefstallen
const succesVerhalen = [
    "Je hebt succesvol een plofkraak uitgevoerd op de pinautomaat die {doelwit} net had gebruikt en bent er vandoor gegaan met €{bedrag}!",
    "Je hebt {doelwit} afgeleid met een nepbericht over een gewonnen prijs en ondertussen €{bedrag} uit hun portemonnee gepikt!",
    "Met een geniaal hackerplan heb je toegang gekregen tot {doelwit}'s bankrekening en €{bedrag} overgemaakt naar je eigen rekening!",
    "Terwijl {doelwit} naar TikTok-filmpjes keek, heb je handig €{bedrag} uit hun achterzak weten te vissen!",
    "Als de nieuwe 'bankmedewerker' heb je {doelwit} overtuigd om €{bedrag} over te maken voor een 'veiligheidscontrole'!",
    "Met een perfect uitgevoerde afleidingsmanoeuvre en een snelle hand heb je €{bedrag} uit {doelwit}'s kassalade gestolen!",
    "Verkleed als pizzabezorger heb je {doelwit} voor €{bedrag} opgelicht met een niet-bestaande bestelling!",
    "Door je voor te doen als beroemde influencer heb je {doelwit} €{bedrag} afhandig gemaakt voor een 'exclusieve samenwerking'!",
    "Je hebt {doelwit}'s pincode afgekeken en later €{bedrag} opgenomen voordat ze het doorhadden!",
    "Met een uitgekiend piramidespel heb je {doelwit} overgehaald om €{bedrag} te 'investeren' in je nieuwe cryptomunt: ScamCoin!"
];

// Lijst met leuke teksten voor mislukte diefstallen
const betraptVerhalen = [
    "Tijdens een poging tot plofkraak ging het alarm af en werd je door de beveiliging in de kraag gevat. Je betaalt €{boete} boete!",
    "Je probeerde {doelwit}'s telefoon te hacken, maar je bent zo slecht in programmeren dat je per ongeluk je eigen bankgegevens lekte. Oeps! €{boete} kwijt aan beveiligingskosten!",
    "Terwijl je {doelwit}'s portemonnee probeerde te stelen, gleed je uit over een bananenschil en viel je recht in de armen van een politieagent. De boete: €{boete}!",
    "Je werd betrapt toen je probeerde {doelwit}'s spaarvarken te stelen - wie heeft er tegenwoordig nog een spaarvarken? Je betaalt €{boete} boete voor je ouderwetse diefstalpoging!",
    "Je wilde inbreken bij {doelwit}, maar je viel in slaap tijdens het wachten. Ze vonden je snurkend voor de deur. De rechter had geen medelijden: €{boete} boete!",
    "Je hebt je verkleed als superheld om onherkenbaar te zijn tijdens je diefstal, maar iedereen herkende je direct. Nu ben je €{boete} kwijt en een lokale meme geworden!",
    "Tijdens het hacken van {doelwit}'s computer ging je eigen antivirusprogramma af, waardoor iedereen gewaarschuwd werd. Je betaalt €{boete} aan reparatiekosten!",
    "Je probeerde {doelwit} op te lichten via een phishing mail, maar stuurde het per ongeluk naar de cybercrime-afdeling van de politie. De boete: €{boete}!",
    "Bij een poging tot zakkenrollen bij {doelwit} bleek je doelwit een undercover agent te zijn. Dat wordt €{boete} boete en eeuwige schaamte!",
    "Terwijl je {doelwit}'s kluis probeerde te kraken, ging per ongeluk het brandalarm af. De brandweer én politie kwamen langs en jij krijgt een boete van €{boete}!"
];

module.exports = {
    name: 'steal',
    description: 'Steel euro van een andere gebruiker in de economie-module.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'gebruiker',
            description: 'De gebruiker van wie je wilt stelen.',
            type: 6, // Type 6 is voor gebruikers
            required: true
        }
    ],
    run: async (client, interaction) => {
        try {
        // Controleer of het commando in het juiste kanaal wordt gebruikt
        const economyChannelId = process.env.ECONOMY_CHANNEL_ID;
        if (!(await checkChannel(interaction, economyChannelId))) {
            return; // Als niet in het juiste kanaal, stop de uitvoering
        }

            // Controleer of de economy module correct is geladen
            if (!client.eco) {
                console.error('Economy module is niet correct geladen!');
                return interaction.reply({
                    content: 'Het economiesysteem is momenteel niet beschikbaar. Neem contact op met de botbeheerder.',
                    ephemeral: true
                });
            }
            
            const doelwit = interaction.options.getUser('gebruiker');
            const dader = interaction.user;

            // Controleer of de gebruiker niet probeert van zichzelf te stelen
            if (doelwit.id === dader.id) {
                return interaction.reply({
                    content: 'Je kunt niet van jezelf stelen!',
                    ephemeral: true
                });
            }

            // Cooldown controle
            const cooldown = await Cooldown.findOne({ userID: dader.id, command: 'steal' });
            const huidigeTijd = Date.now();

            if (cooldown) {
                const tijdVerschil = huidigeTijd - cooldown.lastUsed.getTime();
                if (tijdVerschil < COOLDOWN) {
                    const resterendeTijd = Math.ceil((COOLDOWN - tijdVerschil) / (60 * 1000));
                    return interaction.reply({
                        content: `Je moet nog **${resterendeTijd} minuten** wachten voordat je deze command weer kunt gebruiken.`,
                        ephemeral: true
                    });
                }
            }

            // Haal de gebruikers op uit de economie
            let daderGebruiker = await client.eco.users.get(dader.id, interaction.guild.id);

            // Controleer of de dader correct is opgehaald
            if (!daderGebruiker) {
                console.error('Dader kon niet worden opgehaald uit de economie cache.');
                return interaction.reply({
                    content: 'Je profiel kon niet worden geladen. Probeer het later opnieuw.',
                    ephemeral: true
                });
            }

            let doelwitGebruiker = await client.eco.users.get(doelwit.id, interaction.guild.id);

            // Controleer of het doelwit correct is opgehaald
            if (!doelwitGebruiker) {
                console.error('Doelwit kon niet worden opgehaald uit de economie cache.');
                return interaction.reply({
                    content: `${doelwit.username}'s profiel kon niet worden geladen. Probeer het later opnieuw of kies een ander doelwit.`,
                    ephemeral: true
                });
            }

            const doelwitBalance = await doelwitGebruiker.balance.get();

            // Controleer of het doelwit genoeg geld heeft om te stelen
            if (doelwitBalance <= 0) {
                return interaction.reply({
                    content: `${dader}, ${doelwit.username} heeft geen geld om van te stelen.`,
                    ephemeral: true
                });
            }

            // Update of maak nieuwe cooldown
            await Cooldown.findOneAndUpdate(
                { userID: dader.id, command: 'steal' },
                { lastUsed: huidigeTijd },
                { upsert: true, new: true }
            );

            // Bepaal kans om te slagen of te falen (50% succes)
            const kans = Math.random();
            const geslaagd = kans < 0.5;

            if (geslaagd) {
                // Bepaal hoeveel geld wordt gestolen (10%-50% van het doelwit zijn saldo)
                const teStelenBedrag = Math.floor((Math.random() * 0.4 + 0.1) * doelwitBalance);

                // Werk de balans bij voor beide gebruikers
                await doelwitGebruiker.balance.subtract(teStelenBedrag, `Bestolen door ${dader.username}`);
                await daderGebruiker.balance.add(teStelenBedrag, `Gestolen van ${doelwit.username}`);

                // Kies een willekeurig succesverhaal
                const randomSuccesIndex = Math.floor(Math.random() * succesVerhalen.length);
                let succesTekst = succesVerhalen[randomSuccesIndex]
                    .replace('{doelwit}', `**${doelwit.username}**`)
                    .replace('{bedrag}', `**${teStelenBedrag}**`);

                // Stuur een succesbericht
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${dader.username} heeft gestolen!`, iconURL: dader.displayAvatarURL() })
                    .setDescription(succesTekst)
                    .setColor('#0C2F56')
                    .setFooter({ text: 'Criminelen hebben ook geld nodig...' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            } else {
                // Diefstal mislukt, boete voor de dader (10% van dader zijn balans)
                const daderBalance = await daderGebruiker.balance.get();
                const boete = Math.floor(daderBalance * 0.1);

                await daderGebruiker.balance.subtract(boete, `Betrapt bij poging tot stelen van ${doelwit.username}`);

                // Kies een willekeurig betraptverhaal
                const randomBetraptIndex = Math.floor(Math.random() * betraptVerhalen.length);
                let betraptTekst = betraptVerhalen[randomBetraptIndex]
                    .replace('{doelwit}', `**${doelwit.username}**`)
                    .replace('{boete}', `**${boete}**`);

                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${dader.username} is betrapt!`, iconURL: dader.displayAvatarURL() })
                    .setDescription(betraptTekst)
                    .setColor('#FF0000')
                    .setFooter({ text: 'Misdaad loont niet... meestal!' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Er is een fout opgetreden bij het uitvoeren van de steal commando:', error);
            return interaction.reply({
                content: 'Er is een fout opgetreden bij het uitvoeren van deze commando. Probeer het later opnieuw of neem contact op met de botbeheerder.',
                ephemeral: true
            });
        }
    }
};
