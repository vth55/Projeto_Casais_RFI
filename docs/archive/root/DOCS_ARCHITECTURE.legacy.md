# CASAIS FLEET INTELLIGENCE - Legacy Architecture Snapshot

> Snapshot arquitetural historico. Cruzar sempre com docs/architecture/, docs/standards/ e o codigo atual.

**Projeto:** Sistema de GestÃ£o Inteligente de Frotas  
**Cliente:** Grupo Casais (Curso Tecnologias AvanÃ§adas de ConstruÃ§Ã£o)  
**Data:** Dezembro 2024 (EvoluÃ§Ã£o Industrial Abr 2026)  
**Higiene:** âœ… Hardware legado e simuladores removidos  
**VersÃ£o:** v1.2.0-stable

---

## ðŸŽ¯ VISÃƒO GERAL DO PROJETO

Sistema Full-Stack PWA para gerir frotas de mÃ¡quinas de construÃ§Ã£o, combinando mÃ¡quinas "antigas" (retrofit com RFID) e mÃ¡quinas modernas (com GPS e CAN Bus).

**Objetivo Principal:** Rastrear utilizaÃ§Ã£o de equipamentos, cÃ¡lculo de custos financeiros (â‚¬/h) e emissÃµes de COâ‚‚, e prever necessidades de manutenÃ§Ã£o baseado em **horas reais de uso**.

---

## ðŸ—ï¸ ARQUITETURA DO SISTEMA

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    MÃQUINAS NO TERRENO                      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                             â”‚
â”‚  MÃ³vel: PWA (NFC Nativo)                                    â”‚
â”‚  â”œâ”€ Smartphone lÃª TAG NFC                                   â”‚
â”‚  â””â”€ Envia via API â†’ Cloud Functions                         â”‚
â”‚                                                             â”‚
â”‚  Fixo: Arduino Uno + PC (Retrofit)                          â”‚
â”‚  â”œâ”€ Arduino lÃª RFID                                         â”‚
â”‚  â””â”€ Ponte Serial â†’ Cloud Functions                          â”‚
â”‚                                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  FIREBASE CLOUD (BACKEND)                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                             â”‚
â”‚  Cloud Function: handleSessionTrigger                       â”‚
â”‚  â”œâ”€ Verifica se cartÃ£o estÃ¡ registado                     â”‚
â”‚  â”œâ”€ START / STOP / SWITCH (Troca de operador)             â”‚
â”‚  â”œâ”€ Guarda em scan_buffer/latest (auto-fill)              â”‚
â”‚  â””â”€ Grava logs de tentativas nÃ£o autorizadas               â”‚
â”‚                                                             â”‚
â”‚  Cloud Function: procoreResiliencyEngine                    â”‚
â”‚  â”œâ”€ procoreDailyWriteback (Sync agendado de backup)         â”‚
â”‚  â”œâ”€ procoreExportRetry (RecuperaÃ§Ã£o de falhas de rede)       â”‚
â”‚  â””â”€ onSessionCorrected (Auto-export apÃ³s ediÃ§Ã£o manual)     â”‚
â”‚                                                             â”‚
â”‚  Firestore Database:                                        â”‚
â”‚  â”œâ”€ operators/ (cartÃµes registados)                        â”‚
â”‚  â”œâ”€ machines/ (equipamentos)                               â”‚
â”‚  â”œâ”€ sessions/ (registos de utilizaÃ§Ã£o)                     â”‚
â”‚  â”œâ”€ scan_buffer/latest (para auto-fill)                    â”‚
â”‚  â””â”€ unregistered_scans/ (logs de seguranÃ§a)                â”‚
â”‚                                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  FRONTEND (REACT PWA)                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                             â”‚
â”‚  Dashboard:                                                 â”‚
â”‚  â”œâ”€ Filtros de data (Hoje/Semana/MÃªs)                     â”‚
â”‚  â”œâ”€ MÃ©tricas de emissÃµes COâ‚‚                              â”‚
â”‚  â”œâ”€ Alertas de manutenÃ§Ã£o preditiva                       â”‚
â”‚  â””â”€ Export CSV com nomes reais                            â”‚
â”‚                                                             â”‚
â”‚  Operadores:                                                â”‚
â”‚  â”œâ”€ Auto-fill via scan_buffer/latest                      â”‚
â”‚  â”œâ”€ Lista de operadores registados                        â”‚
â”‚  â””â”€ Remover operadores                                     â”‚
â”‚                                                             â”‚
â”‚  ConfiguraÃ§Ã£o:                                              â”‚
â”‚  â”œâ”€ Alertas de manutenÃ§Ã£o (por horas)                     â”‚
â”‚  â””â”€ Configurar consumo (L/h) por mÃ¡quina                  â”‚
â”‚                                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ”‘ FUNCIONALIDADES PRINCIPAIS

