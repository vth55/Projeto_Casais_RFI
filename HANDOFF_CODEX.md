# HANDOFF — Briefing para próxima IA (Codex/ChatGPT/etc.)

> Documento de transferência de contexto após reunião decisiva com o director de estaleiro Casais (2026-05-25). O projecto sofreu um pivô de 180 graus. Este ficheiro é a fonte de verdade do **porquê** e do **estado actual** — leia antes de qualquer alteração de scope ou arquitectura.

---

## 0. TL;DR — em 90 segundos

- **O que era:** Sistema de tracking RFID de máquinas grandes (escavadoras, dumpers, etc.) com leitores fixos, sessões automáticas, integração Procore.
- **O que ficou obsoleto:** Tudo o que envolve máquinas grandes. A Casais **já tem sistema melhor** via CAN bus que faz exactamente o mesmo, em tempo real, com dados reais do motor.
- **O que sobreviveu:** A infraestrutura (PWA, Firebase, Procore), o conceito de sessões check-in/check-out, e o trabalho de UI.
- **O novo foco:** **Ferramentas pequenas** (martelos pneumáticos, compactadores, geradores pequenos, berbequins) que **hoje são preenchidas à mão no SAP**. Worker encosta telemóvel à tag NFC da ferramenta → registo automático no Firestore → propaga para SAP e Procore.
- **O diferencial técnico:** **Zero introdução manual de dados**. O director foi explícito: "se o funcionário tiver de fazer alguma coisa manual, não vai fazer."
- **Deadline:** **16 de Junho 2026** entrega do link (apresentação real é depois — há margem para continuar).

---

## 1. Contexto da reunião

### 1.1 O que o director (estaleiro Casais) revelou

Foi a primeira reunião em que houve alinhamento real de requisitos:

1. **Frota grande já tem solução**: CAN bus instalado nas máquinas grandes dá-lhes telemetria, localização, horas de operação, consumos. Tudo o que o projecto antigo prometia eles já têm — e em tempo real, com dados directos da máquina, não de uma tag externa.
2. **Não há nenhum dado novo que possamos oferecer-lhes** sobre máquinas grandes.
3. **A dor real está nas ferramentas pequenas**:
   - Não estão actualmente trackeadas
   - Preenchidas à mão em SAP (origem, destino, funcionário, horas)
   - Perdem-se, ficam em obras erradas, demoram a localizar
   - Exemplo dado: martelo pneumático
4. **Requisitos não-negociáveis**:
   - Sem duplicação de ambientes — tem de fluir para SAP e Procore que eles já usam
   - **Funcionário não vai fazer nada manualmente** — qualquer coisa que dependa de o trabalhador "lembrar-se de abrir a app" está morta à partida
   - Os campos críticos no SAP: **remetente (origem)**, **destino**, **funcionário** (quem fez o movimento e quem usa)
5. **Sugestões do director sobre como tornar automático**:
   - RFID nos capacetes + leitores nas portas do armazém
   - Geofencing: sair da zona do armazém → assumir "a trabalhar"
   - Múltiplas portas com leitores fixos
6. **"Mesmos dados" das máquinas grandes**: útil mas **não obrigatório**. Se conseguirmos extrair utilização %, horas por obra, custo por projecto, melhor.

### 1.2 Estratégia de entrega

- **16 de Junho**: entregar link da PWA (júri vai validar acesso)
- **Apresentação real**: vários meses depois
- **Implicação**: temos margem para continuar a trabalhar **depois** do dia 16, mas o link tem de funcionar e mostrar protótipo concreto

---

## 2. Decisões já tomadas (com racional)

### 2.1 Pivô conceptual

| O quê | Decisão | Racional |
|---|---|---|
| Terminologia | "Máquinas" → **"Equipamentos"** em toda a UI | Engloba ferramentas, pequena maquinaria, etc. |
| Sidebar | "Estaleiro" → **"Armazém"** | Reflecte o novo contexto |
| Modelo de dados | Nova colecção `tools` + `tool_sessions` (não tocar nas existentes `machines`/`sessions`) | Aditivo, sem quebrar nada |
| Hardware RFID | Mantido como referência mas **fora do critical path** | Pode voltar como roadmap (capacetes), não bloqueia |
| Arduino | Mantido para programar/registar tags se necessário, mas opcional | Workflow real vai ser via PWA |
| Métrica CO₂/combustível | **Mantida**, aplicada selectivamente | Martelo pneumático usa ar comprimido → consumo indirecto existe |

