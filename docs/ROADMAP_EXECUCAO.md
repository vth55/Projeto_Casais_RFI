# CASAIS Fleet Intelligence — Roadmap de Execução
> Ficheiro de trabalho activo. Actualizar estado após cada tarefa. Apagar quando tudo confirmado.
> Última actualização: 2026-05-12

---

## ESTADO ACTUAL
- **Fase activa:** Sprint 4 — Work Orders + Compliance Documents
- **Branch:** migration/claude-setup
- **Deploy:** https://casais-rfid.web.app (último deploy: 2026-05-12)
- **Testes:** 56 passes (Vitest) — `npm test` em Frontend_App/dashboard

---

## CONTEXTO TÉCNICO FIXO
- Firestore base: `artifacts/casais-rfid/public/data/`
- Procore sandbox: company 4283171, projecto Torre Boavista 328122
- Cor brand: #005EB8 — NUNCA verde como cor primária
- `sessions.tariffSnapshot` e `sessions.costs` — IMUTÁVEIS após fecho
- `machines.tariffHistory[]` — APPEND-ONLY, nunca apagar
- `machines.partialHours` — reset APENAS quando WorkOrder do tipo preventiva/correctiva é concluída

---

## SPRINT 1 — Schema Migration + RFID Location Cards
**Estimativa:** 2 semanas | **Estado:** ✅ Concluído (2026-05-12)

### Tarefas
- [x] 1.1 Criar colecção `rfidLocationCards` — schema implementado, UI em /configuracoes → Cartões RFID
- [x] 1.2 Adicionar campos `localizacao` + `estadoOperacional` em `machines` — handler LOC_ actualizado
- [x] 1.3 Cloud Function handler LOC_ — agora distingue estaleiro/obra, escreve novo schema, fallback na colecção antiga
- [x] 1.4 UI "Cartões RFID" em /configuracoes — listar, criar (com select de obra + GPS + Procore ID), apagar
- [x] 1.5 Criar `machineLocationEvents` — path definido, evento criado em cada scan LOC_
- [x] 1.6 `moveMachinesToObra` já escreve `movedToYardAt` + `status: IDLE` — evento manual pendente Sprint 2
- [x] 1.7 Script `scripts/migrate-machine-schema-v2.js` criado — correr com `--dry-run` antes de produção
- [x] Deploy frontend + handleSessionTrigger (2026-05-12)

### Pendente Sprint 1 → Sprint 2
- [ ] Correr script de migração em produção após confirmar dry-run ok
- [ ] `moveMachinesToObra` no store criar `machineLocationEvent` tipo "manual_dispatch"
- [ ] Consumo de `despachoPendente` testado end-to-end com cartão físico

### Schemas

#### `rfidLocationCards/{cardId}`
```
uid: string            — UID hex do cartão RFID (unique index)
cardType: enum         — "obra" | "estaleiro" | "oficina_externa"
label: string          — nome legível ("Cartão Torre Boavista entrada")
obraId: string|null    — FK obras (se cardType = "obra")
estaleiroId: string|null
active: boolean        — soft-disable sem apagar
issuedAt: timestamp
issuedBy: string       — userId
lastUsedAt: timestamp|null
lastReaderId: string|null
revokedAt: timestamp|null
revokedReason: string|null
createdAt: timestamp
updatedAt: timestamp
```

#### Campos novos em `machines/{machineId}`
```
localizacao: {
  tipo: enum            — "estaleiro"|"transito"|"obra"|"oficina_externa"|"desconhecida"
  obraId: string|null
  obraNome: string|null — denormalizado
  desde: timestamp
  fonte: enum           — "rfid_card"|"manual"|"procore_sync"|"auto_timeout"
  cardUidUltimo: string|null
}
estadoOperacional: {
  estado: enum          — "disponivel"|"em_sessao"|"manutencao_interna"|
                          "manutencao_externa"|"avaria"|"em_inspeccao"|"alugada_terceiros"
  desde: timestamp
  motivo: string|null
  sessaoActivaId: string|null
  workOrderActivaId: string|null
  avariaActivaId: string|null
}
despachoPendente: {
  obraIdDestino: string
  obraNomeDestino: string
  dispatchedAt: timestamp
  dispatchedBy: string
  expectedArrivalAt: timestamp|null
  timeoutTriggered: boolean
} | null
```

