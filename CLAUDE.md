# CASAIS FLEET INTELLIGENCE

## Projeto
PWA industrial para gestão de frotas — Grupo Casais (construção civil, Portugal).
Projeto académico competitivo, apresentação Junho 2025. Nível enterprise.
O utilizador não é técnico — dá ordens em linguagem natural. Claude executa de forma autónoma.

## Stack & Comandos
- Frontend: React 19 + Vite, Tailwind CSS, Recharts, Zustand
- Backend: Firebase Cloud Functions v2 (Node.js 24) + Firestore
- Dev: `cd Frontend_App/dashboard && npm run dev` → localhost:5173
- Deploy backend: `cd Backend_Cloud && firebase deploy --only functions`
- Firebase project ID: `casais-rfid`

## Firestore — base path: `artifacts/casais-rfid/public/data/`
- `operators/{cardId}` — { name, email, registeredAt }
- `machines/{machineId}` — { name, status, totalHours, consumptionRate(L/h), currentTariff{type, machineCostPerHour, operatorCostPerHour}, tariffHistory[] }
- `sessions/{autoId}` — { cardId, machineId, startTime, endTime, durationHours, status, obraId, costs{machine,operator,total}, tariffSnapshot{} }
- `scan_buffer/latest` — último scan RFID (auto-fill frontend)
- `unregistered_scans/{id}` — tentativas não autorizadas
- `alerts/{id}` — sessão longa / auto-close, validação por email
- `obras/{id}` — pode NÃO existir (sessions têm obraId mas sem doc correspondente)
- `integrations/procore` — tokens OAuth, defaultProcoreProjectId, cache sync
- Schema detalhado (só ler se a tarefa exigir): `docs/architecture/ARQUITETURA_DADOS.md`

## Navegação no Código

Frontend: `Frontend_App/dashboard/src/`
- `views/` — páginas principais (DashboardView, MaquinasView, SessoesView, FinanceiroView...)
- `pages/` — também tem páginas (verificar aqui antes de criar nova view)
- `components/` → `ui/` (botões, cards), `layout/` (Sidebar, Header)
- `hooks/` — custom React hooks
- `store/` — Zustand (useStore.js — tariffs, machines, sessions)
- `utils/` — formatters.js, exportCSV.js, mockData.js, dateFilters.js
- `config/firebase.js` — config hardcoded, sem .env

Backend: `Backend_Cloud/functions/`
- `index.js` — handleSessionTrigger (RFID → sessão START/STOP + alertas)
- `procore/procoreBridge.js` — OAuth + sync endpoints
- `procore/procoreSessionExporter.js` — exportar sessões como Timecards Procore
- `procore/procoreScheduler.js` — cron: hourly sync + 23:30 writeback

Docs (só ler quando a tarefa exige — não explorar por defeito):
- Schema detalhado → `docs/architecture/ARQUITETURA_DADOS.md`
- Estado features → `DOCS_ROADMAP.md` — pode estar desatualizado, verificar código

## FINDINGS.md — Memória Persistente
Ficheiro `FINDINGS.md` na raiz mantido pelo Gemini. Claude lê só quando a tarefa atual
toca um tópico já registado lá (procore, tarifas, firestore quirks, deploy).

Quando Claude descobre algo não-óbvio — root cause de bug, ID/config escondida,
comportamento contraintuitivo, assumpção errada nos docs — diz ao utilizador:
*"Passa ao Gemini: append a FINDINGS.md: [YYYY-MM-DD] [topic]: [descoberta]"*

NÃO usar para: estado de tarefas (DOCS_ROADMAP), histórico (DOCS_HISTORY), nada
derivável do código.

## Claude como Orquestrador — o que fica aqui vs o que delega

### FICA NO CLAUDE (lógica + arquitetura)
Bugs complexos, Firebase lógica, Procore, decisões multi-ficheiro, segurança, planeamento.

### VAI PARA GEMINI FLASH (gratuito, ilimitado) — Claude dá brief
| Tarefa | O que Claude fornece no brief |
|--------|------------------------------|
| **Git commit + push** | Ficheiros a adicionar + mensagem de commit |
| CSS / Tailwind / UI simples | Ficheiro, linhas, o que mudar, cor #005EB8 |
| Atualizar docs (.md) | Ficheiro + diff do que mudou |
| Verificar build | Comando a correr + colar output de volta ao Claude |
| Testes visuais browser | URL + o que verificar |
| Mock data / configs simples | Ficheiro + estrutura |

### CHAMAR OPUS (Claude avisa proativamente)
Novo sistema >5 ficheiros, bug que Sonnet tentou 2x, decisão irreversível de dados.

### PESQUISA INTERNA (haiku-rapido — não consome contexto principal)
Localizar ficheiro/função desconhecida antes de implementar.

**Autonomia:** Grep/Glob antes de perguntar. Verificar se existe antes de criar.
Cada sessão = 1 tema. Nova sessão quando o assunto muda completamente.

## Template de Brief para Gemini (formato fixo)
Quando Claude delega ao Gemini, dita este formato ao utilizador:
```
CONTEXTO: [1 linha — o que fazemos e porquê]
FICHEIRO: [path exato, ou "-" se git/comando]
ALVO: [linhas, função, ou "novo ficheiro"]
TAREFA: [o que mudar exatamente — sem ambiguidade]
NÃO TOCAR: [anti-scope-creep]
VALIDAR: [como saber que correu bem]
```

## Integração Procore (Sandbox Dev — IDs estáveis, não resetam)
- Company ID: 4283171 | Projeto: "1234 - Sandbox Test Project"
- PWA = master operacional (RFID, sensores, CO₂, manutenção)
- Procore = master administrativo (projetos, pessoas, equipment registry)
- Auto-set `defaultProcoreProjectId` no sync quando há 1 projeto
- TODO Phase 2: filtrar `ownership_type === 'owned'` em `procoreBridge.js` ~L1041

## Tarifários — Imutáveis
- `getTariffForDate(machine, date)` em `Backend_Cloud/functions/index.js` ~L223
- `sessions.tariffSnapshot` e `sessions.costs` gravados no fecho — nunca alterar
- `machines.tariffHistory[]` nunca apagar — histórico de versões

## Branding & Código
- Cor Casais: #005EB8 (azul — nunca verde)
- CO₂: horas × consumo(L/h) × 2.68 kg/L
- Estilo estudante: variáveis simples (data, token), commits naturais ("fix bug")
- Firebase Auth não configurado (erro esperado na consola, não crítico)
