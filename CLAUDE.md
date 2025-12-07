# CASAIS FLEET INTELLIGENCE

## Visão Geral
- **Descrição:** Sistema Full-Stack PWA para gestão inteligente de frotas industriais. Combina rastreabilidade em tempo real, manutenção preditiva baseada em horas reais, gestão financeira integrada e cálculo automático de emissões CO₂. Sistema híbrido que funciona com máquinas antigas (retrofit RFID) e modernas (CAN Bus/GPS).
- **Objetivo:** Projeto académico para Grupo Casais (empresa real) - concurso de Tecnologias Avançadas de Construção
- **Público-alvo:** Gestores de frotas, técnicos de manutenção, operadores no terreno
- **Tipo:** PWA (Progressive Web App) + Backend Cloud + Hardware IoT
- **Estado:** ~60% completo - Base funcional implementada, features avançadas em desenvolvimento

## Stack Tecnológica

### Frontend
- **Framework:** React 19.2.0
- **Build tool:** Vite 7.2.4
- **Bibliotecas principais:**
  - `firebase` (^12.6.0) - Integração Firebase
  - `recharts` (^3.5.1) - Gráficos e visualizações
  - `lucide-react` (^0.555.0) - Ícones
  - `zustand` (^5.0.9) - State management
- **UI:**
  - Tailwind CSS 3.4.17 - Estilização
  - PostCSS + Autoprefixer - Processamento CSS
- **Dev Tools:**
  - ESLint 9.39.1 - Linting
  - Prettier 3.7.4 - Formatação

### Backend
- **Linguagem:** JavaScript (Node.js 24)
- **Framework:** Firebase Cloud Functions 7.0.0
- **Base de dados:** Firestore (NoSQL, real-time)
- **APIs externas:**
  - Firebase Admin SDK 13.6.0
  - Firebase Functions (HTTP triggers)

### Hardware
- **Arduino Uno/Nano:** Leitor RFID (MFRC-522) + LEDs feedback
- **ESP32:** Leitor RFID autónomo via Wi-Fi
- **Python 3.8+:** Bridge Serial → HTTP (para Arduino)

### DevOps
- **Hospedagem:** Firebase Hosting (Frontend) + Cloud Functions (Backend)
- **CI/CD:** Manual (firebase deploy)
- **Database:** Firestore (Google Cloud)

## Arquitetura

```
Frontend_App/dashboard/src/
├── components/          # Componentes reutilizáveis
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Sidebar.jsx
│   ├── StatCard.jsx
│   ├── DateFilter.jsx
│   ├── MaintenanceAlert.jsx
│   └── ...
├── views/              # Páginas principais (rotas)
│   ├── DashboardView.jsx
│   ├── MaquinasView.jsx
│   ├── OperadoresView.jsx
│   ├── SessoesView.jsx
│   ├── ManutencaoView.jsx
│   ├── AnalisesView.jsx
│   ├── RelatoriosView.jsx
│   └── ConfiguracoesView.jsx
├── utils/              # Funções utilitárias
│   ├── dateFilters.js      # Filtros temporais
│   ├── formatters.js       # Formatação (CO₂, horas, etc)
│   ├── exportCSV.js         # Exportação Excel/CSV
│   ├── mockData.js         # Dados de demonstração
│   └── telemetryParser.js  # GPS/CAN Bus (futuro)
├── config/             # Configurações
│   ├── firebase.js         # Config Firebase
│   └── navigation.js       # Estrutura de navegação
├── theme/              # Tema e estilos
│   └── casaisTheme.js      # Cores e branding
├── App.jsx             # Componente raiz + routing
└── main.jsx            # Entry point

Backend_Cloud/functions/
└── index.js            # Cloud Function principal (handleSessionTrigger)

Hardware_Bridge_PC/
└── serial_to_cloud_bridge.py  # Ponte Arduino → Cloud
```

**Fluxo de Dados:**
1. Hardware (Arduino/ESP32) lê cartão RFID
2. Envia para Cloud Function via HTTP POST
3. Cloud Function valida cartão, cria/fecha sessão, atualiza Firestore
4. Frontend escuta Firestore em tempo real (onSnapshot)
5. UI atualiza automaticamente

