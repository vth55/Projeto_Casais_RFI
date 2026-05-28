/**
 * CASAIS Fleet Intelligence — Schemas do domínio pivot 2026-05
 *
 * Modelo nativo: small tools NFC + checkout/checkin + obras/armazém.
 * Substitui o modelo legacy (heavy machines + RFID + horas de motor + manutenção por horas).
 *
 * Este ficheiro é a fonte de verdade dos schemas. Quando criares/leres documentos
 * nas colecções abaixo, segue exactamente estes campos. Para mudar um schema,
 * actualiza primeiro este ficheiro, depois o código que o consome.
 *
 * Firestore base path: `artifacts/casais-rfid/public/data/`
 */

// ============================================================================
// COLECÇÕES PRIMÁRIAS (modelo nativo activo)
// ============================================================================

/**
 * @typedef {Object} Tool
 * Colecção: `tools/{toolId}` — inventário de ferramentas pequenas com NFC.
 *
 * @property {string} id
 * @property {string} name                  Ex.: "Martelo pneumático Bosch GSH 16-30"
 * @property {string} type                  Categoria: "Martelo pneumático", "Rebarbadora", etc.
 * @property {string} nfcTagId              Tag NFC programada (UID upper-case)
 * @property {string} [currentObraId]       Obra onde está atribuída (null = armazém)
 * @property {string} [currentObraName]     Cache do nome para evitar lookups
 * @property {string} storageLocation       "Armazém Central", etc.
 * @property {'AVAILABLE'|'IN_USE'|'IN_REPAIR'|'LOST'|'RETIRED'} status
 * @property {number} replacementCost       € — para valor imobilizado e perdas
 * @property {Date|Timestamp} [lastInspection]
 * @property {string} [procoreEquipmentId]  Compatibility com Procore (legacy)
 * @property {string} [procoreEquipmentNumber]
 */

/**
 * @typedef {Object} ToolSession
 * Colecção: `tool_sessions/{sessionId}` — checkouts e devoluções via NFC.
 *
 * `durationHours` mantém-se mas com SEMÂNTICA NOVA: tempo de posse / tempo fora do armazém.
 * NÃO representa horas de operação contínua da ferramenta.
 *
 * @property {string} id
 * @property {string} toolId
 * @property {string} toolName              Snapshot no momento do checkout
 * @property {string} [toolType]
 * @property {string} nfcTagId
 * @property {string} operatorId
 * @property {string} operatorName          Snapshot
 * @property {string} [obraId]
 * @property {string} [obraName]            Snapshot
 * @property {string} [sapOrigin]           Ex.: "Armazém Central"
 * @property {string} [sapDestination]      Ex.: obra de destino
 * @property {string} [sapWorker]           operatorId duplicado para SAP
 * @property {'OPEN'|'CLOSED'|'AUTO_CLOSED'|'LOST'} status
 * @property {Timestamp} startTime
 * @property {Timestamp|null} endTime
 * @property {number|null} durationHours    Tempo fora do armazém em horas (não operação)
 * @property {GpsPoint|null} location       GPS no momento do checkout
 * @property {GpsPoint|null} endLocation    GPS no momento do checkin
 * @property {boolean} procoreSynced
 * @property {boolean} sapSynced
 * @property {Timestamp} [alertedAt]        Última vez que um alert foi disparado
 */

/**
 * @typedef {Object} GpsPoint
 * @property {number} lat
 * @property {number} lng
 * @property {number} accuracy              metros
 * @property {number} timestamp             ms desde epoch
 */

/**
 * @typedef {Object} ToolMaintenance
 * Colecção: `tool_maintenance/{recordId}` — registos de inspeção/reparação/perda.
 *
 * Substitui completamente o conceito legacy de "manutenção por horas de motor".
 *
 * @property {string} id
 * @property {string} toolId
 * @property {'INSPECTION'|'DAMAGE'|'REPAIR'|'CALIBRATION'|'REPLACEMENT'|'LOSS'} type
 * @property {'OPEN'|'IN_PROGRESS'|'DONE'} status
 * @property {string} reportedBy            operatorId
 * @property {Timestamp} reportedAt
 * @property {string} [resolvedBy]          operatorId
 * @property {Timestamp} [resolvedAt]
 * @property {string} [obraId]              Onde foi detectado
 * @property {string} notes
 * @property {string[]} photos              Storage paths
 * @property {number} [cost]                € — para reparação ou substituição
 */

/**
 * @typedef {Object} ToolAlert
 * Colecção: `tool_alerts/{alertId}` — anomalias detectadas + fluxo de validação por email.
 *
 * SEPARADO do `alerts` legacy (que está acoplado ao schema FATIGUE/AUTO_CLOSE).
 * ValidationPage lê de ambas as colecções via flag no token.
 *
 * @property {string} id
 * @property {string} toolId
 * @property {string} [toolSessionId]
 * @property {'TOOL_OVERDUE'|'TOOL_PRESUMED_LOST'|'NO_LOCATION'|'NO_OPERATOR'|'DAMAGED'} anomalyType
 * @property {string} token                 32 chars — link único do email
 * @property {Timestamp} createdAt
 * @property {string} notifiedTo            operatorId ou email
 * @property {'OPEN'|'IN_REVIEW'|'RESOLVED'} status Estado interno do alerta
 * @property {boolean} internal             true por defeito; visível no PWA sem email
 * @property {{action:string,by:string,at:Timestamp,notes?:string}[]} auditLog
 * @property {string[]} actionsTaken
 * @property {string} [linkedMaintenanceId]
 * @property {Timestamp} [emailSentAt]
 * @property {boolean} [emailSent]
 * @property {string} [emailToken]
 * @property {Timestamp} [resolvedAt]
 * @property {'CONFIRMED_IN_USE'|'RETURNED'|'MARKED_LOST'|'MARKED_DAMAGED'|'IGNORED'} [resolution]
 * @property {string} [resolvedBy]
 */

