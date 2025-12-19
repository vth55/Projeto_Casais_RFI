# CASAIS Fleet Intelligence

**Sistema de Gestão de Frotas Industriais com RFID**

Projeto desenvolvido para o Grupo Casais - gestão inteligente de equipamentos de construção.

---

## Iniciar Rapidamente

### Windows (Recomendado)
```
Duplo clique em: INICIAR_TUDO.bat
```

### Manual
```bash
cd Frontend_App/dashboard
npm install
npm run dev
```
Abrir: http://localhost:5173

---

## Funcionalidades Principais

| Funcionalidade | Descrição |
|----------------|-----------|
| **Dashboard** | KPIs em tempo real, gráficos de utilização |
| **Gestão de Máquinas** | CRUD completo, categorias, localização GPS |
| **Operadores** | Cartões RFID, licenças, cargos |
| **Sessões** | Histórico de utilização, validações |
| **Obras** | Gestão de obras com mapa Google |
| **Manutenção** | Alertas automáticos, histórico com fotos |
| **Financeiro** | Tarifários, custos/hora, rentabilidade |
| **Análises** | Comparações período vs período, gráficos |
| **PWA** | Instalável, funciona offline |

---

## Tecnologias

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore, Cloud Functions, Hosting)
- **Gráficos**: Recharts
- **Estado**: Zustand
- **Hardware**: Arduino/ESP32 + RFID RC522

---

## Estrutura do Projeto

```
├── Frontend_App/dashboard/    # Aplicação React PWA
├── Backend_Cloud/             # Firebase Cloud Functions
├── Hardware_Bridge_PC/        # Ponte Serial → Cloud
├── arduino_rfid_simple/       # Código Arduino
└── *.bat                      # Scripts de inicialização
```

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `INICIAR_TUDO.bat` | Inicia servidor + abre browser |
| `INICIAR_DASHBOARD.bat` | Apenas servidor de desenvolvimento |
| `BUILD_PRODUCAO.bat` | Cria build de produção |
| `DEPLOY_FUNCTIONS.bat` | Deploy das Cloud Functions |

---

## Perfis de Acesso (Demo)

Em **Configurações → Perfil de Acesso** pode testar diferentes perfis:

- **Admin** - Acesso total
- **Gestor de Frota** - Equipamentos e obras
- **Gestor Financeiro** - Custos e relatórios
- **Encarregado de Obra** - Restrito à sua obra
- **Visualizador** - Apenas leitura

---

## Contacto

**Vitor** - IPCA
Projeto Final de Curso - 2025

---

*Desenvolvido com React, Firebase e muito café.*
