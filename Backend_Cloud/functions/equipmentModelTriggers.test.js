'use strict';

const modelDocs = {
  'MODEL-A': { unitCount: 0, activeUnitCount: 0 },
  'MODEL-B': { unitCount: 2, activeUnitCount: 1 },
};
const counterEventDocs = {};
let transactionQueue = Promise.resolve();

function applyValues(previous, updates) {
  return Object.fromEntries(
    Object.entries({ ...previous, ...updates })
      .map(([key, value]) => [key, value?.__increment ? (previous[key] || 0) + value.__increment : value]),
  );
}

function modelRef(id) {
  return { kind: 'model', id };
}

function eventRef(id) {
  return { kind: 'event', id };
}

function snap(ref) {
  const data = ref.kind === 'model' ? modelDocs[ref.id] : counterEventDocs[ref.id];
  return {
    exists: !!data,
    ref,
    data: () => data,
  };
}

const mockDb = {
  collection: (path) => ({
    doc: (id) => path.endsWith('/equipment_model_counter_events') ? eventRef(id) : modelRef(id),
  }),
  runTransaction: (callback) => {
    const run = transactionQueue.then(() => callback({
      get: async (ref) => snap(ref),
      getAll: async (...refs) => refs.map(snap),
      update: (ref, updates) => {
        modelDocs[ref.id] = applyValues(modelDocs[ref.id], updates);
      },
      create: (ref, data) => {
        if (counterEventDocs[ref.id]) throw new Error('already exists');
        counterEventDocs[ref.id] = data;
      },
    }));
    transactionQueue = run.catch(() => {});
    return run;
  },
};

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(() => mockDb, {
    FieldValue: {
      increment: (value) => ({ __increment: value }),
      serverTimestamp: () => 'server-timestamp',
    },
    Timestamp: {
      now: () => 'timestamp',
    },
  }),
}));
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_path, handler) => handler,
  onDocumentDeleted: (_path, handler) => handler,
  onDocumentUpdated: (_path, handler) => handler,
}));
jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_options, handler) => handler,
}));

const { __test } = require('./equipmentModelTriggers');

beforeEach(() => {
  modelDocs['MODEL-A'] = { unitCount: 0, activeUnitCount: 0 };
  modelDocs['MODEL-B'] = { unitCount: 2, activeUnitCount: 1 };
  Object.keys(counterEventDocs).forEach(key => delete counterEventDocs[key]);
  transactionQueue = Promise.resolve();
});

describe('Equipment model counters', () => {
  test('builds deltas for create, delete, retirement and model move', () => {
    expect(__test.buildCounterDeltas(null, { modelId: 'MODEL-A', status: 'AVAILABLE' }))
      .toEqual([{ modelId: 'MODEL-A', unitCount: 1, activeUnitCount: 1 }]);
    expect(__test.buildCounterDeltas({ modelId: 'MODEL-A', status: 'RETIRED' }, null))
      .toEqual([{ modelId: 'MODEL-A', unitCount: -1, activeUnitCount: 0 }]);
    expect(__test.buildCounterDeltas(
      { modelId: 'MODEL-A', status: 'AVAILABLE' },
      { modelId: 'MODEL-A', status: 'RETIRED' },
    )).toEqual([{ modelId: 'MODEL-A', unitCount: 0, activeUnitCount: -1 }]);
    expect(__test.buildCounterDeltas(
      { modelId: 'MODEL-A', status: 'AVAILABLE' },
      { modelId: 'MODEL-B', status: 'AVAILABLE' },
    )).toEqual([
      { modelId: 'MODEL-A', unitCount: -1, activeUnitCount: -1 },
      { modelId: 'MODEL-B', unitCount: 1, activeUnitCount: 1 },
    ]);
  });

  test('applies a retried event only once', async () => {
    const delta = [{ modelId: 'MODEL-A', unitCount: 1, activeUnitCount: 1 }];

    await Promise.all([
      __test.applyCounterEvent('event-1', delta),
      __test.applyCounterEvent('event-1', delta),
    ]);

    expect(modelDocs['MODEL-A']).toMatchObject({ unitCount: 1, activeUnitCount: 1 });
    expect(Object.keys(counterEventDocs)).toEqual(['event-1']);
  });

  test('applies concurrent distinct events without losing counts', async () => {
    const delta = [{ modelId: 'MODEL-A', unitCount: 1, activeUnitCount: 1 }];

    await Promise.all([
      __test.applyCounterEvent('event-1', delta),
      __test.applyCounterEvent('event-2', delta),
    ]);

    expect(modelDocs['MODEL-A']).toMatchObject({ unitCount: 2, activeUnitCount: 2 });
  });
});
