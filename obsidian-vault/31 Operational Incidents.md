---
tags:
  - incidents
  - operations
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/sessions/2026-05-07_17-32.md
  - docs/sessions/2026-05-07_00-00.md
  - docs/sessions/2026-05-07_00-37.md
  - C:/Users/vitor/.claude-mem/relatorio_claude_mem.md
  - FINDINGS.md
---

# 31 Operational Incidents

## Claude-Mem / Windows Instability
- `claude-mem` caused real operational instability on Windows/Antigravity.
- A bash-based hook path was incompatible enough to break session startup behavior.
- Heavy mid-turn hooks and queue pressure degraded fluency and could monopolize the tool/runtime path.

## Queue / Memory Pressure Lessons
- too much automatic observation capture can create self-inflicted latency and queue spirals
- memory systems must stay out of the critical path of editing/chat use

## Data Model Progress Incidents That Matter
- moving breakdowns from browser-local storage to Firestore + Storage was a meaningful corrective architecture step
- CRUD/listener duplication in stores was large enough to justify factories and consolidation

## Procore Reality Checks
- many apparent Procore failures were sandbox limitations, not code bugs
- treat environment diagnosis as first-class work before changing business logic

## See Also
- [[32 Claude Memory Lessons]]
- [[20 Constraints and Invariants]]
