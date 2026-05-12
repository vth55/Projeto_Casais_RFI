# Procore Integration Flowchart

## Feature: Procore Integration (OAuth2 + Bidirectional Sync)
**Entry Point:** `Backend_Cloud/functions/procore/procoreBridge.js` (OAuth flow, API handler)

Bidirectional sync with Procore for equipment, projects, directory, and cost export.

**External Dependencies:**
- OAuth2 secrets (PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET)
- Procore Sandbox API endpoints
- Firestore token storage + read-only mirrors
- Sessions & costs data for export

**Key Flows:**
1. **OAuth Connection** — User clicks Connect → Navigate to /authorize → Procore consent → Callback with auth code → Exchange for token → Store in Firestore
2. **Status Check** — GET /api/procore/status → Fetch token expiry → Return connected/disconnected state
3. **Manual Sync** — POST /api/procore/sync → runFullSync → Fetch projects/equipment/directory in parallel → Persist read-only mirrors
4. **Session Export** — Session close → exportSessionToProcore → Resolve entities (project/user/equipment) → Create Timecard entry → Queue for retry if failed
5. **Daily Writeback** — Cron 23:30 Lisbon → Aggregate today's sessions by obra → Create Daily Log entries + Cost entries in Procore
6. **Scheduled Sync** — Cron 1/hour → runFullSync → Update mirrors

**Token Management:**
- Transparent refresh 5 min before expiry
- Grant type: authorization_code (initial), refresh_token (refresh)
- Persisted in Firestore with expires_at timestamp

**Session Export Path:**
- Start event: Create 0-hour Timecard entry (clock-in)
- End event: Update same entry with real hours (clock-out)
- Idempotency: Check `procoreExport.exported==true` before re-exporting
- Retry: Exponential backoff (5min→20min→60min), max attempts configurable

**Daily Writeback:**
- Enrich sessions with _machine, _operator, _obra
- Group by obra/workName
- Create Daily Log entry (notes) with resumo: "N sessões, X horas totais, Y máquinas"
- Create Cost Entry per session (if fuel consumption > 0)
- Catch errors per obra, continue next

**Constraints:**
- Procore API capped at 1 sync/hour (rate limit)
- Read-only mirrors (projects, equipment, directory) — no write-back except timecard/daily logs
- Equipment matching: fuzzy name match (normalize spaces, case-insensitive)
- Project matching: stored ID or fuzzy name match
- User matching: exact email match

**External Integrations:**
- Projects (read-only), Equipment (read-only), Directory/Users (read-only)
- Timecard API (write: session export)
- Daily Logs (write: summary + costs)
- Rate limiting: 1 sync/hour enforced
