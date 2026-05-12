# FINDINGS — Memória Persistente do Projeto

Mantido pelo Gemini Flash a pedido do Claude. Entradas no topo (mais recentes primeiro).
Nunca apagar entradas antigas — só adicionar.

Para que serve: registar conhecimento não-óbvio que se descobre durante o trabalho —
root causes de bugs, IDs/configs escondidas, comportamentos contraintuitivos, assumpções
erradas em docs. Evita re-investigar a mesma coisa em sessões futuras.

---

## 2026-05-07 — Sistema de Memória AI implementado (6 níveis)

Migração completa feita em sessão de 2026-05-06/07. Branch: `migration/claude-setup`.

**O que foi criado (NUNCA recriar — actualizar os existentes):**

Memory files de projecto → `.claude/memory/project/`:
- `architecture.md` — schema Firestore, tarifários imutáveis
- `procore.md` — IDs sandbox, OAuth, estado, TODOs
- `branding.md` — #005EB8, CO₂ formula, Tailwind classes
- `ai_workflow.md` — tabela Claude/Gemini/Opus com triggers
- `stack.md` — versões, comandos dev/deploy, estrutura

Memory files de padrões → `.claude/memory/patterns/`:
- `firestore-quirks.md` — obras pode não existir, tariffs imutáveis
- `deploy-workflow.md` — npm run deploy faz build+hosting num só
- `playwright-usage.md` — MCP para interactivo, CLI para scripts

Hooks de segurança → `.claude/hooks/` (registados em `.claude/settings.json`):
- `user-prompt-submit.sh` — keyword routing: injeta memory file quando prompt menciona procore/firestore/deploy/etc
- `pre-tool-bash.sh` — bloqueia --no-verify e push --force main
- `post-compact.sh` — recall 1 linha após compressão de contexto

Skills (slash commands) → `.claude/commands/`:
- `/wrap-up` — cria `docs/sessions/YYYY-MM-DD_HH-MM.md` com resumo da sessão
- `/gemini-brief` — formata handoff para Gemini Flash
- `/screenshot URL ficheiro` — npx playwright screenshot

Agents especializados criados:
- `.claude/agents/procore-specialist.md` — sub-agente Claude Code com contexto Procore
- `.agent/agents/procore-specialist.md` — role definition para qualquer IA
- `.agent/agents/fleet-data-specialist.md` — RFID, tarifários, CO₂, sessões

Agents adaptados para Casais:
- `.agent/agents/frontend-specialist.md` — +React 19/Vite, #005EB8, Zustand, sem Next.js
- `.agent/agents/backend-specialist.md` — +Firebase Functions v2, Firestore base path
- `.agent/agents/orchestrator.md` — routing completo 15 agentes Casais

Agents apagados (irrelevantes): game-developer, seo-specialist, mobile-developer, devops-engineer, database-architect, product-owner

**Segurança:** EMAIL_PASS plaintext foi removido de `.claude/settings.local.json`

**Docs:** `docs/INDEX.md` criado (mapa tarefa→doc), `docs/sessions/` para wrap-ups

**claude-mem:** Instalado com Gemini 2.5 Flash-Lite. Web UI: localhost:37777. Substitui hooks SessionStart/Stop.

---

## 2026-05-12 — Procore Equipment v2.1: ULIDs estáveis sandbox

Endpoint correcto: `POST/GET /rest/v2.1/companies/4283171/equipment_register`
Campos obrigatórios no POST: `name`, `equipment_id`, `status_id`, `category_id`, `type_id`.

ULIDs do sandbox (não resetam — Dev Sandbox):
- `status_id` "Active": `01KPRV693GQFM6FCM77D59YKFT`
- `category_id` "terra": `01KQCGF5S8GME0ZQNGKXPS9WN8`
- `type_id` "escavadora": `01KQCGFKFZK4P5H84XG98SYPM6`

**Envelope v2**: respostas em `{ "data": [...], "meta": { "total_count": N } }` — v1 retorna array directo.
**Body v2**: POST/PATCH usam body flat (sem wrapper `{ equipment: {...} }`).
**configurable_field_sets**: GET a nível de projecto, não POST a nível de empresa.

Sync testado: GET count:2, POST create HTTP 201, fullSync machinesCreated:2. Tudo funcional.

---

## 2026-04-29 — Procore: coleção `obras` não existe
A coleção `artifacts/casais-rfid/public/data/obras` não existe no Firestore.
Sessions têm campo `obraId` mas sem documentos correspondentes.
Causou bug de 0/113 sessões exportadas (fuzzy match retornava null para todas).

**Resolvido:**
- `procoreSessionExporter.js`: adicionado `getDefaultProcoreProject()` como fallback
- `procoreBridge.js` `runFullSync()`: auto-deteta projeto único e guarda `defaultProcoreProjectId`

## 2026-04-29 — Procore Sandbox: IDs estáveis
Company ID: 4283171 | Único projeto: "1234 - Sandbox Test Project".
Sandbox dev (não monthly) → IDs não resetam, matching Procore↔Firestore preserva-se.
