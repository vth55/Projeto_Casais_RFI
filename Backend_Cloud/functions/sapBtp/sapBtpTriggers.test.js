'use strict';

/**
 * sapBtpTriggers.test.js
 *
 * Testa o trigger onToolMaintenanceCreated.
 * O sapBtpBridge é mockado — sem chamadas HTTP reais.
 */

let mockSyncDamageReport;
let trigger;

beforeEach(() => {
  jest.resetModules();

  mockSyncDamageReport = jest.fn().mockResolvedValue({ ok: true });

  jest.doMock('./sapBtpBridge', () => ({
    syncDamageReportToSapBtp: mockSyncDamageReport,
  }));
  jest.doMock('firebase-functions/v2/firestore', () => ({
    onDocumentCreated: (_opts, fn) => fn,
  }));

  trigger = require('./sapBtpTriggers').onToolMaintenanceCreated;
});

afterEach(() => {
  jest.clearAllMocks();
});

function mkEvent(data, maintenanceId = 'maint-001') {
  return {
    params: { maintenanceId },
    data: { data: () => data },
  };
}

// ─────────────────────────────────────────────────
// Tipos de avaria — apenas DAMAGE_TYPES sincronizam
// ─────────────────────────────────────────────────

describe('filtragem por tipo', () => {
  test('DAMAGE dispara syncDamageReportToSapBtp', async () => {
    await trigger(mkEvent({ type: 'DAMAGE', toolCode: 'LIXA-001', description: 'Disco partido' }));
    await Promise.resolve(); // flush microtasks
    expect(mockSyncDamageReport).toHaveBeenCalledTimes(1);
    expect(mockSyncDamageReport).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: { code: 'LIXA-001' },
        maintenance: expect.objectContaining({ type: 'DAMAGE', description: 'Disco partido' }),
      })
    );
  });

  test('FAULT dispara sync', async () => {
    await trigger(mkEvent({ type: 'FAULT', toolId: 'SERRA-006' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledTimes(1);
  });

  test('BREAKDOWN dispara sync', async () => {
    await trigger(mkEvent({ type: 'BREAKDOWN', toolCode: 'MART-002' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledTimes(1);
  });

  test('AVARIA dispara sync', async () => {
    await trigger(mkEvent({ type: 'AVARIA', toolCode: 'MART-002' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledTimes(1);
  });

  test('PREVENTIVE não dispara sync', async () => {
    await trigger(mkEvent({ type: 'PREVENTIVE', toolCode: 'MART-002' }));
    expect(mockSyncDamageReport).not.toHaveBeenCalled();
  });

  test('SCHEDULED não dispara sync', async () => {
    await trigger(mkEvent({ type: 'SCHEDULED', toolCode: 'MART-002' }));
    expect(mockSyncDamageReport).not.toHaveBeenCalled();
  });

  test('tipo vazio não dispara sync', async () => {
    await trigger(mkEvent({ toolCode: 'MART-002' }));
    expect(mockSyncDamageReport).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────
// toolCode / toolId fallback
// ─────────────────────────────────────────────────

describe('resolução de toolCode', () => {
  test('toolCode tem prioridade sobre toolId', async () => {
    await trigger(mkEvent({ type: 'DAMAGE', toolCode: 'LIXA-001', toolId: 'tool-doc-id' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledWith(
      expect.objectContaining({ tool: { code: 'LIXA-001' } })
    );
  });

  test('toolId usado quando toolCode ausente', async () => {
    await trigger(mkEvent({ type: 'DAMAGE', toolId: 'tool-doc-id' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledWith(
      expect.objectContaining({ tool: { code: 'tool-doc-id' } })
    );
  });

  test('sem toolCode nem toolId — sync não é chamado', async () => {
    await trigger(mkEvent({ type: 'DAMAGE', description: 'Sem identificador' }));
    expect(mockSyncDamageReport).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────
// Mapeamento de campos
// ─────────────────────────────────────────────────

describe('mapeamento de campos maintenance → BTP', () => {
  test('operatorName mapeado para operator.name', async () => {
    await trigger(mkEvent({ type: 'DAMAGE', toolCode: 'LIXA-001', operatorName: 'Ana Costa' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledWith(
      expect.objectContaining({ operator: { name: 'Ana Costa' } })
    );
  });

  test('reportedBy usado quando operatorName ausente', async () => {
    await trigger(mkEvent({ type: 'DAMAGE', toolCode: 'LIXA-001', reportedBy: 'Carlos' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledWith(
      expect.objectContaining({ operator: { name: 'Carlos' } })
    );
  });

  test('notes mapeado para description quando description ausente', async () => {
    await trigger(mkEvent({ type: 'DAMAGE', toolCode: 'LIXA-001', notes: 'Vedante partido' }));
    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledWith(
      expect.objectContaining({
        maintenance: expect.objectContaining({ description: 'Vedante partido' }),
      })
    );
  });
});

// ─────────────────────────────────────────────────
// Non-fatal: bridge throw não quebra trigger
// ─────────────────────────────────────────────────

describe('não-fatal', () => {
  test('bridge throw não propaga exceção para o trigger', async () => {
    mockSyncDamageReport.mockRejectedValue(new Error('BTP timeout'));

    await expect(
      trigger(mkEvent({ type: 'DAMAGE', toolCode: 'LIXA-001' }))
    ).resolves.not.toThrow();

    // flush para garantir que o .catch() correu sem rejeição não tratada
    await new Promise(r => setTimeout(r, 10));
  });

  test('data null retorna sem chamar bridge', async () => {
    const event = { params: { maintenanceId: 'maint-null' }, data: { data: () => null } };
    await trigger(event);
    expect(mockSyncDamageReport).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────
// SAP_BTP_ENABLED=false — bridge propaga skipped
// ─────────────────────────────────────────────────

describe('feature flag off', () => {
  test('bridge retorna skipped → trigger não lança excepção', async () => {
    mockSyncDamageReport.mockResolvedValue({ skipped: true, reason: 'SAP_BTP_DISABLED' });

    await expect(
      trigger(mkEvent({ type: 'DAMAGE', toolCode: 'LIXA-001' }))
    ).resolves.not.toThrow();

    await Promise.resolve();
    expect(mockSyncDamageReport).toHaveBeenCalledTimes(1);
  });
});
