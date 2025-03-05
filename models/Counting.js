const mongoose = require('mongoose');

const countingSchema = new mongoose.Schema({
    currentNumber: { type: Number, default: 1 },
    lastUserId: { type: String, default: null },
    lastWarningUserId: { type: String, default: null }
});

module.exports = mongoose.model('Counting', countingSchema);