### 1. **Scan-to-Register (Auto-Fill)**
**Como funciona:**
- Passa um cartÃ£o nÃ£o registado no leitor
- Backend retorna erro 403 (Acesso Negado)
- Backend escreve ID em `scan_buffer/latest`
- Frontend escuta esse documento em tempo real
- Campo "ID do CartÃ£o" Ã© preenchido automaticamente
- **NinguÃ©m precisa digitar IDs manualmente!**

**CÃ³digo relevante:**
- Backend: `Backend_Cloud/functions/index.js` (linha ~38)
- Frontend: `Frontend_App/dashboard/src/views/OperatorsView.jsx` (linha ~12)

---

### 2. **GestÃ£o de SessÃµes (START/STOP)**
**Como funciona:**
- 1Âº scan do cartÃ£o â†’ **START** sessÃ£o (mÃ¡quina fica ATIVA)
- 2Âº scan do mesmo cartÃ£o â†’ **STOP** sessÃ£o (calcula duraÃ§Ã£o)
- 1Âº scan de um **DIFERENTE** cartÃ£o (com sessÃ£o aberta) â†’ **SWITCH** (fecha a anterior e abre a nova automaticamente)
- DuraÃ§Ã£o calculada em horas (precisa ao segundo)
- Horas somadas ao `totalHours` da mÃ¡quina

**Regras de NegÃ³cio & SeguranÃ§a:**
- SÃ³ operadores registados podem iniciar sessÃµes.
- **Automatic Switch:** Um novo operador pode interromper uma sessÃ£o ativa; o sistema fecha a anterior (`closeMethod: SWITCH`) e abre a nova sequencialmente.
- **CÃ¡lculo de Custos:** Cada sessÃ£o Ã© vinculada ao tarifÃ¡rio em vigor na mÃ¡quina no momento do scan (ver secÃ§Ã£o 10).
- CartÃµes nÃ£o registados sÃ£o bloqueados (403) e registados em `scan_buffer`.

---

### 3. **LÃ³gica de TarifÃ¡rios (GestÃ£o de Custos)**
O sistema utiliza tarifÃ¡rios versionados para garantir auditoria histÃ³rica.
- **SÃ³ MÃ¡quina**: CombustÃ­vel, manutenÃ§Ã£o e depreciaÃ§Ã£o.
- **MÃ¡quina + Operador**: Inclui o custo proporcional de mÃ£o-de-obra.
- **Versionamento**: O Firestore guarda o `currentTariff` e um `tariffHistory[]`. SessÃµes fechadas guardam um *snapshot* do tarifÃ¡rio usado para evitar alteraÃ§Ãµes retroativas indevidas.

---

### 3. **LEDs de Status FÃ­sicos**

**IMPORTANTE: Isto Ã© SUPER FÃCIL de montar!**

**Material necessÃ¡rio (por mÃ¡quina):**
- 3 LEDs: 1 Verde, 1 Amarelo, 1 Vermelho
- 3 Resistores de 220Î©
- Fios jumper
- Breadboard (opcional, facilita)

**LigaÃ§Ã£o no Arduino Uno:**
```
Arduino Pino 5 â†’ Resistor 220Î© â†’ LED VERDE (perna longa +) â†’ GND
Arduino Pino 6 â†’ Resistor 220Î© â†’ LED AMARELO (perna longa +) â†’ GND
Arduino Pino 7 â†’ Resistor 220Î© â†’ LED VERMELHO (perna longa +) â†’ GND
```

