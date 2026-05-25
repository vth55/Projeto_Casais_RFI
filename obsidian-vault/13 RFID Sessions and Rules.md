---
tags:
  - rfid
  - sessions
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/architecture/ARQUITETURA_DADOS.md
  - docs/INDEX.md
  - Backend_Cloud/functions/index.js
---

# 13 RFID Sessions and Rules

## Core Model
- RFID/operator scans drive session lifecycle.
- A registered operator can open or close a session against a machine.
- Session state is not just timing; it affects costs, maintenance, and Procore export.

## Important Behaviors
- operator scan can create START or STOP depending on current state
- some flows can trigger SWITCH-like behavior when another session is already open
- unregistered scans are blocked and logged rather than silently accepted
- auto-close scenarios are part of the validated behavior set

## Why This Area Is Sensitive
- session data feeds multiple downstream systems:
  - costs
  - maintenance thresholds
  - dashboard metrics
  - Procore timecards

## Operational Reality
- validated scenarios include start/stop, manual hour correction, auto-close, equipment-only flow, and stress scenarios with multiple sessions

## See Also
- [[14 Tariffs Costs and CO2]]
- [[15 Procore Integration - State]]
- [[20 Constraints and Invariants]]