/**
 * @typedef {Object} ToolMovement
 * Colecção: `tool_movements/{moveId}` — auditoria de transferências entre obras/armazém.
 *
 * Popular automaticamente em cada checkout/checkin (trigger Firestore ou cliente).
 * Permite reconstruir o histórico de localização sem ler todas as sessões.
 *
 * @property {string} id
 * @property {string} toolId
 * @property {string|'WAREHOUSE'} fromObraId
 * @property {string|'WAREHOUSE'} toObraId
 * @property {string} movedBy               operatorId
 * @property {Timestamp} movedAt
 * @property {'CHECKOUT'|'CHECKIN'|'MANUAL'|'TRANSFER'} triggeredBy
 * @property {string} [relatedSessionId]    tool_session que originou o movimento
 */

// ============================================================================
// COLECÇÕES SECUNDÁRIAS (partilhadas, mantêm-se)
// ============================================================================

/**
 * @typedef {Object} Operator
 * Colecção: `operators/{operatorId}` — utilizadores do sistema.
 * Schema inalterado. Semântica nova: "responsável por ferramentas em posse",
 * já não "condutor de máquina pesada".
 *
 * @property {string} id                    UID Firebase Auth
 * @property {string} name
 * @property {string} email
 * @property {string} [cardId]              RFID legacy — manter para retrocompat
 * @property {string} systemRole            'admin'|'gestor'|'encarregado'|'operador'|...
 * @property {string} [assignedObraId]
 */

/**
 * @typedef {Object} Obra
 * Colecção: `obras/{obraId}` — projectos/estaleiros.
 *
 * @property {string} id
 * @property {string} name
 * @property {string} address
 * @property {GpsPoint|{latitude:number,longitude:number}} [gps]  Para o Mapa
 * @property {string} [procoreProjectId]
 * @property {'active'|'paused'|'completed'} status
 */

// ============================================================================
// COLECÇÕES LEGACY (heavy machines model — não usar em UI nova)
// ============================================================================

/**
 * COLECÇÕES LEGACY — manter em Firestore para compatibilidade mas NÃO consumir
 * em UI nova. São lidas apenas pelo Procore exporter actual.
 *
 * - `machines` — heavy machines com `consumptionRate`, `maintenanceInterval`, etc.
 * - `sessions` — RFID sessions com `cardId`, `machineId`, `costs` (€/h), `fuelUsed`.
 *
 * Quando criares novas features, IGNORA estas colecções. Quando vires código que
 * as consome em fluxo activo (Sidebar, Dashboard, etc.), migra para `tools`/`tool_sessions`.
 *
 * Caminho de remoção definitiva: ver `docs/architecture/DATA_MODEL_CURRENT.md`.
 */

// ============================================================================
// CONSTANTES PARTILHADAS
// ============================================================================

/** Anomaly types do modelo tool_alerts — usar nestes literais, nunca strings ad-hoc. */
export const TOOL_ANOMALY_TYPES = Object.freeze({
  OVERDUE:        'TOOL_OVERDUE',
  PRESUMED_LOST:  'TOOL_PRESUMED_LOST',
  NO_LOCATION:    'NO_LOCATION',
  NO_OPERATOR:    'NO_OPERATOR',
  DAMAGED:        'DAMAGED',
});

/** Status válidos para tool_sessions. */
export const TOOL_SESSION_STATUS = Object.freeze({
  OPEN:        'OPEN',
  CLOSED:      'CLOSED',
  AUTO_CLOSED: 'AUTO_CLOSED',
  LOST:        'LOST',
});

/** Status válidos para tools. */
export const TOOL_STATUS = Object.freeze({
  AVAILABLE:  'AVAILABLE',
  IN_USE:     'IN_USE',
  IN_REPAIR:  'IN_REPAIR',
  LOST:       'LOST',
  RETIRED:    'RETIRED',
});

/** Tipos de tool_maintenance — substitui o conceito legacy "horas até manutenção". */
export const TOOL_MAINTENANCE_TYPES = Object.freeze({
  INSPECTION:  'INSPECTION',    // rotina periódica
  DAMAGE:      'DAMAGE',        // reporte de dano
  REPAIR:      'REPAIR',        // intervenção
  CALIBRATION: 'CALIBRATION',   // ajuste
  REPLACEMENT: 'REPLACEMENT',   // substituição
  LOSS:        'LOSS',          // dada como perdida
});

/** Threshold defaults — overridable em `settings/system`. */
export const TOOL_THRESHOLDS = Object.freeze({
  OVERDUE_DAYS:    7,
  LOST_DAYS:       30,
  DORMANT_DAYS:    30,  // sem checkout há N dias → candidata a transferir/vender
});

/**
 * Convenção de namespace para legacy:
 * - `useStore` mantém `tools`/`toolSessions` como cidadãos primários.
 * - Arrays legacy (`machines`/`sessions`) continuam acessíveis no store APENAS
 *   para o Procore sync e Audit/Reconciliation panel.
 * - Em PR/wrap-ups futuros, mover legacy para `store/legacy/machinesStore.js`
 *   como módulo isolado quando o backend Procore for migrado.
 */
