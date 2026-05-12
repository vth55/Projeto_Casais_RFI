# Casais Fleet Intelligence — Pathfinder Analysis (2026-05-07)

## Complete Feature Architecture & Unification Strategy

This is a comprehensive structural analysis of the Casais Fleet Intelligence project, identifying feature boundaries, mapping data flows, finding duplications, and proposing unified architecture.

---

## How to Use This Pathfinder

1. **Understand Current State**: Read `00-features.md` for feature inventory and boundaries
2. **Learn Data Flows**: Review `01-flowcharts/` for detailed feature flowcharts with source citations
3. **Identify Duplication**: Study `02-duplication-report.md` for all 24 duplications found
4. **Plan Unification**: Review `03-unified-proposal.md` for unified designs per duplicated concern
5. **Execute Changes**: Copy prompts from `04-handoff-prompts.md` into `/make-plan` to generate detailed implementation plans

---

## Contents

### Phase 0: Feature Inventory
**File:** `00-features.md`
- 20 features identified (10 core focus)
- Entry points, core files, external dependencies per feature
- Feature boundaries approved for Phases 1-3

### Phase 1: Flowchart Mapping
**Directory:** `01-flowcharts/`
- **Dashboard.md** — KPI calculation, real-time panels, Procore reconciliation
- **Sessões.md** — Session validation state machine with anomaly detection
- **Máquinas.md** — Equipment CRUD with location assignment and bulk operations
- **Manutenção.md** — Predictive maintenance with calendar and avarias reporting
- **Configurações.md** — Admin hub for roles, settings, Procore OAuth, theme
- **AlertsNotifications.md** — Email dispatch for session anomalies, maintenance
- **ProcoreIntegration.md** — OAuth2 bidirectional sync (equipment, timecards, costs)
- **CostCalculation.md** — Session cost computation with immutable tariff snapshots
- **SessionManagement.md** — RFID → state machine with auto-close and anomaly detection
- **TariffManagement.md** — Versioning and audit trail for machine hourly rates
- **README.md** — Flowchart index and quick reference

Each flowchart includes:
- Entry points with file:line references
- Happy path and secondary flows
- External dependencies (stores, APIs, collections)
- Key constraints (immutability, permissions, state rules)
- Mermaid diagrams with source citations

### Phase 2: Duplication Analysis
**File:** `02-duplication-report.md`
- **15 within-feature duplications** — Repeated code inside single features
  - TabNav component (2 implementations)
  - Timestamp parsing (10+ instances)
  - CRUD patterns (8+ methods)
  - Event aggregation (4 loops)
  - Form state patterns (3+ modals)
  - Token refresh (2 implementations)
  - API URLs (3 files)
  - And more...
- **9 cross-feature duplications** — Same pattern in multiple features
  - Firestore listeners (3 stores)
  - Permission checks (5+ views)
  - Date filtering (Dashboard, Sessões, Manutenção)
  - Email/alert dispatch (2 code paths)
  - And more...
- **Total savings: 300+ lines of code**

Evidence-based: every duplication cites ≥2 `file:line-range` locations

### Phase 3: Unified Architecture
**File:** `03-unified-proposal.md`
- **8 unified systems** proposed with concrete designs:
  1. Firestore Real-Time Listeners Factory (saves 180 LOC)
  2. CRUD Operations Factory (saves 60 LOC)
  3. Procore Token Management Unification (removes reimplementation)
  4. Procore Configuration Extraction (saves 18 LOC)
  5. Permission Guards (component + hook)
  6. TabNav Component Extraction (saves 15 LOC)
  7. Timestamp Parsing Utility (saves 20 LOC)
  8. Calendar Event Aggregation Helper (saves 30 LOC)
- Anti-patterns to avoid (no unnecessary abstractions, no feature flags for old code)
- Implementation roadmap (7-10 hours total effort)

### Phase 4: Implementation Handoff
**File:** `04-handoff-prompts.md`
- **10 ready-to-use prompts** for `/make-plan` command
- Each prompt includes:
  - Current state (exact line ranges)
  - Target unified design (pseudo-code)
  - Migration path (step-by-step)
  - Testing checklist
  - Reference files for context
