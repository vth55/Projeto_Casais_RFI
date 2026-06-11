# SAP BTP Demo Bridge

## O Que É

Módulo de integração entre o backend Firebase/PWA e o serviço OData CAP deployed no SAP BTP Cloud Foundry.
Permite sincronizar eventos do domínio PWA (sessões NFC, avarias, transferências) para o modelo de dados BTP (`Equipments`, `FaultReports`, `Movements`).

Desligado por defeito (`SAP_BTP_ENABLED=false`). Sem esta flag, **nenhuma chamada HTTP é feita** — o PWA funciona normalmente sem qualquer dependência do SAP BTP.

## O Que NÃO É

- Não é a integração SAP PM/S4HANA (esse é o `sap/sapBridge.js`)
- Não sincroniza dados históricos em batch
- Não substitui o Firestore como source of truth
- Não é para produção sem revisão de segurança (auth dummy no BTP, sem XSUAA)

---

## Ficheiros

```
Backend_Cloud/functions/sapBtp/
├── sapBtpClient.js        — HTTP client isolado (GET/PATCH/POST para OData)
├── sapBtpBridge.js        — Mapeamento PWA → BTP (3 funções bridge)
├── sapBtpTriggers.js      — Cloud Function trigger: tool_maintenance → BTP FaultReports
├── sapBtpClient.test.js   — 35 testes do cliente
├── sapBtpBridge.test.js   — 21 testes do bridge
└── sapBtpTriggers.test.js — 20 testes do trigger
```

---

## Triggers Ligados (SAP-BTP-4)

Os fluxos reais estão agora ligados. Todos são **fire-and-forget não-fatal** — uma falha do BTP nunca quebra o fluxo principal Firestore.

### Fluxo 1 — Sessões NFC (tool_sessions)

**Trigger:** `sap/sapBridge.js` → `processToolSession()` (chamado por `onToolSessionCreatedToSap` e `onToolSessionClosedToSap`)

**Quando dispara:**
- `tool_session` criada com `status === 'OPEN'` → eventType `checkout`
- `tool_session` atualizada de `OPEN → CLOSED` → eventType `checkin`

**O que sincroniza para BTP:**
- `PATCH Equipment.status` → `IN_USE` (checkout) ou `AVAILABLE` (checkin)
- `PATCH currentLocationName` → `session.sapDestination || session.obraName`
- `PATCH lastSeenBy` → `session.operatorName || session.operatorId`
- `PATCH lastSeenAt` → timestamp do momento

**Nota:** O campo `toolCode` pode não existir na sessão; `toolId` é usado como fallback (identificador do documento da ferramenta). Se o BTP não encontrar o equipamento por esse código, regista um warning mas não falha.

**Log de exemplo (flag off):**
```
[sapBtpBridge] session sync non-fatal: SAP_BTP_DISABLED  ← flag off, skipped
```
**Log de exemplo (flag on, sucesso):**
```
[sapBtpBridge] syncToolLocation OK code=MART-002
```

---

### Fluxo 2 — Avarias (tool_maintenance)

**Trigger:** `sapBtp/sapBtpTriggers.js` → `onToolMaintenanceCreated`

**Colecção:** `artifacts/casais-rfid/public/data/tool_maintenance/{maintenanceId}`

**Quando dispara:**
- Documento criado com `type` em `{DAMAGE, FAULT, BREAKDOWN, AVARIA}` (case-insensitive)
- Tipos ignorados: PREVENTIVE, SCHEDULED, e qualquer outro

**O que sincroniza para BTP:**
- `POST FaultReports` → `{ faultType, status: 'OPEN', reportedBy, description }`
- `PATCH Equipment.hasOpenFault = true`
- `PATCH Equipment.status = MAINTENANCE`

