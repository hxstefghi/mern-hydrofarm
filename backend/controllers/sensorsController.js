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
	// accept multiple possible field names and sources (body or query)
	// If client sent a raw JSON string body, try to parse it first.
	let bodyObj = req.body;
	if (typeof bodyObj === 'string') {
		try { bodyObj = JSON.parse(bodyObj); } catch (e) { /* leave as string */ }
	}

	const src = Object.assign({}, bodyObj || {}, req.query || {});
	const pick = (...keys) => {
		for (const k of keys) {
			if (src[k] !== undefined) return src[k];
		}
		return undefined;
	};

	const temperature = pick('temperature', 'temp', 't');
	const humidity = pick('humidity', 'hum', 'h');
	const water_level = pick('water_level', 'waterLevel', 'water', 'w');
	const ph_level = pick('ph_level', 'ph', 'pH');

	// coerce numeric strings to numbers where sensible
	const coerceNum = v => (v === null || v === undefined || v === '') ? null : (isNaN(Number(v)) ? v : Number(v));

	let tVal = coerceNum(temperature);
	let hVal = coerceNum(humidity);
	let wVal = coerceNum(water_level);
	let phVal = coerceNum(ph_level);

	// if any required fields are missing, try to parse them from the raw body string
	const missing = () => {
		const m = [];
		if (tVal == null) m.push('temperature');
		if (hVal == null) m.push('humidity');
		if (wVal == null) m.push('water_level');
		if (phVal == null) m.push('ph_level');
		return m;
	};

	let miss = missing();
	if (miss.length) {
		// attempt to extract numeric values from raw body (handles truncated JSON or form-encoded strings)
		const raw = (typeof bodyObj === 'string' && bodyObj) ? bodyObj : (req.rawBody || '');
		if (raw && typeof raw === 'string' && raw.length) {
			const findNumber = (names) => {
				for (const name of names) {
					// JSON style: "name":123 or name:123
					const reJson = new RegExp('"?' + name + '"?\\s*[:=]\\s*([+-]?[0-9]*\\.?[0-9]+(?:[eE][+-]?[0-9]+)?)');
					const m = raw.match(reJson);
					if (m && m[1] !== undefined) return Number(m[1]);
					// form style: name=123
					const reForm = new RegExp(name + '\\s*[=]\\s*([+-]?[0-9]*\\.?[0-9]+)');
					const m2 = raw.match(reForm);
					if (m2 && m2[1] !== undefined) return Number(m2[1]);
				}
				return null;
			};

			if (tVal == null) tVal = findNumber(['temperature','temp','t']);
			if (hVal == null) hVal = findNumber(['humidity','hum','h']);
			if (wVal == null) wVal = findNumber(['water_level','waterLevel','water','w']);
			if (phVal == null) phVal = findNumber(['ph_level','ph','pH']);
		}
		miss = missing();
	}
	if (miss.length) {
		return res.status(400).json({ error: 'Missing or invalid fields', missing: miss });
	}

	const reading = new SensorReading({ temperature: tVal, humidity: hVal, water_level: wVal, ph_level: phVal });
	await reading.save();

	// trigger alert check in background (don't block the request)
	checkAndSendAlerts(reading).catch(e => console.error('Background alert check failed:', e && e.message ? e.message : e));

	return res.status(201).json({ success: true, reading });
} catch (err) {
console.error(err);
return res.status(500).json({ error: 'Server error' });
}
};

// (testBreach removed) -- testing endpoint has been deleted


exports.getRecent = async (req, res) => {
try {
		// Allow client to request sampled points: intervalSeconds (default 10), points (default 8)
		const intervalSeconds = parseInt(req.query.intervalSeconds || '10', 10) || 10;
		const points = parseInt(req.query.points || '8', 10) || 8;

		// Compute window: from now - (interval * points) to now
		const now = Date.now();
		const windowStart = new Date(now - intervalSeconds * points * 1000);

		// Fetch readings within the window (a reasonable cap)
		const raw = await SensorReading.find({ createdAt: { $gte: windowStart } }).sort({ createdAt: 1 }).limit(1000);

		if (!raw || raw.length === 0) return res.json([]);

		// Bucket readings into intervalSeconds bins and pick the latest reading in each bin
		const buckets = new Map();
		for (const r of raw) {
			const ts = new Date(r.createdAt).getTime();
			const idx = Math.floor((ts - windowStart.getTime()) / (intervalSeconds * 1000));
			if (idx < 0 || idx >= points) continue;
			// keep the latest reading for the bucket
			const existing = buckets.get(idx);
			if (!existing || new Date(existing.createdAt).getTime() < ts) buckets.set(idx, r);
		}

		// Build result array in chronological order (old -> new)
		const result = [];
		for (let i = 0; i < points; i++) {
			if (buckets.has(i)) result.push(buckets.get(i));
			else result.push(null);
		}

		return res.json(result);
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Server error' });
}
};

// GET /api/sensors/yearly - returns monthly aggregates (average) for last 12 months
exports.getYearly = async (req, res) => {
	try {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		start.setMonth(start.getMonth() - 11); // 12 months window

		const agg = await SensorReading.aggregate([
			{ $match: { createdAt: { $gte: start } } },
			{ $group: {
				_id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
				avgTemp: { $avg: '$temperature' },
				avgHum: { $avg: '$humidity' },
				avgPh: { $avg: '$ph_level' }
			} },
			{ $project: { _id: 0, year: '$_id.year', month: '$_id.month', avgTemp: 1, avgHum: 1, avgPh: 1 } },
			{ $sort: { year: 1, month: 1 } }
		]).allowDiskUse(true);

		// Build monthly array from start to now
		const months = [];
		const map = new Map();
		for (const r of agg) {
			map.set(`${r.year}-${r.month}`, r);
		}

		for (let i = 0; i < 12; i++) {
			const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
			const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
			const row = map.get(key);
			months.push({
				year: d.getFullYear(),
				month: d.getMonth() + 1,
				label: d.toLocaleString('default', { month: 'short' }),
				avgTemp: row ? Number(row.avgTemp.toFixed(2)) : null,
				avgHum: row ? Number(row.avgHum.toFixed(2)) : null,
				avgPh: row ? Number(row.avgPh.toFixed(2)) : null,
			});
		}

		res.json(months);
	} catch (err) {
		console.error('getYearly error', err);
		res.status(500).json({ error: 'Server error' });
	}
};