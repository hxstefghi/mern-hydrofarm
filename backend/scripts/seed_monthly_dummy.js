// backend/scripts/seed_monthly_dummy.js
// Insert one dummy SensorReading per month for the current year.
// Usage: MONGO_URI="mongodb://..." node scripts/seed_monthly_dummy.js

const fetch = global.fetch || require('node-fetch');

const API_URL = process.env.API_URL || process.env.API || 'http://localhost:5000/api/sensors';

const randBetween = (min, max, decimals = 2) => {
  const v = Math.random() * (max - min) + min;
  return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const run = async () => {
  const year = parseInt(process.env.SEED_YEAR || new Date().getFullYear(), 10);
  console.log(`Seeding monthly dummy readings via API: ${API_URL} for year ${year}`);

  for (let m = 0; m < 12; m++) {
    const dt = new Date(Date.UTC(year, m, 15, 12, 0, 0));
    const payload = {
      temperature: randBetween(20, 28, 1),
      humidity: randBetween(50, 75, 1),
      water_level: Math.round(randBetween(50, 85, 0)),
      ph_level: randBetween(6.0, 7.0, 2),
      createdAt: dt.toISOString(),
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log(`[${m + 1}/12] ${dt.toISOString()} -> ${res.status} ${res.statusText}`);
      if (res.status >= 400) console.log('Response:', text);
    } catch (err) {
      console.error(`[${m + 1}/12] Failed to POST for ${dt.toISOString()}:`, err && err.message ? err.message : err);
    }
    // small delay to avoid overwhelming server
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Seeding complete.');
  process.exit(0);
};

run();
