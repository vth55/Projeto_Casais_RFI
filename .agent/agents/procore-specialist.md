---
name: procore-specialist
description: Especialista em integração Procore para o projecto Casais Fleet Intelligence. IDs sandbox estáveis, OAuth flow, equipment sync, timecards. Use quando a tarefa envolve Procore API, OAuth tokens, sincronização, equipment, timecards.
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
---

# Procore Specialist — Casais Fleet Intelligence

## IDs Sandbox (estáveis — nunca resetam)
- Company ID: `4283171`
- Projecto: `"1234 - Sandbox Test Project"`
- Sandbox URL: `sandbox.procore.com` / `login-sandbox.procore.com`
- Redirect URI: `https://casais-rfid.web.app/api/procore/callback`

## Arquitectura de integração
- **PWA = master operacional** (RFID, sensores, CO₂, manutenção)
- **Procore = master administrativo** (projectos, pessoas, equipment registry)
- Tokens em Firestore: `artifacts/casais-rfid/public/data/integrations/procore`
- Secrets Firebase: `PROCORE_CLIENT_ID`, `PROCORE_CLIENT_SECRET`, `PROCORE_COMPANY_ID`

## Ficheiros
- `Backend_Cloud/functions/procore/procoreBridge.js` — OAuth + sync endpoints (routing interno)
- `Backend_Cloud/functions/procore/procoreSessionExporter.js` — sessões → Timecards
- `Backend_Cloud/functions/procore/procoreScheduler.js` — cron horário + writeback 23:30

## Estado atual (Mai/2026)
- **Fases 0-5 concluídas:** OAuth, sync, timecards, UI badges, matching operadores/obras
- **Equipment: retorna 0** — todos os endpoints 404 (tool provavelmente não activada no admin sandbox)
- **Fase 6 pendente:** demo à equipa Casais com conta produção

## TODOs conhecidos
- Phase 2: filtrar `ownership_type === 'owned'` em `procoreBridge.js` ~L1041
- Equipment: activar tool no Procore Admin → Company Tools (via Playwright sandbox.procore.com)
- Remover `handleSeedEquipment` de procoreBridge.js (função fake, não deve existir)

## OAuth Flow
1. Frontend → `/api/procore/auth` → redirect para `login-sandbox.procore.com`
2. Callback → `/api/procore/callback` → troca code por tokens
3. Tokens guardados em Firestore `integrations/procore`
4. Refresh automático quando token expira

## Endpoints sync disponíveis
- `/api/procore/sync` — sync completo (operadores + obras + equipment)
- `/api/procore/export-sessions` — export sessões como Timecards
- `/api/procore/status` — estado da integração e tokens

## Dados sensíveis
Qualquer token OAuth ou client secret deve ser envolvido em `<private>` tags para não ser persistido pelo claude-mem.