**Campos mapeados:**
| Campo Firestore | Campo BTP |
|---|---|
| `toolCode` ou `toolId` | `equipmentCode` (lookup) |
| `type` | `faultType` |
| `description` ou `notes` | `description` |
| `operatorName` / `reportedBy` / `operatorId` | `reportedBy` |
| `reportedAt` | `reportedAt` |

**Log de exemplo:**
```
[sapBtpTriggers] onToolMaintenanceCreated: maint-xyz type=DAMAGE tool=LIXA-001
[sapBtpBridge] syncDamageReport OK code=LIXA-001
```

---

### Fluxo 3 — Guias Logísticas (tool_transfers)

**Trigger:** `sap/sapTransferBridge.js` → `onToolTransferWritten`

**Quando dispara (por transição de status):**

| Transição | Evento BTP | Bridge chamado |
|---|---|---|
| → `DISPATCHED` | `NFC_TRANSFER` Movement criado | `syncTransferMovementToSapBtp` |
| → `RECEIVED` | Equipment marcado AVAILABLE no destino | `syncToolLocationToSapBtp` com `eventType: 'checkin'` |

**DISPATCHED — o que sincroniza:**
- `POST Movements` → `{ movementType: 'NFC_TRANSFER', fromLocation, toLocation, createdBy }`
- `PATCH Equipment.status = IN_TRANSFER`
- `PATCH Equipment.currentLocationName = toLocation`

**RECEIVED — o que sincroniza:**
- `PATCH Equipment.status = AVAILABLE`
- `PATCH Equipment.currentLocationName = toLocation` (destino final)
- `PATCH Equipment.lastSeenBy = receivedBy`

**Nota:** Só o primeiro item (`items[0]`) é sincronizado para BTP. Uma guia com múltiplos itens apenas regista o primeiro no BTP — comportamento documentado e aceitável para demo TCC.

**Log de exemplo:**
```
[sapTransfer] enqueued transfer_abc:DISPATCHED
[sapBtpBridge] syncTransferMovement OK code=SERRA-006
```

---

## Env Vars

| Variável              | Default   | Descrição |
|-----------------------|-----------|-----------|
| `SAP_BTP_ENABLED`     | `false`   | `'true'` para activar chamadas HTTP |
| `SAP_BTP_BASE_URL`    | URL prod  | URL base do serviço OData (sem `/` final) |
| `SAP_BTP_TIMEOUT_MS`  | `10000`   | Timeout por pedido em ms |

URL prod: `https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment`

Para activar numa Cloud Function (sem deploy): `firebase functions:config:set sap_btp.enabled="true"` ou via variáveis de ambiente no `.runtimeconfig.json` para emulador.

---

## Mappings PWA → BTP

### Equipment

| Campo PWA | Campo BTP |
|-----------|-----------|
| `tool.code` / `tool.serialNumber` / `tool.internalCode` | `equipmentCode` (chave de lookup) |
| `tool.name` | `name` |
| `tool.nfcTagId` | `rfidTag` |
| `tool.currentObraName` | `assignedProject` |
| `location.name` | `currentLocationName` |
| `location.gps.latitude` | `latitude` |
| `location.gps.longitude` | `longitude` |
| `location.timestamp` | `lastSeenAt` |
| `operator.name` | `lastSeenBy` |

### Status

| Status PWA | Status BTP |
|------------|------------|
| `available` | `AVAILABLE` |
| `in_use` / `session_active` | `IN_USE` |
| `maintenance` / `damage` | `MAINTENANCE` |
| `transfer` | `IN_TRANSFER` |
| evento `checkout` / `session_start` | `IN_USE` |
| evento `checkin` / `session_end` | `AVAILABLE` |

---

## API das Bridge Functions

### `syncToolLocationToSapBtp({ tool, operator, location, eventType })`

Actualiza `Equipment.currentLocationName`, `status`, GPS e `lastSeenBy` no BTP.

