/**
 * Standardized API error response utilities
 *
 * All API error responses follow this format:
 * {
 *   error: 'ERROR_CODE',    // Machine-readable error code (UPPER_SNAKE_CASE)
 *   message: 'description'  // Human-readable error message
 * }
 */

/**
 * Standard error codes used across the API
 */
const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',

  // Domain-specific errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_EXISTS: 'USER_EXISTS',
  EXTRACTION_ERROR: 'EXTRACTION_ERROR',
  SAVE_FAILED: 'SAVE_FAILED',
  FETCH_FAILED: 'FETCH_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  INVALID_SERVINGS: 'INVALID_SERVINGS',
  SCALE_FAILED: 'SCALE_FAILED',
  DUPLICATE_RECIPE: 'DUPLICATE_RECIPE',
};

/**
 * Create a standardized error response object
 * @param {string} code - Error code from ErrorCodes
 * @param {string} message - Human-readable error message
 * @param {Object} [extra] - Additional fields to include in response
 * @returns {Object} Standardized error response object
 */
function errorResponse(code, message, extra = {}) {
  return {
    error: code,
    message,
    ...extra,
  };
}

/**
 * Send a standardized error response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} code - Error code from ErrorCodes
 * @param {string} message - Human-readable error message
 * @param {Object} [extra] - Additional fields to include in response
 */
function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json(errorResponse(code, message, extra));
}

/**
 * Common error response helpers
 */
const errors = {
  badRequest: (res, message = 'Bad request', extra = {}) =>
    sendError(res, 400, ErrorCodes.BAD_REQUEST, message, extra),

  unauthorized: (res, message = 'Unauthorized') =>
    sendError(res, 401, ErrorCodes.UNAUTHORIZED, message),

  forbidden: (res, message = 'Forbidden') => sendError(res, 403, ErrorCodes.FORBIDDEN, message),

  notFound: (res, message = 'Resource not found') =>
    sendError(res, 404, ErrorCodes.NOT_FOUND, message),

  conflict: (res, message = 'Resource already exists', extra = {}) =>
    sendError(res, 409, ErrorCodes.CONFLICT, message, extra),

  internal: (res, message = 'An internal server error occurred') =>
    sendError(res, 500, ErrorCodes.INTERNAL_ERROR, message),
};

module.exports = {
  ErrorCodes,
  errorResponse,
  sendError,
  errors,
};
