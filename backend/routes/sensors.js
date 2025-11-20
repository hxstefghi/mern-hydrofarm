const express = require('express');
const router = express.Router();
const { postReading, getRecent, getYearly } = require('../controllers/sensorsController');
const auth = require('../middleware/auth');

// Allow devices to post readings without auth; protect recent fetch (dashboard) behind JWT
router.post('/', postReading);
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
router.get('/recent', auth, getRecent);
router.get('/yearly', auth, getYearly);

module.exports = router;