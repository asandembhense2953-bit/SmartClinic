// routes/predictionRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers');

router.get('/',         ctrl.getPredictions);
router.get('/average',  ctrl.getRollingAverage);

module.exports = router;
