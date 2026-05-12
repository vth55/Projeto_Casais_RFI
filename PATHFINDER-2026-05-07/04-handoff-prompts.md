# Phase 4: Handoff Prompts

Ready-to-use `/make-plan` prompts for each unified system. Copy-paste directly into `/make-plan` command to generate implementation plans.

---

## Prompt 1: Firestore Real-Time Listeners Factory

```
Task: Create a Firestore real-time listeners factory to unify 3 stores (useStore, useAlertsStore, useAvariasStore).

Current state:
- useStore.js:69-211 — 8 parallel onSnapshot listeners with boilerplate
- useAlertsStore.js:72-97 — 1 listener, same pattern
- useAvariasStore.js:23-43 — 1 listener, same pattern

Target:
Create shared factory `utils/firestoreListeners.js::createCollectionListener()` that:
- Accepts collectionPath, orderByField (optional), onError callback
- Returns a function that takes a callback and sets up onSnapshot
- Handles all error logging and unsubscribe cleanup

Migration:
1. Create factory file with generic implementation (reference: Frontend_App/dashboard/src/store/useStore.js:69-211)
2. Update useStore.js to use factory for all 8 listeners (replace lines 78-90, 93-101, 104-112, 115-123, 126-134, 137-145, 155-174, 179-196)
3. Update useAlertsStore.js to use factory (replace lines 72-97)
4. Update useAvariasStore.js to use factory (replace lines 23-43)

Testing:
- Verify real-time updates still work (create session, check Dashboard KPIs update)
- Verify error handling (simulate Firebase connection error, check console)
- Verify unsubscribe cleanup (navigate away, verify no memory leaks)

Reference files:
- useStore.js — shows full listener pattern with multiple collections
- useAlertsStore.js — shows simplified single-listener pattern
```

---

## Prompt 2: CRUD Operations Factory

```
Task: Create Firestore CRUD factory to unify 8+ CRUD methods in useStore.

Current state:
- useStore.js:235-250 — addMaintenanceSchedule/updateMaintenanceSchedule/deleteMaintenanceSchedule
- useStore.js:691-709 — addMachine/updateMachine/deleteMachine
- useStore.js:722-730 — Similar for operators, locationCards, obras, maintenance
- All follow identical pattern: try/catch, setDoc/updateDoc/deleteDoc, {success:true/false} response

Target:
Create `utils/firestoreCrud.js::createCrudActions()` that:
- Accepts db instance and basePath (collection path)
- Returns object with { create, update, delete } methods
- Each method returns { success: boolean, error?: string, id?: string }
- Handles timestamps (createdAt, updatedAt)

Migration:
1. Create factory file (reference: Frontend_App/dashboard/src/store/useStore.js:691-730)
2. Update useStore.js to use factory for each domain (machines, schedules, locationCards, etc.)
   - Example: const machineActions = createCrudActions(db, 'machines');
   - Wrap with domain-specific sanitization if needed (e.g., sanitizeData)
3. Test each CRUD operation (add, update, delete machine) in Máquinas view

Testing:
- Create new machine → verify in Firestore
- Update machine → verify in Firestore
- Delete machine → verify in Firestore
- Error cases (invalid ID, network error) → verify error handling

Reference files:
- useStore.js:691-730 — exact pattern to extract
- MaquinasView.jsx:378-386 — shows how CRUD methods are called
```

---

## Prompt 3: Procore Token Management Unification

```
Task: Unify token refresh logic between procoreBridge and procoreSessionExporter.

Current state:
- procoreBridge.js:139-161 — refreshAccessToken() function
- procoreBridge.js:170-191 — getValidAccessToken() that checks expiry and calls refresh
- procoreSessionExporter.js:85-115 — procoreFetch() has inline token refresh logic (DUPLICATION)

Issue:
procoreSessionExporter.js reimplements token refresh instead of using procoreBridge's getValidAccessToken()

Target:
Modify procoreSessionExporter.js to use getValidAccessToken() from procoreBridge:
1. Import getValidAccessToken from procoreBridge
2. In procoreFetch(), call: const token = await getValidAccessToken();
3. Remove inline token expiry check logic (lines ~94-96)
4. Remove inline refresh call logic

Migration:
1. In procoreSessionExporter.js, add import: const { getValidAccessToken } = require('./procoreBridge');
2. Replace inline token logic in procoreFetch() with single call: const token = await getValidAccessToken();
3. Delete lines with inline token refresh logic
4. Test session export (start/end RFID tap) → verify Procore export succeeds

Testing:
- Trigger session export with token near expiry → verify token is refreshed
- Verify in procoreBridge logs that refresh was called
- Export should succeed without errors

Reference files:
- procoreBridge.js:170-191 — getValidAccessToken() function to use
- procoreSessionExporter.js:85-115 — procoreFetch() function to modify
- procoreSessionExporter.js:518-568 — retryFailedExports() that calls procoreFetch()
```

