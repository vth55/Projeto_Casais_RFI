---
tags:
  - firestore
  - data-model
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/architecture/ARQUITETURA_DADOS.md
  - docs/standards/FIREBASE_SCHEMAS.md
  - .claude/memory/patterns/firestore-quirks.md
---

# 12 Firestore Data Model

## Base Path
- Canonical base path: `artifacts/casais-rfid/public/data/`

## Core Collections
- `operators`
- `machines`
- `sessions`
- `alerts`
- `maintenance`
- `breakdowns`
- `location_cards`
- `unregistered_scans`
- integration mirrors under Procore-related paths

## Most Important Entities
### Sessions
- represent machine/operator work intervals
- can be open or closed
- support original vs corrected times
- keep cost snapshots and close reasons

### Machines
- include status, hours, tariff state, alert thresholds, location, and maintenance-related fields

### Breakdowns
- breakdown reports moved from browser-local storage to Firestore + Firebase Storage

## Firestore Quirks Worth Remembering
- do not assume every historical `obraId` has a matching document
- `scan_buffer/latest` is a single document pattern, not a normal growing collection
- data model contains historical and compatibility layers; code should not assume ideal cleanliness

## Why This Note Matters
- Most system behavior questions eventually reduce to session, machine, and tariff semantics.

## See Also
- [[13 RFID Sessions and Rules]]
- [[14 Tariffs Costs and CO2]]
- [[20 Constraints and Invariants]]
