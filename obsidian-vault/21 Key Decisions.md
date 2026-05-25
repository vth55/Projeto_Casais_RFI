---
tags:
  - decisions
  - adr
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/architecture/ADR/001-hardware-switch-arduino.md
  - docs/architecture/ADR/002-procore-integration.md
  - docs/architecture/ADR/003-dynamic-operational-parameters.md
  - docs/architecture/ADR/004-maintenance-industrialization-rbac.md
  - docs/architecture/ADR/005-seguranca-auditoria-producao.md
---

# 21 Key Decisions

## Accepted / Working Decisions
- Use Arduino retrofit path for fixed hardware integration.
- Use Procore as enterprise-facing system for project/equipment context and exported operational records.
- Keep Procore enrichment non-destructive rather than replacing local control.
- Treat dynamic operational parameters and tariff logic as explicit domain concerns rather than hardcoded constants.
- Push maintenance toward real-hour operational logic and professionalized RBAC.
- Treat Procore as the master system for obras, workers and machines, while the PWA becomes the operational and analytical layer.
- Prefer PWA-native presentation for rich telematics, RFID, maintenance and obra analytics instead of forcing those concepts into Procore notes or similar hacks.
- Use a dedicated obra route ` /obras/:obraId ` as the main detailed workspace, with map context included as part of the obra experience.
- Treat browser-based end-to-end validation as mandatory for major workflow changes; logs and backend traces are supporting evidence, not sufficient proof on their own.
- Implement `Equipamentos` as a hybrid desktop/mobile experience: table on large screens, cards on mobile, horizontal utilization bars, and drawer-based machine drill-down.
- Normalize legacy machine statuses before they reach the obra UI so operational counts and filters stay trustworthy.
- In obra-scoped sessions, separate operational anomalies from informational data-quality flags so localhost gaps do not drown real issues.
- In obra-scoped maintenance, prioritize list-plus-drawer over calendar, and make overdue semantics explicit instead of hiding them behind `0h` remaining.

## Important Nuance
- ADR 005 is directionally important, but should be read as future-state hardening rather than fully accepted current reality.

## Decision Themes
- preserve local operational autonomy
- keep historical records auditable
- separate domain logic from UI convenience
- accept sandbox limitations without misclassifying them as product regressions
- keep enterprise master data authority in Procore while concentrating operational intelligence in the PWA

## See Also
- [[16 Procore Integration - Architecture]]
- [[20 Constraints and Invariants]]
