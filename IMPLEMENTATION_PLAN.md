# IMPLEMENTATION PLAN v2.0 — Reset + Procore Bidireccional Total

> **Para quem lê isto pela primeira vez:** este ficheiro é o briefing completo para um Claude novo (sem memória de sessões anteriores) implementar do zero a refundação Procore-first do projecto Casais Fleet Intelligence. Lê tudo antes de tocar em código.

---

## 0. Contexto do Projecto

**Casais Fleet Intelligence** — PWA industrial de gestão de frotas para o Grupo Casais (Portugal). Projecto académico (Junho 2025), nível enterprise.

- **Stack frontend:** React 19 + Vite + Tailwind + Recharts + Zustand (caminho: `Frontend_App/dashboard`)
- **Stack backend:** Firebase Cloud Functions v2 (Node.js 24) + Firestore (caminho: `Backend_Cloud/functions`)
- **Firebase project:** `casais-rfid`
- **Firestore base path:** `artifacts/casais-rfid/public/data/`
- **Dev local:** `cd Frontend_App/dashboard && npm run dev` → `localhost:5173`
- **Deploy frontend:** dentro de `Frontend_App/dashboard`, `npm run deploy` (build + hosting)
- **Deploy backend:** dentro de `Backend_Cloud`, `firebase deploy --only functions`
- **Utilizador:** não-técnico, ordens em PT, executa autonomamente. Cor #005EB8 sempre, verde nunca.

### Procore — IDs sandbox conhecidas
- Company ID: `4283171` (Dev Sandbox — **nunca apontar para produção**)
- Project principal: `328122` — "Torre Boavista Porto"
- Equipment API endpoint: `POST/PATCH /rest/v2.1/companies/4283171/equipment_register`
- Campos obrigatórios POST equipment: `name`, `equipment_id`, `status_id`, `category_id`, `type_id`, `ownership`
- ULIDs:
  - `status_id` Active: `01KPRV693GQFM6FCM77D59YKFT`
  - `category_id` Terraplanagem: `01KQCGF5S8GME0ZQNGKXPS9WN8`
  - `type_id` Escavadora: `01KQCGFKFZK4P5H84XG98SYPM6`
- OAuth access token: Firestore em `integrations/procore.accessToken` (refresh via `getValidAccessToken()` em `procoreBridge.js`)

---

## 1. Objectivo da v2.0

Limpar 100 % do Firestore e reconstruir um catálogo coerente com:

1. **7 máquinas** (4 com RFID reader real, 3 sem)
2. **5–6 obras** (1 espelha Torre Boavista no Procore; restantes só PWA, e o utilizador pode editar mas **não criar obras** pela PWA)
3. **8–10 operadores** misturando criados na PWA (com RFID) e provenientes do Procore directory (sem RFID — `pending_operators`)
4. Tudo sincronizado em ambas as direcções com o Procore sandbox
5. Cada sprint validado por testes Playwright end-to-end (PWA + Procore web)

---

## 2. Schema Firestore — ANTES vs DEPOIS

### 2.1 ANTES (estado actual sujo)

```
artifacts/casais-rfid/public/data/
├── machines/         ← muitas máquinas de teste, sessões agregadas inconsistentes
├── operators/        ← operadores com cardIds duplicados
├── obras/            ← obras criadas pela PWA + obras Procore misturadas
├── sessions/         ← sessões antigas (algumas órfãs)
├── avarias/          ← reportes acumulados de QA
├── maintenance/      ← histórico de manutenções de teste
├── maintenance_schedules/
├── location_cards/   ← cartões de localização RFID
├── pending_operators/ ← do projector Procore
├── integrations/
│   ├── procore (doc: accessToken, refreshToken, categoryMap, ...)
│   └── procore/
│       ├── projects/    ← mirror read-only
│       ├── directory/   ← mirror read-only
│       └── equipment/   ← mirror read-only
└── settings/system
```

### 2.2 DEPOIS (estado limpo, pós-reset)

