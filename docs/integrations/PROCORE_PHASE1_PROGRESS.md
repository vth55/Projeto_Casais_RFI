# Procore Integration — Fase 1 Progress

> **Tracking doc** para a implementação da Fase 1 do plano em
> `~/.claude/.../memory/project_procore_integration.md`.
> A Fase 1 está dividida em 3 chunks porque não cabe numa única sessão de créditos.

---

## Configuração Procore (Fase 0 — DONE)

- Sandbox app criada em https://developers.procore.com
- Sandbox Company ID: `4282881`
- Sandbox URL: `https://sandbox.procore.com`
- Secrets no Firebase:
  - `PROCORE_CLIENT_ID` (v2)
  - `PROCORE_CLIENT_SECRET` (v1)
  - `PROCORE_COMPANY_ID` (v1)
- Redirect URIs configurados no portal Procore:
  - `http://localhost` (default)
  - **TODO (utilizador):** adicionar `https://casais-rfid.web.app/api/procore/callback`

---

## Chunk 1A — OAuth2 Backbone

> Estabelecer o backbone de autenticação OAuth2 com Procore.
> Sem este chunk nada do resto da Fase 1 funciona.

- [x] Criar `Backend_Cloud/functions/procore/procoreBridge.js`
- [x] Endpoint `GET /api/procore/authorize` — inicia OAuth flow (redireciona para Procore)
- [x] Endpoint `GET /api/procore/callback` — recebe `code`, troca por `access_token` + `refresh_token`
- [x] Endpoint `GET /api/procore/status` — devolve estado da conexão (connected, expires_at, last_sync)
- [x] Endpoint `POST /api/procore/disconnect` — apaga tokens
- [x] Helper `getValidAccessToken()` com refresh automático (re-usável nos chunks 1B/1C)
- [x] Storage em Firestore: `artifacts/casais-rfid/public/data/integrations/procore`
- [x] Adicionar rewrite `/api/procore/**` → `procoreBridge` em `firebase.json`
- [x] Importar `procoreBridge` em `functions/index.js`
- [ ] **TODO utilizador:** `cd Backend_Cloud && firebase deploy --only functions:procoreBridge,hosting`
- [ ] **TODO utilizador:** Adicionar redirect URI no portal Procore
- [ ] **TODO utilizador:** Visitar `https://casais-rfid.web.app/api/procore/authorize` para conectar

---

## Chunk 1B — Endpoints de Leitura (próxima sessão)

- [ ] `GET /api/procore/projects` — lista projetos do Procore
- [ ] `GET /api/procore/equipment` — lista equipamentos
- [ ] `GET /api/procore/directory` — lista pessoas
- [ ] Cache em Firestore (TTL 5min) para evitar rate limits
- [ ] Tratamento de erros (401 → refresh, 429 → backoff)

---

## Chunk 1C — UI Integrações (próxima sessão)

- [ ] Novo separador "Integrações" em `ConfiguracoesView.jsx`
- [ ] Card Procore: status, botão Connect/Disconnect, último sync
- [ ] Preview tables: projetos, equipamentos, pessoas
- [ ] Hook `useProcoreStatus()` para polling do estado

---

## Notas Técnicas

### Storage de tokens
Path: `artifacts/casais-rfid/public/data/integrations/procore`

Schema:
```js
{
  access_token: string,
  refresh_token: string,
  token_type: 'Bearer',
  expires_at: Timestamp,        // calculado: now + expires_in*1000
  connected_at: Timestamp,
  last_refreshed_at: Timestamp,
  scope: string,
  procore_user_id: number,      // do /me endpoint (futuro)
  company_id: string            // do secret PROCORE_COMPANY_ID
}
```

### URLs Procore Sandbox
- Auth: `https://sandbox.procore.com/oauth/authorize`
- Token: `https://sandbox.procore.com/oauth/token`
- API base: `https://sandbox.procore.com/rest/v1.0`

### Why path routing num único cloud function
Cloud Functions v2 cobra por function instance. Em vez de criar 4 functions
(`procoreAuthorize`, `procoreCallback`, etc.), usamos uma única
`procoreBridge` que faz routing interno por `req.path`. Mais barato e
mais simples de invocar via hosting rewrite.
