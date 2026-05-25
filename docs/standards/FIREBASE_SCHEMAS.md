# FIREBASE SCHEMAS

Current schema-oriented guidance for editing Firestore-backed code.

This file is active.
For the concise contract read `docs/architecture/DATA_MODEL_CURRENT.md`.
For the older snapshot read `docs/archive/standards/FIREBASE_SCHEMAS.legacy.md`.

## Base Rules

- Base path: `artifacts/casais-rfid/public/data/`
- Prefer additive evolution over destructive schema rewrites
- Preserve historical financial data
- Preserve maintenance auditability

## Naming Guidance

### Machines

Expected field families:

- identity: `name`, `category`
- state: `status`
- usage: `totalHours`, `partialHours`
- cost: `currentTariff`, `tariffHistory[]`
- integration: `procoreEquipmentId`

### Sessions

Expected field families:

- identity: `machineId`, `cardId`
- timing: `startTime`, `endTime`, `durationHours`
- lifecycle: `status`, close method/reason
- finance: cost and tariff snapshot data
- project linkage: `obraId` when relevant

### Operators

Expected field families:

- identity: `name`
- matching/contact: `email`, `phone`
- access: `role`
- integration: `procoreUserId`

## Collections Used In Active Code

- `operators`
- `machines`
- `sessions`
- `settings/system`
- `maintenance_schedules`
- `workOrders`
- `location_cards`
- `rfidLocationCards`
- `machineLocationEvents`
- `integrations/procore`

## Invariants

- closed sessions keep immutable financial context
- `machines.tariffHistory[]` is append-only
- local machine finance fields should not be overwritten by Procore projection
- maintenance reset flows must remain explicit and auditable

## Documentation Rule

If schema behavior changes in code, update:

1. `docs/architecture/DATA_MODEL_CURRENT.md`
2. this file if naming or editing guidance changes
3. `FINDINGS.md` if an old assumption was wrong or a migration trap was found
