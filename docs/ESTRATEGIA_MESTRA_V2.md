# 🏗️ ESTRATÉGIA MESTRA: CASAIS RFI (V2 & INTEGRAÇÃO PROCORE)

> **Documento de Visão:** Transição para Produto Industrial, Escalabilidade Enterprise e Integração nativa com Procore.

---

## 🛠️ PARTE 1: INFRAESTRUTURA TÉCNICA (P/ JUNHO 2025)
*Medidas concretas para elevar o nível de segurança e profissionalismo do sistema.*

### 1.1 Autenticação IoT (API Keys)
- **Problema:** Endpoints abertos a injeção de dados de qualquer origem.
- **Solução:** Implementação de `X-API-KEY` nos headers do hardware. 
- **Estado:** Para implementar (Alta Prioridade).

### 1.2 Higiene de Projeto (Monorepo Profissional)
- **Problema:** Raiz do projeto com ficheiros fragmentados.
- **Solução:** Reorganização em diretoria `Hardware/` e centralização de docs.
- **Estado:** Para implementar (Baixa Prioridade).

### 1.3 Mobile Hub Finalizado
- **Status:** **CONCLUÍDO**. PWA com Auto-ID, Auto-Registo e NFC Gesture-Trigger. 
- **Referência:** [MobileHubView.jsx](file:///c:/Users/vitor/OneDrive/%C3%81rea%20de%20Trabalho/Projeto_Casais_RFI/Frontend_App/dashboard/src/views/MobileHubView.jsx)

---

## 🚀 PARTE 2: PROCORE BRIDGE (ESTRATÉGIA INTEGRADA)
*O projeto como a "IoT Layer for Procore" — o sensor de campo do Procore.*

### 2.1 Visão Geral da Integração
- **Conceito:** O sistema atua como o Gateway de IoT para o Procore, enviando dados via API (`POST /equipment_timecard_entries`).

### 2.2 Fases de Implementação (Roadmap)
| Fase | Objetivo | IA Recomendada |
| :--- | :--- | :--- |
| **0** | **Setup Procore Developer Portal** (SandBox + Credenciais) | **Sonnet** |
| **1** | **Cloud Function "Procore Bridge"** (OAuth2 + Auth Flow) | **Opus** |
| **2** | **Sincronização Bidirecional (Obras / Projetos)** | **Opus** |
| **3** | **Push IoT (Equipment Timecards + Logs Diários)** | **Opus** |
| **4** | **UX/UI Refactoring** (Ajuste para fluxos empresariais) | **Sonnet** |
| **5** | **Polimento e Documentação Técnica** | **Sonnet** |

### 2.3 Mapping Técnico
- **Firestore:** `procore_mapping/{machineId: procoreEquipmentId, obraId: procoreProjectId}`.
- **Trigger:** `onSessionClosed` -> Firebase Cloud Function -> Procore API.

---

## 🔭 PARTE 3: VISÃO ESTRATÉGICA (FUTURO V3)
*Conceitos de inovação de longo prazo.*

- **3.1 Human-Relay Mesh:** App móvel recolhe logs via Bluetooth passivo.
- **3.2 M2M Mesh:** Máquinas comunicam entre si (Gossip Protocol) em zonas sem rede.
- **3.3 Escudo Digital:** Detecção de proximidade BLE para segurança HST.
- **3.4 Big Data (BigQuery):** Arquivo histórico para ESG e análise preditiva.

---

> **Nota:** Este documento é a "Fonte de Verdade Unificada" para toda a evolução do projeto e substitui versões anteriores de estratégia e integração.
