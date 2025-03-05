const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const client = require('../index');
const Counting = require('../models/Counting');
const countingUtils = require('../utils/countingUtils');
const CountingStats = require('../models/CountingStats');

// Houd het huidige nummer bij in het geheugen
let currentNumber = 0;
let lastUserId = null;
let lastWarningUserId = null; // Nieuwe variabele om bij te houden wie als laatste een waarschuwing kreeg
let consecutiveCorrect = 0; // Houdt bij hoeveel correcte tellingen er op rij zijn gedaan

// Initialiseer de message queue voor snelle tellingen
let countingMessageQueue = [];
let isProcessingQueue = false;

// Laad de huidige status van het counting systeem
async function loadCountingStatus() {
    try {
        console.log('Counting status laden (na herstart)...');
        
        // ALTIJD eerst database raadplegen voor de meest recente status
        let countingData = await Counting.findOne({});
        
        // Als er geen data is, maak deze aan
        if (!countingData) {
            console.log('Geen counting data gevonden in database, nieuwe aanmaken...');
            countingData = new Counting({
                currentNumber: 0,
                lastUserId: null,
                lastWarningUserId: null
            });
            await countingData.save();
        } else {
            console.log(`Database counting data gevonden: nummer=${countingData.currentNumber}, lastUserId=${countingData.lastUserId}`);
        }
        
        // Laad ook de config voor vergelijking
        const configPath = path.join(__dirname, '../config.json');
        let config;
        
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(configData);
            console.log(`Config counting data: nummer=${config.counting.currentNumber}, lastUserId=${config.counting.lastUserId}`);
        } catch (error) {
            console.error('Fout bij het laden van config:', error);
            config = { counting: { currentNumber: 0, lastUserId: null } };
        }
        
        // ALTIJD de database als primaire bron gebruiken, omdat deze meer betrouwbaar is bij herstarts
        currentNumber = countingData.currentNumber || 0;
        lastUserId = countingData.lastUserId ? String(countingData.lastUserId) : null;
        
        // Bij herstart altijd lastWarningUserId resetten, dit voorkomt problemen met gebruikers die vastzitten
        lastWarningUserId = null;
        
        console.log(`Counting status geladen - nummer: ${currentNumber}, laatste gebruiker: ${lastUserId}, waarschuwingen gereset`);
        
        // Als er een verschil is tussen database en config, update de config
        if (config.counting.currentNumber !== currentNumber || 
            config.counting.lastUserId !== lastUserId) {
            console.log('Verschil tussen database en config gevonden. Config bijwerken...');
            
            config.counting.currentNumber = currentNumber;
            config.counting.lastUserId = lastUserId;
            
            // Sla de bijgewerkte config op
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            console.log('Config bijgewerkt met waardes uit database.');
        }
        
        // Maak de require cache leeg voor de config
        delete require.cache[require.resolve('../config.json')];
    } catch (error) {
        console.error('KRITIEKE FOUT bij het laden van counting status:', error);
        // Fallback naar defaults
        currentNumber = 0;
        lastUserId = null;
        lastWarningUserId = null;
        console.log('Fallback naar defaults vanwege fout.');
    }
}

// Sla de huidige status op in de database
async function saveCountingStatus() {
    try {
        console.log(`Telling status opslaan: currentNumber=${currentNumber}, lastUserId=${lastUserId}`);
        
        // Update de counting data in de database
        await Counting.findOneAndUpdate(
            {},
            { 
                currentNumber, 
                lastUserId: lastUserId !== null ? String(lastUserId) : null,
                lastWarningUserId: lastWarningUserId !== null ? String(lastWarningUserId) : null 
            },
            { upsert: true }
        );
        
        // Update ook de config file als backup
        const configPath = path.join(__dirname, '../config.json');
        
        // We lezen de file opnieuw om de laatste versie te krijgen
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Update alleen de telling status, niet de andere instellingen
        config.counting.currentNumber = currentNumber;
        config.counting.lastUserId = lastUserId;
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
        
        // Maak de require cache leeg voor het geval we de config later nog nodig hebben
        delete require.cache[require.resolve('../config.json')];
        
        return true;
    } catch (error) {
        console.error('Fout bij het opslaan van counting status:', error);
        return false;
    }
}

