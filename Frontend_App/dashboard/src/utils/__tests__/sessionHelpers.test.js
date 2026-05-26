import { describe, expect, it } from 'vitest';
import { detectToolSessionAnomalies } from '../sessionHelpers';

describe('detectToolSessionAnomalies', () => {
  const mkSession = (daysAgo, status = 'OPEN') => ({
    status,
    startTime: { toDate: () => new Date(Date.now() - daysAgo * 86400000) },
  });

  it('returns [] for CLOSED sessions', () => {
    expect(detectToolSessionAnomalies(mkSession(10, 'CLOSED'))).toEqual([]);
  });

  it('returns [] for sessions younger than overdue threshold', () => {
    expect(detectToolSessionAnomalies(mkSession(3))).toEqual([]);
  });

  it('returns [TOOL_OVERDUE] at 7+ days', () => {
    expect(detectToolSessionAnomalies(mkSession(8))).toEqual(['TOOL_OVERDUE']);
  });

  it('returns [TOOL_PRESUMED_LOST] at 30+ days', () => {
    expect(detectToolSessionAnomalies(mkSession(35))).toEqual(['TOOL_PRESUMED_LOST']);
  });

  it('respects custom thresholds', () => {
    expect(detectToolSessionAnomalies(mkSession(5), { overdueDays: 3 })).toEqual(['TOOL_OVERDUE']);
  });
});
