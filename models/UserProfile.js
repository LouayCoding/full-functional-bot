// models/UserProfile.js
const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    backgroundUrl: { type: String, default: 'https://example.com/default-background.png' } // Standaard achtergrond
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
