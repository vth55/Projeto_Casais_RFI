'use strict';

/**
 * sapBtpBridge.test.js
 *
 * Testa o mapeamento PWA → SAP BTP.
 * O sapBtpClient é mockado — sem chamadas HTTP.
 */

let bridge;
let mockClient;

beforeEach(() => {
  jest.resetModules();

  mockClient = {
    getEquipmentByCode: jest.fn(),
    patchEquipmentById: jest.fn(),
    patchEquipmentByCode: jest.fn(),
    createFaultReport: jest.fn(),
    createMovement: jest.fn(),
  };

  jest.doMock('./sapBtpClient', () => mockClient);
  bridge = require('./sapBtpBridge');
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────
// Feature flag OFF — skipped propagado
// ─────────────────────────────────────────────────

describe('feature flag OFF — skipped propagado do cliente', () => {
  const SKIPPED = { skipped: true, reason: 'SAP_BTP_DISABLED' };

  test('syncToolLocationToSapBtp propaga skipped', async () => {
    mockClient.patchEquipmentByCode.mockResolvedValue(SKIPPED);

    const result = await bridge.syncToolLocationToSapBtp({
      tool: { code: 'MART-002', status: 'in_use' },
      operator: { name: 'João' },
      location: { name: 'Piso 5' },
      eventType: 'checkout',
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('SAP_BTP_DISABLED');
  });

  test('syncDamageReportToSapBtp propaga skipped do getEquipmentByCode', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue(SKIPPED);

    const result = await bridge.syncDamageReportToSapBtp({
      tool: { code: 'LIXA-001' },
      maintenance: { type: 'DAMAGE', description: 'Disco partido' },
      operator: { name: 'Ana' },
    });

    expect(result.skipped).toBe(true);
    expect(mockClient.createFaultReport).not.toHaveBeenCalled();
  });

  test('syncTransferMovementToSapBtp propaga skipped do getEquipmentByCode', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue(SKIPPED);

    const result = await bridge.syncTransferMovementToSapBtp({
      tool: { code: 'SERRA-006' },
      transfer: { fromLocation: 'Armazem', toLocation: 'Obra' },
      operator: { name: 'Carlos' },
    });

    expect(result.skipped).toBe(true);
    expect(mockClient.createMovement).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────
// equipmentCode em falta — erro antes de chamar cliente
// ─────────────────────────────────────────────────

describe('equipmentCode em falta', () => {
  test('syncToolLocationToSapBtp retorna erro sem chamar cliente', async () => {
    const result = await bridge.syncToolLocationToSapBtp({
      tool: { name: 'Sem code' },
      operator: {},
      location: {},
      eventType: 'checkout',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('missing equipmentCode');
    expect(mockClient.patchEquipmentByCode).not.toHaveBeenCalled();
  });

  test('syncDamageReportToSapBtp retorna erro sem chamar cliente', async () => {
    const result = await bridge.syncDamageReportToSapBtp({
      tool: {},
      maintenance: {},
      operator: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('missing equipmentCode');
    expect(mockClient.getEquipmentByCode).not.toHaveBeenCalled();
  });

  test('syncTransferMovementToSapBtp retorna erro sem chamar cliente', async () => {
    const result = await bridge.syncTransferMovementToSapBtp({
      tool: {},
      transfer: {},
      operator: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('missing equipmentCode');
    expect(mockClient.getEquipmentByCode).not.toHaveBeenCalled();
  });

  test('tool.serialNumber aceite como equipmentCode alternativo', async () => {
    mockClient.patchEquipmentByCode.mockResolvedValue({ ok: true });

    const result = await bridge.syncToolLocationToSapBtp({
      tool: { serialNumber: 'SER-001' },
      operator: { name: 'X' },
      location: { name: 'Piso 1' },
      eventType: 'checkout',
    });

    expect(mockClient.patchEquipmentByCode).toHaveBeenCalledWith('SER-001', expect.any(Object));
  });
});

// ─────────────────────────────────────────────────
// Mapeamento de status
// ─────────────────────────────────────────────────

describe('mapeamento de status', () => {
  test('todos os status PWA mapeiam correctamente para BTP', () => {
    const { mapStatus } = bridge.__test;
    expect(mapStatus('available')).toBe('AVAILABLE');
    expect(mapStatus('in_use')).toBe('IN_USE');
    expect(mapStatus('session_active')).toBe('IN_USE');
    expect(mapStatus('maintenance')).toBe('MAINTENANCE');
    expect(mapStatus('damage')).toBe('MAINTENANCE');
    expect(mapStatus('transfer')).toBe('IN_TRANSFER');
  });

  test('status desconhecido faz fallback para AVAILABLE', () => {
    const { mapStatus } = bridge.__test;
    expect(mapStatus('unknown_xyz')).toBe('AVAILABLE');
    expect(mapStatus(undefined)).toBe('AVAILABLE');
    expect(mapStatus(null)).toBe('AVAILABLE');
  });

  test('mapeamento é case-insensitive', () => {
    const { mapStatus } = bridge.__test;
    expect(mapStatus('IN_USE')).toBe('IN_USE');
    expect(mapStatus('Available')).toBe('AVAILABLE');
  });
});

// ─────────────────────────────────────────────────
// buildEquipmentPatch — mapping GPS/localização
// ─────────────────────────────────────────────────

describe('buildEquipmentPatch — payload GPS/localização', () => {
  test('inclui GPS quando fornecido', () => {
    const { buildEquipmentPatch } = bridge.__test;
    const patch = buildEquipmentPatch(
      { code: 'MART-002', currentObraName: 'Torre Boavista' },
      { name: 'João Silva' },
      { name: 'Piso 5', gps: { latitude: 41.157944, longitude: -8.629105 } },
      'checkout'
    );

    expect(patch.latitude).toBe(41.157944);
    expect(patch.longitude).toBe(-8.629105);
    expect(patch.currentLocationName).toBe('Piso 5');
    expect(patch.lastSeenBy).toBe('João Silva');
    expect(patch.assignedProject).toBe('Torre Boavista');
    expect(patch.status).toBe('IN_USE');
  });

  test('não inclui latitude/longitude quando GPS não fornecido', () => {
    const { buildEquipmentPatch } = bridge.__test;
    const patch = buildEquipmentPatch({}, {}, { name: 'Armazém' }, 'checkout');
    expect(patch.latitude).toBeUndefined();
    expect(patch.longitude).toBeUndefined();
    expect(patch.currentLocationName).toBe('Armazém');
  });

  test('checkout define status IN_USE', () => {
    const { buildEquipmentPatch } = bridge.__test;
    const patch = buildEquipmentPatch({}, {}, { name: 'X' }, 'checkout');
    expect(patch.status).toBe('IN_USE');
  });

  test('checkin define status AVAILABLE', () => {
    const { buildEquipmentPatch } = bridge.__test;
    const patch = buildEquipmentPatch({}, {}, { name: 'X' }, 'checkin');
    expect(patch.status).toBe('AVAILABLE');
  });

  test('session_start define status IN_USE', () => {
    const { buildEquipmentPatch } = bridge.__test;
    const patch = buildEquipmentPatch({}, {}, { name: 'X' }, 'session_start');
    expect(patch.status).toBe('IN_USE');
  });

  test('session_end define status AVAILABLE', () => {
    const { buildEquipmentPatch } = bridge.__test;
    const patch = buildEquipmentPatch({}, {}, { name: 'X' }, 'session_end');
    expect(patch.status).toBe('AVAILABLE');
  });

  test('status do tool usado quando eventType não é checkout/checkin', () => {
    const { buildEquipmentPatch } = bridge.__test;
    const patch = buildEquipmentPatch({ status: 'maintenance' }, {}, { name: 'X' }, 'manual_update');
    expect(patch.status).toBe('MAINTENANCE');
  });
});

// ─────────────────────────────────────────────────
// syncToolLocationToSapBtp — live path
// ─────────────────────────────────────────────────

describe('syncToolLocationToSapBtp — live path', () => {
  test('chama patchEquipmentByCode com payload mapeado correctamente', async () => {
    mockClient.patchEquipmentByCode.mockResolvedValue({ ok: true, body: {} });

    const result = await bridge.syncToolLocationToSapBtp({
      tool: { code: 'MART-002', status: 'in_use', currentObraName: 'Torre Boavista' },
      operator: { name: 'João Silva' },
      location: { name: 'Piso 5', gps: { latitude: 41.157944, longitude: -8.629105 } },
      eventType: 'checkout',
    });

    expect(result.ok).toBe(true);
    expect(mockClient.patchEquipmentByCode).toHaveBeenCalledWith(
      'MART-002',
      expect.objectContaining({
        currentLocationName: 'Piso 5',
        lastSeenBy: 'João Silva',
        status: 'IN_USE',
        latitude: 41.157944,
        longitude: -8.629105,
        assignedProject: 'Torre Boavista',
      })
    );
  });

  test('falha do patch propagada sem throw', async () => {
    mockClient.patchEquipmentByCode.mockResolvedValue({ ok: false, status: 500 });

    const result = await bridge.syncToolLocationToSapBtp({
      tool: { code: 'MART-002' },
      operator: {},
      location: { name: 'Piso 5' },
      eventType: 'checkout',
    });

    expect(result.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// syncDamageReportToSapBtp — live path
// ─────────────────────────────────────────────────

describe('syncDamageReportToSapBtp — live path', () => {
  test('cria FaultReport e faz patch de status + hasOpenFault', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue({
      ok: true,
      equipment: { ID: '22222222-2222-2222-2222-222222222222', equipmentCode: 'LIXA-001' },
    });
    mockClient.createFaultReport.mockResolvedValue({ ok: true, body: {} });
    mockClient.patchEquipmentById.mockResolvedValue({ ok: true, body: {} });

    const result = await bridge.syncDamageReportToSapBtp({
      tool: { code: 'LIXA-001' },
      maintenance: { type: 'DAMAGE', description: 'Disco partido' },
      operator: { name: 'Ana Costa' },
    });

    expect(result.ok).toBe(true);
    expect(mockClient.createFaultReport).toHaveBeenCalledWith(
      expect.objectContaining({
        equipment_ID: '22222222-2222-2222-2222-222222222222',
        faultType: 'DAMAGE',
        status: 'OPEN',
        reportedBy: 'Ana Costa',
        description: 'Disco partido',
      })
    );
    expect(mockClient.patchEquipmentById).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
      expect.objectContaining({ status: 'MAINTENANCE', hasOpenFault: true })
    );
  });

  test('equipment não encontrado retorna erro controlado sem criar fault', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue({ ok: true, equipment: null });

    const result = await bridge.syncDamageReportToSapBtp({
      tool: { code: 'MISSING-999' },
      maintenance: { type: 'DAMAGE' },
      operator: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
    expect(mockClient.createFaultReport).not.toHaveBeenCalled();
    expect(mockClient.patchEquipmentById).not.toHaveBeenCalled();
  });

  test('getEquipmentByCode falha propaga erro sem criar fault', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue({ ok: false, error: 'timeout' });

    const result = await bridge.syncDamageReportToSapBtp({
      tool: { code: 'LIXA-001' },
      maintenance: {},
      operator: {},
    });

    expect(result.ok).toBe(false);
    expect(mockClient.createFaultReport).not.toHaveBeenCalled();
  });

  test('result.ok false quando createFaultReport falha', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue({
      ok: true,
      equipment: { ID: 'x', equipmentCode: 'LIXA-001' },
    });
    mockClient.createFaultReport.mockResolvedValue({ ok: false, status: 500 });
    mockClient.patchEquipmentById.mockResolvedValue({ ok: true });

    const result = await bridge.syncDamageReportToSapBtp({
      tool: { code: 'LIXA-001' },
      maintenance: {},
      operator: {},
    });

    expect(result.ok).toBe(false);
    expect(result.faultResult.ok).toBe(false);
    expect(result.patchResult.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────
// syncTransferMovementToSapBtp — live path
// ─────────────────────────────────────────────────

describe('syncTransferMovementToSapBtp — live path', () => {
  test('cria Movement e faz patch de localização + status', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue({
      ok: true,
      equipment: { ID: '44444444-4444-4444-4444-444444444444', equipmentCode: 'SERRA-006' },
    });
    mockClient.createMovement.mockResolvedValue({ ok: true, body: {} });
    mockClient.patchEquipmentById.mockResolvedValue({ ok: true, body: {} });

    const result = await bridge.syncTransferMovementToSapBtp({
      tool: { code: 'SERRA-006' },
      transfer: { fromLocation: 'Armazem Central', toLocation: 'Torre Boavista - Porto' },
      operator: { name: 'Carlos Matos' },
    });

    expect(result.ok).toBe(true);
    expect(mockClient.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        equipment_ID: '44444444-4444-4444-4444-444444444444',
        movementType: 'NFC_TRANSFER',
        fromLocation: 'Armazem Central',
        toLocation: 'Torre Boavista - Porto',
        createdBy: 'Carlos Matos',
      })
    );
    expect(mockClient.patchEquipmentById).toHaveBeenCalledWith(
      '44444444-4444-4444-4444-444444444444',
      expect.objectContaining({
        status: 'IN_TRANSFER',
        currentLocationName: 'Torre Boavista - Porto',
        lastSeenBy: 'Carlos Matos',
      })
    );
  });

  test('aceita transfer.origin / transfer.destination como aliases', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue({
      ok: true,
      equipment: { ID: 'x', equipmentCode: 'SERRA-006' },
    });
    mockClient.createMovement.mockResolvedValue({ ok: true });
    mockClient.patchEquipmentById.mockResolvedValue({ ok: true });

    await bridge.syncTransferMovementToSapBtp({
      tool: { code: 'SERRA-006' },
      transfer: { origin: 'Armazem', destination: 'Obra Nova' },
      operator: {},
    });

    expect(mockClient.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({ fromLocation: 'Armazem', toLocation: 'Obra Nova' })
    );
  });

  test('result.ok false quando createMovement falha', async () => {
    mockClient.getEquipmentByCode.mockResolvedValue({
      ok: true,
      equipment: { ID: 'x', equipmentCode: 'SERRA-006' },
    });
    mockClient.createMovement.mockResolvedValue({ ok: false, status: 503 });
    mockClient.patchEquipmentById.mockResolvedValue({ ok: true });

    const result = await bridge.syncTransferMovementToSapBtp({
      tool: { code: 'SERRA-006' },
      transfer: { fromLocation: 'A', toLocation: 'B' },
      operator: {},
    });

    expect(result.ok).toBe(false);
    expect(result.movementResult.ok).toBe(false);
  });
});
