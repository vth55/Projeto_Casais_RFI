---
name: Deploy Workflow
description: Como fazer deploy correto — frontend e backend — sem quebrar nada
type: project
relevance: deploy, build, frontend, functions, firebase, hosting
---

# Deploy Workflow

## Frontend (hosting)
```bash
cd Frontend_App/dashboard && npm run deploy
```
`npm run deploy` = `vite build` + `firebase deploy --only hosting` num comando só.
O `vite.config.js` aponta `outDir` para `Backend_Cloud/public` — nunca fazer deploy manual do `dist/`.

**Nunca** fazer `firebase deploy` na raiz sem `--only` — faz deploy de functions + hosting + tudo.

## Backend (Cloud Functions)
```bash
cd Backend_Cloud && firebase deploy --only functions
```
Deploy específico de uma função:
```bash
firebase deploy --only functions:procoreBridge
```

## Dev local
```bash
cd Frontend_App/dashboard && npm run dev
```
→ `localhost:5173`

## Ordem correta quando há mudanças em ambos
1. Testar localmente: `npm run dev`
2. Deploy backend primeiro (functions)
3. Deploy frontend depois (hosting)
