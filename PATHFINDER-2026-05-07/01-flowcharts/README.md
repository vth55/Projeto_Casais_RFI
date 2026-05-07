# Feature Flowcharts

All flowcharts are documented with:
- **Entry points** (file:line)
- **Happy path** (primary user/system flow)
- **Secondary flows** (error paths, alternative actions)
- **External dependencies** (stores, APIs, Firestore collections)
- **Key constraints** (immutability, permissions, state machine rules)

## Frontend Views

### 1. Dashboard.md
**Purpose:** Real-time KPI visualization, active sessions, maintenance alerts, Procore reconciliation
- Entry: `DashboardView.jsx:957`
- Key: Real-time Firestore listeners with KPI recalculation on session changes
- Responsive: Mobile/Desktop dual layouts

### 2. Sessões.md
**Purpose:** Session management with validation state machine
- Entry: `SessoesView.jsx:330`
- Key: Permission-gated validation (QUALITY_VALIDATE)
- Actions: Approve/Correct (with optional correctedHours)/Reject

### 3. Máquinas.md
**Purpose:** Equipment CRUD with location assignment and bulk operations
- Entry: `MaquinasView.jsx:339`
- Key: Maintenance progress badges (≥80% of interval)
- Bulk: Move multiple machines to obra in one action

### 4. Manutenção.md
**Purpose:** Predictive maintenance scheduling with calendar and avarias reporting
- Entry: `ManutencaoView.jsx:1247`
- Key: AI prediction using 14-day rolling average
- Avarias: Failure reporting with photo Lightbox, internal notes, resolution

### 5. Configurações.md (planned)
**Purpose:** Admin hub — role management, settings, Procore integration, theme
- Entry: `ConfiguracoesView.jsx:758`
- Key: Permission matrix builder, OAuth flow, theme toggle

## Backend Systems

### 6. SessionManagement.md
**Purpose:** RFID → session state machine with auto-close and anomaly detection
- Entry: `index.js:267` (handleSessionTrigger)
- Key: Tariff snapshot immutability on session close
- Cron: Auto-close (5min), Long session check (10min), Retry exports (30min)

### 7. Alerts&Notifications.md
**Purpose:** Email dispatch for session anomalies, maintenance, validation
- Entry: `index.js:522` (onAlertCreated)
- Key: Nodemailer SMTP with Gmail/custom config
- Paths: Validation alerts, session alerts, resend endpoint

### 8. ProcoreIntegration.md
**Purpose:** OAuth2 bidirectional sync (equipment catalog, timecard export, cost writeback)
- Entry: `procoreBridge.js` (OAuth flow, API handler)
- Key: Token refresh (5min margin before expiry), read-only mirrors
- Cron: Scheduled sync (1/hour), Daily writeback (23:30 Lisbon), Retry (30min)

### 9. CostCalculation.md
**Purpose:** Session cost computation with immutable tariff snapshots
- Entry: `index.js:242` (calculateSessionCost)
- Key: Tariff lookup by effectiveFrom/effectiveTo window
- Immutable: costs and tariffSnapshot never modified post-close

### 10. TariffManagement.md (pending)
**Purpose:** Versioning and audit trail for machine hourly rates
- Key: Append-only `machines.tariffHistory[]` (never delete)
- Lookup: getTariffForDate searches history for effective rate

---

## Statistics

| Layer | Count | Status |
|-------|-------|--------|
| Frontend Views | 5 | Complete |
| Backend Systems | 5 | 4 complete, 1 pending |
| **Total** | **10** | **90% done** |

---

## Next: Phase 2 — Duplication Hunt

Waiting for remaining flowchart agents to complete. Once all 10 are done:
- Identify within-feature code duplication (repeated patterns inside each feature)
- Compare across features for cross-cutting concerns (form modals, CRUD patterns, permission checks, email alerts)
- Propose unification strategies per duplicated concern
- Generate handoff prompts for `/make-plan` per unified system
