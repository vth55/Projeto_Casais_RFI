# CASAIS Fleet Intelligence - Roadmap de Execucao
> Canonical status tracker as of 2026-05-18.
> Use this file for current execution state. If it conflicts with older roadmap docs, this one wins.
> Ultima validacao documental: 2026-05-18

---

## ESTADO ACTUAL
- **Fase activa:** Sprint 6 — Menu de Obra (iniciado 2026-05-18)
- **Branch:** main
- **Deploy:** https://casais-rfid.web.app | Backend: Firebase Cloud Functions us-central1
- **Testes:** 56 passes (Vitest) + demo-webhook-sim.js 5/5 + Cenários RFID A-E validados + gates browser aprovados para shell do menu de obra e submenus Resumo, Equipamentos, Sessões e Manutenção
- **Demo ready:** `node Backend_Cloud/functions/scripts/demo-webhook-sim.js all`
- **Arquitectura:** Ver `docs/architecture/MENU_OBRA_ARCHITECTURE.md`

### Decisões arquitecturais fechadas (2026-05-18)
- Procore = master para obras/funcionários/máquinas. PWA = camada operacional e analítica.
- Integração PWA→Procore: só dados nativos (equipment_logs, manpower_logs, observations reais).
- Menu de obra com rota própria /obras/:obraId + 7 submenus.
- PeriodHeader global (Hoje/Semana/Mês/Trimestre/Personalizado) sincroniza todos os submenus.
- Dashboard global simplificado (multi-obra, alertas). Detalhe rico fica no menu de obra.
- Limpeza Procore (remover notes/hacks) deferida para Mês 2 (Sprint 7).

### Entregue nesta fase
- Shell do menu de obra funcional em `/obras/:obraId` com breadcrumb, badge Procore, `PeriodHeader` e navegação por tabs.
- Submenu `Resumo` funcional com KPI cards, alert strip, AreaChart horas/dia e BarChart horas/máquina.
- Submenu `Equipamentos` funcional com fleet header, tabela desktop / cards mobile, barras de utilização, contexto de manutenção, filtros e drawer por máquina.
- Submenu `Sessões` funcional com agrupamento por dia, drawer de detalhe, filtros, export CSV e separação entre anomalias operacionais e flags informativas.
- Submenu `Manutenção` funcional com KPI grid, ordenação por criticidade, filtros RAG, drawer lateral e integração de avarias por `machineId`.
- Deep-link, back navigation e refresh directo validados no browser.
- Evidência visual guardada em `docs/sessions/evidence/`.
---

## CONTEXTO TÃ‰CNICO FIXO
- Firestore base: `artifacts/casais-rfid/public/data/`
- Procore sandbox: company 4283171, projecto Torre Boavista 328122
- Cor brand: #005EB8 â€” NUNCA verde como cor primÃ¡ria
- `sessions.tariffSnapshot` e `sessions.costs` â€” IMUTÃVEIS apÃ³s fecho
- `machines.tariffHistory[]` â€” APPEND-ONLY, nunca apagar
- `machines.partialHours` â€” reset APENAS quando WorkOrder do tipo preventiva/correctiva Ã© concluÃ­da

---

## SPRINT 1 â€” Schema Migration + RFID Location Cards
**Estimativa:** 2 semanas | **Estado:** âœ… ConcluÃ­do (2026-05-12)

### Tarefas
- [x] 1.1 Criar colecÃ§Ã£o `rfidLocationCards` â€” schema implementado, UI em /configuracoes â†’ CartÃµes RFID
- [x] 1.2 Adicionar campos `localizacao` + `estadoOperacional` em `machines` â€” handler LOC_ actualizado
- [x] 1.3 Cloud Function handler LOC_ â€” agora distingue estaleiro/obra, escreve novo schema, fallback na colecÃ§Ã£o antiga
- [x] 1.4 UI "CartÃµes RFID" em /configuracoes â€” listar, criar (com select de obra + GPS + Procore ID), apagar
- [x] 1.5 Criar `machineLocationEvents` â€” path definido, evento criado em cada scan LOC_
- [x] 1.6 `moveMachinesToObra` jÃ¡ escreve `movedToYardAt` + `status: IDLE` â€” evento manual pendente Sprint 2
- [x] 1.7 Script `scripts/migrate-machine-schema-v2.js` criado â€” correr com `--dry-run` antes de produÃ§Ã£o
- [x] Deploy frontend + handleSessionTrigger (2026-05-12)

