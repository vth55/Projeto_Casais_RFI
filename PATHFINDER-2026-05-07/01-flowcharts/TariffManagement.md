# Tariff Management Flowchart

## Feature: Tariff Management (Versioning & Audit Trail)
**Entry Point:** `Frontend_App/dashboard/src/views/ConfiguracoesView.jsx:758` + `Backend_Cloud/functions/index.js:410-415`

Version control for machine hourly rates with append-only history and effective-date windowing.

**External Dependencies:**
- Machines collection (tariffHistory field)
- Cost calculation system (getTariffForDate)
- Session management (tariff lookup at close)
- Frontend Configurações/Financeiro views

**Key Flows:**
1. **Create Tariff** — Admin opens Configurações → Tariffs tab → Click "Add Tariff" → Select machine → Enter rate, type (MACHINE_AND_OPERATOR|MACHINE_ONLY), costs → Save
2. **Save Tariff** — setMachineTariff() → Get current machine → Create new tariff entry (ID, type, rates, validFrom, validUntil) → APPEND to machines.tariffHistory[] → Archive old tariff (set validUntil=now) → Update currentTariff pointer
3. **View History** — Display tariffHistory audit trail sorted by validFrom DESC → Show archived entries with validUntil timestamps
4. **Cost Lookup** — Session close → getTariffForDate(sessionStartTime, tariffHistory) → Sort DESC by validFrom → Find first where date ∈ [validFrom, validUntil] → Return for cost calculation
5. **Apply to Session** — calculateSessionCost uses returned tariff → Breakdown: totalCost, machineCost, operatorCost based on tariff.type

**Append-Only Constraint (CRITICAL):**
- `machines.tariffHistory[]` is APPEND-ONLY (never delete or modify)
- Old tariffs archived with validUntil timestamp (not deleted)
- Each new tariff appended to array
- Entire history preserved for audit trail

**Tariff Entry Structure:**
```
{
  id: unique,
  type: "MACHINE_AND_OPERATOR" | "MACHINE_ONLY",
  machineCostPerHour: number,
  operatorCostPerHour: number (0 if MACHINE_ONLY),
  totalCostPerHour: number (machineCost + opCost),
  validFrom: timestamp,
  validUntil: timestamp | null (null if active),
  createdAt: timestamp,
  createdBy: userId
}
```

**Tariff Lookup Logic:**
- Sort tariffHistory descending by validFrom (most recent first)
- Iterate through sorted array
- Return first where: sessionStartTime ≥ validFrom AND sessionStartTime ≤ validUntil
- Fallback: return most recent tariff if no exact match
- Return null if tariffHistory empty

**Cost Impact:**
- Non-retroactive: tariff change applies only to NEW sessions
- Existing closed sessions immutable (tariffSnapshot already captured)
- Future sessions lookup tariff at session start time, apply at session close

**Constraints:**
- Type determines operator cost inclusion (MACHINE_AND_OPERATOR charges operator, MACHINE_ONLY does not)
- validFrom/validUntil define effective date window
- Can overlap historical windows (new tariff active from now, old marked validUntil=now)
- Admin only (SETTINGS_MANAGE_TARIFFS permission)

**Side Effects:**
- Machine currentTariff pointer updated
- tariffHistory array grows (append-only)
- No retroactive recalculation (only affects new sessions)
- Audit trail preserved indefinitely

**External Dependencies:**
- Firestore machines.tariffHistory[] field (append-only array)
- getTariffForDate search function
- calculateSessionCost cost breakdown
- FinanceiroView frontend (tariff UI)