```
artifacts/casais-rfid/public/data/
├── machines/             ← 7 docs (4 com rfidReaderId, 3 com rfidReaderId: null)
├── operators/            ← 4–6 operadores criados na PWA (com cardId)
├── pending_operators/    ← 3–4 do directory Procore (sem cardId)
├── obras/                ← 5–6 obras (1 com source: 'procore', restantes source: 'pwa')
├── location_cards/       ← 2–3 cartões de localização
├── settings/system       ← preservado (fuelPricePerLitre, co2FactorPerLitre, defaultMaintenanceInterval)
├── integrations/
│   ├── procore (doc)     ← preservado (OAuth tokens, categoryMap)
│   └── procore/
│       ├── projects/     ← repovoado por runFullSync
│       ├── directory/    ← repovoado por runFullSync
│       └── equipment/    ← repovoado por runFullSync
└── (APAGADAS) sessions, avarias, maintenance, maintenance_schedules
```

### 2.3 Schema dos documentos

**`machines/{id}`** (com convenção PWA actual)
```js
{
  id: 'mach-001',                        // immutable
  name: 'Escavadora CAT 320',
  category: 'escavadora',
  status: 'idle' | 'active' | 'maintenance',
  location: { workId: 'obra-xxx' } | 'estaleiro',
  obraId: 'obra-xxx' | 'estaleiro',     // espelhado para queries simples
  rfidReaderId: 'reader-01' | null,     // ← NOVO: null para máquinas sem reader
  procoreEquipmentId: '01KP...' | null,
  source: 'procore' | 'pwa',
  pairingStatus: 'paired' | 'unpaired',
  totalHours: 0,                        // resetado
  partialHours: 0,                      // desde última manutenção
  maintenanceInterval: 150,
  co2Factor: 2.68,
  tariffHistory: [                      // ← APPEND-ONLY, NUNCA APAGAR
    { effectiveFrom: '2026-05-12', ratePerHour: 45.00, currency: 'EUR' }
  ],
  createdAt: serverTimestamp(),
}
```

**`obras/{id}`**
```js
{
  id: 'obra-torre-boavista',
  name: 'Torre Boavista Porto',
  address: 'Rua X, Porto',
  status: 'ACTIVE' | 'PLANNED' | 'COMPLETED',
  manager: 'João Silva',                // PWA-only field
  description: '...',                   // PWA-only field
  endDate: '2026-12-31',                // PWA-only field
  source: 'procore' | 'pwa',            // ← KEY: define se é editável/eliminável
  procoreProjectId: '328122' | null,
  createdAt: serverTimestamp(),
}
```

**`operators/{id}`**
```js
{
  id: 'op-001',
  name: 'Carlos Mendes',
  cardId: 'RFID-A1B2C3',                // único; só presente em operadores activados
  email: 'carlos.mendes@casais.pt',
  phone: '+351...',
  role: 'operador',
  systemRole: null,                     // ou 'gestor_frota' etc.
  assignedObraId: 'obra-xxx' | null,
  licenses: ['escavadoras', 'gruas'],
  procoreUserId: '...' | null,          // se sincronizado bidireccional
  source: 'pwa' | 'procore',
  createdAt: serverTimestamp(),
}
```

**`pending_operators/{procoreUserId}`** — vindos do directory Procore sem RFID
```js
{
  procoreUserId: '12345',
  name: 'Ana Costa',
  email: 'ana.costa@procore.test',
  jobTitle: 'Engenheira',
  procoreSyncedAt: serverTimestamp(),
  source: 'procore',
  pairingStatus: 'unpaired',
}
```

---

## 3. Regras Invioláveis

- `sessions.tariffSnapshot` e `sessions.costs` — NUNCA alterar após fecho de sessão (no reset, apagar a colecção toda é OK; mas após o reset, sessões fechadas são imutáveis).
- `machines.tariffHistory[]` — APPEND-ONLY. Nunca apagar entradas — só adicionar novas.
- Cor #005EB8 sempre. Verde nunca (Casais brand).
- Firebase Auth não está configurado → ignorar erros de auth na consola.
- **Não tocar em `integrations/procore` (doc)** durante o reset — perde-se o OAuth token e fica-se bloqueado.

---

## 4. Sprints

### Sprint 0 — Reset Total do Firestore

**Objectivo:** apagar TUDO excepto os documentos de configuração que se quer manter.

**Ficheiros:**
- `scripts/reset/wipe_firestore.js` (novo)
- `scripts/reset/seed_clean_dataset.js` (novo)

**Colecções a APAGAR (recursivamente, batch de 500):**
```
artifacts/casais-rfid/public/data/sessions
artifacts/casais-rfid/public/data/avarias
artifacts/casais-rfid/public/data/maintenance
artifacts/casais-rfid/public/data/maintenance_schedules
artifacts/casais-rfid/public/data/machines
artifacts/casais-rfid/public/data/operators
artifacts/casais-rfid/public/data/pending_operators
artifacts/casais-rfid/public/data/obras
artifacts/casais-rfid/public/data/location_cards
artifacts/casais-rfid/public/data/integrations/procore/projects
artifacts/casais-rfid/public/data/integrations/procore/directory
artifacts/casais-rfid/public/data/integrations/procore/equipment
```

