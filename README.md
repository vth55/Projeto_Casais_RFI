# 🚜 CASAIS FLEET INTELLIGENCE

> **O Futuro da Construção passa pela Inteligência de Campo.**

O *Casais Fleet Intelligence* é um ecossistema industrial projetado para o Grupo Casais, que transforma ativos físicos (máquinas e equipamentos) em fontes de dados em tempo real, totalmente integradas com o ERP Procore.

---

## 📚 Portal de Documentação (Wikipedia)

Para garantir a continuidade e o rigor técnico, a documentação está organizada em **4 Pilares Mestres**:

1.  📖 **[Histórico e Decisões](DOCS_HISTORY.md)**: Registo cronológico de todas as sessões, decisões de arquitetura e evolução do projeto (2024-2026).
2.  🏗️ **[Arquitetura Técnica](DOCS_ARCHITECTURE.md)**: O manual do sistema. Detalhes sobre Cloud Functions, Database Schema, PWA e Integração Procore.
3.  🗺️ **[Estado e Roadmap](DOCS_ROADMAP.md)**: O ponto de situação atual. Requisitos pedidos vs. Execução e planos para Inovação V3.
4.  🛠️ **[Guia de Operações](DOCS_OPERATIONS.md)**: Como correr o projeto, comandos de build e procedimentos de deploy.

---

## 🏗️ Ecossistema
O projeto é composto por 4 módulos principais:
- ☁️ **[Backend_Cloud](Backend_Cloud/README.md)**: Firebase Functions & Firestore.
- 🎨 **[Frontend_App](Frontend_App/dashboard/README.md)**: PWA Dashboard em React.
- 🔌 **[Firmware Arduino](arduino_rfid_simple/README.md)**: Controlo físico de RFID e LEDs.
- 🌉 **[Python Bridge](Hardware_Bridge_PC/README.md)**: A ponte de comunicação hardware-cloud.

---

## 📋 Como Começar (Rápido)
1. Certifica-te que tens o **Node.js 20+** instalado.
2. Clona o repositório.
3. Segue o **[Guia de Operações](DOCS_OPERATIONS.md)** para levantar o ambiente local.

---
> **Impacto**: O sistema reduz emissões de CO2 através da monitorização de inatividade e otimiza a manutenção preditiva, poupando milhares de euros em reparações de emergência.
