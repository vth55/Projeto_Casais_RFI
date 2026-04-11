# 📘 CASAIS FLEET INTELLIGENCE - Documentação Completa

**Projeto:** Sistema de Gestão Inteligente de Frotas  
**Cliente:** Grupo Casais (Curso Tecnologias Avançadas de Construção)  
**Data:** Dezembro 2024 (Evolução Industrial Abr 2026)  
**Higiene:** ✅ Hardware legado e simuladores removidos  
**Versão:** v1.1.0-stable

---

## 🎯 VISÃO GERAL DO PROJETO

Sistema Full-Stack PWA para gerir frotas de máquinas de construção, combinando máquinas "antigas" (retrofit com RFID) e máquinas modernas (com GPS e CAN Bus).

**Objetivo Principal:** Rastrear utilização de equipamentos, calcular emissões de CO₂, e prever necessidades de manutenção baseado em **horas reais de uso** (não datas fixas).

---

## 🏗️ ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                    MÁQUINAS NO TERRENO                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Móvel: PWA (NFC Nativo)                                    │
│  ├─ Smartphone lê TAG NFC                                   │
│  └─ Envia via API → Cloud Functions                         │
│                                                             │
│  Fixo: Arduino Uno + PC (Retrofit)                          │
│  ├─ Arduino lê RFID                                         │
│  └─ Ponte Serial → Cloud Functions                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  FIREBASE CLOUD (BACKEND)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cloud Function: handleSessionTrigger                       │
│  ├─ Verifica se cartão está registado                     │
│  ├─ START sessão (1º scan) / STOP sessão (2º scan)        │
│  ├─ Guarda em scan_buffer/latest (auto-fill)              │
│  └─ Grava logs de tentativas não autorizadas               │
│                                                             │
│  Firestore Database:                                        │
│  ├─ operators/ (cartões registados)                        │
│  ├─ machines/ (equipamentos)                               │
│  ├─ sessions/ (registos de utilização)                     │
│  ├─ scan_buffer/latest (para auto-fill)                    │
│  └─ unregistered_scans/ (logs de segurança)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (REACT PWA)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Dashboard:                                                 │
│  ├─ Filtros de data (Hoje/Semana/Mês)                     │
│  ├─ Métricas de emissões CO₂                              │
│  ├─ Alertas de manutenção preditiva                       │
│  └─ Export CSV com nomes reais                            │
│                                                             │
│  Operadores:                                                │
│  ├─ Auto-fill via scan_buffer/latest                      │
│  ├─ Lista de operadores registados                        │
│  └─ Remover operadores                                     │
│                                                             │
│  Configuração:                                              │
│  ├─ Alertas de manutenção (por horas)                     │
│  └─ Configurar consumo (L/h) por máquina                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 FUNCIONALIDADES PRINCIPAIS

### 1. **Scan-to-Register (Auto-Fill)**
**Como funciona:**
- Passa um cartão não registado no leitor
- Backend retorna erro 403 (Acesso Negado)
- Backend escreve ID em `scan_buffer/latest`
- Frontend escuta esse documento em tempo real
- Campo "ID do Cartão" é preenchido automaticamente
- **Ninguém precisa digitar IDs manualmente!**

**Código relevante:**
- Backend: `Backend_Cloud/functions/index.js` (linha ~38)
- Frontend: `Frontend_App/dashboard/src/views/OperatorsView.jsx` (linha ~12)

---

### 2. **Gestão de Sessões (START/STOP)**
**Como funciona:**
- 1º scan do cartão → **START** sessão (máquina fica ATIVA)
- 2º scan do mesmo cartão → **STOP** sessão (calcula duração)
- Duração calculada em horas (precisa ao segundo)
- Horas somadas ao `totalHours` da máquina

**Regras de Segurança:**
- Só operadores registados podem iniciar sessões
- Apenas o operador que iniciou pode parar a sessão
- Cartões não registados são bloqueados (403)

**Código relevante:**
- Backend: `Backend_Cloud/functions/index.js` (linha ~44 em diante)

---

### 3. **LEDs de Status Físicos**

**IMPORTANTE: Isto é SUPER FÁCIL de montar!**

**Material necessário (por máquina):**
- 3 LEDs: 1 Verde, 1 Amarelo, 1 Vermelho
- 3 Resistores de 220Ω
- Fios jumper
- Breadboard (opcional, facilita)

**Ligação no Arduino Uno:**
```
Arduino Pino 5 → Resistor 220Ω → LED VERDE (perna longa +) → GND
Arduino Pino 6 → Resistor 220Ω → LED AMARELO (perna longa +) → GND
Arduino Pino 7 → Resistor 220Ω → LED VERMELHO (perna longa +) → GND
```

