# Session Management Flowchart

## Feature: Session Management (RFID → State Machine)
**Entry Point:** `Backend_Cloud/functions/index.js:267` (handleSessionTrigger)

RFID scan → session state machine with tariff snapshot, cost calculation, and anomaly detection.

**External Dependencies:**
- RFID reader system (cardId, machineId)
- Operators collection (card registration)
- Machines collection (status, tariffHistory)
- Sessions collection (state machine)
- Tariff system (getTariffForDate)
- Cost calculation (calculateSessionCost)
- Email alerts system
- Procore export queue

**Key Flows:**
1. **Start Session** — RFID tap → Validate cardId/machineId → Check operator registered → Create OPEN session with tariffSnapshot → Export to Procore
2. **End Session (Same Op)** — RFID tap (same card) → Calculate duration → getTariffForDate → calculateSessionCost → Close session with immutable costs → Export to Procore
3. **Operator Switch** — RFID tap (different card) → Calculate old duration → Close old session → Create new OPEN session → Export both
4. **Location Card** — RFID tap (LOC_* card) → Update machine location instead of session
5. **Auto-Close** — Cron 5min → Find OPEN sessions >14h → Mark AUTO_CLOSED → Create alert
6. **Anomaly Detection** — Cron 10min → Find OPEN sessions >5h → Create LONG_SESSION alert (once per session)
7. **Validation Correction** — Session marked RESOLVED + corrected=true → Invalidate prior Procore export → Re-export with corrected times

**State Machine:**
- OPEN → CLOSED (normal close)
- OPEN → AUTO_CLOSED (auto-close timeout)
- PENDING_VALIDATION → RESOLVED (user correction)
- Can switch operators mid-session (creates 2 sessions: old + new)

**Tariff Snapshot Capture:**
- Captured AT SESSION START (not end)
- Stored immutable in session.tariffSnapshot
- Used for cost calculation at close time
- Never modified post-close

**Cost Immutability:**
- sessions.costs NEVER modified after close
- Correction path: invalidate Procore export, re-export with corrected times (not modify costs)
- Ensures audit trail integrity

**Anomaly Alerts:**
- LONG_SESSION: >5h continuous (configurable per machine/category)
- AUTO_CLOSE: >14h (configurable, auto-closes session)
- Email alert triggered via onAlertCreated

**Cron Jobs:**
- **autoCloseStuckSessions** (5min) — Find OPEN sessions ≥autoCloseHours → Close + alert
- **checkLongSessions** (10min) — Find OPEN sessions ≥longSessionHours → Alert once per session
- **procoreExportRetry** (30min) — Retry failed exports with exponential backoff

**Constraints:**
- Location card (LOC_*) changes machine location, not session
- Unregistered operators cannot start sessions
- Tariff snapshot must exist (null tariff = close with no costs)
- Export idempotency: check procoreExport.exported==true before re-exporting
- Switch operator: close old, create new atomically

**Side Effects:**
- Machine status: ACTIVE (when session open), IDLE (when closed)
- Machine totalHours aggregation (transaction-safe)
- Firestore session CRUD + machine updates
- Email alerts (async via onAlertCreated)
- Procore export queue (fire-and-forget)
