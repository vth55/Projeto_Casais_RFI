# Phase 3: Unified Proposal

## Overview

Based on Phase 2 duplication findings, this document proposes unified designs for each duplicated concern. Recommendations follow the principle: **simplest unification wins** — prefer deletion over abstraction, prefer one path over configurable paths.

---

## Unified System 1: Firestore Real-Time Listeners

**Current State:** 3 separate listener implementations with identical boilerplate
- `useStore.js:69-211` (8 listeners)
- `useAlertsStore.js:72-97` (1 listener)
- `useAvariasStore.js:23-43` (1 listener)

**Unified Design:**

Create shared factory `utils/firestoreListeners.js`:
```javascript
export const createCollectionListener = (db, collectionPath, options = {}) => {
  const { 
    orderByField = null,
    orderByDirection = 'desc',
    onError = console.error 
  } = options;

  return (callback) => {
    const q = orderByField
      ? query(collection(db, collectionPath), orderBy(orderByField, orderByDirection))
      : collection(db, collectionPath);

    return onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
      },
      (error) => onError(`[Firestore Listener] Error on ${collectionPath}:`, error)
    );
  };
};
```

**Migration Path:**
1. In `useStore.js::initializeListeners()`, replace 8 `onSnapshot` calls with factory calls
2. In `useAlertsStore.js`, replace 1 listener with factory call
3. In `useAvariasStore.js`, replace 1 listener with factory call

**Impact:**
- Reduces 180 LOC of boilerplate
- Single source of truth for Firestore subscription logic
- Easier to add features (e.g., error retry, logging) globally

**Constraints:** None — factory is transparent drop-in replacement

---

## Unified System 2: Firestore CRUD Operations

**Current State:** 8+ identical CRUD methods across useStore (machines, schedules, locationCards, operators, obras, maintenance, etc.)

**Unified Design:**

Create CRUD factory `utils/firestoreCrud.js`:
```javascript
export const createCrudActions = (db, basePath) => ({
  create: async (id, data, options = {}) => {
    if (!db) return { success: false, error: 'DB not initialized' };
    try {
      const finalId = id || (options.idPrefix ? `${options.idPrefix}_${Date.now()}` : undefined);
      await setDoc(doc(db, basePath, finalId), {
        ...data,
        createdAt: Timestamp.now(),
      });
      return { success: true, id: finalId };
    } catch (error) {
      console.error(`[CRUD] Error creating in ${basePath}:`, error);
      return { success: false, error: error.message };
    }
  },

  update: async (id, data) => {
    if (!db) return { success: false, error: 'DB not initialized' };
    try {
      await updateDoc(doc(db, basePath, id), {
        ...data,
        updatedAt: Timestamp.now(),
      });
      return { success: true, id };
    } catch (error) {
      console.error(`[CRUD] Error updating in ${basePath}:`, error);
      return { success: false, error: error.message };
    }
  },

  delete: async (id) => {
    if (!db) return { success: false, error: 'DB not initialized' };
    try {
      await deleteDoc(doc(db, basePath, id));
      return { success: true, id };
    } catch (error) {
      console.error(`[CRUD] Error deleting from ${basePath}:`, error);
      return { success: false, error: error.message };
    }
  },
});
```

**Migration Path:**
1. Replace `addMachine`, `updateMachine`, `deleteMachine` with factory-generated methods
2. Wrap factory with domain-specific logic (sanitization, validation) in useStore
3. Same pattern for operators, schedules, etc.

**Example in useStore:**
```javascript
const machineActions = createCrudActions(db, 'machines');

const addMachine = (data) => {
  const sanitized = sanitizeData(data, MACHINE_FIELDS);
  return machineActions.create(undefined, sanitized, { idPrefix: 'machine' });
};

const updateMachine = (id, data) => {
  const sanitized = sanitizeData(data, MACHINE_FIELDS);
  return machineActions.update(id, sanitized);
};
```

**Impact:**
- Reduces 60+ LOC of duplicated CRUD boilerplate
- Domain-specific logic remains in useStore (separation of concerns)
- Easier to audit CRUD error handling

**Constraints:** 
- Domain-specific fields (photo uploads, field sanitization) must wrap the factory, not modify it
- Factory is pure — no side effects beyond Firestore operations

---

## Unified System 3: Procore Token Management

**Current State:** Token refresh logic implemented in 2 places
- `procoreBridge.js:170-191` — `getValidAccessToken()` (public, correct)
- `procoreSessionExporter.js:85-115` — `procoreFetch()` (private, duplicated)

**Unified Design:**

`procoreSessionExporter.js` should use `getValidAccessToken()` from procoreBridge:

