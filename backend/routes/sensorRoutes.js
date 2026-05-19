// routes/sensorRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers');

router.get('/',            ctrl.getSensorReadings);
router.get('/today',       ctrl.getTodaySensorReadings);
router.get('/type/:type',  ctrl.getSensorByType);

module.exports = router;
