/**
 * LEGACY -- heavy machines model (pre-pivot 2026-05).
 * Ver Backend_Cloud/functions/procore/_pivotStrategy.js.
 * Nao consumir tool_sessions aqui. Quando houver exporter novo para tool_movements,
 * estes ficheiros serao apagados.
 */
/**
 * CASAIS Fleet Intelligence — Procore → PWA Projector
 *
 * Após cada sync do Procore, projecta os dados para o lado operacional da PWA:
 *   - equipment  → cria/actualiza machine stubs em machines/{procore_<id>}
 *   - directory  → cria/actualiza pending_operators/{procoreUserId}
 *
 * Regras de merge:
 *   - Na CRIAÇÃO do stub: define name, category, source, pairingStatus, procoreEquipmentId.
 *   - Em actualizações subsequentes: NUNCA sobrescreve consumptionRate, currentTariff,
 *     tariffHistory, category (editáveis pelo admin na PWA). Só actualiza campos Procore.
 */

const admin = require('firebase-admin');

const APP_ID = 'casais-rfid';
const BASE_PATH = `artifacts/${APP_ID}/public/data`;
const MACHINES_PATH = `${BASE_PATH}/machines`;
const OPERATORS_PATH = `${BASE_PATH}/operators`;
const PENDING_OPERATORS_PATH = `${BASE_PATH}/pending_operators`;
const INTEGRATION_DOC_PATH = `${BASE_PATH}/integrations/procore`;
const OBRAS_PATH = `${BASE_PATH}/obras`;
const EQUIPMENT_COLLECTION = `${INTEGRATION_DOC_PATH}/equipment`;
const DIRECTORY_COLLECTION = `${INTEGRATION_DOC_PATH}/directory`;
const PROJECTS_COLLECTION = `${INTEGRATION_DOC_PATH}/projects`;

// ── Mapeamento padrão EN → PT (pode ser sobrescrito por integrations/procore.categoryMap) ──