// Update de hoogste score als het huidige nummer hoger is
async function updateHighScore(userId, username, newHighScore) {
    // Lees de config file direct van schijf om de nieuwste versie te krijgen
    const configPath = path.join(__dirname, '../config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    if (config.counting.highestScore.enabled && newHighScore > config.counting.highestScore.value) {
        console.log(`Nieuwe hoogste score! Oud: ${config.counting.highestScore.value}, Nieuw: ${newHighScore}`);
        
        // Alleen de highScore bijwerken, niet de currentNumber
        config.counting.highestScore.value = newHighScore;
        config.counting.highestScore.userId = userId;
        config.counting.highestScore.timestamp = new Date().toISOString();
        
        // BELANGRIJK: zorg ervoor dat we de huidige telling niet wijzigen!
        // We willen alleen de highscore bijwerken
        
        // Sla de config op
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
        
        // Maak de require cache leeg zodat de nieuwe config wordt geladen bij de volgende require
        delete require.cache[require.resolve('../config.json')];
        
        // Bepaal of we een bericht moeten sturen op basis van significante mijlpalen
        // We sturen alleen een bericht bij getallen die een veelvoud zijn van 5 of 10
        // of bij mijlpalen die zijn ingesteld in de config
        const isMilestone = countingUtils.isMilestone(newHighScore, config.counting.milestones.numbers);
        const isMultipleOf = newHighScore % 10 === 0 || (newHighScore % 5 === 0 && newHighScore <= 50);
        
        // Stuur een bericht als showMessageOnRecord is ingeschakeld en het een significante mijlpaal is
        if (config.counting.highestScore.showMessageOnRecord && (isMilestone || isMultipleOf)) {
            return true;
        }
    }
    return false;
}

// Controleert of een nummer correct is volgens het huidige thema
function isCorrectAccordingToTheme(number, correctNumber, config) {
    console.log(`Controle nummer: ${number} (${typeof number}), juiste nummer: ${correctNumber} (${typeof correctNumber}), thema: ${config.counting.themes.enabled ? config.counting.themes.currentTheme : 'uitgeschakeld'}`);
    
    // Zorg ervoor dat we met nummers werken
    number = Number(number);
    correctNumber = Number(correctNumber);
    
    if (!config.counting.themes.enabled) {
        // Als themes zijn uitgeschakeld, controleer gewoon of het nummer overeenkomt met het verwachte nummer
        const result = number === correctNumber;
        console.log(`Normale modus check: ${number} === ${correctNumber}, resultaat: ${result}`);
        return result;
    }
    
    // Haal het huidige thema op
    const currentTheme = config.counting.themes.currentTheme;
    const themeData = config.counting.themes.themes[currentTheme];
    
    if (!themeData) {
        console.error(`Thema niet gevonden: ${currentTheme}`);
        return number === correctNumber;
    }
    
    try {
        let result = false;
        
        // Extra bescherming voor thema's - gebruik een veilige evaluatie
        const safeEval = (code) => {
            // Zorg ervoor dat de variabelen in scope zijn
            const localNumber = number;
            const localCorrectNumber = correctNumber;
            
            // Evalueer in een veilige context
            return eval(code);
        };
        
        // Evalueer de check functie uit de config
        result = safeEval(themeData.checkFunction);
        console.log(`Thema check functie: ${themeData.checkFunction}, resultaat: ${result}`);
        return result;
    } catch (error) {
        console.error(`Fout bij het evalueren van thema check: ${error.message}`);
        return number === correctNumber;
    }
}

