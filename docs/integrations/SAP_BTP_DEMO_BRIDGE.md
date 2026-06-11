# SAP BTP Demo Bridge

## O Que É

Módulo de integração entre o backend Firebase/PWA e o serviço OData CAP deployed no SAP BTP Cloud Foundry.
Permite sincronizar eventos do domínio PWA (sessões NFC, avarias, transferências) para o modelo de dados BTP (`Equipments`, `FaultReports`, `Movements`).

Desligado por defeito (`SAP_BTP_ENABLED=false`). Sem esta flag, **nenhuma chamada HTTP é feita** — o PWA funciona normalmente sem qualquer dependência do SAP BTP.

## O Que NÃO É

- Não é a integração SAP PM/S4HANA (esse é o `sap/sapBridge.js`)
- Não tem triggers registados ainda — as funções bridge são chamadas explicitamente
- Não sincroniza dados históricos em batch
- Não substitui o Firestore como source of truth
- Não é para produção sem revisão de segurança (auth dummy no BTP, sem XSUAA)

---

## Ficheiros

```
Backend_Cloud/functions/sapBtp/
├── sapBtpClient.js       — HTTP client isolado (GET/PATCH/POST para OData)
├── sapBtpBridge.js       — Mapeamento PWA → BTP (3 funções bridge)
├── sapBtpClient.test.js  — 35 testes do cliente
└── sapBtpBridge.test.js  — 21 testes do bridge
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

## Como Activar em Produção

### Passo 1 — Activar a flag

```bash
# Firebase Functions (emulador/prod)
firebase functions:secrets:set SAP_BTP_ENABLED=true

# Ou no .runtimeconfig.json para emulador
{
  "sap_btp": { "enabled": "true" }
}
```

### Passo 2 — Adicionar chamadas em triggers existentes

Exemplo: no `sap/sapBridge.js`, após processar a sessão:

```js
const { syncToolLocationToSapBtp } = require('../sapBtp/sapBtpBridge');

// No processToolSession, após resultado OK:
if (result.ok && eventType === 'checkout') {
  await syncToolLocationToSapBtp({
    tool: { code: sessionData.toolCode },
    operator: { name: sessionData.operatorName },
    location: {
      name: sessionData.obraName,
      gps: { latitude: sessionData.latitude, longitude: sessionData.longitude },
      timestamp: new Date().toISOString(),
    },
    eventType: 'checkout',
  }).catch(err => console.warn('[sapBridge] BTP sync failed (non-fatal):', err.message));
}
```

O `.catch()` garante que uma falha do BTP não quebra o fluxo principal Firestore.

### Passo 3 — Verificar na UI Fiori

```
https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/webapp/
```

Após um evento PWA, a localização/status deve actualizar dentro de segundos.

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
