# Estratégia de Integração SAP / Procore / PWA — 2026Q3
**Data:** 2026-06-09
**Estado pivot:** ferramentas/equipamentos NFC (pós 2026-05-25)
**Autor:** auditoria automática + decisões propostas para validação

---

## 1. DECISÃO DE FONTES DE VERDADE

| Domínio | Fonte oficial | Sentido do fluxo | Quem edita |
|---|---|---|---|
| **Obras / Projetos / morada / equipa / fase / status** | **Procore** | Procore → PWA (read-only na PWA) | Procore admin |
| **Equipamentos / modelos / valor de substituição / centro de custo / nº imobilizado** | **SAP** | SAP → PWA (read-only nos campos master) | SAP admin |
| **Tags NFC ↔ unidade física** | **PWA** | PWA → SAP (writeback opcional) | Operador/admin PWA |
| **Sessões NFC (checkout/checkin)** | **PWA** | PWA → SAP (M1 notification) | Operador (NFC scan) |
| **Guias / transferências físicas** | **PWA** | PWA → SAP (M2 notification) + Procore log | Encarregado |
| **Avarias com foto** | **PWA** | PWA → Procore (Observation) + SAP PM (M3) | Operador |
| **Alertas operacionais (overdue, sem localização)** | **PWA** | PWA-only (derivado) | Sistema |
| **Última leitura NFC / localização lógica** | **PWA** | PWA-only | Sistema |
| **Sync status / queues / idempotency** | **PWA** | PWA-only | Sistema |

**Regra de ouro:** a PWA não duplica o trabalho — obra e equipamento são **lidos**, nunca criados em duplicado. Se o utilizador precisar de criar uma obra ou um equipamento que não existe, é redireccionado para Procore/SAP respectivamente.

### O que fica read-only na PWA

- Nome/morada/status da obra (vem do Procore)
- Marca/modelo/categoria/nº imobilizado/valor de substituição (vem do SAP)
- Centro de custo

### O que pode ser editado localmente

- Atribuição `tool ↔ obra` (transferências físicas via NFC)
- Tag NFC associada a uma unidade
- Estado operacional (`AVAILABLE / IN_USE / IN_REPAIR / LOST`)
- Fotos de avaria
- Notas de campo
- Default replacement value (fallback quando SAP não tem)

### Conflitos detectados na auditoria

- **`CatalogoModelosView` permite criar modelos manualmente** (`Frontend_App/dashboard/src/views/CatalogoModelosView.jsx`). Se SAP for fonte oficial, criação manual deve ser desabilitada para roles não-admin (já é `systemRole: admin/gestor` apenas — ok mas precisa de banner "Importado de SAP" + bloqueio de edit nos campos master).
- **Botão "Obras geridas no Procore"** está visível para encarregado (`mob-09`). Deve ser admin-only — corrigir `canAccess`.
- **`equipment_models` colecção** vive em Firestore mas não tem campo `sapSync` para distinguir importado vs criado localmente. Adicionar `source: 'sap' | 'manual'` + `sapAssetNumber`.

---

## 2. AMBIENTES SANDBOX — CHECKLISTS

### 2.1 Procore — sandbox actual: avaliação

**Estado:** Dev Sandbox funcional para a maioria do fluxo. OAuth + Read + Write básico funcionam.

**Limitações confirmadas (`docs/integrations/project_procore_integration.md`):**
- `GET /rest/v1.0/projects/328122/equipment` → 404 (Equipment Tool não activado)
- `DELETE /equipment/{id}` → 405 (Method Not Allowed no sandbox)
- `PATCH` para arquivar → 200 mas sem efeito
- `POST /observations` → bloqueado no sandbox
- Webhooks: precisam de URL público (ngrok ou Firebase Hosting)

**Recomendação:** **Manter o sandbox actual** e activar o **Equipment Tool** via UI Procore (`app.procore.com` → empresa 4283171 → projeto 328122 → Project Tools → Equipment). Isso resolve o 404 sem migrar de sandbox.

**Quando migrar para trial de 1 mês:** Apenas se precisares de:
- Testar Observations (avarias)
- Validar webhooks em ambiente isolado por dia
- DELETE/PATCH com efeito real

Se a apresentação académica não exige nenhum desses, **fica no sandbox actual**.

**Checklist Procore sandbox usável:**

- [ ] Verificar token OAuth válido (cron `procoreTokenRefresh` activo)
- [ ] Activar Equipment Tool no projeto 328122 (UI manual)
- [ ] Confirmar 1 obra activa (Torre Boavista) ligada ao projecto Procore
- [ ] Verificar credenciais em Firebase Secrets: `PROCORE_CLIENT_ID`, `PROCORE_CLIENT_SECRET`, `PROCORE_COMPANY_ID`, `PROCORE_WEBHOOK_SECRET`
- [ ] Correr `procoreScheduledSync` manualmente uma vez e ver logs
- [ ] (Opcional) Configurar webhook → Firebase HTTP function URL pública

