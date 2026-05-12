# Casais Fleet Intelligence — Feature Inventory

## Frontend Views (User-Facing Features)

### 1. **Dashboard (Executive Overview)**
- **Purpose:** Real-time KPI visualization, active sessions, maintenance alerts, Procore reconciliation
- **Entry Point:** `Frontend_App/dashboard/src/views/DashboardView.jsx:957`
- **Core Files:**
  - `DashboardView.jsx:1-1348` (views, KPI cards, Office/Field Mode layouts)
  - `DashboardView.jsx:305-555` (ProcoreReconciliationPanel)
  - `DashboardView.jsx:866-951` (WorkFocusPanel — predictive maintenance)
- **External Dependencies:** useStore (KPIs), useAlertsStore, Procore Reconciliation System
- **Status:** Primary entry point, heavily UI-driven

---

### 2. **Sessões (Session Management)**
- **Purpose:** Track active/closed/anomalous machine sessions; validation workflow
- **Entry Point:** `Frontend_App/dashboard/src/views/SessoesView.jsx:330`
- **Core Files:**
  - `SessoesView.jsx:330-732` (three tabs: Active, History, Validations)
  - `SessoesView.jsx:81-244` (ValidationModal)
  - `useStore.js` (resolveSessionAnomaly, getFilteredSessions)
  - `config/permissions.js` (QUALITY_VALIDATE, SESSIONS_VIEW_ALL)
- **External Dependencies:** useStore, useAuthStore (permission checks)
- **Data Flow:** Sessions → Validation → resolveSessionAnomaly() → Backend trigger
- **Status:** Core feature, complex validation state machine

---

### 3. **Máquinas (Equipment Fleet Management)**
- **Purpose:** CRUD operations, location assignment, maintenance tracking
- **Entry Point:** `Frontend_App/dashboard/src/views/MaquinasView.jsx:339`
- **Core Files:**
  - `MaquinasView.jsx:339-654` (grid/table view, search, bulk operations)
  - `MaquinasView.jsx:119-233` (MachineForm — create/edit with tariff overrides)
  - `MaquinasView.jsx:236-337` (BulkLocationModal)
  - `useStore.js` (addMachine, updateMachine, deleteMachine, moveMachinesToObra)
- **External Dependencies:** useStore, category taxonomy, system settings
- **Data Flow:** Frontend CRUD → useStore → Firestore backend
- **Status:** Standard CRUD feature, simple state management

---

### 4. **Manutenção (Maintenance Planning & Alerts)**
- **Purpose:** Predictive maintenance scheduling, calendar, failure (avarias) reporting
- **Entry Point:** `Frontend_App/dashboard/src/views/ManutencaoView.jsx:1`
- **Core Files:**
  - `ManutencaoView.jsx:38-180` (MaintenanceCalendar)
  - `ManutencaoView.jsx` (four tabs: Alertas, Histórico, Agendamento, Avarias)
  - `useStore.js` (maintenanceRecords, getSmartMaintenancePrediction)
  - `useAvariasStore.js` (avarias state machine)
- **External Dependencies:** useStore, useAvariasStore, AI prediction engine
- **Data Flow:** Sessions → Cost calc → Maintenance trigger → Alert → Email
- **Status:** Complex, multi-tab feature with AI integration

---

### 5. **Configurações (System Settings & Admin)**
- **Purpose:** User roles/permissions, operational parameters, Procore integration UI
- **Entry Point:** `Frontend_App/dashboard/src/views/ConfiguracoesView.jsx:758`
- **Core Files:**
  - `ConfiguracoesView.jsx:758-1412` (seven tabs: Geral, Perfis, Integrações, Demo, Notificações, Aparência, BD)
  - `ConfiguracoesView.jsx:27-275` (ProcoreIntegrationSection)
  - `ConfiguracoesView.jsx:632-755` (OperationalSettingsSection — fuel price, CO2, maintenance interval)
  - `ConfiguracoesView.jsx:297-356` (RoleCard + RoleEditModal)
  - `useAuthStore.js` (getAllRoles, updateRole, can())
  - `useThemeStore.js` (theme toggling)
