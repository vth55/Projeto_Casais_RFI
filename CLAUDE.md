# CASAIS FLEET INTELLIGENCE

## Project

Industrial PWA for fleet operations and equipment usage tracking for Grupo Casais.
User is non-technical, works in Portuguese, and expects direct execution.

## Stack And Commands

- Frontend: React 19 + Vite + Tailwind + Recharts + Zustand
- Backend: Firebase Cloud Functions v2 + Firestore
- Firebase project: `casais-rfid`
- Firestore base path: `artifacts/casais-rfid/public/data/`
- Frontend dev: `cd Frontend_App/dashboard && npm run dev`
- Frontend deploy: `cd Frontend_App/dashboard && npm run deploy`
- Backend deploy: `cd Backend_Cloud/functions && firebase deploy --only functions`

## Active Documentation

Read in this order when context matters:

1. `README.md`
2. `docs/INDEX.md`
3. `docs/ROADMAP_EXECUCAO.md`
4. `FINDINGS.md`
5. `docs/DOCUMENTATION_POLICY.md`
6. `docs/architecture/DATA_MODEL_CURRENT.md`
7. `docs/integrations/project_procore_integration.md`

Historical root files and `docs/archive/` are supporting context only.

## Invariants

- Closed sessions keep immutable tariff and cost snapshots.
- `machines.tariffHistory[]` is append-only.
- Casais blue `#005EB8` is the primary brand color.
- Firestore remains the operational source of truth even when Procore is synced.

## Documentation Model

- Current implementation truth lives in `docs/`.
- Durable multi-IA memory lives in `obsidian-vault/`.
- Session evidence lives in `docs/sessions/`.
- Historical plans and superseded snapshots live in `docs/archive/`.

When code changes behavior, update the active docs in the same task.

## FINDINGS.md

Append only when you discover:

- a real bug root cause
- a hidden ID, config value or environment trap
- a vendor or sandbox limitation
- an old documentation assumption that is false

Do not use `FINDINGS.md` for generic summaries or routine logs.

## Autonomy

Search before asking.
Verify files exist before creating new ones.
Prefer updating canonical docs over creating new top-level notes.

## Persistent Memory (ICM)

This project uses [ICM](https://github.com/rtk-ai/icm) for persistent memory across sessions.
You must use it actively.

### Recall Before Starting Work

```bash
icm recall "query"
icm recall "query" -t "topic-name"
icm recall-context "query" --limit 5
```

### Store Triggers

You must call `icm store` when any of the following happens:

1. Error resolved
2. Architecture or design decision made
3. User preference discovered
4. Significant task completed
5. Conversation has gone long enough that progress memory should be compacted

Store before responding to the user.

### Other Commands

```bash
icm update <id> -c "updated content"
icm health
icm topics
```
