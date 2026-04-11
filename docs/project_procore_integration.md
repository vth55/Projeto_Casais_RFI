# 🚀 ROADMAP: PROCORE INTEGRATION (CASAIS RFI)

> **Status Atual:** ✅ FASE 4 CONCLUÍDA (UX/UI Refactoring). Próximo: Fase 5 (Documentação e Polimento).
> **Visão:** IoT Layer for Procore — Automatização total de dados de campo.

---

## 📅 PLANO DE EXECUÇÃO (7 FASES)

| Fase | Objetivo | Status | IA Recomendada |
| :--- | :--- | :--- | :--- |
| **0** | **Setup Procore Developer Portal** (SandBox + Credenciais) | ✅ CONCLUÍDO | **Sonnet** |
| **1** | **Cloud Function "Procore Bridge"** (OAuth2 + Auth Flow) | ✅ CONCLUÍDO | **Opus** |
| **2** | **Sincronização & Interface (Mirror + Badges UI)** | ✅ CONCLUÍDO | **Opus** |
| **3** | **Push IoT (Automatic Timecards ao fechar sessão)** | ✅ CONCLUÍDO | **Opus** |
| **4** | **UX/UI Refactoring** (Procore Reconciliation Hub no Dashboard) | ✅ CONCLUÍDO | **Opus/Sonnet** |
| **5** | **Polimento e Documentação Técnica** | 🏗️ EM CURSO | **Sonnet** |
| **6** | **Demonstração Casais** (Final de linha) | 🕒 PENDENTE | **Sonnet** |

---

## 🧩 ESTRATÉGIA DE INTEGRAÇÃO (OPÇÃO B - ENRIQUECIMENTO)
*Decisão tomada em 07/04/2026: Procore funciona como fonte de dados complementar.*
- **Mirroring:** Sincronização horária de `projects`, `equipment` e `directory` para Firestore.
- **Match:** Vinculação automática por email/nome normalizado (Zustand Helpers).
- **UI:** Badges "Procore Sync" em Obras/Operadores. Registo local permanece Master (editável).

---

## 🛠️ DECISÕES TÉCNICAS (SAFETY LOG)
- **Path:** `artifacts/casais-rfid/public/data/integrations/procore`.
- **Sync Engine:** Cloud Scheduler v2 (`procoreScheduledSync`) na região `us-central1`.
- **Writeback:** Integração em tempo real em `index.js` (Export assíncrono).

---

> **Nota para a Próxima Sessão:** Fases 2 e 3 entregues com sucesso. O foco agora é na **Fase 4**: Refinar a UI do dashboard para exibir reconciliação de dados Procore vs Locais de forma profissional.
