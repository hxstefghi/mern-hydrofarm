// backend/scripts/insert_dummy.js
require('dotenv').config();
const connectDB = require('../config/db');
const SensorReading = require('../models/SensorReading');

(async () => {
  await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/hydrofarm');
  const r = new SensorReading({
    temperature: 24.5,
    humidity: 55,
    water_level: 60,
    ph_level: 6.1
  });
  await r.save();
  console.log('Inserted:', r);
  process.exit(0);
})();