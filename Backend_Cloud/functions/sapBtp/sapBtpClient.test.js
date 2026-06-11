'use strict';

/**
 * sapBtpClient.test.js
 *
 * Testa o cliente HTTP isolado para o SAP BTP OData endpoint.
 * Todos os testes mocam fetch — nenhuma chamada HTTP real é feita.
 */

let client;

beforeAll(() => {
  // URL de teste fixa para todos os testes neste ficheiro
  process.env.SAP_BTP_BASE_URL = 'https://test.btp.example.com/equipment';
  process.env.SAP_BTP_TIMEOUT_MS = '5000';
  client = require('./sapBtpClient');
});

afterAll(() => {
  delete process.env.SAP_BTP_BASE_URL;
  delete process.env.SAP_BTP_TIMEOUT_MS;
  delete process.env.SAP_BTP_ENABLED;
});

beforeEach(() => {
  global.fetch = jest.fn();
  delete process.env.SAP_BTP_ENABLED;
});

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function mockFetchOk(body, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function mockFetchError(status, body = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => body,
  });
}

function mockFetchNetworkError(message = 'Network failure') {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

function mockFetchAbortError() {
  const err = new Error('This operation was aborted');
  err.name = 'AbortError';
  global.fetch = jest.fn().mockRejectedValue(err);
}

// ─────────────────────────────────────────────────
// Feature flag OFF (default)
// ─────────────────────────────────────────────────

describe('feature flag OFF — sem SAP_BTP_ENABLED=true', () => {
  test('getEquipmentByCode retorna skipped sem chamar fetch', async () => {
    const result = await client.getEquipmentByCode('MART-002');
    expect(result).toEqual({ skipped: true, reason: 'SAP_BTP_DISABLED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('patchEquipmentById retorna skipped sem chamar fetch', async () => {
    const result = await client.patchEquipmentById('abc-123', { status: 'AVAILABLE' });
    expect(result).toEqual({ skipped: true, reason: 'SAP_BTP_DISABLED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('patchEquipmentByCode retorna skipped sem chamar fetch', async () => {
    const result = await client.patchEquipmentByCode('MART-002', { currentLocationName: 'Piso 5' });
    expect(result).toEqual({ skipped: true, reason: 'SAP_BTP_DISABLED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('createFaultReport retorna skipped sem chamar fetch', async () => {
    const result = await client.createFaultReport({ faultType: 'DAMAGE', equipment_ID: 'x' });
    expect(result).toEqual({ skipped: true, reason: 'SAP_BTP_DISABLED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('createMovement retorna skipped sem chamar fetch', async () => {
    const result = await client.createMovement({ movementType: 'NFC_CHECKOUT', equipment_ID: 'x' });
    expect(result).toEqual({ skipped: true, reason: 'SAP_BTP_DISABLED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────
// getEquipmentByCode
// ─────────────────────────────────────────────────

describe('getEquipmentByCode', () => {
  beforeEach(() => { process.env.SAP_BTP_ENABLED = 'true'; });

  test('retorna equipment quando encontrado', async () => {
    const equipment = { ID: '11111111-1111-1111-1111-111111111111', equipmentCode: 'MART-002', name: 'BOSCH Martelo' };
    mockFetchOk({ value: [equipment] });

    const result = await client.getEquipmentByCode('MART-002');

    expect(result.ok).toBe(true);
    expect(result.equipment).toEqual(equipment);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('MART-002');
    expect(url).toContain('Equipments');
    expect(url).toContain('$filter');
  });

  test('retorna equipment null quando não encontrado', async () => {
    mockFetchOk({ value: [] });

    const result = await client.getEquipmentByCode('MISSING-999');

    expect(result.ok).toBe(true);
    expect(result.equipment).toBeNull();
  });

  test('equipmentCode vazio retorna erro sem chamar fetch', async () => {
    const result = await client.getEquipmentByCode('');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('equipmentCode required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('equipmentCode null retorna erro sem chamar fetch', async () => {
    const result = await client.getEquipmentByCode(null);
    expect(result.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('HTTP 500 retorna ok:false com status sem throw', async () => {
    mockFetchError(500, { error: 'Internal Server Error' });
    const result = await client.getEquipmentByCode('MART-002');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  test('network error retorna ok:false sem throw', async () => {
    mockFetchNetworkError('ECONNREFUSED');
    const result = await client.getEquipmentByCode('MART-002');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('ECONNREFUSED');
  });

  test('timeout (AbortError) retorna ok:false error=timeout', async () => {
    mockFetchAbortError();
    const result = await client.getEquipmentByCode('MART-002');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('timeout');
  });
});

// ─────────────────────────────────────────────────
// patchEquipmentById
// ─────────────────────────────────────────────────

describe('patchEquipmentById', () => {
  beforeEach(() => { process.env.SAP_BTP_ENABLED = 'true'; });

  test('chama PATCH com URL e payload corretos', async () => {
    mockFetchOk({ ID: 'abc-123', status: 'IN_USE' });

    const result = await client.patchEquipmentById('abc-123', { status: 'IN_USE' });

    expect(result.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('Equipments(abc-123)');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ status: 'IN_USE' });
  });

  test('id vazio retorna erro sem chamar fetch', async () => {
    const result = await client.patchEquipmentById('', { status: 'AVAILABLE' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('id required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('payload vazio retorna erro sem chamar fetch', async () => {
    const result = await client.patchEquipmentById('abc-123', {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain('payload required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('HTTP 404 retorna ok:false sem throw', async () => {
    mockFetchError(404, { message: 'Not Found' });
    const result = await client.patchEquipmentById('missing-id', { status: 'AVAILABLE' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  test('HTTP 500 retorna ok:false sem throw', async () => {
    mockFetchError(500);
    const result = await client.patchEquipmentById('abc-123', { status: 'AVAILABLE' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  test('timeout retorna ok:false error=timeout', async () => {
    mockFetchAbortError();
    const result = await client.patchEquipmentById('abc-123', { currentLocationName: 'Piso 5' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('timeout');
  });

  test('inclui GPS + location no payload sem modificação', async () => {
    mockFetchOk({});
    const payload = { latitude: 41.157944, longitude: -8.629105, currentLocationName: 'Piso 5' };
    await client.patchEquipmentById('abc-123', payload);
    const [, opts] = global.fetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual(payload);
  });
});

// ─────────────────────────────────────────────────
// patchEquipmentByCode
// ─────────────────────────────────────────────────

describe('patchEquipmentByCode', () => {
  beforeEach(() => { process.env.SAP_BTP_ENABLED = 'true'; });

  test('resolve code para ID e faz PATCH (2 chamadas fetch)', async () => {
    const equipment = { ID: 'abc-123', equipmentCode: 'MART-002' };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ value: [equipment] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    const result = await client.patchEquipmentByCode('MART-002', { currentLocationName: 'Piso 10 - Cobertura' });

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [patchUrl, patchOpts] = global.fetch.mock.calls[1];
    expect(patchUrl).toContain('abc-123');
    expect(JSON.parse(patchOpts.body).currentLocationName).toBe('Piso 10 - Cobertura');
  });

  test('equipment não encontrado retorna erro controlado sem PATCH', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ value: [] }) });

    const result = await client.patchEquipmentByCode('MISSING-999', { status: 'AVAILABLE' });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('GET falha propaga erro sem chamar PATCH', async () => {
    mockFetchError(503);
    const result = await client.patchEquipmentByCode('MART-002', { status: 'AVAILABLE' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────
// createFaultReport
// ─────────────────────────────────────────────────

describe('createFaultReport', () => {
  beforeEach(() => { process.env.SAP_BTP_ENABLED = 'true'; });

  test('POST para /FaultReports com payload correto', async () => {
    const fault = { equipment_ID: 'abc-123', faultType: 'DAMAGE', status: 'OPEN', reportedBy: 'Ana Costa', description: 'Disco partido' };
    mockFetchOk({ ID: 'fault-1', ...fault }, 201);

    const result = await client.createFaultReport(fault);

    expect(result.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('FaultReports');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(fault);
  });

  test('payload null retorna erro sem chamar fetch', async () => {
    const result = await client.createFaultReport(null);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('payload required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('HTTP 400 retorna ok:false com status', async () => {
    mockFetchError(400, { message: 'Bad Request' });
    const result = await client.createFaultReport({ equipment_ID: 'x' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test('timeout retorna ok:false error=timeout', async () => {
    mockFetchAbortError();
    const result = await client.createFaultReport({ equipment_ID: 'x' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('timeout');
  });
});

// ─────────────────────────────────────────────────
// createMovement
// ─────────────────────────────────────────────────

describe('createMovement', () => {
  beforeEach(() => { process.env.SAP_BTP_ENABLED = 'true'; });

  test('POST para /Movements com payload correto', async () => {
    const mov = { equipment_ID: 'abc-123', movementType: 'NFC_CHECKOUT', fromLocation: 'Armazem Central', toLocation: 'Torre Boavista', createdBy: 'João' };
    mockFetchOk({ ID: 'mov-1', ...mov }, 201);

    const result = await client.createMovement(mov);

    expect(result.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('Movements');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(mov);
  });

  test('payload null retorna erro sem chamar fetch', async () => {
    const result = await client.createMovement(null);
    expect(result.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('HTTP 500 retorna ok:false sem throw', async () => {
    mockFetchError(500);
    const result = await client.createMovement({ equipment_ID: 'x' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  test('network error retorna ok:false sem throw', async () => {
    mockFetchNetworkError('socket hang up');
    const result = await client.createMovement({ equipment_ID: 'x' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('socket hang up');
  });
});
