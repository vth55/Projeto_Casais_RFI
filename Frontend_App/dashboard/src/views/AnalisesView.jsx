import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, Archive, BarChart3, Clock, RotateCcw,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Skeleton } from '../components/ui';
import { getDateRangeFromPreset } from '../utils/chartDataHelpers';

const DAY_MS = 86400000;
const DORMANT_DAYS = 30;

const toDate = (value) => {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shortDateLabel = (date) =>
  date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

const EmptyChart = ({ label }) => (
  <div className="h-[280px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30">
    <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
  </div>
);

const AnalisesView = () => {
  const {
    tools = [],
    toolSessions = [],
    getToolKPIs,
    getOverdueTools,
    getTopToolsByUsage,
    dateFilter,
    customRange,
    loading,
  } = useStore();
  const [nowMs] = useState(() => Date.now());

  const dateRange = useMemo(
    () => getDateRangeFromPreset(dateFilter, customRange),
    [dateFilter, customRange]
  );

  const toolKpis = typeof getToolKPIs === 'function' ? getToolKPIs(null, dateRange) : {};
  const overdueTools = useMemo(() => {
    if (typeof getOverdueTools !== 'function') return [];
    if (!toolSessions.length) return [];
    return getOverdueTools();
  }, [getOverdueTools, toolSessions]);

  const dormantTools = useMemo(() => {
    const cutoff = nowMs - DORMANT_DAYS * DAY_MS;

    return tools.filter((tool) => {
      const last = toolSessions
        .filter((session) => session.toolId === tool.id)
        .map((session) => toDate(session.startTime))
        .filter(Boolean)
        .sort((a, b) => b - a)[0];

      return !last || last.getTime() < cutoff;
    });
  }, [tools, toolSessions, nowMs]);

  const checkoutsByDay = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);
    const days = Math.max(1, Math.round((end - start) / DAY_MS) + 1);
    const buckets = {};

    for (let i = 0; i < days; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = dateKey(day);
      buckets[key] = { date: key, name: shortDateLabel(day), checkouts: 0 };
    }

    toolSessions.forEach((session) => {
      const startedAt = toDate(session.startTime);
      if (!startedAt || startedAt < start || startedAt > end) return;
      const key = dateKey(startedAt);
      if (buckets[key]) buckets[key].checkouts += 1;
    });

    return Object.values(buckets);
  }, [toolSessions, dateRange]);

  const topToolsByUsage = useMemo(() => {
    if (typeof getTopToolsByUsage !== 'function') return [];
    if (!tools.length && !toolSessions.length) return [];
    return getTopToolsByUsage(dateRange, 10).map((item) => ({
      name: String(item.toolName || item.toolId || 'Equipamento'),
      checkouts: item.count || 0,
    }));
  }, [getTopToolsByUsage, dateRange, toolSessions, tools]);

  const overdueByObra = useMemo(() => {
    const grouped = new Map();

    overdueTools.forEach((session) => {
      const obraKey = String(session.obraName || session.obraId || 'Sem obra');
      grouped.set(obraKey, (grouped.get(obraKey) || 0) + 1);
    });

    return [...grouped.entries()]
      .map(([name, overdue]) => ({ name, overdue }))
      .sort((a, b) => b.overdue - a.overdue);
  }, [overdueTools]);

  const periodLabel = useMemo(() => {
    const start = dateRange.start.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const end = dateRange.end.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${start} - ${end}`;
  }, [dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="title" className="w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => <Skeleton.Stat key={index} />)}
        </div>
      </div>
    );
  }

  const hasCheckouts = checkoutsByDay.some((day) => day.checkouts > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
          Rotação & Utilização
        </p>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Como roda a frota de equipamentos
          </h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Checkouts, equipamentos dormentes e atrasos no período selecionado: {periodLabel}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          title="Total checkouts no período"
          value={toolKpis.totalCheckouts || 0}
          color="primary"
        />
        <StatCard
          icon={Archive}
          title="Equipamentos dormentes"
          value={dormantTools.length}
          color="slate"
        />
        <StatCard
          icon={RotateCcw}
          title="Taxa de rotação média"
          value={toolKpis.avgDurationHours || 0}
          unit="h"
          color="emerald"
        />
        <StatCard
          icon={AlertTriangle}
          title="Overdue total"
          value={overdueTools.length}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Checkouts por dia</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sessões iniciadas dentro do período.</p>
          </div>
          {hasCheckouts ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={checkoutsByDay}>
                <defs>
                  <linearGradient id="checkoutArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#005EB8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#005EB8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [value, 'Checkouts']}
                />
                <Area
                  type="monotone"
                  dataKey="checkouts"
                  stroke="#005EB8"
                  strokeWidth={2}
                  fill="url(#checkoutArea)"
                  name="Checkouts"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Sem checkouts no período selecionado." />
          )}
        </Card>

        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top 10 equipamentos por número de checkouts
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Equipamentos com maior rotação no período.</p>
          </div>
          {topToolsByUsage.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topToolsByUsage} layout="vertical" margin={{ left: 20, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const label = String(value);
                    return label.length > 20 ? `${label.slice(0, 20)}...` : label;
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [value, 'Checkouts']}
                />
                <Bar dataKey="checkouts" fill="#0ea5e9" radius={[0, 6, 6, 0]} name="Checkouts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Ainda não há equipamentos com checkouts neste período." />
          )}
        </Card>

        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Overdue por obra</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sessões abertas acima do limite configurado.</p>
          </div>
          {overdueByObra.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overdueByObra}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const label = String(value);
                    return label.length > 14 ? `${label.slice(0, 14)}...` : label;
                  }}
                />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [value, 'Overdue']}
                />
                <Bar dataKey="overdue" fill="#ef4444" radius={[6, 6, 0, 0]} name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Sem equipamentos overdue neste momento." />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Dormentes</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Equipamentos sem checkout há mais de {DORMANT_DAYS} dias.
              </p>
            </div>
          </div>
          {dormantTools.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[280px] overflow-auto">
              {dormantTools.slice(0, 12).map((tool) => (
                <div key={tool.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {tool.name || tool.id}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {tool.type || 'Tipo não definido'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                    Dormente
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Todas as equipamentos tiveram checkout nos últimos {DORMANT_DAYS} dias.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AnalisesView;
