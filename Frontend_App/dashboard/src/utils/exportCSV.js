export const exportSessionsToCSV = (sessions, operators) => {
  if (sessions.length === 0) {
    alert('⚠️ Não há sessões para exportar.');
    return;
  }

  const getOperatorName = (cardId) => {
    const operator = operators.find((op) => op.id === cardId);
    return operator ? operator.name : cardId;
  };

  const headers = [
    'Equipamento',
    'Operador',
    'ID do Cartão',
    'Data de Início',
    'Hora de Início',
    'Data de Fim',
    'Hora de Fim',
    'Duração (horas)',
    'Estado',
  ];

  const rows = sessions.map((session) => {
    const startDate = session.startTime?.toDate();
    const endDate = session.endTime?.toDate();

    return [
      session.machineId || '',
      getOperatorName(session.cardId),
      session.cardId || '',
      startDate ? startDate.toLocaleDateString('pt-PT') : '',
      startDate ? startDate.toLocaleTimeString('pt-PT') : '',
      endDate ? endDate.toLocaleDateString('pt-PT') : 'Em curso',
      endDate ? endDate.toLocaleTimeString('pt-PT') : 'Em curso',
      session.durationHours ? session.durationHours.toFixed(2) : '0.00',
      session.endTime ? 'Concluída' : 'Ativa',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `casais_fleet_sessoes_${timestamp}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log(`Exportadas ${sessions.length} sessões`);
};

export const exportMachinesToCSV = (machines) => {
  if (machines.length === 0) {
    alert('⚠️ Não há máquinas para exportar.');
    return;
  }

  const CO2_FACTOR = 2.68;

  const headers = [
    'ID da Máquina',
    'Nome',
    'Estado',
    'Horas Totais',
    'Consumo (L/h)',
    'Emissões CO₂ (kg)',
    'Último Operador',
  ];

  const rows = machines.map((machine) => {
    const emissions = (
      (machine.totalHours || 0) *
      (machine.consumptionRate || 0) *
      CO2_FACTOR
    ).toFixed(1);

    return [
      machine.id || '',
      machine.name || machine.id,
      machine.status === 'ACTIVE' ? 'Ativa' : 'Parada',
      (machine.totalHours || 0).toFixed(1),
      (machine.consumptionRate || 0).toFixed(1),
      emissions,
      machine.lastOperator || 'N/A',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `casais_fleet_maquinas_${timestamp}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log(`Exportadas ${machines.length} máquinas`);
};
