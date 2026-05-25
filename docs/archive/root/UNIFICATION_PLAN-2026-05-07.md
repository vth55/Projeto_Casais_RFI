# Unification Implementation Plan
## Casais Fleet Intelligence — Safe, Incremental Refactoring

**Status:** Ready to execute  
**Effort:** 7-10 hours (phased)  
**Risk Level:** LOW (incremental, tested after each phase)  
**Savings:** 300+ LOC

---

## Strategy

1. **Phase 0:** Verify current code (grep, verify line ranges)
2. **Phases 1-3:** CRITICAL systems (git commit after each)
3. **Phases 4-7:** HIGH priority systems  
4. **Phases 8-10:** MEDIUM priority systems
5. **Final:** Full verification (tests, manual testing)

**Key:** Every phase preserves functionality. Dev server must run. Tests must pass.

---

## Quick Summary by Priority

### 🔴 CRITICAL (Phases 1-3)
1. **Firestore Listeners Factory** — 3 stores, 180 LOC boilerplate
2. **CRUD Operations Factory** — 8+ methods, 60 LOC duplicated
3. **Procore Token Unification** — Remove reimplementation (security)

### 🟠 HIGH (Phases 4-7)  
4. **Procore Config Extraction** — 3 files, 18 LOC
5. **TabNav Component** — 2 views, 15 LOC
6. **Timestamp Parsing Utility** — 10+ spots, 20 LOC
7. **Event Aggregation Helper** — 4 loops, 30 LOC

### 🟡 MEDIUM (Phases 8-10)
8. **Permission Guards** (component + hook)
9. **Procore Status Hook**
10. **Form State Hook**

---

## Detailed Phase Breakdown

### Phase 0: Code Discovery (30 min)
**Objective:** Verify pathfinder findings, exact line ranges, current patterns

**Tasks:**
- [ ] Verify `useStore.js:69-211` has 8 onSnapshot listeners (identical pattern)
- [ ] Verify `useAlertsStore.js:72-97` has 1 listener (same pattern)
- [ ] Verify `useAvariasStore.js:23-43` has 1 listener (same pattern)
- [ ] Verify CRUD methods in useStore.js (lines 235-250, 691-730 for machines, operators, etc.)
- [ ] Verify Procore token logic in `procoreBridge.js:139-191` and `procoreSessionExporter.js:85-115`
- [ ] Verify Procore URLs in 3 files (procoreBridge, procoreSessionExporter, procoreScheduler)
- [ ] Create baseline test run (npm run dev, test features work)

**Git:** No commit needed (discovery only)

---

### Phase 1: Firestore Listeners Factory (2 hours)
**Objective:** Create factory, replace 3 stores' listeners, test

**Create:** `Frontend_App/dashboard/src/utils/firestoreListeners.js`
```javascript
export const createCollectionListener = (db, collectionPath, options = {}) => {
  const { orderByField = null, orderByDirection = 'desc', onError = console.error } = options;
  
  return (callback) => {
    const q = orderByField
      ? query(collection(db, collectionPath), orderBy(orderByField, orderByDirection))
      : collection(db, collectionPath);
    
    return onSnapshot(q,
      (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => onError(`[Firestore] Error listening to ${collectionPath}:`, error)
    );
  };
};
```

**Modify:**
- useStore.js: Replace lines 78-90, 93-101, 104-112, etc. with factory calls
- useAlertsStore.js: Replace lines 72-97 with factory call
- useAvariasStore.js: Replace lines 23-43 with factory call

**Test:**
- [ ] npm run dev (must not error)
- [ ] Dashboard loads, KPIs update in real-time
- [ ] Sessões view loads, sessions appear
- [ ] Manutenção view loads, events appear
- [ ] No console errors about Firestore

**Git Commit:** `feat: create firestore listeners factory (unification phase 1)`

---

### Phase 2: CRUD Operations Factory (2 hours)
**Objective:** Create factory, replace 8+ CRUD methods, test