// Geef een beloning voor het correct tellen
async function giveCountingReward(userId, username, number, streak) {
    const config = require('../config.json');
    
    if (!config.counting.rewards.enabled) return null;
    
    // Controleer of economy beloningen zijn ingeschakeld
    if (config.counting.rewards.economy.enabled) {
        let amount = config.counting.rewards.economy.amountPerCorrect;
        
        // Controleer of automatische berekening is ingeschakeld
        if (config.counting.rewards.economy.autoCalculation && 
            config.counting.rewards.economy.autoCalculation.enabled) {
            
            // Bereken beloningen automatisch op basis van het nummer en streak
            // Mijlpalen
            if (config.counting.milestones.enabled && 
                countingUtils.isMilestone(number, config.counting.milestones.numbers)) {
                // Automatische berekening: nummer * mijlpaal multiplier
                amount += number * config.counting.rewards.economy.autoCalculation.milestoneMultiplier;
            }
            
            // Streak beloningen
            if (config.counting.streakRewards.enabled && 
                Object.keys(config.counting.streakRewards.rewards).includes(streak.toString())) {
                // Automatische berekening: streak * streak multiplier
                amount += streak * config.counting.rewards.economy.autoCalculation.streakMultiplier;
            }
        } else {
            // Originele berekening met vaste bedragen
            // Voeg bonus toe op basis van opeenvolgende correcte tellingen
            const streakBonus = Math.min(
                streak * config.counting.rewards.economy.bonusPerConsecutive,
                config.counting.rewards.economy.maxBonusAmount
            );
            
            amount += streakBonus;
            
            // Geef een mijlpaalbonus als van toepassing
            if (config.counting.milestones.enabled && 
                countingUtils.isMilestone(number, config.counting.milestones.numbers)) {
                const milestoneReward = config.counting.milestones.rewards[number] || 0;
                amount += milestoneReward;
            }
            
            // Geef een streakbonus als van toepassing
            if (config.counting.streakRewards.enabled && 
                config.counting.streakRewards.rewards[streak]) {
                amount += config.counting.streakRewards.rewards[streak];
            }
        }
        
        // Voeg het bedrag toe aan het account van de gebruiker
        const userProfile = await countingUtils.addCurrency(userId, amount, 'counting');
        return { 
            amount: amount,
            userProfile: userProfile
        };
    }
    
    return null;
}

// Globale functies voor gebruikers-ID vergelijking
// Dit zorgt ervoor dat we altijd met strings vergelijken, ongeacht hoe ze zijn opgeslagen
function isSameUserID(id1, id2) {
    // Als beide null of undefined zijn, zijn ze gelijk
    if (!id1 && !id2) {
        console.log(`isSameUserID: Beide IDs zijn null of undefined`);
        return true;
    }
    
    // Als een van beide null of undefined is, maar de andere niet, zijn ze niet gelijk
    if (!id1 || !id2) {
        console.log(`isSameUserID: Ongelijk omdat een ID null is en de andere niet`);
        return false;
    }
    
    // Zorg ervoor dat beide ID's strings zijn voor consistente vergelijking
    const strId1 = String(id1).trim();
    const strId2 = String(id2).trim();
    
    // Log de vergelijking voor debugging
    console.log(`isSameUserID: Vergelijking van "${strId1}" met "${strId2}" - Resultaat: ${strId1 === strId2}`);
    
    return strId1 === strId2;
}

