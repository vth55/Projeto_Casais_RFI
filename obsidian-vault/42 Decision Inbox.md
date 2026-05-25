---
tags:
  - planning
  - decisions
  - inbox
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 42 Decision Inbox

Use this note for decisions that are being shaped but are not yet accepted.

## Open Decision Buckets

### Execution Sequence

- what should be planned to completion before implementation resumes
- what can wait until after the next disciplined execution phase

### Procore Scope

- what is next real product work vs demo hardening
- what should be deferred because the sandbox is the limiting factor
- which exported records are genuinely professional in Procore and which should remain PWA-native

### Obra Workspace

- confirm ` /obras/:obraId ` as the primary detailed experience instead of a drawer/modal
- define the first-release submenu set: summary, equipment, workers, sessions, maintenance, CO2, map
- define what gets moved out of the overloaded global dashboard
- decide which charts and comparisons belong in month 1 vs month 2

### Period Comparison

- keep a single obra-level period selector in the header
- decide whether period-over-period comparison ships in month 1 or month 2

### Map Context

- keep Google Maps inside the obra experience as contextual location, not as a heavy geospatial product
- define what the first release of the map must show beyond obra location

### Validation Strategy

- decide the minimum complete browser-based test matrix for the new obra workspace
- define which scenarios must always be validated manually through the web UI, even when logs look correct
- define how AI-driven browser testing evidence should be captured and summarized for each major change

### Maintenance And Operations

- what maintenance/work-order behavior must be locked down before wider execution

## Promotion Rule

When a decision is accepted:

1. move the durable conclusion into [[21 Key Decisions]]
2. update active project docs if implementation truth changed
3. remove or simplify the inbox entry