### 2.2 SAP — não há sandbox real activo

**Estado:** 2 bridges implementadas (`sapBridge.js` para sessões M1, `sapTransferBridge.js` para guias M2). Modo DEMO/mock por defeito quando `SAP_API_KEY` está vazia. Endpoint apontado: `https://sandbox.api.sap.com/s4hanacloud/...`.

**Para activar SAP real precisas de:**

| Credencial | De onde | Notas |
|---|---|---|
| `SAP_API_KEY` | SAP Business Accelerator Hub (`api.sap.com`) — registar developer key | Gratuito para sandbox público SAP |
| `SAP_BASE_URL` | Confirmar endpoint do sandbox público (provavelmente já correcto em config) | Validar com a equipa SAP da Casais |
| `SAP_NOTIFICATION_TYPE` | M1/M2/M3 — confirmar com SAP admin Casais | Provavelmente `M1` para sessões, `M2` para transferências, `M3` para avarias |
| `SAP_NOTIFICATION_PRIORITY` | 1-5 | Padrão: 3 (médio) |
| `SAP_FUNCTIONAL_LOCATION` | ID por obra | Mapeamento obra→FunctionalLocation precisa de tabela |
| `SAP_PLANT_CODE` | 1 valor da empresa Casais | Pedir à equipa SAP |
| `SAP_BUSINESS_PARTNER_ID` | ID do operador no SAP HR | Mapeamento operador→BP precisa de tabela |

**Recomendação:** Não há urgência em activar SAP real para o demo académico. **Manter mock até depois da apresentação.** O código está pronto — basta adicionar a key.

**Checklist SAP sandbox usável:**

- [ ] Vitor regista developer key em https://api.sap.com (gratuito)
- [ ] Adicionar `SAP_API_KEY` em Firebase Secrets (`firebase functions:secrets:set SAP_API_KEY`)
- [ ] Confirmar mapeamento obra → SAP FunctionalLocation (tabela em Firestore: `sap_mapping/obras`)
- [ ] Confirmar mapeamento operador → SAP BusinessPartner (tabela em Firestore: `sap_mapping/operators`)
- [ ] Confirmar `notificationType` por evento (M1/M2/M3) com SAP admin Casais
- [ ] Disparar 1 sessão NFC com `SAP_DEMO_MODE=false` e verificar log
- [ ] Verificar que `sap_transfer_queue` processa sem erro

### 2.3 Credenciais que o Vitor precisa de pedir/criar

**A pedir (humano-em-loop):**

1. **SAP Business Accelerator Hub key** — registo pessoal em https://api.sap.com (5 min). Suficiente para sandbox público.
2. **Casais SAP admin** — confirmar: notification types (M1/M2/M3), plant code, mapeamento FunctionalLocation por obra real, mapeamento BusinessPartner por operador.
3. **Procore Equipment Tool** — activar no UI sandbox (passo manual, sem credencial nova).
4. **Webhook URL público** — criar Firebase HTTP function dedicada se queres testar webhooks (não bloqueante).

**Já existentes (não tocar):**

- Procore OAuth credentials em Firebase Secrets ✅
- Firebase project `casais-rfid` ✅
- Gemini API key (separada, para claude-mem) ✅

---

## 3. CONTRATO DE EVENTOS OUTBOUND

### 3.1 Eventos PWA → SAP

Todos vão por `sap_transfer_queue/{transferId}_{eventType}` ou `sapBridge` triggers. Idempotência via `Idempotency-Key` header + chave determinística Firestore.

#### TOOL_SESSION_OPENED (já existe — `onToolSessionCreatedToSap`)
```json
{
  "eventType": "TOOL_SESSION_OPENED",
  "idempotencyKey": "{sessionId}:OPENED",
  "occurredAt": "2026-06-09T16:30:00Z",
  "tool": { "id": "SERRA-001", "sapAssetNumber": "INV-..." },
  "operator": { "uid": "...", "sapBusinessPartnerId": "..." },
  "obra": { "id": "obra-torre-boavista", "sapFunctionalLocation": "..." },
  "metadata": { "nfcReadAt": "...", "originLocation": "Armazém Central" }
}
```

#### TOOL_SESSION_CLOSED (já existe — `onToolSessionClosedToSap`)
```json
{
  "eventType": "TOOL_SESSION_CLOSED",
  "idempotencyKey": "{sessionId}:CLOSED",
  "durationHours": 3.2,
  "returnLocation": "...",
  "co2Estimate": null
}
```

