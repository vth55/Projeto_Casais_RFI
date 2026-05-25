# IMPLEMENTATION PLAN v2.0 â€” Reset + Procore Bidireccional Total

> **Para quem lÃª isto pela primeira vez:** este ficheiro Ã© o briefing completo para um Claude novo (sem memÃ³ria de sessÃµes anteriores) implementar do zero a refundaÃ§Ã£o Procore-first do projecto Casais Fleet Intelligence. LÃª tudo antes de tocar em cÃ³digo.

---

## 0. Contexto do Projecto

**Casais Fleet Intelligence** â€” PWA industrial de gestÃ£o de frotas para o Grupo Casais (Portugal). Projecto acadÃ©mico (Junho 2025), nÃ­vel enterprise.

- **Stack frontend:** React 19 + Vite + Tailwind + Recharts + Zustand (caminho: `Frontend_App/dashboard`)
- **Stack backend:** Firebase Cloud Functions v2 (Node.js 24) + Firestore (caminho: `Backend_Cloud/functions`)
- **Firebase project:** `casais-rfid`
- **Firestore base path:** `artifacts/casais-rfid/public/data/`
- **Dev local:** `cd Frontend_App/dashboard && npm run dev` â†’ `localhost:5173`
- **Deploy frontend:** dentro de `Frontend_App/dashboard`, `npm run deploy` (build + hosting)
- **Deploy backend:** dentro de `Backend_Cloud`, `firebase deploy --only functions`
- **Utilizador:** nÃ£o-tÃ©cnico, ordens em PT, executa autonomamente. Cor #005EB8 sempre, verde nunca.

### Procore â€” IDs sandbox conhecidas
- Company ID: `4283171` (Dev Sandbox â€” **nunca apontar para produÃ§Ã£o**)
- Project principal: `328122` â€” "Torre Boavista Porto"
- Equipment API endpoint: `POST/PATCH /rest/v2.1/companies/4283171/equipment_register`
- Campos obrigatÃ³rios POST equipment: `name`, `equipment_id`, `status_id`, `category_id`, `type_id`, `ownership`
- ULIDs:
  - `status_id` Active: `01KPRV693GQFM6FCM77D59YKFT`
  - `category_id` Terraplanagem: `01KQCGF5S8GME0ZQNGKXPS9WN8`
  - `type_id` Escavadora: `01KQCGFKFZK4P5H84XG98SYPM6`
- OAuth access token: Firestore em `integrations/procore.accessToken` (refresh via `getValidAccessToken()` em `procoreBridge.js`)

---

## 1. Objectivo da v2.0

Limpar 100 % do Firestore e reconstruir um catÃ¡logo coerente com:

1. **7 mÃ¡quinas** (4 com RFID reader real, 3 sem)
2. **5â€“6 obras** (1 espelha Torre Boavista no Procore; restantes sÃ³ PWA, e o utilizador pode editar mas **nÃ£o criar obras** pela PWA)
3. **8â€“10 operadores** misturando criados na PWA (com RFID) e provenientes do Procore directory (sem RFID â€” `pending_operators`)
4. Tudo sincronizado em ambas as direcÃ§Ãµes com o Procore sandbox
5. Cada sprint validado por testes Playwright end-to-end (PWA + Procore web)

---

## 2. Schema Firestore â€” ANTES vs DEPOIS

### 2.1 ANTES (estado actual sujo)

```
artifacts/casais-rfid/public/data/
â”œâ”€â”€ machines/         â† muitas mÃ¡quinas de teste, sessÃµes agregadas inconsistentes
â”œâ”€â”€ operators/        â† operadores com cardIds duplicados
â”œâ”€â”€ obras/            â† obras criadas pela PWA + obras Procore misturadas
â”œâ”€â”€ sessions/         â† sessÃµes antigas (algumas Ã³rfÃ£s)
â”œâ”€â”€ avarias/          â† reportes acumulados de QA
â”œâ”€â”€ maintenance/      â† histÃ³rico de manutenÃ§Ãµes de teste
â”œâ”€â”€ maintenance_schedules/
â”œâ”€â”€ location_cards/   â† cartÃµes de localizaÃ§Ã£o RFID
â”œâ”€â”€ pending_operators/ â† do projector Procore
â”œâ”€â”€ integrations/
â”‚   â”œâ”€â”€ procore (doc: accessToken, refreshToken, categoryMap, ...)
â”‚   â””â”€â”€ procore/
â”‚       â”œâ”€â”€ projects/    â† mirror read-only
â”‚       â”œâ”€â”€ directory/   â† mirror read-only
â”‚       â””â”€â”€ equipment/   â† mirror read-only
â””â”€â”€ settings/system
```