**A PRESERVAR:**
- `artifacts/casais-rfid/public/data/settings/system` (parâmetros operacionais)
- `artifacts/casais-rfid/public/data/integrations/procore` (doc raiz — OAuth tokens)
- `artifacts/casais-rfid/public/data/users/*` (auth — se existir)

**Script:** usa `firebase-admin` SDK; lê service-account credentials a partir de `Backend_Cloud/.serviceAccount.json` (gitignored). Itera por colecção, faz `.get()`, `batch.delete()` em chunks de 500, commit. Verbose log linha-a-linha.

**Verificações de segurança:**
- Confirmação interactiva no terminal (`Type 'RESET CASAIS' to proceed`).
- Verifica `projectId === 'casais-rfid'` antes de qualquer escrita.
- Imprime checklist do que vai apagar e do que vai preservar antes de pedir confirmação.

**Procore sandbox — limpeza paralela:**
Após o wipe Firestore, executar `scripts/reset/wipe_procore_sandbox.js`:
- Lista todos os equipment_register em `companies/4283171` e faz `PATCH status_id` para "inactive" (não há DELETE no v2.1).
- Lista todos os projects (excepto 328122 Torre Boavista) e marca `active: false`.
- Não toca em users/directory (Procore não suporta delete via API; alguns ficarão pending).

**Teste Playwright `scripts/tests/sprint0_test.js`:**
1. Lê via Firebase Admin `machines.get()` → assert `count === 0`.
2. Lê `sessions.get()` → assert `count === 0`.
3. Abre PWA `localhost:5173/maquinas` com Playwright → assert "Nenhuma máquina" empty state visível.
4. Screenshot guardado em `_prints/sprint0/`.

---

### Sprint 1 — Seed das 7 máquinas + sync para Procore

**Objectivo:** criar 7 máquinas no Firestore e propagar para o Procore sandbox como equipment_register.

**Dataset (`scripts/reset/seed_machines.json`):**
```json
[
  { "id": "mach-cat320",   "name": "Escavadora CAT 320",    "category": "escavadora",   "rfidReaderId": "reader-01", "obraId": "estaleiro" },
  { "id": "mach-jcb3cx",   "name": "Retroescavadora JCB 3CX","category": "retroescavadora","rfidReaderId": "reader-02", "obraId": "estaleiro" },
  { "id": "mach-bobcat",   "name": "Mini-Pá Bobcat S570",   "category": "minipa",       "rfidReaderId": "reader-03", "obraId": "estaleiro" },
  { "id": "mach-grua-lieb","name": "Grua Liebherr 132 EC-H","category": "grua",         "rfidReaderId": "reader-04", "obraId": "estaleiro" },
  { "id": "mach-dumper",   "name": "Dumper Thwaites 9T",    "category": "dumper",       "rfidReaderId": null,        "obraId": "estaleiro" },
  { "id": "mach-cilindro", "name": "Cilindro Bomag BW 213", "category": "compactador",  "rfidReaderId": null,        "obraId": "estaleiro" },
  { "id": "mach-gerador",  "name": "Gerador Atlas Copco 60kVA","category": "gerador",   "rfidReaderId": null,        "obraId": "estaleiro" }
]
```

**Fluxo do seed:**
1. Para cada máquina, escrever em `artifacts/casais-rfid/public/data/machines/{id}` com schema completo (totalHours: 0, partialHours: 0, source: 'pwa', pairingStatus: 'unpaired', tariffHistory: [tarifa inicial]).
2. Chamar `POST /api/procore/equipment-create` (já existe em `procoreBridge.js`) para cada uma, com:
   - `name`, `equipment_id: id`, `status_id: 01KPRV693GQFM6FCM77D59YKFT`, `category_id` mapeado, `type_id` mapeado, `ownership: 'owned'`.
3. Receber `procoreEquipmentId` retornado e fazer `update` no doc Firestore com `procoreEquipmentId` + `pairingStatus: 'paired'` + `source: 'procore'`.

