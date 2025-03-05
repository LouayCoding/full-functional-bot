const { EmbedBuilder } = require('discord.js');
const Score = require('../models/Score');
const Counting = require('../models/Counting');

const countingChannelId = '1301021381902733374';

async function handleCountingMessage(message) {
    if (message.channel.id !== countingChannelId || message.author.bot) return;

    // Controleer of de inhoud van het bericht een geldig cijfer is
    const userNumber = parseInt(message.content);
    if (isNaN(userNumber)) return; // Geef geen reactie als het geen cijfer is

    // Haal de huidige telling op uit de database of maak een nieuwe aan
    let countingData = await Counting.findOne({});
    if (!countingData) {
        countingData = new Counting();
        await countingData.save();
    }

    const userScore = await Score.findOne({ userId: message.author.id }) || new Score({ userId: message.author.id });

    // Controleer of dezelfde gebruiker twee keer achter elkaar telt
    if (message.author.id === countingData.lastUserId) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('+1')
            .setDescription(`**@${message.author.username} VERPESTTE HET BIJ ${userNumber}!** De telling is nu gereset naar 1.\nJe mag niet twee keer achter elkaar tellen.`);
        await message.channel.send({ embeds: [embed] });

        // Reset de score en update de database
        userScore.score = 1;
        countingData.currentNumber = 1;  // Reset telling
        countingData.lastUserId = null;  // Reset laatste gebruiker
        await userScore.save();
        await countingData.save();

        await message.react('❌');
        return;
    }

    // Controleer of het ingevoerde nummer correct is
    if (userNumber !== countingData.currentNumber) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('+1')
            .setDescription(`**@${message.author.username} VERPESTTE HET BIJ ${userNumber}!** De telling is nu gereset naar 1.\nJe hebt het verkeerde nummer ingevoerd.`);
        await message.channel.send({ embeds: [embed] });

        // Reset de score en update de database
        userScore.score = 1;
        countingData.currentNumber = 1;  // Reset telling
        countingData.lastUserId = null;  // Reset laatste gebruiker
        await userScore.save();
        await countingData.save();

        await message.react('❌');
        return;
    }

    // Verhoog de score en update de streak als het nummer correct is
    userScore.score += 1;
    userScore.highestStreak = Math.max(userScore.highestStreak, userScore.score);
    await userScore.save();

    // Update de telling en de laatste gebruiker in de database
    countingData.currentNumber += 1;
    countingData.lastUserId = message.author.id;
    await countingData.save();

    // Reageer met een checkmark voor correcte telling
    await message.react('✅');
}

module.exports = { handleCountingMessage };