```js
const { syncToolLocationToSapBtp } = require('./sapBtp/sapBtpBridge');

await syncToolLocationToSapBtp({
  tool: {
    code: 'MART-002',           // ou serialNumber / internalCode
    status: 'in_use',
    currentObraName: 'Torre Boavista - Porto',
  },
  operator: { name: 'João Silva' },
  location: {
    name: 'Piso 5 - Acabamentos',
    timestamp: '2026-06-11T13:00:00.000Z',
    gps: { latitude: 41.157944, longitude: -8.629105 },
  },
  eventType: 'checkout',        // checkout | checkin | session_start | session_end
});
// Retorna: { ok: true, body: {...} }
// Flag off: { skipped: true, reason: 'SAP_BTP_DISABLED' }
```

### `syncDamageReportToSapBtp({ tool, maintenance, operator })`

Cria `FaultReport` OPEN no BTP e marca `Equipment.hasOpenFault = true` + `status = MAINTENANCE`.

```js
await syncDamageReportToSapBtp({
  tool: { code: 'LIXA-001' },
  maintenance: {
    type: 'DAMAGE',
    description: 'Disco de lixar partido',
    reportedAt: '2026-06-08T19:40:00.000Z',
  },
  operator: { name: 'Ana Costa' },
});
// Retorna: { ok: true, faultResult: {...}, patchResult: {...} }
```

### `syncTransferMovementToSapBtp({ transfer, tool, operator })`

Cria `Movement` NFC_TRANSFER no BTP e actualiza `Equipment.status = IN_TRANSFER` + `currentLocationName`.

```js
await syncTransferMovementToSapBtp({
  tool: { code: 'SERRA-006' },
  transfer: {
    fromLocation: 'Armazem Central',
    toLocation: 'Urbanizacao Gaia Norte',
    transferredAt: '2026-06-09T11:45:00.000Z',
  },
  operator: { name: 'Carlos Matos' },
});
// Retorna: { ok: true, movementResult: {...}, patchResult: {...} }
```

---

## Como Testar Manualmente

### 1. Verificar OData endpoint

```bash
curl https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment/Equipments
```

### 2. Testar com flag ON (emulador ou script local)

```js
// script manual: scripts/test-sap-btp-bridge.js
process.env.SAP_BTP_ENABLED = 'true';
process.env.SAP_BTP_BASE_URL = 'https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment';

const { syncToolLocationToSapBtp } = require('./sapBtp/sapBtpBridge');

syncToolLocationToSapBtp({
  tool: { code: 'MART-002' },
  operator: { name: 'Teste Manual' },
  location: { name: 'Armazem Central', gps: { latitude: 41.15, longitude: -8.62 } },
  eventType: 'checkin',
}).then(console.log).catch(console.error);
```

Executar: `node scripts/test-sap-btp-bridge.js`

### 3. Correr testes unitários

```bash
cd Backend_Cloud/functions
npx jest sapBtp/
```

---

## Como Activar

### Passo 1 — Activar a flag (sem deploy)

```bash
# Firebase emulador (.runtimeconfig.json)
echo '{"sap_btp":{"enabled":"true","base_url":"https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment"}}' \
  > Backend_Cloud/functions/.runtimeconfig.json

# Firebase prod (secrets)
firebase functions:secrets:set SAP_BTP_ENABLED=true
```

Todas as bridges já estão ligadas aos triggers desde SAP-BTP-4. Activar a flag é suficiente.

### Rollback — desactivar

```bash
# Emulador: apagar o ficheiro ou pôr enabled=false
echo '{"sap_btp":{"enabled":"false"}}' > Backend_Cloud/functions/.runtimeconfig.json

# Prod
firebase functions:secrets:set SAP_BTP_ENABLED=false
```

Com `SAP_BTP_ENABLED=false` (ou ausente), todos os triggers retornam `{ skipped: true }` sem qualquer chamada HTTP. O PWA funciona normalmente.

### Passo 2 — Verificar na UI Fiori