### 2.2 DEPOIS (estado limpo, pÃ³s-reset)

```
artifacts/casais-rfid/public/data/
â”œâ”€â”€ machines/             â† 7 docs (4 com rfidReaderId, 3 com rfidReaderId: null)
â”œâ”€â”€ operators/            â† 4â€“6 operadores criados na PWA (com cardId)
â”œâ”€â”€ pending_operators/    â† 3â€“4 do directory Procore (sem cardId)
â”œâ”€â”€ obras/                â† 5â€“6 obras (1 com source: 'procore', restantes source: 'pwa')
â”œâ”€â”€ location_cards/       â† 2â€“3 cartÃµes de localizaÃ§Ã£o
â”œâ”€â”€ settings/system       â† preservado (fuelPricePerLitre, co2FactorPerLitre, defaultMaintenanceInterval)
â”œâ”€â”€ integrations/
â”‚   â”œâ”€â”€ procore (doc)     â† preservado (OAuth tokens, categoryMap)
â”‚   â””â”€â”€ procore/
â”‚       â”œâ”€â”€ projects/     â† repovoado por runFullSync
â”‚       â”œâ”€â”€ directory/    â† repovoado por runFullSync
â”‚       â””â”€â”€ equipment/    â† repovoado por runFullSync
â””â”€â”€ (APAGADAS) sessions, avarias, maintenance, maintenance_schedules
```

### 2.3 Schema dos documentos

**`machines/{id}`** (com convenÃ§Ã£o PWA actual)
```js
{
  id: 'mach-001',                        // immutable
  name: 'Escavadora CAT 320',
  category: 'escavadora',
  status: 'idle' | 'active' | 'maintenance',
  location: { workId: 'obra-xxx' } | 'estaleiro',
  obraId: 'obra-xxx' | 'estaleiro',     // espelhado para queries simples
  rfidReaderId: 'reader-01' | null,     // â† NOVO: null para mÃ¡quinas sem reader
  procoreEquipmentId: '01KP...' | null,
  source: 'procore' | 'pwa',
  pairingStatus: 'paired' | 'unpaired',
  totalHours: 0,                        // resetado
  partialHours: 0,                      // desde Ãºltima manutenÃ§Ã£o
  maintenanceInterval: 150,
  co2Factor: 2.68,
  tariffHistory: [                      // â† APPEND-ONLY, NUNCA APAGAR
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
  manager: 'JoÃ£o Silva',                // PWA-only field
  description: '...',                   // PWA-only field
  endDate: '2026-12-31',                // PWA-only field
  source: 'procore' | 'pwa',            // â† KEY: define se Ã© editÃ¡vel/eliminÃ¡vel
  procoreProjectId: '328122' | null,
  createdAt: serverTimestamp(),
}
```

