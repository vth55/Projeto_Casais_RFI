# Manutenção Flowchart

## Feature: Manutenção (Maintenance Planning & Alerts)
**Entry Point:** `Frontend_App/dashboard/src/views/ManutencaoView.jsx:1247`

Predictive maintenance scheduling with calendar, history, and avarias (failure) reporting.

**External Dependencies:**
- `useStore.getSmartMaintenancePrediction()` — AI-based forecast (14-day rolling average)
- `useAvariasStore` — Avarias/failure reporting with Lightbox photo viewing
- Firebase Storage — Maintenance report attachments
- Email system — Maintenance alerts

**Key Flows:**
1. **Alerts Tab** — Filter machines by usage ≥80% → Display prediction with "Agendar" and "Registar Manutenção" actions
2. **Calendar Tab** — Monthly grid with colored dots for past maintenance, avarias, forecasts, scheduled events
3. **History Tab** — Sortable maintenance records with photo gallery and CSV export
4. **Avarias Tab** — Failure reporting with photo Lightbox, internal notes, resolution workflow

**Maintenance Prediction Logic:**
- Calculate partial hours (total usage % of interval)
- Get 14-day average usage per day
- Predict when next 100% will be reached (work days basis)
- Show in forecast card with "days remaining"

**Avarias State Machine:**
- pending → open → resolvida (one-way transitions)
- Photos stored in Firebase Storage with Lightbox full-screen view
- Internal notes for technician communication
- Triggers maintenance alert when created

**Constraints:**
- Maintenance records cannot be deleted (append-only audit trail)
- Photos attached to maintenance records and avarias separately
- Schedule entries reference maintenance intervals