### 2.2 Fluxo NFC: Deep Link via URL

**Decidimos abandonar o Wake Lock + Web NFC sempre-on**. Em vez disso:

1. Cada ferramenta tem tag NFC **passiva** programada com URL: `https://casais-rfid.web.app/t/{TAG_ID}`
2. Trabalhador encosta telemóvel → Android lê tag → abre URL
3. Página `/t/:tagId` (existe em `Frontend_App/dashboard/src/pages/ToolTagPage.jsx`) procura tool no Firestore por `nfcTagId`
4. Se trabalhador estiver logado: mostra tela de confirmação com auto-confirm em 4 segundos
5. Se não estiver logado: redirecciona para login

**Vantagens vs Web NFC sempre activo:**
- Não drena bateria (sem Wake Lock)
- Funciona com ecrã bloqueado (na maior parte dos Androids)
- Não precisa de a app estar aberta

**Limitação:**
- Browser mostra popup "Abrir em Chrome?" no primeiro toque (resolvido com Capacitor APK)

### 2.3 Capacitor APK em vez de pura PWA

**Razão:** o director quer "tudo o mais automático possível". O popup "Abrir em Chrome?" mata isso, mesmo que seja só uma vez por device.

**Decisão:** envolver a PWA num APK Capacitor que regista intent filter para `https://casais-rfid.web.app/t/*`. Resultado: tap na tag → APK abre directamente, sem popup.

**Build infra:**
- GitHub Actions workflow `.github/workflows/build-apk.yml` constrói o APK na cloud (sem necessitar Android Studio local)
- Pasta `Frontend_App/dashboard/android/` foi criada via `npx cap add android` e está committed
- AppId: `pt.casais.fleet`
- `capacitor.config.json` tem `webDir: "dist"` (build do Vite via flag `--outDir dist`)
- `package.json` tem script `build:android` (`vite build --outDir dist --emptyOutDir`)
- AndroidManifest.xml inclui:
  - Intent filter Deep Link para `https://casais-rfid.web.app/t/*` com `autoVerify="true"`
  - Intent filter `NDEF_DISCOVERED` para mesmo URL pattern
  - Permissão `android.permission.NFC`
  - Uses-feature NFC opcional

**Bundle vs Live URL:**
Decidimos **bundle do web app dentro do APK** (não carregar `casais-rfid.web.app` em runtime). Razão: robustez offline. Implicação: cada mudança no código React requer novo APK. GitHub Actions automatiza isto, mas o trabalhador precisa de reinstalar manualmente.

### 2.4 PWA continua a funcionar para desktop

A decisão é manter os dois targets vivos:
- **PWA web** (`npm run build` + Firebase Hosting) — para gestores em PC/tablet
- **APK Android** (`npm run build:android` + Capacitor + Gradle via GitHub Actions) — para trabalhadores em estaleiro

Mesmo código React. Diferentes targets de build.

### 2.5 SAP — abordagem pragmática

**O cliente não nos disse que módulo SAP usam** (e o user não sabe ainda). Decidimos:

1. Usar **SAP Business Accelerator Hub sandbox** (`https://sandbox.api.sap.com/s4hanacloud/...`) — público, não exige conta paga
2. Módulo: **PM (Plant Maintenance)** — endpoint `API_MAINTNOTIFICATION/MaintenanceNotification`
3. Mapeamento dos 3 campos críticos:
   - **Remetente (origem)** → `NotifLongText` + `StorageLocation` (vem do `tool.storageLocation`)
   - **Destino** → `MaintenanceObjectLocation` (vem da obra onde ferramenta vai)
   - **Funcionário** → `ReportedByUser` (UID do utilizador logado na PWA)