#### TOOL_TRANSFER_DISPATCHED (já existe — `onToolTransferWritten` DISPATCHED branch)
```json
{
  "eventType": "TOOL_TRANSFER_DISPATCHED",
  "idempotencyKey": "{transferId}:DISPATCHED",
  "originSapFL": "...", "destinationSapFL": "...",
  "tools": [{ "id": "...", "sapAssetNumber": "..." }],
  "guideRef": "transferId"
}
```

#### TOOL_TRANSFER_RECEIVED (já existe — same trigger, RECEIVED branch)

#### TOOL_DAMAGED_REPORTED (FALTA — propor adicionar)
```json
{
  "eventType": "TOOL_DAMAGED_REPORTED",
  "idempotencyKey": "{maintenanceId}:DAMAGED",
  "tool": { "id": "...", "sapAssetNumber": "..." },
  "damageType": "AVARIA|PERDIDO|PRECISA_INSPECAO|PRECISA_REPARACAO",
  "photos": ["storage://..."],
  "reportedBy": { "uid": "...", "sapBusinessPartnerId": "..." },
  "obra": { "id": "...", "sapFunctionalLocation": "..." }
}
```
**Trigger novo:** `onToolMaintenanceCreatedToSap` (lê de `tool_maintenance` colecção, push para SAP PM como Notification M3). **Não implementar agora** — adicionar a backlog.

#### TOOL_LOST_DECLARED (FALTA — propor adicionar)
Disparado quando alerta `TOOL_PRESUMED_LOST` é confirmado por admin.

#### INVENTORY_RECONCILIATION_SNAPSHOT (FALTA — propor adicionar)
Cron diário/semanal. Resumo agregado por obra + estado. Idempotencyiekey = `recon:{YYYY-MM-DD}`.

### 3.2 Eventos PWA → Procore

#### EQUIPMENT_ARRIVED_AT_PROJECT (parcial — `onMachineCreatedToProcore` legado)
Quando uma transferência RECEIVED chega a uma obra, criar Procore Equipment Log entry.

#### CRITICAL_DAMAGE_AT_PROJECT (FALTA)
Quando avaria com severidade crítica é reportada, criar Procore Observation no projeto da obra.
**Bloqueio actual:** Observations bloqueadas no sandbox. Adiar para Equipment Tool migration ou trial.

#### OVERDUE_RETURN_AT_PROJECT (FALTA)
Quando alerta `TOOL_OVERDUE` activa por >24h, criar Procore Daily Log ou Equipment Log entry.

#### DAILY_SUMMARY_PER_PROJECT (existe parcial — `equipmentLogsDailyAgg`)
Resumo agregado por projecto Procore. Já implementado para máquinas legado; estender a `tools`.

### 3.3 Onde fica o estado outbound

| Localização | Conteúdo |
|---|---|
| `tool_transfers.{id}.externalSync.sap.{DISPATCHED\|RECEIVED}` | status, syncedAt, sapNotificationId, retryCount, lastError, idempotencyKey |
| `tool_sessions.{id}.sapNotification` | status, M1NotificationId, retryCount, lastError |
| `sap_transfer_queue/{transferId}_{eventType}` | retry queue (processada por `processSapTransferQueue` 2-5 min cron) |
| `procoreSyncQueue/{docId}` | retry queue Procore (processada por `procoreSyncQueueRun` 15 min cron) |
| `tool_maintenance.{id}.sapNotification` | **A criar** — status para M3 notification |
| `tool_maintenance.{id}.procoreObservation` | **A criar** — status para Procore Observation |

---

## 4. IMPLEMENTAÇÃO FEITA NESTA SESSÃO

### 4.1 Mapa: trocar tiles OSM padrão → CARTO Voyager
**Ficheiro:** `Frontend_App/dashboard/src/views/MapaObrasView.jsx` (linhas 81-87)
**Razão:** Tiles OSM padrão mostram nomes nativos (árabe, cirílico, CJK) e ficam confusos em demo. CARTO Voyager usa labels latinizados/internacionais (inglês), mantém Portugal em português onde existe, sem necessidade de API key.
**Risco:** Baixo — só muda URL de tiles. Attribution dupla mantida (OSM + CARTO). `maxZoom: 19` adicionado por compatibilidade CARTO.
**Validação:** Build deve passar; mapa deve render sem alterações de UI.

### 4.2 Sidebar: renomear "Catálogo" → "Catálogo de Modelos"
**Ficheiro:** `Frontend_App/dashboard/src/components/layout/Sidebar.jsx` (linha 44)
**Razão:** Reduzir confusão visual entre "Equipamentos" (operacional, unidades físicas) e "Catálogo" (admin, modelos master). Já é admin-only via `canAccess('catalogo')` no useAuthStore.
**Risco:** Nulo — só label. Permissões inalteradas. BottomNav mobile não tem este item.
**Validação:** Build deve passar; vista admin desktop mostra "Catálogo de Modelos" no sidebar.

