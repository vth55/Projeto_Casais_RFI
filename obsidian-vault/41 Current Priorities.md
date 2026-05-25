---
tags:
  - planning
  - priorities
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 41 Current Priorities

## Priority 1 - Planning Discipline

- agree the next execution sequence before diving back into implementation
- keep decisions compact and visible
- stop long chat context from being the only memory source

## Priority 2 - Procore Direction

- lock the principle that Procore is master data and the PWA is the operational intelligence layer
- decide what still goes to Procore natively vs what stays in the PWA
- separate sandbox limitations from real implementation debt
- keep the integration plan aligned with what is already proven

## Priority 3 - Obra Workspace

- design the new ` /obras/:obraId ` route as the main rich project surface
- include summary, equipment, workers, sessions, maintenance, CO2 and map context
- keep period comparison in the obra header, not inside each chart
- reuse buried analytics and charting work from existing views before building new components
- keep the delivered shell, `Resumo`, `Equipamentos`, `Sessões` and `Manutenção` stable while building the next submenus
- finish `TrabalhadoresObraView` next, then `LocalizacaoObraView`, then `Co2ObraView`
- keep a dedicated future gate for deploy/Procore/RFID validation separate from localhost UI gates
- keep heatmap and broader maintenance/work-order history explicitly deferred unless they can be delivered cleanly

## Priority 4 - Cross-AI Continuity

- make the vault sufficient for future Claude/Codex/Gemini continuity
- keep project docs authoritative and the vault compact

## Priority 5 - Web Validation Discipline

- test strategic UI and workflow changes through the real web experience, not only logs or code inspection
- prefer AI-executed browser validation for repetitive end-to-end checks that would otherwise consume manual time
- require complete scenario coverage for new obra workflows, including navigation, filters, charts, map context, states and regressions

## Not Priorities Unless They Block

- cosmetic historical doc cleanup beyond the active set
- exhaustive screenshot curation
- broad speculative backlog expansion
