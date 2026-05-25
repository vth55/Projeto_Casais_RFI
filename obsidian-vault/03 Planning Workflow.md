---
tags:
  - planning
  - workflow
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 03 Planning Workflow

## Goal

Use Claude for planning without forcing the user to maintain giant summaries.

## Working Loop

1. Discuss normally in chat.
2. Claude extracts the durable planning signal.
3. Claude updates the right layer:
   - project docs if implementation truth changed
   - vault if durable planning context changed
   - neither if it was transient noise
4. Execution later follows the plan notes instead of re-reading long chats.

## Where Planning Information Goes

### Use Project Docs When

- the current implementation state changed
- the architecture contract changed
- the current operational truth changed

### Use The Vault When

- a decision matters beyond the current session
- an unresolved thread will survive into future work
- a planning rationale should remain visible to future AIs
- priorities and sequencing need to stay compact and reusable

## Notes Used During Planning

- [[40 Planning Board]]
- [[41 Current Priorities]]
- [[42 Decision Inbox]]
- [[30 Open Threads]]
- [[21 Key Decisions]]

## User Burden

The user should not be responsible for deciding:

- what belongs in docs vs vault
- what is durable enough to keep
- how much summary is enough

That classification is an AI responsibility by default.