### Pendente Sprint 1 â†’ Sprint 2
- [ ] Correr script de migraÃ§Ã£o em produÃ§Ã£o apÃ³s confirmar dry-run ok
- [ ] `moveMachinesToObra` no store criar `machineLocationEvent` tipo "manual_dispatch"
- [ ] Consumo de `despachoPendente` testado end-to-end com cartÃ£o fÃ­sico

### Schemas

#### `rfidLocationCards/{cardId}`
```
uid: string            â€” UID hex do cartÃ£o RFID (unique index)
cardType: enum         â€” "obra" | "estaleiro" | "oficina_externa"
label: string          â€” nome legÃ­vel ("CartÃ£o Torre Boavista entrada")
obraId: string|null    â€” FK obras (se cardType = "obra")
estaleiroId: string|null
active: boolean        â€” soft-disable sem apagar
issuedAt: timestamp
issuedBy: string       â€” userId
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
  tipo: enum            â€” "estaleiro"|"transito"|"obra"|"oficina_externa"|"desconhecida"
  obraId: string|null
  obraNome: string|null â€” denormalizado
  desde: timestamp
  fonte: enum           â€” "rfid_card"|"manual"|"procore_sync"|"auto_timeout"
  cardUidUltimo: string|null
}
estadoOperacional: {
  estado: enum          â€” "disponivel"|"em_sessao"|"manutencao_interna"|
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
machineLabel: string   â€” denormalizado
eventType: enum        â€” "card_swipe"|"manual_dispatch"|"manual_correction"|"auto_timeout"
cardUid: string|null
fromLocalizacao: string
toLocalizacao: string
fromObraId: string|null
toObraId: string|null
triggeredBy: string    â€” userId | "system" | "rfid_reader"
notes: string|null
procoreSynced: boolean
procoreAssignmentId: number|null
timestamp: timestamp
serverTimestamp: timestamp
```

### Testes Sprint 1
- [ ] T1.01 Unit: `classifyRfidCard(uid)` retorna "operator" | "location" | "unknown" | "revoked"
- [ ] T1.02 Unit: cartÃ£o em ambas as colecÃ§Ãµes â†’ retorna "conflict" + loga erro
- [ ] T1.03 Unit: cartÃ£o revogado (`active: false`) â†’ retorna "revoked"
- [ ] T1.04 Unit: state machine â€” transiÃ§Ãµes vÃ¡lidas (estaleiroâ†’transito, transitoâ†’obra, etc.)
- [ ] T1.05 Unit: state machine â€” transiÃ§Ãµes invÃ¡lidas lanÃ§am `InvalidTransitionError`
- [ ] T1.06 Integration: scan cartÃ£o de localizaÃ§Ã£o â†’ `machineLocationEvents` criado
- [ ] T1.07 Integration: scan cartÃ£o de localizaÃ§Ã£o â†’ `machine.localizacao` actualizado
- [ ] T1.08 Integration: scan cartÃ£o desconhecido â†’ cria `unregistered_scans/{id}`, mÃ¡quina inalterada
- [ ] T1.09 Integration: backfill migration â€” todos os docs `machines` tÃªm `localizacao` e `estadoOperacional`
- [ ] T1.10 Regression: ACTIVE machines nÃ£o existem em estaleiro apÃ³s migration

---

## SPRINT 2 â€” Fluxo de Despacho + HistÃ³rico de LocalizaÃ§Ã£o
**Estimativa:** 1.5 semanas | **Estado:** âœ… ConcluÃ­do (2026-05-12)