// Check of twee gebruikers dezelfde persoon zijn, controleert zowel ID als username
async function isSameUser(lastUserId, currentUserId, currentUsername) {
    // Als de IDs exact overeenkomen, zijn het dezelfde gebruikers
    if (isSameUserID(lastUserId, currentUserId)) {
        return true;
    }
    
    // Als de IDs niet overeenkomen, controleer of de gebruiker mogelijk meerdere accounts heeft
    // door de gebruikersnaam te controleren in de database
    try {
        // Haal de laatste gebruiker op uit de database op basis van ID
        const lastUserStats = await CountingStats.findOne({ userId: lastUserId });
        
        if (lastUserStats) {
            // Controleer of de gebruikersnaam of een deel ervan overeenkomt
            const lastUsername = lastUserStats.username.toLowerCase();
            const currentUsernameLower = currentUsername.toLowerCase();
            
            // Bepaal of de gebruikersnamen vergelijkbaar zijn (gebruik bevat)
            const usernameMatch = 
                lastUsername.includes(currentUsernameLower) || 
                currentUsernameLower.includes(lastUsername);
            
            console.log(`Gebruikersnaamvergelijking: "${lastUsername}" met "${currentUsernameLower}" - Match: ${usernameMatch}`);
            
            if (usernameMatch) {
                console.log(`Mogelijke meerdere accounts gedetecteerd! ${lastUsername} en ${currentUsernameLower}`);
                return true;
            }
        }
    } catch (error) {
        console.error("Fout bij controleren van gebruiker:", error);
    }
    
    return false;
}

// Emoji's voor reacties
const CORRECT_EMOJI = '✅';
const WRONG_EMOJI = '❌';
const WARNING_EMOJI = '⚠️';

// Laad direct bij het opstarten
client.once('ready', async () => {
    await loadCountingStatus();
    console.log('Counting systeem geladen!');
});

client.on('messageCreate', async (message) => {
    try {
        // Config laden - clear cache first and then reload config
        delete require.cache[require.resolve('../config.json')];
        const config = require('../config.json');
        
        if (!config.counting || !config.counting.enabled) return;
        
        // Alleen berichten in het counting kanaal verwerken
        if (message.channel.id !== config.countingChannel) return;
        
        // Bot berichten negeren
        if (message.author.bot) return;
        
        // Controleer of het bericht een nummer is
        const messageContent = message.content.trim();
        const number = parseInt(messageContent);
        
        // Als het geen geldig nummer is, negeer het bericht
        if (isNaN(number)) return;
        
        // Voeg het bericht toe aan de wachtrij en verwerk het asynchroon
        countingMessageQueue.push(message);
        console.log(`Bericht toegevoegd aan wachtrij. Huidige wachtrijlengte: ${countingMessageQueue.length}`);
        
        // Start het verwerken van de wachtrij als dat nog niet bezig is
        if (!isProcessingQueue) {
            processCountingQueue();
        }
    } catch (error) {
        console.error(`Fout bij bericht toevoegen aan wachtrij:`, error);
        try {
            if (message && message.channel) {
                await message.react('⚠️').catch(() => {});
            }
        } catch (secondaryError) {
            console.error('Kon niet reageren met waarschuwing:', secondaryError);
        }
    }
});

// Functie om berichten in queue te verwerken
async function processCountingQueue() {
    if (isProcessingQueue || countingMessageQueue.length === 0) return;
    
    try {
        isProcessingQueue = true;
        
        // Verwerk het eerste bericht in de wachtrij
        const nextMessage = countingMessageQueue.shift();
        console.log(`Verwerken van bericht uit wachtrij. Nog ${countingMessageQueue.length} in wachtrij.`);
        
        // Hier verwerken we het bericht zoals we normaal zouden doen
        await processCountingMessage(nextMessage);
        
    } catch (error) {
        console.error('Fout bij verwerken van bericht in wachtrij:', error);
    } finally {
        isProcessingQueue = false;
        
        // Als er meer berichten zijn, verwerk die dan
        if (countingMessageQueue.length > 0) {
            // Korte pauze om rate limiting te voorkomen en database tijd te geven
            setTimeout(() => processCountingQueue(), 100);
        }
    }
}