**Teste Playwright `scripts/tests/sprint1_test.js`:**
```js
// 1. Abrir PWA
await page.goto('http://localhost:5173/maquinas');
// 2. Verificar que aparecem 7 cards com os nomes correctos
const names = await page.locator('[data-testid="machine-card-name"]').allTextContents();
assert.equal(names.length, 7);
assert.ok(names.includes('Escavadora CAT 320'));
// 3. Verificar badges "Sem RFID" em 3 cards
const noRfidBadges = await page.locator('[data-testid="no-rfid-badge"]').count();
assert.equal(noRfidBadges, 3);
// 4. Screenshot PWA
await page.screenshot({ path: '_prints/sprint1/pwa_maquinas.png' });
// 5. Procore: já estás autenticado via storage_state.json
await page.goto('https://sandbox.procore.com/4283171/company/equipment-register');
await page.waitForSelector('table');
const procoreRows = await page.locator('table tbody tr').allTextContents();
assert.equal(procoreRows.length, 7);
await page.screenshot({ path: '_prints/sprint1/procore_equipment.png' });
```
> Nota: para o Playwright entrar no Procore sandbox, usar `storage_state.json` gerado uma única vez com login manual e guardado fora do git (`scripts/tests/.procore_state.json` gitignored).

---

### Sprint 2 — Obras: editar PWA, criar só no Procore

**Objectivo:** remover criação de obras na PWA, adicionar badge "Gerida no Procore", bloquear delete em obras Procore.

**Mudanças em `Frontend_App/dashboard/src/views/ObrasView.jsx`:**

1. **Apagar:** botão `<Plus />` "Nova Obra" do header. Remover handler `onCreateObra`.
2. **Apagar:** formulário de criação. Manter só o formulário de **edição** com 3 campos:
   - `manager` (input text)
   - `description` (textarea)
   - `endDate` (date picker)
   - Todos os outros campos vêm do Procore e são **read-only** (mostrados em cinza).
3. **Adicionar:** badge na `ObraCard`:
   ```jsx
   {obra.source === 'procore' && (
     <Badge variant="primary" size="sm">
       <Link2 className="w-3 h-3 mr-1" />
       Gerida no Procore
     </Badge>
   )}
   ```
4. **Adicionar:** desactivar `Trash2` button se `obra.source === 'procore'`:
   ```jsx
   <Button disabled={obra.source === 'procore'} title={obra.source === 'procore' ? 'Esta obra só pode ser apagada no Procore' : 'Apagar obra'}>
     <Trash2 />
   </Button>
   ```
5. **Adicionar:** ao guardar a edição, `updateDoc` só patches `{ manager, description, endDate }` — nunca toca em campos sincronizados do Procore.

**Seed de obras (`scripts/reset/seed_obras.json`):**
- Obra 1: criada manualmente no Procore sandbox (Torre Boavista, já existe — ID `328122`) → vem via `runFullSync` com `source: 'procore'`.
- Obras 2–6: criadas manualmente no Procore sandbox via UI (5 minutos de trabalho do utilizador), todas com nomes Casais reais.
- O seed só faz: aguardar `runFullSync`, depois adicionar campos PWA-only (`manager`, `description`, `endDate`) via `updateDoc`.

**Teste Playwright `scripts/tests/sprint2_test.js`:**
1. PWA `/obras`: verificar que **não existe** botão "Nova Obra".
2. Click numa obra Procore → form abre → 3 inputs editáveis, restantes disabled.
3. Click no `Trash2` → assert `disabled === true`.
4. Procore web: verificar nomes das obras coincidem.
5. Screenshots.

---

### Sprint 3 — Operadores bidireccional PWA ↔ Procore directory

**Objectivo:** lista unificada PWA mostra `operators/` + `pending_operators/`. Criar operador na PWA cria também no directory Procore.

**Mudanças em `Frontend_App/dashboard/src/views/OperadoresView.jsx`:**

1. Fundir as duas listas (já existe parcialmente — verificar):
   ```js
   const allOperators = useMemo(() => [
     ...operators.map(o => ({ ...o, isPending: false })),
     ...pendingOperators.map(o => ({ ...o, isPending: true })),
   ], [operators, pendingOperators]);
   ```
2. Badge "Sem RFID — vindo do Procore" para `isPending === true`.
3. Botão "Activar RFID" nos pending → abre modal pequeno: scan RFID + click confirma → move documento de `pending_operators/{id}` para `operators/{newId}` com campos consolidados.

**Backend — `Backend_Cloud/functions/procore/procoreBridge.js`:**