### Tarefas
- [x] 2.1 UI: botÃ£o "Enviar para Obra" em MaquinasView com modal de destino + info de fluxo
- [x] 2.2 Store action `dispatchMachine` â†’ escreve `despachoPendente` + `estadoOperacional: em_transito`
- [x] 2.3 Cloud Scheduler `detectDispatchTimeout` â€” corre de 2h em 2h, alerta apÃ³s 48h
- [x] 2.4 Modal "HistÃ³rico de LocalizaÃ§Ã£o" em MachineCard (botÃ£o relÃ³gio, consulta machineLocationEvents)
- [x] 2.5 Badge "Em TrÃ¢nsito" (azul info) + mensagem "A caminho de X" no card
- [x] 2.6 StatusBadge actualizado com em_transito / em_obra / disponivel
- [x] moveMachinesToObra agora escreve `localizacao` + `estadoOperacional` + evento `manual_dispatch`

### Pendente Sprint 2 â†’ Sprint 3
- [ ] T2.01â€“T2.03 E2E Playwright (requer servidor dev + playwright config)
- [ ] 2.6 FusÃ£o visual MÃ¡quinas + Estaleiro em "Frota" com filtros (deferido Sprint 3+)
- [ ] 2.7 UI associar cartÃ£o RFID a obra na portaria via Mobile Hub (deferido)

### Testes Sprint 2
- [x] T2.04 Integration: dispatch â†’ despachoPendente preenchido (coberto por mock)
- [x] T2.06 Integration: timeout â†’ timeoutTriggered + alerta (coberto por Cloud Function)
- [ ] T2.01 E2E: Despacho completo estaleiroâ†’obra (Playwright â€” pendente)
- [ ] T2.02 E2E: HistÃ³rico de localizaÃ§Ã£o mostra timeline ordenada desc (Playwright â€” pendente)
- [ ] T2.03 E2E: Badge Em TrÃ¢nsito aparece/desaparece (Playwright â€” pendente)

---

## SPRINT 3 â€” Procore Deep Integration
**Estimativa:** 2 semanas | **Estado:** âœ… ConcluÃ­do (2026-05-12)

### Tarefas
- [ ] 3.1 Activar Equipment Tool no projecto sandbox 328122 â€” pendente (contactar Procore support)
- [ ] 3.2 Validar que `onMachineObraChanged` jÃ¡ nÃ£o dÃ¡ 404 â€” depende de 3.1
- [x] 3.3 `equipment_logs` daily aggregation â€” `equipmentLogsDailyAgg` (23:55 Lisbon)
- [x] 3.4 Webhook receiver Cloud Function: `procoreWebhookReceiver` (HTTP + HMAC-SHA256)
- [x] 3.5 Subscrever triggers: Equipment.created, Equipment.updated, Project.created
- [x] 3.6 Pull jobs: cost_codes, vendors â†’ `procore_cache` (`pullProcoreCache` 00:30)
- [x] 3.7 Avarias â†’ Procore Observations (`onAvariaCreatedToProcore`)
- [x] 3.8 WorkOrders â†’ Procore Observations (`onWorkOrderToProcore`)
- [x] 3.9 `procoreSyncQueue` com retry exponencial (`procoreSyncQueueRun` cada 15min)
- [x] 3.10 OAuth refresh proactivo â€” `procoreTokenRefresh` cron 6h

### Novos ficheiros
- `Backend_Cloud/functions/procore/procoreDeepIntegration.js` â€” 7 Cloud Functions
- `Frontend_App/dashboard/src/__tests__/sprint3-procore.test.js` â€” 16 testes (T3.01, T3.05-T3.08, TP.05)

