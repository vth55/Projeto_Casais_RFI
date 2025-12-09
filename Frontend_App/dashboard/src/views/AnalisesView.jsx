import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Leaf, Fuel, Truck,
  Calendar, ArrowRight, ArrowLeftRight, Minus
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Select, Skeleton } from '../components/ui';

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// Componente de Seleção de Período
const PeriodSelector = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-slate-600">{label}</label>
    <Select
      value={value}
      onChange={e => onChange(e.target.value)}
      options={[
        { value: 'this_week', label: 'Esta Semana' },
        { value: 'last_week', label: 'Semana Passada' },
        { value: 'this_month', label: 'Este Mês' },
        { value: 'last_month', label: 'Mês Passado' },
        { value: 'this_quarter', label: 'Este Trimestre' },
        { value: 'last_quarter', label: 'Trimestre Passado' },
        { value: 'this_year', label: 'Este Ano' },
        { value: 'last_year', label: 'Ano Passado' },
      ]}
    />
  </div>
);

// Card de Comparação de KPI
const ComparisonCard = ({ title, period1Value, period2Value, unit = '', icon: Icon }) => {
  const diff = period2Value - period1Value;
  const percentChange = period1Value > 0 ? ((diff / period1Value) * 100).toFixed(1) : 0;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isNeutral ? 'text-slate-500' : isPositive ? 'text-emerald-600' : 'text-red-600';
  const bgColor = isNeutral ? 'bg-slate-50' : isPositive ? 'bg-emerald-50' : 'bg-red-50';

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {period2Value.toLocaleString('pt-PT')}
              </span>
              <span className="text-sm text-slate-500">{unit}</span>
            </div>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg ${bgColor}`}>
          <div className="flex items-center gap-1">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className={`text-sm font-semibold ${trendColor}`}>
              {isNeutral ? '0%' : `${isPositive ? '+' : ''}${percentChange}%`}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Período anterior:</span>
          <span className="font-medium text-slate-700">
            {period1Value.toLocaleString('pt-PT')} {unit}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-slate-500">Variação:</span>
          <span className={`font-medium ${trendColor}`}>
            {isPositive ? '+' : ''}{diff.toLocaleString('pt-PT')} {unit}
          </span>
        </div>
      </div>
    </Card>
  );
};

const AnalisesView = () => {
  const { activeView, machines, getFilteredSessions, getKPIs, loading } = useStore();
  const [activeTab, setActiveTab] = useState(
    activeView === 'analises-emissoes' ? 'emissions' :
    activeView === 'analises-utilizacao' ? 'utilization' :
    activeView === 'analises-comparacao' ? 'comparison' : 'general'
  );

  // Estados para comparação de períodos
  const [period1, setPeriod1] = useState('last_month');
  const [period2, setPeriod2] = useState('this_month');

  const filteredSessions = getFilteredSessions();
  const kpis = getKPIs();

  // Dados para gráficos gerais
  const chartData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return days.map(day => ({
      name: day,
      horas: Math.floor(Math.random() * 60) + 20,
      emissoes: Math.floor(Math.random() * 400) + 100,
      combustivel: Math.floor(Math.random() * 150) + 50,
    }));
  }, []);

  // Dados de utilização
  const utilizationData = useMemo(() => {
    return machines.slice(0, 6).map(m => ({
      name: m.name?.substring(0, 12) || m.id,
      value: Math.floor(Math.random() * 60) + 40,
    }));
  }, [machines]);

  // Dados simulados para comparação de períodos
  const comparisonData = useMemo(() => {
    // Simular dados para os dois períodos
    const categories = ['Horas', 'Combustível', 'CO₂', 'Custo', 'Manutenções'];

    return categories.map(cat => ({
      name: cat,
      periodo1: Math.floor(Math.random() * 1000) + 200,
      periodo2: Math.floor(Math.random() * 1000) + 200,
    }));
  }, [period1, period2]);

  // KPIs comparativos simulados
  const comparisonKPIs = useMemo(() => ({
    period1: {
      hours: 245 + Math.floor(Math.random() * 100),
      fuel: 890 + Math.floor(Math.random() * 200),
      co2: 2380 + Math.floor(Math.random() * 500),
      cost: 12500 + Math.floor(Math.random() * 3000),
      utilization: 65 + Math.floor(Math.random() * 20),
    },
    period2: {
      hours: 280 + Math.floor(Math.random() * 100),
      fuel: 920 + Math.floor(Math.random() * 200),
      co2: 2450 + Math.floor(Math.random() * 500),
      cost: 14200 + Math.floor(Math.random() * 3000),
      utilization: 72 + Math.floor(Math.random() * 20),
    },
  }), [period1, period2]);

  // Dados para gráfico de tendência comparativa
  const trendComparisonData = useMemo(() => {
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    return weeks.map(week => ({
      name: week,
      periodo1: Math.floor(Math.random() * 80) + 40,
      periodo2: Math.floor(Math.random() * 80) + 40,
    }));
  }, [period1, period2]);

  const COLORS = ['#005EB8', '#0ea5e9', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'];

  const tabs = [
    { id: 'general', label: 'Visão Geral' },
    { id: 'comparison', label: 'Comparação' },
    { id: 'emissions', label: 'Emissões CO₂' },
    { id: 'utilization', label: 'Utilização' },
  ];

  const getPeriodLabel = (period) => {
    const labels = {
      this_week: 'Esta Semana',
      last_week: 'Semana Passada',
      this_month: 'Este Mês',
      last_month: 'Mês Passado',
      this_quarter: 'Este Trimestre',
      last_quarter: 'Trimestre Passado',
      this_year: 'Este Ano',
      last_year: 'Ano Passado',
    };
    return labels[period] || period;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="title" className="w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Análises</h2>
        <p className="text-slate-500 mt-1">Estatísticas, tendências e comparações</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} title="Horas Totais" value={kpis.totalHours} unit="h" color="primary" />
        <StatCard icon={Truck} title="Utilização" value={kpis.utilizationRate} unit="%" color="emerald" />
        <StatCard icon={Fuel} title="Combustível" value={kpis.totalFuel} unit="L" color="amber" />
        <StatCard icon={Leaf} title="CO₂" value={kpis.totalCO2} unit="kg" color="slate" />
      </div>

      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-6">
          {/* Tab: Visão Geral */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Atividade Semanal</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="horas" fill="#005EB8" name="Horas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Tendência de Consumo</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="combustivel" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Combustível (L)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tab: Comparação Período vs Período */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              {/* Seletores de Período */}
              <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <PeriodSelector label="Período 1" value={period1} onChange={setPeriod1} />
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm">
                    <ArrowLeftRight className="w-5 h-5 text-primary-600" />
                  </div>
                  <PeriodSelector label="Período 2" value={period2} onChange={setPeriod2} />
                </div>
              </div>

              {/* KPIs Comparativos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ComparisonCard
                  title="Horas Trabalhadas"
                  period1Value={comparisonKPIs.period1.hours}
                  period2Value={comparisonKPIs.period2.hours}
                  unit="h"
                  icon={BarChart3}
                />
                <ComparisonCard
                  title="Combustível"
                  period1Value={comparisonKPIs.period1.fuel}
                  period2Value={comparisonKPIs.period2.fuel}
                  unit="L"
                  icon={Fuel}
                />
                <ComparisonCard
                  title="Emissões CO₂"
                  period1Value={comparisonKPIs.period1.co2}
                  period2Value={comparisonKPIs.period2.co2}
                  unit="kg"
                  icon={Leaf}
                />
              </div>

              {/* Gráfico de Barras Comparativo */}
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Comparação: {getPeriodLabel(period1)} vs {getPeriodLabel(period2)}
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={comparisonData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value, name) => [
                        value.toLocaleString('pt-PT'),
                        name === 'periodo1' ? getPeriodLabel(period1) : getPeriodLabel(period2)
                      ]}
                    />
                    <Legend
                      formatter={(value) => value === 'periodo1' ? getPeriodLabel(period1) : getPeriodLabel(period2)}
                    />
                    <Bar dataKey="periodo1" fill="#94a3b8" name="periodo1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="periodo2" fill="#005EB8" name="periodo2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Gráfico de Tendência */}
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Tendência Semanal</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={trendComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value, name) => [
                        `${value}h`,
                        name === 'periodo1' ? getPeriodLabel(period1) : getPeriodLabel(period2)
                      ]}
                    />
                    <Legend
                      formatter={(value) => value === 'periodo1' ? getPeriodLabel(period1) : getPeriodLabel(period2)}
                    />
                    <Line type="monotone" dataKey="periodo1" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="periodo1" />
                    <Line type="monotone" dataKey="periodo2" stroke="#005EB8" strokeWidth={3} name="periodo2" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Tab: Emissões */}
          {activeTab === 'emissions' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Emissões CO₂ Semanais</h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEmissoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    formatter={(v) => [`${v} kg`, 'CO₂']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="emissoes" stroke="#10b981" strokeWidth={2} fill="url(#colorEmissoes)" name="CO₂" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tab: Utilização */}
          {activeTab === 'utilization' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Utilização por Equipamento</h3>
                <div className="space-y-4">
                  {utilizationData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-slate-600 w-28 truncate">{item.name}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${item.value}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-12 text-right">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribuição</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={utilizationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {utilizationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`, 'Utilização']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AnalisesView;