---

## Prompt 4: Procore Configuration Extraction

```
Task: Extract hardcoded Procore URLs to shared config file.

Current state:
- procoreBridge.js:45-48 — PROCORE_LOGIN_URL, PROCORE_API_URL, PROCORE_AUTH_URL, PROCORE_TOKEN_URL
- procoreSessionExporter.js:23-26 — Same URLs duplicated
- (procoreScheduler.js — likely has same URLs)

Target:
Create `procore/config.js` with all Procore endpoints and constants:
- PROCORE_ENDPOINTS (with dev/prod switching)
- PROCORE_REFRESH_SAFETY_MARGIN_MS = 5 * 60 * 1000
- PROCORE_MAX_RETRY_ATTEMPTS = 3
- PROCORE_RETRY_BACKOFF_MINUTES = [5, 20, 60]

Migration:
1. Create procore/config.js with constants
2. Update procoreBridge.js: import { PROCORE_ENDPOINTS, ... } from './config'; replace inline constants
3. Update procoreSessionExporter.js: same import, replace inline constants
4. Update procoreScheduler.js: same import if URLs are hardcoded there
5. Test manual Procore sync (Dashboard) → verify API calls succeed

Testing:
- Manual sync in Dashboard → verify Procore projects fetch
- Verify in browser Network tab that requests go to correct endpoints
- Switch ENVIRONMENT to 'production' (if testable) → verify URLs switch

Reference files:
- procoreBridge.js:45-48 — source of constants to extract
- procoreSessionExporter.js:23-26 — duplicate constants
```

---

## Prompt 5: TabNav Component Extraction

```
Task: Extract TabNav component from SessoesView and ManutencaoView.

Current state:
- SessoesView.jsx:12-38 — TabNav component definition (flex, border-b, active state logic)
- ManutencaoView.jsx:10-19 — Nearly identical TabNav (minor classname differences)

Target:
Create `components/TabNav.jsx` that:
- Accepts props: tabs (array), activeTab (id), onTabChange (callback), className (optional)
- Renders flex container with tab buttons
- Highlights active tab with blue border and text
- Hover states on inactive tabs

Migration:
1. Extract TabNav to components/TabNav.jsx
2. In SessoesView.jsx, import TabNav and replace inline definition with <TabNav {...} />
3. In ManutencaoView.jsx, import TabNav and replace inline definition with <TabNav {...} />
4. Test tab switching in both views (Sessões, Manutenção)

Testing:
- Click each tab in Sessões view → verify content updates
- Click each tab in Manutenção view → verify content updates
- Verify visual consistency (same colors, spacing, font weight)

Reference files:
- SessoesView.jsx:12-38 — source TabNav to extract
- SessoesView.jsx:330-732 — usage example
- ManutencaoView.jsx:10-19 — duplicate TabNav to replace
```

---

## Prompt 6: Timestamp Parsing Utility