4. **Modo mock automático**: se não houver `SAP_API_KEY` configurado nos secrets Firebase, o backend regista o payload em `sap_sync_log` mas não chama SAP. Isto é académicamente defensável e seguro para apresentação.
5. **Modo live**: bastará configurar `SAP_API_KEY` para activar chamadas reais ao sandbox.

**Implementação:**
- `Backend_Cloud/functions/sap/sapBridge.js` — módulo completo, com:
  - Trigger Firestore `onToolSessionCreatedToSap` (checkout)
  - Trigger Firestore `onToolSessionClosedToSap` (check-in)
  - Endpoint HTTP `/api/sap/{status,sync,log}` para demo manual
- Exportado em `Backend_Cloud/functions/index.js`
- Rewrite registado em `Backend_Cloud/firebase.json`

### 2.6 Procore — manter o que existe

A integração Procore actual (sandbox, OAuth, equipment sync, etc.) **continua útil** porque o cliente usa Procore. As mesmas obras vão ser referenciadas pelas ferramentas pequenas. Não tocar na integração Procore por agora.

A vista nova `FerramentasView` ainda **não sincroniza para Procore** — é trabalho pendente.

### 2.7 QR codes mantidos para avarias

A `ReporteAvariaView` existente continua a ser usada — agora aponta para ferramentas pequenas em vez de máquinas. Reutilização limpa.

---

## 3. Estado actual do código (commit `695e16f` em diante)

### 3.1 Novos ficheiros

| Ficheiro | Função |
|---|---|
| `Frontend_App/dashboard/src/views/FerramentasView.jsx` | UI CRUD de ferramentas pequenas |
| `Frontend_App/dashboard/src/pages/ToolTagPage.jsx` | Página `/t/:tagId` (deep link target) |
| `Frontend_App/dashboard/src/components/NfcOverlay.jsx` | Overlay de confirmação (não usado actualmente — fallback) |
| `Frontend_App/dashboard/src/store/useNfcStore.js` | Store NFC global (fallback Web NFC, não usado actualmente) |
| `Frontend_App/dashboard/capacitor.config.json` | Config Capacitor |
| `Frontend_App/dashboard/android/` | Projecto nativo Android gerado pelo Capacitor |
| `Backend_Cloud/functions/sap/sapBridge.js` | Integração SAP PM |
| `.github/workflows/build-apk.yml` | Build APK Debug na cloud |
| `.gitattributes` | Garante LF em gradlew |

### 3.2 Modificações

| Ficheiro | Mudança |
|---|---|
| `Frontend_App/dashboard/src/App.jsx` | Adicionada rota `/t/:tagId` para `ToolTagPage`; listener `appUrlOpen` Capacitor; rota `Equipamentos` aponta a `FerramentasView` em vez de `MaquinasView` |
| `Frontend_App/dashboard/src/components/layout/Sidebar.jsx` | "Estaleiro" → "Armazém"; indicador NFC discreto |
| `Frontend_App/dashboard/package.json` | Adicionado script `build:android`; dependências `@capacitor/{core,cli,android,app}` |
| `Backend_Cloud/firebase.json` | Rewrite `/api/sap/**` → `sapBridge` |
| `Backend_Cloud/functions/index.js` | Exports dos triggers/endpoint SAP |

### 3.3 Modelo de dados Firestore (NOVO)

```
artifacts/casais-rfid/public/data/
├── tools/{toolId}
│   ├── name: string               # ex: "Martelo Pneumático #3"
│   ├── type: string                # ex: "Martelo Pneumático"
│   ├── nfcTagId: string            # ID da tag NFC, único, MAIÚSCULAS
│   ├── storageLocation: string     # armazém de origem (campo "remetente" SAP)
│   ├── currentObraId: string|null
│   ├── currentObraName: string|null
│   ├── createdAt, updatedAt
│
├── tool_sessions/{sessionId}
│   ├── toolId, toolName, toolType, nfcTagId
│   ├── operatorId, operatorName    # UID do utilizador logado
│   ├── obraId, obraName
│   ├── sapOrigin: string           # storageLocation copiado no checkout
│   ├── sapDestination: string      # obra de destino
│   ├── sapWorker: string           # operatorId
│   ├── status: 'OPEN' | 'CLOSED'
│   ├── startTime, endTime
│   ├── durationHours: number|null
│   ├── procoreSynced, sapSynced: boolean
│   ├── sapMode: 'mock' | 'live'
│   ├── sapNotificationId: string|null
│
└── sap_sync_log/{auto}
    ├── sessionId, eventType
    ├── payload (JSON enviado/que seria enviado)
    ├── result (response SAP ou mock)
    ├── createdAt
```

