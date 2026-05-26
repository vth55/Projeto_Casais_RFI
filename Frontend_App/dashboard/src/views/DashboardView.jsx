import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, Truck, Clock, Fuel, Leaf, AlertTriangle,
  Wrench, TrendingUp, ArrowRight, Play, User, Zap, ChevronRight,
  RefreshCw, Building2, CheckCircle2, XCircle, Link2, CalendarDays, X,
  Sparkles, Brain, ShieldAlert,
} from 'lucide-react';
import useStore from '../store/useStore';
import { parseFirestoreTimestamp } from '../utils/dateUtils';
import useAvariasStore from '../store/useAvariasStore';
import { Card, StatCard, Button, Badge, Skeleton } from '../components/ui';
import MachineStoryRings from '../components/ui/MachineStoryRings';
import LiveTimer from '../components/ui/LiveTimer';
import useDeviceType from '../hooks/useDeviceType';
import { useProcoreStatus } from '../hooks/useProcoreStatus';
import { authFetch } from '../utils/authFetch';

// Filtros de período — 3 presets + calendário personalizado
const toIsoDate = (d) => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DateFilters = () => {
  const { dateFilter, setDateFilter, customRange, setCustomRange } = useStore();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [startInput, setStartInput] = useState(toIsoDate(customRange?.start) || toIsoDate(new Date()));
  const [endInput, setEndInput] = useState(toIsoDate(customRange?.end) || toIsoDate(new Date()));

  const presets = [
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: '7 dias' },
    { id: 'month', label: 'Mês' },
  ];

  const isCustom = dateFilter === 'custom';

  const applyCustom = () => {
    if (!startInput || !endInput) return;
    const start = new Date(startInput);
    const end = new Date(endInput);
    if (isNaN(start) || isNaN(end) || end < start) return;
    setCustomRange({ start, end });
    setPopoverOpen(false);
  };

  const customLabel = isCustom && customRange?.start && customRange?.end
    ? `${new Date(customRange.start).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} – ${new Date(customRange.end).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`
    : 'Personalizado';

  return (
    <div className="relative">
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl shadow-sm" role="group" aria-label="Filtros de período">
        {presets.map(filter => (
          <button
            key={filter.id}
            onClick={() => { setDateFilter(filter.id); setPopoverOpen(false); }}
            aria-pressed={dateFilter === filter.id}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${dateFilter === filter.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
          >
            {filter.label}
          </button>
        ))}
        <button
          onClick={() => setPopoverOpen(v => !v)}
          aria-pressed={isCustom}
          aria-expanded={popoverOpen}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${isCustom
              ? 'bg-primary-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="hidden sm:inline">{customLabel}</span>
        </button>
      </div>

      {popoverOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopoverOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Período personalizado</h4>
              <button onClick={() => setPopoverOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">De</label>
                <input
                  type="date"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  max={endInput || undefined}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Até</label>
                <input
                  type="date"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  min={startInput || undefined}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!startInput || !endInput || new Date(endInput) < new Date(startInput)}
                className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow transition-all"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Card de Sessão Ativa
const ActiveSessionCard = ({ session, machine, operator }) => {
  const startTime = parseFirestoreTimestamp(session.startTime);
  // Pivot 2026-05: tool_sessions usam dias como threshold (overdue ≥ 7d) em vez de horas (fatigue ≥ 5h).
  const daysOpen = (Date.now() - startTime.getTime()) / 86400000;
  const isOverdue = daysOpen >= 7;

  // Tolerante a sessions (legacy) e tool_sessions (novo).
  const resourceName = session.toolName || machine?.name || session.machineId;
  const operatorName = session.operatorName || operator?.name || session.cardId || session.operatorId;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${isOverdue ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
      }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-amber-500' : 'bg-emerald-500'
        }`}>
        <Play className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white truncate">
          {resourceName}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{operatorName}</span>
        </div>
      </div>
      <div className="text-right">
        <LiveTimer
          startTime={startTime}
          tickMs={1000}
          className={`text-2xl ${isOverdue ? 'text-amber-600' : 'text-emerald-600'}`}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">{isOverdue ? 'overdue' : 'em curso'}</p>
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

// ============================================================
// PROCORE SYNC CARD — Integração Chunk 1B
// ============================================================

const PROCORE_STATUS_URL = '/api/procore/status';
const PROCORE_SYNC_URL = '/api/procore/sync';

const formatRelativeTime = (iso) => {
  if (!iso) return 'nunca';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'agora';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
};

const useProcoreRecon = () => {
  const { sessions } = useStore();
  return useMemo(() => {
    const closed = sessions.filter(s => s.status === 'CLOSED' || s.status === 'AUTO_CLOSED');
    const exported = closed.filter(s => s.procoreExport?.exported === true);
    const pendingRetry = closed.filter(s =>
      s.procoreExport?.exported === false &&
      s.procoreExport?.nextRetryAfter &&
      !s.procoreExport?.gaveUp
    );
    const failed = closed.filter(s =>
      s.procoreExport?.exported === false &&
      (s.procoreExport?.gaveUp || (!s.procoreExport?.nextRetryAfter && s.procoreExport?.retryCount > 0))
    );

    const localHours = closed.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const exportedHours = exported.reduce((sum, s) => sum + (s.procoreExport?.hours || s.durationHours || 0), 0);
    const syncRate = closed.length > 0 ? (exported.length / closed.length) * 100 : 0;

    return {
      totalClosed: closed.length,
      exportedCount: exported.length,
      pendingCount: pendingRetry.length,
      failedCount: failed.length,
      localHours: Math.round(localHours * 10) / 10,
      exportedHours: Math.round(exportedHours * 10) / 10,
      syncRate,
      gapHours: Math.round((localHours - exportedHours) * 10) / 10,
      gapPercent: localHours > 0 ? Math.round(((localHours - exportedHours) / localHours) * 1000) / 10 : 0,
    };
  }, [sessions]);
};

// ============================================================
// PROCORE RECONCILIATION PANEL — Fase 4: Executive Dashboard
// ============================================================

const SyncRateRing = ({ rate, size = 128, strokeWidth = 10 }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayRate = mounted ? rate : 0;
  const offset = circumference - (displayRate / 100) * circumference;
  const color = rate >= 85 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Taxa de sincronização: ${Math.round(rate)}%`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor"
          className="text-slate-100 dark:text-slate-700/50"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="drop-shadow-sm"
          style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">
          {Math.round(rate)}<span className="text-lg text-slate-400">%</span>
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">sync rate</span>
      </div>
    </div>
  );
};

const ProcoreReconciliationPanel = () => {
  const { isDesktop } = useDeviceType();
  const recon = useProcoreRecon();
  const { status, loading, error, refetch } = useProcoreStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await authFetch(PROCORE_SYNC_URL, { method: 'POST' });
      if (!res.ok && res.status !== 207) {
        const text = await res.text();
        throw new Error(`Sync falhou (${res.status}): ${text.slice(0, 160)}`);
      }
      await refetch();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Skeleton.Stat />
        <Skeleton className="h-32 mt-4" />
      </Card>
    );
  }

  if (error || !status?.connected) {
    const needsReauth = !!status?.needs_reauth;
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const title = needsReauth ? 'Procore — sessão expirada' : 'Procore não conectado';
    const subtitle = needsReauth
      ? 'O token de refresh expirou. Reautoriza para continuar a sincronização automática.'
      : isDev && error
        ? 'Estado Procore não disponível em modo dev (sem rewrite Hosting). Funciona no deploy.'
        : error ? `Erro: ${error}` : 'Conecta o Procore nas Configurações para ativar o painel de reconciliação.';

    return (
      <div className="rounded-lg overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-4 p-6">
          <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-7 h-7 text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          {!isDev && (
            <a
              href="/api/procore/authorize"
              className="px-5 py-2.5 text-sm font-bold text-white casais-gradient rounded-lg shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transition-all hover:-translate-y-0.5"
            >
              {needsReauth ? 'Reautorizar' : 'Conectar Procore'}
            </a>
          )}
        </div>
      </div>
    );
  }

  const counts = status?.last_sync_counts || { projects: 0, equipment: 0, directory: 0 };
  const lastSyncLabel = formatRelativeTime(status?.last_sync_at);
  const hasSyncErrors = !!status?.last_sync_errors && Object.keys(status.last_sync_errors).length > 0;
  const maxBarWidth = recon.localHours || 1;

  const pipelineSteps = [
    { label: 'Exportadas', count: recon.exportedCount, icon: CheckCircle2, bg: 'bg-emerald-500', },
    { label: 'Em Retry', count: recon.pendingCount, icon: RefreshCw, bg: 'bg-amber-500', },
    { label: 'Falharam', count: recon.failedCount, icon: XCircle, bg: 'bg-red-500', },
  ];

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 shadow-xl shadow-slate-900/5 dark:shadow-black/20 animate-fade-in">
      {/* ── Gradient Header ─────────────────────────────────────────── */}
      <div className="casais-gradient px-4 lg:px-6 py-3 lg:py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-bold text-white tracking-tight">Procore Reconciliation</h3>
            <p className="text-[11px] lg:text-xs text-white/60">
              Sync {lastSyncLabel}
              {status?.last_sync_trigger && (
                <span className="ml-1">· {status.last_sync_trigger === 'cron' ? 'automática' : 'manual'}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          <Badge
            variant={hasSyncErrors ? 'warning' : 'success'}
            className="text-[10px] uppercase tracking-wider border border-white/20 hidden sm:inline-flex"
          >
            {hasSyncErrors ? 'parcial' : 'operacional'}
          </Badge>
          <button
            onClick={handleSync}
            disabled={syncing}
            aria-label="Sincronizar agora com o Procore"
            className="flex items-center gap-2 px-3 lg:px-4 py-2 text-xs font-bold text-primary-700 bg-white hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'A sincronizar...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start">
          {/* RING — centrado no tablet, esquerda no desktop */}
          <div className="flex flex-col items-center gap-2 lg:pt-1">
            <SyncRateRing rate={recon.syncRate} size={isDesktop ? 128 : 104} />
            <p className="text-xs text-slate-400 font-medium text-center mt-1">
              {recon.exportedCount} de {recon.totalClosed} sessões
            </p>
          </div>

          {/* PIPELINE + HOURS — full width tablet, flex-1 desktop */}
          <div className="flex-1 w-full lg:w-auto space-y-6 min-w-0">
            {/* Export Pipeline */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">
                Pipeline de Exportação
              </h4>
              <div className="space-y-2.5">
                {pipelineSteps.map((step) => {
                  const pct = recon.totalClosed > 0 ? (step.count / recon.totalClosed) * 100 : 0;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${step.bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <step.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{step.label}</span>
                          <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white">{step.count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${step.bg}`}
                            style={{
                              width: mounted ? `${Math.max(pct, step.count > 0 ? 3 : 0)}%` : '0%',
                              transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hours Reconciliation */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">
                Reconciliação de Horas
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Horas Locais</span>
                    <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white">
                      {recon.localHours.toLocaleString('pt-PT')}h
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full casais-gradient"
                      style={{
                        width: mounted ? '100%' : '0%',
                        transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Horas Procore</span>
                    <span className="text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                      {recon.exportedHours.toLocaleString('pt-PT')}h
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: mounted ? `${maxBarWidth > 0 ? (recon.exportedHours / maxBarWidth) * 100 : 0}%` : '0%',
                        transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
                      }}
                    />
                  </div>
                </div>
                {recon.gapHours > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                      Gap: {recon.gapHours.toLocaleString('pt-PT')}h ({recon.gapPercent}%)
                    </span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sync errors */}
        {(syncError || hasSyncErrors) && (
          <div className="mt-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
              {syncError || Object.entries(status.last_sync_errors).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          </div>
        )}

        {/* ── Footer — Procore Catalog Summary ─────────────────────── */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 lg:gap-6 flex-wrap">
              {[
                { label: 'Obras', value: counts.projects, error: status?.last_sync_errors?.projects },
                { label: 'Equipamentos', value: counts.equipment, error: status?.last_sync_errors?.equipment },
                { label: 'Pessoas', value: counts.directory, error: status?.last_sync_errors?.directory },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.error ? (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">{item.value ?? 0}</span>
                    {' '}{item.label}
                  </span>
                </div>
              ))}
            </div>
            {recon.totalClosed === 0 && (
              <span className="text-xs text-slate-400 italic">Ainda sem sessões fechadas para reconciliar</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MOBILE PROCORE CARD — Versão touch-native com reconciliação
// ============================================================

const MobileProcoreCard = () => {
  const recon = useProcoreRecon();
  const { status, loading, error, refetch } = useProcoreStatus();
  const [syncing, setSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await authFetch(PROCORE_SYNC_URL, { method: 'POST' });
      if (!res.ok && res.status !== 207) throw new Error('Sync falhou');
      await refetch();
    } catch (_) { /* silently handled */ }
    finally { setSyncing(false); }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <Skeleton.Stat />
      </div>
    );
  }

  if (error || !status?.connected) {
    return (
      <div
        className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0">
          <Link2 className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Procore</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {error ? 'Erro de ligação' : 'Não conectado'}
          </p>
        </div>
        <a
          href="/api/procore/authorize"
          className="text-xs font-bold text-white casais-gradient px-3 py-2 rounded-xl active:scale-[0.96] transition-transform"
        >
          Ligar
        </a>
      </div>
    );
  }

  const counts = status?.last_sync_counts || { projects: 0, equipment: 0, directory: 0 };
  const lastSyncLabel = formatRelativeTime(status?.last_sync_at);
  const syncRateColor = recon.syncRate >= 85 ? 'text-emerald-400 bg-emerald-400/15'
    : recon.syncRate >= 60 ? 'text-amber-400 bg-amber-400/15'
      : 'text-red-400 bg-red-400/15';
  const maxBar = recon.localHours || 1;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* ── Header fino com gradient ──────────────────────────────── */}
      <div className="casais-gradient px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white">Procore</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${syncRateColor}`}>
            {Math.round(recon.syncRate)}% sync
          </span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          aria-label="Sincronizar Procore"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 active:bg-white/25 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-white ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 p-4 space-y-3.5">

        {/* Pipeline — 3 counters em grid horizontal */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Exportadas', count: recon.exportedCount, Icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Em Retry', count: recon.pendingCount, Icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Falharam', count: recon.failedCount, Icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map(({ label, count, Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white">{count}</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Horas — barras empilhadas */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Horas Locais</span>
              <span className="text-xs font-black tabular-nums text-slate-900 dark:text-white">
                {recon.localHours.toLocaleString('pt-PT')}h
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full casais-gradient"
                style={{
                  width: mounted ? '100%' : '0%',
                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Horas Procore</span>
              <span className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {recon.exportedHours.toLocaleString('pt-PT')}h
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: mounted ? `${maxBar > 0 ? (recon.exportedHours / maxBar) * 100 : 0}%` : '0%',
                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.15s',
                }}
              />
            </div>
          </div>
          {recon.gapHours > 0 && (
            <p className="text-[10px] text-slate-400 text-right tabular-nums">
              Gap: {recon.gapHours.toLocaleString('pt-PT')}h ({recon.gapPercent}%)
            </p>
          )}
        </div>

        {/* Footer — catálogo + last sync */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{counts.projects}</span> obras
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{counts.equipment}</span> equip.
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{counts.directory}</span> pessoas
          </div>
          <span className="text-[10px] text-slate-400">{lastSyncLabel}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MOBILE DASHBOARD — Layout Field Mode
// ============================================================

const MobileActiveSessionCard = ({ session, machine, operator }) => (
  <button
    onClick={() => useStore.getState().setActiveView('sessoes-ativas')}
    aria-label={`Ver detalhes da sessão da máquina ${machine?.name || session.machineId}`}
    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-transform w-full text-left"
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    <div className="relative w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
      <Play className="w-5 h-5 text-emerald-600" />
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
        {machine?.name || session.machineId}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
        <User className="w-3 h-3 flex-shrink-0" />
        {operator?.name || session.cardId}
      </p>
    </div>
    <div className="text-right flex-shrink-0">
      <LiveTimer
        startTime={session.startTime}
        className="text-sm text-emerald-600 dark:text-emerald-400"
        warningAfterHours={5}
      />
      <p className="text-xs text-slate-400">em curso</p>
    </div>
  </button>
);

const MobileDashboard = ({ kpis, activeSessions, machines, operators, maintenanceAlerts, chartData }) => {
  const { setActiveView } = useStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="px-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{greeting} 👋</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Machine Story Rings */}
      <MachineStoryRings />

      {/* Alerta de manutenção — destaque mobile */}
      {maintenanceAlerts.length > 0 && (
        <button
          onClick={() => setActiveView('manutencao-alertas')}
          className="w-full flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl active:scale-[0.98] transition-transform text-left"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {maintenanceAlerts.length} alerta{maintenanceAlerts.length > 1 ? 's' : ''} de manutenção
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
              {maintenanceAlerts.slice(0, 2).map(m => m.name).join(', ')}
              {maintenanceAlerts.length > 2 ? ` +${maintenanceAlerts.length - 2}` : ''}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
        </button>
      )}

      {/* KPI Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Activity} title="Horas" value={kpis.totalHours} unit="h" color="primary" variant="gradient" className="animate-fade-in stagger-1" />
        <StatCard icon={Truck} title="Utilização" value={kpis.utilizationRate} unit="%" color="emerald" variant="gradient" className="animate-fade-in stagger-2" />
        <StatCard icon={Play} title="Ativas" value={kpis.activeSessions} color={kpis.activeSessions > 0 ? 'emerald' : 'slate'} className="animate-fade-in stagger-3" />
        <StatCard icon={Wrench} title="Alertas" value={maintenanceAlerts.length} color={maintenanceAlerts.length > 0 ? 'red' : 'slate'} className="animate-fade-in stagger-4" />
      </div>

      {/* Sessões ativas */}
      {activeSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Sessões em Curso</span>
            <button onClick={() => setActiveView('sessoes-ativas')} className="text-xs text-primary-600 font-semibold">
              Ver todas
            </button>
          </div>
          <div className="space-y-2">
            {activeSessions.slice(0, 3).map(session => (
              <MobileActiveSessionCard
                key={session.id}
                session={session}
                machine={machines.find(m => m.id === session.machineId)}
                operator={operators.find(o => o.id === session.cardId || o.cardId === session.cardId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Procore — reconciliação mobile-native */}
      <MobileProcoreCard />

      {/* Mini gráfico de atividade */}
      <Card className="p-4 hover-enterprise">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Atividade Semanal</span>
          <Badge variant="primary" className="text-xs">Horas</Badge>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="mobileGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#005EB8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#005EB8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-slate-900 text-white rounded-lg px-2 py-1 text-xs">
                  <span className="font-bold">{payload[0]?.value}h</span>
                </div>
              );
            }} />
            <Area type="monotone" dataKey="horas" stroke="#005EB8" strokeWidth={2} fill="url(#mobileGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ============================================================
// WORK FOCUS — painel de atenção prioritária (Sede)
// ============================================================
const WorkFocusPanel = ({ machines, avarias }) => {
  const { getSmartMaintenancePrediction, setActiveView } = useStore();

  const predictions = useMemo(() => {
    return machines
      .filter(m => (m.partialHours || 0) >= 50)
      .map(m => ({ machine: m, prediction: getSmartMaintenancePrediction(m) }))
      .filter(p => p.prediction.daysLeft <= 30)
      .sort((a, b) => a.prediction.daysLeft - b.prediction.daysLeft)
      .slice(0, 3);
  }, [machines, getSmartMaintenancePrediction]);

  const recentAvarias = useMemo(() => {
    return (avarias || [])
      .filter(a => a.status === 'pendente')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2);
  }, [avarias]);

  if (predictions.length === 0 && recentAvarias.length === 0) return null;

  return (
    <Card className="border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-800 dark:to-amber-900/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Work Focus</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Atenção prioritária sugerida pela IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Top máquinas iminentes */}
        {predictions.map(({ machine, prediction }) => (
          <button
            key={machine.id}
            onClick={() => setActiveView('manutencao')}
            className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 hover:shadow-md transition-all text-left"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              prediction.daysLeft <= 3 ? 'bg-red-100 dark:bg-red-900/30' :
                prediction.daysLeft <= 7 ? 'bg-amber-100 dark:bg-amber-900/30' :
                  'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              <Sparkles className={`w-4 h-4 ${
                prediction.daysLeft <= 3 ? 'text-red-600' :
                  prediction.daysLeft <= 7 ? 'text-amber-600' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{machine.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manutenção prevista em <span className={`font-bold ${prediction.daysLeft <= 3 ? 'text-red-600' : prediction.daysLeft <= 7 ? 'text-amber-600' : 'text-blue-600'}`}>
                  {prediction.daysLeft} dias
                </span> • {prediction.remaining}h restantes
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
        ))}

        {/* Últimas avarias pendentes */}
        {recentAvarias.map(a => (
          <button
            key={a.id}
            onClick={() => setActiveView('manutencao-avarias')}
            className="flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 hover:shadow-md transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Avaria: {a.machineId}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{a.descricao}</p>
            </div>
            {a.maquinaParada && (
              <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded flex-shrink-0">PARADA</span>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
};

// ============================================================
// DASHBOARD VIEW — renderiza Field Mode ou Office Mode
// ============================================================

const DashboardView = () => {
  // Pivot 2026-05: dados primários vêm de tools/toolSessions. Machines/sessions ficam
  // disponíveis para o painel Procore (legacy) e para os WorkFocus/Maintenance widgets.
  const {
    machines, operators, sessions, systemSettings, loading,
    tools, toolSessions, getToolsInUse, getOverdueTools, getTopToolsByUsage, getToolKPIs,
    dateFilter, customRange,
  } = useStore();
  const { avarias } = useAvariasStore();
  const { isMobile } = useDeviceType();

  // Calcular dateRange a partir do filtro global (mesmo formato esperado pelos selectors)
  const dateRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (dateFilter === 'today') return { start, end };
    if (dateFilter === 'week') { start.setDate(start.getDate() - 6); return { start, end }; }
    if (dateFilter === 'month') { start.setDate(start.getDate() - 29); return { start, end }; }
    if (dateFilter === 'custom' && customRange?.start && customRange?.end) {
      return { start: new Date(customRange.start), end: new Date(customRange.end) };
    }
    start.setDate(start.getDate() - 29);
    return { start, end };
  }, [dateFilter, customRange]);

  // KPIs do modelo tools — alimenta os cards principais e secundários
  const toolKpis = useMemo(() => getToolKPIs(null, dateRange), [getToolKPIs, dateRange, toolSessions, tools]);

  // Sessões activas (até 4) — usa selector pivot
  const activeSessions = useMemo(() => getToolsInUse().slice(0, 4), [getToolsInUse, toolSessions]);

  // Chart "Movimentos por dia" — substitui o legacy "Atividade Semanal" (horas + combustível)
  // Para small tools faz sentido contar checkouts/devoluções, não horas de operação.
  const chartData = useMemo(() => {
    const start = dateRange.start;
    const end = dateRange.end;
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);

    // Inicializar buckets por dia
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit' });
      buckets[key] = { name: key, checkouts: 0, devolucoes: 0 };
    }

    toolSessions.forEach(s => {
      if (!s.startTime) return;
      const d = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
      if (d < start || d > end) return;
      const key = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit' });
      if (!buckets[key]) return;
      buckets[key].checkouts += 1;
      if (s.status === 'CLOSED') buckets[key].devolucoes += 1;
    });

    return Object.values(buckets);
  }, [toolSessions, dateRange]);

  // Top ferramentas por número de checkouts — substitui "Top 5 máquinas por horas"
  const utilizationData = useMemo(() => {
    return getTopToolsByUsage(dateRange, 5).map(t => ({
      name: t.toolName,
      hours: t.count,                 // reaproveita o campo `hours` para evitar mudar muito o JSX abaixo
      value: Math.min(100, t.count * 10), // escala visual para a barra
      status: 'active',
    }));
  }, [getTopToolsByUsage, dateRange, toolSessions]);

  // Overdue — ferramentas com sessão OPEN > threshold (config em systemSettings)
  const overdueList = useMemo(() => getOverdueTools(), [getOverdueTools, toolSessions, systemSettings]);

  // Alertas manutenção (legacy — heavy machines, mantém para compat enquanto o user quiser manter o módulo)
  const maintenanceAlerts = machines.filter(m => {
    const interval = m.maintenanceInterval || systemSettings?.defaultMaintenanceInterval || 150;
    const threshold = interval * 0.8;
    return (m.partialHours || m.totalHours || 0) >= threshold;
  });

  const COLORS = ['#005EB8', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="title" className="w-48" />
          <Skeleton className="hidden md:block w-64 h-12" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}
        </div>
      </div>
    );
  }

  // Field Mode (mobile) — layout completamente diferente
  // toolKpis tem o mesmo formato semântico que o legacy kpis (números agregados),
  // mas com novos campos (activeNow, overdueCount, totalCheckouts, utilizationPct).
  if (isMobile) {
    return (
      <MobileDashboard
        kpis={toolKpis}
        activeSessions={activeSessions}
        machines={tools}
        operators={operators}
        maintenanceAlerts={maintenanceAlerts}
        chartData={chartData}
      />
    );
  }

  // Office Mode (desktop/tablet) — layout original
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Visão geral da frota • {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <DateFilters />
      </div>

      {/* KPIs Principais - 4 must-have do pivot (Hilti/Milwaukee/AlignOps benchmarks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          title="Em Uso Agora"
          value={toolKpis.activeNow}
          unit=""
          color={toolKpis.activeNow > 0 ? 'emerald' : 'slate'}
          variant="gradient"
          className="animate-fade-in stagger-1"
        />
        <StatCard
          icon={TrendingUp}
          title="Taxa de Utilização"
          value={toolKpis.utilizationPct}
          unit="%"
          color="primary"
          variant="gradient"
          className="animate-fade-in stagger-2"
        />
        <StatCard
          icon={AlertTriangle}
          title="Overdue"
          value={toolKpis.overdueCount}
          unit=""
          color={toolKpis.overdueCount > 0 ? 'red' : 'emerald'}
          variant="gradient"
          className="animate-fade-in stagger-3"
        />
        <StatCard
          icon={Clock}
          title="Tempo Médio Fora"
          value={toolKpis.avgDurationHours}
          unit="h"
          color="slate"
          variant="gradient"
          className="animate-fade-in stagger-4"
        />
      </div>

      {/* Alerta de Manutenção */}
      {maintenanceAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">Manutenção Necessária</h3>
              <p className="text-white/80 mt-1">
                {maintenanceAlerts.length} equipamento{maintenanceAlerts.length > 1 ? 's' : ''} próximo{maintenanceAlerts.length > 1 ? 's' : ''} do limite de horas
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {maintenanceAlerts.slice(0, 3).map(machine => (
                  <div key={machine.id} className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-sm font-medium text-white">
                      {machine.name}: {machine.partialHours || machine.totalHours}h
                    </span>
                  </div>
                ))}
                {maintenanceAlerts.length > 3 && (
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-sm font-medium text-white">
                      +{maintenanceAlerts.length - 3} mais
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="primary"
              className="border-none shadow-md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => useStore.getState().setActiveView('manutencao')}
            >
              Ver Todos
            </Button>
          </div>
        </div>
      )}

      {/* Work Focus — IA Preditiva */}
      <WorkFocusPanel machines={machines} avarias={avarias} />

      {/* KPIs Secundários — pivot tools */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Wrench}
          title="Total Ferramentas"
          value={toolKpis.totalTools}
          color="primary"
        />
        <StatCard
          icon={Play}
          title="Checkouts (período)"
          value={toolKpis.totalCheckouts}
          color={toolKpis.totalCheckouts > 0 ? 'emerald' : 'slate'}
        />
        <StatCard
          icon={User}
          title="Trabalhadores"
          value={toolKpis.uniqueOperators}
          color="violet"
        />
        <StatCard
          icon={Wrench}
          title="Manutenção (legacy)"
          value={maintenanceAlerts.length}
          color={maintenanceAlerts.length > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Procore Reconciliation Hub — Painel executivo Fase 4 */}
      <ProcoreReconciliationPanel />

      {/* Gráficos e Sessões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal — Movimentos por dia */}
        <div className="lg:col-span-2">
          <Card className="h-full hover-enterprise">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Movimentos por dia</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Checkouts e devoluções de ferramentas</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-sm text-slate-600">Checkouts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-600">Devoluções</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="checkouts" fill="#005EB8" name="Checkouts" radius={[6, 6, 0, 0]} />
                <Bar dataKey="devolucoes" fill="#10b981" name="Devoluções" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Sessões Ativas */}
        <Card className="h-full hover-enterprise">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sessões Ativas</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{activeSessions.length} em curso</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${activeSessions.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          </div>
          <div className="space-y-3">
            {activeSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400">Nenhuma sessão ativa</p>
              </div>
            ) : (
              activeSessions.map(session => (
                <ActiveSessionCard
                  key={session.id}
                  session={session}
                  machine={session.tool || tools.find(t => t.id === session.toolId)}
                  operator={operators.find(o => o.id === session.operatorId || o.cardId === session.operatorId)}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Alert Card — KPI 4 crítico (loss prevention) */}
        <Card className="hover-enterprise">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Devoluções Atrasadas</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ferramentas com sessão aberta &gt; {systemSettings?.toolOverdueDays || 7} dias
              </p>
            </div>
            <Badge variant={overdueList.length > 0 ? 'danger' : 'success'} className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overdueList.length}
            </Badge>
          </div>
          {overdueList.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wrench className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Sem ferramentas atrasadas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {overdueList.slice(0, 6).map(s => {
                const start = s.startTime?.toDate?.() || new Date(s.startTime);
                const days = Math.floor((Date.now() - start.getTime()) / 86400000);
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{s.toolName || s.toolId}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.operatorName} · {s.obraName || 'sem obra'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{days}d</p>
                      <p className="text-xs text-slate-500">em aberto</p>
                    </div>
                  </div>
                );
              })}
              {overdueList.length > 6 && (
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2">
                  + {overdueList.length - 6} ferramentas com devolução atrasada
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Top Ferramentas — substitui Utilização por Equipamento */}
        <Card className="hover-enterprise">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Ferramentas</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mais utilizadas no período · por número de checkouts
              </p>
            </div>
          </div>
          {utilizationData.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Sem ferramentas para mostrar
            </div>
          ) : (
            <div className="space-y-4">
              {utilizationData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.name}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{item.hours}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
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
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;
