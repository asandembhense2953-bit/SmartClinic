// ─────────────────────────────────────────────
// SmartClinic — server.js
// Group 2 · MUT DSOF300/DVSF300
// ─────────────────────────────────────────────
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ── Serve frontend files ──────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes ────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes.js'));
const { authenticate } = require('./middleware/auth');
app.use('/api', authenticate);
app.use('/api/patients',     require('./routes/patientRoutes.js'));
app.use('/api/doctors',      require('./routes/doctorRoutes.js'));
app.use('/api/appointments', require('./routes/appointmentRoutes.js'));
app.use('/api/queue',        require('./routes/queueRoutes.js'));
app.use('/api/sensors',      require('./routes/sensorRoutes.js'));
app.use('/api/predictions',  require('./routes/predictionRoutes.js'));
app.use('/api/powerbi',      require('./routes/powerbiRoutes.js'));

// ── Home → login page ─────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ── Global error handler ──────────────────────
app.use(require('./middleware/errorHandler.js'));

// ── Start + Sensor 2 ─────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  SmartClinic API running on port ${PORT}`);
  console.log(`🌐  Frontend: http://localhost:${PORT}`);
  console.log(`📡  API:      http://localhost:${PORT}/api`);
  require('./sensors/occupancySensor').start();
});