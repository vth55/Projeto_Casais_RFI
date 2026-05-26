import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Building2, Link2, Clock, Package, Users,
  Activity, AlertTriangle, MapPin, Wrench, BarChart3, FileText,
  LogOut,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import useStore from '../../store/useStore';
import useAvariasStore from '../../store/useAvariasStore';
import { useObraId, navigateToObra } from '../../hooks/useObraId';
import PeriodHeader from '../../components/obra/PeriodHeader';
import KpiCard from '../../components/obra/KpiCard';
import EquipamentosObraView from './EquipamentosObraView';
import SessoesObraView from './SessoesObraView';
import ManutencaoObraView from './ManutencaoObraView';
import { getDateRangeFromPreset, getPreviousPeriodRange } from '../../utils/chartDataHelpers';
import { MAINTENANCE_ALERT_PCT } from '../../utils/sessionHelpers';

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'resumo',        label: 'Resumo',         icon: BarChart3 },
  { id: 'equipamentos',  label: 'Ferramentas',    icon: Package },
  { id: 'trabalhadores', label: 'Trabalhadores',  icon: Users },
  { id: 'sessoes',       label: 'Sessões',        icon: Activity },
  { id: 'manutencao',    label: 'Manutenção',     icon: Wrench },
  { id: 'localizacao',   label: 'Localização',    icon: MapPin },
];

// ─── PLACEHOLDER ─────────────────────────────────────────────────────────────

const ComingSoon = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
    <FileText className="w-12 h-12 mb-4 opacity-40" />
    <p className="font-medium text-slate-500 dark:text-slate-400">{label}</p>
    <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">Em desenvolvimento</p>
  </div>
);

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-primary-600 dark:text-primary-400">
        <span className="font-bold">{payload[0].value}</span> checkouts
      </p>
      {payload[1] && (
        <p className="text-sky-400 mt-0.5">
          <span className="font-bold">{payload[1].value}</span> checkouts (anterior)
        </p>
      )}
    </div>
  );
};

