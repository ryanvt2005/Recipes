import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with default config
const http = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Callback for handling logout (set by AuthContext)
let onUnauthorized = null;

/**
 * Set the callback to be called when a 401/403 response is received
 * This should be called by the AuthContext to inject the logout handler
 */
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Request interceptor - attach JWT token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized responses
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear stored auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Call the logout handler if set
      if (onUnauthorized) {
        onUnauthorized();
      }

      // Redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default http;
