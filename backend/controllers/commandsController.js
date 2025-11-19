const Command = require('../models/Command');


// Add a new command (from React UI)
exports.createCommand = async (req, res) => {
try {
const { pump, fan, humidifier, extra } = req.body;
const cmd = new Command({ pump, fan, humidifier, extra });
await cmd.save();
res.status(201).json({ success: true, cmd });
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Server error' });
}
};


// Return the most recent command (ESP polls this)
exports.getLatestCommand = async (req, res) => {
try {
const latest = await Command.findOne().sort({ createdAt: -1 });
if (!latest) return res.json({ pump:0, fan:0, humidifier:0, extra:0 });
res.json(latest);
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Server error' });
}
};