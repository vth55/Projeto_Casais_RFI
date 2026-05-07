---
relevance: stack, versões, dependências, firebase, react, node
---
# Stack Técnico

## Versões
- React 19 + Vite (latest)
- Tailwind CSS 3.x
- Recharts (gráficos)
- Zustand (state management)
- Firebase Functions v2 (Node.js 24)
- Firestore (NoSQL)

## Comandos essenciais
- Dev local: `cd Frontend_App/dashboard && npm run dev` → localhost:5173
- Deploy frontend: `cd Frontend_App/dashboard && npm run deploy` (build + hosting)
- Deploy backend: `cd Backend_Cloud && firebase deploy --only functions`
- Deploy específico: `firebase deploy --only functions:procoreBridge`
- Firebase project ID: `casais-rfid`

## Estrutura ficheiros
```
Frontend_App/dashboard/src/
├── views/          ← páginas principais
├── pages/          ← também tem páginas (verificar antes de criar nova view)
├── components/ui/  ← botões, cards
├── components/layout/ ← Sidebar, Header
├── hooks/          ← custom React hooks
├── store/useStore.js ← Zustand (tariffs, machines, sessions)
├── utils/          ← formatters.js, exportCSV.js, mockData.js, dateFilters.js
└── config/firebase.js ← config hardcoded, sem .env

Backend_Cloud/functions/
├── index.js        ← handleSessionTrigger (RFID → sessão START/STOP + alertas)
└── procore/        ← procoreBridge.js, procoreSessionExporter.js, procoreScheduler.js
```
