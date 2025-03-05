const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('Blacklist', blacklistSchema);
