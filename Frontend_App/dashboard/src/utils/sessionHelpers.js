/**
 * sessionHelpers.js — CASAIS Fleet Intelligence
 *
 * Funções primárias (tool_sessions / modelo NFC activo):
 *   detectToolSessionAnomalies, TOOL_OVERDUE_DAYS_DEFAULT, TOOL_LOST_DAYS_DEFAULT
 *
 * Funções legacy (heavy machines / RFID sessions):
 *   detectSessionAnomalies, detectHardAnomalies, SESSION_ANOMALY_THRESHOLD_H,
 *   HARD_ANOMALY_FLAGS, MAINTENANCE_ALERT_PCT, MAINTENANCE_OVERDUE_PCT
 *   @deprecated LEGACY — heavy machines. Usar detectToolSessionAnomalies em código novo.
 */

// ============================================================================
// CONSTANTES PRIMÁRIAS — tool_sessions
// ============================================================================

// Thresholds para tool_sessions (configuráveis via settings/system).
export const TOOL_OVERDUE_DAYS_DEFAULT = 7;
export const TOOL_LOST_DAYS_DEFAULT = 30;

// ============================================================================
// CONSTANTES LEGACY — heavy machines
// @deprecated LEGACY — heavy machines.
// ============================================================================

/**
 * @deprecated LEGACY — heavy machines. Não tem equivalente directo em tool_sessions.
 */
export const SESSION_ANOMALY_THRESHOLD_H = 5;

/**
 * Hard anomalies require operational attention. NO_OPERATOR is informational only.
 * @deprecated LEGACY — heavy machines.
 */
export const HARD_ANOMALY_FLAGS = ['FATIGUE', 'AUTO_CLOSE', 'CORRECTED'];

/**
 * Shared maintenance thresholds — used by EquipamentosObraView, ManutencaoObraView, and ResumoView.
 * Both views must use the same cut-offs so a machine shows the same RAG status everywhere.
 * @deprecated LEGACY — heavy machines. Manutenção de máquinas pesadas.
 */
export const MAINTENANCE_ALERT_PCT   = 0.8;  // ≥80 % → ALERT (amber)
/** @deprecated LEGACY — heavy machines. */
export const MAINTENANCE_OVERDUE_PCT = 1.0;  // ≥100 % → OVERDUE (red)

// ============================================================================
// FUNÇÕES PARTILHADAS (usadas por ambos os modelos)
// ============================================================================

export function resolveTimestamp(ts) {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

export function formatDuration(hours) {
  if (!hours || hours <= 0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ============================================================================
// FUNÇÕES LEGACY — heavy machines
// @deprecated LEGACY — heavy machines.
// ============================================================================

/**
 * @deprecated LEGACY — heavy machines. Usar detectToolSessionAnomalies para tool_sessions.
 */
export function detectHardAnomalies(session) {
  return detectSessionAnomalies(session).filter(f => HARD_ANOMALY_FLAGS.includes(f));
}

/**
 * @deprecated LEGACY — heavy machines. Usar detectToolSessionAnomalies para tool_sessions.
 */
export function detectSessionAnomalies(session) {
  const flags = [];
  if (!session.operatorId) flags.push('NO_OPERATOR');
  if ((session.durationHours || 0) >= SESSION_ANOMALY_THRESHOLD_H) flags.push('FATIGUE');
  if (session.closedBy === 'SYSTEM_AUTO_CLOSE') flags.push('AUTO_CLOSE');
  if (session.isManuallyAdjusted || session.correctedByAdmin) flags.push('CORRECTED');
  return flags;
}

/**
 * Detecta anomalias em tool_sessions baseado em tempo de checkout.
 *
 * @param {Object} toolSession - documento tool_session
 * @param {Object} [thresholds] - { overdueDays, lostDays }
 * @returns {string[]} anomaly flags: TOOL_OVERDUE, TOOL_PRESUMED_LOST, ou []
 */
export function detectToolSessionAnomalies(toolSession, thresholds = {}) {
  if (!toolSession || toolSession.status !== 'OPEN') return [];
  const start = resolveTimestamp(toolSession.startTime);
  if (!start) return [];

  const overdueDays = thresholds.overdueDays ?? TOOL_OVERDUE_DAYS_DEFAULT;
  const lostDays = thresholds.lostDays ?? TOOL_LOST_DAYS_DEFAULT;

  const daysOpen = (Date.now() - start.getTime()) / 86400000;
  if (daysOpen >= lostDays) return ['TOOL_PRESUMED_LOST'];
  if (daysOpen >= overdueDays) return ['TOOL_OVERDUE'];
  return [];
}
