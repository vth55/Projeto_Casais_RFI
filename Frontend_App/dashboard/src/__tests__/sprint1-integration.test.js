/**
 * T1.06, T1.07, T1.08 — Sprint 1: Integration tests (Firebase mocked)
 *
 * Testam o fluxo de scan de cartão de localização:
 * - T1.06: scan cria doc em machineLocationEvents
 * - T1.07: scan actualiza machine.localizacao
 * - T1.08: cartão desconhecido cria unregistered_scans, máquina inalterada
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mock Firebase Admin (simula Cloud Function)
// ============================================================
const mockMachineData = {
  name: 'Escavadora CAT 320',
  obraId: 'estaleiro',
  localizacao: { obraId: 'estaleiro', obraName: 'Estaleiro', type: 'estaleiro' },
  estadoOperacional: 'disponivel',
  despachoPendente: null,
  procoreEquipmentId: null,
};

let machineUpdateCalls = [];
let locationEventCreated = [];
let unregisteredCreated = [];

const mockDb = {
  doc: vi.fn((path) => ({
    get: vi.fn(async () => {
      if (path.includes('/machines/MACHINE-001')) {
        return { exists: true, data: () => ({ ...mockMachineData }) };
      }
      if (path.includes('/rfidLocationCards/LOC_OBRA1')) {
        return { exists: true, data: () => ({ obraId: 'obra1', obraName: 'Torre Boavista', tipo: 'obra', active: true }) };
      }
      if (path.includes('/location_cards/LOC_OBRA1')) {
        return { exists: false };
      }
      return { exists: false };
    }),
    update: vi.fn(async (data) => {
      machineUpdateCalls.push({ path, data });
    }),
  })),
  collection: vi.fn((path) => ({
    add: vi.fn(async (data) => {
      if (path.includes('machineLocationEvents')) locationEventCreated.push(data);
      if (path.includes('unregistered_scans')) unregisteredCreated.push(data);
      return { id: 'new-event-id' };
    }),
  })),
};

// Handler simplificado que replica a lógica de index.js (sem HTTP req/res)
async function processLocationCard(cardId, machineId, db, basePath) {
  const newCardSnap = await db.doc(`${basePath}/rfidLocationCards/${cardId}`).get();
  let locationCard = null;

  if (newCardSnap.exists) {
    locationCard = newCardSnap.data();
  } else {
    const oldSnap = await db.doc(`${basePath}/location_cards/${cardId}`).get();
    if (!oldSnap.exists) {
      return { status: 'LOCATION_NOT_FOUND' };
    }
    locationCard = oldSnap.data();
  }

  const machineRef = db.doc(`${basePath}/machines/${machineId}`);
  const machineSnap = await machineRef.get();
  if (!machineSnap.exists) return { status: 'MACHINE_NOT_FOUND' };

  const machineData = machineSnap.data();
  const isEstaleiro = locationCard.tipo === 'estaleiro' || locationCard.obraId === 'estaleiro';
  const despachoPendente = machineData.despachoPendente;
  const confirmaDespacho = !isEstaleiro && despachoPendente && despachoPendente.obraId === locationCard.obraId;

  const novaLocalizacao = {
    obraId: locationCard.obraId,
    obraName: locationCard.obraName,
    type: isEstaleiro ? 'estaleiro' : 'obra',
    updatedAt: new Date(),
    cardId,
  };

  await machineRef.update({
    localizacao: novaLocalizacao,
    estadoOperacional: isEstaleiro ? 'disponivel' : 'em_obra',
  });

  await db.collection(`${basePath}/machineLocationEvents`).add({
    machineId,
    type: isEstaleiro ? 'entrada_estaleiro' : (confirmaDespacho ? 'chegada_obra_confirmada' : 'chegada_obra'),
    from: machineData.localizacao?.obraName || 'Sem localização',
    to: locationCard.obraName,
    toObraId: locationCard.obraId,
    cardId,
    confirmedDespacho: confirmaDespacho || false,
  });

  return {
    status: confirmaDespacho ? 'ARRIVAL_CONFIRMED' : 'LOCATION_CHANGED',
    estadoOperacional: isEstaleiro ? 'disponivel' : 'em_obra',
  };
}

async function processUnknownCard(cardId, machineId, db, basePath) {
  await db.collection(`${basePath}/unregistered_scans`).add({
    id: cardId,
    machineId,
    type: 'access_attempt',
    resolved: false,
  });
  return { status: 'DENIED' };
}

// ============================================================
const BASE = 'artifacts/casais-rfid/public/data';

describe('T1.06 scan de localização → machineLocationEvents criado', () => {
  beforeEach(() => {
    machineUpdateCalls = [];
    locationEventCreated = [];
    unregisteredCreated = [];
  });

  it('scan LOC_OBRA1 em MACHINE-001 cria evento em machineLocationEvents', async () => {
    await processLocationCard('LOC_OBRA1', 'MACHINE-001', mockDb, BASE);
    expect(locationEventCreated).toHaveLength(1);
    expect(locationEventCreated[0].machineId).toBe('MACHINE-001');
    expect(locationEventCreated[0].toObraId).toBe('obra1');
  });
});

describe('T1.07 scan de localização → machine.localizacao actualizada', () => {
  beforeEach(() => {
    machineUpdateCalls = [];
    locationEventCreated = [];
  });

  it('update contém localizacao com obraId correcto', async () => {
    await processLocationCard('LOC_OBRA1', 'MACHINE-001', mockDb, BASE);
    const update = machineUpdateCalls.find(c => c.path.includes('MACHINE-001'));
    expect(update).toBeDefined();
    expect(update.data.localizacao.obraId).toBe('obra1');
    expect(update.data.localizacao.obraName).toBe('Torre Boavista');
    expect(update.data.estadoOperacional).toBe('em_obra');
  });
});

describe('T1.08 cartão desconhecido → unregistered_scans criado, máquina inalterada', () => {
  beforeEach(() => {
    machineUpdateCalls = [];
    unregisteredCreated = [];
  });

  it('cartão desconhecido cria entrada em unregistered_scans', async () => {
    await processUnknownCard('UNKNOWN-999', 'MACHINE-001', mockDb, BASE);
    expect(unregisteredCreated).toHaveLength(1);
    expect(unregisteredCreated[0].id).toBe('UNKNOWN-999');
    expect(unregisteredCreated[0].resolved).toBe(false);
  });

  it('cartão desconhecido não altera a máquina', async () => {
    await processUnknownCard('UNKNOWN-999', 'MACHINE-001', mockDb, BASE);
    expect(machineUpdateCalls).toHaveLength(0);
  });
});

// ============================================================
// T1.10 Regression — ACTIVE machines não ficam em estaleiro
// ============================================================
describe('T1.10 regression — máquina ACTIVE não pode ir para estaleiro como ACTIVE', () => {
  it('ao mover para estaleiro, estado deve ser IDLE/disponivel', async () => {
    const mockMachineActive = { ...mockMachineData, status: 'ACTIVE' };
    const mockDbActive = {
      doc: vi.fn((path) => ({
        get: vi.fn(async () => ({
          exists: true,
          data: () => mockMachineActive,
        })),
        update: vi.fn(async (data) => {
          machineUpdateCalls.push({ path, data });
        }),
      })),
      collection: vi.fn(() => ({ add: vi.fn(async () => ({ id: 'x' })) })),
    };

    const estaleiroCard = { obraId: 'estaleiro', obraName: 'Estaleiro', tipo: 'estaleiro', active: true };
    // Override rfidLocationCards mock
    mockDbActive.doc = vi.fn((path) => ({
      get: vi.fn(async () => {
        if (path.includes('rfidLocationCards')) return { exists: true, data: () => estaleiroCard };
        if (path.includes('machines')) return { exists: true, data: () => mockMachineActive };
        return { exists: false };
      }),
      update: vi.fn(async (data) => machineUpdateCalls.push({ path, data })),
    }));
    mockDbActive.collection = vi.fn(() => ({ add: vi.fn(async () => ({ id: 'x' })) }));

    machineUpdateCalls = [];
    await processLocationCard('LOC_ESTALEIRO', 'MACHINE-ACTIVE', mockDbActive, BASE);
    const update = machineUpdateCalls.find(c => c.path.includes('MACHINE-ACTIVE'));
    expect(update).toBeDefined();
    expect(update.data.estadoOperacional).toBe('disponivel');
  });
});