- **External Dependencies:** useAuthStore, useThemeStore, useStore (system settings), Procore API
- **Data Flow:** Form submission → Backend → Real-time store update
- **Status:** Central admin hub, multi-concern feature

---

### 6. **Secondary Views** (defined for completeness)
- **Obras** — Location/job site management
- **Operadores** — Personnel with card ID tracking
- **Relatórios** — Aggregated analytics
- **Financeiro** — Cost tracking, tariff management
- **Qualidade** — Session validation & anomaly detection
- **Análises** — Charts & trends
- **Mobile Hub** — Field operator interface

---

## Backend Systems (Cloud Functions)

### 7. **Session Management (RFID → State Machine)**
- **Purpose:** Process RFID scans → create/close sessions → validate anomalies → cost calculation
- **Entry Points:**
  - `Backend_Cloud/functions/index.js:267` (handleSessionTrigger — RFID scan handler)
  - `Backend_Cloud/functions/index.js:638` (autoCloseStuckSessions — cron job)
  - `Backend_Cloud/functions/index.js:1050` (checkLongSessions — anomaly detection)
  - `Backend_Cloud/functions/index.js:1221` (onSessionCorrected — validation handler)
- **Core Logic:**
  - RFID scan buffering & deduplication
  - State machine: OPEN → (CLOSED | AUTO_CLOSED)
  - Anomaly detection: >5h continuous, >14h auto-close
  - Session cost calculation (tariff lookup)
  - Immutability: `sessions.tariffSnapshot`, `sessions.costs` never modified post-close
- **External Dependencies:** Tariff Management, Cost Calculation, Alerts System
- **Data Flows:** RFID scans → sessions collection → Procore export queue
- **Status:** Critical path, complex state machine with immutability constraints

---

### 8. **Alerts & Notifications**
- **Purpose:** Email alerts for session anomalies, maintenance triggers, validation requests
- **Entry Points:**
  - `Backend_Cloud/functions/index.js:522` (onAlertCreated)
  - `Backend_Cloud/functions/index.js:568` (resendAlertEmail)
  - `Backend_Cloud/functions/index.js:187` (sendValidationEmail)
- **Core Logic:**
  - Email templating (HTML)
  - SMTP transporter (Gmail/custom)
  - Alert type routing (LONG_SESSION, AUTO_CLOSE, MAINTENANCE)
  - Validation URL generation
- **External Dependencies:** Email configuration (env/Firebase Secrets), alerts collection
- **Data Flows:** Firestore alert trigger → Email dispatch
- **Status:** Notification subsystem, SMTP-driven

---

### 9. **Procore Integration (OAuth + REST API)**
- **Purpose:** Sync equipment catalog, projects, directory; export sessions as timecards; sync costs
- **Entry Points:**
  - `Backend_Cloud/functions/index.js:1167` (procoreBridge — API handler)
  - `Backend_Cloud/functions/index.js:1176` (procoreScheduledSync — cron)
  - `Backend_Cloud/functions/index.js:1185` (procoreDailyWriteback — daily cost sync)
  - `Backend_Cloud/functions/index.js:1196` (procoreExportRetry — retry queue)
  - `/api/procore/authorize` (OAuth callback)
  - `/api/procore/sync` (manual trigger)
- **Core Files:**
  - `procore/procoreBridge.js` (OAuth2, token refresh, API client)
  - `procore/procoreSessionExporter.js` (Timecard entry creation)
  - `procore/procorePwaProjector.js` (Equipment-to-project association)
  - `procore/procoreScheduler.js` (cron orchestration)
- **External Dependencies:** OAuth secrets, Procore API keys, Session/Cost data
- **Data Flows:**
  - Procore → Firestore: Projects, equipment catalog, directory (read-only mirrors)
  - Firestore → Procore: Sessions → Timecard entries, session costs → Daily logs
  - Retry mechanism: exponential backoff for failed exports