// Functie om een telling bericht volledig te verwerken
async function processCountingMessage(message) {
    try {
        // Altijd eerst de meest recente status laden uit de database
        // Dit lost problemen op met meerdere bots en server herstarts
        try {
            await loadCountingStatus();
            console.log('Telling status geladen voordat het bericht wordt verwerkt');
        } catch (loadError) {
            console.error('Fout bij laden van de status:', loadError);
            // Doorgaan met de huidige in-memory waarden als fallback
        }
        
        // Config laden - clear cache first and then reload config
        delete require.cache[require.resolve('../config.json')];
        const config = require('../config.json');
        
        if (!config.counting || !config.counting.enabled) return;
        
        // Alleen berichten in het counting kanaal verwerken
        if (message.channel.id !== config.countingChannel) return;
        
        // Bot berichten negeren
        if (message.author.bot) return;
        
        // Controleer of het bericht een nummer is
        const messageContent = message.content.trim();
        const number = parseInt(messageContent);
        
        // Als het geen geldig nummer is, negeer het bericht
        if (isNaN(number)) return;
        
        // NIEUW: Controleer op emoji's in het bericht die niet het nummer zijn
        const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
        const containsEmoji = emojiRegex.test(messageContent);
        const hasExtraText = messageContent.trim() !== number.toString();

        if (containsEmoji || hasExtraText) {
            console.log(`Potentieel verwarrend bericht gedetecteerd: ${messageContent} van ${message.author.tag}`);
            
            // Stuur een waarschuwing dat dit niet toegestaan is maar verwerk het bericht wel
            const warningEmbed = new EmbedBuilder()
                .setColor('#FFA500') // Oranje voor waarschuwing
                .setTitle('⚠️ Let op: Verwarrend Telbericht')
                .setDescription(`**${message.author.tag}** heeft extra tekst of emoji's toegevoegd aan het nummer!\n\nAlleen het nummer zonder extra tekst of emoji's is toegestaan om verwarring te voorkomen.`)
                .setFooter({
                    text: `De telling gaat wel door, maar houdt het in de toekomst schoon.`
                })
                .setTimestamp();
            
            await message.channel.send({ embeds: [warningEmbed] }).catch(console.error);
        }
        
        // Belangrijke informatie: haal de gebruiker op en controleer of deze geldig is
        const currentUserId = message.author.id; // discord user ID, altijd een string
        const username = message.author.username;
        const userTag = message.author.tag;
        
        // CRUCIALE CHECK: Als de teller nog niet geïnitialiseerd is of bij het begin van een nieuwe telling
        if (currentNumber === 0 || currentNumber === null || currentNumber === undefined) {
            console.log("Nieuwe telling start of reset gedetecteerd. Het eerste nummer moet 1 zijn.");
            
            // Als het nummer 1 is, is dat altijd goed bij een nieuwe telling
            if (number === 1) {
                console.log("Nieuwe telling start met 1. Dit is correct.");
                currentNumber = 1;
                lastUserId = String(currentUserId);
                consecutiveCorrect = 1;
                
                // Update de status in database
                try {
                    await saveCountingStatus();
                    console.log("Telling status opgeslagen na start nieuwe telling.");
                } catch (saveError) {
                    console.error('Fout bij opslaan van start nieuwe telling:', saveError);
                }
                
                // Reactie voor juist nummer
                try {
                    await message.react(config.counting.correctReaction || '✅').catch(() => {});
                } catch (reactError) {
                    console.error('Fout bij reageren op bericht:', reactError);
                }
                
                // Update statistieken
                try {
                    if (config.counting.userStats.enabled) {
                        await countingUtils.incrementCorrectCount(
                            currentUserId, 
                            message.guild.id, 
                            message.author.username, 
                            "1"
                        ).catch(err => console.error('Fout bij bijwerken correct aantal:', err));
                    }
                } catch (statsError) {
                    console.error('Fout bij bijwerken statistieken:', statsError);
                }
                
                return; // Stop verdere verwerking
            } else {
                // Als het eerste nummer niet 1 is, stuur een bericht
                console.log(`Fout bij start telling: ${number} getypt, maar 1 verwacht.`);
                
                const embed = new EmbedBuilder()
                    .setColor(config.counting.embedColor || '#FF0000')
                    .setDescription(`Bij het begin van een telling moet je met **1** starten. Je typte **${number}**.`);
                
                try {
                    await message.reply({ embeds: [embed] });
                } catch (replyError) {
                    console.error('Fout bij verzenden foutmelding:', replyError);
                }
                
                return; // Stop verdere verwerking
            }
        }
        
        // Debug logging - extreem detail voor troubleshooting
        console.log(`=== COUNTING DEBUG START ===`);
        console.log(`Bericht: "${messageContent}" (als nummer: ${number})`);
        console.log(`Huidige teller: ${currentNumber}, Verwachte volgende: ${currentNumber + 1}`);
        console.log(`Huidige gebruiker: ${username} (${currentUserId})`);
        console.log(`Vorige gebruiker ID: ${lastUserId}`);
        console.log(`Type van lastUserId: ${typeof lastUserId}, Type van currentUserId: ${typeof currentUserId}`);
        
        console.log(`Vergelijking zonder transformatie: ${lastUserId === currentUserId}`);
        console.log(`Vergelijking met isSameUserID: ${isSameUserID(lastUserId, currentUserId)}`);
        
        console.log(`=== COUNTING DEBUG END ===`);
        
        // Gebruik een mutex/lock om race conditions te voorkomen bij snelle tellingen
        
        // Bepaal displayNumber voor foutmeldingen (toon altijd als integer zonder decimalen)
        const displayNumber = number.toLocaleString('nl-NL');
        
        // Controleer of dit nummer correct is volgens het huidige thema
        console.log(`Controle nummer: ${number} (number), juiste nummer: ${currentNumber + 1} (number), thema: ${config.counting.theme || 'uitgeschakeld'}`);
        const correctTheme = isCorrectAccordingToTheme(number, currentNumber + 1, config);
        
        // Controleer of het bericht het correcte volgende nummer is
        if (number === currentNumber + 1 && correctTheme) {
            try {
                // Check of dezelfde gebruiker tweemaal telt
                const isSameUserCheck = await isSameUser(lastUserId, currentUserId, username);
                console.log(`Vergelijking van gebruikers: lastUserId=${lastUserId}, currentUserId=${currentUserId}, zijn gelijk: ${isSameUserCheck}`);
                
                if (isSameUserCheck) {
                    console.log(`Dezelfde gebruiker probeert twee keer achter elkaar te tellen. ID: ${currentUserId}`);
                    
                    // Controleer of de gebruiker al een waarschuwing heeft gekregen
                    if (lastWarningUserId && isSameUserID(lastWarningUserId, currentUserId)) {
                        console.log(`Deze gebruiker heeft al een waarschuwing gekregen en telt nog steeds opnieuw. Reset de teller.`);
                        
                        // Maak een @mention voor de gebruiker
                        const userMention = `<@${currentUserId}>`;
                        
                        // Maak een bericht voor in het kanaal
                        const doubleCountErrorMessage = `${userMention} probeerde **twee keer achter elkaar** te tellen!`;
                        
                        const embed = new EmbedBuilder()
                            .setColor(config.counting.embedColor || '#FF0000')
                            .setDescription(`Het tellen is **gereset** omdat je **twee keer achter elkaar** probeerde te tellen. Het volgende nummer is **1**.`);
                        
                        await message.channel.send({ content: doubleCountErrorMessage, embeds: [embed] });
                        
                        // Reset de teller
                        currentNumber = 0;
                        lastUserId = null;
                        lastWarningUserId = null;
                        consecutiveCorrect = 0;
                        
                        // Update statistieken
                        try {
                            if (config.counting.userStats.enabled && config.counting.userStats.trackMistakes) {
                                await countingUtils.incrementMistakeCount(
                                    currentUserId, 
                                    message.guild.id, 
                                    message.author.username, 
                                    displayNumber
                                ).catch(err => console.error('Fout bij bijwerken statistieken:', err));
                            }
                        } catch (statsError) {
                            console.error('Fout bij bijwerken statistieken:', statsError);
                        }
                        
                        // Sla de status op
                        try {
                            await saveCountingStatus();
                        } catch (saveError) {
                            console.error('Fout bij opslaan counting status:', saveError);
                        }
                    } else {
                        // Eerste waarschuwing
                        const embed = new EmbedBuilder()
                            .setColor(config.counting.embedColor || '#FFFFFF')
                            .setDescription('Je kunt **niet twee keer achter elkaar** tellen!');
                        
                        await message.reply({ embeds: [embed] });
                        
                        // Onthoud wie een waarschuwing heeft gekregen
                        lastWarningUserId = currentUserId;
                    }
                } else {
                    // De gebruiker mag tellen - Update de status
                    currentNumber = number;
                    lastUserId = String(currentUserId);  // Sla altijd op als string
                    consecutiveCorrect++;
                    
                    console.log(`Juist nummer! Huidige nummer bijgewerkt naar ${currentNumber}`);
                    
                    // Update de config file met de nieuwe currentNumber
                    try {
                        await saveCountingStatus();
                    } catch (saveError) {
                        console.error('Fout bij opslaan counting status:', saveError);
                    }
                    
                    // Optioneel: voeg een reactie toe als indicatie van succes
                    if (config.counting.addReactionOnSuccess) {
                        await message.react(config.counting.correctReaction || '✅').catch(err => console.error('Kon reactie niet toevoegen:', err));
                    }
                    
                    // Update statistieken
                    try {
                        if (config.counting.userStats.enabled) {
                            try {
                                await countingUtils.incrementCorrectCount(
                                    currentUserId, 
                                    message.guild.id, 
                                    message.author.username, 
                                    displayNumber
                                ).catch(err => console.error('Fout bij bijwerken correct aantal:', err));
                            } catch (correctError) {
                                console.error('Fout bij bijwerken correct aantal:', correctError);
                            }
                            
                            // Controleer streaks - met extra error handling
                            try {
                                if (typeof countingUtils.updateStreakCount === 'function') {
                                    await countingUtils.updateStreakCount(
                                        currentUserId, 
                                        message.guild.id, 
                                        message.author.username, 
                                        consecutiveCorrect
                                    ).catch(err => console.error('Fout bij bijwerken streak:', err));
                                } else {
                                    console.error('updateStreakCount functie bestaat niet in countingUtils');
                                }
                            } catch (streakError) {
                                console.error('Fout bij bijwerken streak:', streakError);
                            }
                        }
                    } catch (statsError) {
                        console.error('Fout bij bijwerken statistieken:', statsError);
                    }
                    
                    // Belonen voor streaks
                    try {
                        await giveCountingReward(currentUserId, message.author.username, currentNumber, consecutiveCorrect);
                    } catch (rewardError) {
                        console.error('Fout bij geven van beloningen:', rewardError);
                    }
                }
            } catch (userCheckError) {
                console.error('Fout bij controleren van gebruiker:', userCheckError);
                // Bij een fout in de gebruikerscontrole, laten we de telling doorgaan om de gebruiker niet te frustreren
                // Voeg een notitie toe in de logs
                console.log(`Telling doorgegaan ondanks fout in gebruikerscontrole. Huidige nummer: ${currentNumber}, Gebruiker: ${username}`);
                
                // Update de status als fallback om te voorkomen dat het spel vastloopt
                currentNumber = number;
                lastUserId = String(currentUserId);
                consecutiveCorrect++;
                
                // Probeer de status op te slaan
                try {
                    await saveCountingStatus();
                } catch (saveError) {
                    console.error('Fout bij opslaan counting status:', saveError);
                }
            }
        } else {
            // Onjuist nummer - Reset de teller
            console.log(`Onjuist nummer getypt: ${number}, verwacht ${currentNumber + 1}. Reset de teller.`);
            
            // Maak een bericht voor in het kanaal
            const wrongNumberMessage = `<@${currentUserId}> typte **${displayNumber}**, maar we waren bij **${currentNumber}**!`;
            
            const embed = new EmbedBuilder()
                .setColor(config.counting.embedColor || '#FF0000')
                .setDescription(`Het tellen is **gereset** omdat ${message.author.username} het verkeerde nummer heeft getypt. Het volgende nummer is **1**.`);
            
            try {
                await message.channel.send({ content: wrongNumberMessage, embeds: [embed] });
            } catch (sendError) {
                console.error('Kon geen foutmelding sturen:', sendError);
            }
            
            // Reset de teller
            const oldCurrentNumber = currentNumber;
            currentNumber = 0;
            lastUserId = null;
            lastWarningUserId = null;
            consecutiveCorrect = 0;
            
            console.log(`Telling reset: Oud nummer=${oldCurrentNumber}, Nieuw nummer=${currentNumber}, lastUserId=null`);
                
            // Update statistieken
            try {
                if (config.counting.userStats.enabled && config.counting.userStats.trackMistakes) {
                    await countingUtils.incrementMistakeCount(
                        currentUserId, 
                        message.guild.id, 
                        message.author.username, 
                        displayNumber
                    ).catch(err => console.error('Fout bij bijwerken fouten:', err));
                }
            } catch (statsError) {
                console.error('Fout bij bijwerken statistieken:', statsError);
            }
            
            // Sla de status op met expliciete nulls voor userId en warningUserId
            try {
                // Update de counting data in de database
                await Counting.findOneAndUpdate(
                    {},
                    { 
                        currentNumber: 0, 
                        lastUserId: null,
                        lastWarningUserId: null 
                    },
                    { upsert: true }
                );
                
                // Update ook de config file als backup
                const configPath = path.join(__dirname, '../config.json');
                
                // We lezen de file opnieuw om de laatste versie te krijgen
                const configData = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(configData);
                
                // Update alleen de telling status, niet de andere instellingen
                config.counting.currentNumber = 0;
                config.counting.lastUserId = null;
                
                // Sla op naar bestand
                fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                
                // Maak de require cache leeg zodat volgende keer de juiste config wordt geladen
                delete require.cache[require.resolve('../config.json')];
                
                console.log('Counting status gereset en opgeslagen in database en config file.');
            } catch (saveError) {
                console.error('Fout bij opslaan reset counting status:', saveError);
            }
            
            // Optioneel: voeg een reactie toe als indicatie van fout
            if (config.counting.addReactionOnFailure) {
                await message.react(config.counting.wrongReaction || '❌').catch(err => console.error('Kon reactie niet toevoegen:', err));
            }
        }
    } catch (error) {
        console.error('Kritieke fout bij verwerken van telling:', error);
        try {
            // Probeer om een reactie toe te voegen om aan te geven dat er iets misging
            if (message && message.channel) {
                await message.react('⚠️').catch(() => {});
                
                // Stuur een bericht naar het kanaal als er een kritieke fout is
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Fout in het telsysteem')
                    .setDescription('Er is een technisch probleem opgetreden bij het verwerken van je telling. De beheerders zijn op de hoogte gebracht. Het tellen kan gewoon doorgaan met het laatste correcte nummer.')
                    .setFooter({ text: 'De fout is gelogd voor onderzoek' });
                
                await message.channel.send({ embeds: [errorEmbed] }).catch(() => {});
            }
        } catch (secondaryError) {
            console.error('Kon niet reageren met waarschuwing:', secondaryError);
        }
    }
} 