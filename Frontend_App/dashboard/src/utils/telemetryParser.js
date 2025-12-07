/**
 * Utilitário para processar dados de telemetria (GPS/CAN Bus)
 * Preparado para integração futura com máquinas modernas da Casais
 */

/**
 * Processa dados GPS (coordenadas, velocidade, altitude)
 * @param {Object} gpsData - Dados brutos do GPS
 * @returns {Object} Dados GPS formatados
 */
export const parseGPSData = (gpsData) => {
  if (!gpsData) return null;

  return {
    latitude: gpsData.lat || null,
    longitude: gpsData.lng || gpsData.lon || null,
    altitude: gpsData.alt || gpsData.altitude || null,
    speed: gpsData.speed || 0, // km/h
    heading: gpsData.heading || null, // graus
    timestamp: gpsData.timestamp || new Date(),
    accuracy: gpsData.accuracy || null, // metros
  };
};

/**
 * Processa dados CAN Bus (motor, combustível, diagnósticos)
 * @param {Object} canData - Dados brutos do CAN Bus
 * @returns {Object} Dados CAN formatados
 */
export const parseCANBusData = (canData) => {
  if (!canData) return null;

  return {
    // Motor
    engineRPM: canData.rpm || canData.engineRPM || 0,
    engineTemp: canData.temp || canData.engineTemp || null, // °C
    engineLoad: canData.load || canData.engineLoad || null, // %

    // Combustível
    fuelLevel: canData.fuel || canData.fuelLevel || null, // %
    fuelRate: canData.fuelRate || null, // L/h (medido em tempo real)

    // Diagnósticos
    batteryVoltage: canData.battery || canData.batteryVoltage || null, // V
    oilPressure: canData.oil || canData.oilPressure || null, // kPa
    coolantTemp: canData.coolant || canData.coolantTemp || null, // °C

    // Alertas
    errorCodes: canData.errors || canData.errorCodes || [],
    warnings: canData.warnings || [],

    timestamp: canData.timestamp || new Date(),
  };
};

/**
 * Calcula consumo real baseado em dados CAN Bus
 * (Substitui a estimativa fixa de consumptionRate quando disponível)
 */
export const calculateRealConsumption = (canData, duration) => {
  if (!canData || !canData.fuelRate) {
    return null; // Usar método de estimativa
  }

  return canData.fuelRate * duration; // L
};

/**
 * Determina se a máquina requer manutenção baseado em telemetria
 */
export const checkMaintenanceNeeds = (telemetry, totalHours) => {
  const alerts = [];

  // Horas de operação
  if (totalHours > 150) {
    alerts.push({
      type: 'critical',
      category: 'hours',
      message: 'Manutenção urgente: Limite de horas excedido',
    });
  } else if (totalHours > 120) {
    alerts.push({
      type: 'warning',
      category: 'hours',
      message: 'Manutenção preventiva recomendada',
    });
  }

  // CAN Bus: Temperatura do motor
  if (telemetry?.canBus?.engineTemp > 100) {
    alerts.push({
      type: 'critical',
      category: 'temperature',
      message: 'Temperatura do motor elevada',
    });
  }

  // CAN Bus: Pressão do óleo
  if (telemetry?.canBus?.oilPressure && telemetry.canBus.oilPressure < 150) {
    alerts.push({
      type: 'critical',
      category: 'oil',
      message: 'Pressão do óleo baixa',
    });
  }

  // CAN Bus: Bateria
  if (telemetry?.canBus?.batteryVoltage && telemetry.canBus.batteryVoltage < 11.5) {
    alerts.push({
      type: 'warning',
      category: 'battery',
      message: 'Bateria fraca',
    });
  }

  // CAN Bus: Códigos de erro
  if (telemetry?.canBus?.errorCodes?.length > 0) {
    alerts.push({
      type: 'critical',
      category: 'diagnostics',
      message: `${telemetry.canBus.errorCodes.length} código(s) de erro detectado(s)`,
      details: telemetry.canBus.errorCodes,
    });
  }

  return alerts;
};

/**
 * Formata coordenadas GPS para exibição
 */
export const formatGPSCoordinates = (lat, lng) => {
  if (!lat || !lng) return 'Sem localização';

  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
};

/**
 * Estrutura de dados esperada no Firestore (para referência futura)
 *
 * artifacts/casais-rfid/public/data/machines/{machineId}/telemetry/latest
 * {
 *   gps: {
 *     lat: number,
 *     lng: number,
 *     speed: number,
 *     timestamp: Timestamp
 *   },
 *   canBus: {
 *     engineRPM: number,
 *     engineTemp: number,
 *     fuelLevel: number,
 *     fuelRate: number,
 *     errorCodes: string[],
 *     timestamp: Timestamp
 *   }
 * }
 */
