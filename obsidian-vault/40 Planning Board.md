---
tags:
  - planning
  - board
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 40 Planning Board

## Current Mode

Project is entering a planning-first phase before a more disciplined execution phase.

## Delivery Progress

- obra workspace shell is now live and browser-validated
- `Resumo` is live as the first real tab
- `Equipamentos` is live as the first operational submenu beyond summary
- `SessoesObraView` is live and locally browser-validated, with anomaly logic split between operational issues and informational flags
- `ManutencaoObraView` is live and locally browser-validated, with criticality ordering and explicit overdue semantics
- the next execution slice should stay focused on the remaining obra submenus plus a later deploy-grade validation pass

## Strategic Shift

- keep Procore as the enterprise master for obras, workers and machines
- reposition the PWA as the operational and analytical layer for obra execution
- push to Procore only data that Procore supports natively and professionally
- stop treating notes-based enrichment as the long-term primary integration path
- introduce a dedicated obra workspace at ` /obras/:obraId ` as the main product surface for rich obra context

## Planning Objectives

- define a cleaner execution sequence
- reduce context drift across chats and tools
- keep Procore, RFID, maintenance and data-model work aligned
- avoid re-planning the same issues repeatedly

## Current Planning Tracks

### Track A - Product And Delivery

- what must be shown or proven next
- what is demo-only hardening vs real product work
- what should be sequenced before execution resumes
- define the first release shape of the obra workspace

### Track B - Technical Risk

- Procore sandbox vs production behavior
- maintenance/work-order edge cases
- memory/tooling stability
- what existing dashboard and analytics code should be moved instead of rebuilt

### Track C - Information Architecture

- keep docs canonical and lean
- keep the vault durable and cross-AI friendly
- prevent session noise from becoming project memory
- organize obra analytics so executive view, drill-down and map context remain coherent

## Immediate Inputs

- [[41 Current Priorities]]
- [[42 Decision Inbox]]
- [[30 Open Threads]]
- [[15 Procore Integration - State]]

## Rule

If a planning item cannot survive one week of distance, it probably does not belong on this board.