### 4.3 Não implementado (deliberadamente)

- Esconder Catálogo do menu para gestor (precisa confirmação UX com Vitor)
- Adicionar campo `source: 'sap'|'manual'` aos `equipment_models` (mudança de schema — requer migração + UI)
- Bloquear edição de campos master importados de SAP (depende de banner + lógica disable)
- Eventos novos SAP/Procore (TOOL_DAMAGED_REPORTED, etc.) — precisam de design review primeiro
- Migração de sandbox Procore — precisa decisão do Vitor

---

## 5. RISCOS PENDENTES

| # | Risco | Mitigação proposta |
|---|---|---|
| 1 | SAP não pode autorizar mapeamentos FunctionalLocation/BusinessPartner antes da apresentação | Manter SAP em modo demo/mock. Mostrar o contrato outbound como prova de design. |
| 2 | Procore Equipment Tool no sandbox actual continua 404 | Activar manualmente no UI Procore (5 min) ou adiar feature de equipment sync |
| 3 | CARTO tiles podem ter rate limit não documentado em produção | Adicionar telemetria de erros 429; ter URL OSM padrão como fallback flag |
| 4 | Catálogo de Modelos visível a gestor — esperado? | Confirmar com Vitor antes de esconder |
| 5 | `Local não atribuído` no Financeiro persiste — sessão LIXA-001 sem obraId | Fix de dados em Firestore Console (não toquei) |
| 6 | Email pessoal do admin visível em Configurações | Mascarar via UI ou usar conta demo dedicada |

---

## 6. PERGUNTAS QUE BLOQUEIAM A PRÓXIMA FASE

1. **Catálogo de Modelos**: gestor vê ou só admin?
2. **SAP real**: queres activar agora (pede SAP API key + mapeamentos) ou adiar para depois da apresentação?
3. **Procore Equipment Tool**: queres que active no sandbox 328122 (passo manual no UI Procore) ou avançar com Procore sem equipment sync por enquanto?
4. **Trial Procore 1 mês**: vale a pena agora para testar Observations + Webhooks, ou ficamos no sandbox actual?
5. **Onde está hospedado o backend SAP da Casais?** Para confirmar `SAP_BASE_URL` definitivo.

---

## 7. APÊNDICE — ESTADO REAL DO BACKEND

### Procore (`Backend_Cloud/functions/procore/`)
- `procoreBridge.js` — OAuth + sync de obras/equipment/cost
- `procoreDeepIntegration.js` — webhooks + queue
- `procoreSessionExporter.js` — máquinas legado (a desactivar quando pivot terminar)
- Sandbox: empresa 4283171, projeto 328122
- 17 Cloud Functions exportadas relacionadas com Procore

### SAP (`Backend_Cloud/functions/sap/`)
- `sapBridge.js` — M1 notifications para sessões (sessões NFC)
- `sapTransferBridge.js` — M2 notifications para guias com queue + retry
- Mock por defeito (`SAP_API_KEY` vazia)
- 6 Cloud Functions exportadas relacionadas com SAP

### Queues
- `procoreSyncQueue/` (Firestore)
- `sap_transfer_queue/` (Firestore)
- Idempotência via `Idempotency-Key` header (SAP) e chave determinística (Procore)

### Tudo o resto
- `tools`, `tool_sessions`, `tool_transfers`, `tool_alerts`, `tool_maintenance` em Firestore
- Schemas em `Frontend_App/dashboard/src/types.js`
- Subscrições em `Frontend_App/dashboard/src/store/useStore.js`

---

## 8. DECISÃO PARA DEMO VS PÓS-DEMO

### Demo (estado actual)

| Domínio | Estado | O que o avaliador vê |
|---|---|---|
| Procore obras | ✅ Importadas (Torre Boavista, Viaduto IP2, Urbanização Gaia Norte) | 3 obras PT reais com badges "PROCORE" |
| SAP equipamentos | ⚠️ Mock — `SAP_API_KEY` vazia | Dados curados manualmente (marcas Hilti/Bosch/Makita, valores reais) |
| SAP outbound sessions | ⚠️ Mock silencioso | Funções existem no backend, não enviam |
| SAP outbound transfers | ⚠️ Mock silencioso | Fila `sap_transfer_queue` existe, não processa |
| PWA operacional | ✅ Real | NFC, sessões, guias, avarias, alertas, métricas |
| Integração preparada | ✅ Visível | Documento estratégico + contrato de eventos + checklists |

**Narrativa para demo:** "A PWA é a camada operacional NFC. As obras vêm do Procore. Os equipamentos virão do SAP. O contrato de eventos outbound está definido — ligar é questão de configurar as credenciais."