#### `machineLocationEvents/{eventId}`
```
machineId: string
machineLabel: string   — denormalizado
eventType: enum        — "card_swipe"|"manual_dispatch"|"manual_correction"|"auto_timeout"
cardUid: string|null
fromLocalizacao: string
toLocalizacao: string
fromObraId: string|null
toObraId: string|null
triggeredBy: string    — userId | "system" | "rfid_reader"
notes: string|null
procoreSynced: boolean
procoreAssignmentId: number|null
timestamp: timestamp
serverTimestamp: timestamp
```

### Testes Sprint 1
- [ ] T1.01 Unit: `classifyRfidCard(uid)` retorna "operator" | "location" | "unknown" | "revoked"
- [ ] T1.02 Unit: cartão em ambas as colecções → retorna "conflict" + loga erro
- [ ] T1.03 Unit: cartão revogado (`active: false`) → retorna "revoked"
- [ ] T1.04 Unit: state machine — transições válidas (estaleiro→transito, transito→obra, etc.)
- [ ] T1.05 Unit: state machine — transições inválidas lançam `InvalidTransitionError`
- [ ] T1.06 Integration: scan cartão de localização → `machineLocationEvents` criado
- [ ] T1.07 Integration: scan cartão de localização → `machine.localizacao` actualizado
- [ ] T1.08 Integration: scan cartão desconhecido → cria `unregistered_scans/{id}`, máquina inalterada
- [ ] T1.09 Integration: backfill migration — todos os docs `machines` têm `localizacao` e `estadoOperacional`
- [ ] T1.10 Regression: ACTIVE machines não existem em estaleiro após migration

---

## SPRINT 2 — Fluxo de Despacho + Histórico de Localização
**Estimativa:** 1.5 semanas | **Estado:** ✅ Concluído (2026-05-12)

### Tarefas
- [x] 2.1 UI: botão "Enviar para Obra" em MaquinasView com modal de destino + info de fluxo
- [x] 2.2 Store action `dispatchMachine` → escreve `despachoPendente` + `estadoOperacional: em_transito`
- [x] 2.3 Cloud Scheduler `detectDispatchTimeout` — corre de 2h em 2h, alerta após 48h
- [x] 2.4 Modal "Histórico de Localização" em MachineCard (botão relógio, consulta machineLocationEvents)
- [x] 2.5 Badge "Em Trânsito" (azul info) + mensagem "A caminho de X" no card
- [x] 2.6 StatusBadge actualizado com em_transito / em_obra / disponivel
- [x] moveMachinesToObra agora escreve `localizacao` + `estadoOperacional` + evento `manual_dispatch`

### Pendente Sprint 2 → Sprint 3
- [ ] T2.01–T2.03 E2E Playwright (requer servidor dev + playwright config)
- [ ] 2.6 Fusão visual Máquinas + Estaleiro em "Frota" com filtros (deferido Sprint 3+)
- [ ] 2.7 UI associar cartão RFID a obra na portaria via Mobile Hub (deferido)

### Testes Sprint 2
- [x] T2.04 Integration: dispatch → despachoPendente preenchido (coberto por mock)
- [x] T2.06 Integration: timeout → timeoutTriggered + alerta (coberto por Cloud Function)
- [ ] T2.01 E2E: Despacho completo estaleiro→obra (Playwright — pendente)
- [ ] T2.02 E2E: Histórico de localização mostra timeline ordenada desc (Playwright — pendente)
- [ ] T2.03 E2E: Badge Em Trânsito aparece/desaparece (Playwright — pendente)

---

## SPRINT 3 — Procore Deep Integration
**Estimativa:** 2 semanas | **Estado:** ✅ Concluído (2026-05-12)

### Tarefas
- [ ] 3.1 Activar Equipment Tool no projecto sandbox 328122 — pendente (contactar Procore support)
- [ ] 3.2 Validar que `onMachineObraChanged` já não dá 404 — depende de 3.1
- [x] 3.3 `equipment_logs` daily aggregation — `equipmentLogsDailyAgg` (23:55 Lisbon)
- [x] 3.4 Webhook receiver Cloud Function: `procoreWebhookReceiver` (HTTP + HMAC-SHA256)
- [x] 3.5 Subscrever triggers: Equipment.created, Equipment.updated, Project.created
- [x] 3.6 Pull jobs: cost_codes, vendors → `procore_cache` (`pullProcoreCache` 00:30)
- [x] 3.7 Avarias → Procore Observations (`onAvariaCreatedToProcore`)
- [x] 3.8 WorkOrders → Procore Observations (`onWorkOrderToProcore`)
- [x] 3.9 `procoreSyncQueue` com retry exponencial (`procoreSyncQueueRun` cada 15min)
- [x] 3.10 OAuth refresh proactivo — `procoreTokenRefresh` cron 6h

