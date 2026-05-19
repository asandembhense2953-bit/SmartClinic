# SmartClinic — Queue & Appointment Management System
**Group 2 · MUT DSOF300/DVSF300**

---

## What Is SmartClinic?
SmartClinic replaces paper-based clinic queues with a digital,
sensor-driven system. Patients check in by scanning a QR card,
receive a real-time queue number and wait estimate, and staff
manage the full visit lifecycle through role-based dashboards.

---

## Quick Start

### Prerequisites
- Node.js v18+
- A Supabase project (free tier is fine)

### Setup
```bash
cd backend
cp .env.example .env
# Edit .env — add your SUPABASE_URL and SUPABASE_SERVICE_KEY
npm install
node server.js
```

### Database
1. Open your Supabase project → SQL Editor
2. Copy and run the contents of `database/schema.sql`
3. This creates all tables, foreign keys, indexes, and demo seed data

### Frontend
Open any file in `frontend/` directly in a browser — no build step needed.
Start with `frontend/login.html`.

**Demo credentials (all passwords: `clinic123`)**

| Role          | Email                             |
|---------------|-----------------------------------|
| Admin         | admin@smartclinic.co.za           |
| Receptionist  | receptionist@smartclinic.co.za    |
| Doctor        | doctor@smartclinic.co.za          |
| Nurse         | nurse@smartclinic.co.za           |
| Patient       | patient@smartclinic.co.za         |

---

## Project Structure
```
smartclinic/
├── backend/
│   ├── config/
│   │   └── supabase.js          Supabase client setup
│   ├── controllers/
│   │   └── index.js             All route handler functions
│   ├── middleware/
│   │   └── errorHandler.js      Global Express error handler
│   ├── models/
│   │   └── index.js             All database query functions
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── queueRoutes.js
│   │   ├── sensorRoutes.js
│   │   └── predictionRoutes.js
│   ├── sensors/
│   │   └── occupancySensor.js   Sensor 2 — setInterval polling
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── js/
│   │   └── api.js               Shared HTTP + auth helpers
│   ├── login.html
│   ├── register.html
│   └── dashboards/
│       ├── admin.html
│       ├── receptionist.html
│       ├── doctor.html
│       ├── nurse.html
│       ├── patient.html
│       └── smartcheckin.html    Standalone QR kiosk
├── database/
│   └── schema.sql               Full 3NF schema + seed data
└── docs/
    ├── Sprint1_Plan.txt
    ├── Sprint1_Review.txt
    ├── Sprint2_Plan.txt
    ├── Sprint2_Review.txt
    └── SmartClinic_API.postman_collection.json
```

---

## Architecture — MVC Pattern

```
HTTP Request
     │
     ▼
routes/*.js          (URL mapping only — no logic)
     │
     ▼
controllers/index.js (request validation, response formatting)
     │
     ▼
models/index.js      (all Supabase queries — data layer)
     │
     ▼
config/supabase.js   (Supabase client)
     │
     ▼
Supabase PostgreSQL  (cloud database)
```

---

## Database — 3NF Schema

| Table             | Primary Key        | Foreign Keys                        |
|-------------------|--------------------|-------------------------------------|
| users             | user_id (UUID)     | —                                   |
| patients          | patient_id (TEXT)  | —                                   |
| doctors           | doctor_id (UUID)   | —                                   |
| appointments      | appointment_id     | → patients, → doctors               |
| queue_entries     | queue_id           | → appointments                      |
| sensor_readings   | reading_id         | → patients (nullable)               |
| prediction_logs   | log_id             | → queue_entries                     |

**3NF compliance:** All attributes are atomic, no partial dependencies,
no transitive dependencies. Referential integrity enforced via FK constraints.

---

## IoT Sensors

### Sensor 1 — SmartCheckIn
- **Trigger:** Every patient check-in (QR scan or manual)
- **Logs:** sensor_type, source, patient_id, occupancy_level, timestamp
- **Purpose:** Audit trail for every check-in event

### Sensor 2 — ActiveQueueOccupancy
- **Trigger:** setInterval every 10 seconds (Node.js backend, auto-starts on boot)
- **Logs:** live count of CheckedIn patients every 10 seconds
- **Purpose:** Continuous occupancy monitoring; triggers capacity warning at 8+

---

