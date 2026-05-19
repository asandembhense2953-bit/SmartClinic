-- ============================================================
-- SmartClinic — Database Schema
-- Group 2 · MUT DSOF300/DVSF300
-- Database: Supabase PostgreSQL
-- Normal Form: 3NF (Third Normal Form)
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── USERS ────────────────────────────────────────────────────
-- Stores staff login accounts (admin, receptionist, doctor,
-- nurse) and linked patient portal accounts.
-- Each user has exactly one role — no repeating groups (1NF).
-- All non-key fields depend only on user_id (2NF, 3NF).
CREATE TABLE IF NOT EXISTS users (
  user_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  password   TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('admin','receptionist','doctor','nurse','patient')),
  patient_id TEXT,                          -- FK-like link for patient portal users
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── PATIENTS ─────────────────────────────────────────────────
-- Stores registered clinic patients.
-- id_number is unique — prevents duplicate registrations.
-- All attributes depend solely on patient_id (3NF).
CREATE TABLE IF NOT EXISTS patients (
  patient_id  TEXT        PRIMARY KEY,      -- format: SC-001, SC-002 …
  full_name   TEXT        NOT NULL,
  id_number   TEXT        NOT NULL UNIQUE,  -- 13-digit South African ID
  dob         DATE,
  contact     TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── DOCTORS ──────────────────────────────────────────────────
-- Stores clinic doctors available for appointments.
-- Separated from users: a doctor record exists whether or not
-- the doctor has a portal login (avoids update anomalies — 3NF).
CREATE TABLE IF NOT EXISTS doctors (
  doctor_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  department     TEXT,
  specialisation TEXT,
  contact        TEXT,
  email          TEXT
);


-- ── APPOINTMENTS ─────────────────────────────────────────────
-- Links a patient to a doctor at a specific date/time.
-- patient_id and doctor_id are foreign keys — referential
-- integrity enforced. Status tracks the visit lifecycle.
-- No transitive dependencies — all fields depend on
-- appointment_id only (3NF).
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     TEXT        NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  doctor_id      UUID        NOT NULL REFERENCES doctors(doctor_id)   ON DELETE CASCADE,
  datetime       TIMESTAMPTZ NOT NULL,
  reason         TEXT,
  status         TEXT        NOT NULL DEFAULT 'Booked'
                             CHECK (status IN ('Booked','CheckedIn','Consulting','Completed','Cancelled','NoShow')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── QUEUE ENTRIES ─────────────────────────────────────────────
-- One row per patient visit (one-to-one with a checked-in
-- appointment). Tracks position in the queue and consultation
-- timing. appointment_id is a FK — no orphaned queue entries.
-- consult_start/end and duration are in this table and not
-- appointments to avoid a partial-dependency violation (2NF).
CREATE TABLE IF NOT EXISTS queue_entries (
  queue_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID        NOT NULL UNIQUE REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  queue_position  INTEGER     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'CheckedIn'
                              CHECK (status IN ('CheckedIn','Consulting','Completed','Departed')),
  checkin_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consult_start   TIMESTAMPTZ,
  consult_end     TIMESTAMPTZ,
  duration        INTEGER                           -- minutes; filled when consultation ends
);


-- ── SENSOR READINGS ──────────────────────────────────────────
-- Append-only log of IoT sensor events.
-- Sensor 1 (SmartCheckIn): fires on every QR/manual check-in.
-- Sensor 2 (ActiveQueueOccupancy): fires every 10 seconds
--   from the Node.js backend setInterval.
-- patient_id is nullable — Sensor 2 ticks have no patient.
-- No derived data stored here; all fields are atomic (1NF/3NF).
CREATE TABLE IF NOT EXISTS sensor_readings (
  reading_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_type     TEXT        NOT NULL CHECK (sensor_type IN ('SmartCheckIn','ActiveQueueOccupancy')),
  source          TEXT        NOT NULL,   -- e.g. 'QR_Scan', 'Receptionist_Manual', 'setInterval_Auto'
  patient_id      TEXT        REFERENCES patients(patient_id) ON DELETE SET NULL,
  occupancy_level INTEGER     NOT NULL DEFAULT 0,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── PREDICTION LOGS ───────────────────────────────────────────
-- One prediction row per queue entry.
-- Stores the estimated wait at check-in time and the actual
-- duration after the consultation, plus an accuracy score.
-- Keeping predictions separate from queue_entries avoids
-- update anomalies when actual data arrives (3NF).
CREATE TABLE IF NOT EXISTS prediction_logs (
  log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id        UUID        NOT NULL UNIQUE REFERENCES queue_entries(queue_id) ON DELETE CASCADE,
  estimated_wait  INTEGER     NOT NULL,   -- minutes, calculated at check-in
  avg_used        INTEGER     NOT NULL,   -- rolling average value used
  actual_wait     INTEGER,               -- filled when consultation ends
  accuracy        INTEGER,               -- 0–100%, filled when actual arrives
  prediction_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES (performance for common queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_patient   ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime  ON appointments(datetime);
CREATE INDEX IF NOT EXISTS idx_queue_status           ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_checkin_time     ON queue_entries(checkin_time);
CREATE INDEX IF NOT EXISTS idx_sensor_type            ON sensor_readings(sensor_type);
CREATE INDEX IF NOT EXISTS idx_sensor_timestamp       ON sensor_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_prediction_queue       ON prediction_logs(queue_id);


-- ============================================================
-- DEMO SEED DATA (optional — for testing)
-- ============================================================

-- Demo doctors
INSERT INTO doctors (doctor_id, name, department, specialisation, contact, email) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Dr Nkosi',    'General Practice', 'General Practice',  '031-555-0101', 'nkosi@smartclinic.co.za'),
  ('11111111-1111-1111-1111-111111111102', 'Dr Patel',    'Chronic Care',     'Chronic Diseases',  '031-555-0102', 'patel@smartclinic.co.za'),
  ('11111111-1111-1111-1111-111111111103', 'Dr van Wyk',  'Paediatrics',      'Paediatrics',       '031-555-0103', 'vanwyk@smartclinic.co.za'),
  ('11111111-1111-1111-1111-111111111104', 'Dr Dlamini',  'Internal Medicine','Internal Medicine', '031-555-0104', 'dlamini@smartclinic.co.za')
ON CONFLICT DO NOTHING;

-- Demo staff users (password stored as plaintext for demo only)
INSERT INTO users (full_name, email, password, role) VALUES
  ('Lungelo Mthethwa',  'admin@smartclinic.co.za',        'clinic123', 'admin'),
  ('Nomsa Dube',        'receptionist@smartclinic.co.za', 'clinic123', 'receptionist'),
  ('Dr M. Nkosi',       'doctor@smartclinic.co.za',       'clinic123', 'doctor'),
  ('Nurse Zulu',        'nurse@smartclinic.co.za',        'clinic123', 'nurse'),
  ('Zanele Dlamini',    'patient@smartclinic.co.za',      'clinic123', 'patient')
ON CONFLICT DO NOTHING;

-- Demo patient
INSERT INTO patients (patient_id, full_name, id_number, dob, contact, email) VALUES
  ('SC-001', 'Zanele Dlamini', '9001015800088', '1990-01-01', '0821234567', 'patient@smartclinic.co.za')
ON CONFLICT DO NOTHING;
