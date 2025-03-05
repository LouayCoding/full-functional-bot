// models/VoiceUser.js
const mongoose = require('mongoose');

const voiceUserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    totalVoiceTime: { type: Number, default: 0 }, // totale tijd in seconden
    lastJoin: { type: Date, default: null } // laatste join-tijd
});

module.exports = mongoose.model('VoiceUser', voiceUserSchema);