**O que cada LED significa:**
| LED | Estado | Significado |
|-----|--------|-------------|
| ðŸŸ¡ Amarelo (fixo) | Standby | A aguardar cartÃ£o |
| ðŸŸ¡ Amarelo (pisca 2x) | Leitura | CartÃ£o detetado |
| ðŸŸ¢ Verde (fixo 2s) | Sucesso | SessÃ£o INICIADA |
| ðŸŸ¢ Verde (pisca 3x) | Sucesso | SessÃ£o ENCERRADA |
| ðŸ”´ Vermelho (fixo 3s) | Erro | CartÃ£o NÃƒO REGISTADO |
| ðŸ”´ Vermelho (pisca 1x) | Erro | Falha de comunicaÃ§Ã£o |

**CÃ³digo relevante:**
- Arduino: `arduino_rfid_simple/arduino_rfid_led.ino`
- Python: `Hardware_Bridge_PC/serial_to_cloud_bridge.py` (linha ~14)

---

### 4. **ManutenÃ§Ã£o Preditiva (A "LÃ³gica Vitor")**

**Conceito:**
ManutenÃ§Ã£o baseada em **horas reais de utilizaÃ§Ã£o**, nÃ£o em datas de calendÃ¡rio.

**NÃ­veis de Alerta:**
- **Verde:** < 90h (60% de 150h) - OK
- **Azul:** 90h - 119h (60%-79%) - Acompanhar
- **Laranja:** 120h - 149h (80%-99%) - ManutenÃ§Ã£o Preventiva Recomendada
- **Vermelho:** â‰¥ 150h (100%+) - **MANUTENÃ‡ÃƒO URGENTE**

**Threshold ConfigurÃ¡vel:**
- Default: 150 horas
- Podes alterar em `Frontend_App/dashboard/src/components/MaintenanceAlert.jsx`

**Onde ver:**
- Menu "ConfiguraÃ§Ã£o" â†’ SecÃ§Ã£o "Estado de ManutenÃ§Ã£o"
- Cada mÃ¡quina tem uma barra de progresso

**CÃ³digo relevante:**
- Componente: `Frontend_App/dashboard/src/components/MaintenanceAlert.jsx`
- Vista: `Frontend_App/dashboard/src/views/SettingsView.jsx`

---

### 5. **CÃ¡lculo de EmissÃµes de COâ‚‚**

**FÃ³rmula:**
```
COâ‚‚ (kg) = Horas Ã— Consumo (L/h) Ã— 2.68 kg/L
```

**Consumo DinÃ¢mico:**
- Cada mÃ¡quina tem um `consumptionRate` prÃ³prio
- ConfigurÃ¡vel em "ConfiguraÃ§Ã£o" â†’ Campo de consumo
- **NÃ£o hÃ¡ valores fixos!** Admin define por mÃ¡quina.

**Fator de EmissÃ£o:**
- Diesel: 2.68 kg COâ‚‚ por litro queimado
- Definido em: `Frontend_App/dashboard/src/utils/formatters.js`

**Alertas:**
- Se emissÃµes totais > 500kg, aparece alerta laranja/vermelho
- StatCard de COâ‚‚ muda de cor automaticamente

**CÃ³digo relevante:**
- CÃ¡lculo: `Frontend_App/dashboard/src/utils/formatters.js` (linha 3)
- Alertas: `Frontend_App/dashboard/src/views/DashboardView.jsx` (linha ~20)

---

### 6. **Filtros de Data e Business Intelligence**

**Filtros DisponÃ­veis:**
- **Tudo:** Todas as sessÃµes
- **Hoje:** SessÃµes iniciadas hoje
- **Esta Semana:** Ãšltimos 7 dias
- **Este MÃªs:** Ãšltimos 30 dias

**MÃ©tricas Calculadas:**
- Total de sessÃµes no perÃ­odo
- Horas totais de operaÃ§Ã£o
- MÃ¡quinas Ãºnicas utilizadas
- Operadores Ãºnicos ativos
- **EficiÃªncia:** (Horas trabalhadas / Horas disponÃ­veis) Ã— 100%

**EficiÃªncia por perÃ­odo (Taxa de UtilizaÃ§Ã£o):**
- **FÃ³rmula:** `(Horas Trabalhadas (CLOSED) / (NÂº MÃ¡quinas Ã— Horas Ãšteis no PerÃ­odo)) Ã— 100`
- **Capacidade Base:** 8h/dia, apenas dias Ãºteis (Segunda a Sexta).
- **CÃ¡lculo de Dias:** DinÃ¢mico via `getPeriodCapacityHours()` no store.
- **Hoje:** 8h disponÃ­veis.
- **Semana:** Max 40h (5 dias Ã— 8h).
- **MÃªs:** Baseado nos dias Ãºteis decorridos atÃ© Ã  data atual.