### 3.4 Estado dos builds

| Run | SHA | Resultado | Notas |
|---|---|---|---|
| #1 | 55b19eb | ❌ Sync Capacitor | webDir `../../Backend_Cloud/public` rejeitado pelo CLI |
| #2 | a0fdc38 | ❌ Sync Capacitor | mudança para `dist` via script de copy ainda falhou |
| #3 | 0780c7a | ❌ Sync Capacitor | mudança para `--outDir dist` ainda falhou |
| #4 | adf87f4 | ❌ Sync Capacitor | log indicou problema |
| #5 | a4cc047 | ❌ Sync Capacitor | log com `set +e` ajudou |
| #6 | ac78867 | ❌ Sync Capacitor | artifact uploaded; **Node 20 insuficiente para Capacitor 8** |
| #7 | 695e16f | ❌ ??? | Node 22 — falhou em step diferente, **A INVESTIGAR** |

**Próxima acção urgente**: verificar o step que falhou no run #7 (provavelmente Gradle assembleDebug ou Make gradlew executable). Pode ser necessário ajustar `compileSdkVersion` ou similar.

---

## 4. Decisões PENDENTES — a discutir / resolver

### 4.1 ⚠️ Crítico — bloqueia demo

1. **APK build a passar.** Run #7 falhou. Verificar onde e corrigir. Pode ser:
   - Gradle wrapper version
   - SDK platform missing
   - Manifest mal-formado

2. **Login persistente em Capacitor.** Firebase Auth normalmente usa localStorage. No Capacitor WebView Android isto **deve** funcionar mas **não foi testado**. Se falhar, alternativas:
   - `@capacitor/preferences` para guardar token manualmente
   - Capacitor Firebase Auth plugin (nativo)

3. **Worker → Operator mapping.** Hoje o sistema tem dois conceitos:
   - `operators` (RFID-based, criados manualmente)
   - `users` (Firebase Auth, quem entra na PWA)
   - O `tool_session.operatorId` está a usar `currentUser.uid` (= user Firebase Auth)
   - **A decidir:** queremos unificar (cada user = operator) ou manter separado e mapear via campo `operatorId` em `users/{uid}`?

4. **Distribuição do APK.** GitHub Actions gera artifact, mas:
   - Worker não tem acesso a GitHub Actions
   - Onde hospedar APK público? Firebase Hosting (`/app.apk`)? GitHub Releases?
   - Como notificar workers de updates?

### 4.2 Importante — afecta apresentação

5. **Onde apontam as tags em produção?**
   - Hoje a tag aponta para URL `https://casais-rfid.web.app/t/...`
   - Na demo do dia 16 estamos a deployar a `casais-rfid.web.app`?
   - Se sim, as tags físicas têm de ser programadas com esse URL exacto. Decisão: usar o domínio actual.

6. **Procore sync de tools.** A `FerramentasView` cria entradas em `tools` mas **não sincroniza para Procore**. Para uma demo coerente, queremos que ferramentas pequenas também apareçam em Procore Equipment?
   - **Opção A:** Sim — replicar o flow `onMachineCreatedToProcore` para tools
   - **Opção B:** Não — Procore só é actualizado nas máquinas grandes (que existem ainda como legacy)
   - **Opção C:** Em vez de criar Equipment, criar Observation Procore para cada movimento (origem → destino → funcionário)

7. **Map view com pins de obras + ferramentas em uso.** Discutido na reunião como "elemento visual forte" mas não implementado. Há tempo?

8. **Geofencing.** Director sugeriu sair da zona armazém = começar a trabalhar. **Não implementado.** Se incluído seria via `@capacitor/geolocation`. Dúvida: para a demo basta dizer "estamos a evoluir nesta direcção"?

