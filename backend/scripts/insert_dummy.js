// backend/scripts/insert_dummy.js
require('dotenv').config();
const connectDB = require('../config/db');
const SensorReading = require('../models/SensorReading');

(async () => {
  await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/hydrofarm');
  const r = new SensorReading({
    temperature: 35.2,
    humidity: 67,
    water_level: 60,
    ph_level: 7.9
  });
  await r.save();
  console.log('Inserted:', r);
  process.exit(0);
})();