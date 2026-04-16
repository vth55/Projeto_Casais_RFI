# ☁️ Backend_Cloud - Camada de Dados & Lógica

Este módulo contém toda a inteligência do lado do servidor do *Casais Fleet Intelligence*, utilizando Firebase Cloud Functions e Firestore.

---

## 🛠️ Tecnologias
- **Node.js 20+** (Firebase Functions v2)
- **Firestore** (Database NoSQL)
- **Firebase Auth** (Gestão de Identidade)

---

## 📂 Estrutura de Pastas
- `functions/`: Código fonte das funções.
  - `index.js`: Ponto de entrada e triggers Firestore.
  - `procore/`: Módulos de integração com o ERP Procore.
    - `procoreBridge.js`: Lógica de autenticação OAuth2 e proxies.
    - `procoreScheduler.js`: Tarefas agendadas (Writeback Diário).
    - `procoreSessionExporter.js`: Transformação de dados Locais -> Procore.
- `public/`: Assets estáticos e configuração do Hosting.

---

## 🚀 Principais Funções

### `handleSessionTrigger` (O Motor)
Escuta eventos de escrita no Firestore para abrir/fechar sessões de trabalho via RFID/NFC. Calcula durações, custos e emissões de CO2 em tempo real.

### `procoreDailyWriteback` (Cron)
Executada diariamente às 23:30. Agrupa a atividade do dia e exporta para o Procore como:
1. **Daily Logs**: Registos de obra.
2. **Cost Entries**: Custos de combustível.

### `processValidation`
Lida com a correção de dados feita pelos operadores via link de email (rota `/validar/:token`).

---

## 📦 Deploy
Para enviar alterações para a cloud:
```bash
firebase deploy --only functions
```

---
> **Nota de Arquitetura**: As funções estão projetadas para serem idempotentes, garantindo que falhas de rede ou re-processamentos não dupliquem dados no Procore ou no ERP.
