/**
 * Procore Configuration
 *
 * Centralized constants for Procore API endpoints, timeouts, and retry logic.
 * Switches between dev sandbox and production based on ENVIRONMENT variable.
 */

const isDev = process.env.ENVIRONMENT === 'development';

module.exports = {
  // OAuth and API endpoints
  PROCORE_ENDPOINTS: {
    // Login/Auth endpoints (for OAuth2 flow)
    LOGIN_URL: isDev
      ? 'https://login-sandbox.procore.com'
      : 'https://login.procore.com',

    // Token endpoint (for refresh)
    TOKEN_URL: isDev
      ? 'https://login-sandbox.procore.com/oauth/token'
      : 'https://login.procore.com/oauth/token',

    // API base endpoints
    API_BASE: isDev
      ? 'https://sandbox.procore.com'
      : 'https://api.procore.com',

    // Auth redirect endpoint
    AUTH_URL: isDev
      ? 'https://login-sandbox.procore.com/oauth/authorize'
      : 'https://login.procore.com/oauth/authorize',
  },

  // API configuration
  API_VERSION: '/rest/v1.0',
  PER_PAGE: 100,           // Page size for list operations
  MAX_PAGES: 50,           // Safety cap (= 5000 items per resource)

  // Token refresh safety margin (milliseconds)
  // Refresh token 5 minutes before expiry to avoid requests with expired token
  REFRESH_SAFETY_MARGIN_MS: 5 * 60 * 1000,

  // Retry configuration for failed exports
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_MINUTES: [5, 20, 60], // Delay between retry attempts (in minutes)

  // Batch operations
  FIRESTORE_BATCH_LIMIT: 400, // < Firebase hard limit of 500 ops/batch

  // Environment indicator
  isDev,
};
