export const CO2_FACTOR_KG_L = 2.68;

export const calculateMachineEmissions = (hours, consumptionRate) => {
  const rate = consumptionRate || 0;
  const h = hours || 0;
  return h * rate * CO2_FACTOR_KG_L;
};

// Formatar duração em horas redondas ou com 1 casa decimal
export const formatHours = (hours) => {
  if (hours === undefined || hours === null) return '0h';
  
  // Limitar a 1 casa decimal e remover .0 se for inteiro
  const formatted = parseFloat(hours).toFixed(1).replace(/\.0$/, '');
  
  // Adicionar separador de milhares (europeu: espaço ou ponto)
  // Usamos espaço para não confundir com a vírgula/ponto decimal
  return `${formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}h`;
};

// Formatar consumo de combustível
export const formatConsumption = (rate) => {
  if (rate === undefined || rate === null) return '0 L/h';
  return `${parseFloat(rate).toFixed(1).replace(/\.0$/, '')} L/h`;
};

// Formatar valores monetários (€)
export const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0,00 €';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
};

// Formatar números grandes (taxas, totais)
export const formatNumber = (value, decimals = 0) => {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: decimals }).format(value);
};

export const formatDuration = (hours) => {
  if (!hours && hours !== 0) return '-';
  const totalSeconds = hours * 3600;

  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)}s`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}m ${seconds}s`;
  } else {
    // Para horas acima de 1, usar a nova formatação
    return formatHours(hours);
  }
};