Adicionar nova rota `POST /api/procore/directory-create`:
```js
// Endpoint Procore: POST /rest/v1.0/companies/{company_id}/users
// Payload mínimo:
//   { user: { first_name, last_name, email_address, is_employee: true } }
// Retorna { id } → guardar como procoreUserId no operador local.
```

**Fluxo de criação de operador na PWA:**
1. User clica "Novo Operador" → preenche form (name, cardId, email opcional, role).
2. Se email vazio → gerar `email = ${slugify(name)}@casais.pt` (fictício).
3. PWA chama Cloud Function `createOperatorWithProcoreSync` → escreve `operators/{newId}` + `POST /api/procore/directory-create`.
4. Resposta inclui `procoreUserId` → patch local com esse ID + `source: 'pwa'`.

**Tratamento de erros:**
- Se Procore POST falha (sandbox bug, rate limit) → operador fica criado localmente com `procoreUserId: null` e `syncStatus: 'pending'`. Job nightly tenta de novo.

**Teste Playwright `scripts/tests/sprint3_test.js`:**
1. PWA `/operadores`: verificar contagem inicial (vinda de seed).
2. Click "Novo Operador" → preencher "João Teste" + cardId fictício.
3. Submit → aguardar toast de sucesso.
4. Refresh → operador aparece com badge "Sincronizado com Procore".
5. Procore web `/4283171/company/directory` → procurar "João Teste" → assert existe.
6. Screenshots.

---

### Sprint 4 — Mover máquinas entre obras (com sync Procore)

**Objectivo:** dropdown inline em cada `MachineCard` para mover máquina para outra obra (ou para estaleiro). Sync bidireccional com Procore.

**Pergunta do Opus — qual endpoint Procore usar:**

Há dois caminhos possíveis:

| Opção | Endpoint | Vantagens | Desvantagens |
|-------|----------|-----------|--------------|
| A | `POST/DELETE /rest/v1.0/projects/{project_id}/equipment` com body `{ equipment: { equipment_id } }` | Já existe em `procoreBridge.js` (`associateEquipmentToProject` / `removeEquipmentFromProject`). É a API v1.0 oficial de Equipment Tool. | Equipment Tool v1.0 está deprecated; sandbox às vezes devolve 404. |
| B | `PATCH /rest/v2.1/companies/4283171/equipment_register/{id}` com `{ project_id: <novo> }` | API moderna, mesma usada para criar equipment. Atómica (um único call). | Não está documentado se `project_id` no register equivale a associação ao project tool — pode ser apenas metadata. |

**Decisão recomendada:** **usar Opção A (v1.0 equipment_project_assignments via `/projects/{id}/equipment`) como primário**, com **fallback gracioso** (já implementado — retorna `false` em vez de throw). A v2.1 `equipment_register` é catálogo da empresa; a v1.0 é assignment a project. Conceptualmente são camadas diferentes. Para mover:
1. `removeEquipmentFromProject(procoreEquipmentId, oldProjectId)` — se a antiga obra tem `procoreProjectId`.
2. `associateEquipmentToProject(procoreEquipmentId, newProjectId)` — se a nova obra tem `procoreProjectId`.
3. Se a nova "obra" é `estaleiro` → só remove da antiga, não associa a nada.
4. Em paralelo, fazer também `PATCH equipment_register` com headers `Procore-Company-Id` para actualizar metadata cache (best effort, ignorar erros).

**UI — `MaquinasView.jsx`:**

Adicionar na card da máquina, ao lado do badge de obra:
```jsx
<Select
  value={machine.obraId || 'estaleiro'}
  onChange={(e) => handleMoveMachine(machine.id, e.target.value)}
  size="sm"
  className="ml-2"
>
  <option value="estaleiro">Estaleiro</option>
  {obras.filter(o => o.status === 'ACTIVE').map(o => (
    <option key={o.id} value={o.id}>{o.name}</option>
  ))}
</Select>
```

Decisão UX: **dropdown inline** (não drawer/modal). Justificação:
- Acção frequente e de baixo risco (pode-se reverter trivialmente).
- 5 obras → dropdown cabe sem scroll.
- Modal seria fricção desnecessária.
- Confirmação inline (toast "Movido para X — desfazer?") em vez de modal de confirmação.

