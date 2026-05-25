# ARQUITETURA DE DADOS

Current detailed data architecture, aligned to the operational model on `2026-05-18`.

For the short canonical contract read `docs/architecture/DATA_MODEL_CURRENT.md` first.
For the old snapshot read `docs/archive/architecture/ARQUITETURA_DADOS.legacy.md`.

## Base Path

`artifacts/casais-rfid/public/data/`

## Data Model Shape

The system is centered on:

- operators
- machines
- sessions
- system settings
- maintenance and work-order flows
- RFID location flows
- Procore integration state

## Core Collections

### `operators/`

Purpose:

- operator identity
- RFID / operator linkage
- contact fields used for alerts and Procore matching

Common fields:

- `name`
- `email`
- `phone`
- `role`
- `procoreUserId` when synced

### `machines/`

Purpose:

- fleet inventory
- operational state
- cost model
- maintenance state
- Procore linkage

Common fields:

- `name`
- `category`
- `status`
- `totalHours`
- `partialHours`
- `consumptionRate`
- `co2Factor`
- `maintenanceInterval`
- `currentTariff`
- `tariffHistory[]`
- `procoreEquipmentId`

Important rules:

- local admin-managed cost fields are not to be overwritten by Procore sync
- `tariffHistory[]` is append-only
- `partialHours` is part of the maintenance lifecycle, not a free-form counter

### `sessions/`

Purpose:

- machine usage tracking
- billing/cost snapshots
- maintenance hour accumulation
- Procore timecard export source

Common fields:

- `cardId`
- `machineId`
- `startTime`
- `endTime`
- `durationHours`
- `status`
- close reason or close method field
- `costs`
- tariff snapshot data
- `obraId` where relevant

Important rules:

- once closed, session cost and tariff snapshot data is immutable
- export logic depends on these snapshots being trustworthy

### `settings/system`

Purpose:

- global operational parameters
- fuel and CO2 factors
- maintenance defaults

### `maintenance_schedules/`

Purpose:

- planned maintenance records
- planning views and schedule UX

### `workOrders/`

Purpose:

- maintenance execution lifecycle
- controlled reset flows tied to completed maintenance

### `location_cards/`

Legacy location-card collection still used in frontend flows.

### `rfidLocationCards/`

Newer location-card collection used by backend RFID handling and configuration UI.

### `machineLocationEvents/`

Audit trail for machine location changes:

- RFID swipes
- manual dispatch
- corrections
- transit/location history

### `integrations/procore`

Purpose:

- token storage
- connection state
- sync metadata
- default project settings

## Transitional Areas To Treat Carefully

- `location_cards` and `rfidLocationCards` coexist
- older docs may say `procoreId` where code now uses `procoreEquipmentId` or `procoreUserId`
- older phase-based Procore docs are historical, not current operational truth

## Code References

- `Backend_Cloud/functions/index.js`
- `Backend_Cloud/functions/procore/procoreBridge.js`
- `Backend_Cloud/functions/procore/procoreSessionExporter.js`
- `Backend_Cloud/functions/procore/procoreDeepIntegration.js`
- `Frontend_App/dashboard/src/store/useStore.js`