### Sprint 3 Extended â€” SincronizaÃ§Ã£o Bidirecional Completa (2026-05-15)
- [x] Equipment Tool activo no sandbox (8 equipamentos, company 4283171, projecto 328122)
- [x] PROCORE_WEBHOOK_SECRET registado no Firebase Secret Manager (v2 â€” sem newline)
- [x] Webhooks registados no Procore (hook 327172, 7 triggers Equipment+Project+Directory)
- [x] HMAC validation corrigida (rawBody + trailing newline no secret resolvido)
- [x] PWA â†’ Procore: `onMachineCreatedToProcore` â€” cria equipment_register com campos obrigatÃ³rios
- [x] PWA â†’ Procore: `onMachineUpdatedToProcore` â€” actualiza nome no Procore
- [x] PWA â†’ Procore: `onMachineDeletedToProcore` â€” arquiva no Procore (DELETE 405 â†’ PATCH inactive)
- [x] PWA â†’ Procore: `onOperatorCreatedToProcore` â€” cria utilizador no Directory Procore
- [x] Procore â†’ PWA: Equipment.CREATE/UPDATE/DELETE â€” handler em processWebhookEvent
- [x] Procore â†’ PWA: Project.CREATE/UPDATE â€” handler em processWebhookEvent
- [x] Procore â†’ PWA: Directory.CREATE/UPDATE â€” handler em processWebhookEvent
- [x] Demo simulation script: `scripts/demo-webhook-sim.js` â€” 5 cenÃ¡rios, 5/5 pass
- [x] Cron reduzido de 1h â†’ 10min para demo (ajustar para 1h em produÃ§Ã£o)
- **LimitaÃ§Ã£o sandbox confirmada:** DELETE 405, PATCH status ignorado, webhooks outbound nÃ£o disparados â€” NÃƒO Ã© bug do cÃ³digo

### Pendente Sprint 3 â†’ Sprint 4
- [ ] T3.02 Integration: avaria criada â†’ observation criada no Procore (Observations nÃ£o activo no sandbox)
- [ ] T3.03 Integration: mÃ¡quina chega a obra â†’ project_assignment criado
- [ ] T3.04 Integration: mÃ¡quina regressa â†’ assignment removido

### Testes Sprint 3
- [x] T3.01 Unit: `aggregateDailySessionsByMachineAndObra` + `buildEquipmentLog`
- [x] T3.05 Unit: webhook Equipment.created â†’ stub lÃ³gica sem duplicados
- [x] T3.06 Unit: webhook Project.created â†’ obra com precisaRfid: true
- [x] T3.07 Unit: procoreSyncQueue fallback + backoff exponencial
- [x] T3.08 Unit: aggregation respeita timezone Europe/Lisbon (nÃ£o UTC)
- [x] T3.11 Unit: aggregation agrupa por machineId + obraId + dia
- [x] TP.05 Unit: webhook HMAC invÃ¡lida â†’ rejeitar, HMAC vÃ¡lida â†’ aceitar
- [x] **INTEGRATION E2E confirmado 2026-05-15**: demo-webhook-sim.js 5/5 passed
- [x] **PWAâ†’Procore CREATE confirmado**: machine criada na PWA â†’ equipment_register no Procore
- [x] **PWAâ†’Procore UPDATE confirmado**: rename propagado ao Procore
- [x] **PWAâ†’Procore DELETE confirmado**: machine apagada â†’ equipamento arquivado
- [x] **PWAâ†’Procore OPERATOR confirmado**: operador criado â†’ Directory user Procore

---

## SPRINT 4 â€” Work Orders + Compliance Documents
**Estimativa:** 2 semanas | **Estado:** â³ Pendente

### Schemas

#### `workOrders/{workOrderId}`
```
numero: string          â€” "OS-2026-0042" (sequencial)
tipo: enum              â€” "preventiva"|"correctiva"|"inspeccao"|"calibracao"
prioridade: enum        â€” "baixa"|"normal"|"alta"|"critica"
machineId: string
machineLabel: string
avariaId: string|null
scheduleId: string|null
estado: enum            â€” "aberta"|"atribuida"|"em_execucao"|"aguarda_pecas"|"concluida"|"cancelada"
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
entityType: enum        â€” "machine"|"operator"|"obra"
entityId: string
entityLabel: string
tipo: enum              â€” "ipo"|"seguro_rc"|"seguro_at"|"cert_inspeccao"|
                          "manual_fabricante"|"ficha_tecnica"|"formacao_operador"|
                          "carta_conducao"|"exame_medico"|"outro"
emitidoEm: timestamp
validoDe: timestamp
validoAte: timestamp    â€” chave para alertas
status: enum            â€” "valido"|"expira_30d"|"expira_7d"|"expirado"|"renovado"
diasAteExpiracao: number
ficheiroStoragePath: string
ficheiroHash: string    â€” SHA-256
entidadeEmissora: string
numeroDocumento: string|null
renovaDocId: string|null
uploadedAt: timestamp
uploadedBy: string
notificacoesEnviadas: {nivel, enviadoEm, enviadoPara}[]
```

