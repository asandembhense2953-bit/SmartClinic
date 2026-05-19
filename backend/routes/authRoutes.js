// routes/authRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers');

// POST /api/auth/login
// GET  /api/auth/users
router.post('/login',  ctrl.login);
router.get('/users',   ctrl.getUsers);

module.exports = router;
