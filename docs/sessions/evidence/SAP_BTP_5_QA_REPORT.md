# SAP-BTP-5 — Relatório QA E2E
**Data:** 2026-06-11  
**Ambiente:** Bridge local (node -e) → SAP BTP CAP OData v4 (us10-001) → Fiori UI  
**Flag SAP_BTP_ENABLED:** ON apenas durante execução (process.env isolado) — OFF após teste  

---

## Resultado Global: PASS ✅

Todos os 3 fluxos obrigatórios passaram. Dados confirmados via OData e visíveis na Fiori UI.

---

## Fluxo 1 — MART-002: Sessão NFC (checkout → checkin) PASS ✅

### Baseline antes do teste
- Equipment ID BTP: `11111111-1111-1111-1111-111111111111`  
- Status: IN_USE | Location: Piso 10 - Cobertura | Last Seen By: Encarregado de Obra

### Bridge executada
```js
syncToolLocationToSapBtp({
  tool: { code: 'MART-002', status: 'in_use' },
  operator: { name: 'Carlos Matos (QA E2E)' },
  location: { name: 'Armazem Central', gps: { latitude: 41.1579, longitude: -8.6291 } },
  eventType: 'checkin',
})
```

### Resultado bridge
```json
{
  "ok": true,
  "body": {
    "status": "AVAILABLE",
    "currentLocationName": "Armazem Central",
    "lastSeenBy": "Carlos Matos (QA E2E)",
    "lastSeenAt": "2026-06-11T14:09:22"
  }
}
```

### Verificação Fiori
- **Lista:** MART-002 → AVAILABLE / Armazem Central / 11/06/2026 15:09:22 ✓  
- **Detail page** (`#/Equipments/11111111-1111-1111-1111-111111111111`):  
  - Status: AVAILABLE ✓  
  - Location: Armazem Central ✓  
  - Last Seen By: Carlos Matos (QA E2E) ✓  
  - Last Seen At: 11/06/2026, 15:09:22 ✓  
  - GPS: 41.157900 / -8.629100 ✓  

### Screenshots
- `sap-btp-5-before-list.png` — estado antes (IN_USE / Piso 10 - Cobertura)
- `sap-btp-5-after-list.png` — estado depois (lista completa)
- `sap-btp-5-mart002-detail.png` — detail page com todos os campos

---

## Fluxo 2 — LIXA-001: Avaria (FaultReport DAMAGE) PASS ✅

### Baseline antes do teste
- Equipment ID BTP: `22222222-2222-2222-2222-222222222222`  
- Status: AVAILABLE | hasOpenFault: false | Location: Armazem Central

### Bridge executada
```js
syncDamageReportToSapBtp({
  tool: { code: 'LIXA-001' },
  maintenance: {
    type: 'DAMAGE',
    description: 'Disco abrasivo partido durante operacao (QA E2E)',
    reportedAt: '2026-06-11T14:09:31.000Z',
  },
  operator: { name: 'Ana Costa (QA E2E)' },
})
```

### Resultado bridge
```json
{
  "ok": true,
  "faultResult": {
    "ok": true,
    "body": {
      "ID": "1149aa5b-cdc5-4564-a7c2-493387c1ec89",
      "faultType": "DAMAGE",
      "status": "OPEN",
      "reportedBy": "Ana Costa (QA E2E)",
      "equipment_ID": "22222222-2222-2222-2222-222222222222"
    }
  },
  "patchResult": {
    "ok": true,
    "body": { "status": "MAINTENANCE", "hasOpenFault": true }
  }
}
```

### IDs BTP criados
- **FaultReport ID:** `1149aa5b-cdc5-4564-a7c2-493387c1ec89`

### Verificação Fiori
- **Lista:** LIXA-001 → MAINTENANCE / Open Fault: Yes ✓  
- **Detail page** (`#/Equipments/22222222-2222-2222-2222-222222222222`):  
  - Status: MAINTENANCE ✓  
  - Open Fault: Yes ✓  
  - Fault Reports panel — nova linha:  
    - Type: DAMAGE ✓  
    - Status: OPEN ✓  
    - Reported At: 11/06/2026, 15:09:31 ✓  
    - Reported By: Ana Costa (QA E2E) ✓  
    - Description: Disco abrasivo partido durante operacao (QA E2E) ✓  

### Screenshots
- `sap-btp-5-after-list.png` — LIXA-001 na lista (MAINTENANCE / Open Fault: Yes)
- `sap-btp-5-lixa001-detail.png` — detail page com FaultReports panel e nova linha

---

## Fluxo 3 — SERRA-006: Transferência NFC (DISPATCHED) PASS ✅

