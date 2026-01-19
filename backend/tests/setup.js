/**
 * Test setup and utilities
 */

const jwt = require('jsonwebtoken');

// Set test environment
process.env.NODE_ENV = 'test';

/**
 * Generate a test JWT token
 * @param {Object} user - User data to encode in token
 * @returns {string} JWT token
 */
function generateTestToken(user = { id: 1, email: 'test@example.com' }) {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Create authorization header with bearer token
 * @param {string} token - JWT token
 * @returns {string} Bearer token header value
 */
function authHeader(token) {
  return `Bearer ${token}`;
}

module.exports = {
  generateTestToken,
  authHeader,
};
