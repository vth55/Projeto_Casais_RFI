---
tags:
  - ai
  - guide
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 01 AI Working Guide

## Goal
Provide enough project context fast, without forcing huge prompts or long chats.

## Recommended Read Order
1. [[00 Home]]
2. [[02 Memory Strategy]]
3. [[03 Planning Workflow]]
4. The most relevant system note:
   - Procore -> [[15 Procore Integration - State]] and [[16 Procore Integration - Architecture]]
   - Firestore/schema -> [[12 Firestore Data Model]]
   - RFID/session logic -> [[13 RFID Sessions and Rules]]
   - Costs/CO2 -> [[14 Tariffs Costs and CO2]]
   - hardware/mobile bridge -> [[17 Hardware Retrofit Arduino]]
5. For risk/history questions:
   - [[20 Constraints and Invariants]]
   - [[21 Key Decisions]]
   - [[30 Open Threads]]
   - [[31 Operational Incidents]]
   - [[32 Claude Memory Lessons]]

## What Lives Here
- durable facts
- architectural decisions
- invariants
- known limitations
- open threads that survive sessions
- planning context that should survive sessions

## What Does Not Live Here
- raw terminal logs
- transient debugging chatter
- repeated implementation detail already obvious in code
- speculative plans with no current value

## Best Prompt Shapes For AI
- "How does Procore work here?"
- "What invariants matter before editing sessions/costs?"
- "What is current status vs sandbox limitation?"
- "What open threads remain in this subsystem?"

## Important Working Assumptions
- Active project docs are the implementation truth and should be trusted first.
- This vault is the compact memory layer above those docs.
- For implementation, code still wins over docs if they diverge.
