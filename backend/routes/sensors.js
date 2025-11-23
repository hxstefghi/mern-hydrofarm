const express = require('express');
const router = express.Router();
const { postReading, getRecent, getYearly, getLatest, getLastN } = require('../controllers/sensorsController');
const auth = require('../middleware/auth');

// Allow devices to post readings without auth; protect recent fetch (dashboard) behind JWT
router.post('/', postReading);
// Friendly info route: GET /api/sensors -> list available endpoints
router.get('/', (req, res) => {
	res.json({
		ok: true,
		message: 'Sensor API — available endpoints',
		endpoints: [
			{ method: 'POST', path: '/api/sensors', description: 'Device POST to submit a reading' },
			{ method: 'POST', path: '/api/sensors/echo', description: 'Debug: echo parsed payload' },
			{ method: 'GET', path: '/api/sensors/recent', description: 'Sampled recent readings (bucketed)' },
			{ method: 'GET', path: '/api/sensors/latest', description: 'Single latest DB reading' },
			{ method: 'GET', path: '/api/sensors/last?n=8', description: 'Last N raw readings (chronological)' },
			{ method: 'GET', path: '/api/sensors/yearly', description: 'Monthly aggregates (requires auth)' }
		]
	});
});
// debug echo for device troubleshooting
router.post('/echo', (req, res) => {
	// mirror back parsed body and query and common field guesses
	let body = req.body;
	if (typeof body === 'string') {
		try { body = JSON.parse(body); } catch (e) { /* keep string */ }
	}
	const src = Object.assign({}, body || {}, req.query || {});
	const pick = (...keys) => { for (const k of keys) if (src[k] !== undefined) return src[k]; return undefined; };
	const sample = {
		raw: src,
		temperature: pick('temperature','temp','t'),
		humidity: pick('humidity','hum','h'),
		water_level: pick('water_level','waterLevel','water','w'),
		ph_level: pick('ph_level','ph','pH'),
	};
	res.json({ ok: true, sample });
});
// Make recent readings public so the dashboard can fetch them without a token
router.get('/recent', getRecent);
// Single latest reading (public) used by dashboard tiles
router.get('/latest', getLatest);
router.get('/last', getLastN);
// Server-Sent Events stream for realtime readings
router.get('/stream', (req, res) => {
	// Set headers for SSE
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
	});
	res.write('\n'); // heartbeat

	const onReading = (reading) => {
		try {
			const payload = JSON.stringify(reading);
			res.write(`data: ${payload}\n\n`);
		} catch (e) {
			// ignore
		}
	};

	const emitter = require('../utils/emitter');
	emitter.on('reading', onReading);

	// client disconnect handler
	req.on('close', () => {
		emitter.removeListener('reading', onReading);
	});
});
router.get('/yearly', auth, getYearly);

module.exports = router;