**`operators/{id}`**
```js
{
  id: 'op-001',
  name: 'Carlos Mendes',
  cardId: 'RFID-A1B2C3',                // Ãºnico; sÃ³ presente em operadores activados
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

**`pending_operators/{procoreUserId}`** â€” vindos do directory Procore sem RFID
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

## 3. Regras InviolÃ¡veis

- `sessions.tariffSnapshot` e `sessions.costs` â€” NUNCA alterar apÃ³s fecho de sessÃ£o (no reset, apagar a colecÃ§Ã£o toda Ã© OK; mas apÃ³s o reset, sessÃµes fechadas sÃ£o imutÃ¡veis).
- `machines.tariffHistory[]` â€” APPEND-ONLY. Nunca apagar entradas â€” sÃ³ adicionar novas.
- Cor #005EB8 sempre. Verde nunca (Casais brand).
- Firebase Auth nÃ£o estÃ¡ configurado â†’ ignorar erros de auth na consola.
- **NÃ£o tocar em `integrations/procore` (doc)** durante o reset â€” perde-se o OAuth token e fica-se bloqueado.

---

## 4. Sprints

### Sprint 0 â€” Reset Total do Firestore

**Objectivo:** apagar TUDO excepto os documentos de configuraÃ§Ã£o que se quer manter.

**Ficheiros:**
- `scripts/reset/wipe_firestore.js` (novo)
- `scripts/reset/seed_clean_dataset.js` (novo)

**ColecÃ§Ãµes a APAGAR (recursivamente, batch de 500):**
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
- `artifacts/casais-rfid/public/data/settings/system` (parÃ¢metros operacionais)
- `artifacts/casais-rfid/public/data/integrations/procore` (doc raiz â€” OAuth tokens)
- `artifacts/casais-rfid/public/data/users/*` (auth â€” se existir)

**Script:** usa `firebase-admin` SDK; lÃª service-account credentials a partir de `Backend_Cloud/.serviceAccount.json` (gitignored). Itera por colecÃ§Ã£o, faz `.get()`, `batch.delete()` em chunks de 500, commit. Verbose log linha-a-linha.

**VerificaÃ§Ãµes de seguranÃ§a:**
- ConfirmaÃ§Ã£o interactiva no terminal (`Type 'RESET CASAIS' to proceed`).
- Verifica `projectId === 'casais-rfid'` antes de qualquer escrita.
- Imprime checklist do que vai apagar e do que vai preservar antes de pedir confirmaÃ§Ã£o.

**Procore sandbox â€” limpeza paralela:**
ApÃ³s o wipe Firestore, executar `scripts/reset/wipe_procore_sandbox.js`:
- Lista todos os equipment_register em `companies/4283171` e faz `PATCH status_id` para "inactive" (nÃ£o hÃ¡ DELETE no v2.1).
- Lista todos os projects (excepto 328122 Torre Boavista) e marca `active: false`.
- NÃ£o toca em users/directory (Procore nÃ£o suporta delete via API; alguns ficarÃ£o pending).

**Teste Playwright `scripts/tests/sprint0_test.js`:**
1. LÃª via Firebase Admin `machines.get()` â†’ assert `count === 0`.
2. LÃª `sessions.get()` â†’ assert `count === 0`.
3. Abre PWA `localhost:5173/maquinas` com Playwright â†’ assert "Nenhuma mÃ¡quina" empty state visÃ­vel.
4. Screenshot guardado em `_prints/sprint0/`.

---

### Sprint 1 â€” Seed das 7 mÃ¡quinas + sync para Procore

**Objectivo:** criar 7 mÃ¡quinas no Firestore e propagar para o Procore sandbox como equipment_register.

**Dataset (`scripts/reset/seed_machines.json`):**
```json
[
  { "id": "mach-cat320",   "name": "Escavadora CAT 320",    "category": "escavadora",   "rfidReaderId": "reader-01", "obraId": "estaleiro" },
  { "id": "mach-jcb3cx",   "name": "Retroescavadora JCB 3CX","category": "retroescavadora","rfidReaderId": "reader-02", "obraId": "estaleiro" },
  { "id": "mach-bobcat",   "name": "Mini-PÃ¡ Bobcat S570",   "category": "minipa",       "rfidReaderId": "reader-03", "obraId": "estaleiro" },
  { "id": "mach-grua-lieb","name": "Grua Liebherr 132 EC-H","category": "grua",         "rfidReaderId": "reader-04", "obraId": "estaleiro" },
  { "id": "mach-dumper",   "name": "Dumper Thwaites 9T",    "category": "dumper",       "rfidReaderId": null,        "obraId": "estaleiro" },
  { "id": "mach-cilindro", "name": "Cilindro Bomag BW 213", "category": "compactador",  "rfidReaderId": null,        "obraId": "estaleiro" },
  { "id": "mach-gerador",  "name": "Gerador Atlas Copco 60kVA","category": "gerador",   "rfidReaderId": null,        "obraId": "estaleiro" }
]
```

**Fluxo do seed:**
1. Para cada mÃ¡quina, escrever em `artifacts/casais-rfid/public/data/machines/{id}` com schema completo (totalHours: 0, partialHours: 0, source: 'pwa', pairingStatus: 'unpaired', tariffHistory: [tarifa inicial]).
2. Chamar `POST /api/procore/equipment-create` (jÃ¡ existe em `procoreBridge.js`) para cada uma, com:
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
// 5. Procore: jÃ¡ estÃ¡s autenticado via storage_state.json
await page.goto('https://sandbox.procore.com/4283171/company/equipment-register');
await page.waitForSelector('table');
const procoreRows = await page.locator('table tbody tr').allTextContents();
assert.equal(procoreRows.length, 7);
await page.screenshot({ path: '_prints/sprint1/procore_equipment.png' });
```
> Nota: para o Playwright entrar no Procore sandbox, usar `storage_state.json` gerado uma Ãºnica vez com login manual e guardado fora do git (`scripts/tests/.procore_state.json` gitignored).

---

### Sprint 2 â€” Obras: editar PWA, criar sÃ³ no Procore

**Objectivo:** remover criaÃ§Ã£o de obras na PWA, adicionar badge "Gerida no Procore", bloquear delete em obras Procore.

**MudanÃ§as em `Frontend_App/dashboard/src/views/ObrasView.jsx`:**

1. **Apagar:** botÃ£o `<Plus />` "Nova Obra" do header. Remover handler `onCreateObra`.
2. **Apagar:** formulÃ¡rio de criaÃ§Ã£o. Manter sÃ³ o formulÃ¡rio de **ediÃ§Ã£o** com 3 campos:
   - `manager` (input text)
   - `description` (textarea)
   - `endDate` (date picker)
   - Todos os outros campos vÃªm do Procore e sÃ£o **read-only** (mostrados em cinza).
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
   <Button disabled={obra.source === 'procore'} title={obra.source === 'procore' ? 'Esta obra sÃ³ pode ser apagada no Procore' : 'Apagar obra'}>
     <Trash2 />
   </Button>
   ```
5. **Adicionar:** ao guardar a ediÃ§Ã£o, `updateDoc` sÃ³ patches `{ manager, description, endDate }` â€” nunca toca em campos sincronizados do Procore.

**Seed de obras (`scripts/reset/seed_obras.json`):**
- Obra 1: criada manualmente no Procore sandbox (Torre Boavista, jÃ¡ existe â€” ID `328122`) â†’ vem via `runFullSync` com `source: 'procore'`.
- Obras 2â€“6: criadas manualmente no Procore sandbox via UI (5 minutos de trabalho do utilizador), todas com nomes Casais reais.
- O seed sÃ³ faz: aguardar `runFullSync`, depois adicionar campos PWA-only (`manager`, `description`, `endDate`) via `updateDoc`.

**Teste Playwright `scripts/tests/sprint2_test.js`:**
1. PWA `/obras`: verificar que **nÃ£o existe** botÃ£o "Nova Obra".
2. Click numa obra Procore â†’ form abre â†’ 3 inputs editÃ¡veis, restantes disabled.
3. Click no `Trash2` â†’ assert `disabled === true`.
4. Procore web: verificar nomes das obras coincidem.
5. Screenshots.

---

### Sprint 3 â€” Operadores bidireccional PWA â†” Procore directory

**Objectivo:** lista unificada PWA mostra `operators/` + `pending_operators/`. Criar operador na PWA cria tambÃ©m no directory Procore.

**MudanÃ§as em `Frontend_App/dashboard/src/views/OperadoresView.jsx`:**

1. Fundir as duas listas (jÃ¡ existe parcialmente â€” verificar):
   ```js
   const allOperators = useMemo(() => [
     ...operators.map(o => ({ ...o, isPending: false })),
     ...pendingOperators.map(o => ({ ...o, isPending: true })),
   ], [operators, pendingOperators]);
   ```
2. Badge "Sem RFID â€” vindo do Procore" para `isPending === true`.
3. BotÃ£o "Activar RFID" nos pending â†’ abre modal pequeno: scan RFID + click confirma â†’ move documento de `pending_operators/{id}` para `operators/{newId}` com campos consolidados.

**Backend â€” `Backend_Cloud/functions/procore/procoreBridge.js`:**

Adicionar nova rota `POST /api/procore/directory-create`:
```js
// Endpoint Procore: POST /rest/v1.0/companies/{company_id}/users
// Payload mÃ­nimo:
//   { user: { first_name, last_name, email_address, is_employee: true } }
// Retorna { id } â†’ guardar como procoreUserId no operador local.
```

**Fluxo de criaÃ§Ã£o de operador na PWA:**
1. User clica "Novo Operador" â†’ preenche form (name, cardId, email opcional, role).
2. Se email vazio â†’ gerar `email = ${slugify(name)}@casais.pt` (fictÃ­cio).
3. PWA chama Cloud Function `createOperatorWithProcoreSync` â†’ escreve `operators/{newId}` + `POST /api/procore/directory-create`.
4. Resposta inclui `procoreUserId` â†’ patch local com esse ID + `source: 'pwa'`.

**Tratamento de erros:**
- Se Procore POST falha (sandbox bug, rate limit) â†’ operador fica criado localmente com `procoreUserId: null` e `syncStatus: 'pending'`. Job nightly tenta de novo.

**Teste Playwright `scripts/tests/sprint3_test.js`:**
1. PWA `/operadores`: verificar contagem inicial (vinda de seed).
2. Click "Novo Operador" â†’ preencher "JoÃ£o Teste" + cardId fictÃ­cio.
3. Submit â†’ aguardar toast de sucesso.
4. Refresh â†’ operador aparece com badge "Sincronizado com Procore".
5. Procore web `/4283171/company/directory` â†’ procurar "JoÃ£o Teste" â†’ assert existe.
6. Screenshots.

---

### Sprint 4 â€” Mover mÃ¡quinas entre obras (com sync Procore)

**Objectivo:** dropdown inline em cada `MachineCard` para mover mÃ¡quina para outra obra (ou para estaleiro). Sync bidireccional com Procore.

**Pergunta do Opus â€” qual endpoint Procore usar:**

HÃ¡ dois caminhos possÃ­veis:

| OpÃ§Ã£o | Endpoint | Vantagens | Desvantagens |
|-------|----------|-----------|--------------|
| A | `POST/DELETE /rest/v1.0/projects/{project_id}/equipment` com body `{ equipment: { equipment_id } }` | JÃ¡ existe em `procoreBridge.js` (`associateEquipmentToProject` / `removeEquipmentFromProject`). Ã‰ a API v1.0 oficial de Equipment Tool. | Equipment Tool v1.0 estÃ¡ deprecated; sandbox Ã s vezes devolve 404. |
| B | `PATCH /rest/v2.1/companies/4283171/equipment_register/{id}` com `{ project_id: <novo> }` | API moderna, mesma usada para criar equipment. AtÃ³mica (um Ãºnico call). | NÃ£o estÃ¡ documentado se `project_id` no register equivale a associaÃ§Ã£o ao project tool â€” pode ser apenas metadata. |

**DecisÃ£o recomendada:** **usar OpÃ§Ã£o A (v1.0 equipment_project_assignments via `/projects/{id}/equipment`) como primÃ¡rio**, com **fallback gracioso** (jÃ¡ implementado â€” retorna `false` em vez de throw). A v2.1 `equipment_register` Ã© catÃ¡logo da empresa; a v1.0 Ã© assignment a project. Conceptualmente sÃ£o camadas diferentes. Para mover:
1. `removeEquipmentFromProject(procoreEquipmentId, oldProjectId)` â€” se a antiga obra tem `procoreProjectId`.
2. `associateEquipmentToProject(procoreEquipmentId, newProjectId)` â€” se a nova obra tem `procoreProjectId`.
3. Se a nova "obra" Ã© `estaleiro` â†’ sÃ³ remove da antiga, nÃ£o associa a nada.
4. Em paralelo, fazer tambÃ©m `PATCH equipment_register` com headers `Procore-Company-Id` para actualizar metadata cache (best effort, ignorar erros).

**UI â€” `MaquinasView.jsx`:**

Adicionar na card da mÃ¡quina, ao lado do badge de obra:
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

DecisÃ£o UX: **dropdown inline** (nÃ£o drawer/modal). JustificaÃ§Ã£o:
- AcÃ§Ã£o frequente e de baixo risco (pode-se reverter trivialmente).
- 5 obras â†’ dropdown cabe sem scroll.
- Modal seria fricÃ§Ã£o desnecessÃ¡ria.
- ConfirmaÃ§Ã£o inline (toast "Movido para X â€” desfazer?") em vez de modal de confirmaÃ§Ã£o.

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

**Backend â€” adicionar rota em `procoreBridge.js`:**
```js
// action === 'move-equipment'
const { procoreEquipmentId, fromProjectId, toProjectId } = req.body;
if (fromProjectId) await removeEquipmentFromProject(procoreEquipmentId, fromProjectId);
if (toProjectId) await associateEquipmentToProject(procoreEquipmentId, toProjectId);
return res.json({ ok: true });
```

**Teste Playwright `scripts/tests/sprint4_test.js`:**
1. PWA `/maquinas`: localizar "Escavadora CAT 320" (actualmente em estaleiro).
2. Click no dropdown â†’ seleccionar "Torre Boavista Porto".
3. Aguardar toast.
4. Refresh â†’ assert card mostra badge "Torre Boavista Porto".
5. Procore web `/4283171/projects/328122/equipment` â†’ assert escavadora aparece na lista.
6. Mover de volta para "Estaleiro" â†’ verificar que sai do project Procore.
7. Screenshots de cada passo.

---

### Sprint 5 â€” Hardening + dados de demonstraÃ§Ã£o

**Objectivo:** verificar que todos os fluxos funcionam ponta-a-ponta e gerar dados realistas para demo acadÃ©mica.

**AcÃ§Ãµes:**
1. Criar 3â€“5 sessÃµes manuais para cada mÃ¡quina (script `scripts/reset/seed_sessions.js`) â€” apenas para a demo, todas com `status: 'CLOSED'`, `tariffSnapshot` consolidado.
2. Criar 1â€“2 avarias de exemplo.
3. Re-correr `runFullSync` final.
4. Smoke test completo: navegar todas as views da PWA com Playwright e verificar zero erros na consola.

**Teste Playwright `scripts/tests/sprint5_smoke.js`:**
- Itera por todas as rotas: `/`, `/maquinas`, `/obras`, `/operadores`, `/manutencao`, `/financeiro`, `/analises`, `/configuracoes`.
- Em cada rota: aguarda load, screenshot, captura `console.errors` (deve estar vazio).
- Reporta resultado tabular.

---

## 5. Testes Playwright â€” Setup Comum

**LocalizaÃ§Ã£o:** `scripts/tests/*.js`
**Runner:** `node scripts/tests/sprintN_test.js` (cada ficheiro Ã© um script Node executÃ¡vel standalone).

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

**PadrÃ£o de cada teste:**
```js
const { launchBrowsers } = require('./_common');
(async () => {
  const { browser, pwa, procore } = await launchBrowsers();
  try {
    // ... asserts
    console.log('âœ“ Sprint N passou');
  } catch (e) {
    console.error('âœ— Sprint N falhou:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
```

---

## 6. Ficheiros que vÃ£o ser tocados (resumo)

### Frontend
- `Frontend_App/dashboard/src/views/ObrasView.jsx` â€” remover criaÃ§Ã£o, adicionar badge Procore, desactivar delete
- `Frontend_App/dashboard/src/views/OperadoresView.jsx` â€” lista unificada, criar com sync Procore
- `Frontend_App/dashboard/src/views/MaquinasView.jsx` â€” dropdown mover entre obras, badge "Sem RFID"
- `Frontend_App/dashboard/src/store/useStore.js` â€” listener para `pending_operators`, helper `moveMachine`
- `Frontend_App/dashboard/src/store/useStore.js` â€” listener para `pending_operators` (adicionar)

### Backend
- `Backend_Cloud/functions/procore/procoreBridge.js` â€” novas rotas `directory-create`, `move-equipment`
- `Backend_Cloud/functions/index.js` â€” wrap rota `createOperatorWithProcoreSync` se preferido como callable

### Scripts (novos)
- `scripts/reset/wipe_firestore.js`
- `scripts/reset/wipe_procore_sandbox.js`
- `scripts/reset/seed_machines.json`
- `scripts/reset/seed_machines.js`
- `scripts/reset/seed_obras.js` (sÃ³ patches PWA-only fields)
- `scripts/reset/seed_operators.js`
- `scripts/reset/seed_sessions.js` (demo data)
- `scripts/tests/_common.js`
- `scripts/tests/_generate_procore_state.js`
- `scripts/tests/sprint0_test.js` ... `sprint5_smoke.js`

---

## 7. O que NÃƒO fazer

1. **NÃ£o apagar `integrations/procore` (doc raiz)** â€” perde OAuth.
2. **NÃ£o apagar `tariffHistory` de mÃ¡quinas** â€” append-only, regra inviolÃ¡vel (no reset apaga-se a colecÃ§Ã£o inteira, OK; mas pÃ³s-reset nunca).
3. **NÃ£o criar obras pela PWA** â€” Procore Ã© fonte de verdade para obras.
4. **NÃ£o inventar IDs Procore** â€” usar sempre os ULIDs reais da sandbox listados na secÃ§Ã£o 0.
5. **NÃ£o usar `cd` em comandos** â€” usar paths absolutos (regra do projecto).
6. **NÃ£o fazer deploy sem testes Playwright passar.**
7. **NÃ£o tocar em sessÃµes fechadas (`status: 'CLOSED'`) apÃ³s criadas** â€” `tariffSnapshot` e `costs` imutÃ¡veis.
8. **NÃ£o apontar para produÃ§Ã£o Procore** â€” sempre Dev Sandbox (`4283171`).
9. **NÃ£o usar verde nas badges/UI** â€” sÃ³ #005EB8 e variantes neutras.

---

## 8. Ordem de execuÃ§Ã£o recomendada (para o Claude implementador)

1. Ler este ficheiro inteiro.
2. Ler `.claude/memory/project/architecture.md` (schema Firestore detalhado) e `.claude/memory/project/procore.md` (IDs, OAuth).
3. Ler `FINDINGS.md` (quirks conhecidos do Procore sandbox).
4. **Sprint 0** â€” escrever wipe scripts, correr, validar com `sprint0_test.js`.
5. **Sprint 1** â€” seed mÃ¡quinas, validar com `sprint1_test.js`.
6. **Sprint 2** â€” refactor `ObrasView`, seed obras, validar com `sprint2_test.js`.
7. **Sprint 3** â€” operadores bidireccionais, validar com `sprint3_test.js`.
8. **Sprint 4** â€” mover mÃ¡quinas, validar com `sprint4_test.js`.
9. **Sprint 5** â€” demo data + smoke test.
10. Update `FINDINGS.md` com aprendizagens.
11. `/wrap-up` para fechar sessÃ£o.

---

## 9. DecisÃµes de arquitectura e porquÃª

- **Procore Ã© fonte de verdade para obras:** o cliente Casais jÃ¡ usa Procore para gestÃ£o de projectos; duplicar criaÃ§Ã£o na PWA seria inconsistÃªncia garantida. PWA sÃ³ adiciona metadata operacional (manager, description, endDate).
- **Operadores em duas colecÃ§Ãµes (`operators` + `pending_operators`):** evita schema hÃ­brido confuso. Pending tem `procoreUserId` mas nunca `cardId`. Activado â†’ migra de colecÃ§Ã£o (operaÃ§Ã£o atÃ³mica via batch).
- **Mover mÃ¡quina via dropdown inline:** acÃ§Ã£o frequente, baixo risco, reverter Ã© trivial. Modal seria fricÃ§Ã£o excessiva.
- **Equipment Tool v1.0 para project assignments + v2.1 para catÃ¡logo:** sÃ£o camadas diferentes no Procore. v1.0 = "que equipment estÃ¡ afecto a este project". v2.1 = "que equipment a empresa tem". Usar ambas Ã© correcto.
- **Email fictÃ­cio `@casais.pt` para operadores sem email:** o Procore exige email. Em produÃ§Ã£o isto seria validado, mas para o projecto acadÃ©mico Ã© aceitÃ¡vel e documentado.
- **Testes Playwright como scripts standalone (nÃ£o Jest/Vitest):** o utilizador Ã© nÃ£o-tÃ©cnico e quer testes "como um humano" â€” scripts narrativos que abrem dois browsers e comparam visualmente sÃ£o mais expressivos que asserts unitÃ¡rios.
- **Reset destrutivo com double-confirmation:** dataset Ã© acadÃ©mico, perda zero. Mas o script precisa de salvaguarda contra correr acidentalmente em produÃ§Ã£o (verificaÃ§Ã£o de `projectId`).

---

## 10. CritÃ©rios de "Done"

- [ ] Sprint 0: Firestore tem 0 docs em `machines`, `sessions`, `avarias`, `maintenance`, `obras`, `operators`, `location_cards`. `integrations/procore` (doc) preservado.
- [ ] Sprint 1: 7 mÃ¡quinas visÃ­veis na PWA com nomes correctos. 7 equipment visÃ­veis no Procore sandbox. 3 cards mostram "Sem RFID".
- [ ] Sprint 2: BotÃ£o "Nova Obra" nÃ£o existe na PWA. EdiÃ§Ã£o de obra Procore sÃ³ altera `manager`, `description`, `endDate`. Delete desactivado em obras Procore.
- [ ] Sprint 3: Lista de operadores une `operators` + `pending_operators`. Criar operador na PWA cria tambÃ©m no Procore directory.
- [ ] Sprint 4: Dropdown "Mover para obra" em cada mÃ¡quina. Mover propaga para Procore (associate/dissociate equipment-project).
- [ ] Sprint 5: Smoke test passa em todas as rotas com zero console errors. Demo data realista presente.
- [ ] Todos os screenshots em `_prints/sprintN/` para o relatÃ³rio acadÃ©mico.

---

**FIM DO PLANO v2.0** â€” Boa implementaÃ§Ã£o. Se algo correr mal, append a `FINDINGS.md` e segue em frente.

---

## 11. Descobertas de ImplementaÃ§Ã£o (actualizado 2026-05-12)

### Estado actual do Firestore (pÃ³s-seed)
- `obras/`: 5 docs â€” `estaleiro` (source: pwa) + 4 do Procore (`procore_326308` sandbox test, `procore_328122` Torre Boavista, `procore_328123` Viaduto IP2, `procore_328124` UrbanizaÃ§Ã£o Gaia Norte)
- `machines/`: 7 docs com IDs `mach-cat320`, `mach-komatsu`, `mach-jcb4cx`, `mach-liebherr`, `mach-volvo-a30`, `mach-hamm`, `mach-atlas`
- `operators/`: 5 docs â€” JoÃ£o Pereira, Manuel Silva, AntÃ³nio Costa, Carlos Rodrigues, JosÃ© Fernandes
- Todos com `rfidReaderId: null` e `cardId: null` â€” associar depois com leitores fÃ­sicos

### Procore Equipment API v2.1 â€” campo correcto Ã© `identification_number`
- O plano diz `equipment_id` mas a API v2.1 usa `identification_number` no body do POST e na resposta.
- `getProcoreEquipmentByCode()` deve procurar `e.identification_number` (nÃ£o `e.equipment_id`).
- Wipe inactiva equipment mas **nÃ£o liberta** o `identification_number` â€” numa segunda seed, o POST 422 Ã© tratado com PATCH ao equipment existente.

### Procore `wipe_procore_sandbox.js` â€” `/equipment_statuses` nÃ£o existe no sandbox
- O endpoint `/rest/v2.1/companies/4283171/equipment_statuses` retorna 404.
- Fallback implementado: PATCH com `{ name: '[REMOVIDO] ...' }` em vez de mudar status.
- Se quisermos status inactive real: descobrir o ULID via UI do Procore â†’ hardcode no script.

### `seed_obras.js` â€” chamar Cloud Function requer Firebase Auth
- `/api/procore/sync` retorna 401 quando chamado de script local sem bearer token.
- SoluÃ§Ã£o: `importProcoreObras(token)` lÃª o `access_token` do Firestore e chama Procore API directamente.
- Se token expirar (401 do Procore), as obras jÃ¡ existentes no Firestore ficam intactas â€” sem problema.

### Email dos operadores â€” decisÃ£o final
- Email Ã© campo de **contacto opcional** (nÃ£o Firebase Auth).
- Procore directory exige email â†’ usar `${slugify(name)}@casais.pt` fictÃ­cio se vazio.
- `cardId` (RFID) Ã© o identificador de autenticaÃ§Ã£o para operadores na PWA QR flow.
- Firebase Auth: reservado para admin/supervisor â€” **nÃ£o configurado ainda** (erros de auth na consola sÃ£o esperados).

### Scripts de seed criados e testados
- `scripts/reset/wipe_firestore.js` âœ… â€” confirmar "RESET CASAIS", preserva `integrations/procore`
- `scripts/reset/wipe_procore_sandbox.js` âœ… â€” inactiva equipment sandbox
- `scripts/reset/seed_machines.js` âœ… â€” 7/7 Firestore + 7/7 Procore
- `scripts/reset/seed_operators.js` âœ… â€” 5/5 Firestore
- `scripts/reset/seed_obras.js` âœ… â€” estaleiro + obras Procore via API directa
- `scripts/tests/_common.js` âœ… â€” helper Playwright partilhado
- `scripts/tests/sprint0_test.js` âœ… â€” verifica Firestore vazio + PWA
