// ─────────────────────────────────────────────
// SmartClinic — server.js
// Group 2 · MUT DSOF300/DVSF300
// ─────────────────────────────────────────────
const express   = require('express');
const cors      = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/patients',     require('./routes/patientRoutes'));
app.use('/api/doctors',      require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/queue',        require('./routes/queueRoutes'));
app.use('/api/sensors',      require('./routes/sensorRoutes'));
app.use('/api/predictions',  require('./routes/predictionRoutes'));

// ── Health check ──────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'SmartClinic API running',
    version: '1.0.0',
    database: 'Supabase PostgreSQL (zvbhudmurrhszsloudmk)',
    timestamp: new Date().toISOString()
  });
});

// ── Global error handler ──────────────────────
app.use(require('./middleware/errorHandler'));

// ── Start + Sensor 2 ─────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  SmartClinic API running on port ${PORT}`);
  require('./sensors/occupancySensor').start();
});
