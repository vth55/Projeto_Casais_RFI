---
tags:
  - planning
  - execution
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 43 Next Execution Phase

## Purpose

This note exists so planning can collapse into an execution-ready sequence later.

## What Should End Up Here

- ordered work packages
- blockers and dependencies
- what must be proven after each package
- what docs or memory must be updated as part of each package

## Definition Of Ready

An execution package is ready when:

- the goal is concrete
- the dependency chain is clear
- the success condition is testable
- the likely documentation updates are known

## Current Sequence

1. `TrabalhadoresObraView`
   - expose worker hours and activity in obra scope
   - defer richer operator-versus-operator comparisons until the core view is stable

2. `LocalizacaoObraView`
   - integrate Google Maps as contextual obra location
   - keep this lightweight in the first pass

3. `Co2ObraView`
   - expose obra emissions clearly after sessions, maintenance and workers are in place

4. Deploy-grade obra validation pass
   - validate real RFID/operator data, `costs.total`, maintenance accumulation and Procore-facing semantics outside localhost
