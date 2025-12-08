import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
  ArrowRight,
  Play,
  User,
  MapPin,
  Calendar,
  Zap,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Skeleton } from '../components/ui';

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
    <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => setDateFilter(filter.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            dateFilter === filter.id
              ? 'bg-primary-500 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// Card de Sessão Ativa
const ActiveSessionCard = ({ session, machine, operator }) => {
  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
  const now = new Date();
  const durationMs = now - startTime;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const isLong = hours >= 5;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
      isLong ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        isLong ? 'bg-amber-500' : 'bg-emerald-500'
      }`}>
        <Play className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate">
          {machine?.name || session.machineId}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{operator?.name || session.cardId}</span>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-bold tabular-nums ${isLong ? 'text-amber-600' : 'text-emerald-600'}`}>
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
        </div>
        <p className="text-xs text-slate-500">em curso</p>
      </div>
    </div>
  );
};

// Tooltip customizado
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-lg shadow-xl p-3 border border-slate-700">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-semibold">{entry.value.toLocaleString('pt-PT')}</span>
        </div>
      ))}
    </div>
  );
};

const DashboardView = () => {
  const { machines, operators, sessions, getFilteredSessions, getKPIs, loading } = useStore();
  const filteredSessions = getFilteredSessions();
  const kpis = getKPIs();

  // Sessões ativas
  const activeSessions = useMemo(() =>
    sessions.filter(s => s.status === 'OPEN').slice(0, 4),
  [sessions]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    if (!filteredSessions.length) {
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

    const grouped = {};
    filteredSessions.forEach(session => {
      if (session.startTime && session.durationHours) {
        const date = session.startTime.toDate?.() || new Date(session.startTime);
        const day = date.toLocaleDateString('pt-PT', { weekday: 'short' });
        if (!grouped[day]) grouped[day] = { horas: 0, combustivel: 0, co2: 0 };
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

  // Dados utilização
  const utilizationData = useMemo(() => {
    if (!machines.length) {
      return [
        { name: 'Escavadora 01', value: 85, status: 'active' },
        { name: 'Grua 02', value: 72, status: 'active' },
        { name: 'Retroescavadora', value: 64, status: 'idle' },
        { name: 'Betoneira 01', value: 45, status: 'idle' },
        { name: 'Compactador', value: 38, status: 'maintenance' },
      ];
    }

    return machines.slice(0, 5).map(machine => {
      const machineSessions = filteredSessions.filter(s => s.machineId === machine.id && s.status === 'CLOSED');
      const hours = machineSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const maxHours = 176;
      return {
        name: machine.name || machine.id,
        value: Math.min(100, Math.round((hours / maxHours) * 100)),
        status: machine.status?.toLowerCase() || 'idle',
      };
    });
  }, [machines, filteredSessions]);

  // Alertas manutenção
  const maintenanceAlerts = machines.filter(m => (m.partialHours || m.totalHours || 0) >= 120);

  const COLORS = ['#005EB8', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="title" className="w-48" />
          <Skeleton className="w-64 h-12" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral da frota • {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <DateFilters />
      </div>

      {/* KPIs Principais - Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          title="Horas Trabalhadas"
          value={kpis.totalHours}
          unit="h"
          color="primary"
          variant="gradient"
          trend={12}
        />
        <StatCard
          icon={Truck}
          title="Taxa de Utilização"
          value={kpis.utilizationRate}
          unit="%"
          color="emerald"
          variant="gradient"
          trend={5}
        />
        <StatCard
          icon={Fuel}
          title="Combustível"
          value={kpis.totalFuel}
          unit="L"
          color="amber"
          variant="gradient"
          trend={-3}
        />
        <StatCard
          icon={Leaf}
          title="Emissões CO₂"
          value={kpis.totalCO2}
          unit="kg"
          color="slate"
          variant="gradient"
        />
      </div>

      {/* Alerta de Manutenção */}
      {maintenanceAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Manutenção Necessária</h3>
              <p className="text-white/80 mt-1">
                {maintenanceAlerts.length} equipamento{maintenanceAlerts.length > 1 ? 's' : ''} próximo{maintenanceAlerts.length > 1 ? 's' : ''} do limite de horas
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {maintenanceAlerts.slice(0, 3).map(machine => (
                  <div key={machine.id} className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-medium text-white">
                      {machine.name}: {machine.partialHours || machine.totalHours}h
                    </span>
                  </div>
                ))}
                {maintenanceAlerts.length > 3 && (
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-medium text-white">
                      +{maintenanceAlerts.length - 3} mais
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button className="bg-white text-amber-600 hover:bg-amber-50" icon={ArrowRight} iconPosition="right">
              Ver Todos
            </Button>
          </div>
        </div>
      )}

      {/* KPIs Secundários */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Play}
          title="Sessões Ativas"
          value={kpis.activeSessions}
          color={kpis.activeSessions > 0 ? 'emerald' : 'slate'}
        />
        <StatCard
          icon={Wrench}
          title="Alertas"
          value={maintenanceAlerts.length}
          color={maintenanceAlerts.length > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={TrendingUp}
          title="MTBF"
          value={kpis.mtbf}
          unit="h"
          color="violet"
        />
        <StatCard
          icon={Zap}
          title="Eficiência"
          value={100 - kpis.downtime}
          unit="%"
          color={kpis.downtime < 20 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Gráficos e Sessões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal - Atividade */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Atividade Semanal</h3>
                <p className="text-sm text-slate-500">Horas trabalhadas e consumo de combustível</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-sm text-slate-600">Horas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-600">Combustível</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="horas" fill="#005EB8" name="Horas" radius={[6, 6, 0, 0]} />
                <Bar dataKey="combustivel" fill="#f59e0b" name="Combustível (L)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Sessões Ativas */}
        <Card className="h-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sessões Ativas</h3>
              <p className="text-sm text-slate-500">{activeSessions.length} em curso</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${activeSessions.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          </div>
          <div className="space-y-3">
            {activeSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">Nenhuma sessão ativa</p>
              </div>
            ) : (
              activeSessions.map(session => (
                <ActiveSessionCard
                  key={session.id}
                  session={session}
                  machine={machines.find(m => m.id === session.machineId)}
                  operator={operators.find(o => o.id === session.cardId)}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emissões CO2 */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Emissões CO₂</h3>
              <p className="text-sm text-slate-500">Tendência semanal</p>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              -3% vs anterior
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="co2" stroke="#10b981" strokeWidth={3} fill="url(#colorCO2)" name="CO₂ (kg)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Utilização por Equipamento */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Utilização por Equipamento</h3>
              <p className="text-sm text-slate-500">Top 5 mais utilizados</p>
            </div>
          </div>
          <div className="space-y-4">
            {utilizationData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  item.status === 'active' ? 'bg-emerald-100' :
                  item.status === 'maintenance' ? 'bg-red-100' : 'bg-slate-100'
                }`}>
                  <Truck className={`w-5 h-5 ${
                    item.status === 'active' ? 'text-emerald-600' :
                    item.status === 'maintenance' ? 'text-red-600' : 'text-slate-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                    <span className="text-sm font-bold text-slate-900">{item.value}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.value}%`,
                        background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[(index + 1) % COLORS.length]})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;
