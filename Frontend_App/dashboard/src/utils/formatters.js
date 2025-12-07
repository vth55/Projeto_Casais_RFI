export const CO2_FACTOR_KG_L = 2.68;

export const calculateMachineEmissions = (hours, consumptionRate) => {
  const rate = consumptionRate || 0;
  const h = hours || 0;
  return h * rate * CO2_FACTOR_KG_L;
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
    return `${hours.toFixed(2)} h`;
  }
};
