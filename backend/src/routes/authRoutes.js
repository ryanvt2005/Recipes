const express = require('express');
const { register, login } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../utils/validation');

const router = express.Router();

// POST /api/v1/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), login);

module.exports = router;
