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
  // Margem para refresh antecipado: 15min antes de expirar tenta refresh.
  // Maior do que o tempo entre crons (procoreScheduledSync = 1h) seria errado;
  // 15min é confortável (token TTL 2h, próxima cron 1h depois).
  REFRESH_SAFETY_MARGIN_MS: 15 * 60 * 1000,

  // Lock para evitar refresh concorrente (race condition que invalida refresh_token).
  REFRESH_LOCK_TTL_MS:      30 * 1000,
  REFRESH_MAX_RETRIES:      3,

  MAX_RETRY_ATTEMPTS:     3,
  RETRY_BACKOFF_MINUTES:  [5, 20, 60],
};
