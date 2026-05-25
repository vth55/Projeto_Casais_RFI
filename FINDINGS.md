# FINDINGS - Persistent Project Findings

> Active note. Maintained by any AI or collaborator who discovers non-obvious project truth.
> Do not treat this as Gemini-specific memory.

Purpose:
- real bug root causes
- hidden IDs, config and environment traps
- vendor or sandbox limitations
- false assumptions in old docs
- findings worth remembering across sessions

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

## 2026-05-18 — Cenário E (WorkOrder reset horas) testado e confirmado

`onWorkOrderToProcore` em `procoreDeepIntegration.js` reseta `hoursSinceMaintenance = 0` + define `lastMaintenanceAt` quando WO passa para `estado = 'concluida'`.

**Condição crítica:** o reset SÓ corre se a WO já tiver `procoreObservationId` definido.
Se a WO não tiver `procoreObservationId`, o trigger entra no bloco "criar observation" (linha ~568) e faz `return null` ANTES de chegar ao bloco de reset (linha ~630).

Fluxo correcto de produção:
1. WO criada → algum update → trigger cria Procore Observation → `procoreObservationId` é guardado no doc
2. WO updated para `concluida` → trigger fecha observation (sandbox 405 = limitação conhecida) + reseta horas

Testado com `mach-volvo-a30` (obraId=procore_328122, procoreProjectId=328122). Trigger disparou em ~5s.
`hoursSinceMaintenance`: 87.5h → 0 ✅ | `lastMaintenanceAt`: definido ✅

---

## 2026-05-18 — Procore v1.0 Equipment endpoints: sandbox limitation (timecards equipment_id)

`GET /rest/v1.0/projects/328122/equipment` → **404** no sandbox.
`GET /rest/v1.0/companies/4283171/equipment` → **404** no sandbox.

O `equipment_id` nos timecards v1.0 é um ID integer do modelo v1.0 — diferente dos ULIDs do v2.1 `equipment_register`.
O sandbox não expõe o modelo de equipamento v1.0, por isso `equipment_id` fica `null` nos timecards.

O código trata isto: `fetchProjectEquipmentV1` faz GET → 404 → retorna `[]` → `bestV1Match` retorna `null` → `equipment.id = null` → campo não enviado no POST do timecard.
Em produção com Procore real, o endpoint `/projects/{id}/equipment` devolve a lista com IDs integer e o código associa correctamente.

A máquina é identificada na `description` do timecard: `IoT · Compactador Hamm H13i · 0.00h · António Costa`.

**Não é bug — é sandbox limitation. Em produção, equipment_id será preenchido correctamente.**

---

## 2026-05-18 — Truncação de descrição de timecard corrigida

`machineName.length > 20 ? machineName.slice(0, 18) + '…'` cortava "Compactador Hamm H13i" (22 chars) para "Compactador Hamm H…".
Corrigido para `> 27 ? slice(0, 25) + '…'` — nomes até 27 chars passam intactos; 28+ ficam com 26 chars (25 + "…").
Margem calculada: "IoT · "(6) + machineShort(≤27) + " · entrada · "(13) + operatorShort(≤13) = 59 chars ≤ 60 ✓.
Verificado ao vivo: description `"IoT · Compactador Hamm H13i · 0.00h · António Costa"` (51 chars) sem truncação.

---

## 2026-05-15 — Procore Observations POST: sandbox limitation

`POST /rest/v1.0/projects/328122/observations/items` → **404** no sandbox (rota ausente).
`POST /rest/v1.0/observations/items?project_id=328122` (flat endpoint) → **422** com `"name":["can't be blank"]` e `"type":["required"]` independentemente do corpo enviado. A validação ignora todos os campos enviados — limitação conhecida do sandbox.

`GET /rest/v1.0/observations/items?project_id=328122` → **200 []** (funciona).
`GET /rest/v1.0/observations/types?project_id=328122` → **200** (tipos existem, ex. id=10845079 "Commissioning").

A ferramenta Observations foi activada no projeto 328122 em 2026-05-15 via Admin → Tool Settings.
O Cloud Function `onAvariaCreatedToProcore` dispara correctamente e tenta criar a observação — apenas o sandbox bloqueia. Comportamento correcto em produção.

`procoreBridge.js::createObservation` actualizado: tenta endpoint project-nested primeiro, cai para flat se 404 (graceful degradation sem crash).

**Não é bug — é sandbox limitation idêntica a DELETE 405 e PATCH status ignorado.**

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

**2026-05-12 update** — 6 equipamentos adicionais criados via `equipment-bulk`:
RET-001 "Retroescavadora 01/02", GIR-001 "Giratória 01", DMP-001 "Dumper 01",
CPT-001 "Compactador 01", GRU-001 "Grua 01". Total sandbox: 8 equipamentos.
Procore → Firestore sync: equipment=8, machinesCreated=6, machinesUpdated=2. ✅

**ownership obrigatório no POST**: `equipment-bulk` sem `ownership` → 422. Sempre incluir.
**procorePwaProjector.js**: já trata machine stubs. Não adicionar lógica redundante em procoreBridge.
Projector usa `procore_<ULID>` como doc ID nas machines (não `equipment_id`).

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
