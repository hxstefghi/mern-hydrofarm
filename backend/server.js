require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');


const sensorsRoutes = require('./routes/sensors');
const commandsRoutes = require('./routes/commands');
const modelRoutes = require('./routes/model');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');


const app = express();
const PORT = process.env.PORT || 5000;


connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/hydrofarm');


app.use(morgan('dev'));
// capture raw body for diagnostic/fallback when JSON is malformed from devices
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf && buf.toString(); } }));
app.use(express.urlencoded({ extended: true }));

// Explicit CORS configuration so preflight requests are handled predictably
const corsOptions = {
	origin: process.env.CORS_ORIGIN || '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
	optionsSuccessStatus: 204,
};
app.use((req, res, next) => {
	if (req.method === 'OPTIONS') {
		// Small debug log to help track preflight requests in Render logs
		console.log('CORS preflight for', req.originalUrl, 'headers:', Object.keys(req.headers).join(', '));
	}
	next();
});
app.use(cors(corsOptions));
// Ensure OPTIONS is handled for all routes
app.options('*', cors(corsOptions));

// fallback error handler for malformed JSON bodies: allow request to continue
// with raw text available at req.rawBody. This prevents express.json from
// terminating the request with a 400 when devices send truncated JSON.
app.use((err, req, res, next) => {
	if (err && err.type === 'entity.parse.failed') {
		// treat as non-fatal; keep raw body string for controllers to handle
		req.body = req.rawBody || req.body;
		return next();
	}
	return next(err);
});


// Register routes with a safety wrapper to catch malformed paths which
// can trigger path-to-regexp errors during startup (useful when deploying).
function safeUse(path, handler) {
	try {
		app.use(path, handler);
		console.log('Mounted route:', path);
	} catch (err) {
		console.error('Failed to mount route', path, err && err.stack ? err.stack : err);
		// Re-throw so the process still fails loudly in production if needed.
		throw err;
	}
}

safeUse('/api/sensors', sensorsRoutes);
safeUse('/api/commands', commandsRoutes);
safeUse('/api/model', modelRoutes);
safeUse('/api/auth', authRoutes);
safeUse('/api/users', usersRoutes);


app.get('/', (req, res) => res.send('Hydrofarm API running'));

// Debug: list registered routes (temporary)
app.get('/__routes', (req, res) => {
	try {
		const routes = [];
		app._router.stack.forEach((middleware) => {
			if (middleware.route) {
				// routes registered directly on the app
				const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
				routes.push({ path: middleware.route.path, methods });
			} else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
				// router middleware
				middleware.handle.stack.forEach((handler) => {
					if (handler.route) {
						const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
						routes.push({ path: handler.route.path, methods });
					}
				});
			}
		});
		res.json({ routes });
	} catch (e) {
		res.status(500).json({ error: 'Failed to enumerate routes' });
	}
});


app.listen(PORT, () => console.log(`Server started on port ${PORT}`));