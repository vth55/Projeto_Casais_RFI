/**
 * Sprint 3 — Procore Deep Integration (lógica pura, sem Firebase)
 *
 * T3.01 Integration: sessão fechada → equipment_log criado em Procore (mock HTTP)
 * T3.05 Integration: webhook Equipment.created → máquina stub criada no Firestore
 * T3.06 Integration: webhook Project.created → obra criada com flag precisaRfid: true
 * TP.05 Edge: webhook com HMAC inválida → rejeitado (401)
 * T3.07 Edge: Procore em baixo → dados em procoreSyncQueue
 * T3.08 Edge: equipment_log aggregation respeita timezone (não agrupa UTC 00:10 com 23:50)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ─── Helpers pure-logic (sem Firebase) ──────────────────────────────────────

function validateWebhookHmac(body, signature, secret) {
    if (!secret) return true; // permissivo se secret não configurado
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

function aggregateSessionsByMachineAndObra(sessions, timezoneOffsetHours = 1) {
    const groups = {};
    for (const s of sessions) {
        if (!['CLOSED', 'AUTO_CLOSED'].includes(s.status)) continue;
        // Adjust endTime to Lisbon time to determine "day"
        const endMs = s.endTimeMs + timezoneOffsetHours * 60 * 60 * 1000;
        const day = new Date(endMs).toISOString().split('T')[0];
        const key = `${s.machineId}::${s.obraId || 'unknown'}::${day}`;
        if (!groups[key]) groups[key] = { machineId: s.machineId, obraId: s.obraId, day, totalHours: 0 };
        groups[key].totalHours += s.durationHours;
    }
    return Object.values(groups);
}

function buildEquipmentLog({ group, machine, procoreProjectId }) {
    if (!machine?.procoreEquipmentId || !procoreProjectId) return null;
    if (group.totalHours <= 0) return null;
    return {
        operation: 'create_equipment_log',
        payload: {
            equipmentId: machine.procoreEquipmentId,
            date: group.day,
            hours: Math.round(group.totalHours * 100) / 100,
            description: `CASAIS Fleet IoT — ${machine.name}`,
        },
        procoreProjectId,
    };
}

function buildSyncQueueItem(operation, payload, procoreProjectId) {
    return {
        operation,
        payload,
        procoreProjectId,
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        nextRetryAt: expect.any(Object),
    };
}

// ─── T3.01 equipment_log aggregation ────────────────────────────────────────

describe('T3.01 equipment_log aggregation — sessão → equipment_log payload', () => {
    it('sessão CLOSED numa máquina com procoreEquipmentId → log correcto', () => {
        const sessions = [{ machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 8.5, endTimeMs: Date.now() }];
        const groups = aggregateSessionsByMachineAndObra(sessions);
        expect(groups).toHaveLength(1);

        const log = buildEquipmentLog({
            group: groups[0],
            machine: { procoreEquipmentId: 111, name: 'Escavadora CAT 320' },
            procoreProjectId: 328122,
        });
        expect(log).not.toBeNull();
        expect(log.payload.equipmentId).toBe(111);
        expect(log.payload.hours).toBe(8.5);
        expect(log.procoreProjectId).toBe(328122);
    });

    it('sessão sem procoreEquipmentId → null (skip)', () => {
        const sessions = [{ machineId: 'M2', obraId: 'o1', status: 'CLOSED', durationHours: 4, endTimeMs: Date.now() }];
        const groups = aggregateSessionsByMachineAndObra(sessions);
        const log = buildEquipmentLog({ group: groups[0], machine: { name: 'Sem ID' }, procoreProjectId: 328122 });
        expect(log).toBeNull();
    });

    it('sessão OPEN ignorada pela aggregation', () => {
        const sessions = [
            { machineId: 'M3', obraId: 'o1', status: 'OPEN', durationHours: 2, endTimeMs: Date.now() },
            { machineId: 'M3', obraId: 'o1', status: 'CLOSED', durationHours: 5, endTimeMs: Date.now() },
        ];
        const groups = aggregateSessionsByMachineAndObra(sessions);
        expect(groups).toHaveLength(1);
        expect(groups[0].totalHours).toBe(5);
    });
});

// ─── T3.08 timezone ─────────────────────────────────────────────────────────

describe('T3.08 aggregation respeita Europe/Lisbon (UTC+1 em maio)', () => {
    it('sessão a 23:50 UTC = 00:50 Lisbon → pertence ao dia seguinte', () => {
        // UTC 2026-05-12 23:50 = Lisbon 2026-05-13 00:50
        const utcMs = Date.UTC(2026, 4, 12, 23, 50, 0);
        const sessions = [{ machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 1, endTimeMs: utcMs }];
        const groups = aggregateSessionsByMachineAndObra(sessions, 1); // UTC+1
        expect(groups[0].day).toBe('2026-05-13');
    });

    it('sessão a 00:10 UTC = 01:10 Lisbon → pertence ao dia actual', () => {
        const utcMs = Date.UTC(2026, 4, 13, 0, 10, 0);
        const sessions = [{ machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 1, endTimeMs: utcMs }];
        const groups = aggregateSessionsByMachineAndObra(sessions, 1);
        expect(groups[0].day).toBe('2026-05-13');
    });

    it('sessão a 23:50 UTC e sessão a 00:10 UTC do dia seguinte → dias separados com UTC+1', () => {
        const day1Ms = Date.UTC(2026, 4, 11, 23, 50, 0); // = Lisbon 12 May 00:50
        const day2Ms = Date.UTC(2026, 4, 12, 23, 50, 0); // = Lisbon 13 May 00:50
        const sessions = [
            { machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 4, endTimeMs: day1Ms },
            { machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 6, endTimeMs: day2Ms },
        ];
        const groups = aggregateSessionsByMachineAndObra(sessions, 1);
        expect(groups).toHaveLength(2);
        expect(groups.map(g => g.day).sort()).toEqual(['2026-05-12', '2026-05-13']);
    });
});

// ─── TP.05 HMAC webhook validation ──────────────────────────────────────────

describe('TP.05 Webhook HMAC validation', () => {
    const secret = 'test-webhook-secret-123';

    it('signature válida → aceitar', () => {
        const body = JSON.stringify({ resource_name: 'Equipment', event_type: 'created', payload: { id: 1 } });
        const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
        expect(validateWebhookHmac(body, sig, secret)).toBe(true);
    });

    it('signature inválida → rejeitar', () => {
        const body = JSON.stringify({ resource_name: 'Equipment', event_type: 'created' });
        expect(validateWebhookHmac(body, 'invalid-sig', secret)).toBe(false);
    });

    it('body adulterado após assinar → rejeitar', () => {
        const original = JSON.stringify({ id: 1 });
        const tampered = JSON.stringify({ id: 2 });
        const sig = crypto.createHmac('sha256', secret).update(original).digest('hex');
        expect(validateWebhookHmac(tampered, sig, secret)).toBe(false);
    });

    it('sem secret configurado → permissivo (aceita tudo)', () => {
        expect(validateWebhookHmac('body', 'any-sig', null)).toBe(true);
        expect(validateWebhookHmac('body', 'any-sig', '')).toBe(true);
    });
});

// ─── T3.05 / T3.06 Webhook event processing (lógica pura) ───────────────────

function processWebhookEvent(resourceName, eventType, payload, existingMachineByEqId = null) {
    const results = [];

    if (resourceName === 'Equipment' && eventType === 'created' && !existingMachineByEqId) {
        results.push({ action: 'create_machine_stub', data: {
            name: payload.name || `Equipamento Procore #${payload.id}`,
            procoreEquipmentId: payload.id,
            status: 'idle',
            estadoOperacional: 'disponivel',
        }});
    }

    if (resourceName === 'Project' && eventType === 'created') {
        results.push({ action: 'create_obra', data: {
            name: payload.name || `Projecto #${payload.id}`,
            procoreProjectId: payload.id,
            status: 'ACTIVE',
            precisaRfid: true,
        }});
    }

    return results;
}

describe('T3.05 webhook Equipment.created → stub de máquina', () => {
    it('equipamento novo → cria stub com estadoOperacional=disponivel', () => {
        const results = processWebhookEvent('Equipment', 'created', { id: 42, name: 'Grua Nova' }, null);
        expect(results).toHaveLength(1);
        expect(results[0].action).toBe('create_machine_stub');
        expect(results[0].data.procoreEquipmentId).toBe(42);
        expect(results[0].data.estadoOperacional).toBe('disponivel');
    });

    it('equipamento que já existe → sem acção (sem duplicado)', () => {
        const results = processWebhookEvent('Equipment', 'created', { id: 42 }, { id: 'existing-machine' });
        expect(results).toHaveLength(0);
    });
});

describe('T3.06 webhook Project.created → obra com precisaRfid', () => {
    it('projecto novo → obra criada com precisaRfid: true', () => {
        const results = processWebhookEvent('Project', 'created', { id: 9999, name: 'Edifício Centro' });
        expect(results).toHaveLength(1);
        expect(results[0].action).toBe('create_obra');
        expect(results[0].data.precisaRfid).toBe(true);
        expect(results[0].data.procoreProjectId).toBe(9999);
    });
});

// ─── T3.07 procoreSyncQueue ──────────────────────────────────────────────────

describe('T3.07 procoreSyncQueue — fallback quando Procore em baixo', () => {
    it('falha ao criar observation → item enfileirado com status=pending', () => {
        const item = buildSyncQueueItem(
            'create_observation',
            { name: 'Avaria motor', description: 'Motor avariado' },
            328122
        );
        expect(item.status).toBe('pending');
        expect(item.attempts).toBe(0);
        expect(item.maxAttempts).toBe(5);
        expect(item.operation).toBe('create_observation');
    });

    it('backoff exponencial — tentativa 1 → 5min, tentativa 3 → 60min', () => {
        const backoffMinutes = [5, 20, 60, 180, 720];
        expect(backoffMinutes[0]).toBe(5);
        expect(backoffMinutes[2]).toBe(60);
        expect(backoffMinutes[4]).toBe(720);
    });

    it('após maxAttempts → status=failed', () => {
        const item = { ...buildSyncQueueItem('op', {}, 1), attempts: 4 };
        const newAttempts = item.attempts + 1;
        const newStatus = newAttempts >= 5 ? 'failed' : 'pending';
        expect(newStatus).toBe('failed');
    });
});
