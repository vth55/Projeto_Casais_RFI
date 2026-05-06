# FINDINGS — Memória Persistente do Projeto

Mantido pelo Gemini Flash a pedido do Claude. Entradas no topo (mais recentes primeiro).
Nunca apagar entradas antigas — só adicionar.

Para que serve: registar conhecimento não-óbvio que se descobre durante o trabalho —
root causes de bugs, IDs/configs escondidas, comportamentos contraintuitivos, assumpções
erradas em docs. Evita re-investigar a mesma coisa em sessões futuras.

---

## 2026-04-29 — Procore: coleção `obras` não existe
A coleção `artifacts/casais-rfid/public/data/obras` não existe no Firestore.
Sessions têm campo `obraId` mas sem documentos correspondentes.
Causou bug de 0/113 sessões exportadas (fuzzy match retornava null para todas).

**Resolvido:**
- `procoreSessionExporter.js`: adicionado `getDefaultProcoreProject()` como fallback
- `procoreBridge.js` `runFullSync()`: auto-deteta projeto único e guarda `defaultProcoreProjectId`

## 2026-04-29 — Procore Sandbox: IDs estáveis
Company ID: 4283171 | Único projeto: "1234 - Sandbox Test Project".
Sandbox dev (não monthly) → IDs não resetam, matching Procore↔Firestore preserva-se.
