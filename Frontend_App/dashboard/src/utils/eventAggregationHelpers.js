export const buildCalendarEvents = (maintenanceRecords, avarias, schedules, machines, getPrediction, parseDate) => {
  const map = new Map();

  const push = (date, evt) => {
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(evt);
  };

  // Maintenance records (past events)
  maintenanceRecords.forEach(r => {
    const d = parseDate(r.createdAt);
    const machine = machines.find(m => m.id === r.machineId);
    push(d, {
      type: 'past',
      color: 'blue',
      label: 'Manutenção',
      machine: machine?.name || r.machineId,
      record: r
    });
  });

  // Avarias (failures)
  avarias.forEach(a => {
    const d = parseDate(a.createdAt);
    const machine = machines.find(m => m.id === a.machineId);
    push(d, {
      type: 'avaria',
      color: 'red',
      label: `Avaria (${a.status})`,
      machine: machine?.name || a.machineId,
      record: a
    });
  });

  // Build set of machineIds that have a scheduled event
  const scheduledMachineIds = new Set((schedules || []).map(s => s.machineId));

  // Forecasts (predicted maintenance)
  machines.forEach(m => {
    if (scheduledMachineIds.has(m.id)) return;
    const partial = m.partialHours || 0;
    if (partial < 80) return;
    const pred = getPrediction(m);
    if (pred?.predictedDate) {
      const avgLabel = pred.avgHoursPerDay > 0 ? ` (${Number(pred.avgHoursPerDay).toFixed(1)}h/dia)` : '';
      push(pred.predictedDate, {
        type: 'forecast',
        color: 'amber',
        label: `Previsão — ${Number(pred.remaining).toFixed(1)}h restantes${avgLabel}`,
        machine: m.name || m.id,
        record: m,
      });
    }
  });

  // Scheduled maintenance
  (schedules || []).forEach(s => {
    const d = parseDate(s.scheduledDate);
    const machine = machines.find(m => m.id === s.machineId);
    push(d, {
      type: 'scheduled',
      color: 'indigo',
      label: `Agendado: ${s.type || 'Manutenção'}`,
      machine: machine?.name || s.machineId,
      record: s,
    });
  });

  return map;
};
