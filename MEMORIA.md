# 🧠 MEMORIA - Escritório de Estratégia (Casais RFI)

Este documento guarda o "DNA" das ideias rascunhadas e brainstorms que ainda não estão em implementação, mas que ditam a visão de longo prazo do projeto.

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
