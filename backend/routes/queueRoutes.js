// routes/queueRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers');

// POST  /api/queue/checkin
// GET   /api/queue
// GET   /api/queue/occupancy
// PATCH /api/queue/:queue_id/begin
// PATCH /api/queue/:queue_id/end
// PATCH /api/queue/:queue_id/depart
router.post('/checkin',              ctrl.checkin);
router.get('/',                      ctrl.getQueue);
router.get('/occupancy',             ctrl.getOccupancy);
router.patch('/:queue_id/begin',     ctrl.beginConsultation);
router.patch('/:queue_id/end',       ctrl.endConsultation);
router.patch('/:queue_id/depart',    ctrl.markDeparted);

module.exports = router;
