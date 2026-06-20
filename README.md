# MERN HydroFarm — Capstone Documentation

**Developed by:** Christian Catuday

---

## Table of Contents

1. [Introduction (Explanation)](#1-introduction-explanation)
   - Project Overview
   - System Architecture
   - Technologies Used
2. [Tutorial: Getting Started](#2-tutorial-getting-started)
   - Prerequisites
   - Installation & Setup
   - First Run & Login
3. [How-to Guides](#3-how-to-guides)
   - Monitor Sensor Data in Real-Time
   - Train the ML Model
   - Manage User Accounts
   - Deploy to Production
4. [Reference](#4-reference)
   - API Reference
   - Database Schemas
   - Frontend Components
   - Environment Variables
   - ML Pipeline
5. [Architecture & Design (Explanation)](#5-architecture--design-explanation)
   - Data Flow
   - Authentication & Authorization
   - Real-Time Streaming (SSE)
   - Alert System
   - Deployment Architecture

---

## 1. Introduction (Explanation)

### Project Overview

MERN HydroFarm is a full-stack hydroponic farming monitoring system that collects real-time sensor data (temperature, humidity, water level, pH) from ESP32-based IoT devices and displays it on a React dashboard. The system includes:

- **Live monitoring** via Server-Sent Events (SSE) and polling
- **Machine learning** for plant health prediction using scikit-learn (Logistic Regression)
- **Alert notifications** via email when sensor readings fall outside healthy thresholds
- **User management** with role-based access (admin/user)
- **Device command queue** for remote pump, fan, and humidifier control
- **Historical data** with bucketed recent charts and yearly aggregates

### System Architecture

```
┌──────────────┐     POST /api/sensors     ┌──────────────┐     ┌──────────────┐
│   ESP32 /    │ ──────────────────────────▶│  Express.js  │────▶│   MongoDB    │
│   IoT Device │                            │   Backend    │     │   (Atlas)    │
│              │◀───────────────────────────│   (Render)   │◀────│              │
└──────────────┘     GET /api/commands      └──────┬───────┘     └──────────────┘
                                                   │
                                          SSE /api/sensors/stream
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │   React +    │
                                            │  Vite Front  │
                                            │   (Browser)  │
                                            └──────────────┘
```

- **ESP32 devices** POST sensor readings (no auth required) and poll for commands
- **Express.js backend** saves readings, emits SSE events, triggers alert checks
- **MongoDB Atlas** stores sensor readings, user accounts, device commands, and ML thresholds
- **React frontend** displays live data, charts, user management, and ML training UI
- **Python ML script** is spawned by the backend on demand for training

### Technologies Used

| Layer                 | Technology                    | Version  |
| --------------------- | ----------------------------- | -------- |
| Backend Runtime       | Node.js                       | —        |
| Web Framework         | Express.js                    | ^5.2.1   |
| Database              | MongoDB (Atlas)               | —        |
| ODM                   | Mongoose                      | ^8.20.2  |
| Auth                  | JSON Web Token (jsonwebtoken) | ^9.0.3   |
| Password Hashing      | bcryptjs                      | ^2.4.3   |
| File Upload           | multer                        | ^2.0.2   |
| Email Alerts          | nodemailer                    | ^6.9.3   |
| Frontend              | React                         | ^19.2.0  |
| Build Tool            | Vite                          | ^7.2.2   |
| Styling               | Tailwind CSS                  | ^4.1.17  |
| Charts                | Recharts                      | ^3.4.1   |
| Icons                 | Lucide React                  | ^0.554.0 |
| HTTP Client           | Axios                         | ^1.13.2  |
| ML Framework (Python) | scikit-learn                  | —        |
| Model Serialization   | joblib                        | —        |

---

## 2. Tutorial: Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- **MongoDB** — either a local instance or a cloud Atlas URI
- **Python 3.8+** (only needed for ML training)
- Required Python packages: `pandas`, `scikit-learn`, `joblib`

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd mern-hydrofarm
```

#### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<database>
JWT_SECRET=your-secret-key-change-in-production
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
ALERT_EMAIL_TO=alerts@example.com
PORT=5000
```

Seed the database with default users:

```bash
npm run seed
```

This creates:

- **Admin:** `admin@example.com` / `adminpassword`
- **User:** `user@example.com` / `userpassword`

Start the backend:

```bash
npm run dev    # development (with nodemon)
# or
npm start      # production
```

#### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts at `http://localhost:5173`. In development, API calls to `/api/*` are proxied to the backend (configured in `vite.config.js`).

#### 4. Verify Installation

1. Visit `http://localhost:5173`
2. You should see the Login page
3. Log in with `user@example.com` / `userpassword`
4. The Dashboard loads (may show empty tiles until sensor data is available)

### Seed Sample Data

To populate the database with 12 months of dummy sensor readings:

```bash
cd backend
node scripts/seed_monthly_dummy.js
```

### First Run & Login

1. Open the app in your browser at `http://localhost:5173`
2. Enter credentials: `admin@example.com` / `adminpassword`
3. The **Dashboard** appears with metric tiles (Temperature, Humidity, pH)
4. Click **Train Model** in the sidebar to upload a CSV and train the ML model
5. Click **Yearly Overview** to see 12-month aggregate charts
6. Click **User Management** to add/edit/delete users (admin only)

---

## 3. How-to Guides

### How to Monitor Sensor Data in Real-Time

The dashboard uses two mechanisms to display live data:

1. **Server-Sent Events (SSE):** The browser connects to `GET /api/sensors/stream`. Whenever a device posts a new reading, the server pushes it immediately via SSE.

2. **Polling fallback:** The dashboard fetches `GET /api/sensors/latest` every 10 seconds and `GET /api/sensors/recent` every 15 seconds. This ensures data is displayed even if the SSE connection drops.

The dashboard maintains a history buffer of 7 data points in `sessionStorage` (`hf_history`) for the line charts. Threshold reference lines (red dashed) appear if the ML model has been trained.

**To view real-time data:**

1. Log in and navigate to **Dashboard**
2. Observe the three metric tiles (Temperature, Humidity, pH) update automatically
3. Line charts below show the recent trend with threshold boundaries
4. Recommendation cards summarize whether each metric is within healthy range

### How to Train the ML Model

The ML pipeline uses a Python scikit-learn script to train a Logistic Regression model on plant health data.

**Prepare your CSV file:**

The CSV must have these exact columns:

```csv
temperature,humidity,ph_level,health_status
25.0,65.0,6.5,healthy
32.0,45.0,8.2,unhealthy
19.0,55.0,5.5,unhealthy
```

- `health_status` must contain the string `"healthy"` for healthy samples (case-insensitive)
- At least one healthy and one unhealthy sample are required
- The training script derives safe thresholds from healthy samples

**Steps:**

1. Navigate to **Train Model** in the sidebar
2. Click **Choose file** and select your `.csv` file
3. Click **Upload CSV**
4. The backend spawns `python train_model.py --csv <uploaded-file>`
5. On success:
   - The model is saved to `backend/models/trained_model.joblib`
   - Healthy thresholds are written to `backend/config/model_thresholds.json`
   - Thresholds are also saved to the MongoDB `modelthresholds` collection
   - The uploaded CSV is merged into `backend/uploads/training_data.csv`
6. The dashboard will now display threshold reference lines on charts

**Training via backend directly:**

```bash
cd backend
python train_model.py --csv uploads/pechay_conditions.csv
```

### How to Manage User Accounts

Only users with the `admin` role can manage accounts.

**Add a new user:**

1. Navigate to **User Management** in the sidebar
2. Click **Add User**
3. Fill in Email, Password, and select a Role (`User` or `Admin`)
4. Click **Create**

**Edit a user:**

1. In the user list, click **Edit** on the desired user
2. Modify Email, Role, and/or Password
3. Click **Save**

**Delete a user:**

1. Click **Delete** on the desired user
2. Confirm the action in the dialog
3. You cannot delete your own account (admin self-deletion is blocked)

**Note:** Registration is intentionally disabled on the login page. New users are created exclusively by admins.

### How to Deploy to Production

#### Backend (Render)

1. Push your code to a Git repository
2. On [Render](https://render.com), create a new **Web Service**
3. Connect your repository
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Set environment variables:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — a strong random string
   - `EMAIL_USER`, `EMAIL_PASS`, `ALERT_EMAIL_TO` — for email alerts
6. Deploy. The backend will be available at `https://your-app.onrender.com`

#### Frontend (Vite build)

1. In `frontend/vite.config.js`, update the proxy target to your production backend URL
2. Alternatively, set `VITE_API_URL` to your backend URL at build time
3. Build the frontend:

```bash
cd frontend
npm run build
```

4. Deploy the `dist/` folder to any static host (Render Static Site, Netlify, Vercel)

---

## 4. Reference

### API Reference

All endpoints are prefixed with `/api`.

#### Authentication

| Method | Endpoint         | Auth | Description                            |
| ------ | ---------------- | ---- | -------------------------------------- |
| `POST` | `/auth/register` | None | Register a new user                    |
| `POST` | `/auth/login`    | None | Login. Returns JWT token (7d expiry)   |
| `GET`  | `/auth/me`       | JWT  | Get current authenticated user profile |

**POST `/auth/login`**

Request body:

```json
{ "email": "admin@example.com", "password": "adminpassword" }
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "admin@example.com" }
}
```

#### Sensor Readings

| Method | Endpoint                                      | Auth | Description                           |
| ------ | --------------------------------------------- | ---- | ------------------------------------- |
| `POST` | `/sensors`                                    | None | Submit a sensor reading from a device |
| `GET`  | `/sensors/echo`                               | None | Debug: echo parsed payload            |
| `GET`  | `/sensors/recent?points=8&intervalSeconds=10` | None | Bucketed recent readings              |
| `GET`  | `/sensors/latest`                             | None | Single most recent reading            |
| `GET`  | `/sensors/last?n=8`                           | None | Last N raw readings (max 100)         |
| `GET`  | `/sensors/stream`                             | None | SSE real-time event stream            |
| `GET`  | `/sensors/yearly`                             | JWT  | 12-month monthly average aggregates   |

**POST `/sensors`**

A device can send readings via JSON body, query params, or form-encoded data. The controller accepts flexible field names:

| Standard      | Aliases                    |
| ------------- | -------------------------- |
| `temperature` | `temp`, `t`                |
| `humidity`    | `hum`, `h`                 |
| `water_level` | `waterLevel`, `water`, `w` |
| `ph_level`    | `ph`, `pH`                 |
| `createdAt`   | `timestamp`, `ts`, `time`  |

Request body example:

```json
{
  "temperature": 25.3,
  "humidity": 68.0,
  "water_level": 45.0,
  "ph_level": 6.5
}
```

Response (201):

```json
{
  "success": true,
  "reading": {
    "_id": "...",
    "temperature": 25.3,
    "humidity": 68.0,
    "water_level": 45.0,
    "ph_level": 6.5,
    "createdAt": "..."
  }
}
```

#### Device Commands

| Method | Endpoint           | Auth | Description                 |
| ------ | ------------------ | ---- | --------------------------- |
| `POST` | `/commands`        | None | Create a device command     |
| `GET`  | `/commands/latest` | None | Get the most recent command |

**POST `/commands`**

```json
{ "pump": 1, "fan": 0, "humidifier": 1, "extra": 0 }
```

All fields are optional, enum: `0` or `1`.

**GET `/commands/latest`**

Response: Returns the most recent command document, or `{ pump: 0, fan: 0, humidifier: 0, extra: 0 }` if none exist.

#### ML Model

| Method | Endpoint            | Auth          | Description                                 |
| ------ | ------------------- | ------------- | ------------------------------------------- |
| `GET`  | `/model/thresholds` | None          | Get active healthy thresholds               |
| `POST` | `/model/upload`     | None (multer) | Upload a CSV file (stored only)             |
| `POST` | `/model/train`      | None (multer) | Upload CSV, run Python training, merge data |

**GET `/model/thresholds`**

Response:

```json
{
  "temperature": { "min": 20.0, "max": 28.0 },
  "humidity": { "min": 60.0, "max": 75.0 },
  "ph_level": { "min": 6.0, "max": 6.9 },
  "model_accuracy": 1.0
}
```

**POST `/model/train`**

Accepts multipart form with field `file` (`.csv`, max 10MB). Returns thresholds on success.

#### User Management

All endpoints require JWT + admin role.

| Method   | Endpoint     | Description                         |
| -------- | ------------ | ----------------------------------- |
| `GET`    | `/users`     | List all users (passwords excluded) |
| `POST`   | `/users`     | Create a new user                   |
| `GET`    | `/users/:id` | Get user by ID                      |
| `PUT`    | `/users/:id` | Update user (email, password, role) |
| `DELETE` | `/users/:id` | Delete user (cannot delete self)    |

**POST `/users`**

```json
{ "email": "newuser@example.com", "password": "securepass", "role": "user" }
```

#### Debug Routes

| Method | Endpoint    | Description                     |
| ------ | ----------- | ------------------------------- |
| `GET`  | `/`         | Root: "Hydrofarm API running"   |
| `GET`  | `/__routes` | Enumerate all registered routes |

### Database Schemas

#### `users`

```json
{
  "_id": "ObjectId",
  "email": "String (unique, lowercase, trimmed)",
  "password": "String (bcrypt hashed)",
  "role": "String ('user' | 'admin')",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

#### `sensorreadings`

```json
{
  "_id": "ObjectId",
  "temperature": "Number (required)",
  "humidity": "Number (required)",
  "water_level": "Number (required)",
  "ph_level": "Number (required)",
  "createdAt": "Date (default: now)"
}
```

#### `commands`

```json
{
  "_id": "ObjectId",
  "pump": "Number (0 or 1)",
  "fan": "Number (0 or 1)",
  "humidifier": "Number (0 or 1)",
  "extra": "Number (0 or 1)",
  "createdAt": "Date (default: now)"
}
```

#### `modelthresholds`

```json
{
  "_id": "ObjectId",
  "temperature": { "min": "Number", "max": "Number" },
  "humidity": { "min": "Number", "max": "Number" },
  "ph_level": { "min": "Number", "max": "Number" },
  "model_accuracy": "Number",
  "trained_at": "Date (default: now)",
  "active": "Boolean (default: true)"
}
```

### Frontend Components

| Component        | File                                | Description                                                                             |
| ---------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| `App`            | `src/App.jsx`                       | Root — manages auth token, page routing, renders Sidebar + content                      |
| `Login`          | `src/components/Login.jsx`          | Email/password form with show/hide toggle, stores JWT in localStorage                   |
| `Sidebar`        | `src/components/Sidebar.jsx`        | Desktop sticky sidebar + mobile slide-out drawer with hamburger                         |
| `Dashboard`      | `src/components/Dashboard.jsx`      | Main live view — 3 metric tiles, recommendation cards, 3 line charts, threshold display |
| `TrainModel`     | `src/components/TrainModel.jsx`     | CSV file upload + training trigger with toast notifications                             |
| `Yearly`         | `src/components/Yearly.jsx`         | Single Recharts LineChart showing 12-month monthly averages                             |
| `UserManagement` | `src/components/UserManagement.jsx` | Admin CRUD — table (desktop), cards (mobile), inline editing, add user form             |
| `ControlPanel`   | `src/components/ControlPanel.jsx`   | (Deprecated) Manual pump/fan controls — no longer wired to the app                      |

**Dashboard state management:**

- `history` (7 points) stored in `sessionStorage` key `hf_history`
- SSE stream connection auto-closes on component unmount
- Polling intervals: `latest` every 10s, `recent` every 15s

### Environment Variables

| Variable         | Default                               | Required      | Used In                      |
| ---------------- | ------------------------------------- | ------------- | ---------------------------- |
| `MONGO_URI`      | `mongodb://localhost:27017/hydrofarm` | Yes           | `config/db.js`               |
| `PORT`           | `5000`                                | No            | `server.js`                  |
| `JWT_SECRET`     | `'change-me-in-production'`           | Yes           | Auth middleware & controller |
| `CORS_ORIGIN`    | `'*'`                                 | No            | CORS configuration           |
| `EMAIL_USER`     | —                                     | For alerts    | Gmail SMTP username          |
| `EMAIL_PASS`     | —                                     | For alerts    | Gmail app password           |
| `ALERT_EMAIL_TO` | —                                     | For alerts    | Recipient of alert emails    |
| `VITE_API_URL`   | `''` (same-origin)                    | No (frontend) | Axios base URL               |

### ML Pipeline

**Training script:** `backend/train_model.py`

**Input CSV format:**

```csv
temperature,humidity,ph_level,health_status
25.0,65.0,6.5,healthy
32.0,45.0,8.2,unhealthy
```

**Pipeline steps:**

1. Drop rows with missing values
2. Normalize `health_status`: `"healthy"` → 1, anything else → 0
3. Require at least 2 distinct labels (healthy + unhealthy)
4. Split 85/15 train/test
5. Pipeline: `StandardScaler` → `LogisticRegression(max_iter=1000)`
6. Save model to `backend/models/trained_model.joblib`
7. Derive healthy thresholds from rows labeled `healthy` (min/max per metric)
8. Write thresholds to `backend/config/model_thresholds.json`

**Output artifacts:**

- `backend/models/trained_model.joblib` — serialized sklearn pipeline
- `backend/config/model_thresholds.json` — JSON thresholds with accuracy

**Default thresholds (from sample training data):**

| Metric      | Min    | Max    |
| ----------- | ------ | ------ |
| Temperature | 20.0°C | 28.0°C |
| Humidity    | 60.0%  | 75.0%  |
| pH Level    | 6.0    | 6.9    |

### Project Scripts

#### Backend (`backend/package.json`)

| Script  | Command                      | Description                   |
| ------- | ---------------------------- | ----------------------------- |
| `start` | `node server.js`             | Production start              |
| `dev`   | `nodemon server.js`          | Development with auto-restart |
| `seed`  | `node scripts/seed_users.js` | Seed admin + user accounts    |

#### Frontend (`frontend/package.json`)

| Script    | Command        | Description                 |
| --------- | -------------- | --------------------------- |
| `dev`     | `vite`         | Development server          |
| `build`   | `vite build`   | Production build to `dist/` |
| `preview` | `vite preview` | Preview production build    |
| `lint`    | `eslint .`     | Run ESLint                  |

#### Database Seeding Scripts

| Script                  | Location           | Description                                     |
| ----------------------- | ------------------ | ----------------------------------------------- |
| `seed_users.js`         | `backend/scripts/` | Create default admin and user accounts          |
| `seed_monthly_dummy.js` | `backend/scripts/` | Seed 12 months of dummy sensor data             |
| `insert_dummy.js`       | `backend/scripts/` | Insert single dummy reading directly to MongoDB |
| `insert_dummy_api.js`   | `backend/scripts/` | POST a single dummy reading via the API         |

---

## 5. Architecture & Design (Explanation)

### Data Flow

#### Sensor Ingestion (Device → Database)

1. An ESP32 (or any IoT device) collects temperature, humidity, water level, and pH readings
2. The device sends a `POST /api/sensors` request with the data as JSON (or query params)
3. The `sensorsController.postReading` handler accepts flexible field names (e.g., `temp` or `temperature`), validates required fields, and saves to MongoDB
4. If the request body is malformed JSON, the server falls back to regex extraction from the raw body string — this prevents device firmware bugs from causing 400 errors
5. After saving, the controller emits a `reading` event via the Node.js `EventEmitter`
6. In the background (non-blocking), `checkAndSendAlerts` compares readings against thresholds and sends email alerts if values are out of range

#### Real-Time Distribution (Server → Dashboard)

Two parallel mechanisms ensure the dashboard stays up to date:

- **SSE push:** The `GET /api/sensors/stream` endpoint keeps an open HTTP connection. When a `reading` event is emitted, the server writes `data: <json>\n\n` to the response stream. The browser's `EventSource` API receives these messages and updates the UI immediately.

- **Polling fallback:** The dashboard also polls `GET /api/sensors/latest` every 10 seconds and `GET /api/sensors/recent` every 15 seconds. The `recent` endpoint buckets readings into time intervals (default: 8 buckets at 10s intervals) to provide evenly-spaced chart data.

#### Command Polling (Device → Server)

1. The ESP32 periodically sends `GET /api/commands/latest`
2. The server returns the most recent `Command` document (or all-zero defaults)
3. The device acts on the command by turning pump/fan/humidifier relays on or off

### Authentication & Authorization

**Authentication** is JWT-based:

- Login sends `{ email, password }` → server validates with bcrypt → returns a JWT signed with `JWT_SECRET` and a 7-day expiry
- The frontend stores the token in `localStorage` as `hf_token`
- Every authenticated request includes `Authorization: Bearer <token>`

**Authorization** uses two layers:

1. The `auth` middleware (in `middleware/auth.js`) verifies the JWT and attaches the user document to `req.user`
2. The `usersController` uses a `requireAdmin()` helper that checks `req.user.role === 'admin'`

**Access control by route:**

| Area                            | Authentication | Admin Required |
| ------------------------------- | -------------- | -------------- |
| Sensor posting                  | No             | No             |
| Command creation                | No             | No             |
| Model training                  | No             | No             |
| Threshold retrieval             | No             | No             |
| Dashboard data (recent, latest) | No             | No             |
| Yearly overview                 | Yes (any role) | No             |
| User management                 | Yes            | Yes            |

### Real-Time Streaming (SSE)

The SSE implementation uses Node.js's built-in `EventEmitter`:

1. `backend/utils/emitter.js` exports a singleton `EventEmitter`
2. `sensorsController.postReading` emits `emitter.emit('reading', reading)` after saving a reading
3. `routes/sensors.js` route `GET /stream` sets SSE headers (`Content-Type: text/event-stream`), listens for `reading` events, and writes them to the response
4. When the client disconnects, the `close` event handler removes the listener

This approach is lightweight and works perfectly for a single-server deployment. For horizontal scaling, this would need to be replaced with Redis Pub/Sub or a message queue.

### Alert System

The alert system is triggered after every sensor reading is saved:

1. `loadThresholds()` reads `backend/config/model_thresholds.json`
2. `composeAlerts()` compares each metric against its min/max threshold
3. If all alerts are `low` or all are `high`, a single consolidated email is sent
4. Otherwise, individual emails are sent per out-of-range metric
5. Email is sent via Gmail SMTP using `nodemailer`

**Water level heuristic** (not from ML model):

- Water ≤ 20 → Low alert ("refill reservoir")
- Water ≥ 80 → High alert ("reservoir is full")

### Deployment Architecture

**Current deployment** is on Render:

- Backend runs as a Web Service on Render
- Frontend is built with Vite (`npm run build`) and served as a static site
- The Vite dev proxy forwards `/api` requests to the production backend

**File uploads in production:**

- Multer uses `os.tmpdir()` for uploaded files (works on Render, Heroku, etc.)
- On success, files are deleted after processing
- Training data is persisted in `backend/uploads/training_data.csv` only on local deployments

**Environment-specific behavior:**

- Dev: Vite proxy at `http://localhost:5173/api` → backend on `http://localhost:5000`
- Production: Frontend built as static files, API calls go to the same domain or are configured via `VITE_API_URL`

### Project File Structure

```
mern-hydrofarm/
├── backend/
│   ├── .env                          # Environment variables
│   ├── server.js                     # Express app entry point
│   ├── package.json                  # Dependencies & scripts
│   ├── train_model.py                # Python ML training script
│   ├── README_TRAIN.md               # ML training instructions
│   ├── config/
│   │   ├── db.js                     # MongoDB connection
│   │   └── model_thresholds.json     # ML threshold values
│   ├── controllers/
│   │   ├── authController.js         # Register, login, me
│   │   ├── commandsController.js     # Create & get latest commands
│   │   ├── modelController.js        # Thresholds, CSV upload, training
│   │   ├── sensorsController.js      # Sensor CRUD, alerts, SSE events
│   │   └── usersController.js        # Admin user CRUD
│   ├── middleware/
│   │   └── auth.js                   # JWT verification middleware
│   ├── models/
│   │   ├── Command.js                # Device command schema
│   │   ├── ModelThreshold.js         # ML threshold schema
│   │   ├── SensorReading.js          # Sensor reading schema
│   │   ├── User.js                   # User account schema
│   │   └── trained_model.joblib      # Serialized sklearn model
│   ├── routes/
│   │   ├── auth.js                   # Auth routes
│   │   ├── commands.js               # Command routes
│   │   ├── model.js                  # Model routes with multer
│   │   ├── sensors.js                # Sensor routes + SSE stream
│   │   └── users.js                  # User management routes
│   ├── scripts/
│   │   ├── insert_dummy.js           # Insert dummy reading to DB
│   │   ├── insert_dummy_api.js       # POST dummy reading via API
│   │   ├── seed_monthly_dummy.js     # Seed 12 months of data
│   │   └── seed_users.js             # Seed default accounts
│   ├── uploads/
│   │   ├── pechay_conditions.csv     # Sample pechay training data
│   │   └── training_data.csv         # Aggregated master training data
│   └── utils/
│       └── emitter.js                # EventEmitter for SSE
├── frontend/
│   ├── index.html                    # HTML entry with Inter font
│   ├── package.json                  # Dependencies & scripts
│   ├── vite.config.js                # Vite config + API proxy
│   ├── tailwind.config.js            # Tailwind configuration
│   ├── eslint.config.js              # ESLint flat config
│   └── src/
│       ├── main.jsx                  # React entry point
│       ├── App.jsx                   # Root component
│       ├── index.css                 # Tailwind + Inter font
│       ├── lib/
│       │   └── api.js                # Axios instance
│       └── components/
│           ├── Dashboard.jsx         # Live monitoring dashboard
│           ├── Sidebar.jsx           # Navigation sidebar
│           ├── Login.jsx             # Login form
│           ├── TrainModel.jsx        # ML training UI
│           ├── UserManagement.jsx    # Admin user management
│           ├── Yearly.jsx            # Yearly overview chart
│           └── ControlPanel.jsx      # (Deprecated) device controls
├── DOCUMENTATION.md                  # This file
└── skills-lock.json                  # AI agent skill lock
```