### Tarefas
- [ ] 4.1 ColecÃ§Ã£o `workOrders` + Cloud Function trigger `onWorkOrderCompleted` (reset partialHours)
- [ ] 4.2 UI ManutenÃ§Ã£o: lista de OS + criar + detalhe + transiÃ§Ãµes de estado
- [ ] 4.3 Gerar OS automaticamente quando `partialHours >= threshold - 25h`
- [ ] 4.4 Cloud Scheduler diÃ¡rio `updateComplianceStatus` â€” recalcula status + envia alertas
- [ ] 4.5 ColecÃ§Ã£o `complianceDocuments` + upload para Storage
- [ ] 4.6 UI tab "Documentos" no detalhe de mÃ¡quina e de operador
- [ ] 4.7 Dashboard "Documentos a expirar" nos prÃ³ximos 30 dias

### Testes Sprint 4
- [ ] T4.01 Unit: `deriveComplianceStatus(validoAte)` retorna status correcto em cada caso
- [ ] T4.02 Unit: `calculateWorkOrderCost(pecas, horasMaoObra, tarifaMO)` correcto
- [ ] T4.03 Unit: `shouldResetPartialHours(workOrder)` â€” sÃ³ true em correctiva/preventiva concluÃ­da
- [ ] T4.04 Integration: WorkOrder concluÃ­da â†’ `machines.partialHours` reset a 0
- [ ] T4.05 Integration: WorkOrder concluÃ­da â†’ `machines.totalHours` inalterado
- [ ] T4.06 Integration: scheduler `updateComplianceStatus` â†’ docs expirados recebem status "expirado"
- [ ] T4.07 Integration: alerta enviado quando `diasAteExpiracao <= 7`
- [ ] T4.08 E2E: Criar OS preventiva â†’ atribuir â†’ executar â†’ concluir (Playwright cenÃ¡rio 8)
- [ ] T4.09 E2E: Upload documento IPO â†’ badge "Expira em X dias" aparece
- [ ] T4.10 E2E: Simular tempo para expiraÃ§Ã£o â†’ alerta aparece em Needs Review
- [ ] T4.11 Edge: tentar concluir OS sem registar acÃ§Ã£o executada â†’ validaÃ§Ã£o bloqueia
- [ ] T4.12 Edge: compliance doc substituÃ­do por novo â†’ doc antigo fica como "renovado" (nunca apagar)
- [ ] T4.13 Edge: dois gestores tentam concluir a mesma OS em simultÃ¢neo â†’ transacÃ§Ã£o Firestore

---

## SPRINT 5 â€” Dashboard Needs Review + Polimento + Testes Completos
**Estimativa:** 1 semana | **Estado:** â³ Pendente

### Tarefas
- [ ] 5.1 Dashboard "Needs Review" â€” painel de acÃ§Ãµes pendentes
- [ ] 5.2 Implementar suite completa de testes unitÃ¡rios (Vitest)
- [ ] 5.3 Implementar todos os testes E2E restantes (Playwright cenÃ¡rios 3,4,6,7)
- [ ] 5.4 Implementar todos os edge case tests
- [ ] 5.5 Lighthouse PWA score > 90
- [ ] 5.6 Rever e fechar todos os TODOs deste ficheiro

