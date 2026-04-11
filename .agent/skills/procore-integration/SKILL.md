# Skill: Procore Integration (Cloud Bridge)

Esta skill define o conhecimento técnico necessário para realizar operações de leitura e escrita na API REST do Procore, com foco no ecossistema Casais Fleet Intelligence.

## 📊 Endpoints de Referência

| Recurso | Método | Endpoint (v1.0) | Firestore Path (Sync) |
| :--- | :--- | :--- | :--- |
| **Projetos** | GET | `/projects` | `integrations/procore/projects/` |
| **Equipamentos** | GET | `/companies/{id}/equipment` | `integrations/procore/equipment/` |
| **Utilizadores** | GET | `/companies/{id}/users` | `integrations/procore/directory/` |
| **Timecards** | POST | `/rest/v1.0/timecard_entries` | `timesheets/{id}/` |
| **Daily Logs** | POST | `/rest/v1.0/projects/{id}/daily_logs` | `logs/{id}/` |

---

## 🏗️ Protocolo de Escrita (Write-Back)

Ao implementar a **Fase 2 (Escrita)**, segue estas diretrizes:

### 1. Payload de Timecard (Exemplo)
```json
{
  "timecard_entry": {
    "date": "2026-04-07",
    "hours": "8.0",
    "description": "Atividade IoT: Máquina X | Obra Y",
    "project_id": 123456,
    "login_information_id": 789012
  }
}
```

### 2. Tratamento de Erros
*   **401 Unauthorized:** Chamar `getValidAccessToken()` para forçar refresh.
*   **403 Forbidden:** Validar permissões no `company_id`.
*   **422 Unprocessable Entity:** Validar IDs de projeto/utilizador obrigatórios.

## 💾 Firestore Batch Logic
Toda a sincronização massiva deve usar `admin.firestore().batch()` com um limite de **400 operações** por ciclo (Chunk 1B/1C).

```javascript
const batch = db.batch();
slice.forEach(item => {
  batch.set(docRef, item, { merge: true });
});
await batch.commit();
```

---

## 🚦 Pre-Flight Checklist (Antes de Codar)

1.  **Secrets:** Verificar `PROCORE_COMPANY_ID` no Firebase Console.
2.  **Scopes:** Garantir que o app Procore tem permissão de escrita para `Timecards`.
3.  **Logs:** Utilizar o `trigger` label ('manual' ou 'cron') para diferenciar sincronizações.