**O que cada LED significa:**
| LED | Estado | Significado |
|-----|--------|-------------|
| 🟡 Amarelo (fixo) | Standby | A aguardar cartão |
| 🟡 Amarelo (pisca 2x) | Leitura | Cartão detetado |
| 🟢 Verde (fixo 2s) | Sucesso | Sessão INICIADA |
| 🟢 Verde (pisca 3x) | Sucesso | Sessão ENCERRADA |
| 🔴 Vermelho (fixo 3s) | Erro | Cartão NÃO REGISTADO |
| 🔴 Vermelho (pisca 1x) | Erro | Falha de comunicação |

**Código relevante:**
- Arduino: `arduino_rfid_simple/arduino_rfid_led.ino`
- Python: `Hardware_Bridge_PC/serial_to_cloud_bridge.py` (linha ~14)

---

### 4. **Manutenção Preditiva (A "Lógica Vitor")**

**Conceito:**
Manutenção baseada em **horas reais de utilização**, não em datas de calendário.

**Níveis de Alerta:**
- **Verde:** < 90h (60% de 150h) - OK
- **Azul:** 90h - 119h (60%-79%) - Acompanhar
- **Laranja:** 120h - 149h (80%-99%) - Manutenção Preventiva Recomendada
- **Vermelho:** ≥ 150h (100%+) - **MANUTENÇÃO URGENTE**

**Threshold Configurável:**
- Default: 150 horas
- Podes alterar em `Frontend_App/dashboard/src/components/MaintenanceAlert.jsx`

**Onde ver:**
- Menu "Configuração" → Secção "Estado de Manutenção"
- Cada máquina tem uma barra de progresso

**Código relevante:**
- Componente: `Frontend_App/dashboard/src/components/MaintenanceAlert.jsx`
- Vista: `Frontend_App/dashboard/src/views/SettingsView.jsx`

---

### 5. **Cálculo de Emissões de CO₂**

**Fórmula:**
```
CO₂ (kg) = Horas × Consumo (L/h) × 2.68 kg/L
```

**Consumo Dinâmico:**
- Cada máquina tem um `consumptionRate` próprio
- Configurável em "Configuração" → Campo de consumo
- **Não há valores fixos!** Admin define por máquina.

**Fator de Emissão:**
- Diesel: 2.68 kg CO₂ por litro queimado
- Definido em: `Frontend_App/dashboard/src/utils/formatters.js`

**Alertas:**
- Se emissões totais > 500kg, aparece alerta laranja/vermelho
- StatCard de CO₂ muda de cor automaticamente

**Código relevante:**
- Cálculo: `Frontend_App/dashboard/src/utils/formatters.js` (linha 3)
- Alertas: `Frontend_App/dashboard/src/views/DashboardView.jsx` (linha ~20)

---

### 6. **Filtros de Data e Business Intelligence**

**Filtros Disponíveis:**
- **Tudo:** Todas as sessões
- **Hoje:** Sessões iniciadas hoje
- **Esta Semana:** Últimos 7 dias
- **Este Mês:** Últimos 30 dias

**Métricas Calculadas:**
- Total de sessões no período
- Horas totais de operação
- Máquinas únicas utilizadas
- Operadores únicos ativos
- **Eficiência:** (Horas trabalhadas / Horas disponíveis) × 100%

**Eficiência por período:**
- Hoje: 8h disponíveis
- Semana: 40h disponíveis (5 dias × 8h)
- Mês: 160h disponíveis (20 dias × 8h)

**Código relevante:**
- Filtros: `Frontend_App/dashboard/src/utils/dateFilters.js`
- Componente: `Frontend_App/dashboard/src/components/DateFilter.jsx`

---

### 7. **Exportação CSV Profissional**

**O que exporta:**

**Sessões:**
- Equipamento
- **Nome do operador** (não ID do cartão!)
- ID do cartão (para auditoria)
- Data/Hora de início
- Data/Hora de fim
- Duração (horas)
- Estado (Ativa/Concluída)

**Máquinas:**
- ID da máquina
- Nome
- Estado (Ativa/Parada)
- Horas totais
- Consumo (L/h)
- Emissões CO₂ (kg)
- Último operador

**Encoding:**
- UTF-8 com BOM (abre perfeitamente no Excel português)

**Código relevante:**
- `Frontend_App/dashboard/src/utils/exportCSV.js`

---

## 📱 PWA (Progressive Web App)