**CÃ³digo relevante:**
- Filtros: `Frontend_App/dashboard/src/utils/dateFilters.js`
- Componente: `Frontend_App/dashboard/src/components/DateFilter.jsx`

---

### 7. **ExportaÃ§Ã£o CSV Profissional**

**O que exporta:**

**SessÃµes:**
- Equipamento
- **Nome do operador** (nÃ£o ID do cartÃ£o!)
- ID do cartÃ£o (para auditoria)
- Data/Hora de inÃ­cio
- Data/Hora de fim
- DuraÃ§Ã£o (horas)
- Estado (Ativa/ConcluÃ­da)

**MÃ¡quinas:**
- ID da mÃ¡quina
- Nome
- Estado (Ativa/Parada)
- Horas totais
- Consumo (L/h)
- EmissÃµes COâ‚‚ (kg)
- Ãšltimo operador

**Encoding:**
- UTF-8 com BOM (abre perfeitamente no Excel portuguÃªs)

**CÃ³digo relevante:**
- `Frontend_App/dashboard/src/utils/exportCSV.js`

---

### 8. **Sistema RBAC Multi-Perfil**
**Como funciona:**
- **5 NÃ­veis de Acesso:** Admin, IT, Encarregado de Obra, TÃ©cnico de ManutenÃ§Ã£o e Operador.
- **Roteamento Inteligente:** O ecrÃ£ "Dashboard" adapta-se Ã  funÃ§Ã£o do utilizador.
  - Gestores vÃªem rÃ¡cios financeiros globais.
  - TÃ©cnicos de ManutenÃ§Ã£o vÃªem a saÃºde da frota num semÃ¡foro ðŸŸ¢ðŸŸ¡ðŸ”´.
  - Operadores limitam-se ao "Mobile Hub" (BotÃµes grandes para Scan e Reporte de Avaria).
- **SeguranÃ§a da UI:** OcultaÃ§Ã£o de mÃ³dulos sensÃ­veis e da Sidebar baseada unicamente nos privilÃ©gios granulares do perfil.

#### ðŸ” **Contas de Teste (Golden Accounts)**
Para testar os diferentes perfis, utilizar as seguintes credenciais:

| Email | Password | Role / Perfil |
|-------|----------|---------------|
| `vitorhugo22.igrejas@gmail.com` | `999999` | admin |
| `testegestor@fleet.com` | `123456` | gestor_frota |
| `testeencarregado@fleet.com` | `123456` | encarregado_obra |
| `testeoperador@fleet.com` | `123456` | operador |
| `testesustentabilidade@fleet.com` | `123456` | gestor_sustentabilidade |
| `testeviewer@fleet.com` | `123456` | gestor_frota |
| `testefinanceiro@fleet.com` | `123456` | gestor_financeiro |

---

### ðŸŽ¨ **BRAND & VISUAL CONSTRAINTS**
RestriÃ§Ãµes obrigatÃ³rias para a identidade visual do projeto:

- **Cor Principal:** Azul Institucional Casais `#005EB8`.
- **ProibiÃ§Ã£o:** âŒ **NUNCA UTILIZAR ROXO/VIOLETA**.

---
**CÃ³digo relevante:**
- `Frontend_App/dashboard/src/config/permissions.js`
- `Frontend_App/dashboard/src/views/dashboards/DashboardRouter.jsx`

---

## ðŸ“± PWA (Progressive Web App)

**ConfiguraÃ§Ã£o:**
- Manifest: `Frontend_App/dashboard/public/manifest.json`
- Meta tags: `Frontend_App/dashboard/index.html`

**InstalaÃ§Ã£o:**
1. Abre o site no Chrome/Edge (mobile ou desktop)
2. Menu â†’ "Instalar aplicaÃ§Ã£o"
3. Fica como app nativa no dispositivo

**Vantagens:**
- Funciona offline (depois de carregar 1x)
- Sem browser chrome (modo standalone)
- Ãcone no ecrÃ£ inicial
- Optimizado para tablets no terreno

**Para criar Ã­cones:**
- Precisas de `icon-192.png` e `icon-512.png` na pasta `public/`
- Podes usar: https://realfavicongenerator.net/

