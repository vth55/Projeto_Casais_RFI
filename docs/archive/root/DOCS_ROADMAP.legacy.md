# ðŸ—ºï¸ DOCS_ROADMAP - Requisitos vs ExecuÃ§Ã£o

Este documento Ã© a "Fonte de Verdade" para o progresso do projeto. Combina a visÃ£o estratÃ©gica com a auditoria tÃ©cnica de cada funcionalidade pedida.

---

## ðŸ“Š RESUMO DE SAÃšDE DO PROJETO
> **Ãšltima AtualizaÃ§Ã£o:** 24 Abril 2026  
> **Foco Atual:** Fase 6 - IndustrializaÃ§Ã£o & Blindagem (ConclusÃ£o ManutenÃ§Ã£o)  
> **Estado Geral:** âœ… 99% ConcluÃ­do (Deploy Industrial & Auditoria OK)

---

## âœ… CONCLUÃDO (O que jÃ¡ estÃ¡ em ProduÃ§Ã£o)

### ðŸ—ï¸ IntegraÃ§Ã£o Procore (Enterprise)
- [x] **Fase 0-2**: OAuth2 Bridge e SincronizaÃ§Ã£o de DirectÃ³rio/Equipamentos.
- [x] **Fase 3-4**: Writeback automÃ¡tico de Daily Logs, Custos e ResiliÃªncia (LIVE).
- [x] **Interface**: Aba de IntegraÃ§Ãµes, Badges de Sync e Auth Sandbox Procore.

### ðŸ“± Mobile Hub & Hardware
- [x] **Tecnologia**: Smartphone-as-Machine (NFC Nativo) concluÃ­do.
- [x] **Arduino**: Retrofit com RFID e LEDs de feedback visual funcionais.
- [x] **Auto-ID**: GeraÃ§Ã£o de chaves `M_MOB_...` e auto-registo.

### âš™ï¸ Engine de BI & UX
- [x] **RBAC**: 5 perfis de acesso com dashboards dinÃ¢micos.
- [x] **MÃ©tricas**: CÃ¡lculo de CO2, Consumo, MTBF operacional e Taxa de UtilizaÃ§Ã£o.
- [x] **PWA**: Suporte offline completo, Service Worker estÃ¡vel e instalÃ¡vel.

---

## ðŸŽ¯ MATRIZ DETALHADA (Pedidos vs. CÃ³digo)

| Funcionalidade | Status | Garantido no CÃ³digo | Falta / Impedimentos |
|----------------|--------|---------------------|----------------------|
| **Controlo de Anomalias** | âœ… FEITO | Backend deteta sessÃµes >5h e >14h. Link de validaÃ§Ã£o por email funcional. | UI de visualizaÃ§Ã£o de anomalias (`QualidadeView`) precisa de refinamento visual. |
| **CÃ¡lculo DinÃ¢mico de Custos** | âœ… FEITO | Usa `consumptionRate` da mÃ¡quina e `pricePerLitre` do Firestore. | - |
| **GestÃ£o de ParÃ¢metros PWA** | âœ… FEITO | UI nas ConfiguraÃ§Ãµes para editar Diesel, CO2 e ManutenÃ§Ã£o (via RBAC). | - |
| **ManutenÃ§Ã£o Preditiva Sede** | âœ… FEITO | ProjeÃ§Ã£o, Agendamento, Export CSV e HistÃ³rico auditados (Blocos 1-9). | Dots de PrevisÃ£o/Agendamento invisÃ­veis na grelha do calendÃ¡rio. |
| **Galeria de Fotos (ManutenÃ§Ã£o)** | ðŸ”´ PLANEADO | Novo modal de detalhe jÃ¡ implementado. | Adicionar visualizaÃ§Ã£o de anexos (Antes/Depois) no modal. |
| **GestÃ£o em Massa** | ðŸŸ¡ EM CURSO | EdiÃ§Ã£o de tarifÃ¡rios, categorias e localizaÃ§Ãµes de mÃºltiplas mÃ¡quinas simultaneamente. | MudanÃ§a de localizaÃ§Ã£o em massa em `MaquinasView`. |
| **Login por Passcode** | ðŸ”´ PLANEADO | Atualmente utiliza `signInAnonymously`. LÃ³gica de verificaÃ§Ã£o de PIN 4-dÃ­gitos pendente. | Prioridade mÃ¡xima para a prÃ³xima Sprint tÃ©cnica. |
| **SeguranÃ§a API (Hardware)** | ðŸŸ¡ EM CURSO | ProteÃ§Ã£o bÃ¡sica via Cloud Functions. | Implementar validaÃ§Ã£o de X-API-KEY no `index.js` e Bridge Python. |
| **Checklist de SeguranÃ§a** | ðŸ”´ PLANEADO | Criar pop-up de prÃ©-utilizaÃ§Ã£o no PWA do Operador. | Requisito de compliance. |
| **Feedback (Toasts)** | ðŸ”´ PLANEADO | Implementar avisos visuais de sucesso/erro em `SessoesCorrigidasView`. | Melhoria de UX. |
| **Higiene de ProduÃ§Ã£o** | ðŸŸ¡ EM CURSO | Flag para esconder DevTools e remoÃ§Ã£o de MockData. | PreparaÃ§Ã£o para demonstraÃ§Ã£o final. |
| **ValidaÃ§Ã£o de Perfis** | ðŸ”´ PLANEADO | Testar permissÃµes (Guards) via Modo Demo nas ConfiguraÃ§Ãµes. | Verificar se Encarregado e Sustentabilidade vÃªem o que devem. |
| **Nomenclatura Inteligente** | ðŸŸ¡ EM CURSO | Gerador `{CAT}-{NUM} - {OBRA}` para apoiar criaÃ§Ã£o manual na PWA. | Facilitar gestÃ£o enquanto aguardamos Procore. |
| **Audit Trail (Settings)** | ðŸ”´ PLANEADO (F6) | Registo de quem e quando alterou diesel/CO2/manutenÃ§Ã£o. | Requisito ISO 55001. |
| **PIN Security** | ðŸ”´ PLANEADO (F6) | Cloud Functions intermediÃ¡ria com Rate Limit. | ProteÃ§Ã£o contra Bruteforce. |
| **Offline-First Login** | ðŸ”´ PLANEADO (F6) | Cache local do PIN (hash) no Mobile Hub. | OperaÃ§Ã£o em Ã¡reas sem rede. |
| **Data Performance** | ðŸ”´ PLANEADO (F6) | PrÃ©-cÃ¡lculo de KPIs via Cloud Functions (scheduled). | PreparaÃ§Ã£o para frotas > 50 mÃ¡quinas. |

