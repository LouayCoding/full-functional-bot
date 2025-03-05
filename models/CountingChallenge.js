const mongoose = require('mongoose');

const countingChallengeSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    type: { type: String, enum: ['daily', 'weekly'], required: true },
    targetNumber: { type: Number, required: true },
    startNumber: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
    completedDate: { type: Date },
    completedBy: { type: String },
    participants: [{ 
        userId: String, 
        username: String, 
        contributions: Number
    }]
});

// Maak een samengestelde index op guildId en type voor snellere queries
countingChallengeSchema.index({ guildId: 1, type: 1 });

module.exports = mongoose.model('CountingChallenge', countingChallengeSchema); 