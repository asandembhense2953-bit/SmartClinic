const express = require('express');
const ctrl = require('../controllers/index.js');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
// Protect user management endpoints
router.post('/login', ctrl.login);
router.post('/users', authenticate, ctrl.createUser);
router.get('/users', authenticate, ctrl.getUsers);
router.put('/users/:id', authenticate, ctrl.updateUser);
router.delete('/users/:id', authenticate, ctrl.deleteUser);

module.exports = router;