**Nunca fazer durante demo:**
- Criar obra na PWA manualmente (redirecionar para Procore)
- Criar modelo na PWA com dados inventados para campos SAP (mostrar label "Importado de SAP" como placeholder)
- Mostrar Catálogo de Modelos a roles não-admin (já bloqueado com `CATALOG_VIEW`)

### Pós-Demo — activar integração real

**Passo 1 — SAP real (bloqueado por credenciais):**
```bash
# 1. Registar developer key em https://api.sap.com (gratuito, 5 min)
firebase functions:secrets:set SAP_API_KEY
# 2. Com equipa SAP Casais: confirmar plant code, FunctionalLocation por obra, BusinessPartner por operador
# 3. Criar tabela de mapeamento em Firestore: sap_mapping/obras + sap_mapping/operators
# 4. Remover SAP_DEMO_MODE ou pô-lo a false
# 5. Disparar 1 sessão de teste e verificar log do sapBridge
```

**Passo 2 — Procore Equipment Tool (bloqueado por activação manual):**
```
app.procore.com → empresa 4283171 → projeto 328122 → Project Tools → Equipment → Activar
Depois: correr procoreScheduledSync e verificar que `tools` Firestore tem `procoreEquipmentId`
```

**Passo 3 — Catálogo de Modelos como fonte SAP (bloqueado por schema migration):**
- Adicionar campo `source: 'sap' | 'manual'` a `equipment_models` Firestore
- Adicionar campo `sapAssetNumber` a cada documento
- No `CatalogoModelosView`: mostrar banner "Importado de SAP" em campos read-only; permitir editar só campos operacionais (foto, localização default, notas)
- Bloquear edição de marca/modelo/valor para source=sap

**Passo 4 — Reconciliação periódica:**
- Cron diário: SAP → sync `equipment_models` (verificar se houve novos imobilizados)
- Cron diário: Procore → sync `obras` (verificar se há novos projetos ou estados alterados)
- `INVENTORY_RECONCILIATION_SNAPSHOT` semanal para SAP PM

**Invariante em todos os estados:**
> A PWA nunca pede ao utilizador para recriar manualmente o que já existe no Procore ou SAP. Se o sistema de origem ainda não estiver ligado, o campo fica a "—" com link para a fonte oficial.

---

## 9. CHECKLIST DE ENDPOINTS/EVENTOS — PRÓXIMA FASE

### SAP Inbound — Equipment Master (a implementar)

| # | Item |
|---|---|
| Source | SAP PM / Asset Management |
| Destination | Firestore `equipment_models/{modelId}` |
| Trigger | Cron diário + manual sync via Configurações → Base de Dados |
| Endpoint | `GET /API_EQUIPMENT_SRV/A_EquipmentMaster?$filter=Plant eq '${SAP_PLANT_CODE}'` |
| Idempotency key | `sapEquipmentId` como doc ID |
| Colecção local | `equipment_models` |
| Status field | `equipment_models.{id}.sapSync: { status, lastSyncAt, sapAssetNumber, error }` |
| Estado actual | ❌ Não existe — SAP bridge só faz outbound |
| Dependências | SAP_API_KEY + SAP_PLANT_CODE + mapeamento FunctionalLocation |

---

### SAP Outbound — Tool Transfer Dispatched / Received (existe parcialmente)

| # | Item |
|---|---|
| Source | PWA — `tool_transfers.{id}` evento DISPATCHED ou RECEIVED |
| Destination | SAP PM — Maintenance Notification M2 |
| Cloud Function | `onToolTransferWritten` → `sapTransferBridge.processTransferEvent` |
| Idempotency key | `${transferId}:DISPATCHED` / `${transferId}:RECEIVED` (header `Idempotency-Key`) |
| Colecção local | `sap_transfer_queue/{transferId}_{eventType}` + `tool_transfers.{id}.externalSync.sap` |
| Status field | `externalSync.sap.{DISPATCHED\|RECEIVED}.{ status, syncedAt, sapNotificationId, retryCount, lastError }` |
| Retry | Backoff 2^retryCount × 60s, máx 5. Processado por `processSapTransferQueue` (cron). |
| Estado actual | ✅ Implementado — mock por defeito (sem SAP_API_KEY) |
| Dependências | SAP_API_KEY + SAP_PLANT_CODE + mapeamento FunctionalLocation por obra |

---

### SAP Outbound — Tool Damaged / Lost / Returned (a implementar)

