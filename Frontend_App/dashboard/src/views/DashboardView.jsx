import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Truck,
  Clock,
  Fuel,
  Leaf,
  AlertTriangle,
  Wrench,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, StatusBadge, Skeleton } from '../components/ui';

// Filtros de período
const DateFilters = () => {
  const { dateFilter, setDateFilter } = useStore();

  const filters = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: '7 dias' },
    { id: 'month', label: 'Mês' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Ano' },
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => setDateFilter(filter.id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            dateFilter === filter.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// Tooltip customizado para gráficos
const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-slate-900 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-medium text-slate-900">
            {valuePrefix}{typeof entry.value === 'number' ? entry.value.toLocaleString('pt-PT') : entry.value}{valueSuffix}
          </span>
        </div>
      ))}
    </div>
  );
};

const DashboardView = () => {
  const { machines, getFilteredSessions, getKPIs, loading } = useStore();
  const filteredSessions = getFilteredSessions();
  const kpis = getKPIs();

  // Dados para gráficos
  const chartData = useMemo(() => {
    if (!filteredSessions.length) {
      // Dados demo
      return [
        { name: 'Seg', horas: 45, combustivel: 120, co2: 320 },
        { name: 'Ter', horas: 52, combustivel: 140, co2: 375 },
        { name: 'Qua', horas: 48, combustivel: 130, co2: 348 },
        { name: 'Qui', horas: 61, combustivel: 165, co2: 442 },
        { name: 'Sex', horas: 55, combustivel: 148, co2: 396 },
        { name: 'Sáb', horas: 25, combustivel: 68, co2: 182 },
        { name: 'Dom', horas: 12, combustivel: 32, co2: 86 },
      ];
    }

    // Agregar dados reais por dia
    const grouped = {};
    filteredSessions.forEach(session => {
      if (session.startTime && session.durationHours) {
        const date = session.startTime.toDate?.() || new Date(session.startTime);
        const day = date.toLocaleDateString('pt-PT', { weekday: 'short' });
        if (!grouped[day]) {
          grouped[day] = { horas: 0, combustivel: 0, co2: 0 };
        }
        grouped[day].horas += session.durationHours || 0;

        const machine = machines.find(m => m.id === session.machineId);
        if (machine) {
          const consumption = (machine.consumptionRate || 0) * (session.durationHours || 0);
          grouped[day].combustivel += consumption;
          grouped[day].co2 += consumption * 2.68;
        }
      }
    });

    return Object.entries(grouped).map(([name, data]) => ({
      name,
      horas: Math.round(data.horas),
      combustivel: Math.round(data.combustivel),
      co2: Math.round(data.co2),
    }));
  }, [filteredSessions, machines]);

  // Dados para gráfico de utilização por equipamento
  const utilizationData = useMemo(() => {
    if (!machines.length) {
      return [
        { name: 'Escavadora 01', value: 85 },
        { name: 'Grua 02', value: 72 },
        { name: 'Retroescavadora', value: 64 },
        { name: 'Betoneira 01', value: 45 },
        { name: 'Compactador', value: 38 },
      ];
    }

    return machines.slice(0, 5).map(machine => {
      const machineSessions = filteredSessions.filter(
        s => s.machineId === machine.id && s.status === 'CLOSED'
      );
      const hours = machineSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      // Assumindo 8h/dia, 22 dias/mês
      const maxHours = 176;
      const utilization = Math.min(100, Math.round((hours / maxHours) * 100));

      return {
        name: machine.name || machine.id,
        value: utilization,
      };
    });
  }, [machines, filteredSessions]);

  const COLORS = ['#005EB8', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'];

  // Sessões recentes
  const recentSessions = filteredSessions.slice(0, 5);

  // Alertas de manutenção
  const maintenanceAlerts = machines
    .filter(m => (m.partialHours || m.totalHours || 0) >= 120)
    .slice(0, 4);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="title" className="w-48" />
          <Skeleton className="w-64 h-10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton.Stat key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton.Card lines={8} />
          <Skeleton.Card lines={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Visão Geral</h2>
          <p className="text-slate-500 mt-1">Métricas e indicadores principais</p>
        </div>
        <DateFilters />
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          title="Horas Trabalhadas"
          value={kpis.totalHours}
          unit="h"
          color="primary"
          trend={12}
          trendLabel="vs mês anterior"
        />
        <StatCard
          icon={Truck}
          title="Taxa de Utilização"
          value={kpis.utilizationRate}
          unit="%"
          color="emerald"
          trend={5}
          trendLabel="vs mês anterior"
        />
        <StatCard
          icon={Fuel}
          title="Combustível"
          value={kpis.totalFuel}
          unit="L"
          color="amber"
          trend={-3}
          trendLabel="eficiência"
        />
        <StatCard
          icon={Leaf}
          title="Emissões CO₂"
          value={kpis.totalCO2}
          unit="kg"
          color="slate"
        />
      </div>

      {/* Segunda linha de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          title="Sessões Ativas"
          value={kpis.activeSessions}
          color="primary"
        />
        <StatCard
          icon={Wrench}
          title="Alertas Manutenção"
          value={kpis.maintenanceAlerts}
          color={kpis.maintenanceAlerts > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={TrendingUp}
          title="MTBF"
          value={kpis.mtbf}
          unit="h"
          color="violet"
        />
        <StatCard
          icon={TrendingDown}
          title="Downtime"
          value={kpis.downtime}
          unit="%"
          color={kpis.downtime > 30 ? 'red' : 'emerald'}
        />
      </div>

      {/* Alertas de Manutenção */}
      {maintenanceAlerts.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Manutenção Necessária</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                {maintenanceAlerts.length} equipamento{maintenanceAlerts.length > 1 ? 's' : ''} próximo{maintenanceAlerts.length > 1 ? 's' : ''} do limite de horas
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {maintenanceAlerts.map(machine => (
                  <Badge key={machine.id} variant="warning">
                    {machine.name}: {machine.partialHours || machine.totalHours}h
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" icon={ArrowRight} iconPosition="right">
              Ver todos
            </Button>
          </div>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividade Semanal */}
        <Card>
          <Card.Header>
            <Card.Title>Atividade Semanal</Card.Title>
            <Card.Description>Horas trabalhadas e consumo</Card.Description>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip valueSuffix="h" />} />
                <Bar dataKey="horas" fill="#005EB8" name="Horas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="combustivel" fill="#0ea5e9" name="Combustível (L)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        {/* Tendência de Emissões */}
        <Card>
          <Card.Header>
            <Card.Title>Emissões CO₂</Card.Title>
            <Card.Description>Tendência semanal</Card.Description>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#005EB8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#005EB8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip valueSuffix=" kg" />} />
                <Area
                  type="monotone"
                  dataKey="co2"
                  stroke="#005EB8"
                  strokeWidth={2}
                  fill="url(#colorCO2)"
                  name="CO₂"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        {/* Utilização por Equipamento */}
        <Card>
          <Card.Header>
            <Card.Title>Utilização por Equipamento</Card.Title>
            <Card.Description>Top 5 mais utilizados</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              {utilizationData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600 w-32 truncate">
                    {item.name}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.value}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-12 text-right">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Sessões Recentes */}
        <Card>
          <Card.Header
            action={
              <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                Ver todas
              </Button>
            }
          >
            <Card.Title>Sessões Recentes</Card.Title>
            <Card.Description>Últimas atividades registadas</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  Sem sessões no período selecionado
                </p>
              ) : (
                recentSessions.map(session => {
                  const machine = machines.find(m => m.id === session.machineId);
                  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Truck className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {machine?.name || session.machineId}
                          </p>
                          <p className="text-xs text-slate-500">
                            {startTime.toLocaleDateString('pt-PT')} às {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {session.durationHours && (
                          <span className="text-sm font-medium text-slate-700">
                            {session.durationHours.toFixed(1)}h
                          </span>
                        )}
                        <StatusBadge status={session.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;
