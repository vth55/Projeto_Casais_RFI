---
tags:
  - ai
  - memory
  - strategy
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 02 Memory Strategy

## Core Distinction

The project docs and the Obsidian vault are not the same thing.

### Project Docs

Project docs are the canonical implementation layer.

They answer:

- what is true now
- where the code lives
- what the current contract or workflow is

Examples:

- `docs/ROADMAP_EXECUCAO.md`
- `FINDINGS.md`
- `docs/architecture/DATA_MODEL_CURRENT.md`
- `docs/integrations/project_procore_integration.md`

### Obsidian Vault

The vault is the durable memory layer above the project docs.

It answers:

- what matters repeatedly across sessions
- what future AIs need to understand fast
- what decisions, constraints and open threads survive chat boundaries

## What Belongs In The Vault

- durable architectural summaries
- domain maps
- constraints and invariants
- major decisions and their rationale
- open threads that remain relevant
- operational incidents worth remembering
- memory lessons about tooling and workflow

## What Does Not Belong In The Vault

- raw code walkthroughs that are easy to re-read in repo docs
- temporary debugging notes
- repetitive session summaries
- screenshots with no long-term value
- implementation detail that already lives clearly in active docs

## Memory Flow

1. Code changes happen.
2. Active project docs are updated first.
3. If the change creates durable knowledge, the vault is updated second.

The vault should summarize and orient. It should not become a second copy of every project doc.

## Update Triggers

Update the vault when:

- a subsystem meaningfully changes shape
- a new invariant appears
- a decision changes how future work should be done
- a recurring incident teaches a reusable lesson
- an open thread becomes important enough to survive the current session

## Preferred Note Types

- MOC / home notes
- subsystem overviews
- decision summaries
- constraints
- open threads
- incident summaries

## Anti-Drift Rule

If a vault note starts mirroring large chunks of active project docs, trim it back and link to the project docs instead.

## Cross-AI Goal

Any future AI should be able to read:

1. [[00 Home]]
2. [[01 AI Working Guide]]
3. this note
4. one or two subsystem notes

and become productive without reading the whole repo.
