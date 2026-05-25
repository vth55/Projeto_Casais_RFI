---
tags:
  - procore
  - status
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/integrations/project_procore_integration.md
  - docs/sessions/2026-05-15_14-33.md
  - docs/sessions/2026-05-18_09-25.md
  - docs/sessions/2026-05-18_09-58.md
  - FINDINGS.md
---

# 15 Procore Integration - State

## Executive Status
- Procore integration is operational.
- OAuth and token refresh work.
- Sync of equipment/project/directory mirrors is working.
- Export of sessions/timecards is working.
- Manual hour correction and auto-close related flows are working.
- Main remaining gaps are demo-hardening, observability, and sandbox-specific limitations.

## What Is Proven Functional
- OAuth2 auth flow
- token refresh lifecycle
- equipment sync PWA -> Procore
- session/timecard export start-stop
- scenario handling for correction, auto-close, equipment-only, and stress cases

## What Is Still Open
- more polished integration dashboard/reconciliation view
- some scenario coverage still pending or worth revalidating
- sandbox setup work for specific equipment/demo paths

## Sandbox Limitations, Not Product Bugs
- some observations endpoints fail with 404/422 in sandbox
- some equipment v1.0 endpoints return 404 in sandbox
- some destructive or status-changing API behaviors are incomplete/blocked in sandbox
- outbound webhooks from sandbox are not reliable for demo parity

## Risks
- sandbox behavior can differ from production
- fuzzy matching and ghost equipment mappings can still create operational fragility

## See Also
- [[16 Procore Integration - Architecture]]
- [[21 Key Decisions]]
- [[30 Open Threads]]
