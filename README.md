# CASAIS FLEET INTELLIGENCE

Sistema Full-Stack de Gestão Inteligente de Frotas Industriais

> Projeto desenvolvido para o **Grupo Casais** no âmbito do concurso de Tecnologias Avançadas de Construção  
> **Autor:** Vitor Hugo  
> **Ano:** 2024-2025

---

## 📋 ÍNDICE

- [Visão Geral](#-visão-geral)
- [Características Principais](#-características-principais)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Deploy](#-deploy)
- [Documentação](#-documentação)
- [Licença](#-licença)

---

## 🎯 VISÃO GERAL

O **Casais Fleet Intelligence** é um sistema completo de gestão de frotas industriais que combina:

- ✅ **Rastreabilidade em tempo real** de máquinas e operadores
- ✅ **Manutenção preditiva** baseada em horas de uso reais
- ✅ **Gestão financeira** integrada (custos por máquina/obra)
- ✅ **Sustentabilidade** com cálculo automático de emissões CO₂
- ✅ **Qualidade de dados** com validação humana e correção automática
- ✅ **Hardware híbrido** (RFID low-cost + CAN Bus/GPS para máquinas modernas)

**Diferencial Competitivo:** Sistema híbrido que funciona tanto com máquinas antigas (retrofit com RFID) quanto com máquinas modernas (telemetria completa).

---

## ✨ CARACTERÍSTICAS PRINCIPAIS

### 🔐 **Gestão de Sessões**
- Início/fim de sessão via cartão RFID
- Rastreamento automático de horas de trabalho
- Deteção de fadiga e timeout automático
- Validação humana para correções

### 🔧 **Manutenção Preditiva**
- Alertas baseados em horas de uso reais
- Múltiplos contadores de manutenção por máquina
- Histórico digital com fotos e peças substituídas
- QR Code para reporte de avarias

### 💰 **Inteligência Financeira**
- Cálculo automático de custos por sessão
- Agregação por obra/centro de custo
- Análise de rentabilidade
- Exportação para Excel/CSV

### 🌍 **Sustentabilidade**
- Cálculo automático de emissões CO₂
- Alertas visuais para emissões elevadas
- Relatórios de impacto ambiental

### 📍 **Rastreabilidade Geográfica**
- Localização de máquinas por obra/estaleiro
- Histórico de movimentos
- Validação de transições lógicas

### 📱 **PWA (Progressive Web App)**
- Funciona offline
- Instalável em tablets e smartphones
- Interface otimizada para terreno

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                    MÁQUINAS NO TERRENO                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TIPO A: Arduino Uno + PC                                  │
│  ├─ Arduino lê RFID (MFRC-522)                             │
│  ├─ Envia via Serial para Python                           │
│  └─ Python → Cloud Functions (HTTP)                        │
│                                                             │
│  TIPO B: ESP32 (Autónomo)                                  │
│  ├─ ESP32 lê RFID (MFRC-522)                               │
│  └─ Envia direto via Wi-Fi → Cloud Functions              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE CLOUD                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • Cloud Functions (Backend Logic)                         │
│  • Firestore (Database Real-time)                          │
│  • Firebase Hosting (Frontend PWA)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DASHBOARD PWA                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • React.js + Vite                                         │
│  • Tailwind CSS                                            │
│  • Recharts (Gráficos)                                     │
│  • Firebase SDK                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ TECNOLOGIAS

### **Frontend**
- **React 19** - Framework UI
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos e visualizações
- **Firebase SDK** - Integração com backend
- **Lucide React** - Ícones

### **Backend**
- **Firebase Cloud Functions** - Lógica servidor
- **Firestore** - Base de dados real-time
- **Firebase Admin SDK** - Operações administrativas

### **Hardware**
- **Arduino Uno/Nano** - Leitor RFID (Tipo A)
- **ESP32** - Leitor RFID autónomo (Tipo B)
- **MFRC-522** - Módulo RFID
- **LEDs** - Feedback visual (Verde/Amarelo/Vermelho)

### **Bridge**
- **Python 3** - Ponte Serial → HTTP (Tipo A)

---

## 📂 ESTRUTURA DO PROJETO

```
Projeto_Casais_RFI/
│
├── 📱 Frontend_App/
│   └── dashboard/                    # Aplicação React PWA
│       ├── src/
│       │   ├── components/           # Componentes reutilizáveis
│       │   ├── views/               # Páginas principais
│       │   ├── utils/                # Funções utilitárias
│       │   └── config/               # Configurações
│       └── public/                   # Assets públicos
│
├── ☁️ Backend_Cloud/
│   └── functions/                    # Cloud Functions
│       └── index.js                  # Lógica principal
│
├── 🤖 Hardware/
│   ├── arduino_rfid_simple/          # Código Arduino (Tipo A)
│   ├── Hardware_ESP32/                # Código ESP32 (Tipo B)
│   └── Hardware_Bridge_PC/            # Ponte Python (Tipo A)
│
└── 📚 Documentação/
    ├── DOCUMENTACAO_PROJETO.md        # Manual técnico completo
    ├── ROADMAP_6_MESES.md            # Plano de desenvolvimento
    └── NOTAS_RAPIDAS.txt             # Referência rápida
```

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+ e npm
- Python 3.8+ (opcional - só se usar Arduino)
- Firebase CLI (`npm install -g firebase-tools`)
- Conta Firebase com projeto criado

### Instalação

```bash
# 1. Clonar repositório
git clone <repository-url>
cd Projeto_Casais_RFI

# 2. Instalar dependências Frontend
cd Frontend_App/dashboard
npm install

# 3. Instalar dependências Backend
cd ../../Backend_Cloud/functions
npm install

# 4. Configurar Firebase
cd ..
firebase login
firebase use <project-id>
```

### Executar Localmente

```bash
# Frontend (desenvolvimento)
cd Frontend_App/dashboard
npm run dev
# Abre em http://localhost:5173

# Backend (deploy)
cd Backend_Cloud
firebase deploy --only functions

# Python Bridge (se usar Arduino)
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

---

## ⚙️ CONFIGURAÇÃO

### **1. Firebase (Frontend)**
Editar `Frontend_App/dashboard/src/config/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ...
};
```

### **2. Firebase (Backend)**
Configurar `Backend_Cloud/.firebaserc`:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### **3. Hardware - Arduino (Tipo A)**
1. Abrir `arduino_rfid_simple/arduino_rfid_led.ino`
2. Verificar pinos (SS_PIN, RST_PIN, LEDs)
3. Carregar no Arduino
4. **IMPORTANTE:** Fechar Monitor Serial antes de usar Python bridge

### **4. Hardware - ESP32 (Tipo B)**
1. Abrir `Hardware_ESP32/fleet_rfid_hardware_led.cpp`
2. Editar linhas 7-8 (Wi-Fi SSID e password)
3. Editar `MACHINE_ID` (linha 11)
4. Carregar no ESP32

### **5. Python Bridge (Tipo A)**
Editar `Hardware_Bridge_PC/serial_to_cloud_bridge.py`:
- Linha 7: Porta COM do Arduino (ex: `COM4`)
- Linha 8: URL da Cloud Function

---

## 💻 USO

### **Desenvolvimento Local**

**Frontend:**
```bash
cd Frontend_App/dashboard
npm run dev
# Abre em http://localhost:5173
```

**Backend (Emulator):**
```bash
cd Backend_Cloud
firebase emulators:start
```

**Python Bridge:**
```bash
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

### **Produção**

**Deploy Backend:**
```bash
cd Backend_Cloud
firebase deploy --only functions
```

**Deploy Frontend:**
```bash
cd Frontend_App/dashboard
npm run build
cd ../../Backend_Cloud
firebase deploy --only hosting
```

---

## 📚 Documentação

- **[CLAUDE.md](CLAUDE.md)** - Documentação completa para AI Agents
- **[docs/AGENT_ROLES.md](docs/AGENT_ROLES.md)** - Definição de papéis dos AI Agents
- **[DOCUMENTACAO_PROJETO.md](DOCUMENTACAO_PROJETO.md)** - Manual técnico completo
- **[ROADMAP_6_MESES.md](ROADMAP_6_MESES.md)** - Plano de desenvolvimento

---

## 🎯 PRÓXIMOS PASSOS

Consulte o [ROADMAP_6_MESES.md](ROADMAP_6_MESES.md) para ver as funcionalidades planeadas:
- ✅ Fase 0: Base Sólida (Concluído)
- 🔄 Fase 1: Inteligência Financeira
- 🔄 Fase 2: Qualidade de Dados & Automação
- 🔄 Fase 3: Manutenção Avançada
- 🔄 Fase 4: Rastreabilidade Geográfica
- 🔄 Fase 5: Integração CAN Bus & GPS
- 🔄 Fase 6: Perfis de Acesso & Segurança
- 🔄 Fase 7: Polimento & PWA Final

---

## 📄 LICENÇA

Este projeto foi desenvolvido para o **Grupo Casais** no âmbito académico.

---

## 👤 AUTOR

**Vitor Hugo**  
Curso: Tecnologias Avançadas de Construção  
Ano: 2024-2025

---

## 🙏 AGRADECIMENTOS

- **Grupo Casais** - Pela oportunidade e feedback
- **Comunidade Open Source** - Pelas tecnologias utilizadas

---

**Última atualização:** Dezembro 2024