## Features Implementadas

- ✅ **Dashboard Principal:** KPIs, gráficos (Recharts), filtros temporais (Hoje/Semana/Mês), alertas CO₂
  - Ficheiros: `views/DashboardView.jsx`, `components/StatCard.jsx`, `components/DateFilter.jsx`

- ✅ **Gestão de Operadores:** Registo de cartões RFID, lista de operadores, remoção
  - Ficheiros: `views/OperadoresView.jsx`

- ✅ **Gestão de Máquinas:** Lista de máquinas, configuração de consumo (L/h), estado (Ativa/Parada)
  - Ficheiros: `views/MaquinasView.jsx`

- ✅ **Gestão de Sessões:** Sessões ativas em tempo real, histórico completo, tabs (Ativas/Histórico/Validações)
  - Ficheiros: `views/SessoesView.jsx`

- ✅ **Sistema de Sessões (Backend):** START/STOP automático, validação de cartões, logs de segurança
  - Ficheiros: `Backend_Cloud/functions/index.js`

- ✅ **Manutenção Preditiva:** Alertas baseados em horas (150h threshold), barras de progresso
  - Ficheiros: `components/MaintenanceAlert.jsx`, `views/ManutencaoView.jsx`

- ✅ **Cálculo de Emissões CO₂:** Fórmula: Horas × Consumo(L/h) × 2.68 kg/L
  - Ficheiros: `utils/formatters.js`, `views/DashboardView.jsx`

- ✅ **Exportação CSV:** Exportação profissional com nomes reais, UTF-8 BOM (compatível Excel PT)
  - Ficheiros: `utils/exportCSV.js`

- ✅ **Navegação Hierárquica:** Sidebar com submenus, tabs nas páginas, menu hamburger mobile
  - Ficheiros: `components/Sidebar.jsx`, `config/navigation.js`, `App.jsx`

- ✅ **Dados Mock Automáticos:** Sistema cria dados de demonstração ao carregar
  - Ficheiros: `utils/mockData.js`, `views/ConfiguracoesView.jsx`

- ✅ **Hardware RFID:** Código Arduino/ESP32 com LEDs de feedback (Verde/Amarelo/Vermelho)
  - Ficheiros: `arduino_rfid_simple/arduino_rfid_led.ino`, `Hardware_ESP32/fleet_rfid_hardware_led.cpp`

- ✅ **Ponte Python:** Bridge Serial → HTTP para Arduino
  - Ficheiros: `Hardware_Bridge_PC/serial_to_cloud_bridge.py`

- ✅ **PWA:** Manifest configurado, instalável em tablets
  - Ficheiros: `public/manifest.json`, `index.html`

## Features Pendentes

- [ ] **Sistema Financeiro (Alta Prioridade):** Tarifários versionados, cálculo de custos por sessão, rentabilidade por obra
  - Ficheiros a criar: `views/FinanceiroView.jsx`, `utils/costCalculator.js`

- [ ] **Sistema de Qualidade de Dados (Alta Prioridade):** Alertas de fadiga (5h), timeout automático (14h), validação humana via email
  - Ficheiros a criar: `views/ValidacaoView.jsx`, `Backend_Cloud/functions/validationEmail.js`

- [ ] **Duplo Contador de Manutenção:** Horas totais vs. horas parciais (desde última manutenção)
  - Modificar: `Backend_Cloud/functions/index.js`, `views/ManutencaoView.jsx`

- [ ] **Histórico Digital de Manutenção:** Upload de fotos, lista de peças, registo técnico
  - Ficheiros a criar: `views/ManutencaoDetalhesView.jsx`, usar Firebase Storage

- [ ] **Rastreabilidade Geográfica:** Cartões RFID de obras/estaleiros, atualização automática de localização
  - Ficheiros a criar: `views/LocalizacoesView.jsx`, `utils/locationTracker.js`

- [ ] **Perfis de Acesso:** Operador / Gestor / Financeiro com regras Firestore
  - Modificar: `Backend_Cloud/functions/index.js`, `App.jsx` (roteamento condicional)

