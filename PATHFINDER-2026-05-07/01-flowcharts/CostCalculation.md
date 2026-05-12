# Cost Calculation Flowchart

## Feature: Cost Calculation (Tariff Lookup & Session Costing)
**Entry Point:** `Backend_Cloud/functions/index.js:242` (calculateSessionCost)

Session cost computation with immutable tariff snapshots at session close time.

**External Dependencies:**
- Tariff Management system (getTariffForDate)
- Machines collection (tariffHistory)
- System settings (co2FactorPerLitre)
- Sessions collection (costs, tariffSnapshot)

**Key Flows:**
1. **Session Close** — endTime calculated → getTariffForDate(sessionStartTime, tariffHistory) → calculateSessionCost()
2. **Tariff Lookup** — Sort tariffHistory DESC by validFrom → Find first match where sessionDate ∈ [validFrom, validUntil] → Return or fallback to most recent
3. **Cost Breakdown** — totalCost = hours × tariff.totalCostPerHour; machineCost = hours × tariff.machineCostPerHour; operatorCost = hours × opCost
4. **Immutable Snapshot** — Capture tariffSnapshot (ID, type, rates, validity window) + costs → Store atomically with session.costs (NEVER modified post-close)

**Tariff Matching Logic:**
- Round durationHours to 2 decimals
- Check tariff.type (MACHINE_AND_OPERATOR uses operatorCostPerHour, else 0)
- Sort by validFrom descending (most recent first)
- Iterate, return first where sessionDate ∈ [validFrom, validUntil]
- Fallback: most recent tariff if no exact match

**Cost Calculation Breakdown:**
- `totalCost = durationHours × tariff.totalCostPerHour`
- `machineCost = durationHours × tariff.machineCostPerHour`
- `operatorCost = durationHours × (tariff.operatorCostPerHour or 0)`
- `co2Emissions = durationHours × fuelConsumption × co2FactorPerLitre`

**Constraints (Critical):**
- **Immutability**: sessions.costs and sessions.tariffSnapshot are NEVER modified after close
- **Non-Retroactive**: Tariff changes apply only to NEW sessions, never recalculate old closed sessions
- **Snapshot Capture**: Tariff state at session START time is captured, not close time
- **No Post-Close Updates**: Once closed, cost data is locked (prevents audit violations)

**Side Effects:**
- Machine totalHours aggregation (transaction-safe increment)
- Firestore cost persistence (atomic with session update)
- Procore export queue fire-and-forget (async)

**External Dependencies:**
- Firestore machines.tariffHistory[] (append-only lookup)
- getTariffForDate search function
- System settings (co2Factor, fuelConsumptionRate)
