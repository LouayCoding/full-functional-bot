const mongoose = require('mongoose');

const landSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    emoji: { type: String, required: true },
    roleId: { type: String, required: true },
    special: { type: Boolean, default: false },
    message: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Land', landSchema); 