- [ ] **Gráficos Avançados:** Por obra, por máquina, comparações temporais
  - Modificar: `views/AnalisesView.jsx`, adicionar mais queries Firestore

- [ ] **Notificações Push:** Alertas de manutenção, avarias reportadas
  - Ficheiros a criar: `utils/notifications.js`, Service Worker

- [ ] **Integração CAN Bus:** Leitura de dados do motor (RPM, temperatura, etc.) - se autorização dada
  - Modificar: `utils/telemetryParser.js` (já preparado)

## Decisões Técnicas Importantes

**Porquê Firebase?**
- Real-time sync automático (onSnapshot) - ideal para sessões ativas
- Escalável sem gestão de servidor
- Firestore permite queries complexas
- Cloud Functions serverless - sem gestão de infraestrutura

**Porquê React + Vite?**
- Vite é muito mais rápido que Create React App
- React 19 com melhorias de performance
- HMR (Hot Module Replacement) instantâneo

**Porquê Tailwind CSS?**
- Desenvolvimento rápido (utility-first)
- Responsividade fácil (mobile-first)
- Bundle pequeno (tree-shaking automático)

**Porquê Recharts?**
- Gráficos interativos
- Responsivos automaticamente
- Fácil customização

**Porquê Zustand?**
- State management simples (não precisamos Redux)
- Menos boilerplate
- Performance boa

**Arquitetura de Dados Firestore:**
```
artifacts/casais-rfid/public/data/
├── operators/          # {cardId: {name, registeredAt}}
├── machines/            # {machineId: {name, status, totalHours, consumptionRate}}
├── sessions/           # {autoId: {cardId, machineId, startTime, endTime, durationHours}}
├── scan_buffer/        # {latest: {cardId, machineId, timestamp}} - para auto-fill
└── unregistered_scans/ # {cardId: {id, machineId, timestamp, resolved}} - logs segurança
```

**Porquê esta estrutura?**
- `artifacts/` permite múltiplos projetos no mesmo Firebase
- Separação clara de concerns
- `scan_buffer/latest` permite deteção de cartões em tempo real no frontend

## Configuração Necessária

### Variáveis de Ambiente (.env)
**Frontend:** Não usa .env (configuração hardcoded em `src/config/firebase.js` por enquanto)
- Firebase config está em: `Frontend_App/dashboard/src/config/firebase.js`

**Backend:** Usa Firebase Admin SDK (auto-configurado via Firebase CLI)
- Projeto ID: `casais-rfid`
- Configurado via: `Backend_Cloud/.firebaserc`

**Python Bridge:**
- Porta COM: Editar linha 7 de `Hardware_Bridge_PC/serial_to_cloud_bridge.py` (default: `COM4`)
- URL Cloud Function: Já configurado (`https://handlesessiontrigger-mtaqaropqq-uc.a.run.app`)

### Instalação

```bash
# Frontend
cd Frontend_App/dashboard
npm install

# Backend
cd Backend_Cloud/functions
npm install

# Python Bridge (opcional - só se usar Arduino)
# Instalar: pip install pyserial requests
```

### Executar

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

## Estrutura de Dados

### Firestore Collections