```
https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/webapp/
```

Após um evento PWA, a localização/status deve actualizar dentro de segundos.

---

## Como Testar End-to-End com MART-002 / LIXA-001

### Pré-requisitos
1. BTP endpoint acessível: `curl https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment/Equipments`
2. Emulador Firebase a correr: `cd Backend_Cloud/functions && firebase emulators:start`
3. Flag activa: `SAP_BTP_ENABLED=true` no `.runtimeconfig.json`

### Teste A — Sessão (MART-002)

1. Criar um `tool_session` com `status: 'OPEN'` e `toolId: 'MART-002'` via Firestore emulador
2. O trigger `onToolSessionCreatedToSap` dispara → BTP sync segue
3. Verificar log: `[sapBtpBridge] syncToolLocation OK code=MART-002`
4. Verificar na UI Fiori: `https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/webapp/`
   → MART-002 deve ter `status: IN_USE`

5. Atualizar o documento para `status: 'CLOSED'`
6. Verificar na UI Fiori: MART-002 deve ter `status: AVAILABLE`

### Teste B — Avaria (LIXA-001)

1. Criar `tool_maintenance` com `{ type: 'DAMAGE', toolCode: 'LIXA-001', description: 'Disco partido', operatorName: 'Ana Costa' }`
2. Verificar log: `[sapBtpTriggers] onToolMaintenanceCreated: ... type=DAMAGE tool=LIXA-001`
3. Verificar na UI Fiori: LIXA-001 deve ter `hasOpenFault: true` + `status: MAINTENANCE`
4. No painel FaultReports: deve aparecer novo registo com `status: OPEN`

### Teste C — Transferência (SERRA-006)

1. Criar `tool_transfer` com `{ status: 'DISPATCHED', items: [{ toolId: 'SERRA-006' }], from: { name: 'Armazem Central' }, to: { name: 'Torre Boavista' }, dispatchedBy: 'Carlos Matos' }`
2. Verificar log: `[sapBtpBridge] syncTransferMovement OK code=SERRA-006`
3. Verificar na UI Fiori: SERRA-006 deve ter `status: IN_TRANSFER`, `currentLocationName: Torre Boavista`
4. Atualizar `status: 'RECEIVED'` com `receivedBy: 'Pedro Sousa'`
5. Verificar na UI Fiori: SERRA-006 deve ter `status: AVAILABLE`

### Script de teste rápido (sem emulador)

```bash
# Com flag activa e endpoint acessível:
node -e "
process.env.SAP_BTP_ENABLED = 'true';
process.env.SAP_BTP_BASE_URL = 'https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment';
const { syncToolLocationToSapBtp } = require('./sapBtp/sapBtpBridge');
syncToolLocationToSapBtp({
  tool: { code: 'MART-002', status: 'in_use' },
  operator: { name: 'Teste Manual' },
  location: { name: 'Armazem Central', gps: { latitude: 41.15, longitude: -8.62 } },
  eventType: 'checkin',
}).then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
" 2>&1
```

---

## Riscos e Limitações

| Risco | Mitigação |
|-------|-----------|
| SAP BTP Trial expira (90 dias) | Bridge retorna `{ ok: false, error: 'timeout' }` — PWA não quebra |
| Auth dummy no BTP (sem XSUAA) | Aceitável para demo TCC; não expor em produção real |
| `gen/` não versionado — redeploy manual | Documentado em SAP_BTP_DEMO_BRIDGE; script de build separado |
| `patchEquipmentByCode` faz 2 chamadas HTTP | Ineficiente para volume alto; para prod usar `ID` directo se disponível |
| BTP em US East (us10-001), PWA em europe-west1 | Latência ~150ms; coberta pelo `SAP_BTP_TIMEOUT_MS=10000` |
| Sem retry automático | Falhas transientes perdem-se; para prod adicionar fila Firestore (como `procoreSyncQueue`) |