- **Status:** Complex, bidirectional sync with retry logic

---

### 10. **Cost Calculation**
- **Purpose:** Compute session costs from tariff snapshots; aggregate machine costs
- **Entry Points:**
  - `Backend_Cloud/functions/index.js:242` (calculateSessionCost)
  - `Backend_Cloud/functions/index.js:225` (getTariffForDate)
- **Core Logic:**
  - Tariff snapshot immutability (never modify post-session-close)
  - Hourly rate lookup: cost = durationHours × tariff
  - Machine-level cost aggregation
  - CO2 emission calculation: consumption × co2FactorPerLitre
- **External Dependencies:** Tariff Management, Session data
- **Data Flows:** Session close → tariff lookup → cost calculation → sessions.costs (immutable)
- **Status:** Core calculation engine, strict immutability requirements

---

### 11. **Tariff Management**
- **Purpose:** Define machine hourly rates; version control tariff changes
- **Core Files:**
  - `utils/costCalculator.js` (tariff application logic)
- **Core Logic:**
  - Tariff versioning: { machineId, rate, effectiveFrom, effectiveTo }
  - Append-only audit log: `machines.tariffHistory[]` (never delete)
- **External Dependencies:** machines collection, cost calculation
- **Data Flows:** Tariff config → getTariffForDate lookup → cost calculation
- **Status:** Data integrity feature, append-only constraint

---

### 12. **Rate Limiting & Security**
- **Purpose:** Protect API endpoints from abuse
- **Core Files:**
  - `utils/rateLimiter.js` (per-IP/user rate limiting)
- **Core Logic:**
  - Procore API calls: once per hour max (external rate limit)
  - Session endpoints: throttled
- **External Dependencies:** Express middleware
- **Status:** Security subsystem, protective wrapper

---

## State Management Layer (Zustand Stores)

### 13. **Main Application Store (useStore)**
- **File:** `Frontend_App/dashboard/src/store/useStore.js`
- **Purpose:** Centralized state for sessions, machines, operators, settings
- **Core State:**
  - `sessions`, `machines`, `operators`, `obras`, `maintenanceRecords`, `locationCards`
  - `procoreProjects`, `procoreDirectory`, `procoreEquipment` (read-only mirrors)
  - `systemSettings` (fuelPricePerLitre, co2FactorPerLitre, defaultMaintenanceInterval)
  - `maintenanceSchedules`, `dateFilter`, `customRange`
- **Key Methods:**
  - `initializeListeners()` — Firestore real-time subscriptions
  - `getFilteredSessions(dateFilter)` — Date-range queries
  - `getKPIs()` — Aggregate KPIs
  - `getSmartMaintenancePrediction(machine)` — AI-based forecast
  - `resolveSessionAnomaly(sessionId, action)` — Validation handler
  - CRUD: `addMachine()`, `updateMachine()`, `deleteMachine()`, `moveMachinesToObra()`
- **External Dependencies:** Firestore backend, useAuthStore (permission checks)
- **Status:** Central hub, heavy Firestore integration

---

### 14. **Auth Store (useAuthStore)**
- **File:** `Frontend_App/dashboard/src/store/useAuthStore.js`
- **Purpose:** User identity, role-based permissions, role management
- **Core State:** `currentUser`, system roles, permissions matrix
- **Key Methods:**
  - `can(PERMISSION)` — Permission check
  - `getAllRoles()`, `addCustomRole()`, `updateRole()`, `deleteRole()`
  - `getUserLevel()`, `canManageRole()`, `getAvailableLevelsForCreation()`
- **External Dependencies:** users collection, roles collection
- **Status:** Auth/authz layer

---

### 15. **Alerts Store (useAlertsStore)**
- **File:** `Frontend_App/dashboard/src/store/useAlertsStore.js`
- **Purpose:** Alert CRUD, threshold evaluation
- **Core State:** `alerts`, `alertConfig`
- **External Dependencies:** alerts collection
- **Status:** Notification subsystem

---

