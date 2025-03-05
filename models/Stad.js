const mongoose = require('mongoose');

const stadSchema = new mongoose.Schema({
    userId: String,
    stad: String
});

module.exports = mongoose.model('Stad', stadSchema); 