**Handler:**
```js
async function handleMoveMachine(machineId, newObraIdOrEstaleiro) {
  const machine = machines.find(m => m.id === machineId);
  const oldObraId = machine.obraId;

  // 1. Update Firestore
  await updateDoc(doc(db, `${basePath}/machines/${machineId}`), {
    obraId: newObraIdOrEstaleiro,
    location: newObraIdOrEstaleiro === 'estaleiro' ? 'estaleiro' : { workId: newObraIdOrEstaleiro },
  });

  // 2. Sync Procore (best effort)
  if (machine.procoreEquipmentId) {
    const oldObra = obras.find(o => o.id === oldObraId);
    const newObra = obras.find(o => o.id === newObraIdOrEstaleiro);
    if (oldObra?.procoreProjectId) {
      await fetch('/api/procore/move-equipment', {
        method: 'POST',
        body: JSON.stringify({
          procoreEquipmentId: machine.procoreEquipmentId,
          fromProjectId: oldObra.procoreProjectId,
          toProjectId: newObra?.procoreProjectId || null,
        }),
      });
    }
  }

  toast.success(`${machine.name} movido para ${newObra?.name || 'Estaleiro'}`);
}
```

**Backend — adicionar rota em `procoreBridge.js`:**
```js
// action === 'move-equipment'
const { procoreEquipmentId, fromProjectId, toProjectId } = req.body;
if (fromProjectId) await removeEquipmentFromProject(procoreEquipmentId, fromProjectId);
if (toProjectId) await associateEquipmentToProject(procoreEquipmentId, toProjectId);
return res.json({ ok: true });
```

**Teste Playwright `scripts/tests/sprint4_test.js`:**
1. PWA `/maquinas`: localizar "Escavadora CAT 320" (actualmente em estaleiro).
2. Click no dropdown → seleccionar "Torre Boavista Porto".
3. Aguardar toast.
4. Refresh → assert card mostra badge "Torre Boavista Porto".
5. Procore web `/4283171/projects/328122/equipment` → assert escavadora aparece na lista.
6. Mover de volta para "Estaleiro" → verificar que sai do project Procore.
7. Screenshots de cada passo.

---

### Sprint 5 — Hardening + dados de demonstração

**Objectivo:** verificar que todos os fluxos funcionam ponta-a-ponta e gerar dados realistas para demo académica.

**Acções:**
1. Criar 3–5 sessões manuais para cada máquina (script `scripts/reset/seed_sessions.js`) — apenas para a demo, todas com `status: 'CLOSED'`, `tariffSnapshot` consolidado.
2. Criar 1–2 avarias de exemplo.
3. Re-correr `runFullSync` final.
4. Smoke test completo: navegar todas as views da PWA com Playwright e verificar zero erros na consola.

**Teste Playwright `scripts/tests/sprint5_smoke.js`:**
- Itera por todas as rotas: `/`, `/maquinas`, `/obras`, `/operadores`, `/manutencao`, `/financeiro`, `/analises`, `/configuracoes`.
- Em cada rota: aguarda load, screenshot, captura `console.errors` (deve estar vazio).
- Reporta resultado tabular.

---

## 5. Testes Playwright — Setup Comum

**Localização:** `scripts/tests/*.js`
**Runner:** `node scripts/tests/sprintN_test.js` (cada ficheiro é um script Node executável standalone).

**Setup partilhado (`scripts/tests/_common.js`):**
```js
const { chromium } = require('playwright');
const path = require('path');

async function launchBrowsers() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const pwaCtx = await browser.newContext();
  const procoreCtx = await browser.newContext({
    storageState: path.join(__dirname, '.procore_state.json'),
  });
  return { browser, pwa: await pwaCtx.newPage(), procore: await procoreCtx.newPage() };
}

module.exports = { launchBrowsers };
```

**Gerar `.procore_state.json` uma vez:**
```bash
node scripts/tests/_generate_procore_state.js
# abre browser, faz login manual, guarda cookies
```

**Padrão de cada teste:**
```js
const { launchBrowsers } = require('./_common');
(async () => {
  const { browser, pwa, procore } = await launchBrowsers();
  try {
    // ... asserts
    console.log('✓ Sprint N passou');
  } catch (e) {
    console.error('✗ Sprint N falhou:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
```

---

## 6. Ficheiros que vão ser tocados (resumo)

