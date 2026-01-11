const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Authentication middleware - verifies JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt', { error: err.message });
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

module.exports = {
  authenticateToken,
  generateToken,
};
