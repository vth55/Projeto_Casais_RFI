# 📊 STATUS DO PROJETO - CASAIS FLEET INTELLIGENCE

> **Última Atualização:** 07 Abril 2026
> **Foco Atual:** Fase 4 - UX/UI Refactoring (Dashboard Procore)

---

## ✅ CONCLUÍDO (O que já funciona)

### 📱 Mobile Hub (Smartphone-as-Machine)
- [x] Geração de ID Único persistente (`M_MOB_...`).
- [x] Auto-Registo automático no Firestore ao abrir a App.
- [x] Ativação de Web NFC por gesto (Touch-to-Scan).
- [x] Interface minimalista focada no operador.

### ⚙️ Engine de Dados & Backend
- [x] Início e Fim de sessão via RFID/NFC.
- [x] Cálculo de Duração e Custos (Base, Extra, Inatividade).
- [x] Cálculo de Emissões CO2.
- [x] Exportação de histórico para CSV.
- [x] Cloud Functions para processamento em tempo real.

### 🎨 Dashboard & UI Base
- [x] Painel de Controlo com KPIs (Ativas, Avarias, Ganhos).
- [x] Gestão de Máquinas, Operadores e Obras.
- [x] Histórico detalhado de sessões.
- [x] Design System profissional alinhado com a Casais (#005EB8).

---

## ⏳ EM CURSO / PENDENTE (O nosso TODO)

### 🚀 Nivel 1: Integração Procore (Prioridade Máxima)
- [x] **Fase 0:** Registo no Procore Developer Portal e Sandbox.
- [x] **Fase 1:** Cloud Function "Procore Bridge" (OAuth2).
- [x] **Fase 2:** Sincronização de Obras e Equipamentos.
- [x] **Fase 3:** Push automático de Timecards (IoT -> Procore).

### 🛠️ Nivel 2: Refinamento Industrial
- [ ] **Layout Responsivo:** Implementar "Sidebar Rail" para Tablets (ícones apenas).
- [ ] **API Security:** Proteção de Endpoints via X-API-KEY no Hardware.
- [x] **Higiene de Projeto:** Removido hardware ESP32 e simuladores obsoletos (Limpeza Completa). ✅

### 🔭 Nivel 3: Inovação V3 (Roadmap Futuro)
- [ ] **Offline Sync:** Sincronização passiva via Bluetooth (Human-Relay).
- [ ] **Alertas de Segurança:** Proximidade BLE entre operadores e máquinas.

---

> **Nota para o Claude/Gemini:** Consulta sempre este ficheiro antes de iniciares uma nova feature para garantir alinhamento com o estado atual.
