const mongoose = require('mongoose');

const jailSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    guildID: { type: String, required: true },
    moderatorID: { type: String, required: true },
    reason: { type: String, default: "Geen reden opgegeven" },
    bailAmount: { type: Number, default: 0 }, // 0 betekent geen borgsom mogelijk
    jailedAt: { type: Date, default: Date.now },
    jailMessageID: { type: String }, // ID van het jail bericht voor updates
    originalRoles: { type: [String], default: [] } // De roles die de gebruiker had voordat ze in de gevangenis werden gezet
});

// Maak een samengestelde index op userID en guildID
jailSchema.index({ userID: 1, guildID: 1 }, { unique: true });

module.exports = mongoose.model('Jail', jailSchema); 