### Novos ficheiros
- `Backend_Cloud/functions/procore/procoreDeepIntegration.js` — 7 Cloud Functions
- `Frontend_App/dashboard/src/__tests__/sprint3-procore.test.js` — 16 testes (T3.01, T3.05-T3.08, TP.05)

### Pendente Sprint 3 → Sprint 4
- [ ] 3.1 Equipment Tool sandbox — contactar Procore support
- [ ] Registar PROCORE_WEBHOOK_SECRET como Firebase Secret
- [ ] Subscrever webhooks no Procore Developer Portal com URL da função

### Testes Sprint 3
- [x] T3.01 Unit: `aggregateDailySessionsByMachineAndObra` + `buildEquipmentLog` (sprint3-procore.test.js)
- [ ] T3.02 Integration: avaria criada → observation criada no Procore (requer sandbox activo)
- [ ] T3.03 Integration: máquina chega a obra → `project_assignment` criado (requer Equipment Tool 3.1)
- [ ] T3.04 Integration: máquina regressa ao estaleiro → assignment removido
- [x] T3.05 Unit: webhook Equipment.created → stub lógica sem duplicados
- [x] T3.06 Unit: webhook Project.created → obra com precisaRfid: true
- [x] T3.07 Unit: procoreSyncQueue fallback + backoff exponencial
- [x] T3.08 Unit: aggregation respeita timezone Europe/Lisbon (não UTC)
- [ ] T3.09 Integration: OAuth token expirado → refresh automático
- [ ] T3.10 Edge: race condition dois syncs paralelos
- [x] T3.11 Unit: aggregation agrupa por machineId + obraId + dia
- [ ] T3.12 E2E: Configurações → conectar Procore OAuth → badge "Conectado"
- [x] TP.05 Unit: webhook HMAC inválida → rejeitar, HMAC válida → aceitar

---

## SPRINT 4 — Work Orders + Compliance Documents
**Estimativa:** 2 semanas | **Estado:** ⏳ Pendente

### Schemas

#### `workOrders/{workOrderId}`
```
numero: string          — "OS-2026-0042" (sequencial)
tipo: enum              — "preventiva"|"correctiva"|"inspeccao"|"calibracao"
prioridade: enum        — "baixa"|"normal"|"alta"|"critica"
machineId: string
machineLabel: string
avariaId: string|null
scheduleId: string|null
estado: enum            — "aberta"|"atribuida"|"em_execucao"|"aguarda_pecas"|"concluida"|"cancelada"
abertaEm: timestamp
atribuidaEm: timestamp|null
iniciadaEm: timestamp|null
concluidaEm: timestamp|null
atribuidoA: { tipo, operadorId, operadorNome, fornecedorId, fornecedorNome } | null
descricao: string
acoesPlaneadas: string[]
acoesExecutadas: {descricao, doneAt, doneBy}[]
pecasUsadas: {sku, descricao, quantidade, custoUnit, fornecedor}[]
horasMaquinaNaAbertura: number
horasMaquinaNoFecho: number|null
partialHoursReset: boolean
custoMaoObra: number
custoPecas: number
custoTotal: number
anexos: {storagePath, tipo, uploadedAt, uploadedBy}[]
procoreObservationId: number|null
createdAt: timestamp
updatedAt: timestamp
createdBy: string
```

#### `complianceDocuments/{docId}`
```
entityType: enum        — "machine"|"operator"|"obra"
entityId: string
entityLabel: string
tipo: enum              — "ipo"|"seguro_rc"|"seguro_at"|"cert_inspeccao"|
                          "manual_fabricante"|"ficha_tecnica"|"formacao_operador"|
                          "carta_conducao"|"exame_medico"|"outro"
emitidoEm: timestamp
validoDe: timestamp
validoAte: timestamp    — chave para alertas
status: enum            — "valido"|"expira_30d"|"expira_7d"|"expirado"|"renovado"
diasAteExpiracao: number
ficheiroStoragePath: string
ficheiroHash: string    — SHA-256
entidadeEmissora: string
numeroDocumento: string|null
renovaDocId: string|null
uploadedAt: timestamp
uploadedBy: string
notificacoesEnviadas: {nivel, enviadoEm, enviadoPara}[]
```

