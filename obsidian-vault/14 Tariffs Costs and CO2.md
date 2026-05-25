---
tags:
  - costs
  - tariffs
  - co2
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/architecture/ARQUITETURA_DADOS.md
  - docs/INDEX.md
  - docs/architecture/ADR/003-dynamic-operational-parameters.md
---

# 14 Tariffs Costs and CO2

## What This Subsystem Does
- converts raw session duration into operational cost
- preserves tariff state at session close
- supports machine and operator cost components
- supports configurable operational parameters such as fuel/CO2 related factors

## Key Principles
- tariff history is versioned
- a closed session keeps its own tariff snapshot and computed costs
- cost logic must remain historically stable even if machine tariffs change later

## Why It Matters
- this is both a reporting subsystem and an audit subsystem
- any change here can silently corrupt historical analysis if invariants are broken

## Common Reasoning Pattern
- if a question touches sessions after close, assume immutability first
- if a question touches parameter changes, think in terms of fallback hierarchy and effective snapshots

## See Also
- [[12 Firestore Data Model]]
- [[20 Constraints and Invariants]]
- [[21 Key Decisions]]