### Frontend
- `Frontend_App/dashboard/src/views/ObrasView.jsx` — remover criação, adicionar badge Procore, desactivar delete
- `Frontend_App/dashboard/src/views/OperadoresView.jsx` — lista unificada, criar com sync Procore
- `Frontend_App/dashboard/src/views/MaquinasView.jsx` — dropdown mover entre obras, badge "Sem RFID"
- `Frontend_App/dashboard/src/store/useStore.js` — listener para `pending_operators`, helper `moveMachine`
- `Frontend_App/dashboard/src/store/useStore.js` — listener para `pending_operators` (adicionar)

### Backend
- `Backend_Cloud/functions/procore/procoreBridge.js` — novas rotas `directory-create`, `move-equipment`
- `Backend_Cloud/functions/index.js` — wrap rota `createOperatorWithProcoreSync` se preferido como callable

### Scripts (novos)
- `scripts/reset/wipe_firestore.js`
- `scripts/reset/wipe_procore_sandbox.js`
- `scripts/reset/seed_machines.json`
- `scripts/reset/seed_machines.js`
- `scripts/reset/seed_obras.js` (só patches PWA-only fields)
- `scripts/reset/seed_operators.js`
- `scripts/reset/seed_sessions.js` (demo data)
- `scripts/tests/_common.js`
- `scripts/tests/_generate_procore_state.js`
- `scripts/tests/sprint0_test.js` ... `sprint5_smoke.js`

---

## 7. O que NÃO fazer

1. **Não apagar `integrations/procore` (doc raiz)** — perde OAuth.
2. **Não apagar `tariffHistory` de máquinas** — append-only, regra inviolável (no reset apaga-se a colecção inteira, OK; mas pós-reset nunca).
3. **Não criar obras pela PWA** — Procore é fonte de verdade para obras.
4. **Não inventar IDs Procore** — usar sempre os ULIDs reais da sandbox listados na secção 0.
5. **Não usar `cd` em comandos** — usar paths absolutos (regra do projecto).
6. **Não fazer deploy sem testes Playwright passar.**
7. **Não tocar em sessões fechadas (`status: 'CLOSED'`) após criadas** — `tariffSnapshot` e `costs` imutáveis.
8. **Não apontar para produção Procore** — sempre Dev Sandbox (`4283171`).
9. **Não usar verde nas badges/UI** — só #005EB8 e variantes neutras.

---

## 8. Ordem de execução recomendada (para o Claude implementador)

1. Ler este ficheiro inteiro.
2. Ler `.claude/memory/project/architecture.md` (schema Firestore detalhado) e `.claude/memory/project/procore.md` (IDs, OAuth).
3. Ler `FINDINGS.md` (quirks conhecidos do Procore sandbox).
4. **Sprint 0** — escrever wipe scripts, correr, validar com `sprint0_test.js`.
5. **Sprint 1** — seed máquinas, validar com `sprint1_test.js`.
6. **Sprint 2** — refactor `ObrasView`, seed obras, validar com `sprint2_test.js`.
7. **Sprint 3** — operadores bidireccionais, validar com `sprint3_test.js`.
8. **Sprint 4** — mover máquinas, validar com `sprint4_test.js`.
9. **Sprint 5** — demo data + smoke test.
10. Update `FINDINGS.md` com aprendizagens.
11. `/wrap-up` para fechar sessão.

---

## 9. Decisões de arquitectura e porquê

- **Procore é fonte de verdade para obras:** o cliente Casais já usa Procore para gestão de projectos; duplicar criação na PWA seria inconsistência garantida. PWA só adiciona metadata operacional (manager, description, endDate).
- **Operadores em duas colecções (`operators` + `pending_operators`):** evita schema híbrido confuso. Pending tem `procoreUserId` mas nunca `cardId`. Activado → migra de colecção (operação atómica via batch).
- **Mover máquina via dropdown inline:** acção frequente, baixo risco, reverter é trivial. Modal seria fricção excessiva.
- **Equipment Tool v1.0 para project assignments + v2.1 para catálogo:** são camadas diferentes no Procore. v1.0 = "que equipment está afecto a este project". v2.1 = "que equipment a empresa tem". Usar ambas é correcto.
- **Email fictício `@casais.pt` para operadores sem email:** o Procore exige email. Em produção isto seria validado, mas para o projecto académico é aceitável e documentado.
- **Testes Playwright como scripts standalone (não Jest/Vitest):** o utilizador é não-técnico e quer testes "como um humano" — scripts narrativos que abrem dois browsers e comparam visualmente são mais expressivos que asserts unitários.
- **Reset destrutivo com double-confirmation:** dataset é académico, perda zero. Mas o script precisa de salvaguarda contra correr acidentalmente em produção (verificação de `projectId`).