9. **Programação de tags NFC dentro da própria app.** Hoje:
   - User cria tool na `FerramentasView`
   - Clica "URL" para copiar
   - Tem de usar app externa Android (NFC Tools etc.) para escrever URL na tag
   - **Alternativa:** adicionar botão "Programar tag" na `FerramentasView` que usa `NDEFReader.write()` (Web NFC writing API)
   - Pro: workflow completo dentro da PWA. Con: só funciona em Chrome Android com Web NFC habilitado.

### 4.3 Desejável — pode esperar

10. **Migration de máquinas antigas.** A colecção `machines` continua a existir no Firestore com excavadoras, dumpers etc. Decisão: tocar nelas? Ou deixar como histórico e simplesmente esconder da UI?

11. **Remoção da MaquinasView.jsx.** Hoje está em disco mas não é carregada (lazy import aponta a `FerramentasView`). **A decidir:** apagar definitivamente? Ou manter como referência?

12. **SAP API key real.** Para passar de mock para live no SAP, precisamos de uma key do SAP Business Accelerator Hub. **Custo:** 0 EUR para sandbox. **Acção:** registar conta SAP API Hub (developer free), obter API key, configurar como secret `SAP_API_KEY` no Firebase Functions.

13. **Sessões anteriores em CO₂ /tarifários.** Toda a lógica financeira (`FinanceiroView`) foi construída para máquinas grandes com tarifário horário. Para ferramentas pequenas, **as fórmulas precisam de revisão**:
    - Custo por hora ainda faz sentido? (sim, mas valores diferentes)
    - CO₂ via combustível directo (geradores) vs indirecto (martelos via compressor)?
    - Manutenção/calibração de ferramentas tem ciclos diferentes

14. **Estados deletados.** Quando user faz delete de uma `tool`, hard delete acontece. **Decisão:** soft-delete (marca `deletedAt`) seria mais defensável academicamente (auditoria).

15. **Multilanguage.** Hoje tudo PT. Director não falou em outros idiomas. **Manter PT.**

### 4.4 Estratégico

16. **Apresentação académica:** que histórico contar?
    - "Pivotámos a meio do projecto após reunião com cliente" → narrativa honesta de UX research
    - Ou: focar só no produto final como se sempre tivesse sido este
    - Recomendação: contar o pivô honestamente — demonstra capacidade de adaptação

17. **Cliente real:** O director da Casais ficou de avaliar este protótipo após a apresentação? Está envolvido como stakeholder ou foi só uma consulta one-off?

---

## 5. Como continuar — instruções operacionais

### 5.1 Comandos essenciais

```bash
# Dev local PWA
cd Frontend_App/dashboard && npm run dev

# Build web (PWA → Firebase Hosting)
cd Frontend_App/dashboard && npm run build
# Output: Backend_Cloud/public/

# Build Android (Capacitor) localmente — requer Android Studio + JDK 17 + Node 22
cd Frontend_App/dashboard
npm run build:android     # vite build → dist/
npx cap sync android      # copia dist/ para android/app/src/main/assets/public
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Deploy backend (inclui SAP Bridge novo)
cd Backend_Cloud/functions && firebase deploy --only functions

# Deploy frontend
cd Frontend_App/dashboard && npm run deploy
```

### 5.2 Configurações de ambiente

- **Firebase Project ID:** `casais-rfid`
- **Firestore base path:** `artifacts/casais-rfid/public/data/`
- **Cor primária:** `#005EB8` (Casais blue) — invariante
- **Region functions:** `europe-west1`

### 5.3 Secrets a configurar (quando aplicável)

```bash
firebase functions:secrets:set SAP_API_KEY
firebase functions:secrets:set PROCORE_CLIENT_ID
firebase functions:secrets:set PROCORE_CLIENT_SECRET
firebase functions:secrets:set PROCORE_COMPANY_ID
firebase functions:secrets:set PROCORE_WEBHOOK_SECRET
```

### 5.4 Testar o flow NFC end-to-end