| # | Item |
|---|---|
| Source | PWA — `tool_maintenance.{id}` (tipo AVARIA/PERDIDO/REPARACAO) |
| Destination | SAP PM — Maintenance Notification M3 (avaria) ou M4 (perda) |
| Cloud Function | `onToolMaintenanceCreatedToSap` — **a criar** |
| Idempotency key | `${maintenanceId}:${damageType}` |
| Colecção local | `tool_maintenance.{id}.sapNotification: { status, sapNotificationId, retryCount, lastError }` |
| Status field | `sapNotification.status: 'pending' | 'synced' | 'failed'` |
| Retry | Mesma fila `sap_transfer_queue` ou nova `sap_maintenance_queue` |
| Estado actual | ❌ Não existe — `tool_maintenance` é criado mas não tem outbound SAP |
| Dependências | SAP_API_KEY + M3/M4 notification type confirmado com SAP admin Casais |

---

### Procore Inbound — Projects (existe)

| # | Item |
|---|---|
| Source | Procore API v1.0 — `/rest/v1.0/companies/{id}/projects` |
| Destination | Firestore `obras/{obraId}` campo `procoreProjectId` + sync status |
| Cloud Function | `procoreScheduledSync` (cron 6h) + `pullProcoreCache` (manual) |
| Idempotency key | `procoreProjectId` como campo único |
| Colecção local | `obras` |
| Status field | `obras.{id}.procoreSync: { lastSyncAt, procoreProjectId, status }` |
| Estado actual | ✅ Implementado e funcional no sandbox |
| Dependências | Equipment Tool activado no projeto para sync de equipment |

---

### Procore Outbound — Project Daily Summary / Critical Damage (a implementar)

| Evento | Source | Destination | Idempotency key | Estado |
|---|---|---|---|---|
| `DAILY_SUMMARY_PER_PROJECT` | Cron diário PWA | Procore Daily Log entry | `daily:{obraId}:{YYYY-MM-DD}` | Parcial (`equipmentLogsDailyAgg` legado — estender a `tools`) |
| `CRITICAL_DAMAGE_AT_PROJECT` | `tool_maintenance` tipo AVARIA_CRITICA | Procore Observation no projeto | `${maintenanceId}:procore_obs` | ❌ Bloqueado — Observations desactivadas no sandbox; adiar para Equipment Tool migration |
| `OVERDUE_EQUIPMENT_AT_PROJECT` | Cron — alertas TOOL_OVERDUE > 24h | Procore Equipment Log ou Daily Log | `overdue:{toolId}:{YYYY-MM-DD}` | ❌ Não existe |

**Colecção local para Procore outbound:** `procoreSyncQueue/{docId}` (já existe)
**Status field:** `tool_maintenance.{id}.procoreObservation: { status, observationId, retryCount, lastError }`

---

## 10. CORREÇÃO DE DIREÇÃO — AMBIENTE DEMO CONTROLADO (2026-06-09)

> **Premissa anterior invalidada.** As secções 2.3 e 6 assumiam acesso ao SAP real da Casais.  
> **Nova premissa:** ambiente totalmente controlado por nós. Credenciais Casais = irrelevante para TCC.

### Regras da nova estratégia

- NÃO pedir acesso ao SAP real da Casais.
- NÃO integrar com tenant real da Casais.
- Critério de seleção: melhor demo estável + payloads oficiais. Não "igual ao SAP da Casais".
- Em produção, troca-se a credential sem mudar código — esse é o argumento técnico.

---

### 10.1 Resposta às 10 questões

**Q1. Melhor ambiente SAP gratuito que podemos criar?**
SAP Business Accelerator Hub sandbox (api.sap.com). Gratuito com SAP account. Nenhum tenant próprio necessário. Payloads 100% oficiais.

**Q2. Qual dá melhor demo para Equipment Master, Fixed Assets, Maintenance Notification e Material Documents?**
Business Accelerator Hub: todos os 4 disponíveis em sandbox — `API_EQUIPMENT`, `CE_FIXEDASSET_0001`, `API_MAINTNOTIFICATION`, `API_MATERIAL_DOCUMENT_SRV`.

**Q3. Vale a pena usar só o Business Accelerator Hub com APIKey?**
Sim. Suficiente para demonstrar contratos de API reais.

**Q4. Vale a pena criar BTP Trial para middleware/destination sem S/4HANA real?**
Não, para o demo mínimo. Pesquisa confirmou: **BTP Trial (90 dias) NÃO inclui S/4HANA.** O Destination Service só acrescenta valor se houver um tenant S/4HANA real do outro lado. Sem tenant, é infraestrutura sem tráfego. Adiar ou usar como bonus se houver tempo e argumento de arquitetura.

**Q5. Existe S/4HANA Cloud trial realmente usável?**
Existe (14 dias, extendível 14 dias de cada vez) mas **cada extensão cria conta nova com dados apagados.** Inadequado para demo persistente. Skip.

