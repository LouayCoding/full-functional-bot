const mongoose = require('mongoose');
const UserProfile = require('../models/UserProfile');
const CountingStats = require('../models/CountingStats');
const CountingChallenge = require('../models/CountingChallenge');

/**
 * Controleert of een getal in de Fibonacci-reeks zit
 * @param {Number} number Het getal om te controleren
 * @returns {Boolean} True als het getal in de Fibonacci-reeks zit
 */
function isFibonacci(number) {
    // Perfect squares voor de formule 5n^2 + 4 of 5n^2 - 4
    const isPerfectSquare = (n) => {
        const sqrt = Math.sqrt(n);
        return sqrt === Math.floor(sqrt);
    };
    
    // Een getal is Fibonacci als en alleen als een van deze waar is:
    // 5n^2 + 4 is een perfect kwadraat OF 5n^2 - 4 is een perfect kwadraat
    return isPerfectSquare(5 * number * number + 4) || isPerfectSquare(5 * number * number - 4);
}

/**
 * Voegt valuta toe aan het account van een gebruiker
 * @param {String} userId De ID van de gebruiker
 * @param {Number} amount De hoeveelheid valuta om toe te voegen
 * @param {String} reason De reden voor de toevoeging
 * @returns {Promise<Object>} Het bijgewerkte gebruikersprofiel
 */
async function addCurrency(userId, amount, reason = 'counting') {
    try {
        // Haal het gebruikersprofiel op of maak een nieuw profiel aan als het niet bestaat
        let userProfile = await UserProfile.findOne({ userId });
        
        if (!userProfile) {
            userProfile = new UserProfile({
                userId,
                balance: 0,
                lastDaily: null,
                inventory: []
            });
        }
        
        // Voeg het bedrag toe aan het saldo
        userProfile.balance += amount;
        
        // Voeg een transactie toe als het model dat ondersteunt
        if (userProfile.transactions) {
            userProfile.transactions.push({
                amount,
                type: 'add',
                reason,
                timestamp: new Date()
            });
        }
        
        // Sla het profiel op
        await userProfile.save();
        
        return userProfile;
    } catch (error) {
        console.error('Fout bij toevoegen van valuta:', error);
        return null;
    }
}

/**
 * Telt het correcte aantal bij voor een gebruiker
 * @param {String} userId De ID van de gebruiker
 * @param {String} guildId De ID van de server
 * @param {String} username De gebruikersnaam
 * @param {Number} number Het getelde getal
 * @returns {Promise<Object>} De bijgewerkte statistieken
 */
async function incrementCorrectCount(userId, guildId, username, number) {
    try {
        // Haal de statistieken op of maak nieuwe statistieken aan als ze niet bestaan
        let stats = await CountingStats.findOne({ userId, guildId });
        
        if (!stats) {
            stats = new CountingStats({
                userId,
                guildId,
                username,
                correctCounts: 0,
                mistakes: 0,
                highestStreak: 0,
                currentStreak: 0,
                highestContribution: 0,
                ruinedAt: []
            });
        }
        
        // Update de statistieken
        stats.correctCounts += 1;
        stats.currentStreak += 1;
        stats.username = username; // Update de naam voor het geval deze is gewijzigd
        stats.lastUpdated = new Date();
        
        // Update hoogste streak als de huidige groter is
        if (stats.currentStreak > stats.highestStreak) {
            stats.highestStreak = stats.currentStreak;
        }
        
        // Update hoogste bijdrage als het huidige nummer groter is
        if (number > stats.highestContribution) {
            stats.highestContribution = number;
        }
        
        // Sla de statistieken op
        await stats.save();
        
        return stats;
    } catch (error) {
        console.error('Fout bij verhogen van correct aantal:', error);
        return null;
    }
}

/**
 * Telt het aantal fouten bij voor een gebruiker
 * @param {String} userId De ID van de gebruiker
 * @param {String} guildId De ID van de server
 * @param {String} username De gebruikersnaam
 * @param {Number} ruinedAt Het getal waarbij de fout werd gemaakt
 * @returns {Promise<Object>} De bijgewerkte statistieken
 */