**Configuração:**
- Manifest: `Frontend_App/dashboard/public/manifest.json`
- Meta tags: `Frontend_App/dashboard/index.html`

**Instalação:**
1. Abre o site no Chrome/Edge (mobile ou desktop)
2. Menu → "Instalar aplicação"
3. Fica como app nativa no dispositivo

**Vantagens:**
- Funciona offline (depois de carregar 1x)
- Sem browser chrome (modo standalone)
- Ícone no ecrã inicial
- Optimizado para tablets no terreno

**Para criar ícones:**
- Precisas de `icon-192.png` e `icon-512.png` na pasta `public/`
- Podes usar: https://realfavicongenerator.net/

---

## 🚀 COMO FAZER DEPLOY

### **1. Backend (Cloud Functions)**

```bash
cd Backend_Cloud
firebase deploy --only functions
```

**URL da função:**
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

**Build para produção:**
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
2. Verifica a porta COM (Ferramentas → Porta)
3. Carrega o código (Upload)
4. **IMPORTANTE:** Fecha o Monitor Serial depois!

---

### **4. Ponte Python (Arduino → Cloud)**

```bash
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

**Configuração:**
- Porta COM: Linha 7 de `serial_to_cloud_bridge.py`
- Default: `COM4`
- Verifica no Gestor de Dispositivos se mudou

**Para parar:**
- `Ctrl + C`

---

## 📂 ESTRUTURA DE PASTAS

```
Projeto_Casais_RFI/
│
├── arduino_rfid_simple/
│   ├── arduino_rfid_simple.ino          (SEM LEDs - original)
│   └── arduino_rfid_led.ino             (COM LEDs - usar este!)
│
├── Backend_Cloud/
│   ├── functions/
│   │   └── index.js                     (Lógica do servidor)
│   ├── firebase.json
│   └── .firebaserc
│
├── Frontend_App/
│   └── dashboard/
│       ├── src/
│       │   ├── components/              (Componentes reutilizáveis)
│       │   │   ├── DateFilter.jsx       (Filtro de datas)
│       │   │   ├── MaintenanceAlert.jsx (Alertas de manutenção)
│       │   │   ├── SidebarItem.jsx
│       │   │   ├── StatCard.jsx
│       │   │   ├── StatusBadge.jsx
│       │   │   └── Toast.jsx            (Notificações)
│       │   │
│       │   ├── config/
│       │   │   └── firebase.js          (Configuração Firebase)
│       │   │
│       │   ├── utils/
│       │   │   ├── dateFilters.js       (Filtros de data)
│       │   │   ├── exportCSV.js         (Exportação)
│       │   │   ├── formatters.js        (CO₂, duração)
│       │   │   └── telemetryParser.js   (GPS/CAN Bus - futuro)
│       │   │
│       │   ├── views/
│       │   │   ├── DashboardView.jsx    (Dashboard principal)
│       │   │   ├── OperatorsView.jsx    (Registo de operadores)
│       │   │   └── SettingsView.jsx     (Configuração)
│       │   │
│       │   ├── App.jsx                  (Layout principal)
│       │   ├── index.css                (Estilos globais)
│       │   └── main.jsx                 (Entry point)
│       │
│       ├── public/
│       │   └── manifest.json            (PWA manifest)
│       │
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
│
├── Hardware_Bridge_PC/
│   └── serial_to_cloud_bridge.py        (Arduino → Cloud)
│
└── DOCUMENTACAO_PROJETO.md              (Este ficheiro!)
```

---

## 🔧 CONFIGURAÇÕES IMPORTANTES

### **Firestore Database (Estrutura)**

```
artifacts/
└── casais-rfid/
    └── public/
        └── data/
            ├── operators/              (Cartões registados)
            │   └── {cardId}/
            │       ├── name: string
            │       └── registeredAt: timestamp
            │
            ├── machines/               (Equipamentos)
            │   └── {machineId}/
            │       ├── name: string
            │       ├── status: "ACTIVE" | "IDLE"
            │       ├── totalHours: number
            │       ├── consumptionRate: number
            │       └── lastOperator: string
            │
            ├── sessions/               (Sessões de trabalho)
            │   └── {autoId}/
            │       ├── cardId: string
            │       ├── machineId: string
            │       ├── startTime: timestamp
            │       ├── endTime: timestamp | null
            │       ├── durationHours: number
            │       └── status: "OPEN" | "CLOSED"
            │
            ├── scan_buffer/            (Buffer para auto-fill)
            │   └── latest/
            │       ├── cardId: string
            │       ├── machineId: string
            │       └── timestamp: timestamp
            │
            └── unregistered_scans/     (Logs de segurança)
                └── {cardId}/
                    ├── id: string
                    ├── machineId: string
                    ├── timestamp: timestamp
                    ├── type: "access_attempt"
                    └── resolved: boolean