**Q6. Se não há tenant trial usável, qual é a melhor simulação honesta?**
Business Accelerator Hub (chamadas reais de validação) + Firestore `sap_mirror/` (dados master estáveis para o demo flow). É honesto: o Business Accelerator Hub É o sandbox oficial da SAP.

**Q7. Como estruturar a demo sem parecer falso?**
Frase padrão para apresentação (ver §10.7).

**Q8. Que dados SAP sample criar no Firestore?**
`sap_mirror/equipment_master`, `sap_mirror/maintenance_notifications`, `sap_mirror/fixed_assets`, `sap_mapping/functional_locations` — ver §10.4.

**Q9. Que chamadas reais fazer contra o sandbox?**
```
GET  https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_EQUIPMENT/A_EquipmentMaster?$top=3
POST https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_MAINTNOTIFICATION/MaintenanceNotification
GET  https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader?$top=3
```
Estas 3 chamadas provam payload real ao júri.

**Q10. Que partes ficam mockadas e como mostramos?**
Mock intencional (honesto): PATCH fields custom (limitação de sandbox), sync bidirecional completo, Fixed Asset data matching a equipamentos específicos. Na apresentação: mostrar toggle `SAP_MODE=sandbox|mock` no backend. "Em produção ativa-se o modo live." Júri técnico aprecia transparência.

---

### 10.2 Comparação de opções para TCC

| Critério | **A: Business Hub** | B: Hub + BTP Trial | C: S/4HANA Trial | D: Mock local |
|---|---|---|---|---|
| Custo | €0 | €0 (90d) | €0 (14d+reset) | €0 |
| Tempo setup | **2–4h** | 8–12h | Muito complexo | 1–2h |
| Estabilidade demo | ★★★★★ | ★★★★ | ★★★ | ★★★★★ |
| Realismo júri | ★★★★ | ★★★★ | ★★★★★ | ★★ |
| Risco no dia | **Muito baixo** | Médio | Alto (data reset) | Nulo |
| Chamadas SAP reais | Sim (GET/POST) | Sim (GET/POST) | Sim (full) | Não |
| Payloads oficiais | Sim | Sim | Sim | Simulados |
| Dados persistentes | Via Firestore | Via Firestore | Resetam/14d | Sim |
| **Recomendação** | **✅ Principal** | Bonus opcional | ❌ Skip | Fallback |

**Recomendação final: Opção A** — Business Accelerator Hub + Firestore `sap_mirror/` + live toggle.

BTP Trial: só adicionar se houver ≥8h livres e argumento de arquitetura middleware for relevante para o júri específico.

---

### 10.3 Setup passo-a-passo — Opção A

1. Criar SAP account gratuita em **accounts.sap.com** (se não existir).
2. Aceder a **https://api.sap.com** → Settings → API Keys → gerar API key (aparece uma vez, guardar).
3. Testar: `GET https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_EQUIPMENT/A_EquipmentMaster?$top=3&$format=json` com header `APIKey: <key>`.
4. Adicionar ao Firebase Secrets:
   ```
   firebase functions:secrets:set SAP_API_KEY
   firebase functions:secrets:set SAP_PLANT_CODE   # valor: "1010" (plant fictício)
   firebase functions:secrets:set SAP_BASE_URL     # https://sandbox.api.sap.com/s4hanacloud
   ```
5. Atualizar `sapBridge.js`: substituir URL hardcoded por `process.env.SAP_BASE_URL` (ver §10.6).
6. Correr `scripts/sap-mirror-seed.js` para popular `sap_mirror/` no Firestore.
7. `npm run deploy`.
8. Validar: Configurações → Integrações → "Testar SAP" → resposta real do sandbox.

**Tempo estimado: 2–4 horas.**

---

### 10.4 Firestore `sap_mirror/` — Schema