---

## 10. Critérios de "Done"

- [ ] Sprint 0: Firestore tem 0 docs em `machines`, `sessions`, `avarias`, `maintenance`, `obras`, `operators`, `location_cards`. `integrations/procore` (doc) preservado.
- [ ] Sprint 1: 7 máquinas visíveis na PWA com nomes correctos. 7 equipment visíveis no Procore sandbox. 3 cards mostram "Sem RFID".
- [ ] Sprint 2: Botão "Nova Obra" não existe na PWA. Edição de obra Procore só altera `manager`, `description`, `endDate`. Delete desactivado em obras Procore.
- [ ] Sprint 3: Lista de operadores une `operators` + `pending_operators`. Criar operador na PWA cria também no Procore directory.
- [ ] Sprint 4: Dropdown "Mover para obra" em cada máquina. Mover propaga para Procore (associate/dissociate equipment-project).
- [ ] Sprint 5: Smoke test passa em todas as rotas com zero console errors. Demo data realista presente.
- [ ] Todos os screenshots em `_prints/sprintN/` para o relatório académico.

---

**FIM DO PLANO v2.0** — Boa implementação. Se algo correr mal, append a `FINDINGS.md` e segue em frente.

---

## 11. Descobertas de Implementação (actualizado 2026-05-12)

### Estado actual do Firestore (pós-seed)
- `obras/`: 5 docs — `estaleiro` (source: pwa) + 4 do Procore (`procore_326308` sandbox test, `procore_328122` Torre Boavista, `procore_328123` Viaduto IP2, `procore_328124` Urbanização Gaia Norte)
- `machines/`: 7 docs com IDs `mach-cat320`, `mach-komatsu`, `mach-jcb4cx`, `mach-liebherr`, `mach-volvo-a30`, `mach-hamm`, `mach-atlas`
- `operators/`: 5 docs — João Pereira, Manuel Silva, António Costa, Carlos Rodrigues, José Fernandes
- Todos com `rfidReaderId: null` e `cardId: null` — associar depois com leitores físicos

### Procore Equipment API v2.1 — campo correcto é `identification_number`
- O plano diz `equipment_id` mas a API v2.1 usa `identification_number` no body do POST e na resposta.
- `getProcoreEquipmentByCode()` deve procurar `e.identification_number` (não `e.equipment_id`).
- Wipe inactiva equipment mas **não liberta** o `identification_number` — numa segunda seed, o POST 422 é tratado com PATCH ao equipment existente.

### Procore `wipe_procore_sandbox.js` — `/equipment_statuses` não existe no sandbox
- O endpoint `/rest/v2.1/companies/4283171/equipment_statuses` retorna 404.
- Fallback implementado: PATCH com `{ name: '[REMOVIDO] ...' }` em vez de mudar status.
- Se quisermos status inactive real: descobrir o ULID via UI do Procore → hardcode no script.

### `seed_obras.js` — chamar Cloud Function requer Firebase Auth
- `/api/procore/sync` retorna 401 quando chamado de script local sem bearer token.
- Solução: `importProcoreObras(token)` lê o `access_token` do Firestore e chama Procore API directamente.
- Se token expirar (401 do Procore), as obras já existentes no Firestore ficam intactas — sem problema.

### Email dos operadores — decisão final
- Email é campo de **contacto opcional** (não Firebase Auth).
- Procore directory exige email → usar `${slugify(name)}@casais.pt` fictício se vazio.
- `cardId` (RFID) é o identificador de autenticação para operadores na PWA QR flow.
- Firebase Auth: reservado para admin/supervisor — **não configurado ainda** (erros de auth na consola são esperados).

### Scripts de seed criados e testados
- `scripts/reset/wipe_firestore.js` ✅ — confirmar "RESET CASAIS", preserva `integrations/procore`
- `scripts/reset/wipe_procore_sandbox.js` ✅ — inactiva equipment sandbox
- `scripts/reset/seed_machines.js` ✅ — 7/7 Firestore + 7/7 Procore
- `scripts/reset/seed_operators.js` ✅ — 5/5 Firestore
- `scripts/reset/seed_obras.js` ✅ — estaleiro + obras Procore via API directa
- `scripts/tests/_common.js` ✅ — helper Playwright partilhado
- `scripts/tests/sprint0_test.js` ✅ — verifica Firestore vazio + PWA