```
Task: Create parseFirestoreTimestamp utility to unify 10+ timestamp conversions.

Current state:
- SessoesView.jsx:42,98,99 — .toDate?.() || new Date(...) pattern
- DashboardView.jsx:42 — same pattern
- useStore.js:552-554 — same pattern in getFilteredSessions()
- Plus multiple other locations

Target:
Create `utils/dateUtils.js::parseFirestoreTimestamp()` that:
- Accepts Firestore Timestamp, Date, string (ISO 8601), or number (ms)
- Returns JavaScript Date object or null
- Handles all timestamp formats consistently

Migration:
1. Create utils/dateUtils.js with parseFirestoreTimestamp function
2. Search codebase for .toDate?.() pattern (grep -r "\.toDate\?\.")
3. Replace with: const date = parseFirestoreTimestamp(value);
4. Test in all affected views (Sessões, Dashboard, Manutenção, etc.)

Testing:
- Open Dashboard (KPI calculation relies on date parsing) → verify KPIs render
- Open Sessões (session time display) → verify times show correctly
- Open Manutenção calendar (event dates) → verify calendar displays correctly

Reference files:
- SessoesView.jsx:42 — example of redundant pattern
- useStore.js:552-554 — example in store
- useStore.js:1225 — another example of duration calculation
```

---

## Prompt 7: Calendar Event Aggregation Helper

```
Task: Extract event aggregation logic from ManutencaoView calendar (4 forEach loops → 1 helper).

Current state:
- ManutencaoView.jsx:66-70 — maintenanceRecords forEach → push event
- ManutencaoView.jsx:72-76 — avarias forEach → push event
- ManutencaoView.jsx:81-97 — forecast forEach → push event (if ≥80% interval)
- ManutencaoView.jsx:99-109 — schedules forEach → push event
- All create same event object structure: date key, type, color, data

Target:
Create `utils/calendarUtils.js::buildCalendarEvents()` that:
- Accepts records array, recordType string ('maintenance'|'avaria'|'scheduled'|'forecast'), machines array
- Returns array of event objects { date, type, color, data, machine }
- Handles date key formatting (YYYY-MM-DD)
- Includes EVENT_TYPE_COLORS constant

Migration:
1. Create utils/calendarUtils.js with buildCalendarEvents function and EVENT_TYPE_COLORS
2. In ManutencaoView.jsx, replace 4 forEach loops with: buildCalendarEvents(records, 'maintenance', machines)
3. Store result in eventsByDay (same as current)
4. Test Manutenção calendar (all 4 event types should render)

Testing:
- Open Manutenção → Calendar tab
- Verify maintenance records show as blue dots
- Verify avarias show as red dots
- Verify scheduled events show as amber dots
- Verify forecasts show as indigo dots
- Click day with events → verify modal shows correct event type and data

Reference files:
- ManutencaoView.jsx:38-180 — MaintenanceCalendar component showing full logic
- ManutencaoView.jsx:66-109 — 4 forEach loops to extract
```

---

## Prompt 8: Permission Guards (Component + Hook)

```
Task: Create PermissionGuard component and useCanAccess hook for centralized permission checks.

Current state:
- Inline checks scattered across views: can(PERMISSION) && <Button>
- ManutencaoView.jsx:1267-1268 — multiple permission variables
- ConfiguracoesView.jsx:779-780 — same pattern
- SessoesView.jsx — implied permission checks

Target:
1. Create `components/auth/PermissionGuard.jsx` — wrapper component
   - Props: permission (string), fallback (node), children (node)
   - Returns children if can(permission), else fallback

2. Create `hooks/useCanAccess.js` — multi-permission hook
   - Accepts ...permissions (variadic)
   - Returns { canAccessAll, canAccessAny, canAccess(p), permissions[] }

Migration:
1. Create both files
2. Replace inline {can(PERMISSION) && <Button>} with <PermissionGuard permission={...}><Button /></PermissionGuard>
3. Replace multiple permission checks with useCanAccess() hook
4. Test in views: ManutencaoView, ConfiguracoesView, SessoesView

Testing:
- Login as different roles (admin, gestor, operador)
- Verify buttons/controls appear/disappear based on permissions
- Verify fallback UI renders when access denied (if specified)

Reference files:
- ManutencaoView.jsx:1267-1268 — multiple permission check pattern to replace
- ConfiguracoesView.jsx:779-780 — same pattern
- config/permissions.js — PERMISSIONS constants
- useAuthStore.js:271-275 — can() method
```

---

## Prompt 9: Procore Status Hook

