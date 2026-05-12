// Procore Configuration — Dev Sandbox (estável, IDs não resetam)
// Confirmado 2026-04-28: production access aprovado mas projecto académico
// permanece em Dev Sandbox para preservar IDs estáveis (Monthly Sandbox
// reseta dia 1 e parte o matching obras/operadores).

module.exports = {
  PROCORE_ENDPOINTS: {
    LOGIN_URL:  'https://login-sandbox.procore.com',
    TOKEN_URL:  'https://login-sandbox.procore.com/oauth/token',
    API_BASE:   'https://sandbox.procore.com',
    AUTH_URL:   'https://login-sandbox.procore.com/oauth/authorize',
  },

  API_VERSION:            '/rest/v1.0',
  PER_PAGE:               100,
  MAX_PAGES:              50,
  FIRESTORE_BATCH_LIMIT:  400,
  REFRESH_SAFETY_MARGIN_MS: 5 * 60 * 1000,

  MAX_RETRY_ATTEMPTS:     3,
  RETRY_BACKOFF_MINUTES:  [5, 20, 60],
};