- Copy-paste directly into `/make-plan` to generate detailed implementation plans

---

## Key Findings Summary

### Architecture Strengths ✅
- Clear separation of concerns (frontend views, backend systems, stores)
- Real-time Firestore subscriptions for reactive UI
- Permission-based access control (RBAC)
- Immutable cost snapshots (audit trail)
- Centralized tariff lookup (getTariffForDate)
- Retry logic with exponential backoff (Procore exports)

### Duplication Hot Spots 🔴
- Firestore listeners pattern (3 stores, 180 LOC)
- CRUD operations (8+ methods, identical structure, 60 LOC)
- Procore token refresh (2 implementations, should be 1)
- Permission checks (scattered inline, no centralized guard)
- Form state management (repeated in 3+ places)

### Recommended Next Steps
1. **Priority:** Unify Firestore listeners (180 LOC savings)
2. **Priority:** Create CRUD factory (60 LOC savings)
3. **Priority:** Fix Procore token duplication (security, maintainability)
4. **High:** Extract TabNav, timestamp utility, event helper (65 LOC)
5. **Medium:** Consolidate permissions, forms, hooks (consistency)

---

## Statistics

| Metric | Count |
|--------|-------|
| **Features Identified** | 20 (10 core focus) |
| **Flowcharts Mapped** | 10 |
| **Flowchart Source Citations** | 200+ |
| **Duplications Found** | 24 (15 within-feature, 9 cross-feature) |
| **Lines of Code Duplicated** | 300+ |
| **Potential Savings** | 300+ LOC |
| **Unified Systems Proposed** | 8 |
| **Implementation Prompts** | 10 |
| **Estimated Effort** | 7-10 hours |
| **ROI** | High (improves maintainability, testability, reduces bugs) |

---

## How to Execute

### Option A: Via `/make-plan` (Recommended)
1. Copy a prompt from `04-handoff-prompts.md`
2. Paste into Claude Code: `/make-plan [prompt]`
3. Wait for plan generation
4. Review and approve plan
5. Execute with `/do [plan_id]`

### Option B: Via `/claude-mem:make-plan`
1. Read `03-unified-proposal.md` (design context)
2. Use `/claude-mem:make-plan [system_name]` to generate plan
3. Execute phase-by-phase

### Option C: Manual Implementation
1. Read the unified design in `03-unified-proposal.md`
2. Implement the factory/component/hook
3. Migrate all call sites (reference `02-duplication-report.md` for locations)
4. Test thoroughly

---

## Memory Integration

All findings are captured in claude-mem as observations:
- Features discovered, boundaries analyzed
- Duplications identified with evidence
- Unified designs proposed
- Implementation strategies documented

Future sessions will have context injected automatically. Refer to this Pathfinder as the master source for architecture guidance.

---

## Questions?

- **What does feature X do?** → See `00-features.md` + `01-flowcharts/Feature.md`
- **Where is concern Y duplicated?** → See `02-duplication-report.md`
- **How should I implement unified system Z?** → See `03-unified-proposal.md` + `04-handoff-prompts.md`
- **What's the dataflow for process W?** → See `01-flowcharts/Feature.md` (Mermaid diagram)

---

## Project Info

- **Repository:** Projeto_Casais_RFI
- **Stack:** React 19, Vite, Tailwind, Zustand, Firebase, Procore API
- **Generated:** 2026-05-07
- **Analysis Phases:** 4 (Features → Flowcharts → Duplication → Unified Proposal)
- **Status:** ✅ Ready for implementation

---

## Next Actions (in order of priority)

1. **Read** `03-unified-proposal.md` to understand unified designs
2. **Pick** a system (e.g., "Firestore Listeners") to implement first
3. **Copy** corresponding prompt from `04-handoff-prompts.md`
4. **Run** `/make-plan [prompt]` to generate detailed plan
5. **Execute** with `/do [plan_id]` or manually following the plan
6. **Test** thoroughly (reference testing checklist in prompt)
7. **Commit** changes with reference to this Pathfinder

Estimated total effort: **7-10 hours** for all 10 systems
Estimated code savings: **300+ lines**
Estimated quality improvement: **High**

---

**End of Pathfinder. Ready to unify architecture.**