1. Programar tag NFC com app Android (NFC Tools ou similar) com URL: `https://casais-rfid.web.app/t/MARTELO_001`
2. No deploy actual, criar tool em Firestore manualmente:
   ```json
   {
     "nfcTagId": "MARTELO_001",
     "name": "Martelo Pneumático #1",
     "type": "Martelo Pneumático",
     "storageLocation": "Armazém Central"
   }
   ```
3. No telemóvel, fazer login em `casais-rfid.web.app`
4. Encostar telemóvel à tag → URL abre → confirma check-out
5. Verificar Firestore: deve aparecer doc novo em `tool_sessions` + `sap_sync_log`

Quando APK estiver pronto: instalar APK → repetir passos 3-5 → deve abrir directamente no APK sem popup do Chrome.

---

## 6. Princípios para quem continua

1. **Não tocar nas colecções existentes (`machines`, `sessions`, `operators`, `obras`) por agora.** A nova lógica vive em `tools` e `tool_sessions`. Reduz risco de regressão.
2. **Mock-first para SAP.** Antes de chamadas reais, garantir que o payload faz sentido. O modo mock está pensado para isto.
3. **Web NFC API tem limitações sérias** — só funciona em Chrome Android, exige HTTPS, exige user gesture. Não basear nada crítico no Web NFC: o flow real é via NDEF URL → intent → APK.
4. **GitHub Actions é a única forma realista de build APK** sem instalar Android Studio. Não tentar setup local a menos que seja crítico.
5. **Capacitor 8 exige Node 22+.** Importante para CI e qualquer máquina nova.
6. **Não inflacionar features.** A demo do dia 16 não precisa de tudo. O essencial é: NFC funciona → ferramenta identificada → dados em Firestore → vão para SAP (mock ou live) → vão para Procore (se decidirmos). Resto é cherry-on-top.
7. **Documentação canónica:** `README.md`, `docs/INDEX.md`, `docs/ROADMAP_EXECUCAO.md`, `FINDINGS.md`. Não criar novos top-level .md sem necessidade.

---

## 7. Onde ficou a história, em commits

```
695e16f  fix(ci): Node 22 + FerramentasView para novo fluxo NFC
ac78867  ci: capturar output cap sync para artifact descarregável
a4cc047  ci: debug step à prova de falha + listagem completa de dirs
adf87f4  feat(sap): adicionar SAP Bridge + debug do CI
0780c7a  fix(capacitor): simplificar build:android usando --outDir do Vite
a0fdc38  fix(capacitor): mudar webDir para dist/ local (não suportado ../..)
55b19eb  feat(capacitor): adicionar build Android APK via GitHub Actions
ea3294c  WIP snapshot: pivô para tracking de ferramentas pequenas + NFC global
fa2e546  Atualização de autor e registo de contribuidor
```

Branch principal: `main`. Não há outras branches activas relevantes.

---

## 8. Glossário rápido

- **Tag NFC** — pequeno chip passivo colado na ferramenta. Não tem bateria. Contém apenas um URL.
- **Deep Link** — URL que abre directamente uma view específica da app, contornando a navegação normal.
- **Intent Filter (Android)** — registo no manifest que diz ao Android "esta app sabe responder a URLs com este padrão".
- **Capacitor** — framework Ionic que envolve uma webapp num shell nativo. Mantém-se um único codebase React.
- **Web NFC API** — JS API para ler tags NFC dentro de um browser. Só Chrome Android. Limitada.
- **SAP PM** — Plant Maintenance, módulo SAP onde se registam notificações e ordens de manutenção. Tem API REST.
- **WBS Element** — Work Breakdown Structure, elemento de projecto em SAP que recebe custos.
- **Procore Equipment Tool** — registry company-level no Procore com equipamentos. Não confundir com Procore Project Equipment (não usado).
- **Mock mode (SAP)** — não chama SAP de verdade, regista payload para auditoria. Académicamente defensável.

---

**Última actualização:** 2026-05-25 após reunião com director Casais.  
**Próximo passo prioritário:** resolver build APK (run #7), depois testar flow end-to-end com tag física no telemóvel do user.
