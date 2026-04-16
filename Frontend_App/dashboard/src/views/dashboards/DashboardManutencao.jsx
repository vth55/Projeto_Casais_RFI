/**
 * DashboardManutencao - Dashboard otimizado para técnicos de manutenção
 * 
 * O técnico quer ver:
 * 1. Máquinas com alertas (semáforo vermelho/amarelo/verde)
 * 2. Avarias abertas para resolver
 * 3. Manutenções preventivas próximas
 * 4. Últimas intervenções
 */

import React, { useMemo } from 'react';
import { Wrench, AlertTriangle, CheckCircle, Clock, Truck, Activity, TrendingUp, Shield } from 'lucide-react';
import useStore from '../../store/useStore';
import { Card, StatCard, Badge, StatusBadge, EmptyState } from '../../components/ui';

const DashboardManutencao = () => {
  const { machines, sessions, maintenanceRecords } = useStore();

  // Estatísticas de saúde
  const stats = useMemo(() => {
    const threshold = 150; // horas para manutenção
    const warningThreshold = 120;
    
    const critical = machines.filter(m => (m.totalHours || 0) >= threshold);
    const warning = machines.filter(m => {
      const hours = m.totalHours || 0;
      return hours >= warningThreshold && hours < threshold;
    });
    const healthy = machines.filter(m => (m.totalHours || 0) < warningThreshold);
    const active = machines.filter(m => m.status === 'ACTIVE');

    return { critical, warning, healthy, active, total: machines.length };
  }, [machines]);

  // Máquinas ordenadas por urgência (mais horas primeiro)
  const machinesByUrgency = useMemo(() => {
    return [...machines]
      .sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))
      .slice(0, 12);
  }, [machines]);

  // Derivar barra de progresso para cada máquina
  const getHealthColor = (hours) => {
    if (hours >= 150) return { bg: 'bg-red-500', text: 'text-red-600', label: 'Crítico', badge: 'bg-red-100 text-red-700' };
    if (hours >= 120) return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Atenção', badge: 'bg-amber-100 text-amber-700' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'OK', badge: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Wrench className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manutenção</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Painel de saúde dos equipamentos</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard 
          icon={AlertTriangle} 
          title="Críticos" 
          value={stats.critical.length} 
          color={stats.critical.length > 0 ? 'red' : 'slate'} 
        />
        <StatCard 
          icon={Clock} 
          title="Atenção" 
          value={stats.warning.length} 
          color={stats.warning.length > 0 ? 'amber' : 'slate'} 
        />
        <StatCard 
          icon={CheckCircle} 
          title="Saudáveis" 
          value={stats.healthy.length} 
          color="emerald" 
        />
        <StatCard 
          icon={Activity} 
          title="Em Operação" 
          value={stats.active.length} 
          color="primary" 
        />
      </div>

      {/* Barra de saúde global */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-500" />
            Estado Global da Frota
          </h3>
          <span className="text-sm text-slate-500">{stats.total} equipamentos</span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
          {stats.critical.length > 0 && (
            <div 
              className="bg-red-500 transition-all" 
              style={{ width: `${(stats.critical.length / stats.total) * 100}%` }}
              title={`${stats.critical.length} críticos`}
            />
          )}
          {stats.warning.length > 0 && (
            <div 
              className="bg-amber-400 transition-all" 
              style={{ width: `${(stats.warning.length / stats.total) * 100}%` }}
              title={`${stats.warning.length} atenção`}
            />
          )}
          {stats.healthy.length > 0 && (
            <div 
              className="bg-emerald-500 transition-all" 
              style={{ width: `${(stats.healthy.length / stats.total) * 100}%` }}
              title={`${stats.healthy.length} saudáveis`}
            />
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Crítico ≥150h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Atenção ≥120h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />OK &lt;120h</span>
        </div>
      </Card>

      {/* Lista de máquinas por urgência */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-500" />
            Equipamentos por Urgência
          </h3>
        </div>

        {machinesByUrgency.length === 0 ? (
          <EmptyState icon={Truck} title="Sem equipamentos" />
        ) : (
          <div className="space-y-3">
            {machinesByUrgency.map(machine => {
              const hours = machine.totalHours || 0;
              const health = getHealthColor(hours);
              const progress = Math.min((hours / 150) * 100, 100);

              return (
                <div key={machine.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {/* Ícone com estado */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    hours >= 150 ? 'bg-red-100' : hours >= 120 ? 'bg-amber-100' : 'bg-emerald-100'
                  }`}>
                    <Truck className={`w-5 h-5 ${health.text}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {typeof machine.name === 'object' ? machine.name?.name : machine.name}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${health.badge}`}>
                        {health.label}
                      </span>
                      {machine.status === 'ACTIVE' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary-100 text-primary-700">
                          Em uso
                        </span>
                      )}
                    </div>
                    {/* Barra de progresso */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${health.bg}`} 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${health.text}`}>
                        {hours.toFixed(0)}h
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardManutencao;