---

## ðŸš€ COMO FAZER DEPLOY

### **1. Backend (Cloud Functions)**

```bash
cd Backend_Cloud
firebase deploy --only functions
```

**URL da funÃ§Ã£o:**
```
https://handlesessiontrigger-mtaqaropqq-uc.a.run.app
```

**Quando fazer deploy:**
- Sempre que alterares `Backend_Cloud/functions/index.js`
- Demora ~2 minutos

---

### **2. Frontend (Dashboard)**

**Desenvolvimento local:**
```bash
cd Frontend_App/dashboard
npm run dev
```
Abre em: `http://localhost:5173`

**Build para produÃ§Ã£o:**
```bash
npm run build
```

**Deploy (Firebase Hosting):**
```bash
firebase deploy --only hosting
```

---

### **3. Hardware (Arduino)**

**Arduino Uno (com LEDs):**
1. Abre `arduino_rfid_simple/arduino_rfid_led.ino` no Arduino IDE
2. Verifica a porta COM (Ferramentas â†’ Porta)
3. Carrega o cÃ³digo (Upload)
4. **IMPORTANTE:** Fecha o Monitor Serial depois!

---

### **4. Ponte Python (Arduino â†’ Cloud)**

```bash
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

**ConfiguraÃ§Ã£o:**
- Porta COM: Linha 7 de `serial_to_cloud_bridge.py`
- Default: `COM4`
- Verifica no Gestor de Dispositivos se mudou

**Para parar:**
- `Ctrl + C`

---

## ðŸ“‚ ESTRUTURA DE PASTAS

```
Projeto_Casais_RFI/
â”‚
â”œâ”€â”€ arduino_rfid_simple/
â”‚   â”œâ”€â”€ arduino_rfid_simple.ino          (SEM LEDs - original)
â”‚   â””â”€â”€ arduino_rfid_led.ino             (COM LEDs - usar este!)
â”‚
â”œâ”€â”€ Backend_Cloud/
â”‚   â”œâ”€â”€ functions/
â”‚   â”‚   â””â”€â”€ index.js                     (LÃ³gica do servidor)
â”‚   â”œâ”€â”€ firebase.json
â”‚   â””â”€â”€ .firebaserc
â”‚
â”œâ”€â”€ Frontend_App/
â”‚   â””â”€â”€ dashboard/
â”‚       â”œâ”€â”€ src/
â”‚       â”‚   â”œâ”€â”€ components/              (Componentes reutilizÃ¡veis)
â”‚       â”‚   â”‚   â”œâ”€â”€ DateFilter.jsx       (Filtro de datas)
â”‚       â”‚   â”‚   â”œâ”€â”€ MaintenanceAlert.jsx (Alertas de manutenÃ§Ã£o)
â”‚       â”‚   â”‚   â”œâ”€â”€ SidebarItem.jsx
â”‚       â”‚   â”‚   â”œâ”€â”€ StatCard.jsx
â”‚       â”‚   â”‚   â”œâ”€â”€ StatusBadge.jsx
â”‚       â”‚   â”‚   â””â”€â”€ Toast.jsx            (NotificaÃ§Ãµes)
â”‚       â”‚   â”‚
â”‚       â”‚   â”œâ”€â”€ config/
â”‚       â”‚   â”‚   â””â”€â”€ firebase.js          (ConfiguraÃ§Ã£o Firebase)
â”‚       â”‚   â”‚
â”‚       â”‚   â”œâ”€â”€ utils/
â”‚       â”‚   â”‚   â”œâ”€â”€ dateFilters.js       (Filtros de data)
â”‚       â”‚   â”‚   â”œâ”€â”€ exportCSV.js         (ExportaÃ§Ã£o)
â”‚       â”‚   â”‚   â”œâ”€â”€ formatters.js        (COâ‚‚, duraÃ§Ã£o)
â”‚       â”‚   â”‚   â””â”€â”€ telemetryParser.js   (GPS/CAN Bus - futuro)
â”‚       â”‚   â”‚
â”‚       â”‚   â”œâ”€â”€ views/
â”‚       â”‚   â”‚   â”œâ”€â”€ DashboardView.jsx    (Dashboard principal)
â”‚       â”‚   â”‚   â”œâ”€â”€ OperatorsView.jsx    (Registo de operadores)
â”‚       â”‚   â”‚   â””â”€â”€ SettingsView.jsx     (ConfiguraÃ§Ã£o)
â”‚       â”‚   â”‚
â”‚       â”‚   â”œâ”€â”€ App.jsx                  (Layout principal)
â”‚       â”‚   â”œâ”€â”€ index.css                (Estilos globais)
â”‚       â”‚   â””â”€â”€ main.jsx                 (Entry point)
â”‚       â”‚
â”‚       â”œâ”€â”€ public/
â”‚       â”‚   â””â”€â”€ manifest.json            (PWA manifest)
â”‚       â”‚
â”‚       â”œâ”€â”€ index.html
â”‚       â”œâ”€â”€ package.json
â”‚       â””â”€â”€ vite.config.js
â”‚
â”œâ”€â”€ Hardware_Bridge_PC/
â”‚   â””â”€â”€ serial_to_cloud_bridge.py        (Arduino â†’ Cloud)
â”‚
â””â”€â”€ DOCS_ARCHITECTURE.md                 (Este ficheiro!)
```

---

## ðŸ”§ CONFIGURAÃ‡Ã•ES IMPORTANTES

### **Firestore Database (Estrutura)**

```
artifacts/
â””â”€â”€ casais-rfid/
    â””â”€â”€ public/
        â””â”€â”€ data/
            â”œâ”€â”€ operators/              (CartÃµes registados)
            â”‚   â””â”€â”€ {cardId}/
            â”‚       â”œâ”€â”€ name: string
            â”‚       â””â”€â”€ registeredAt: timestamp
            â”‚
            â”œâ”€â”€ machines/               (Equipamentos)
            â”‚   â””â”€â”€ {machineId}/
            â”‚       â”œâ”€â”€ name: string
            â”‚       â”œâ”€â”€ status: "ACTIVE" | "IDLE"
            â”‚       â”œâ”€â”€ totalHours: number
            â”‚       â”œâ”€â”€ consumptionRate: number
            â”‚       â””â”€â”€ lastOperator: string
            â”‚
            â”œâ”€â”€ sessions/               (SessÃµes de trabalho)
            â”‚   â””â”€â”€ {autoId}/
            â”‚       â”œâ”€â”€ cardId: string
            â”‚       â”œâ”€â”€ machineId: string
            â”‚       â”œâ”€â”€ startTime: timestamp
            â”‚       â”œâ”€â”€ endTime: timestamp | null
            â”‚       â”œâ”€â”€ durationHours: number
            â”‚       â””â”€â”€ status: "OPEN" | "CLOSED"
            â”‚
            â”œâ”€â”€ scan_buffer/            (Buffer para auto-fill)
            â”‚   â””â”€â”€ latest/
            â”‚       â”œâ”€â”€ cardId: string
            â”‚       â”œâ”€â”€ machineId: string
            â”‚       â””â”€â”€ timestamp: timestamp
            â”‚
            â””â”€â”€ unregistered_scans/     (Logs de seguranÃ§a)
                â””â”€â”€ {cardId}/
                    â”œâ”€â”€ id: string
                    â”œâ”€â”€ machineId: string
                    â”œâ”€â”€ timestamp: timestamp
                    â”œâ”€â”€ type: "access_attempt"
                    â””â”€â”€ resolved: boolean
