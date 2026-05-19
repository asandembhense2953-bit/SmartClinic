// models/index.js — all models using exact Supabase column names
const db = require('../config/supabase');

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
const Users = {
  findByEmail: async (email) => {
    const { data, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  findById: async (user_id) => {
    const { data, error } = await db
      .from('users')
      .select('user_id, full_name, email, role, is_active, created_at')
      .eq('user_id', user_id)
      .single();
    if (error) throw error;
    return data;
  },
  getAll: async () => {
    const { data, error } = await db
      .from('users')
      .select('user_id, full_name, email, role, is_active, created_at')
      .order('role');
    if (error) throw error;
    return data;
  },
};

// ─────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────
const Patients = {
  create: async (data) => {
    const { data: row, error } = await db
      .from('patients')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return row;
  },
  getAll: async () => {
    const { data, error } = await db
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  getById: async (patient_id) => {
    const { data, error } = await db
      .from('patients')
      .select('*')
      .eq('patient_id', patient_id)
      .single();
    if (error) throw error;
    return data;
  },
  update: async (patient_id, updates) => {
    const { data, error } = await db
      .from('patients')
      .update(updates)
      .eq('patient_id', patient_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (patient_id) => {
    const { error } = await db
      .from('patients')
      .delete()
      .eq('patient_id', patient_id);
    if (error) throw error;
    return { message: 'Patient deleted' };
  },
};

// ─────────────────────────────────────────────
// DOCTORS
// ─────────────────────────────────────────────
const Doctors = {
  create: async (data) => {
    const { data: row, error } = await db
      .from('doctors')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return row;
  },
  getAll: async () => {
    const { data, error } = await db
      .from('doctors')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },
  getById: async (doctor_id) => {
    const { data, error } = await db
      .from('doctors')
      .select('*')
      .eq('doctor_id', doctor_id)
      .single();
    if (error) throw error;
    return data;
  },
  update: async (doctor_id, updates) => {
    const { data, error } = await db
      .from('doctors')
      .update(updates)
      .eq('doctor_id', doctor_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (doctor_id) => {
    const { error } = await db
      .from('doctors')
      .delete()
      .eq('doctor_id', doctor_id);
    if (error) throw error;
    return { message: 'Doctor deleted' };
  },
};

// ─────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────
const Appointments = {
  create: async (data) => {
    const { data: row, error } = await db
      .from('appointments')
      .insert([data])
      .select(`*, patients(full_name), doctors(name, contact)`)
      .single();
    if (error) throw error;
    return row;
  },
  getAll: async () => {
    const { data, error } = await db
      .from('appointments')
      .select(`*, patients(full_name), doctors(name, contact, department)`)
      .order('datetime');
    if (error) throw error;
    return data;
  },
  getToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await db
      .from('appointments')
      .select(`*, patients(full_name), doctors(name, contact, department)`)
      .gte('datetime', today + 'T00:00:00')
      .lte('datetime', today + 'T23:59:59')
      .order('datetime');
    if (error) throw error;
    return data;
  },
  getById: async (appointment_id) => {
    const { data, error } = await db
      .from('appointments')
      .select(`*, patients(full_name), doctors(name, contact)`)
      .eq('appointment_id', appointment_id)
      .single();
    if (error) throw error;
    return data;
  },
  getByPatient: async (patient_id) => {
    const { data, error } = await db
      .from('appointments')
      .select(`*, doctors(name, contact, department)`)
      .eq('patient_id', patient_id)
      .order('datetime', { ascending: false });
    if (error) throw error;
    return data;
  },
  updateStatus: async (appointment_id, status) => {
    const { data, error } = await db
      .from('appointments')
      .update({ status })
      .eq('appointment_id', appointment_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (appointment_id) => {
    const { error } = await db
      .from('appointments')
      .delete()
      .eq('appointment_id', appointment_id);
    if (error) throw error;
    return { message: 'Appointment deleted' };
  },
};

// ─────────────────────────────────────────────
// QUEUE ENTRIES
// ─────────────────────────────────────────────
const Queue = {
  checkin: async (data) => {
    const { data: row, error } = await db
      .from('queue_entries')
      .insert([data])
      .select(`*, appointments(*, patients(full_name), doctors(name))`)
      .single();
    if (error) throw error;
    return row;
  },
  getActive: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await db
      .from('queue_entries')
      .select(`*, appointments(*, patients(full_name), doctors(name, contact))`)
      .gte('checkin_time', today + 'T00:00:00')
      .in('status', ['CheckedIn', 'Consulting'])
      .order('queue_position');
    if (error) throw error;
    return data;
  },
  countActive: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await db
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .gte('checkin_time', today + 'T00:00:00')
      .eq('status', 'CheckedIn');
    if (error) throw error;
    return count || 0;
  },
  countToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await db
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .gte('checkin_time', today + 'T00:00:00');
    if (error) throw error;
    return count || 0;
  },
  updateStatus: async (queue_id, updates) => {
    const { data, error } = await db
      .from('queue_entries')
      .update(updates)
      .eq('queue_id', queue_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  getByAppointment: async (appointment_id) => {
    const { data, error } = await db
      .from('queue_entries')
      .select('*')
      .eq('appointment_id', appointment_id)
      .in('status', ['CheckedIn', 'Consulting'])
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },
  getCompletedDurations: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await db
      .from('queue_entries')
      .select('duration')
      .gte('checkin_time', today + 'T00:00:00')
      .eq('status', 'Completed')
      .not('duration', 'is', null);
    if (error) throw error;
    return data.map(r => r.duration);
  },
};

// ─────────────────────────────────────────────
// SENSOR READINGS
// ─────────────────────────────────────────────
const Sensors = {
  write: async ({ sensor_type, source, patient_id = null, occupancy_level }) => {
    const { data, error } = await db
      .from('sensor_readings')
      .insert([{ sensor_type, source, patient_id, occupancy_level }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  getAll: async (limit = 100) => {
    const { data, error } = await db
      .from('sensor_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
  getToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await db
      .from('sensor_readings')
      .select('*')
      .gte('timestamp', today + 'T00:00:00')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  },
  getByType: async (sensor_type, limit = 50) => {
    const { data, error } = await db
      .from('sensor_readings')
      .select('*')
      .eq('sensor_type', sensor_type)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
  getLatestOccupancy: async () => {
    const { data, error } = await db
      .from('sensor_readings')
      .select('occupancy_level, timestamp')
      .eq('sensor_type', 'ActiveQueueOccupancy')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || { occupancy_level: 0, timestamp: null };
  },
};

// ─────────────────────────────────────────────
// PREDICTION LOGS
// ─────────────────────────────────────────────
const Predictions = {
  create: async ({ queue_id, estimated_wait, avg_used }) => {
    const { data, error } = await db
      .from('prediction_logs')
      .insert([{ queue_id, estimated_wait, avg_used }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  recordActual: async (queue_id, actual_wait) => {
    const accuracy = await Predictions._calcAccuracy(queue_id, actual_wait);
    const { data, error } = await db
      .from('prediction_logs')
      .update({ actual_wait, accuracy })
      .eq('queue_id', queue_id)
      .is('actual_wait', null)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  _calcAccuracy: async (queue_id, actual_wait) => {
    const { data } = await db
      .from('prediction_logs')
      .select('estimated_wait')
      .eq('queue_id', queue_id)
      .single();
    if (!data) return null;
    return Math.max(0, Math.round(
      100 - Math.abs((actual_wait - data.estimated_wait) / Math.max(data.estimated_wait, 1) * 100)
    ));
  },
  getToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await db
      .from('prediction_logs')
      .select(`*, queue_entries(queue_position, appointments(patients(full_name)))`)
      .gte('prediction_time', today + 'T00:00:00')
      .order('prediction_time');
    if (error) throw error;
    return data;
  },
};

module.exports = { Users, Patients, Doctors, Appointments, Queue, Sensors, Predictions };
