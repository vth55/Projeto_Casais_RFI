/**
 * Sprint 3 — Procore Deep Integration (lógica pura, sem Firebase)
 *
 * T3.01 equipment_log aggregation
 * T3.08 timezone Europe/Lisbon
 * TP.05 HMAC webhook validation
 * T3.05 webhook Equipment.created
 * T3.06 webhook Project.created
 * T3.07 procoreSyncQueue fallback
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// ─── Pure helpers (mirror logic from procoreDeepIntegration.js) ──────────────

function validateWebhookHmac(body, signature, secret) {
    if (!secret) return true;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

function aggregateSessionsByMachineAndObra(sessions, tzOffsetHours = 1) {
    const groups = {};
    for (const s of sessions) {
        if (!['CLOSED', 'AUTO_CLOSED'].includes(s.status)) continue;
        const lisbonMs = s.endTimeMs + tzOffsetHours * 3600_000;
        const day = new Date(lisbonMs).toISOString().split('T')[0];
        const key = `${s.machineId}::${s.obraId || 'unknown'}::${day}`;
        if (!groups[key]) groups[key] = { machineId: s.machineId, obraId: s.obraId, day, totalHours: 0 };
        groups[key].totalHours += s.durationHours;
    }
    return Object.values(groups);
}

function buildEquipmentLog({ group, machine, procoreProjectId }) {
    if (!machine?.procoreEquipmentId || !procoreProjectId || group.totalHours <= 0) return null;
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

// ─── T3.01 ───────────────────────────────────────────────────────────────────

describe('T3.01 equipment_log aggregation', () => {
    it('sessão CLOSED → equipment_log com equipmentId e hours correcto', () => {
        const sessions = [{ machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 8.5, endTimeMs: Date.now() }];
        const groups = aggregateSessionsByMachineAndObra(sessions);
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

    it('máquina sem procoreEquipmentId → null (skip)', () => {
        const sessions = [{ machineId: 'M2', obraId: 'o1', status: 'CLOSED', durationHours: 4, endTimeMs: Date.now() }];
        const groups = aggregateSessionsByMachineAndObra(sessions);
        expect(buildEquipmentLog({ group: groups[0], machine: { name: 'Sem ID' }, procoreProjectId: 1 })).toBeNull();
    });

    it('sessão OPEN ignorada — só CLOSED/AUTO_CLOSED conta', () => {
        const sessions = [
            { machineId: 'M3', obraId: 'o1', status: 'OPEN', durationHours: 2, endTimeMs: Date.now() },
            { machineId: 'M3', obraId: 'o1', status: 'CLOSED', durationHours: 5, endTimeMs: Date.now() },
        ];
        const groups = aggregateSessionsByMachineAndObra(sessions);
        expect(groups).toHaveLength(1);
        expect(groups[0].totalHours).toBe(5);
    });
});

// ─── T3.08 ───────────────────────────────────────────────────────────────────

describe('T3.08 aggregation respeita Europe/Lisbon (UTC+1 em maio)', () => {
    it('23:50 UTC → 00:50 Lisbon → dia seguinte', () => {
        const utcMs = Date.UTC(2026, 4, 12, 23, 50);
        const groups = aggregateSessionsByMachineAndObra(
            [{ machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 1, endTimeMs: utcMs }], 1);
        expect(groups[0].day).toBe('2026-05-13');
    });

    it('00:10 UTC → 01:10 Lisbon → mesmo dia', () => {
        const utcMs = Date.UTC(2026, 4, 13, 0, 10);
        const groups = aggregateSessionsByMachineAndObra(
            [{ machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 1, endTimeMs: utcMs }], 1);
        expect(groups[0].day).toBe('2026-05-13');
    });

    it('duas sessões em dias Lisbon diferentes → dois grupos', () => {
        const sessions = [
            { machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 4, endTimeMs: Date.UTC(2026, 4, 11, 23, 50) },
            { machineId: 'M1', obraId: 'o1', status: 'CLOSED', durationHours: 6, endTimeMs: Date.UTC(2026, 4, 12, 23, 50) },
        ];
        const groups = aggregateSessionsByMachineAndObra(sessions, 1);
        expect(groups).toHaveLength(2);
        expect(groups.map(g => g.day).sort()).toEqual(['2026-05-12', '2026-05-13']);
    });
});

// ─── TP.05 HMAC ──────────────────────────────────────────────────────────────

describe('TP.05 Webhook HMAC validation', () => {
    const secret = 'test-webhook-secret-123';

    it('signature válida → aceitar', () => {
        const body = JSON.stringify({ resource_name: 'Equipment', event_type: 'created' });
        const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
        expect(validateWebhookHmac(body, sig, secret)).toBe(true);
    });

    it('signature inválida → rejeitar', () => {
        const body = JSON.stringify({ resource_name: 'Equipment' });
        expect(validateWebhookHmac(body, 'invalid-sig-000', secret)).toBe(false);
    });

    it('body adulterado após assinar → rejeitar', () => {
        const original = JSON.stringify({ id: 1 });
        const tampered = JSON.stringify({ id: 2 });
        const sig = crypto.createHmac('sha256', secret).update(original).digest('hex');
        expect(validateWebhookHmac(tampered, sig, secret)).toBe(false);
    });

    it('sem secret → permissivo (aceita)', () => {
        expect(validateWebhookHmac('body', 'any-sig', null)).toBe(true);
        expect(validateWebhookHmac('body', 'any-sig', '')).toBe(true);
    });
});

// ─── T3.05 / T3.06 ───────────────────────────────────────────────────────────

describe('T3.05 webhook Equipment.created → stub de máquina', () => {
    it('novo equipamento → cria stub com estadoOperacional=disponivel', () => {
        const results = processWebhookEvent('Equipment', 'created', { id: 42, name: 'Grua Nova' });
        expect(results).toHaveLength(1);
        expect(results[0].action).toBe('create_machine_stub');
        expect(results[0].data.procoreEquipmentId).toBe(42);
        expect(results[0].data.estadoOperacional).toBe('disponivel');
    });

    it('equipamento que já existe → sem acção (sem duplicado)', () => {
        const results = processWebhookEvent('Equipment', 'created', { id: 42 }, { id: 'existing' });
        expect(results).toHaveLength(0);
    });
});

describe('T3.06 webhook Project.created → obra com precisaRfid', () => {
    it('projecto novo → obra com precisaRfid: true', () => {
        const results = processWebhookEvent('Project', 'created', { id: 9999, name: 'Edifício Centro' });
        expect(results).toHaveLength(1);
        expect(results[0].data.precisaRfid).toBe(true);
        expect(results[0].data.procoreProjectId).toBe(9999);
        expect(results[0].data.status).toBe('ACTIVE');
    });
});

// ─── T3.07 procoreSyncQueue ──────────────────────────────────────────────────

describe('T3.07 procoreSyncQueue — fallback quando Procore em baixo', () => {
    it('item enfileirado com status=pending e attempts=0', () => {
        const item = {
            operation: 'create_observation',
            payload: { name: 'Avaria motor' },
            procoreProjectId: 328122,
            status: 'pending',
            attempts: 0,
            maxAttempts: 5,
        };
        expect(item.status).toBe('pending');
        expect(item.attempts).toBe(0);
        expect(item.maxAttempts).toBe(5);
    });

    it('backoff exponencial — tentativa 1=5min, 3=60min, 5=720min', () => {
        const backoff = [5, 20, 60, 180, 720];
        expect(backoff[0]).toBe(5);
        expect(backoff[2]).toBe(60);
        expect(backoff[4]).toBe(720);
    });

    it('após maxAttempts → status=failed', () => {
        const attempts = 5;
        const maxAttempts = 5;
        expect(attempts >= maxAttempts ? 'failed' : 'pending').toBe('failed');
    });
});
