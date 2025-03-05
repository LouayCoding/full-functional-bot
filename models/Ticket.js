// models/Ticket.js
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    userId: String,
    channelId: String,
    status: { type: String, default: 'open' }, // status: 'open' of 'closed'
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', TicketSchema);
