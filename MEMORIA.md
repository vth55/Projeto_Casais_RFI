# 🧠 MEMORIA - Escritório de Estratégia (Casais RFI)

Este documento guarda o "DNA" das ideias rascunhadas e brainstorms que ainda não estão em implementação, mas que ditam a visão de longo prazo do projeto.

---

## 🚀 BRAINSTORM: UPGRADE MANUTENÇÃO (21/04/2026)
Brainstorm focado no refinamento do módulo de Manutenção após auditoria v3.0.

### 1. Galeria de Fotos "Antes & Depois" (APROVADO ✅)
- **Ideia**: No modal de detalhe da manutenção, incluir uma galeria para ver fotos reais submetidas no terreno.
- **Contexto**: Aumenta a confiança na auditoria e prova a execução do serviço.

### 2. Modo Offline-Total para Mobile Hub (EM ANÁLISE 🟡)
- **Ideia**: Permitir o funcionamento total sem rede em caves/obras remotas, com sync via Service Workers.
- **Próximo Passo**: Questionar viabilidade técnica ao Executor (Claude).

### 3. Ideias Descartadas (BACKLOG MORTO ❌)
- **NFC Tagging**: Descartado por incompatibilidade de hardware (máquinas usam RFID em banda distinta do telemóvel).
- **Health Score / Dashboard Poluído**: Descartado para manter a UI limpa e focar no que é essencial.
- **Notificações Push**: Descartado pela complexidade vs. valor acrescentado na demo atual.

---

## 🚀 BRAINSTORM: INDUSTRIALIZAÇÃO (16/04/2026)

Este brainstorm surgiu durante a auditoria de conclusão da Fase 5 (Manutenção) e foca na transição para um ambiente de produção real.

### 1. Auditoria e Rastreabilidade (Audit Trail)
- **O Problema**: Atualmente, qualquer Admin pode mudar o custo do diesel ou fator CO2 sem deixar rasto.
- **A Solução**: Implementar `settings/system/audit_log`. 
- **Contexto**: Crítico para conformidade com a norma ISO 55001 (Gestão de Ativos).

### 2. Blindagem de Autenticação (PIN Gate)
- **O Problema**: PINs de 4 dígitos são vulneráveis a bruteforce client-side.
- **A Solução**: Migrar `loginWithPasscode` para uma Cloud Function v2 com Rate Limiting por IP/User.
- **Notas**: Considerar migração total para Firebase Auth Custom Tokens no futuro.

### 3. Resiliência "Offline-First"
- **O Problema**: Operadores em obras remotas perdem acesso ao Mobile Hub sem rede.
- **A Solução**: Hash de PIN guardado em cache local (via Service Worker) para permitir operações básicas (Login/Reporte Avaria) em modo offline, com sync automático de volta à rede.

### 4. Escalabilidade de BI (KPI Pre-calculation)
- **O Problema**: Dashboard recalcula tudo client-side. Com 500+ máquinas, a performance será degradada.
- **A Solução**: Scheduled Function que corre à meia-noite e guarda os KPIs do dia anterior em `analytics/daily_stats`. O dashboard passará a ler um documento estático em vez de filtrar milhares de sessões.

---

## 📂 HISTÓRICO DE IDEIAS RASCUNHADAS

### Sistema de Login Seguro (V1.1)
- **Status**: Planeado para Fase 6.
- **Lógica**: Teclado numérico customizado no frontend para evitar auto-complete do browser e manter a estética industrial.

### Sincronização em Massa (Localização)
- **Status**: Em análise para Sprint de Higiene.
- **Ideia**: Seleção múltipla na MaquinasView para mover frota inteira de uma obra para outra num único batch.

---

## 🏛️ ARQUIVO MORTO / REVERTIDO
- **LoginView Direct Injection**: Tentativa de implementação na Fase 5 sem autorização (revertido para manter integridade do protocolo). Fica como lição para separação clara entre Mapeamento e Execução.
