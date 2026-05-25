---
tags:
  - constraints
  - invariants
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - CLAUDE.md
  - docs/architecture/ARQUITETURA_DADOS.md
  - .claude/memory/patterns/firestore-quirks.md
  - FINDINGS.md
---

# 20 Constraints and Invariants

## Hard Invariants
- `sessions.tariffSnapshot` and `sessions.costs` must not be mutated after session close.
- `machines.tariffHistory[]` is append-only.
- Firestore is the operational source of truth.

## Important Data Constraints
- do not assume every `obraId` has a corresponding document
- `scan_buffer/latest` is a single overwritten document pattern
- base path `artifacts/casais-rfid/public/data/` should be referenced precisely

## Branding / UX Constraints
- brand blue is `#005EB8`
- green should not become the dominant product color

## Security / Platform Reality
- Firebase Auth is intentionally incomplete or non-central in this academic/prototype context
- some security hardening items are future-state, not present-state

## Integration Constraints
- Procore sandbox behavior is not a reliable proxy for every production endpoint behavior
- ghost equipment mapping remains a real operational sharp edge

## See Also
- [[14 Tariffs Costs and CO2]]
- [[15 Procore Integration - State]]
- [[31 Operational Incidents]]
