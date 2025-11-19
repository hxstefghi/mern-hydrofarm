const mongoose = require('mongoose');


const SensorReadingSchema = new mongoose.Schema({
temperature: { type: Number, required: true },
humidity: { type: Number, required: true },
water_level: { type: Number, required: true },
ph_level: { type: Number, required: true },
createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('SensorReading', SensorReadingSchema);