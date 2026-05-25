# MEMORIA - Strategic Backlog Snapshot

> Brainstorm e backlog estrategico. Nao usar como fonte de estado atual.

---

## ðŸš€ BRAINSTORM: UPGRADE MANUTENÃ‡ÃƒO (21/04/2026)
Brainstorm focado no refinamento do mÃ³dulo de ManutenÃ§Ã£o apÃ³s auditoria v3.0.

### 1. Galeria de Fotos "Antes & Depois" (APROVADO âœ…)
- **Ideia**: No modal de detalhe da manutenÃ§Ã£o, incluir uma galeria para ver fotos reais submetidas no terreno.
- **Contexto**: Aumenta a confianÃ§a na auditoria e prova a execuÃ§Ã£o do serviÃ§o.

### 2. Modo Offline-Total para Mobile Hub (EM ANÃLISE ðŸŸ¡)
- **Ideia**: Permitir o funcionamento total sem rede em caves/obras remotas, com sync via Service Workers.
- **PrÃ³ximo Passo**: Questionar viabilidade tÃ©cnica ao Executor (Claude).

### 3. Ideias Descartadas (BACKLOG MORTO âŒ)
- **NFC Tagging**: Descartado por incompatibilidade de hardware (mÃ¡quinas usam RFID em banda distinta do telemÃ³vel).
- **Health Score / Dashboard PoluÃ­do**: Descartado para manter a UI limpa e focar no que Ã© essencial.
- **NotificaÃ§Ãµes Push**: Descartado pela complexidade vs. valor acrescentado na demo atual.

---

## ðŸš€ BRAINSTORM: INDUSTRIALIZAÃ‡ÃƒO (16/04/2026)

Este brainstorm surgiu durante a auditoria de conclusÃ£o da Fase 5 (ManutenÃ§Ã£o) e foca na transiÃ§Ã£o para um ambiente de produÃ§Ã£o real.

### 1. Auditoria e Rastreabilidade (Audit Trail)
- **O Problema**: Atualmente, qualquer Admin pode mudar o custo do diesel ou fator CO2 sem deixar rasto.
- **A SoluÃ§Ã£o**: Implementar `settings/system/audit_log`. 
- **Contexto**: CrÃ­tico para conformidade com a norma ISO 55001 (GestÃ£o de Ativos).

### 2. Blindagem de AutenticaÃ§Ã£o (PIN Gate)
- **O Problema**: PINs de 4 dÃ­gitos sÃ£o vulnerÃ¡veis a bruteforce client-side.
- **A SoluÃ§Ã£o**: Migrar `loginWithPasscode` para uma Cloud Function v2 com Rate Limiting por IP/User.
- **Notas**: Considerar migraÃ§Ã£o total para Firebase Auth Custom Tokens no futuro.

### 3. ResiliÃªncia "Offline-First"
- **O Problema**: Operadores em obras remotas perdem acesso ao Mobile Hub sem rede.
- **A SoluÃ§Ã£o**: Hash de PIN guardado em cache local (via Service Worker) para permitir operaÃ§Ãµes bÃ¡sicas (Login/Reporte Avaria) em modo offline, com sync automÃ¡tico de volta Ã  rede.

### 4. Escalabilidade de BI (KPI Pre-calculation)
- **O Problema**: Dashboard recalcula tudo client-side. Com 500+ mÃ¡quinas, a performance serÃ¡ degradada.
- **A SoluÃ§Ã£o**: Scheduled Function que corre Ã  meia-noite e guarda os KPIs do dia anterior em `analytics/daily_stats`. O dashboard passarÃ¡ a ler um documento estÃ¡tico em vez de filtrar milhares de sessÃµes.

---

## ðŸ“‚ HISTÃ“RICO DE IDEIAS RASCUNHADAS

### Sistema de Login Seguro (V1.1)
- **Status**: Planeado para Fase 6.
- **LÃ³gica**: Teclado numÃ©rico customizado no frontend para evitar auto-complete do browser e manter a estÃ©tica industrial.

### SincronizaÃ§Ã£o em Massa (LocalizaÃ§Ã£o)
- **Status**: Em anÃ¡lise para Sprint de Higiene.
- **Ideia**: SeleÃ§Ã£o mÃºltipla na MaquinasView para mover frota inteira de uma obra para outra num Ãºnico batch.

---

## ðŸ›ï¸ ARQUIVO MORTO / REVERTIDO
- **LoginView Direct Injection**: Tentativa de implementaÃ§Ã£o na Fase 5 sem autorizaÃ§Ã£o (revertido para manter integridade do protocolo). Fica como liÃ§Ã£o para separaÃ§Ã£o clara entre Mapeamento e ExecuÃ§Ã£o.