const DEFAULT_CATEGORY_MAP = {
    'excavator':                'escavadoras',
    'excavators':               'escavadoras',
    'hydraulic excavator':      'escavadoras',
    'tracked excavator':        'escavadoras',
    'backhoe':                  'retroescavadoras',
    'backhoe loader':           'retroescavadoras',
    'crane':                    'gruas',
    'tower crane':              'gruas',
    'mobile crane':             'gruas',
    'lifting equipment':        'gruas',
    'concrete mixer':           'betoneiras',
    'concrete':                 'betoneiras',
    'mixer':                    'betoneiras',
    'truck':                    'camioes',
    'dump truck':               'camioes',
    'transportation':           'camioes',
    'forklift':                 'empilhadores',
    'telehandler':              'empilhadores',
    'material handling':        'empilhadores',
    'compressor':               'compressores',
    'air compressor':           'compressores',
    'compaction':               'compactadores',
    'compactor':                'compactadores',
    'roller':                   'compactadores',
    'generator':                'geradores',
    'power generator':          'geradores',
    'earthmoving':              'escavadoras',
    'earthmoving equipment':    'escavadoras',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function mapCategory(rawCategory, overrideMap = {}) {
    if (!rawCategory) return null;
    const map = { ...DEFAULT_CATEGORY_MAP, ...overrideMap };
    const norm = normalizeStr(
        typeof rawCategory === 'object' ? (rawCategory.name || rawCategory.node_name || '') : rawCategory
    );
    if (!norm) return null;
    // Direct match
    if (map[norm]) return map[norm];
    // Substring match
    for (const [key, val] of Object.entries(map)) {
        if (norm.includes(key) || key.includes(norm)) return val;
    }
    return null;
}

function extractCustomField(obj, fieldKey, customFieldIds) {
    if (!obj || !obj.custom_fields) return null;
    if (!customFieldIds?.[fieldKey]?.id) return null;
    const targetId = customFieldIds[fieldKey].id;
    const field = obj.custom_fields.find(f => f.id === targetId);
    return field?.value || null;
}

// Mapeia stage do Procore → status da PWA (ACTIVE | PLANNED | COMPLETED)
function mapProcoreStatus(procoreProject) {
    // Preferir project_stage.name se disponível (mais preciso que status genérico)
    const stage = (procoreProject?.project_stage?.name || procoreProject?.stage || '').toLowerCase();
    const active = procoreProject?.active !== false;

    if (!active) return 'COMPLETED';
    if (stage.includes('preconstruction') || stage.includes('bidding') || stage.includes('design')) return 'PLANNED';
    if (stage.includes('closeout') || stage.includes('warranty') || stage.includes('completed')) return 'COMPLETED';
    if (stage.includes('construction') || stage.includes('course')) return 'ACTIVE';
    // Fallback: active=true → ACTIVE
    return active ? 'ACTIVE' : 'COMPLETED';
}

// ── Main projector ────────────────────────────────────────────────────────────

async function projectProcoreToPwa() {
    const firestore = admin.firestore();
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

    // Ler categoryMap e customFields do doc de integração
    const intSnap = await firestore.doc(INTEGRATION_DOC_PATH).get();
    const intData = intSnap.data() || {};
    const categoryMap = intData.categoryMap || {};
    const customFieldIds = intData.customFields || {};

    let obrasCreated = 0;
    let obrasUpdated = 0;
    let machinesCreated = 0;
    let machinesUpdated = 0;
    let operatorsCreated = 0;
    let operatorsUpdated = 0;

    // ── 0. Projects → obras ───────────────────────────────────────────────────
    const projSnap = await firestore.collection(PROJECTS_COLLECTION).get();

    for (const doc of projSnap.docs) {
        const p = doc.data();
        if (!p.id || !p.name) continue;
        // Ignorar templates e projectos sem localização útil
        if ((p.name || '').toLowerCase().includes('template')) continue;

        const obraId = `procore_${p.id}`;
        const obraRef = firestore.doc(`${OBRAS_PATH}/${obraId}`);
        const existing = await obraRef.get();

        const procoreFields = {
            procoreProjectId: p.id,
            procoreProjectName: p.name,
            procoreSyncedAt: serverTimestamp(),
            source: 'procore',
        };

        if (p.latitude && p.longitude) {
            procoreFields.gps = { latitude: p.latitude, longitude: p.longitude };
        }

        // Campos adicionais do Procore
        if (p.project_number) procoreFields.projectNumber = p.project_number;
        if (p.phone)          procoreFields.phone = p.phone;
        if (p.country_code)   procoreFields.countryCode = p.country_code;
        if (p.project_stage?.name) procoreFields.stage = p.project_stage.name;
        if (p.display_name)   procoreFields.displayName = p.display_name;

        if (!existing.exists) {
            await obraRef.set({
                ...procoreFields,
                name: p.name,
                address: p.address || '',
                city: p.city || '',
                zip: p.zip || '',
                code: p.project_number || '',   // código da obra (ex: CSI-2024-001)
                description: p.work_scope || p.description || '',
                manager: '',
                status: mapProcoreStatus(p),
                startDate: p.start_date || null,
                endDate: p.completion_date || p.projected_finish_date || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            obrasCreated++;
            console.log(`[projector] obra criada: ${p.name} (${obraId}) @ ${p.latitude},${p.longitude}`);
        } else {
            // Actualizar campos do catálogo Procore — preservar edições do admin (manager, description custom)
            await obraRef.set({
                ...procoreFields,
                name: p.name,
                address: p.address || '',
                city: p.city || '',
                zip: p.zip || '',
                code: p.project_number || existing.data().code || '',
                status: mapProcoreStatus(p),
                startDate: p.start_date || null,
                endDate: p.completion_date || p.projected_finish_date || null,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            obrasUpdated++;
        }
    }

    // ── 1. Equipment → machine stubs ─────────────────────────────────────────
    const eqSnap = await firestore.collection(EQUIPMENT_COLLECTION).get();

    // Pre-load all existing machines for name-based dedup (mach-* docs take precedence)
    const machinesSnap = await firestore.collection(MACHINES_PATH).get();
    const existingByProcoreId = new Map();
    const existingByName = new Map();
    for (const mDoc of machinesSnap.docs) {
        const md = mDoc.data();
        if (md.procoreEquipmentId) existingByProcoreId.set(String(md.procoreEquipmentId), mDoc);
        const normName = normalizeStr(md.name || '');
        if (normName && !mDoc.id.startsWith('procore_')) existingByName.set(normName, mDoc);
    }

    const activeProcoreIds = new Set();

    for (const doc of eqSnap.docs) {
        const e = doc.data();
        if (!e.id) continue;

        // Skip equipment removed from Procore (marked by persistCollection mirror mode)
        if (e._removed_at) continue;
        // Skip equipment renamed [REMOVIDO] (legacy workaround — no longer needed once deleted from Procore)
        if (String(e.name || '').includes('[REMOVIDO]')) continue;

        activeProcoreIds.add(String(e.id));

        // Resolve target doc: prefer existing mach-* by procoreId, then by name, else new stub
        let machineRef;
        if (existingByProcoreId.has(String(e.id))) {
            machineRef = existingByProcoreId.get(String(e.id)).ref;
        } else {
            const normName = normalizeStr(e.name || '');
            if (normName && existingByName.has(normName)) {
                machineRef = existingByName.get(normName).ref;
            } else {
                machineRef = firestore.doc(`${MACHINES_PATH}/procore_${e.id}`);
            }
        }
        const existing = await machineRef.get();

        const rfidFromProcore = extractCustomField(e, 'rfidReaderId', customFieldIds.equipment);
        const isPaired = !!rfidFromProcore;

        const procoreFields = {
            procoreEquipmentId: e.id,
            procoreEquipmentNumber: e.equipment_number || e.name || null,
            procoreCategoryRaw: typeof e.category === 'object'
                ? (e.category?.name || e.category?.node_name || null)
                : (e.category || null),
            procoreSyncedAt: serverTimestamp(),
        };

        if (rfidFromProcore) {
            procoreFields.rfidReaderId = rfidFromProcore;
            procoreFields.pairingStatus = 'paired';
        }

        if (!existing.exists) {
            const categoryPt = mapCategory(e.category, categoryMap);
            const stub = {
                ...procoreFields,
                name: e.name || `Equipamento Procore ${e.id}`,
                status: 'IDLE',
                obraId: 'estaleiro',
                totalHours: 0,
                consumptionRate: 0,
                currentTariff: null,
                tariffHistory: [],
                category: categoryPt || null,
                source: 'procore',
                pairingStatus: isPaired ? 'paired' : 'unpaired',
                createdAt: serverTimestamp(),
            };
            await machineRef.set(stub);
            machinesCreated++;
            console.log(`[projector] machine stub criado: ${stub.name} (${machineRef.id})`);
        } else {
            await machineRef.set(procoreFields, { merge: true });
            machinesUpdated++;
        }
    }

    // ── 1b. Cleanup machines whose Procore equipment was deleted ─────────────
    let machinesArchived = 0;
    let machinesDeleted = 0;
    for (const mDoc of machinesSnap.docs) {
        const md = mDoc.data();
        if (!md.procoreEquipmentId) continue;
        if (activeProcoreIds.has(String(md.procoreEquipmentId))) continue;

        // This machine's Procore counterpart is gone
        if (mDoc.id.startsWith('procore_')) {
            // Pure stub — delete it
            await mDoc.ref.delete();
            machinesDeleted++;
            console.log(`[projector] machine stub removido (Procore deletou): ${md.name} (${mDoc.id})`);
        } else {
            // Merged mach-* doc — keep operational data, flag as disconnected from Procore
            await mDoc.ref.set({
                procoreEquipmentId: admin.firestore.FieldValue.delete(),
                procoreEquipmentNumber: admin.firestore.FieldValue.delete(),
                procoreCategoryRaw: admin.firestore.FieldValue.delete(),
                pairingStatus: 'procore_removed',
                procoreRemovedAt: serverTimestamp(),
            }, { merge: true });
            machinesArchived++;
            console.log(`[projector] machine desligada do Procore: ${md.name} (${mDoc.id})`);
        }
    }

    // ── 2. Directory → pending_operators ─────────────────────────────────────
    const dirSnap = await firestore.collection(DIRECTORY_COLLECTION).get();

    for (const doc of dirSnap.docs) {
        const u = doc.data();
        if (!u.id) continue;

        // Ver se já existe operador emparelhado com este procoreUserId
        const pairedSnap = await firestore.collection(OPERATORS_PATH)
            .where('procoreUserId', '==', u.id)
            .limit(1)
            .get();

        if (!pairedSnap.empty) {
            // Já emparelhado — actualizar nome/email sem tocar em cardId
            await pairedSnap.docs[0].ref.set({
                name: u.name || pairedSnap.docs[0].data().name,
                email: u.email_address || u.email || pairedSnap.docs[0].data().email,
                procoreSyncedAt: serverTimestamp(),
            }, { merge: true });
            operatorsUpdated++;
            continue;
        }

        // Criar/actualizar pending_operator
        const pendingRef = firestore.doc(`${PENDING_OPERATORS_PATH}/${u.id}`);
        await pendingRef.set({
            procoreUserId: u.id,
            name: u.name || '',
            email: u.email_address || u.email || '',
            jobTitle: u.job_title || null,
            procoreSyncedAt: serverTimestamp(),
            source: 'procore',
            pairingStatus: 'unpaired',
        }, { merge: true });
        operatorsCreated++;
    }

    // Seed do categoryMap padrão se ainda não existe no Firestore
    if (!intData.categoryMap) {
        await firestore.doc(INTEGRATION_DOC_PATH).set(
            { categoryMap: DEFAULT_CATEGORY_MAP },
            { merge: true }
        );
        console.log('[projector] categoryMap padrão gravado em Firestore');
    }

    console.log(
        `[projector] done — obras: +${obrasCreated} created, ${obrasUpdated} updated | ` +
        `machines: +${machinesCreated} created, ${machinesUpdated} updated, ` +
        `${machinesArchived} archived, ${machinesDeleted} stubs deleted | ` +
        `operators: +${operatorsCreated} pending, ${operatorsUpdated} updated`
    );

    return { obrasCreated, obrasUpdated, machinesCreated, machinesUpdated, machinesArchived, machinesDeleted, operatorsCreated, operatorsUpdated };
}

module.exports = { projectProcoreToPwa, mapCategory, DEFAULT_CATEGORY_MAP };