### ConteÃºdo do Dashboard Needs Review
- SessÃµes abertas hÃ¡ >24h (auto-close pendente)
- MÃ¡quinas em trÃ¢nsito hÃ¡ >48h sem confirmaÃ§Ã£o de chegada
- Documentos a expirar nos prÃ³ximos 30 dias
- OS em estado "aguarda_pecas" hÃ¡ >7 dias
- Avarias sem OS associada hÃ¡ >48h
- MÃ¡quinas com `partialHours >= threshold - 25h` (alerta antecipado)
- CartÃµes RFID desconhecidos nos Ãºltimos 7 dias
- Sync Procore com erros na `procoreSyncQueue`

### Testes Sprint 5
- [ ] T5.01 E2E: Reporte de avaria com foto (Playwright cenÃ¡rio 3)
- [ ] T5.02 E2E: Criar obra + associar cartÃ£o RFID (Playwright cenÃ¡rio 4)
- [ ] T5.03 E2E: Dashboard Needs Review mostra todos os tipos de item (Playwright cenÃ¡rio 6)
- [ ] T5.04 E2E: Upload documento + alerta de vencimento (Playwright cenÃ¡rio 7)
- [ ] T5.05 Edge: sessÃ£o >24h â†’ auto-close + alerta + mÃ¡quina volta a IDLE
- [ ] T5.06 Edge: cartÃ£o RFID desconhecido â†’ `unregistered_scans` + toast no dashboard
- [ ] T5.07 Edge: operador sem formaÃ§Ã£o tenta usar grua â†’ scan rejeitado + alerta
- [ ] T5.08 Edge: dois operadores abrem sessÃ£o na mesma mÃ¡quina â†’ transacÃ§Ã£o rejeita 2Âº
- [ ] T5.09 Edge: Firebase offline â†’ PWA continua a funcionar, sync ao reconectar
- [ ] T5.10 Edge: Procore em baixo â†’ dados em fila, UI nÃ£o bloqueia
- [ ] T5.11 Performance: Lighthouse PWA â‰¥ 90, FCP < 2s, TTI < 3.5s
- [ ] T5.12 Regression: Plus icon import em ObrasView
- [ ] T5.13 Regression: Edit modal abre a partir de ObraDetailView
- [ ] T5.14 Regression: ACTIVE machines nÃ£o existem em estaleiro

---

## TESTES ADICIONAIS (descobertos durante anÃ¡lise)

### Testes de NegÃ³cio CrÃ­ticos
- [ ] TB.01 TarifÃ¡rio imutÃ¡vel: `sessions.tariffSnapshot` nÃ£o pode ser alterado apÃ³s `closedAt`
- [ ] TB.02 `machines.tariffHistory[]` â€” append-only: tentativa de remoÃ§Ã£o falha
- [ ] TB.03 `machines.partialHours` nÃ£o reseta em WorkOrders do tipo "inspecÃ§Ã£o" ou "calibraÃ§Ã£o"
- [ ] TB.04 SessÃ£o aberta ANTES de mudanÃ§a de tarifÃ¡rio usa snapshot antigo (nÃ£o o actual)
- [ ] TB.05 MÃ¡quina descomissionada rejeita novos scans RFID de operador
- [ ] TB.06 MÃ¡quina alugada a terceiros nÃ£o aparece no estaleiro nem em obras internas

### Testes de Procore Integridade
- [ ] TP.01 `procoreEquipmentId` Ãºnico por mÃ¡quina â€” sem duplicados no Firestore
- [ ] TP.02 Equipment log diÃ¡rio nÃ£o duplica se funÃ§Ã£o corre mais de uma vez no dia
- [ ] TP.03 AggregaÃ§Ã£o respeita timezone Europe/Lisbon (sessÃ£o a 23:50 â‰  00:10 UTC)
- [ ] TP.04 MÃ¡quina sem `procoreEquipmentId` â€” sync falha graciosamente sem afetar outros
- [ ] TP.05 Webhook com assinatura HMAC invÃ¡lida â†’ 401, sem processamento