**Create:** `Frontend_App/dashboard/src/utils/firestoreCrud.js`
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
      await updateDoc(doc(db, basePath, id), { ...data, updatedAt: Timestamp.now() });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  delete: async (id) => {
    if (!db) return { success: false, error: 'DB not initialized' };
    try {
      await deleteDoc(doc(db, basePath, id));
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
});
```

**Modify:**
- useStore.js: Replace addMachine/updateMachine/deleteMachine (691-730) with factory
- useStore.js: Replace addOperator/updateOperator/deleteOperator with factory
- useStore.js: Replace addSchedule/updateSchedule/deleteSchedule with factory
- useStore.js: Replace all CRUD pairs with factory calls (wrap with domain sanitization if needed)

**Test:**
- [ ] Open Máquinas view
- [ ] Create new machine (form submit, verify in Firestore)
- [ ] Edit machine (form submit, verify in Firestore)
- [ ] Delete machine (confirm dialog, verify removed from Firestore)
- [ ] Same for operators, schedules, locations, obras
- [ ] No console errors

**Git Commit:** `feat: create CRUD factory (unification phase 2)`

---

### Phase 3: Procore Token Unification (1 hour)
**Objective:** Remove token refresh duplication from procoreSessionExporter

**Modify:**
- `procoreSessionExporter.js`: 
  - Line 1: Add `const { getValidAccessToken } = require('./procoreBridge');`
  - Lines 85-115: Replace procoreFetch() to use `getValidAccessToken()` instead of inline refresh
  - Delete inline token expiry check logic
  - Delete inline refresh call logic

**Test:**
- [ ] Dashboard → Configurações → Integrations → Click "Sync"
- [ ] Verify Procore sync succeeds (no auth errors)
- [ ] Manual RFID session (start/end) → Verify Procore export works
- [ ] No console errors about token

**Git Commit:** `fix: unify procore token management (unification phase 3)`

---

### Phase 4: Procore Config Extraction (30 min)
**Objective:** Extract hardcoded URLs to config file

**Create:** `Backend_Cloud/functions/procore/config.js`
```javascript
const isDev = process.env.ENVIRONMENT === 'development';

module.exports = {
  PROCORE_ENDPOINTS: {
    LOGIN_URL: isDev ? 'https://sandbox.procore.com/oauth/authorize' : 'https://app.procore.com/oauth/authorize',
    TOKEN_URL: isDev ? 'https://sandbox.procore.com/oauth/token' : 'https://app.procore.com/oauth/token',
    API_URL: isDev ? 'https://api.sandbox.procore.com' : 'https://api.procore.com',
    AUTH_URL: isDev ? 'https://sandbox.procore.com/login' : 'https://app.procore.com/login',
  },
  PROCORE_REFRESH_SAFETY_MARGIN_MS: 5 * 60 * 1000,
  PROCORE_MAX_RETRY_ATTEMPTS: 3,
  PROCORE_RETRY_BACKOFF_MINUTES: [5, 20, 60],
};
```

**Modify:**
- procoreBridge.js: Replace lines 45-48 with import
- procoreSessionExporter.js: Replace lines 23-26 with import
- procoreScheduler.js: Replace URLs with import (if hardcoded)

**Test:**
- [ ] npm run dev (no errors)
- [ ] Procore sync still works
- [ ] No console errors

**Git Commit:** `refactor: extract procore config (unification phase 4)`

---

### Phase 5-10: Continue Similarly
(TabNav, Timestamp, Event Aggregation, Permissions, Procore Status Hook, Form State Hook)

Each phase:
1. Create new file or component
2. Modify existing code to use it
3. Test affected features
4. Git commit

---

## Final Verification Phase

**Objective:** Ensure zero breaking changes, all features work

**Checklist:**
- [ ] npm run dev (no errors, loads)
- [ ] Dashboard: KPIs update, Procore reconciliation works
- [ ] Sessões: List, filter, validate sessions
- [ ] Máquinas: CRUD operations (add, edit, delete)
- [ ] Manutenção: Calendar displays, events appear
- [ ] Configurações: Role management, Procore sync, theme toggle
- [ ] All alerts/notifications work
- [ ] Mobile responsive works
- [ ] No console errors (critical or warnings)
- [ ] Procore integration still syncs correctly

**Git:** Final commit `chore: complete unification refactoring (phases 1-10)`

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Break existing features | Test after each phase, npm run dev must work |
| Firestore listeners stop | Verify same callback/error handling in factory |
| CRUD fails | Test each operation (create, update, delete) |
| Procore sync breaks | Verify token refresh still works |
| Git merge conflicts | Small, focused commits (one system per commit) |

---

## Summary

**Total effort:** 7-10 hours  
**Phases:** 10 (+ 1 discovery, + 1 verification)  
**Code savings:** 300+ LOC  
**Commits:** 10-12 (one per major system)  
**Risk:** LOW (incremental, tested after each phase)  

**Ready to start? Pick Phase 1 (Firestore Listeners) or Phase 0 (verification) first.**
