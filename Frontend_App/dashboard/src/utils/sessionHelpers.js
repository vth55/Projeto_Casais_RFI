export const SESSION_ANOMALY_THRESHOLD_H = 5;

// Hard anomalies require operational attention. NO_OPERATOR is informational only
// (in localhost all sessions lack RFID operators, making it 100% noise there).
export const HARD_ANOMALY_FLAGS = ['FATIGUE', 'AUTO_CLOSE', 'CORRECTED'];

// Shared maintenance thresholds — used by EquipamentosObraView, ManutencaoObraView, and ResumoView.
// Both views must use the same cut-offs so a machine shows the same RAG status everywhere.
export const MAINTENANCE_ALERT_PCT   = 0.8;  // ≥80 % → ALERT (amber)
export const MAINTENANCE_OVERDUE_PCT = 1.0;  // ≥100 % → OVERDUE (red)

export function detectHardAnomalies(session) {
  return detectSessionAnomalies(session).filter(f => HARD_ANOMALY_FLAGS.includes(f));
}

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

export function detectSessionAnomalies(session) {
  const flags = [];
  if (!session.operatorId) flags.push('NO_OPERATOR');
  if ((session.durationHours || 0) >= SESSION_ANOMALY_THRESHOLD_H) flags.push('FATIGUE');
  if (session.closedBy === 'SYSTEM_AUTO_CLOSE') flags.push('AUTO_CLOSE');
  if (session.isManuallyAdjusted || session.correctedByAdmin) flags.push('CORRECTED');
  return flags;
}
