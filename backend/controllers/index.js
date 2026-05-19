// controllers/index.js
const { Users, Patients, Doctors, Appointments, Queue, Sensors, Predictions } = require('../models');

// ── Rolling average helper ────────────────────
const rollingAvg = (durations) => {
  if (!durations.length) return 15;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
};

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password required' });

    const user = await Users.findByEmail(email.toLowerCase().trim());
    if (!user || user.password !== password)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });

    if (!user.is_active)
      return res.status(403).json({ success: false, error: 'Account is inactive' });

    // Return user without password
    const { password: _, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await Users.getAll();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────
exports.createPatient = async (req, res, next) => {
  try {
    const { full_name, id_number, dob, contact, email } = req.body;
    if (!full_name || !id_number)
      return res.status(400).json({ success: false, error: 'full_name and id_number required' });
    if (!/^\d{13}$/.test(id_number))
      return res.status(400).json({ success: false, error: 'id_number must be 13 digits' });

    const patient = await Patients.create({ full_name, id_number, dob, contact, email });
    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ success: false, error: 'Patient with this ID number already exists' });
    next(err);
  }
};

exports.getPatients = async (req, res, next) => {
  try {
    const patients = await Patients.getAll();
    res.json({ success: true, count: patients.length, data: patients });
  } catch (err) { next(err); }
};

exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patients.getById(req.params.id);
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
};

