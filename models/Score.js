const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    userId: String,
    score: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 }
});

module.exports = mongoose.model('Score', scoreSchema);