const aggregateCheckoutsByDay = (checkouts) => {
  const map = {};
  checkouts.forEach(s => {
    if (!s.startTime) return;
    const d = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map[key]) map[key] = { date: key, count: 0 };
    map[key].count += 1;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
};

// ─── RESUMO VIEW ─────────────────────────────────────────────────────────────

const ResumoView = ({ obraId, dateRange, prevDateRange, showComparison, loading }) => {
  const {
    getToolKPIs,
    getToolSessionsByObraId,
    toolSessions,
    tools,
    getToolsByObraId,
    getTopToolsByUsage,
  } = useStore();
  const { avarias } = useAvariasStore();

  const kpis = useMemo(() => getToolKPIs(obraId, dateRange), [obraId, dateRange, toolSessions, tools]);
  const prevKpis = useMemo(
    () => (showComparison && prevDateRange ? getToolKPIs(obraId, prevDateRange) : null),
    [obraId, prevDateRange, showComparison, toolSessions, tools]
  );

  const obraTools = useMemo(() => getToolsByObraId(obraId), [obraId, tools]);
  const obraSessions = useMemo(() => getToolSessionsByObraId(obraId, dateRange), [obraId, dateRange, toolSessions, tools]);
  const prevSessions = useMemo(
    () => (showComparison && prevDateRange ? getToolSessionsByObraId(obraId, prevDateRange) : []),
    [obraId, prevDateRange, showComparison, toolSessions, tools]
  );

  const dailyData = useMemo(() => aggregateCheckoutsByDay(obraSessions), [obraSessions]);
  const prevDailyData = useMemo(() => aggregateCheckoutsByDay(prevSessions), [prevSessions]);

  // Merge current + previous for comparison overlay
  const chartData = useMemo(() => {
    if (!showComparison || !prevDailyData.length) return dailyData.map(d => ({ ...d, countPrev: undefined }));
    const byIdx = dailyData.map((d, i) => ({
      ...d,
      countPrev: prevDailyData[i]?.count ?? null,
    }));
    return byIdx;
  }, [dailyData, prevDailyData, showComparison]);

  const toolData = useMemo(
    () => (typeof getTopToolsByUsage === 'function' ? getTopToolsByUsage(dateRange, 6) : []),
    [getTopToolsByUsage, dateRange, toolSessions, tools]
  );

  const openAvarias = avarias.filter(a => {
    const toolInObra = obraTools.some(t => t.id === a.toolId);
    return toolInObra && a.status !== 'resolvida';
  }).length;
  const alertTools = obraTools.filter(tool => {
    const threshold = tool.maintenanceThreshold || tool.maintenanceInterval || 150;
    return ((tool.partialHours || 0) / threshold) >= MAINTENANCE_ALERT_PCT;
  });

  const formatDate = (d) => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <KpiCard key={i} loading />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Ferramentas na obra"
          value={kpis.totalTools}
          icon={Wrench}
          color="primary"
          previousValue={prevKpis?.totalTools}
        />
        <KpiCard
          label="Em uso agora"
          value={kpis.activeNow}
          icon={Activity}
          color={kpis.activeNow > 0 ? 'emerald' : 'slate'}
          previousValue={prevKpis?.activeNow}
        />
        <KpiCard
          label="Overdue"
          value={kpis.overdueCount}
          icon={AlertTriangle}
          color={kpis.overdueCount > 0 ? 'red' : 'slate'}
          previousValue={prevKpis?.overdueCount}
        />
        <KpiCard
          label="Checkouts no período"
          value={kpis.totalCheckouts}
          icon={LogOut}
          color="primary"
          previousValue={prevKpis?.totalCheckouts}
        />
        <KpiCard
          label="Trabalhadores"
          value={kpis.uniqueOperators}
          icon={Users}
          color="violet"
          previousValue={prevKpis?.uniqueOperators}
        />
        <KpiCard
          label="Duração média"
          value={`${kpis.avgDurationHours}h`}
          icon={Clock}
          color="slate"
          previousValue={prevKpis?.avgDurationHours}
        />
      </div>

      {/* ALERTS STRIP */}
      {(alertTools.length > 0 || openAvarias > 0 || kpis.overdueCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {alertTools.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{alertTools.length}</strong> ferramenta{alertTools.length > 1 ? 's' : ''} próxima{alertTools.length > 1 ? 's' : ''} de inspeção/manutenção
              </span>
            </div>
          )}
          {openAvarias > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{openAvarias}</strong> avaria{openAvarias > 1 ? 's' : ''} em aberto</span>
            </div>
          )}
          {kpis.overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{kpis.overdueCount}</strong> ferramenta(s) com devolução atrasada</span>
            </div>
          )}
        </div>
      )}

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CHECKOUTS / DIA */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Checkouts por dia</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-sm text-slate-400">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#005EB8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#005EB8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hoursPrevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CountTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#005EB8" strokeWidth={2} fill="url(#hoursGrad)" dot={false} name="Checkouts" />
                {showComparison && <Area type="monotone" dataKey="countPrev" stroke="#0EA5E9" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#hoursPrevGrad)" dot={false} name="Anterior" />}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* TOP FERRAMENTAS */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Top ferramentas (checkouts)</h3>
          {toolData.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-sm text-slate-400">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={toolData} layout="vertical" margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="toolName" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip formatter={(v) => [v, 'Checkouts']} />
                <Bar dataKey="count" fill="#005EB8" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN LAYOUT ─────────────────────────────────────────────────────────────

const ObraMenuLayout = () => {
  const { obras, tools, setActiveView, procoreProjects, getToolsByObraId } = useStore();

  const obraId = useObraId();

  const [activeTab, setActiveTab] = useState('resumo');
  const [period, setPeriod] = useState({ preset: 'month', customRange: null });
  const [showComparison, setShowComparison] = useState(false);

  const obra = useMemo(() => obras?.find(o => o.id === obraId) || null, [obras, obraId]);

  const dateRange = useMemo(
    () => getDateRangeFromPreset(period.preset, period.customRange),
    [period]
  );

  const prevDateRange = useMemo(
    () => (showComparison ? getPreviousPeriodRange(dateRange.start, dateRange.end) : null),
    [dateRange, showComparison]
  );

  const obraTools = useMemo(() => getToolsByObraId(obraId), [obraId, tools]);

  const hasProcoreLink = useMemo(
    () => obra?.source === 'procore' || procoreProjects?.some(p => p.id === obra?.procoreProjectId),
    [obra, procoreProjects]
  );

  const handleBack = useCallback(() => {
    window.history.pushState({}, '', '/obras');
    setActiveView('obras-todas');
  }, [setActiveView]);

  if (!obraId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Obra não encontrada</p>
      </div>
    );
  }

  const renderTab = () => {
    const sharedProps = { obraId, dateRange, prevDateRange, showComparison, obraTools };
    switch (activeTab) {
      case 'resumo':        return <ResumoView {...sharedProps} />;
      case 'equipamentos':  return <EquipamentosObraView {...sharedProps} />;
      case 'trabalhadores': return <ComingSoon label="Trabalhadores" />;
      case 'sessoes':       return <SessoesObraView {...sharedProps} />;
      case 'manutencao':    return <ManutencaoObraView obraId={obraId} obraMachines={obraTools} />;
      case 'localizacao':   return <ComingSoon label="Localização" />;
      default:              return null;
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* BREADCRUMB HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Obras</span>
          </button>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <h1 className="font-semibold text-slate-900 dark:text-white truncate text-sm sm:text-base">
              {obra?.name || obraId}
            </h1>
            {obra?.address && (
              <span className="hidden md:inline text-xs text-slate-400 truncate">— {obra.address}</span>
            )}
          </div>
        </div>
        {hasProcoreLink && (
          <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-full bg-gradient-to-r from-[#005EB8] to-[#0077d4] text-white uppercase tracking-wide shrink-0 ml-2">
            <Link2 className="w-2.5 h-2.5" />
            Procore
          </span>
        )}
      </div>

      {/* PERIOD HEADER */}
      <PeriodHeader
        preset={period.preset}
        onPresetChange={(p) => setPeriod(prev => ({ ...prev, preset: p }))}
        customRange={period.customRange}
        onCustomRangeChange={(r) => setPeriod(prev => ({ ...prev, customRange: r }))}
        showComparison={showComparison}
        onToggleComparison={() => setShowComparison(v => !v)}
      />

      {/* SUBMENU TABS */}
      <div className="flex items-center gap-0 px-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 ${
                isActive
                  ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900">
        {renderTab()}
      </div>
    </div>
  );
};

export default ObraMenuLayout;
