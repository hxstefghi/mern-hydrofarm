const SensorReading = require('../models/SensorReading');


exports.postReading = async (req, res) => {
try {
const { temperature, humidity, water_level, ph_level } = req.body;
if (temperature == null || humidity == null || water_level == null || ph_level == null) {
return res.status(400).json({ error: 'Missing fields' });
}


const reading = new SensorReading({ temperature, humidity, water_level, ph_level });
await reading.save();
return res.status(201).json({ success: true, reading });
} catch (err) {
console.error(err);
return res.status(500).json({ error: 'Server error' });
}
};


exports.getRecent = async (req, res) => {
try {
const recent = await SensorReading.find().sort({ createdAt: -1 }).limit(100);
res.json(recent);
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Server error' });
}
};