```javascript
// In procoreSessionExporter.js
const { getValidAccessToken } = require('./procoreBridge');

async function procoreFetch(endpoint, options = {}) {
  const token = await getValidAccessToken(); // Use shared logic
  
  if (!token) {
    throw new Error('[Procore] Not connected or token refresh failed');
  }
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  
  return response.json();
}
```

**Remove from procoreSessionExporter:**
- Inline token expiry check logic
- Inline refresh call
- All token-related constants (now use procoreBridge exports)

**Impact:**
- Eliminates 20 LOC of duplication
- Single source of truth for token lifecycle
- Easier to update refresh logic globally

**Constraints:** 
- procoreBridge must export `getValidAccessToken()` (already does)
- No change to token persistence logic

---

## Unified System 4: Procore API Configuration

**Current State:** Hardcoded Procore URLs in 3 files
- `procoreBridge.js:45-48`
- `procoreSessionExporter.js:23-26`
- (procoreScheduler.js if exists)

**Unified Design:**

Create `procore/config.js`:
```javascript
const isDev = process.env.ENVIRONMENT === 'development';

module.exports = {
  PROCORE_ENDPOINTS: {
    LOGIN_URL: isDev 
      ? 'https://sandbox.procore.com/oauth/authorize'
      : 'https://app.procore.com/oauth/authorize',
    TOKEN_URL: isDev
      ? 'https://sandbox.procore.com/oauth/token'
      : 'https://app.procore.com/oauth/token',
    API_URL: isDev
      ? 'https://api.sandbox.procore.com'
      : 'https://api.procore.com',
    AUTH_URL: isDev
      ? 'https://sandbox.procore.com/login'
      : 'https://app.procore.com/login',
  },
  PROCORE_REFRESH_SAFETY_MARGIN_MS: 5 * 60 * 1000, // 5 minutes
  PROCORE_MAX_RETRY_ATTEMPTS: 3,
  PROCORE_RETRY_BACKOFF_MINUTES: [5, 20, 60],
};
```

**Migration Path:**
1. Replace inline constants with imports: `const { PROCORE_ENDPOINTS } = require('../procore/config');`
2. Remove duplicate constant definitions from procoreBridge, procoreSessionExporter, procoreScheduler

**Impact:**
- Eliminates 18 LOC of duplication
- Single source of truth for endpoint switching (dev vs. prod)
- Easier to manage environment-specific configuration

**Constraints:** None — pure configuration extraction

---

## Unified System 5: Permission Guards (Component & Hook)

**Current State:** Scattered inline permission checks with no guard component

**Unified Design:**

Create `components/auth/PermissionGuard.jsx`:
```javascript
import { useAuthStore } from '@/store/useAuthStore';

export const PermissionGuard = ({ 
  permission, 
  fallback = null, 
  children 
}) => {
  const { can } = useAuthStore();
  
  return can(permission) ? children : fallback;
};

// Usage:
// <PermissionGuard permission={PERMISSIONS.MAINTENANCE_SCHEDULE}>
//   <Button onClick={handleSchedule}>Schedule Maintenance</Button>
// </PermissionGuard>
// <PermissionGuard permission={PERMISSIONS.SETTINGS_ROLES} fallback={<p>No access</p>}>
//   <RoleEditButton />
// </PermissionGuard>
```

Create `hooks/useCanAccess.js`:
```javascript
import { useAuthStore } from '@/store/useAuthStore';

export const useCanAccess = (...permissions) => {
  const { can } = useAuthStore();
  
  return {
    canAccessAll: permissions.every(p => can(p)),
    canAccessAny: permissions.some(p => can(p)),
    canAccess: (permission) => can(permission),
    permissions: permissions.map(p => ({ permission: p, hasAccess: can(p) })),
  };
};

// Usage:
// const { canAccessAll } = useCanAccess(PERMISSIONS.SETTINGS_ROLES, PERMISSIONS.SETTINGS_GENERAL);
// if (!canAccessAll) return <PermissionDenied />;
```

**Migration Path:**
1. Replace inline `{can(PERMISSION) && <Button>}` with `<PermissionGuard>`
2. Replace multi-permission checks with `useCanAccess()` hook

**Impact:**
- Centralizes permission logic
- Improves testability (can mock PermissionGuard)
- Consistent UI pattern across views

**Constraints:** 
- useAuthStore must always be available (already is)
- Permission constants must be imported

---

## Unified System 6: TabNav Component Extraction

**Current State:** TabNav implemented identically in 2 views
- `SessoesView.jsx:12-38`
- `ManutencaoView.jsx:10-19`

**Unified Design:**

Create `components/TabNav.jsx`:
```javascript
export const TabNav = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = '' 
}) => {
  return (
    <div className={`flex border-b border-gray-200 gap-8 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`py-3 px-1 border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// Usage:
// <TabNav 
//   tabs={[
//     { id: 'active', label: 'Ativas' },
//     { id: 'history', label: 'Histórico' },
//   ]}
//   activeTab={activeTab}
//   onTabChange={setActiveTab}
// />
```

