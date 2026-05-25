# Documentation Policy

This repo had too many documents with implied authority. This file defines the rules going forward.

## Purpose

Documentation must help a new human or AI answer three questions fast:

1. What is true now?
2. Where is the code that implements it?
3. What is historical context only?

## Canonical Document Set

These are the active sources of truth:

- `README.md`
- `docs/INDEX.md`
- `docs/ROADMAP_EXECUCAO.md`
- `FINDINGS.md`
- `docs/architecture/DATA_MODEL_CURRENT.md`
- `docs/integrations/project_procore_integration.md`
- `docs/operations/TROUBLESHOOTING.md`

Everything else is either supporting detail or archive.

## Folder Roles

- `docs/architecture/`: stable architecture and data model
- `docs/standards/`: coding and schema conventions
- `docs/integrations/`: current integration state and contracts
- `docs/operations/`: runbooks and troubleshooting
- `docs/sessions/`: session summaries, screenshots, evidence
- `docs/archive/`: historical plans, snapshots, superseded docs
- `obsidian-vault/`: long-lived AI memory and cross-tool handoff

## Update Rules

- If code behavior changes, update the active doc in the same task.
- If a document is superseded, archive it instead of silently leaving it in place.
- If a doc is historical, it must say so clearly in the first screenful.
- Do not create new top-level "source of truth" files in the repo root.
- Do not duplicate current state across multiple long files.

## FINDINGS.md Rules

Append to `FINDINGS.md` only for:

- real bugs and root causes
- hidden IDs, config values, or environment traps
- sandbox or vendor limitations
- false assumptions in old docs

Do not use it for:

- generic summaries
- routine task logs
- speculative ideas

## Session Docs Rules

`docs/sessions/` is for execution history, not for canonical state.

- keep session summaries date-based
- keep screenshots only when they are evidence worth preserving
- temporary Playwright output should not be treated as documentation

## Archive Rules

Move a doc to `docs/archive/` when:

- it describes an old phase or plan
- it has drifted too far from code
- a newer active doc now covers the same ground

Leave a short stub behind only if the old filename is likely to be referenced by humans or AI.

## Writing Style For AI-Friendly Docs

- prefer current-state summaries over long narratives
- put the decision or status in the first 10 lines
- include the code paths that implement the behavior
- separate "works now", "known limits", and "historical context"
- keep docs ASCII when practical to avoid encoding drift

## Review Checklist

Before adding or editing docs, ask:

1. Is this active documentation or archive?
2. Is there already a canonical file for this topic?
3. Does the code still match this text?
4. Will a future AI know where this belongs?