### Testes de UX/Acessibilidade
- [ ] TU.01 Todos os formulÃ¡rios tÃªm labels associados (acessibilidade)
- [ ] TU.02 Erros de validaÃ§Ã£o mostram mensagem clara (nÃ£o genÃ©rica)
- [ ] TU.03 Loading states em todas as operaÃ§Ãµes assÃ­ncronas
- [ ] TU.04 App funciona sem JavaScript (degradaÃ§Ã£o graciosa)
- [ ] TU.05 Imagens tÃªm `alt` preenchido

### Testes de SeguranÃ§a
- [ ] TS.01 Firestore rules: operador nÃ£o consegue ler/escrever `sessions` de outro operador
- [ ] TS.02 Firestore rules: encarregado sÃ³ vÃª mÃ¡quinas da sua obra
- [ ] TS.03 Cloud Function: RFID scan rejeita payloads sem `machineId` vÃ¡lido
- [ ] TS.04 Storage rules: uploads de compliance apenas por admin/gestor
- [ ] TS.05 Procore OAuth tokens nÃ£o expostos no frontend (sÃ³ Cloud Functions)

---

## MAPEAMENTO PWA â†” PROCORE (referÃªncia)

| Evento PWA | â†’ Procore | â† Procore |
|---|---|---|
| MÃ¡quina criada na PWA | `POST /companies/{c}/equipment` | â€” |
| MÃ¡quina chega a obra (RFID) | `POST .../equipment/{e}/project_assignments` | â€” |
| MÃ¡quina volta ao estaleiro | `DELETE .../project_assignments/{id}` | â€” |
| SessÃ£o fechada (agrega diÃ¡rio) | `POST /projects/{p}/equipment_logs` Ã s 23:55 | â€” |
| Avaria reportada | `POST /projects/{p}/observations/items` | Webhook status update |
| WorkOrder concluÃ­da | `PATCH .../observations/{id}` status=closed | â€” |
| â€” | â€” | Webhook Equipment.created â†’ stub em machines |
| â€” | â€” | Webhook Project.created â†’ obra criada com flag |
| â€” | â€” | `GET /projects/{p}/cost_codes` â†’ cache (refresh 24h) |
| â€” | â€” | `GET /companies/{c}/users` â†’ sync operadores |

---

## RISCOS E DEPENDÃŠNCIAS EXTERNAS

| Risco | Impacto | Mitigation |
|---|---|---|
| Equipment Tool nÃ£o activo no sandbox | Sprint 3 bloqueado | Contactar Procore support semana 1 Sprint 3 |
| OAuth refresh token expira (7 dias) | Sync para, sem aviso | Verificar refresh proactivo em `procore/oauth.js` |
| Firebase free tier quotas | Lento em demos | Monitorizar invocaÃ§Ãµes: ~500/dia confortÃ¡vel |
| Google Maps API key necessÃ¡ria para autocomplete | Sprint 2 UI | Configurar em `.env` antes de Sprint 2 |

---

## DECISÃ•ES ARQUITECTURAIS TOMADAS

1. **LocalizaÃ§Ã£o e estado operacional sÃ£o independentes** â€” dois campos distintos em `machines`
2. **Despacho em 2 passos**: digital (gestor app) + fÃ­sico (RFID na portaria)
3. **Sem GPS** â€” localizaÃ§Ã£o por eventos RFID; trÃ¢nsito Ã© inferido entre dois eventos
4. **Equipment logs diÃ¡rios** (nÃ£o por sessÃ£o) â€” respeita granularidade do Procore
5. **Compliance docs nunca apagados** â€” `renovaDocId` + `renovadoPorDocId` para chain of custody
6. **partialHours reset apenas por WorkOrder correctiva/preventiva concluÃ­da** â€” nÃ£o por inspecÃ§Ã£o
7. **Frota = MÃ¡quinas + Estaleiro fundidos** com filtros de localizaÃ§Ã£o (Sprint 2)

---

## SPRINT 6 â€” Menu de Obra
**Estimativa:** 3-4 semanas | **Estado:** â³ Em progresso

