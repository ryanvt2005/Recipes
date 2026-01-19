const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { generateToken } = require('../middlewares/auth');
const logger = require('../config/logger');
const { errors } = require('../utils/errorResponse');

/**
 * Register a new user
 */
async function register(req, res) {
  const { email, password, firstName, lastName } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return errors.conflict(res, 'A user with this email address already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, created_at`,
      [email, passwordHash, firstName || null, lastName || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user);

    logger.info('New user registered', { userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      token,
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    return errors.internal(res, 'An error occurred during registration');
  }
}

/**
 * Login user
 */
async function login(req, res) {
  const { email, password } = req.body;

  try {
    // Find user by email
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return errors.unauthorized(res, 'Email or password is incorrect');
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return errors.unauthorized(res, 'Email or password is incorrect');
    }

    // Generate JWT token
    const token = generateToken(user);

    logger.info('User logged in', { userId: user.id, email: user.email });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    return errors.internal(res, 'An error occurred during login');
  }
}

module.exports = {
  register,
  login,
};
