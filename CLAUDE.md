# CASAIS FLEET INTELLIGENCE

## Projecto
PWA industrial gestão de frotas — Grupo Casais (Portugal). Académico, Junho 2025, nível enterprise.
Utilizador não-técnico — ordens em PT, Claude executa autónomo.

## Stack & Comandos
- Frontend: React 19 + Vite + Tailwind + Recharts + Zustand
- Backend: Firebase Cloud Functions v2 (Node.js 24) + Firestore | project: `casais-rfid`
- Dev: `cd Frontend_App/dashboard && npm run dev` → localhost:5173
- Deploy frontend: `npm run deploy` (em Frontend_App/dashboard — build + hosting num só)
- Deploy backend: `cd Backend_Cloud && firebase deploy --only functions`

## Estrutura de Código
Frontend: `Frontend_App/dashboard/src/{views,pages,components,hooks,store,utils}`
Backend: `Backend_Cloud/functions/{index.js, procore/}`
Firestore base: `artifacts/casais-rfid/public/data/`

## Memory Files — carregar sob demanda
- Schema Firestore + tarifários → `.claude/memory/project/architecture.md`
- Procore (IDs, OAuth, ficheiros) → `.claude/memory/project/procore.md`
- Branding + CO₂ + Tailwind → `.claude/memory/project/branding.md`
- Delegação Claude/Gemini/Opus → `.claude/memory/project/ai_workflow.md`
- Docs index → `docs/INDEX.md`

## Regras Invioláveis
- `sessions.tariffSnapshot` e `sessions.costs` — NUNCA alterar após fecho de sessão
- `machines.tariffHistory[]` — NUNCA apagar (append-only)
- Cor #005EB8 sempre — verde NUNCA
- Firebase Auth não configurado → erro na consola é esperado, ignorar

## FINDINGS.md
Quando descobrires algo não-óbvio (root cause, ID escondida, assumpção errada):
*"Passa ao Gemini: append FINDINGS.md: [YYYY-MM-DD] [topic]: [descoberta]"*
Lê FINDINGS.md quando tarefa toca procore, tarifas, firestore quirks ou deploy.

## Delegação Rápida
- CSS / commits / docs / build → **Gemini** (usar `/gemini-brief`)
- Sistema novo >5 ficheiros / bug tentado 2x → **Opus**
- Pesquisa de ficheiro desconhecido → **haiku-rapido**
- Fim de sessão → `/wrap-up`

## Autonomia
Grep/Glob antes de perguntar. Verificar se existe antes de criar. 1 tema por sessão.
claude-mem injeta contexto de sessões anteriores automaticamente — não re-explicar o que já foi feito.
