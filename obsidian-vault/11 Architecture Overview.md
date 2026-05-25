---
tags:
  - architecture
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - docs/archive/root/DOCS_ARCHITECTURE.md
  - docs/architecture/ARQUITETURA_DADOS.md
  - docs/architecture/ADR/001-hardware-switch-arduino.md
---

# 11 Architecture Overview

## System Shape
- Machine/operator activity is captured in the field.
- Operational data lands in Firebase/Firestore.
- Backend functions own session lifecycle, business rules, alerts, and integrations.
- Frontend dashboard consumes live Firestore state through Zustand stores.

## Hardware Paths
- Mobile/PWA path: phone/tablet driven workflows and NFC-assisted flows.
- Fixed retrofit path: Arduino Uno + PC/Python bridge for field hardware integration.

## Backend Responsibilities
- create/close sessions
- apply auto-close logic and session corrections
- calculate costs and CO2-adjacent metrics
- manage alerts and maintenance thresholds
- bridge data into Procore

## Frontend Responsibilities
- display live and historical operational state
- allow manual corrections and admin actions
- surface integration state, sync actions, and diagnostics

## Architectural Style
- local operational truth in Firestore
- event/state driven UI via Zustand
- integration layers separated from core dashboard concerns

## See Also
- [[13 RFID Sessions and Rules]]
- [[16 Procore Integration - Architecture]]
- [[17 Hardware Retrofit Arduino]]