exports.updatePatient = async (req, res, next) => {
  try {
    const updated = await Patients.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.deletePatient = async (req, res, next) => {
  try {
    const result = await Patients.delete(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// DOCTORS
// ─────────────────────────────────────────────
exports.createDoctor = async (req, res, next) => {
  try {
    const { name, department, specialisation, contact, email } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const doctor = await Doctors.create({ name, department, specialisation, contact, email });
    res.status(201).json({ success: true, data: doctor });
  } catch (err) { next(err); }
};

exports.getDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctors.getAll();
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (err) { next(err); }
};

exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctors.getById(req.params.id);
    res.json({ success: true, data: doctor });
  } catch (err) { next(err); }
};

exports.updateDoctor = async (req, res, next) => {
  try {
    const updated = await Doctors.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.deleteDoctor = async (req, res, next) => {
  try {
    const result = await Doctors.delete(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────
exports.createAppointment = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, datetime, reason } = req.body;
    if (!patient_id || !doctor_id || !datetime)
      return res.status(400).json({ success: false, error: 'patient_id, doctor_id and datetime required' });
    const appt = await Appointments.create({ patient_id, doctor_id, datetime, reason, status: 'Booked' });
    res.status(201).json({ success: true, data: appt });
  } catch (err) { next(err); }
};

exports.getAppointments = async (req, res, next) => {
  try {
    const appts = await Appointments.getAll();
    res.json({ success: true, count: appts.length, data: appts });
  } catch (err) { next(err); }
};

exports.getTodayAppointments = async (req, res, next) => {
  try {
    const appts = await Appointments.getToday();
    res.json({ success: true, count: appts.length, data: appts });
  } catch (err) { next(err); }
};

exports.getAppointment = async (req, res, next) => {
  try {
    const appt = await Appointments.getById(req.params.id);
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
};

exports.getPatientAppointments = async (req, res, next) => {
  try {
    const appts = await Appointments.getByPatient(req.params.patient_id);
    res.json({ success: true, count: appts.length, data: appts });
  } catch (err) { next(err); }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['Booked','CheckedIn','Consulting','Completed','Cancelled','NoShow'];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, error: `status must be one of: ${valid.join(', ')}` });
    const appt = await Appointments.updateStatus(req.params.id, status);
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
};

exports.deleteAppointment = async (req, res, next) => {
  try {
    const result = await Appointments.delete(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// QUEUE — CHECK-IN (Sensor 1)
// ─────────────────────────────────────────────
exports.checkin = async (req, res, next) => {
  try {
    const { appointment_id, source = 'QR_Scan' } = req.body;
    if (!appointment_id)
      return res.status(400).json({ success: false, error: 'appointment_id required' });

    // Check appointment exists
    const appt = await Appointments.getById(appointment_id);
    if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });

    // Check not already checked in
    const existing = await Queue.getByAppointment(appointment_id);
    if (existing)
      return res.status(409).json({ success: false, error: `${appt.patients.full_name} is already checked in (#${existing.queue_position})` });

    // Assign queue position
    const todayCount = await Queue.countToday();
    const queue_position = todayCount + 1;

    // Create queue entry
    const entry = await Queue.checkin({ appointment_id, queue_position, status: 'CheckedIn' });

    // Sensor 1 — write to sensor_readings
    const occupancy = await Queue.countActive();
    await Sensors.write({ sensor_type: 'SmartCheckIn', source, patient_id: appt.patient_id, occupancy_level: occupancy });

    // Prediction — rolling average × patients ahead
    const durations = await Queue.getCompletedDurations();
    const avg = rollingAvg(durations);
    const estimated_wait = (queue_position - 1) * avg;
    await Predictions.create({ queue_id: entry.queue_id, estimated_wait, avg_used: avg });

    // Update appointment status
    await Appointments.updateStatus(appointment_id, 'CheckedIn');

    res.json({
      success: true,
      message: `${appt.patients.full_name} checked in as #${queue_position}`,
      queue_position,
      estimated_wait_minutes: estimated_wait,
      data: entry,
    });
  } catch (err) { next(err); }
};

exports.getQueue = async (req, res, next) => {
  try {
    const queue = await Queue.getActive();
    res.json({ success: true, count: queue.length, data: queue });
  } catch (err) { next(err); }
};

exports.getOccupancy = async (req, res, next) => {
  try {
    const count = await Queue.countActive();
    const latest = await Sensors.getLatestOccupancy();
    res.json({ success: true, occupancy: count, last_reading: latest });
  } catch (err) { next(err); }
};

exports.beginConsultation = async (req, res, next) => {
  try {
    const entry = await Queue.updateStatus(req.params.queue_id, {
      status: 'Consulting',
      consult_start: new Date().toISOString(),
    });
    await Appointments.updateStatus(entry.appointment_id, 'Consulting');
    res.json({ success: true, message: 'Consultation started', data: entry });
  } catch (err) { next(err); }
};

exports.endConsultation = async (req, res, next) => {
  try {
    const { queue_id } = req.params;
    const consult_end = new Date().toISOString();

    // Get current entry to calculate duration
    const { data: current } = await require('../config/supabase')
      .from('queue_entries')
      .select('consult_start, appointment_id')
      .eq('queue_id', queue_id)
      .single();

    const duration = current?.consult_start
      ? Math.max(1, Math.round((new Date(consult_end) - new Date(current.consult_start)) / 60000))
      : 15;

    const entry = await Queue.updateStatus(queue_id, {
      status: 'Completed',
      consult_end,
      duration,
    });

    // Record actual wait in prediction_logs
    await Predictions.recordActual(queue_id, duration);
    await Appointments.updateStatus(current.appointment_id, 'Completed');

    // Sensor reading after consultation ends
    const count = await Queue.countActive();
    await Sensors.write({ sensor_type: 'ActiveQueueOccupancy', source: 'ConsultationEnd', occupancy_level: count });

    res.json({ success: true, message: 'Consultation ended', duration_minutes: duration, data: entry });
  } catch (err) { next(err); }
};

exports.markDeparted = async (req, res, next) => {
  try {
    const entry = await Queue.updateStatus(req.params.queue_id, { status: 'Departed' });
    const count = await Queue.countActive();
    await Sensors.write({ sensor_type: 'ActiveQueueOccupancy', source: 'Receptionist_ManualDepart', occupancy_level: count });
    res.json({ success: true, message: 'Patient marked as departed', data: entry });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// SENSORS
// ─────────────────────────────────────────────
exports.getSensorReadings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const readings = await Sensors.getAll(limit);
    res.json({ success: true, count: readings.length, data: readings });
  } catch (err) { next(err); }
};

exports.getTodaySensorReadings = async (req, res, next) => {
  try {
    const readings = await Sensors.getToday();
    res.json({ success: true, count: readings.length, data: readings });
  } catch (err) { next(err); }
};

exports.getSensorByType = async (req, res, next) => {
  try {
    const readings = await Sensors.getByType(req.params.type);
    res.json({ success: true, count: readings.length, data: readings });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// PREDICTIONS
// ─────────────────────────────────────────────
exports.getPredictions = async (req, res, next) => {
  try {
    const logs = await Predictions.getToday();
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) { next(err); }
};

exports.getRollingAverage = async (req, res, next) => {
  try {
    const durations = await Queue.getCompletedDurations();
    const avg = rollingAvg(durations);
    res.json({
      success: true,
      data: {
        rolling_average_minutes: avg,
        consultations_completed: durations.length,
        using_default: durations.length === 0,
        formula: durations.length === 0
          ? 'Default 15 min — no consultations completed yet'
          : `(${durations.join(' + ')}) ÷ ${durations.length} = ${avg} min`,
      },
    });
  } catch (err) { next(err); }
};
