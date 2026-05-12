# Docs Index — Casais Fleet Intelligence

Mapa de "se tarefa = X → lê doc Y". Claude consulta este ficheiro quando a memory file não chega.

## Arquitectura & Schema

| Tarefa | Ler |
|--------|-----|
| Schema Firestore completo (todas as coleções, campos, tipos) | `docs/architecture/ARQUITETURA_DADOS.md` |
| Decisões de arquitectura passadas (ADRs) | `docs/architecture/ADR/` |
| Como funciona o trigger RFID → sessão | `Backend_Cloud/functions/index.js` ~L1 |
| Tarifários — lógica completa | `Backend_Cloud/functions/index.js` ~L223 + `docs/architecture/ARQUITETURA_DADOS.md` |

## Procore Integration

| Tarefa | Ler |
|--------|-----|
| Estado atual da integração (fases, bugs, TODOs) | `docs/integrations/project_procore_status.md` |
| OAuth flow detalhado | `Backend_Cloud/functions/procore/procoreBridge.js` |
| Exportar sessões → Timecards | `Backend_Cloud/functions/procore/procoreSessionExporter.js` |

## Features & Estado

| Tarefa | Ler |
|--------|-----|
| O que está feito / em progresso / pendente | `DOCS_ROADMAP.md` (pode estar desatualizado — verificar código) |
| Histórico de decisões | `DOCS_HISTORY.md` |
| Bugs e descobertas não-óbvias | `FINDINGS.md` |

## Standards & Padrões

| Tarefa | Ler |
|--------|-----|
| Padrões de código usados no projecto | `docs/standards/CODE_PATTERNS.md` |
| Schemas Firebase detalhados | `docs/standards/FIREBASE_SCHEMAS.md` |

## Sessões de Trabalho

| Tarefa | Ler |
|--------|-----|
| O que foi feito nas últimas sessões | `docs/sessions/` (ficheiros por data) |
| Última sessão | `.claude/memory/runtime/last_wrapup.md` |