```

---

## ðŸ› TROUBLESHOOTING

### **Problema: Arduino nÃ£o comunica com Python**
**SoluÃ§Ãµes:**
1. Fecha o Monitor Serial do Arduino IDE (obrigatÃ³rio!)
2. Verifica a porta COM no Gestor de Dispositivos
3. Edita `serial_to_cloud_bridge.py` linha 7 com a porta correta
4. Testa com: `python -m serial.tools.list_ports`

### **Problema: Frontend nÃ£o atualiza em tempo real**
**SoluÃ§Ãµes:**
1. Verifica console do browser (F12) - hÃ¡ erros?
2. Confirma que estÃ¡ ligado ao Firebase (Ã­cone "LIGAÃ‡ÃƒO ATIVA")
3. Verifica Regras do Firestore (devem permitir leitura pÃºblica)

### **Problema: CartÃ£o nÃ£o Ã© reconhecido**
**SoluÃ§Ãµes:**
1. Verifica se estÃ¡ registado em "Operadores"
2. VÃª os logs no terminal do Python
3. Verifica logs do Backend: `firebase functions:log`
4. ID do cartÃ£o estÃ¡ em MAIÃšSCULAS?

### **Problema: LEDs nÃ£o funcionam**
**SoluÃ§Ãµes:**
1. Verifica ligaÃ§Ãµes (pino correto + resistor + GND)
2. Testa LED diretamente: `digitalWrite(LED_GREEN, HIGH);` no setup()
3. Confirma que estÃ¡s a usar o cÃ³digo `_led.ino` (nÃ£o o original)
4. Resistor de 220Î© estÃ¡ ligado?

---

## ðŸ“Š MÃ‰TRICAS E LIMITES

| MÃ©trica | Valor | Onde alterar |
|---------|-------|--------------|
| Limite de manutenÃ§Ã£o | 150 horas | `MaintenanceAlert.jsx` linha 8 |
| Limite de COâ‚‚ | 500 kg | `DashboardView.jsx` linha 23 |
| Fator de emissÃ£o Diesel | 2.68 kg/L | `formatters.js` linha 1 |
| Timeout de scan (Arduino) | 5 segundos | `arduino_rfid_led.ino` linha 61 |
| Timeout HTTP (PWA) | 10 segundos | `api/session` (Cloud Function) |

---

## ðŸ”® FUTURO (FUNCIONALIDADES PREPARADAS)

### **GPS (LocalizaÃ§Ã£o em tempo real)**
- Estrutura de dados jÃ¡ preparada
- Parser em: `utils/telemetryParser.js`

### **CAN Bus (DiagnÃ³sticos do motor)**
- Parser em: `utils/telemetryParser.js`
- MÃ©tricas suportadas:
  - RPM do motor
  - Temperatura
  - NÃ­vel de combustÃ­vel (mediÃ§Ã£o real!)
  - PressÃ£o do Ã³leo
  - CÃ³digos de erro (DTC)

### **Mapa de Frotas**
- Mostrar mÃ¡quinas no Google Maps
- Trilhos de movimento
- Geofencing (alertas se sair da obra)

---

## ðŸ“ž CONTACTOS E LINKS

**Firebase Console:**
https://console.firebase.google.com/project/casais-rfid

**Cloud Function URL:**
https://handlesessiontrigger-mtaqaropqq-uc.a.run.app

**Firestore Database:**
Console â†’ Firestore Database

**RepositÃ³rio (se tiveres):**
_Adiciona aqui o link do GitHub_

---

## âœ… CHECKLIST ANTES DE APRESENTAR

- [ ] Backend deployado (`firebase deploy --only functions`)
- [ ] Frontend a correr (`npm run dev`)
- [ ] Python bridge ligado
- [ ] Arduino com cÃ³digo dos LEDs carregado
- [ ] LEDs montados e a funcionar
- [ ] Pelo menos 2 operadores registados
- [ ] Pelo menos 1 mÃ¡quina com consumo configurado
- [ ] Fazer 2-3 sessÃµes de teste (START/STOP)
- [ ] Testar cartÃ£o nÃ£o registado (deve ficar vermelho)
- [ ] Testar export CSV
- [ ] Testar filtros de data
- [ ] Verificar alertas de manutenÃ§Ã£o

---

## ðŸŽ“ CONCEITOS IMPORTANTES PARA EXPLICAR NA APRESENTAÃ‡ÃƒO

1. **ManutenÃ§Ã£o Preditiva:** Baseada em horas reais, nÃ£o datas fixas
2. **Consumo DinÃ¢mico:** Cada mÃ¡quina Ã© diferente, admin configura
3. **Scan-to-Register:** NinguÃ©m digita IDs, tudo automÃ¡tico
4. **SeguranÃ§a:** CartÃµes nÃ£o registados sÃ£o bloqueados
5. **Logs de Auditoria:** Todas as tentativas ficam guardadas
6. **PWA:** Funciona em tablets no terreno sem app stores
7. **Teste 1 (ResiliÃªncia):** Durante o Beta-Release da Fase 2 do Mobile Hub.

---

**FIM DA DOCUMENTAÃ‡ÃƒO** ðŸ“˜

_Ãšltima atualizaÃ§Ã£o: Dezembro 2024_
_Se tiveres dÃºvidas, relÃª este documento!_