### 16. **Avarias Store (useAvariasStore)**
- **File:** `Frontend_App/dashboard/src/store/useAvariasStore.js`
- **Purpose:** Failure (avaria) report management
- **Core State:** `avarias` (pending, open, closed statuses)
- **External Dependencies:** avarias collection
- **Status:** Maintenance subsystem

---

### 17. **Theme Store (useThemeStore)**
- **File:** `Frontend_App/dashboard/src/store/useThemeStore.js`
- **Purpose:** UI theme toggling (light/dark)
- **Core State:** `theme` ('light' | 'dark')
- **Key Methods:** `toggleTheme()`
- **Status:** UI preference store

---

## Permission & Role Framework

### 18. **Role-Based Access Control (RBAC)**
- **File:** `Frontend_App/dashboard/src/config/permissions.js`
- **Roles (8 system roles, hierarchical):**
  - `admin` (Level 4) — Full system access
  - `gestor_frota` (Level 3) — Fleet management
  - `gestor_financeiro` (Level 3) — Costs, tariffs
  - `encarregado_obra` (Level 2) — Obra-scoped management
  - `gestor_sustentabilidade` (Level 3) — ESG, CO2
  - `it` (Level 4) — System admin, integrations
  - `tecnico_manutencao` (Level 2) — Maintenance
  - `operador` (Level 1) — Field operator
- **Permission Categories:**
  - `SESSIONS_*` — View all, validate, correct
  - `MACHINES_*` — CRUD, move to obra
  - `MAINTENANCE_*` — Schedule, view predictions
  - `SETTINGS_*` — Operational parameters, roles
  - `QUALITY_*` — Validation workflows
  - `REPORTS_*` — Analytics, CSV export
- **External Dependencies:** useAuthStore, config/permissions.js
- **Status:** Core security/authz layer

---

## External Integrations

### 19. **Procore Sandbox (OAuth2 + REST)**
- **Endpoints:**
  - `POST /api/procore/authorize` — OAuth callback
  - `GET /api/procore/status` — Connection state
  - `POST /api/procore/sync` — Manual trigger
  - `POST /api/procore/disconnect` — Revoke token
- **Data Flows:**
  - Procore → Firestore: Read-only mirrors (projects, equipment, directory)
  - Firestore → Procore: Timecard entries (sessions), Daily logs (costs)
- **Status:** External system, critical for cost sync

---

### 20. **Email (SMTP)**
- **Purpose:** Validation alerts, anomaly notifications
- **External Dependencies:** Nodemailer, email config (Gmail/custom SMTP)
- **Status:** Notification delivery

---

---

## Summary Statistics

| Category | Count | Examples |
|----------|-------|----------|
| **Frontend Views** | 7 primary + 7 secondary | Dashboard, Sessões, Máquinas, Manutenção, Configurações, ... |
| **Backend Systems** | 6 | Session Management, Alerts, Procore Sync, Cost Calc, Tariffs, Rate Limiting |
| **Stores** | 5 | useStore, useAuthStore, useAlertsStore, useAvariasStore, useThemeStore |
| **Role-Based Access** | 8 roles + 15+ permissions | Admin, Gestor Frota, Operador, ... |
| **External Integrations** | 2 | Procore OAuth, Email SMTP |
| **Total Features Identified** | 20 | End-to-end system coverage |

---

## Feature Boundaries (Approved)

✅ **Primary Features (Core Path):**
1. Dashboard (overview)
2. Sessões (session lifecycle)
3. Máquinas (equipment CRUD)
4. Manutenção (predictive alerts)
5. Configurações (admin hub)

✅ **Backend Systems:**
6. Session Management (RFID → state machine)
7. Alerts & Notifications
8. Procore Integration (bidirectional sync)
9. Cost Calculation
10. Tariff Management

✅ **Infrastructure:**
11-17. Stores (Zustand) & Theme
18. RBAC (permissions)
19-20. External Integrations

**Ready for Phase 1: Per-Feature Flowcharts** → Deploy subagents for flowchart generation (features 1-10 in parallel).
