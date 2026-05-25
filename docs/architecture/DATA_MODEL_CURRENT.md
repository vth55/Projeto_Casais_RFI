# Current Data Model

Validated against code on `2026-05-18`.

This is the concise current-state Firestore contract. If it conflicts with older schema docs, this file wins until those docs are reconciled.

## Base Path

`artifacts/casais-rfid/public/data/`

## Source-of-Truth Rules

- Closed sessions keep immutable tariff and cost snapshots.
- `machines.tariffHistory[]` is append-only.
- `partialHours` resets only through the intended maintenance/work-order flow.
- Firestore remains the operational source of truth even when Procore is synced.

## Core Collections

### `operators/`

Known active fields from code and docs:

- `name`
- `email`
- `phone`
- `role`
- `procoreUserId` when synced

Document ID is the operator card or operator identifier used by the app flow.

### `machines/`

Known active fields from code:

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
- `procoreEquipmentId` when synced

Notes:

- `currentTariff` is the live tariff.
- `tariffHistory[]` stores previous tariffs and must not be deleted.
- Procore sync code must not overwrite local admin-managed tariff and consumption fields.

### `sessions/`

Known active fields from backend logic:

- `cardId`
- `machineId`
- `startTime`
- `endTime`
- `durationHours`
- `status`
- `closeMethod` or equivalent close reason field
- `costs`
- `tariff` or tariff snapshot fields at close time
- `obraId` when relevant to project/export flows

Important:

- once a session is closed, tariff/cost snapshot data is treated as immutable
- Procore export reads these records and derives timecards from them

### `settings/system`

Known active operational settings:

- fuel and CO2 factors
- default maintenance interval
- other runtime system parameters used by frontend listeners

### `maintenance_schedules/`

Active in frontend store and maintenance workflows.

### `workOrders/`

Present in backend Procore deep integration and scenario scripts.

Used for maintenance lifecycle and controlled `partialHours` reset logic.

### `location_cards/`

Legacy but still active in the frontend store.

### `rfidLocationCards/`

Newer location-card collection used in backend RFID handling and configuration UI.

### `machineLocationEvents/`

Active audit/event collection for machine location transitions.

Used for RFID location scans, manual dispatch flows and location history UI.

## Procore Integration Data

### `integrations/procore`

Used for:

- OAuth token storage
- connection status
- sync metadata
- default Procore project settings

Related code:

- `Backend_Cloud/functions/procore/procoreBridge.js`
- `Backend_Cloud/functions/procore/procoreSessionExporter.js`

## Known Transitional Areas

These areas still reflect migration history and are easy to document wrongly:

- `location_cards` vs `rfidLocationCards`
- older `procoreId` terminology vs current `procoreEquipmentId` / `procoreUserId`
- legacy phase-based docs vs current operational state

When editing related docs, verify the code first.