```
Task: Extract Procore status fetching into reusable hook for Dashboard and Configurações.

Current state:
- ConfiguracoesView.jsx:35-52 — fetchStatus hook with polling
- DashboardView.jsx:305-331 — ProcoreReconciliationPanel with sync logic

Target:
Create `hooks/useProcoreStatus.js` that:
- Accepts optional polling interval (default: 30s)
- Returns { status, isConnected, lastSyncTime, error, refetch }
- Handles 30s polling and cleanup

Migration:
1. Create hooks/useProcoreStatus.js
2. In ConfiguracoesView.jsx, replace fetchStatus implementation with: const { status, isConnected, refetch } = useProcoreStatus();
3. In DashboardView.jsx, replace ProcoreReconciliationPanel status logic with same hook
4. Test Procore integration in both views

Testing:
- Open Configurações → Integrations tab
- Verify Procore status shows "Connected" or "Disconnected"
- Wait 30s → verify status refreshes
- Open Dashboard
- Verify Procore sync rate ring updates with status
- Trigger manual sync → verify status updates

Reference files:
- ConfiguracoesView.jsx:35-52 — current implementation to extract
- DashboardView.jsx:204-228 — useProcoreStatus hook example (different implementation)
- procoreBridge.js:1005-1040 — handleStatus endpoint
```

---

## Prompt 10: Form State Hook

```
Task: Create useFormState hook to unify form state management across MaquinasView and ConfiguracoesView.

Current state:
- MaquinasView.jsx:119-160 — MachineForm with useState for formData, handleSubmit
- ConfiguracoesView.jsx:357-390 — RoleEditModal with identical form pattern
- Both: useState(initialData), handleFieldChange, handleSubmit with validation

Target:
Create `hooks/useFormState.js` that:
- Accepts initialData and onSubmit callback
- Returns { formData, updateField, handleSubmit, reset }
- Handles form state logic generically

Migration:
1. Create hooks/useFormState.js
2. In MaquinasView.jsx::MachineForm, use hook: const { formData, updateField, handleSubmit } = useFormState(initialMachine, onSave);
3. In ConfiguracoesView.jsx::RoleEditModal, use hook: const { formData, updateField, handleSubmit } = useFormState(initialRole, onSaveRole);
4. Keep domain-specific validation in each view (wrap the hook)
5. Test form submissions in both views

Testing:
- Open Máquinas → Add/Edit machine
- Fill form → verify state updates
- Submit → verify onSave called with form data
- Open Configurações → Edit role
- Fill form → verify state updates
- Submit → verify onSave called with form data

Reference files:
- MaquinasView.jsx:119-160 — MachineForm pattern to extract
- ConfiguracoesView.jsx:357-390 — RoleEditModal pattern to extract
```

---

## Summary

| System | Effort | Impact | Prompt | Files |
|--------|--------|--------|--------|-------|
| **1. Firestore Listeners** | Medium | 180 LOC saved | [Above](#prompt-1-firestore-real-time-listeners-factory) | useStore, stores |
| **2. CRUD Factory** | Medium | 60 LOC saved | [Above](#prompt-2-crud-operations-factory) | useStore |
| **3. Token Management** | Low | Reimplementation removed | [Above](#prompt-3-procore-token-management-unification) | procoreSessionExporter |
| **4. Procore Config** | Low | 18 LOC saved | [Above](#prompt-4-procore-configuration-extraction) | procoreBridge, exporter |
| **5. TabNav** | Low | 15 LOC saved | [Above](#prompt-5-tabnav-component-extraction) | SessoesView, ManutencaoView |
| **6. Timestamp Utility** | Low | 20 LOC saved | [Above](#prompt-6-timestamp-parsing-utility) | Views, stores |
| **7. Event Aggregation** | Low | 30 LOC saved | [Above](#prompt-7-calendar-event-aggregation-helper) | ManutencaoView |
| **8. Permission Guards** | Low | Consistency | [Above](#prompt-8-permission-guards-component--hook) | Views |
| **9. Procore Status Hook** | Low | 20 LOC saved | [Above](#prompt-9-procore-status-hook) | ConfiguracoesView, Dashboard |
| **10. Form State Hook** | Low | Boilerplate reduction | [Above](#prompt-10-form-state-hook) | MaquinasView, ConfiguracoesView |

**Total potential impact: 300+ LOC saved, improved maintainability**

Each prompt is ready to copy-paste into `/make-plan` for detailed implementation planning.
