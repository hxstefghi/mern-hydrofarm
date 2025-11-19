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
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));


app.use('/api/sensors', sensorsRoutes);
app.use('/api/commands', commandsRoutes);
app.use('/api/model', modelRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);


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