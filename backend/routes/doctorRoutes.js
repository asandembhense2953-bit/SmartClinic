// routes/doctorRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers');

// GET    /api/doctors
// POST   /api/doctors
// GET    /api/doctors/:id
// PUT    /api/doctors/:id
// DELETE /api/doctors/:id
router.get('/',      ctrl.getDoctors);
router.post('/',     ctrl.createDoctor);
router.get('/:id',   ctrl.getDoctor);
router.put('/:id',   ctrl.updateDoctor);
router.delete('/:id',ctrl.deleteDoctor);

module.exports = router;
