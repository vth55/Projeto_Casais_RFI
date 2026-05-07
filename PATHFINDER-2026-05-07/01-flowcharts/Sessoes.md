# Sessões Flowchart

## Feature: Sessões (Session Management)
**Entry Point:** `Frontend_App/dashboard/src/views/SessoesView.jsx:330`

Session validation state machine with anomaly detection and correction workflow.

**External Dependencies:**
- `useStore.resolveSessionAnomaly()` — Backend resolver
- `useAuthStore.can(QUALITY_VALIDATE)` — Permission gate
- Firestore updateDoc — Persistence layer
- Email alerts system — Validation notifications

**Key Flows:**
1. **Permission Gate** — QUALITY_VALIDATE and QUALITY_VIEW checks control validation UI
2. **Happy Path** — User opens Sessões → views tabs → clicks Validate → modal → selects action → resolveSessionAnomaly()
3. **Session Filtering** — getFilteredSessions() filters by date range
4. **Validation Actions** — Approve/Correct (with optional correctedHours)/Reject
5. **Resolution** — Updates validationStatus to RESOLVED, preserves original times, stores in Firestore

**Constraints:**
- Original session times are NEVER modified on correction
- If correcting hours, endTime is recalculated but startTime stays fixed
- validationStatus transitions: PENDING → RESOLVED (one-way)
- Cannot validate unless user has QUALITY_VALIDATE permission
