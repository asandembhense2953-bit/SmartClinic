// frontend/js/api.js
// ── SmartClinic — API Integration Layer ──────
// Calls the real Node.js backend at localhost:3000
// Falls back to mock data if backend is unreachable
// ─────────────────────────────────────────────

const API = 'http://localhost:3000/api';

// ── Fallback shared app state for dashboard demos ─────────────
window.SC = window.SC || {
  patientCounter: 2,
  queueCounter: 2,
  patients: [
    {
      patient_id: 'SC-001',
      full_name: 'Zanele Dlamini',
      id_number: '9001015800088',
      dob: '1990-01-01',
      contact: '0821234567',
      email: 'patient@smartclinic.co.za',
      created_at: '2024-01-10T08:00:00.000Z',
      doctor: 'Dr Nkosi (031-555-0101)'
    },
    {
      patient_id: 'PAT-298770',
      full_name: 'Demo Patient',
      id_number: '9001015800088',
      dob: '1990-01-01',
      contact: '0821234567',
      email: 'demo@smartclinic.co.za',
      created_at: '2024-01-10T08:00:00.000Z',
      doctor: 'Dr Nkosi (031-555-0101)'
    }
  ],
  appointments: [
    {
      appointment_id: 'APT-001',
      patient_id: 'SC-001',
      datetime: new Date().toISOString(),
      doctor: 'Dr Nkosi (031-555-0101)',
      reason: 'Review medication',
      status: 'Booked'
    }
  ],
  queueEntries: [
    {
      entry_id: 'QE-1',
      patient_id: 'SC-001',
      patient_name: 'Zanele Dlamini',
      queue_position: 1,
      status: 'CheckedIn',
      checkin_time: new Date().toISOString()
    }
  ],
  sensorReadings: [
    {
      reading_id: 'SR-001',
      sensor_type: 'ActiveQueueOccupancy',
      source: 'AutoPoll',
      patient_id: null,
      occupancy_level: 1,
      timestamp: new Date().toISOString()
    }
  ],
  predictionLogs: [
    {
      patient_id: 'SC-001',
      patient_name: 'Zanele Dlamini',
      queue_position: 1,
      estimated_wait: 5,
      actual: null,
      logged_at: new Date().toISOString()
    }
  ],
  consultationDurations: [],
  activeConsultation: null,
};

window.DOCTORS = window.DOCTORS || [
  { name: 'Dr Nkosi', specialty: 'General Practice', contact: '031-555-0101' },
  { name: 'Dr Patel', specialty: 'Chronic Care', contact: '031-555-0102' },
  { name: 'Dr van Wyk', specialty: 'Paediatrics', contact: '031-555-0103' },
  { name: 'Dr Dlamini', specialty: 'Internal Medicine', contact: '031-555-0104' }
];

// ── HTTP helper ───────────────────────────────
async function http(method, path, body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(API + path, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  } catch (err) {
    console.warn(`[API] ${method} ${path} failed:`, err.message);
    throw err;
  }
}

// ── API calls ─────────────────────────────────

// AUTH
const api = {
  // Login — POST /api/auth/login
  login: (email, password) =>
    http('POST', '/auth/login', { email, password }),

  // PATIENTS
  getPatients:   ()     => http('GET',    '/patients'),
  createPatient: (data) => http('POST',   '/patients', data),
  updatePatient: (id, data) => http('PUT','/patients/'+id, data),
  deletePatient: (id)   => http('DELETE', '/patients/'+id),

  // DOCTORS
  getDoctors: () => http('GET', '/doctors'),

  // APPOINTMENTS
  getAppointments:      ()     => http('GET',   '/appointments'),
  getTodayAppointments: ()     => http('GET',   '/appointments/today'),
  createAppointment:    (data) => http('POST',  '/appointments', data),
  updateApptStatus:     (id, status) => http('PATCH', '/appointments/'+id+'/status', { status }),

  // QUEUE
  checkin:          (appointment_id, source) => http('POST',  '/queue/checkin', { appointment_id, source }),
  getQueue:         ()         => http('GET',   '/queue'),
  getOccupancy:     ()         => http('GET',   '/queue/occupancy'),
  beginConsult:     (queue_id) => http('PATCH', '/queue/'+queue_id+'/begin'),
  endConsult:       (queue_id) => http('PATCH', '/queue/'+queue_id+'/end'),
  markDeparted:     (queue_id) => http('PATCH', '/queue/'+queue_id+'/depart'),

  // SENSORS
  getSensors:     (limit) => http('GET', '/sensors'+(limit?'?limit='+limit:'')),
  getTodaySensors: ()     => http('GET', '/sensors/today'),

  // PREDICTIONS
  getPredictions:  () => http('GET', '/predictions'),
  getRollingAvg:   () => http('GET', '/predictions/average'),
};

// ── AUTH helpers ──────────────────────────────
function getUser()  { try { return JSON.parse(sessionStorage.getItem('sc_user')); } catch { return null; } }
function setUser(u) { sessionStorage.setItem('sc_user', JSON.stringify(u)); }
function logout()   { sessionStorage.removeItem('sc_user'); window.location.href = '../login.html'; }

function requireAuth(role) {
  const u = getUser();
  if (!u) { window.location.href = '../login.html'; return null; }
  if (role && u.role !== role) { window.location.href = '../login.html'; return null; }
  return u;
}

const ROLE_PAGES = {
  admin:         'dashboards/admin.html',
  receptionist:  'dashboards/receptionist.html',
  doctor:        'dashboards/doctor.html',
  nurse:         'dashboards/nurse.html',
  patient:       'dashboards/patient.html',
};

// ── Utility helpers ───────────────────────────
function $(id) { return document.getElementById(id); }
function fmtTime(iso)     { if (!iso) return '—'; return new Date(iso).toLocaleTimeString('en-ZA', { hour:'2-digit', minute:'2-digit' }); }
function fmtDateTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString('en-ZA', { dateStyle:'short', timeStyle:'short' }); }
function fmtDate(iso)     { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-ZA'); }

function showAlert(id, type, msg, ms = 4000) {
  const el = $(id); if (!el) return;
  el.className = 'alert alert-' + type;
  el.innerHTML = msg;
  el.classList.remove('hidden');
  if (ms) setTimeout(() => el.classList.add('hidden'), ms);
}

// ── Sensor 2 live tick (polls backend every 10s) ──
setInterval(async () => {
  try {
    const res = await api.getOccupancy();
    document.dispatchEvent(new CustomEvent('sensor2tick', {
      detail: { count: res.occupancy, last_reading: res.last_reading }
    }));
  } catch (e) { /* backend offline — silent */ }
}, 10000);
