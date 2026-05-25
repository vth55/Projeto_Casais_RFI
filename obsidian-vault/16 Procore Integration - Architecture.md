---
tags:
  - procore
  - architecture
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/architecture/ADR/002-procore-integration.md
  - docs/integrations/PROCORE_PHASE1_PROGRESS.md
  - PATHFINDER-2026-05-07/01-flowcharts/ProcoreIntegration.md
  - FINDINGS.md
---

# 16 Procore Integration - Architecture

## Architectural Split
- `procoreBridge.js` is the canonical integration bridge.
- `procoreSessionExporter.js` is the operational exporter for sessions/timecards.

## Bridge Responsibilities
- OAuth2 flow
- token management
- connection status and disconnect
- sync endpoints and mirror population
- routing internal Procore-facing operations through backend functions

## Exporter Responsibilities
- resolve entities for session export
- create timecard entries
- handle retries, idempotency, and fallback matching
- cope with missing `equipment_id` paths when sandbox API does not expose full v1.0 support

## Strategic Decision
- enrichment is non-destructive:
  - local operational system stays editable and primary for in-app workflows
  - Procore provides mirrored enterprise context and receives exported activity

## Known Design Tension
- historical duplication of token refresh logic exists in the exporter
- desired direction is to centralize security-sensitive token lifecycle behavior in the bridge

## Important Code Paths
- `Backend_Cloud/functions/procore/procoreBridge.js`
- `Backend_Cloud/functions/procore/procoreSessionExporter.js`
- backend triggers in `Backend_Cloud/functions/index.js`

## See Also
- [[15 Procore Integration - State]]
- [[21 Key Decisions]]
- [[20 Constraints and Invariants]]
