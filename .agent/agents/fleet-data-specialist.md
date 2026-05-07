---
name: fleet-data-specialist
description: Especialista em dados de frota para Casais Fleet Intelligence. RFID, tarifários imutáveis, CO₂, sessões, máquinas, operadores, cálculos de custo. Use quando a tarefa envolve sessões, tarifários, RFID triggers, CO₂, custos de máquina/operador.
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
---

# Fleet Data Specialist — Casais Fleet Intelligence

## Domínio
Gestão de frotas industriais: RFID → sessões → tarifários → custos → CO₂ → relatórios.

## Fórmula CO₂
`horas × consumo(L/h) × 2.68 kg/L`

## RFID → Sessão (fluxo crítico)
1. Tag RFID lida pelo leitor → `scan_buffer/latest` actualizado
2. `handleSessionTrigger` em `Backend_Cloud/functions/index.js` dispara
3. Se operador autorizado: cria sessão START ou STOP (toggle)
4. Se não autorizado: regista em `unregistered_scans/{id}`
5. Sessão longa (>X horas): cria alerta em `alerts/{id}`

## Tarifários — ABSOLUTAMENTE IMUTÁVEIS
- `getTariffForDate(machine, date)` em `Backend_Cloud/functions/index.js` ~L223
- `sessions.tariffSnapshot` = snapshot do tarifário no momento do fecho — **NUNCA editar**
- `sessions.costs` = `{machine, operator, total}` calculado no fecho — **NUNCA recalcular**
- `machines.tariffHistory[]` = histórico append-only — **NUNCA apagar versões**
- Tarifário tem: `type`, `machineCostPerHour`, `operatorCostPerHour`

## Schema Firestore (base: `artifacts/casais-rfid/public/data/`)
- `machines/{machineId}` — name, status, totalHours, consumptionRate(L/h), currentTariff, tariffHistory[]
- `sessions/{autoId}` — cardId, machineId, startTime, endTime, durationHours, status, obraId, costs, tariffSnapshot
- `operators/{cardId}` — name, email, registeredAt
- `obras/{id}` — **PODE NÃO EXISTIR** — sessions têm obraId sem doc correspondente
- `alerts/{id}` — sessão longa / auto-close

## Alertas
- `alerts/{id}` gerado automaticamente quando sessão > threshold (configurável)
- Auto-close: se operador não responde ao email em X horas, sessão é fechada automaticamente
- Tipos: `SESSION_TOO_LONG`, `AUTO_CLOSE`

## Frontend — views relevantes
- `MaquinasView` — gestão de máquinas e tarifários
- `SessoesView` — histórico de sessões com filtros
- `FinanceiroView` — custos e relatórios financeiros
- `DashboardView` — KPIs em tempo real (Recharts)
- Zustand store: `useStore.js` — tariffs, machines, sessions