---

- [ ] **Fase 6: IndustrializaÃ§Ã£o & Blindagem de SeguranÃ§a**:
    - [ ] Implementar Audit Trail para configuraÃ§Ãµes sensÃ­veis.
    - [ ] Refatorar auth PIN para Cloud Functions com Rate Limit.
    - [ ] Implementar Offline-First para o Mobile Hub.
    - [ ] Otimizar performance de KPIs (Pre-calculation).

### ðŸ“† Sprints de Desenvolvimento (Nova PlanificaÃ§Ã£o)

- [ ] **Sprint 1 â€” Procore em produÃ§Ã£o (a fundaÃ§Ã£o)**
    - [ ] Migrar sandbox â†’ produÃ§Ã£o.
    - [ ] Validar write-back end-to-end (Timecards, Daily Logs, Cost Entries).
    - [ ] Indicadores visuais de sync em ObrasView/OperadoresView/SessoesView.
    - [ ] Painel "SaÃºde da IntegraÃ§Ã£o" em ConfiguraÃ§Ãµes (Ãºltimo sync, fila retry, erros).

- [ ] **Sprint 2 â€” RelatÃ³rios reais + CÃ³digos de avaria**
    - [ ] Implementar `handleExport()` (CSV/Excel via SheetJS, PDF via jsPDF).
    - [ ] CategorizaÃ§Ã£o estruturada de avarias (HID/MEC/PNE/ELE + severidade).
    - [ ] Tabela de cÃ³digos editÃ¡vel na pÃ¡gina de ConfiguraÃ§Ãµes.

- [ ] **Sprint 3 â€” Avarias â†’ Procore + Financeiro**
    - [ ] Avarias com fotos â†’ Procore Punch List/Inspections (diferenciador).
    - [ ] TarifÃ¡rios locais â†’ Cost Entries automÃ¡ticos no Procore (IntegraÃ§Ã£o Fase 4).

- [ ] **Sprint 4 â€” Polish + Diferenciadores**
    - [ ] Widgets ROI no DashboardView.
    - [ ] InspeÃ§Ãµes guiadas passo-a-passo no Mobile Hub.
    - [ ] Timeline consolidada em MaquinasView.
    - [ ] F5 Procore: error handling robusto + docs.

### ðŸ”® Backlog de InovaÃ§Ã£o TÃ©cnica
- [ ] **Offline Sync (Human-Relay)**: SincronizaÃ§Ã£o via Bluetooth entre telemÃ³veis.
- [ ] **SeguranÃ§a BLE**: Alertas de proximidade entre mÃ¡quinas e pessoal.
- [ ] **AI Predict**: PrevisÃ£o de avarias baseado em histÃ³rico de telemetria.
- [ ] **NotificaÃ§Ãµes Push**: Alertas reais via Service Worker (Browser notifications).
- [ ] **Login BiomÃ©trico**: (Ideia) FaceID/Fingerprint no Mobile Hub.

---
> **InstruÃ§Ã£o Permanente:** Este ficheiro substitui `STATUS_PROJETO.md` e `MATRIZ_ACOMPANHAMENTO.md`.
