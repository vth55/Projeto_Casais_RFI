---
tags:
  - domain
  - overview
project: Projeto_Casais_RFI
updated: 2026-05-18
sources:
  - README.md
  - docs/archive/root/DOCS_ARCHITECTURE.md
  - .claude/memory/project/stack.md
---

# 10 Project Overview

## Executive Summary
- Casais Fleet Intelligence is a fleet operations PWA for heavy machinery.
- It tracks machine usage sessions, operator activity, maintenance, breakdowns, costs, and emissions.
- It integrates with Procore for enterprise-facing timecards, equipment data, and related operational sync.

## Business Purpose
- replace fragile/manual operational tracking
- make machine activity measurable
- support maintenance based on real operating hours
- surface operational costs and CO2
- bridge local operational data into Procore workflows

## Main User-Facing Areas
- sessions and live activity
- machines and equipment status
- maintenance
- breakdowns/avarias
- dashboard and analytics
- configuration and Procore integration

## Main Tech Stack
- Frontend: React 19, Vite, Tailwind, Zustand, Recharts
- Backend: Firebase Cloud Functions v2
- Data: Firestore and Firebase Storage
- Hardware paths: PWA/NFC path and Arduino + PC bridge path

## See Also
- [[11 Architecture Overview]]
- [[12 Firestore Data Model]]
- [[15 Procore Integration - State]]
