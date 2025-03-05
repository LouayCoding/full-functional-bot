const mongoose = require('mongoose');

const countingStatsSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    username: { type: String, default: 'Onbekend' },
    correctCounts: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    highestContribution: { type: Number, default: 0 },
    ruinedAt: [Number],
    lastUpdated: { type: Date, default: Date.now }
});

// Maak een samengestelde index op guildId en userId voor snellere queries
countingStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CountingStats', countingStatsSchema); 