```

---

## 🐛 TROUBLESHOOTING

### **Problema: Arduino não comunica com Python**
**Soluções:**
1. Fecha o Monitor Serial do Arduino IDE (obrigatório!)
2. Verifica a porta COM no Gestor de Dispositivos
3. Edita `serial_to_cloud_bridge.py` linha 7 com a porta correta
4. Testa com: `python -m serial.tools.list_ports`

### **Problema: Frontend não atualiza em tempo real**
**Soluções:**
1. Verifica console do browser (F12) - há erros?
2. Confirma que está ligado ao Firebase (ícone "LIGAÇÃO ATIVA")
3. Verifica Regras do Firestore (devem permitir leitura pública)

### **Problema: Cartão não é reconhecido**
**Soluções:**
1. Verifica se está registado em "Operadores"
2. Vê os logs no terminal do Python
3. Verifica logs do Backend: `firebase functions:log`
4. ID do cartão está em MAIÚSCULAS?

### **Problema: LEDs não funcionam**
**Soluções:**
1. Verifica ligações (pino correto + resistor + GND)
2. Testa LED diretamente: `digitalWrite(LED_GREEN, HIGH);` no setup()
3. Confirma que estás a usar o código `_led.ino` (não o original)
4. Resistor de 220Ω está ligado?

---

## 📊 MÉTRICAS E LIMITES

| Métrica | Valor | Onde alterar |
|---------|-------|--------------|
| Limite de manutenção | 150 horas | `MaintenanceAlert.jsx` linha 8 |
| Limite de CO₂ | 500 kg | `DashboardView.jsx` linha 23 |
| Fator de emissão Diesel | 2.68 kg/L | `formatters.js` linha 1 |
| Timeout de scan (Arduino) | 5 segundos | `arduino_rfid_led.ino` linha 61 |
| Timeout HTTP (PWA) | 10 segundos | `api/session` (Cloud Function) |

---

## 🔮 FUTURO (FUNCIONALIDADES PREPARADAS)

### **GPS (Localização em tempo real)**
- Estrutura de dados já preparada
- Parser em: `utils/telemetryParser.js`

### **CAN Bus (Diagnósticos do motor)**
- Parser em: `utils/telemetryParser.js`
- Métricas suportadas:
  - RPM do motor
  - Temperatura
  - Nível de combustível (medição real!)
  - Pressão do óleo
  - Códigos de erro (DTC)

### **Mapa de Frotas**
- Mostrar máquinas no Google Maps
- Trilhos de movimento
- Geofencing (alertas se sair da obra)

---

## 📞 CONTACTOS E LINKS

**Firebase Console:**
https://console.firebase.google.com/project/casais-rfid

**Cloud Function URL:**
https://handlesessiontrigger-mtaqaropqq-uc.a.run.app

**Firestore Database:**
Console → Firestore Database

**Repositório (se tiveres):**
_Adiciona aqui o link do GitHub_

---

## ✅ CHECKLIST ANTES DE APRESENTAR

- [ ] Backend deployado (`firebase deploy --only functions`)
- [ ] Frontend a correr (`npm run dev`)
- [ ] Python bridge ligado
- [ ] Arduino com código dos LEDs carregado
- [ ] LEDs montados e a funcionar
- [ ] Pelo menos 2 operadores registados
- [ ] Pelo menos 1 máquina com consumo configurado
- [ ] Fazer 2-3 sessões de teste (START/STOP)
- [ ] Testar cartão não registado (deve ficar vermelho)
- [ ] Testar export CSV
- [ ] Testar filtros de data
- [ ] Verificar alertas de manutenção

---

## 🎓 CONCEITOS IMPORTANTES PARA EXPLICAR NA APRESENTAÇÃO

1. **Manutenção Preditiva:** Baseada em horas reais, não datas fixas
2. **Consumo Dinâmico:** Cada máquina é diferente, admin configura
3. **Scan-to-Register:** Ninguém digita IDs, tudo automático
4. **Segurança:** Cartões não registados são bloqueados
5. **Logs de Auditoria:** Todas as tentativas ficam guardadas
6. **PWA:** Funciona em tablets no terreno sem app stores
7. **Teste 1 (Resiliência):** Durante o Beta-Release da Fase 2 do Mobile Hub.

---

**FIM DA DOCUMENTAÇÃO** 📘

_Última atualização: Dezembro 2024_
_Se tiveres dúvidas, relê este documento!_

