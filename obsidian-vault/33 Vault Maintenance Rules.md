---
tags:
  - ai
  - maintenance
  - rules
project: Projeto_Casais_RFI
updated: 2026-05-18
---

# 33 Vault Maintenance Rules

## Rules

1. Prefer editing existing notes over creating near-duplicates.
2. Keep notes short and high-signal.
3. Put the status or decision near the top.
4. Link to source docs or code paths when the note depends on implementation detail.
5. Archive stale ideas in project docs or repo archive, not in the vault home flow.

## Suggested Cadence

Update the vault:

- after a meaningful architecture change
- after a resolved incident with lasting lessons
- after a major integration milestone
- when open threads materially change

## Note Ownership Model

- Project docs own implementation truth.
- Vault notes own orientation, continuity and long-lived memory.

## Sanity Check

Before editing the vault, ask:

- will this still matter in a month?
- is this better as a repo doc instead?
- does this note reduce future prompt length?

If the answer is no, it probably should not be added here.
