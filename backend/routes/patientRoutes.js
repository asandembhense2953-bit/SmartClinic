// routes/patientRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers');

// GET    /api/patients
// POST   /api/patients
// GET    /api/patients/:id
// PUT    /api/patients/:id
// DELETE /api/patients/:id
// GET    /api/patients/:id/appointments
router.get('/',                         ctrl.getPatients);
router.post('/',                        ctrl.createPatient);
router.get('/:id',                      ctrl.getPatient);
router.put('/:id',                      ctrl.updatePatient);
router.delete('/:id',                   ctrl.deletePatient);
router.get('/:patient_id/appointments', ctrl.getPatientAppointments);

module.exports = router;