**Migration Path:**
1. Extract to `components/TabNav.jsx`
2. Import in SessoesView, ManutencaoView
3. Remove inline TabNav definitions

**Impact:**
- Reduces 15 LOC of duplication
- Consistent tab styling across views
- Easier to update tab design globally

**Constraints:** None — pure component extraction

---

## Unified System 7: Timestamp Parsing Utility

**Current State:** 10+ instances of `.toDate() || new Date()` pattern

**Unified Design:**

Create `utils/dateUtils.js`:
```javascript
export const parseFirestoreTimestamp = (value) => {
  if (!value) return null;
  
  // Firestore Timestamp object
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  // Already a Date
  if (value instanceof Date) {
    return value;
  }
  
  // String (ISO 8601)
  if (typeof value === 'string') {
    return new Date(value);
  }
  
  // Timestamp in milliseconds
  if (typeof value === 'number') {
    return new Date(value);
  }
  
  return null;
};

// Usage:
// const startTime = parseFirestoreTimestamp(session.startTime);
```

**Migration Path:**
1. Import in views and stores: `const { parseFirestoreTimestamp } = require('@/utils/dateUtils');`
2. Replace `.toDate?.() || new Date(...)` with `parseFirestoreTimestamp(...)`

**Impact:**
- Reduces 20 LOC of scattered conversion logic
- Handles all timestamp types consistently
- Easier to test and maintain

**Constraints:** None — pure utility function

---

## Unified System 8: Event Aggregation Helper (Manutenção)

**Current State:** 4 parallel forEach loops building event objects

**Unified Design:**

Create `utils/calendarUtils.js`:
```javascript
export const buildCalendarEvents = (records, recordType, machines) => {
  const events = [];
  
  records.forEach((record) => {
    const machineId = record.machineId || record._machine?.id;
    const machine = machines.find(m => m.id === machineId);
    
    const date = new Date(record.createdAt?.toDate?.() || record.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    events.push({
      date: key,
      type: recordType, // 'maintenance', 'avaria', 'scheduled', 'forecast'
      color: EVENT_TYPE_COLORS[recordType],
      data: record,
      machine: machine?.name || 'Unknown',
    });
  });
  
  return events;
};

const EVENT_TYPE_COLORS = {
  maintenance: 'blue',
  avaria: 'red',
  scheduled: 'amber',
  forecast: 'indigo',
};
```

**Migration Path:**
1. Replace 4 forEach loops with: `const events = buildCalendarEvents(records, 'maintenance', machines);`

**Impact:**
- Reduces 30 LOC of repeated logic
- Consistent event structure across types
- Easier to add new event types

**Constraints:** 
- EVENT_TYPE_COLORS must be shared constant
- Requires machine data for enrichment

---

## Anti-Pattern Guard

These unifications intentionally **avoid**:
- ❌ Adding a new abstraction layer "for flexibility" — each factory is purpose-built
- ❌ Keeping both old paths behind a feature flag — old code is removed
- ❌ Introducing a registry/factory pattern when switch/config suffices — used simple factories
- ❌ Preserving divergent behavior "just in case" — legitimate specialization is wrapped, not duplicated

---

## Implementation Roadmap

**Phase 1 (Critical):** 3-4 hours
1. CRUD factory (saves 60 LOC)
2. Firestore listener factory (saves 180 LOC)
3. Procore token unification (removes reimplementation)
4. Procore config extraction (saves 18 LOC)

**Phase 2 (High):** 2-3 hours
5. TabNav extraction (saves 15 LOC)
6. Timestamp parsing utility (saves 20 LOC)
7. Event aggregation helper (saves 30 LOC)

**Phase 3 (Medium):** 2-3 hours
8. Permission guards (component + hook)
9. Procore status hook
10. Form state hook

**Total Effort:** 7-10 hours
**Total Savings:** 300+ LOC
**ROI:** High — improves maintainability, testability, reduces bugs

---

## Summary Diagram

```
useStore.js (Machines, Schedules, etc.)
  └─ Uses CRUD factory from firestoreCrud.js
     ├─ Wraps with domain sanitization
     └─ Maintains listener initialization via listener factory

useAlertsStore.js, useAvariasStore.js
  └─ Use listener factory from firestoreListeners.js

procoreSessionExporter.js
  └─ Uses getValidAccessToken() from procoreBridge.js
  └─ Imports endpoints from procore/config.js

Views (SessoesView, ManutencaoView, ConfiguracoesView)
  ├─ Use <PermissionGuard> component or useCanAccess hook
  ├─ Use <TabNav> component
  └─ Use parseFirestoreTimestamp() utility

Dashboard, Configurações
  └─ Use useProcoreStatus hook
```
