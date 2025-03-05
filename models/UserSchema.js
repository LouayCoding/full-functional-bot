const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Discord-gebruikers-ID
    playerTag: { type: String, required: true }, // Brawl Stars spelerstag
    verificationStatus: { type: Boolean, default: false }, // Verificatiestatus
    lastVerified: { type: Date, default: null }, // Laatste verificatie tijdstip
});

module.exports = mongoose.model('User', userSchema);