## API Endpoints

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| POST   | /api/auth/login                 | Authenticate user                  |
| GET    | /api/patients                   | List all patients                  |
| POST   | /api/patients                   | Register new patient               |
| GET    | /api/patients/:id               | Get patient by ID                  |
| PUT    | /api/patients/:id               | Update patient                     |
| DELETE | /api/patients/:id               | Delete patient                     |
| GET    | /api/doctors                    | List all doctors                   |
| POST   | /api/doctors                    | Add doctor                         |
| GET    | /api/doctors/:id                | Get doctor by ID                   |
| PUT    | /api/doctors/:id                | Update doctor                      |
| DELETE | /api/doctors/:id                | Delete doctor                      |
| GET    | /api/appointments               | List all appointments              |
| POST   | /api/appointments               | Book appointment                   |
| GET    | /api/appointments/today         | Today's appointments               |
| GET    | /api/appointments/:id           | Get appointment                    |
| PATCH  | /api/appointments/:id/status    | Update appointment status          |
| DELETE | /api/appointments/:id           | Delete appointment                 |
| POST   | /api/queue/checkin              | Check in patient (Sensor 1 fires)  |
| GET    | /api/queue                      | Active queue                       |
| GET    | /api/queue/occupancy            | Live occupancy (Sensor 2)          |
| PATCH  | /api/queue/:id/begin            | Begin consultation                 |
| PATCH  | /api/queue/:id/end              | End consultation                   |
| PATCH  | /api/queue/:id/depart           | Mark patient departed              |
| GET    | /api/sensors                    | All sensor readings                |
| GET    | /api/sensors/today              | Today's sensor readings            |
| GET    | /api/sensors/type/:type         | Filter by sensor type              |
| GET    | /api/predictions                | Today's prediction log             |
| GET    | /api/predictions/average        | Rolling average + formula          |

Full request/response examples: `docs/SmartClinic_API.postman_collection.json`

---

## Version Control — Commit History

```
commit 001 — Initial commit: project structure and package.json
commit 002 — Add Supabase config and .env.example
commit 003 — Add 3NF database schema (users, patients, doctors, appointments)
commit 004 — Add Users model with findByEmail, findById, getAll
commit 005 — Add Patients model with full CRUD methods
commit 006 — Add Doctors model with full CRUD methods
commit 007 — Add Appointments model with status lifecycle
commit 008 — Add auth controller and login endpoint
commit 009 — Add patient controller and CRUD routes
commit 010 — Add doctor controller and CRUD routes
commit 011 — Add appointment controller with status validation
commit 012 — Add global error handler middleware
commit 013 — Sprint 1 complete: all backend endpoints tested
commit 014 — Add queue_entries and sensor_readings to schema
commit 015 — Add prediction_logs table and indexes to schema
commit 016 — Add Queue model with checkin, getActive, countActive
commit 017 — Add Sensors model with write, getAll, getByType
commit 018 — Add Predictions model with create, recordActual, accuracy
commit 019 — Add queue controller: checkin with Sensor 1 integration
commit 020 — Add beginConsultation and endConsultation endpoints
commit 021 — Add markDeparted endpoint with Sensor 2 write
commit 022 — Add Sensor 2: occupancySensor.js setInterval polling
commit 023 — Integrate Sensor 2 start into server.js listen callback
commit 024 — Add sensor and prediction controllers + routes
commit 025 — Add rolling average helper and getRollingAverage endpoint
commit 026 — Add shared frontend api.js with http helper and auth utils
commit 027 — Add login.html with role-based redirect and demo buttons
commit 028 — Add register.html with QR card generation and PDF download
commit 029 — Add admin.html dashboard with KPIs and sensor charts
commit 030 — Add receptionist.html with live queue and QR kiosk
commit 031 — Add doctor.html with consultation timer
commit 032 — Add nurse.html with voice patient calling
commit 033 — Add patient.html with queue status and QR card
commit 034 — Add smartcheckin.html standalone kiosk page
commit 035 — Export Postman collection with all 30+ endpoints
commit 036 — Add Sprint 1 and Sprint 2 plan and review documents
commit 037 — Final cleanup: remove console logs, add .gitignore
```

---

## Sprint Documents
- `docs/Sprint1_Plan.txt` — Sprint 1 goal, tasks, DB design
- `docs/Sprint1_Review.txt` — What was built, challenges, lessons
- `docs/Sprint2_Plan.txt` — Sprint 2 goal, IoT design, As-Is analysis
- `docs/Sprint2_Review.txt` — What was built, metrics, lessons

---

## Group 2 — MUT DSOF300/DVSF300
