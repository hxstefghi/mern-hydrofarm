const mongoose = require('mongoose');


const CommandSchema = new mongoose.Schema({
pump: { type: Number, enum: [0,1], default: 0 },
fan: { type: Number, enum: [0,1], default: 0 },
humidifier: { type: Number, enum: [0,1], default: 0 },
extra: { type: Number, enum: [0,1], default: 0 },
createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Command', CommandSchema);