### Fase 6.1 â€” FundaÃ§Ã£o / Shell
- [x] 6.1.1 NavegaÃ§Ã£o para `/obras/:obraId` integrada com `activeView` + `window.history.pushState`
- [x] 6.1.2 `ObraMenuLayout` com breadcrumb, badge Procore e tabs
- [x] 6.1.3 `PeriodHeader` com presets + toggle `vs perÃ­odo anterior`
- [x] 6.1.4 `KpiCard` com RAG + delta
- [x] 6.1.5 Selectors com argumento: `getSessionsByObraId`, `getObraKPIs`, `getMachinesByObraId`, `getWorkersByObraId`
- [x] 6.1.6 Gate browser do shell aprovado

### Fase 6.2 â€” Resumo
- [x] 6.2.1 KPI cards com dados reais da obra
- [x] 6.2.2 Alert strip
- [x] 6.2.3 AreaChart de horas por dia
- [x] 6.2.4 BarChart de horas por mÃ¡quina
- [x] 6.2.5 Gate browser do Resumo aprovado

### Fase 6.3 â€” Equipamentos
- [x] 6.3.1 Fleet header com resumo da frota
- [x] 6.3.2 Tabela desktop / cards mobile
- [x] 6.3.3 Barras horizontais de utilizaÃ§Ã£o por mÃ¡quina
- [x] 6.3.4 Contexto de manutenÃ§Ã£o por `partialHours` / `threshold`
- [x] 6.3.5 Drawer por mÃ¡quina com sessÃµes recentes + custo + CO2
- [x] 6.3.6 NormalizaÃ§Ã£o de status (`IDLE` / `ACTIVE` / etc.) para UI e filtros
- [x] 6.3.7 Gate browser de Equipamentos aprovado
- [ ] 6.3.8 Heatmap de actividade real
- [ ] 6.3.9 Export CSV

### Fase 6.4 â€” SessÃµes
- [x] 6.4.1 `SessoesObraView`
- [x] 6.4.2 Agrupamento por dia + drawer de sessÃ£o
- [x] 6.4.3 Filtros por mÃ¡quina / estado / anomalias + export CSV
- [x] 6.4.4 SeparaÃ§Ã£o entre anomalias operacionais (`FATIGUE`, `AUTO_CLOSE`, `CORRECTED`) e `NO_OPERATOR` como flag informativa
- [x] 6.4.5 Gate browser local de SessÃµes aprovado
- [ ] 6.4.6 ValidaÃ§Ã£o em deploy para `AUTO_CLOSED`, RFID real e `costs.total`

### Fase 6.5 â€” ManutenÃ§Ã£o
- [x] 6.5.1 `ManutencaoObraView`
- [x] 6.5.2 KPI grid: MÃ¡quinas / Em alerta / Vencida / Avarias
- [x] 6.5.3 Lista hÃ­brida com ordenaÃ§Ã£o `OVERDUE â†’ ALERT â†’ NORMAL â†’ UNKNOWN`
- [x] 6.5.4 Drawer lateral com threshold, partialHours, Ãºltima manutenÃ§Ã£o e avarias
- [x] 6.5.5 `DEFAULT_THRESHOLD = 150h` explÃ­cito
- [x] 6.5.6 Gate browser local de ManutenÃ§Ã£o aprovado
- [ ] 6.5.7 ValidaÃ§Ã£o em deploy com `partialHours` reais e thresholds atingidos

### Fase 6.6 â€” PrÃ³ximos blocos imediatos
- [ ] 6.6.1 `TrabalhadoresObraView`
- [ ] 6.6.2 `LocalizacaoObraView`
- [ ] 6.6.3 `Co2ObraView`

### Notas
- O menu de obra usa actualmente navegaÃ§Ã£o hÃ­brida: `activeView` continua a ser o sistema principal da app e o deep-link da obra usa `pushState` / leitura do pathname como compromisso desta fase.
- Os gates aprovados para `SessÃµes` e `ManutenÃ§Ã£o` sÃ£o locais (`localhost`). Continua pendente um gate em deploy/ambiente real para validar integraÃ§Ã£o Procore/RFID/backend.
- O Dashboard global ainda nÃ£o foi simplificado; essa limpeza continua pendente.