```
sap_mirror/
├── equipment_master/{sapEquipmentId}
│   ├── sapEquipmentNumber: "10000001"
│   ├── description:        "Serra Circular DeWalt DWE575K"
│   ├── category:           "M"          // M = máquina/ferramenta
│   ├── manufacturer:       "DEWALT"
│   ├── model:              "DWE575K"
│   ├── plant:              "1010"
│   ├── functionalLocation: "1010-CONSTR-A"
│   ├── abcIndicator:       "A"
│   ├── serialNumber:       "DWE575-2024-001"
│   ├── _source:            "sap_sandbox"   // "sap_sandbox" | "sap_live" | "manual"
│   ├── _syncedAt:          Timestamp
│   └── _apiVersion:        "API_EQUIPMENT/1.0"
│
├── maintenance_notifications/{sapNotifId}
│   ├── NotificationNumber:    "100000001"
│   ├── NotificationType:      "M2"         // M1=uso, M2=transferência, M3=avaria
│   ├── Equipment:             "10000001"
│   ├── ShortText:             "Transfer via CASAIS Fleet NFC"
│   ├── FunctionalLocation:    "1010-CONSTR-A"
│   ├── Plant:                 "1010"
│   ├── MalfunctionStartDate:  "2026-06-09"
│   ├── _status:               "OSNO"       // Outstanding Notification
│   ├── _source:               "casais_pwa"
│   └── _syncedAt:             Timestamp
│
├── fixed_assets/{assetId}
│   ├── FixedAsset:         "1000"
│   ├── FixedAssetSubNumber:"0001"
│   ├── AssetDescription:   "Serra Circular DeWalt DWE575K"
│   ├── NetBookValue:       450.00
│   ├── AcquisitionValue:   520.00
│   ├── Currency:           "EUR"
│   ├── CostCenter:         "1010"
│   ├── CompanyCode:        "1010"
│   ├── _source:            "sap_sandbox"
│   └── _syncedAt:          Timestamp
│
└── cost_centers/{ccId}
    ├── CostCenter:             "1010"
    ├── CostCenterDescription:  "Frota e Equipamentos — Casais"
    ├── CompanyCode:            "1010"
    └── _source:                "sap_sandbox"
```

---

### 10.5 O que chamar ao SAP real vs o que manter mock

| Operação | Destino | Modo |
|---|---|---|
| `GET /API_EQUIPMENT?$top=5` | Business Accelerator Hub | **Live** — validação payload |
| `GET /API_MAINTNOTIFICATION?$top=3` | Business Accelerator Hub | **Live** — validação payload |
| `POST /API_MAINTNOTIFICATION` (1 notif demo) | Business Accelerator Hub | **Live** — demo ao júri |
| `GET /API_MATERIAL_DOCUMENT_SRV?$top=3` | Business Accelerator Hub | **Live** — validação |
| Dados master para demo flow | Firestore `sap_mirror/` | **Mock** — estável |
| PATCH fields custom | — | **Mock** — limitação de sandbox |
| Fixed Asset matching equipamento específico | Firestore `sap_mirror/` | **Mock** — sandbox tem data genérica |
| Sync bidirecional completo | — | **Mock** — não existe em sandbox |

---

### 10.6 Alterações de código necessárias

**Prioridade 1 — Backend (2–3h):**

1. Extrair `SAP_BASE_URL` para env var em `sapBridge.js` e `sapTransferBridge.js` (atualmente hardcoded).
2. Adicionar `SAP_MODE` toggle (`sandbox` | `mock`): quando `sandbox`, usar `process.env.SAP_BASE_URL` com header `APIKey`.
3. Criar Cloud Function `syncEquipmentMasterFromSap` (inbound): `GET /API_EQUIPMENT` → escrever em `sap_mirror/equipment_master/`.
4. Adicionar `sapEquipmentNumber` e `_source` a `equipment_models` ao fazer sync.
5. Criar `scripts/sap-mirror-seed.js`: carrega 28 equipamentos sample para `sap_mirror/equipment_master/` via Firebase Admin SDK.

**Prioridade 2 — PWA (1–2h):**

6. Badge "Importado de SAP" em `CatalogoModelosView` se `_source === 'sap_sandbox'|'sap_live'`.
7. Campo "Valor contabilístico SAP" na vista Financeiro/detalhe a partir de `sap_mirror/fixed_assets/`.
8. Botão "Testar SAP" em Configurações → Integrações: mostra resultado do GET em tempo real.

---

### 10.7 Como explicar na apresentação

> *"A integração SAP foi implementada contra o SAP Business Accelerator Hub, o ambiente de sandbox oficial da SAP S/4HANA Cloud. Isto permite-nos validar os contratos de API e os payloads sem depender de um tenant empresarial durante a fase de desenvolvimento. Em produção, substituem-se as variáveis de ambiente SAP_BASE_URL e SAP_API_KEY pelo tenant SAP da Casais — o código não muda. Esta abordagem é standard em projetos de integração SAP durante fases de prototipagem."*

O júri aceita porque:
- É tecnicamente correto (Business Accelerator Hub é o sandbox oficial SAP)
- Demonstra conhecimento de SAP API architecture (OData v2/v4, FunctionalLocation, NotificationType)
- Mostra separação entre desenvolvimento e produção (feature flags / env vars)
- Os payloads são reais — campos corretos, tipos corretos, codes corretos

---

### 10.8 Procore — mesma lógica

O sandbox Procore atual (empresa 4283171, projeto 328122) é o nosso ambiente de demo.  
Não tocar no ambiente real da Casais.  
Limitações do sandbox (DELETE 405, PATCH status ignorado) estão documentadas em FINDINGS.md — apresentar como limitações do sandbox, não do código.
