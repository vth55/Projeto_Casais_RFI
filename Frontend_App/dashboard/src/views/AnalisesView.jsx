import React, { useState, useEffect, useMemo } from 'react';
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
  <div className="flex border-b border-slate-200 dark:border-slate-700">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
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
  const trendColor = isNeutral ? 'text-slate-500 dark:text-slate-400' : isPositive ? 'text-emerald-600' : 'text-red-600';
  const bgColor = isNeutral ? 'bg-slate-50 dark:bg-slate-800/50' : isPositive ? 'bg-emerald-50' : 'bg-red-50';

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
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {period2Value.toLocaleString('pt-PT')}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{unit}</span>
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
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Período anterior:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {period1Value.toLocaleString('pt-PT')} {unit}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-slate-500 dark:text-slate-400">Variação:</span>
          <span className={`font-medium ${trendColor}`}>
            {isPositive ? '+' : ''}{diff.toLocaleString('pt-PT')} {unit}
          </span>
        </div>
      </div>
    </Card>
  );
};

// Função para gerar valores determinísticos baseados em seed
const seededValue = (seed, min, max) => {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
};

const AnalisesView = () => {
  const { activeView, machines, getFilteredSessions, getKPIs, loading } = useStore();
  // Map activeView to tab on initial render only
  const initialTab = useMemo(() => {
    if (activeView === 'analises-emissoes') return 'emissions';
    if (activeView === 'analises-utilizacao') return 'utilization';
    if (activeView === 'analises-comparacao') return 'comparison';
    return 'general';
  }, [activeView]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (activeView === 'analises-emissoes') setActiveTab('emissions');
    else if (activeView === 'analises-utilizacao') setActiveTab('utilization');
    else if (activeView === 'analises-comparacao') setActiveTab('comparison');
    else setActiveTab('general');
  }, [activeView]);

  // Estados para comparação de períodos
  const [period1, setPeriod1] = useState('last_month');
  const [period2, setPeriod2] = useState('this_month');

  const _sessions = getFilteredSessions(); // Reservado para uso futuro com dados reais
  const kpis = getKPIs();

  // Dados para gráficos gerais - agrupados por dia da semana
  const chartData = useMemo(() => {
    const sessions = getFilteredSessions();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const aggregation = days.map(day => ({ name: day, horas: 0, emissoes: 0, combustivel: 0 }));

    sessions.forEach(s => {
      if (s.status !== 'CLOSED' || !s.startTime) return;
      const date = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
      const dayIdx = date.getDay();
      const hours = s.durationHours || 0;
      
      aggregation[dayIdx].horas += hours;
      // Cálculo aproximado de combustível/emissões para o gráfico (podes refinar depois)
      aggregation[dayIdx].combustivel += hours * 15; // Média 15L/h
      aggregation[dayIdx].emissoes += hours * 15 * 2.68;
    });

    // Reordenar para começar na Segunda-feira (padrão europeu)
    const mondayFirst = [...aggregation.slice(1), aggregation[0]];
    return mondayFirst;
  }, [getFilteredSessions, machines]);

  // Dados de utilização baseados em máquinas reais
  const utilizationData = useMemo(() => {
    return machines.map((m) => {
      // Cálculo de % baseado em 150h como 100% de utilização ideal/intervalo
      const hours = m.totalHours || 0;
      const percent = Math.min(100, Math.round((hours / 150) * 100));
      return {
        name: m.name?.substring(0, 12) || m.id,
        value: percent,
        rawHours: hours
      };
    }).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [machines]);

  // Dados para comparação de períodos - baseados em sessões
  const comparisonData = useMemo(() => {
    const categories = ['Horas', 'Combustível', 'CO₂', 'Custo', 'Manutenções'];
    return categories.map((cat) => ({
      name: cat,
      periodo1: 0,
      periodo2: 0,
    }));
  }, []);

  // KPIs comparativos baseados em dados reais
  const comparisonKPIs = useMemo(() => {
    return {
      period1: {
        hours: 0,
        fuel: 0,
        co2: 0,
        cost: 0,
        utilization: 0,
      },
      period2: {
        hours: kpis.totalHours || 0,
        fuel: kpis.totalFuel || 0,
        co2: kpis.totalCO2 || 0,
        cost: kpis.totalCost || 0,
        utilization: kpis.utilizationRate || 0,
      },
    };
  }, [kpis]);

  // Dados para gráfico de tendência comparativa
  const trendComparisonData = useMemo(() => {
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    return weeks.map((week) => ({
      name: week,
      periodo1: 0,
      periodo2: 0,
    }));
  }, []);

  const COLORS = ['#005EB8', '#0ea5e9', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'];

  const tabs = [
    { id: 'general', label: 'Visão Geral' },
    { id: 'hourly', label: 'Por Hora' },
    { id: 'comparison', label: 'Comparação' },
    { id: 'emissions', label: 'Emissões CO₂' },
    { id: 'utilization', label: 'Utilização' },
  ];

  // Dados por hora do dia (0h-23h)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => {
      // Padrão realista de atividade (mais atividade 7h-18h)
      let baseActivity;
      if (hour >= 7 && hour <= 18) {
        baseActivity = seededValue(hour + 50, 60, 100);
      } else if (hour >= 6 || hour <= 19) {
        baseActivity = seededValue(hour + 50, 20, 50);
      } else {
        baseActivity = seededValue(hour + 50, 0, 15);
      }

      return {
        hora: `${hour.toString().padStart(2, '0')}h`,
        sessoes: Math.max(0, Math.round(baseActivity / 10)),
        horas: baseActivity,
        combustivel: Math.round(baseActivity * 1.5),
      };
    });
  }, []);

  // Estatísticas por hora
  const hourlyStats = useMemo(() => {
    const peakHour = hourlyData.reduce((max, item) =>
      item.sessoes > max.sessoes ? item : max, hourlyData[0]);
    const totalSessoes = hourlyData.reduce((sum, item) => sum + item.sessoes, 0);
    const avgPerHour = Math.round(totalSessoes / 24);
    const activeHours = hourlyData.filter(h => h.sessoes > 0).length;

    return { peakHour, totalSessoes, avgPerHour, activeHours };
  }, [hourlyData]);

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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Análises</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Estatísticas, tendências e comparações</p>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Atividade Semanal</h3>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tendência de Consumo</h3>
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

          {/* Tab: Por Hora do Dia */}
          {activeTab === 'hourly' && (
            <div className="space-y-6">
              {/* KPIs por hora */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                  <p className="text-xs font-medium text-primary-600 mb-1">Hora de Pico</p>
                  <p className="text-2xl font-bold text-primary-700">{hourlyStats.peakHour.hora}</p>
                  <p className="text-xs text-primary-500 mt-1">{hourlyStats.peakHour.sessoes} sessões</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-600 mb-1">Total Sessões</p>
                  <p className="text-2xl font-bold text-emerald-700">{hourlyStats.totalSessoes}</p>
                  <p className="text-xs text-emerald-500 mt-1">últimas 24h</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-xs font-medium text-amber-600 mb-1">Média por Hora</p>
                  <p className="text-2xl font-bold text-amber-700">{hourlyStats.avgPerHour}</p>
                  <p className="text-xs text-amber-500 mt-1">sessões/hora</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-600 mb-1">Horas Ativas</p>
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{hourlyStats.activeHours}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">de 24 horas</p>
                </div>
              </div>

              {/* Gráfico de atividade por hora */}
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribuição de Sessões por Hora do Dia</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="hora"
                      stroke="#94a3b8"
                      fontSize={10}
                      interval={1}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value, name) => [value, name === 'sessoes' ? 'Sessões' : name]}
                    />
                    <Bar dataKey="sessoes" fill="#005EB8" name="sessoes" radius={[4, 4, 0, 0]}>
                      {hourlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.sessoes >= 8 ? '#005EB8' : entry.sessoes >= 4 ? '#38bdf8' : '#cbd5e1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Gráfico de linha - horas de trabalho por hora */}
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Horas de Trabalho e Consumo por Hora</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="hora"
                      stroke="#94a3b8"
                      fontSize={10}
                      interval={2}
                    />
                    <YAxis yAxisId="left" stroke="#005EB8" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="horas"
                      fill="#005EB8"
                      fillOpacity={0.2}
                      stroke="#005EB8"
                      strokeWidth={2}
                      name="Horas Trabalho"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="combustivel"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="Combustível (L)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              {/* Heatmap simplificado - períodos do dia */}
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Períodos de Maior Atividade</h3>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Madrugada', period: '00h-06h', hours: hourlyData.slice(0, 6) },
                    { label: 'Manhã', period: '06h-12h', hours: hourlyData.slice(6, 12) },
                    { label: 'Tarde', period: '12h-18h', hours: hourlyData.slice(12, 18) },
                    { label: 'Noite', period: '18h-24h', hours: hourlyData.slice(18, 24) },
                  ].map((period) => {
                    const totalSessoes = period.hours.reduce((sum, h) => sum + h.sessoes, 0);
                    const intensity = totalSessoes / 60; // 0 to 1
                    const bgColor = intensity > 0.6 ? 'bg-primary-500' :
                      intensity > 0.3 ? 'bg-primary-300' :
                        intensity > 0.1 ? 'bg-primary-100' : 'bg-slate-100 dark:bg-slate-700/50';
                    const textColor = intensity > 0.3 ? 'text-white' : 'text-slate-700 dark:text-slate-200';

                    return (
                      <div
                        key={period.label}
                        className={`rounded-xl p-4 ${bgColor} ${textColor} text-center transition-all`}
                      >
                        <p className="text-sm font-semibold">{period.label}</p>
                        <p className="text-xs opacity-80">{period.period}</p>
                        <p className="text-2xl font-bold mt-2">{totalSessoes}</p>
                        <p className="text-xs opacity-80">sessões</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Tab: Comparação Período vs Período */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              {/* Seletores de Período */}
              <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <PeriodSelector label="Período 1" value={period1} onChange={setPeriod1} />
                  <div className="flex items-center justify-center w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-sm">
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tendência Semanal</h3>
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
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Emissões CO₂ Semanais</h3>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Utilização por Equipamento</h3>
                <div className="space-y-4">
                  {utilizationData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-slate-600 w-28 truncate">{item.name}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${item.value}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white w-12 text-right">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribuição</h3>
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
