# 📊 ESTADO REAL DA INTEGRAÇÃO PROCORE

> **Sessão:** 07 de Abril de 2026 (Claude Opus Auditoria)
> **Estado Geral:** FASE 2 Concluída (Enriquecimento Visual). FASE 3 Pendente (Automação).

---

## 🛠️ DECISÃO DE ARQUITETURA
**Opção Escolhida:** B — Enriquecimento não-destrutivo.
- **Motivo:** Para uma PWA académica e demonstrativa, manter a flexibilidade de criação local enquanto se "enriquece" com dados reais da Sandbox Procore é a escolha mais impactante sem quebrar a autonomia da app original.

---

## ✅ O QUE ESTÁ FUNCIONAL (REAL)

| Funcionalidade | Implementação Técnico | Nota de Demo |
| :--- | :--- | :--- |
| **Auth OAuth2** | `/api/procore/authorize` | Requer intervenção manual uma única vez por sessão. |
| **Puxar Dados (GET)** | `procoreBridge.js` + `procoreScheduler.js` | Sincroniza via Cloud Function (Cron horário). |
| **Listeners Firestore** | `useStore.js` (Frontend) | App deteta mudanças no mirror `integrations/procore` em tempo real. |
| **Matching de Obras** | `matchObraToProcore` | Fuzzy match por nome normalizado (ignora acentos e espaços extras). |
| **Matching Operadores** | `matchOperatorToProcore` | Primário: Email; Fallback: Nome normalizado. |
| **Badges de Origem** | `ObrasView` / `OperadoresView` | Indicadores visuais Premium com gradientes Casais (#005EB8). |
| **Painel de Controlo** | `ConfiguracoesView` -> Aba Integrações | KPIs de sync, estado da cloud e disparo manual. |

---

## 🏗️ O QUE FALTA (FUTURO)

### 🔴 FASE 3: Automação do Push IoT (Foco Inicial)
- **Problema:** `createTimecardEntry()` existe no backend mas não é chamado pelo fluxo RFID.
- **Solução:** Injetar o trigger no `handleSessionTrigger` (index.js). Quando a sessão fecha localmente, se houver match com Procore, envia o custo e as horas imediatamente.

### 🟡 POLIMENTO UI/UX (OPCIONAL)
- Adicionar dashboards específicos com métricas vindas do Procore (Budget vs Spend).
- Facilitar o matching manual se o Fuzzy Match falhar.

---

## 📂 FICHEIROS ENVOLVIDOS (FASE 2)
1. `Frontend_App/dashboard/src/store/useStore.js`
2. `Frontend_App/dashboard/src/views/ObrasView.jsx`
3. `Frontend_App/dashboard/src/views/OperadoresView.jsx`
4. `Frontend_App/dashboard/src/views/ConfiguracoesView.jsx`
5. `Backend_Cloud/functions/procore/procoreBridge.js`

---

> **MEMÓRIA DE SEGURANÇA:** Se o sistema ficar sem créditos, este ficheiro serve de "Snapshot" para retomar a integração exatamente onde parámos.
