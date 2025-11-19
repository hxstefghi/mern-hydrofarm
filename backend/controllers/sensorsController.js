const SensorReading = require('../models/SensorReading');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const THRESHOLDS_PATH = path.join(__dirname, '..', 'config', 'model_thresholds.json');

function loadThresholds() {
	try {
		if (fs.existsSync(THRESHOLDS_PATH)) {
			const raw = fs.readFileSync(THRESHOLDS_PATH, 'utf8');
			return JSON.parse(raw);
		}
	} catch (e) {
		console.error('Failed to load thresholds:', e.message);
	}
	return null;
}

function composeAlerts(reading, thresholds) {
	const alerts = [];
	if (!reading) return alerts;

	const temp = Number(reading.temperature);
	const hum = Number(reading.humidity);
	const ph = Number(reading.ph_level);
	const water = Number(reading.water_level);

	if (thresholds && thresholds.temperature) {
		const { min, max } = thresholds.temperature;
		if (!isNaN(temp)) {
			if (temp < min) alerts.push({ metric: 'temperature', status: 'low', message: 'Temperature is below healthy range — increase warmth or move plants to a warmer area.' });
			else if (temp > max) alerts.push({ metric: 'temperature', status: 'high', message: 'Temperature is above healthy range — increase ventilation or cooling.' });
		}
	}

	if (thresholds && thresholds.humidity) {
		const { min, max } = thresholds.humidity;
		if (!isNaN(hum)) {
			if (hum < min) alerts.push({ metric: 'humidity', status: 'low', message: 'Humidity is low — consider increasing misting or humidification.' });
			else if (hum > max) alerts.push({ metric: 'humidity', status: 'high', message: 'Humidity is high — improve air circulation or reduce watering.' });
		}
	}

	if (thresholds && thresholds.ph_level) {
		const { min, max } = thresholds.ph_level;
		if (!isNaN(ph)) {
			if (ph < min) alerts.push({ metric: 'ph', status: 'low', message: 'pH is acidic below healthy range — consider buffering the solution (raise pH).' });
			else if (ph > max) alerts.push({ metric: 'ph', status: 'high', message: 'pH is alkaline above healthy range — consider lowering pH.' });
		}
	}

	// water heuristic if numeric
	if (!isNaN(water)) {
		if (water <= 20) alerts.push({ metric: 'water', status: 'low', message: 'Water level is low — refill reservoir.' });
		else if (water >= 80) alerts.push({ metric: 'water', status: 'high', message: 'Water level is high — reservoir is full.' });
	}

	return alerts;
}

async function checkAndSendAlerts(reading) {
	try {
		const thresholds = loadThresholds();
		const alerts = composeAlerts(reading, thresholds);
		if (alerts && alerts.length > 0) {
			const statuses = alerts.map(a => a.status);
			const allLow = statuses.every(s => s === 'low');
			const allHigh = statuses.every(s => s === 'high');

			if (allLow || allHigh) {
				const subj = allLow ? 'HydroFarm ALERT — Multiple sensors LOW' : 'HydroFarm ALERT — Multiple sensors HIGH';
				const body = alerts.map(a => `${a.metric.toUpperCase()}: ${a.message}`).join('\n');
				await sendEmailNotification(subj, body);
			} else {
				for (const a of alerts) {
					const subj = `HydroFarm ALERT — ${a.metric.toUpperCase()} ${a.status.toUpperCase()}`;
					const body = `${a.metric.toUpperCase()}: ${a.message}`;
					await sendEmailNotification(subj, body);
				}
			}
		}
	} catch (e) {
		console.error('Error during alert check:', e && e.message ? e.message : e);
	}
}

async function sendEmailNotification(subject, text) {
	const user = process.env.EMAIL_USER;
	const pass = process.env.EMAIL_PASS;
	const to = process.env.ALERT_EMAIL_TO || process.env.EMAIL_TO;
	if (!user || !pass || !to) {
		console.warn('Email not sent — missing EMAIL_USER, EMAIL_PASS, or ALERT_EMAIL_TO');
		return;
	}

	try {
		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user,
				pass,
			},
		});
		await transporter.sendMail({
			from: user,
			to,
			subject,
			text,
		});
		console.log('Alert email sent to', to);
	} catch (err) {
		console.error('Failed to send alert email:', err && err.message ? err.message : err);
	}
}


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

// (testBreach removed) -- testing endpoint has been deleted


exports.getRecent = async (req, res) => {
try {
const recent = await SensorReading.find().sort({ createdAt: -1 }).limit(100);
res.json(recent);
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Server error' });
}
};