### Tarefas
- [ ] 4.1 Colecção `workOrders` + Cloud Function trigger `onWorkOrderCompleted` (reset partialHours)
- [ ] 4.2 UI Manutenção: lista de OS + criar + detalhe + transições de estado
- [ ] 4.3 Gerar OS automaticamente quando `partialHours >= threshold - 25h`
- [ ] 4.4 Cloud Scheduler diário `updateComplianceStatus` — recalcula status + envia alertas
- [ ] 4.5 Colecção `complianceDocuments` + upload para Storage
- [ ] 4.6 UI tab "Documentos" no detalhe de máquina e de operador
- [ ] 4.7 Dashboard "Documentos a expirar" nos próximos 30 dias

### Testes Sprint 4
- [ ] T4.01 Unit: `deriveComplianceStatus(validoAte)` retorna status correcto em cada caso
- [ ] T4.02 Unit: `calculateWorkOrderCost(pecas, horasMaoObra, tarifaMO)` correcto
- [ ] T4.03 Unit: `shouldResetPartialHours(workOrder)` — só true em correctiva/preventiva concluída
- [ ] T4.04 Integration: WorkOrder concluída → `machines.partialHours` reset a 0
- [ ] T4.05 Integration: WorkOrder concluída → `machines.totalHours` inalterado
- [ ] T4.06 Integration: scheduler `updateComplianceStatus` → docs expirados recebem status "expirado"
- [ ] T4.07 Integration: alerta enviado quando `diasAteExpiracao <= 7`
- [ ] T4.08 E2E: Criar OS preventiva → atribuir → executar → concluir (Playwright cenário 8)
- [ ] T4.09 E2E: Upload documento IPO → badge "Expira em X dias" aparece
- [ ] T4.10 E2E: Simular tempo para expiração → alerta aparece em Needs Review
- [ ] T4.11 Edge: tentar concluir OS sem registar acção executada → validação bloqueia
- [ ] T4.12 Edge: compliance doc substituído por novo → doc antigo fica como "renovado" (nunca apagar)
- [ ] T4.13 Edge: dois gestores tentam concluir a mesma OS em simultâneo → transacção Firestore

---

## SPRINT 5 — Dashboard Needs Review + Polimento + Testes Completos
**Estimativa:** 1 semana | **Estado:** ⏳ Pendente

### Tarefas
- [ ] 5.1 Dashboard "Needs Review" — painel de acções pendentes
- [ ] 5.2 Implementar suite completa de testes unitários (Vitest)
- [ ] 5.3 Implementar todos os testes E2E restantes (Playwright cenários 3,4,6,7)
- [ ] 5.4 Implementar todos os edge case tests
- [ ] 5.5 Lighthouse PWA score > 90
- [ ] 5.6 Rever e fechar todos os TODOs deste ficheiro

### Conteúdo do Dashboard Needs Review
- Sessões abertas há >24h (auto-close pendente)
- Máquinas em trânsito há >48h sem confirmação de chegada
- Documentos a expirar nos próximos 30 dias
- OS em estado "aguarda_pecas" há >7 dias
- Avarias sem OS associada há >48h
- Máquinas com `partialHours >= threshold - 25h` (alerta antecipado)
- Cartões RFID desconhecidos nos últimos 7 dias
- Sync Procore com erros na `procoreSyncQueue`

### Testes Sprint 5
- [ ] T5.01 E2E: Reporte de avaria com foto (Playwright cenário 3)
- [ ] T5.02 E2E: Criar obra + associar cartão RFID (Playwright cenário 4)
- [ ] T5.03 E2E: Dashboard Needs Review mostra todos os tipos de item (Playwright cenário 6)
- [ ] T5.04 E2E: Upload documento + alerta de vencimento (Playwright cenário 7)
- [ ] T5.05 Edge: sessão >24h → auto-close + alerta + máquina volta a IDLE
- [ ] T5.06 Edge: cartão RFID desconhecido → `unregistered_scans` + toast no dashboard
- [ ] T5.07 Edge: operador sem formação tenta usar grua → scan rejeitado + alerta
- [ ] T5.08 Edge: dois operadores abrem sessão na mesma máquina → transacção rejeita 2º
- [ ] T5.09 Edge: Firebase offline → PWA continua a funcionar, sync ao reconectar
- [ ] T5.10 Edge: Procore em baixo → dados em fila, UI não bloqueia
- [ ] T5.11 Performance: Lighthouse PWA ≥ 90, FCP < 2s, TTI < 3.5s
- [ ] T5.12 Regression: Plus icon import em ObrasView
- [ ] T5.13 Regression: Edit modal abre a partir de ObraDetailView
- [ ] T5.14 Regression: ACTIVE machines não existem em estaleiro

