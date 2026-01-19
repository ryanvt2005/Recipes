import http from './http';

/**
 * Authentication API service
 */
export const authApi = {
  /**
   * Register a new user
   * @param {Object} data - User registration data
   * @param {string} data.email - User email
   * @param {string} data.password - User password
   * @param {string} [data.firstName] - User first name
   * @param {string} [data.lastName] - User last name
   * @returns {Promise} - Response with user and token
   */
  register: (data) => http.post('/auth/register', data),

  /**
   * Login user
   * @param {Object} data - Login credentials
   * @param {string} data.email - User email
   * @param {string} data.password - User password
   * @returns {Promise} - Response with user and token
   */
  login: (data) => http.post('/auth/login', data),
};

export default authApi;