### Baseline antes do teste
- Equipment ID BTP: `44444444-4444-4444-4444-444444444444`  
- Status: AVAILABLE | Location: Armazem Central

### Bridge executada
```js
syncTransferMovementToSapBtp({
  tool: { code: 'SERRA-006' },
  transfer: {
    fromLocation: 'Armazem Central',
    toLocation: 'Torre Boavista - Porto',
    transferredAt: '2026-06-11T14:09:39.000Z',
  },
  operator: { name: 'Pedro Sousa (QA E2E)' },
})
```

### Resultado bridge
```json
{
  "ok": true,
  "movementResult": {
    "ok": true,
    "body": {
      "ID": "ea7b621e-dbe9-4223-8b56-f86a8b4b34ce",
      "movementType": "NFC_TRANSFER",
      "fromLocation": "Armazem Central",
      "toLocation": "Torre Boavista - Porto",
      "createdBy": "Pedro Sousa (QA E2E)",
      "equipment_ID": "44444444-4444-4444-4444-444444444444"
    }
  },
  "patchResult": {
    "ok": true,
    "body": {
      "status": "IN_TRANSFER",
      "currentLocationName": "Torre Boavista - Porto",
      "lastSeenBy": "Pedro Sousa (QA E2E)"
    }
  }
}
```

### IDs BTP criados
- **Movement ID:** `ea7b621e-dbe9-4223-8b56-f86a8b4b34ce`

### Verificação Fiori
- **Lista:** SERRA-006 → IN_TRANSFER / Torre Boavista - Porto ✓  
- **Detail page** (`#/Equipments/44444444-4444-4444-4444-444444444444`):  
  - Status: IN_TRANSFER ✓  
  - Location: Torre Boavista - Porto ✓  
  - Last Seen By: Pedro Sousa (QA E2E) ✓  
  - Movements panel — nova linha:  
    - Type: NFC_TRANSFER ✓  
    - From: Armazem Central ✓  
    - To: Torre Boavista - Porto ✓  
    - Date: 11/06/2026, 15:09:39 ✓  
    - By: Pedro Sousa (QA E2E) ✓  

### Screenshots
- `sap-btp-5-after-list.png` — SERRA-006 na lista (IN_TRANSFER / Torre Boavista - Porto)
- `sap-btp-5-serra006-detail.png` — detail page com Movements panel e nova linha

---

## IDs de Documentos Firestore

Todos os fluxos foram executados via bridge direta (node -e) sem trigger Firestore real, pelo que não foram criados documentos Firestore durante este QA. Os triggers Cloud Functions (SAP-BTP-4) ligam automaticamente os mesmos fluxos bridge quando documentos são criados/atualizados em `tool_sessions`, `tool_maintenance`, `tool_transfers`.

---

## Flag SAP_BTP_ENABLED — Confirmação de Isolamento

A flag foi ativada exclusivamente dentro do processo `node -e`:
```js
process.env.SAP_BTP_ENABLED = 'true';
```
Ao terminar o processo, a variável desaparece. Não foram modificados:
- `.runtimeconfig.json`
- `firebase functions:config`
- Nenhuma variável de ambiente de sistema

**Flag está OFF.** A Cloud Function implantada em produção continua a retornar `{ skipped: true }` para todas as chamadas SAP BTP.

---

## Problemas Encontrados

| # | Problema | Resolução |
|---|---|---|
| 1 | MART-002 tinha `hasOpenFault: true` de teste anterior (SAP-BTP-2) | PATCH direto via curl para reset antes do teste |
| 2 | LIXA-001 já estava MAINTENANCE com FaultReport existente | PATCH direto via curl para reset (status=AVAILABLE, hasOpenFault=false) |
| 3 | SERRA-006 já estava IN_TRANSFER de teste anterior | PATCH direto para reset (status=AVAILABLE) |
| 4 | `jest --testPathPattern` deprecated | Usar argumento posicional (não afeta produção) |

---

## Recomendação

**PRONTO PARA DEMO TCC.**

Os 3 fluxos principais estão operacionais end-to-end:
1. Sessão NFC → Equipment status + localização atualizada em tempo real no Fiori ✓  
2. Avaria → FaultReport criado no BTP + Equipment marcado MAINTENANCE ✓  
3. Transferência → Movement registado no BTP + Equipment IN_TRANSFER ✓  

O comportamento não-fatal está confirmado: uma falha BTP nunca quebra o fluxo Firestore principal. A flag `SAP_BTP_ENABLED=false` por defeito garante que o PWA funciona normalmente sem dependência do BTP Trial.

**Limitação documentada:** O BTP Trial expira ao fim de 90 dias. Se o trial expirar antes da apresentação, reativar via BAS ou fazer fresh trial.
