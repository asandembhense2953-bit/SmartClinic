// controllers/index.js
const { Users, Patients, Doctors, Appointments, Queue, Sensors, Predictions } = require('../models/index.js');
const { createSession } = require('../middleware/auth');

// ── Rolling average helper ────────────────────
const rollingAvg = (durations) => {
  if (!durations.length) return 15;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
};

const parseAppointmentDateTime = (datetime) => {
  if (!datetime || typeof datetime !== 'string') return null;
  const match = datetime.trim().match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}):([0-9]{2})(?::[0-9]{2})?(?:Z|[+-][0-9]{2}:?[0-9]{2})?$/);
  if (!match) return null;
  const [_, datePart, hourStr, minuteStr] = match;
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(5, 7));
  const day = Number(datePart.slice(8, 10));
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const normalized = `${datePart}T${hourStr}:${minuteStr}`;
  return { date, hour, minute, normalized };
};

const validateAppointmentDateTime = (datetime) => {
  const parsed = parseAppointmentDateTime(datetime);
  if (!parsed) return { valid: false, error: 'Invalid datetime format. Use YYYY-MM-DDTHH:MM.' };
  const { date, hour, minute } = parsed;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date < tomorrow) return { valid: false, error: 'Appointments must be scheduled from tomorrow onwards.' };
  if (hour < 8 || hour > 17 || (hour === 17 && minute > 0))
    return { valid: false, error: 'Appointment time must be between 08:00 and 17:00.' };
  if (hour === 0 && minute === 0) return { valid: false, error: 'Midnight appointments are not allowed.' };
  return { valid: true, normalized: parsed.normalized };
};

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email: credential, password } = req.body;
    if (!credential || !password)
      return res.status(400).json({ success: false, error: 'Email/ID and password required' });

    const CLINIC_PASSWORD = 'clinic123';
    const isPatientId = /^PAT-\d{6}$/.test(credential);
    const isSAId = /^\d{13}$/.test(credential);

    if (isPatientId || isSAId) {
      if (password !== CLINIC_PASSWORD)
        return res.status(401).json({ success: false, error: 'Invalid credentials' });

      const patient = isPatientId
        ? await Patients.getById(credential)
        : await Patients.getByIdNumber(credential);

      if (!patient)
        return res.status(404).json({ success: false, error: 'Patient not found' });

      const safePatient = {
        role: 'patient',
        patient_id: patient.patient_id,
        patient_no: patient.patient_no || patient.patient_id,
        full_name: patient.full_name,
        id_number: patient.id_number,
        dob: patient.dob,
        contact: patient.contact,
        email: patient.email,
      };
      const token = createSession(safePatient);
      res.json({ success: true, data: safePatient, token });
    } else {
      const user = await Users.findByEmail(credential.toLowerCase().trim());
      if (!user || user.password !== password)
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      if (!user.is_active)
        return res.status(403).json({ success: false, error: 'Account is inactive' });
      const { password: _, ...safeUser } = user;
      const token = createSession(safeUser);
      res.json({ success: true, data: safeUser, token });
    }
  } catch (err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await Users.getAll();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { full_name, email, role, password, is_active = true } = req.body;
    if (!full_name || !email || !role) return res.status(400).json({ success:false, error: 'full_name, email and role required' });
    const user = await Users.create({ full_name, email, role, password, is_active });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const updated = await Users.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const result = await Users.delete(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────
const buildPatientNo = (lastId, attempt = 0) => {
  const base = lastId && /^PAT-(\d{6})$/.test(lastId)
    ? parseInt(lastId.slice(4), 10) + attempt + 1
    : 1 + attempt;
  return 'PAT-' + String(base).padStart(6, '0');
};

exports.createPatient = async (req, res, next) => {
  try {
    const { full_name, id_number, dob, contact, email } = req.body;
    if (!full_name || !id_number)
      return res.status(400).json({ success: false, error: 'full_name and id_number required' });
    if (!/^\d{13}$/.test(id_number))
      return res.status(400).json({ success: false, error: 'id_number must be 13 digits' });

    const lastId = await Patients.getLatestPatientId();
    const patient_no = buildPatientNo(lastId);
    let created = null;

    const insertCandidate = async (data) => {
      const result = await Patients.create(data);
      result.patient_no = result.patient_no || patient_no;
      return result;
    };

    try {
      created = await insertCandidate({ full_name, id_number, dob, contact, email, patient_no });
    } catch (err) {
      if (err.code === '42703' || String(err.message || '').includes('patient_no')) {
        // DB does not have a patient_no column; fall back to legacy patient_id insertion
        try {
          created = await insertCandidate({ full_name, id_number, dob, contact, email, patient_id: patient_no });
        } catch (err2) {
          if (err2.code === '22P02' || String(err2.message || '').includes('invalid input syntax for type uuid')) {
            // DB uses UUID for patient_id; let DB assign the UUID and keep patient_no locally
            created = await insertCandidate({ full_name, id_number, dob, contact, email });
          } else {
            throw err2;
          }
        }
      } else if (err.code === '23505') {
        const msg = err.message || '';
        if (msg.includes('id_number')) {
          return res.status(409).json({ success: false, error: 'Patient with this ID number already exists' });
        }
        throw err;
      } else {
        throw err;
      }
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
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

    const validation = validateAppointmentDateTime(datetime);
    if (!validation.valid)
      return res.status(400).json({ success: false, error: validation.error });

    const conflictDoctor = await Appointments.getByDoctorDatetime(doctor_id, validation.normalized);
    if (conflictDoctor)
      return res.status(409).json({ success: false, error: 'This doctor already has an appointment at the selected time.' });

    const conflictPatient = await Appointments.getByPatientDatetime(patient_id, validation.normalized);
    if (conflictPatient)
      return res.status(409).json({ success: false, error: 'Patient already has an appointment at the selected time.' });

    const appt = await Appointments.create({ patient_id, doctor_id, datetime: validation.normalized, reason, status: 'Booked' });
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

exports.updateAppointment = async (req, res, next) => {
  try {
    const current = await Appointments.getById(req.params.id);
    if (!current) return res.status(404).json({ success: false, error: 'Appointment not found' });

    const patient_id = req.body.patient_id || current.patient_id;
    const doctor_id = req.body.doctor_id || current.doctor_id;
    const datetime = req.body.datetime || current.datetime;

    if (req.body.datetime) {
      const validation = validateAppointmentDateTime(datetime);
      if (!validation.valid)
        return res.status(400).json({ success: false, error: validation.error });
      req.body.datetime = validation.normalized;
    }

    const conflictDoctor = await Appointments.getByDoctorDatetime(doctor_id, datetime, req.params.id);
    if (conflictDoctor)
      return res.status(409).json({ success: false, error: 'This doctor already has an appointment at the selected time.' });

    const conflictPatient = await Appointments.getByPatientDatetime(patient_id, datetime, req.params.id);
    if (conflictPatient)
      return res.status(409).json({ success: false, error: 'Patient already has an appointment at the selected time.' });

    const updated = await Appointments.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
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
    const { appointment_id, patient_id, doctor_id, source = 'QR_Scan' } = req.body;

    let appt = null;

    if (patient_id) {
      console.log(`Processing patient check-in for patient_id: ${patient_id}`);

      let patient;
      try {
        patient = await Patients.getById(patient_id);
      } catch (err) {
        if (String(err.message).includes('Patient not found'))
          return res.status(404).json({ success: false, error: 'Patient record not found' });
        throw err;
      }

      const todayDate = new Date().toISOString().split('T')[0];
      const patientAppointments = await Appointments.getByPatient(patient_id);
      appt = patientAppointments.find((item) =>
        item.datetime &&
        item.datetime.startsWith(todayDate) &&
        !['Cancelled', 'Completed'].includes(item.status)
      );

      if (appt) {
        console.log(`Found existing appointment for today: ${appt.appointment_id}`);
      } else {
        console.log('No appointment found for today. Creating walk-in appointment...');

        let assignedDoctorId = doctor_id;
        if (!assignedDoctorId) {
          const doctors = await Doctors.getAll();
          assignedDoctorId = doctors?.[0]?.doctor_id;
        }

        if (!assignedDoctorId) {
          return res.status(400).json({ success: false, error: 'No doctor_id provided and no available doctor for walk-in appointment' });
        }

        const walkInData = {
          patient_id,
          doctor_id: assignedDoctorId,
          datetime: new Date().toISOString(),
          status: 'Booked',
          reason: 'Walk-in patient',
        };
        appt = await Appointments.create(walkInData);
        console.log(`Created walk-in appointment: ${appt.appointment_id}`);
      }
    } else if (appointment_id) {
      appt = await Appointments.getById(appointment_id);
      if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });
    } else {
      return res.status(400).json({ success: false, error: 'Please provide patient_id or appointment_id' });
    }

    // Check not already checked in
    const existing = await Queue.getByAppointment(appt.appointment_id);
    if (existing)
      return res.status(409).json({ success: false, error: `${appt.patients.full_name} is already checked in (#${existing.queue_position})` });

    // Assign queue position
    const todayCount = await Queue.countToday();
    const queue_position = todayCount + 1;

    // Create queue entry
    const entry = await Queue.checkin({ appointment_id: appt.appointment_id, queue_position, status: 'CheckedIn' });

    // Sensor 1 — write to sensor_readings
    const occupancy = await Queue.countActive();
    await Sensors.write({ sensor_type: 'SmartCheckIn', source, patient_id: appt.patient_id, occupancy_level: occupancy });

    // Prediction — rolling average × patients ahead
    const durations = await Queue.getCompletedDurations();
    const avg = rollingAvg(durations);
    const estimated_wait = (queue_position - 1) * avg;
    await Predictions.create({ queue_id: entry.queue_id, estimated_wait, avg_used: avg });

    // Update appointment status
    await Appointments.updateStatus(appt.appointment_id, 'CheckedIn');

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
    const supabase = require('../config/supabase.js');
    const { data: current, error } = await supabase
      .from('queue_entries')
      .select('consult_start, appointment_id')
      .eq('queue_id', queue_id)
      .maybeSingle();

    if (error) throw error;
    if (!current) {
      return res.status(404).json({ success: false, error: 'Queue entry not found' });
    }

    const duration = current.consult_start
      ? Math.max(1, Math.round((new Date(consult_end) - new Date(current.consult_start)) / 60000))
      : 15;

    const entry = await Queue.updateStatus(queue_id, {
      status: 'Completed',
      consult_end,
      duration,
    });

    // Record actual wait in prediction_logs
    await Predictions.recordActual(queue_id, duration);
    if (current.appointment_id) {
      await Appointments.updateStatus(current.appointment_id, 'Completed');
    }

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