**operators/** - Operadores registados
```javascript
{
  name: string,
  registeredAt: Timestamp
}
```

**machines/** - Máquinas/Equipamentos
```javascript
{
  name: string,
  status: "ACTIVE" | "IDLE",
  totalHours: number,
  consumptionRate: number,  // L/h
  lastOperator: string
}
```

**sessions/** - Sessões de trabalho
```javascript
{
  cardId: string,
  machineId: string,
  startTime: Timestamp,
  endTime: Timestamp | null,
  durationHours: number,
  status: "OPEN" | "CLOSED"
}
```

**scan_buffer/latest** - Último cartão scaneado (para auto-fill)
```javascript
{
  cardId: string,
  machineId: string,
  timestamp: Timestamp
}
```

**unregistered_scans/** - Logs de tentativas não autorizadas
```javascript
{
  id: string,
  machineId: string,
  timestamp: Timestamp,
  type: "access_attempt",
  resolved: boolean
}
```

## Notas para AI Agents

- **Estilo de Código:** Este código deve parecer escrito por um estudante (não perfeito demais)
- **Commits:** Devem ser naturais, não ultra-profissionais ("fix bug" não "fix: resolve critical authentication issue")
- **Comentários:** Apenas quando necessário, não comentar código óbvio
- **Nomes de Variáveis:** Simples e práticos
  - ✅ `authToken` (não `userAuthenticationToken`)
  - ✅ `handleClick` (não `handleUserButtonClickEvent`)
  - ✅ `data` (não `processedUserDataArray`)
- **Formatação:** Ligeiramente inconsistente é OK (não alinhar tudo perfeitamente)
- **Console.log:** 2-3 console.log estratégicos são aceitáveis (debugging estudante)

## Contexto Adicional

**Cliente:** Grupo Casais (empresa real de construção)
**Prazo:** Apresentação em Junho 2025 (6 meses de desenvolvimento)
**Stakes:** Projeto define futuro profissional do autor
**Nível Exigido:** Enterprise, não protótipo

**Hardware:**
- Tipo A: Arduino Uno + PC (precisa Python bridge)
- Tipo B: ESP32 autónomo (Wi-Fi direto)
- LEDs físicos: Verde (sucesso), Amarelo (standby), Vermelho (erro)

**Branding:**
- Cores Casais: Azul #005EB8 (não verde!)
- Logo: SVG em `public/logotipo_2024_azul.svg`

**Documentação Interna:**
- `APAGAR_ANTES_ENTREGAR_DevLog.md` - Memória principal do projeto (NÃO apagar ainda!)
- `DOCUMENTACAO_PROJETO.md` - Manual técnico completo
- `NOTAS_RAPIDAS.txt` - Referência rápida
- `ROADMAP_6_MESES.md` - Planeamento faseado

**Ficheiros Temporários (apagar antes de entregar):**
- Ver `LISTA_FICHEIROS_TEMPORARIOS.txt` para lista completa

**Problemas Conhecidos:**
- Firebase Auth não configurado (erro esperado, não crítico)
- Accordion no sidebar pode não fechar corretamente (a corrigir)

**Próximos Passos Imediatos:**
1. Corrigir accordion no sidebar
2. Implementar sistema financeiro (tarifários)
3. Implementar qualidade de dados (validação humana)

---

## CONFIGURAÇÃO CLAUDE CODE + GEMINI (Atualizado: 2025-12-07)

### Integração AI Configurada
O projeto está configurado para usar **Claude Code** com **Gemini API** integrado como agente auxiliar.

**Gemini MCP Server:** `/home/vitor/gemini-mcp-server/`
- Ferramentas: `gemini_analyze`, `gemini_code_review`, `gemini_explain`, `gemini_summarize`
- Modelo: Gemini 2.0 Flash (grátis)
- Usar para: consultas, análises, code reviews (poupar tokens Claude)

**Comandos Personalizados:**
- `/gemini [pergunta]` - Consultar Gemini
- `/review [ficheiro]` - Code review com Gemini
- `/explain [código]` - Explicações

**Permissões:** Configuradas para autonomia total em `.claude/settings.json`
- Bash(*), Read(*), Write(*), Edit(*) - sem perguntas

**Aliases Terminal (após `source ~/.zshrc`):**
- `claude` - Abre Claude no projeto
- `consultor` - Agent read-only + Gemini
- `implementador` - Agent completo
- `agents` - Ambos em Tmux
- `projeto`, `front`, `back`, `dev` - Navegação rápida
- `cheat` - Ver cheat sheet

**Ficheiros de Configuração:**
- `~/.claude/settings.json` - Permissões globais
- `.claude/settings.json` - Permissões do projeto
- `.claude/commands/` - Comandos personalizados
- `~/claude-scripts/` - Scripts de agentes
- `~/CLAUDE-CHEATSHEET.md` - Referência rápida

### O Que Falta Instalar (manual, precisa sudo)
```bash
# Lazygit (git visual)
sudo apt install lazygit
```

### Workflow Recomendado
1. Usar `/gemini` para planeamento e discussão (grátis)
2. Usar Claude para implementação de código
3. Usar `/review` para code reviews antes de commit

