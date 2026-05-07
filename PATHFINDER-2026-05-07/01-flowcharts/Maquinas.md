# Máquinas Flowchart

## Feature: Máquinas (Equipment Fleet Management)
**Entry Point:** `Frontend_App/dashboard/src/views/MaquinasView.jsx:339`

CRUD operations for equipment with location assignment and bulk operations.

**External Dependencies:**
- `useStore.addMachine(), updateMachine(), deleteMachine(), moveMachinesToObra()`
- Firestore real-time subscriptions (machines, obras, system settings)
- Category taxonomy lookup

**Key Flows:**
1. **Display** — Load machines from useStore → Grid/Table view toggle → Search/Filter
2. **CRUD** — Add/Edit/Delete individual machines via MachineForm modal
3. **Bulk Operations** — Select multiple machines → Open BulkLocationModal → Move to obra
4. **Maintenance Tracking** — Display progress bar based on hours vs. maintenanceInterval

**Constraints:**
- Machine maintenance badge triggered at ≥80% of interval
- Tariff overrides allowed per machine
- Location assignment via obra reference (workId, workName, gps)
- No cascade delete (machines can orphan if obra deleted)

**State Management:**
- Real-time Firestore listeners for machines, obras, system settings
- useMemo-computed filtering for search/view modes
- Selection state for bulk operations
