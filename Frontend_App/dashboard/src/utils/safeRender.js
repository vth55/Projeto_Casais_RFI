/**
 * Utilitário para renderização segura de objetos do Firestore
 * Previne erro "Objects are not valid as a React child"
 */

/**
 * Extrai valor seguro para renderização de category
 * @param {string|object} category - Pode ser string ou objeto {id, name, code}
 * @param {string} fallback - Valor padrão se não existir
 * @returns {string} Valor seguro para renderização
 */
export const getCategoryName = (category, fallback = 'Equipamento') => {
  if (!category) return fallback;
  if (typeof category === 'string') return category;
  if (typeof category === 'object') return category.name || category.id || fallback;
  return fallback;
};

/**
 * Extrai valor seguro para renderização de location
 * @param {string|object} location - Pode ser string ou objeto {workId, workName, gps}
 * @param {string} fallback - Valor padrão se não existir
 * @returns {string} Valor seguro para renderização
 */
export const getLocationName = (location, fallback = '') => {
  if (!location) return fallback;
  if (typeof location === 'string') return location;
  if (typeof location === 'object') return location.workName || location.workId || fallback;
  return fallback;
};

/**
 * Extrai ID de category para uso em formulários
 * @param {string|object} category
 * @returns {string}
 */
export const getCategoryId = (category) => {
  if (!category) return '';
  if (typeof category === 'string') return category;
  if (typeof category === 'object') return category.id || '';
  return '';
};

/**
 * Verifica se um valor é seguro para renderização no React
 * @param {*} value - Qualquer valor
 * @returns {boolean}
 */
export const isSafeToRender = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return false; // Arrays precisam de .map()
  if (typeof value === 'object') return false; // Objetos não são seguros
  return true;
};

/**
 * Converte qualquer valor para string segura para renderização
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
export const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') {
    // Tentar extrair name, label, ou id
    return value.name || value.label || value.id || value.value || fallback;
  }
  return fallback;
};
