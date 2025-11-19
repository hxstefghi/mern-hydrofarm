// backend/scripts/insert_dummy_api.js
// Small helper to POST a dummy sensor reading to the API so alert checks run.
// Usage: node scripts/insert_dummy_api.js

const API = process.env.API_URL || 'http://localhost:5000/api/sensors';

(async () => {
  try {
    // sample reading designed to trigger thresholds; adjust values as needed
    const payload = {
      temperature: 19.5, // low temp example
      humidity: 66,
      water_level: 67,
      ph_level: 6.7
    };

    // Node 18+ has global fetch. If your Node is older, use curl or install node-fetch.
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Failed to post dummy reading:', err);
    process.exit(1);
  }
})();
