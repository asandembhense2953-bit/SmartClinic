// routes/appointmentRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers');

// GET    /api/appointments
// POST   /api/appointments
// GET    /api/appointments/today
// GET    /api/appointments/:id
// PATCH  /api/appointments/:id/status
// DELETE /api/appointments/:id
router.get('/',               ctrl.getAppointments);
router.post('/',              ctrl.createAppointment);
router.get('/today',          ctrl.getTodayAppointments);
router.get('/:id',            ctrl.getAppointment);
router.patch('/:id/status',   ctrl.updateAppointmentStatus);
router.delete('/:id',         ctrl.deleteAppointment);

module.exports = router;
