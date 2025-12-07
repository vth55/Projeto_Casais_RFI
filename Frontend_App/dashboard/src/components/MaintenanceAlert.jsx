import React from 'react';
import { Wrench, AlertCircle, Clock } from 'lucide-react';

const MaintenanceAlert = ({ machine, threshold = 150 }) => {
  const totalHours = machine.totalHours || 0;
  const progress = (totalHours / threshold) * 100;

  let status = 'ok';
  let bgColor = 'bg-emerald-50';
  let borderColor = 'border-emerald-500';
  let textColor = 'text-emerald-800';
  let iconColor = 'text-emerald-600';
  let message = 'Máquina em boas condições';

  if (totalHours >= threshold) {
    status = 'critical';
    bgColor = 'bg-red-50';
    borderColor = 'border-red-500';
    textColor = 'text-red-800';
    iconColor = 'text-red-600';
    message = `MANUTENÇÃO URGENTE: ${totalHours.toFixed(1)}h / ${threshold}h`;
  } else if (totalHours >= threshold * 0.8) {
    status = 'warning';
    bgColor = 'bg-orange-50';
    borderColor = 'border-orange-500';
    textColor = 'text-orange-800';
    iconColor = 'text-orange-600';
    message = `Manutenção preventiva recomendada: ${totalHours.toFixed(1)}h / ${threshold}h`;
  } else if (totalHours >= threshold * 0.6) {
    status = 'info';
    bgColor = 'bg-primary-50';
    borderColor = 'border-primary-500';
    textColor = 'text-primary-800';
    iconColor = 'text-primary-500';
    message = `Acompanhar: ${totalHours.toFixed(1)}h / ${threshold}h`;
  }

  const Icon = status === 'critical' ? AlertCircle : status === 'warning' ? Wrench : Clock;

  return (
    <div className={`${bgColor} border-l-4 ${borderColor} p-4 rounded-r-lg`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-bold ${textColor}`}>{machine.id}</h4>
            <span className={`text-xs font-bold ${textColor}`}>{progress.toFixed(0)}%</span>
          </div>
          <p className={`text-sm ${textColor} mb-2`}>{message}</p>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                status === 'critical'
                  ? 'bg-red-600'
                  : status === 'warning'
                    ? 'bg-orange-500'
                    : status === 'info'
                      ? 'bg-primary-500'
                      : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceAlert;