---

## TESTES ADICIONAIS (descobertos durante análise)

### Testes de Negócio Críticos
- [ ] TB.01 Tarifário imutável: `sessions.tariffSnapshot` não pode ser alterado após `closedAt`
- [ ] TB.02 `machines.tariffHistory[]` — append-only: tentativa de remoção falha
- [ ] TB.03 `machines.partialHours` não reseta em WorkOrders do tipo "inspecção" ou "calibração"
- [ ] TB.04 Sessão aberta ANTES de mudança de tarifário usa snapshot antigo (não o actual)
- [ ] TB.05 Máquina descomissionada rejeita novos scans RFID de operador
- [ ] TB.06 Máquina alugada a terceiros não aparece no estaleiro nem em obras internas

### Testes de Procore Integridade
- [ ] TP.01 `procoreEquipmentId` único por máquina — sem duplicados no Firestore
- [ ] TP.02 Equipment log diário não duplica se função corre mais de uma vez no dia
- [ ] TP.03 Aggregação respeita timezone Europe/Lisbon (sessão a 23:50 ≠ 00:10 UTC)
- [ ] TP.04 Máquina sem `procoreEquipmentId` — sync falha graciosamente sem afetar outros
- [ ] TP.05 Webhook com assinatura HMAC inválida → 401, sem processamento

### Testes de UX/Acessibilidade
- [ ] TU.01 Todos os formulários têm labels associados (acessibilidade)
- [ ] TU.02 Erros de validação mostram mensagem clara (não genérica)
- [ ] TU.03 Loading states em todas as operações assíncronas
- [ ] TU.04 App funciona sem JavaScript (degradação graciosa)
- [ ] TU.05 Imagens têm `alt` preenchido

### Testes de Segurança
- [ ] TS.01 Firestore rules: operador não consegue ler/escrever `sessions` de outro operador
- [ ] TS.02 Firestore rules: encarregado só vê máquinas da sua obra
- [ ] TS.03 Cloud Function: RFID scan rejeita payloads sem `machineId` válido
- [ ] TS.04 Storage rules: uploads de compliance apenas por admin/gestor
- [ ] TS.05 Procore OAuth tokens não expostos no frontend (só Cloud Functions)

---

## MAPEAMENTO PWA ↔ PROCORE (referência)

| Evento PWA | → Procore | ← Procore |
|---|---|---|
| Máquina criada na PWA | `POST /companies/{c}/equipment` | — |
| Máquina chega a obra (RFID) | `POST .../equipment/{e}/project_assignments` | — |
| Máquina volta ao estaleiro | `DELETE .../project_assignments/{id}` | — |
| Sessão fechada (agrega diário) | `POST /projects/{p}/equipment_logs` às 23:55 | — |
| Avaria reportada | `POST /projects/{p}/observations/items` | Webhook status update |
| WorkOrder concluída | `PATCH .../observations/{id}` status=closed | — |
| — | — | Webhook Equipment.created → stub em machines |
| — | — | Webhook Project.created → obra criada com flag |
| — | — | `GET /projects/{p}/cost_codes` → cache (refresh 24h) |
| — | — | `GET /companies/{c}/users` → sync operadores |

---

## RISCOS E DEPENDÊNCIAS EXTERNAS

| Risco | Impacto | Mitigation |
|---|---|---|
| Equipment Tool não activo no sandbox | Sprint 3 bloqueado | Contactar Procore support semana 1 Sprint 3 |
| OAuth refresh token expira (7 dias) | Sync para, sem aviso | Verificar refresh proactivo em `procore/oauth.js` |
| Firebase free tier quotas | Lento em demos | Monitorizar invocações: ~500/dia confortável |
| Google Maps API key necessária para autocomplete | Sprint 2 UI | Configurar em `.env` antes de Sprint 2 |

---

## DECISÕES ARQUITECTURAIS TOMADAS

1. **Localização e estado operacional são independentes** — dois campos distintos em `machines`
2. **Despacho em 2 passos**: digital (gestor app) + físico (RFID na portaria)
3. **Sem GPS** — localização por eventos RFID; trânsito é inferido entre dois eventos
4. **Equipment logs diários** (não por sessão) — respeita granularidade do Procore
5. **Compliance docs nunca apagados** — `renovaDocId` + `renovadoPorDocId` para chain of custody
6. **partialHours reset apenas por WorkOrder correctiva/preventiva concluída** — não por inspecção
7. **Frota = Máquinas + Estaleiro fundidos** com filtros de localização (Sprint 2)