async function incrementMistakeCount(userId, guildId, username, ruinedAt) {
    try {
        // Haal de statistieken op of maak nieuwe statistieken aan als ze niet bestaan
        let stats = await CountingStats.findOne({ userId, guildId });
        
        if (!stats) {
            stats = new CountingStats({
                userId,
                guildId,
                username,
                correctCounts: 0,
                mistakes: 0,
                highestStreak: 0,
                currentStreak: 0,
                highestContribution: 0,
                ruinedAt: []
            });
        }
        
        // Update de statistieken
        stats.mistakes += 1;
        stats.currentStreak = 0; // Reset streak bij een fout
        stats.username = username; // Update de naam voor het geval deze is gewijzigd
        stats.lastUpdated = new Date();
        
        // Voeg het getal toe aan de lijst van fouten
        stats.ruinedAt.push(ruinedAt);
        
        // Sla de statistieken op
        await stats.save();
        
        return stats;
    } catch (error) {
        console.error('Fout bij verhogen van aantal fouten:', error);
        return null;
    }
}

/**
 * Controleert of een nummer een mijlpaal is
 * @param {Number} number Het nummer om te controleren
 * @param {Array} milestones De lijst met mijlpalen
 * @returns {Boolean} True als het nummer een mijlpaal is
 */
function isMilestone(number, milestones) {
    return milestones.includes(number);
}

/**
 * Update de huidige uitdaging met een nieuwe bijdrage
 * @param {String} userId De ID van de gebruiker
 * @param {String} guildId De ID van de server
 * @param {String} username De gebruikersnaam
 * @param {String} type Het type uitdaging ('daily' of 'weekly')
 * @returns {Promise<Object>} De bijgewerkte uitdaging
 */
async function updateChallenge(userId, guildId, username, type = 'daily') {
    try {
        // Haal de huidige uitdaging op
        let challenge = await CountingChallenge.findOne({ 
            guildId, 
            type, 
            isCompleted: false,
            endDate: { $gt: new Date() } // Alleen actieve uitdagingen
        });
        
        if (!challenge) {
            return null; // Geen actieve uitdaging
        }
        
        // Zoek de deelnemer
        let participant = challenge.participants.find(p => p.userId === userId);
        
        if (!participant) {
            // Voeg een nieuwe deelnemer toe
            challenge.participants.push({
                userId,
                username,
                contributions: 1
            });
        } else {
            // Update de bestaande deelnemer
            participant.contributions += 1;
            participant.username = username; // Update de naam voor het geval deze is gewijzigd
        }
        
        // Sla de uitdaging op
        await challenge.save();
        
        return challenge;
    } catch (error) {
        console.error('Fout bij updaten van uitdaging:', error);
        return null;
    }
}

/**
 * Update de huidige streak van een gebruiker
 * @param {String} userId De ID van de gebruiker
 * @param {String} guildId De ID van de server 
 * @param {String} username De gebruikersnaam
 * @param {Number} currentStreak De huidige streak
 * @returns {Promise<Object>} De bijgewerkte statistieken
 */
async function updateStreakCount(userId, guildId, username, currentStreak) {
    try {
        // Haal de statistieken op of maak nieuwe statistieken aan als ze niet bestaan
        let stats = await CountingStats.findOne({ userId, guildId });
        
        if (!stats) {
            stats = new CountingStats({
                userId,
                guildId,
                username,
                correctCounts: 0,
                mistakes: 0,
                highestStreak: 0,
                currentStreak: 0,
                highestContribution: 0,
                ruinedAt: []
            });
        }
        
        // Update de streak
        stats.currentStreak = currentStreak;
        stats.username = username; // Update de naam voor het geval deze is gewijzigd
        stats.lastUpdated = new Date();
        
        // Update hoogste streak als de huidige groter is
        if (stats.currentStreak > stats.highestStreak) {
            stats.highestStreak = stats.currentStreak;
        }
        
        // Sla de statistieken op
        await stats.save();
        
        return stats;
    } catch (error) {
        console.error('Fout bij bijwerken van streak:', error);
        return null;
    }
}

module.exports = {
    isFibonacci,
    addCurrency,
    incrementCorrectCount,
    incrementMistakeCount,
    isMilestone,
    updateChallenge,
    updateStreakCount
}; 