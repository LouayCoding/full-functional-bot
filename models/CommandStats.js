const mongoose = require('mongoose');

/**
 * Schema voor het bijhouden van command statistieken
 */
const commandStatsSchema = new mongoose.Schema({
    commandName: { 
        type: String, 
        required: true,
        unique: true 
    },
    uses: { 
        type: Number, 
        default: 0 
    },
    lastUsed: { 
        type: Date, 
        default: Date.now 
    },
    usedBy: [{
        userId: String,
        username: String,
        usageCount: Number,
        lastUsed: Date
    }]
});

module.exports = mongoose.model('CommandStats', commandStatsSchema); 