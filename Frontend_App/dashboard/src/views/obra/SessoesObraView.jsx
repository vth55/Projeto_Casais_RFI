import React, { useState, useMemo } from 'react';
import {
  Activity, Clock, Euro, AlertTriangle, X,
  ChevronRight, ChevronDown, Download, User,
  CheckCircle, AlertCircle, RefreshCw, ExternalLink, Leaf,
} from 'lucide-react';
import useStore from '../../store/useStore';
import {
  SESSION_ANOMALY_THRESHOLD_H,
  resolveTimestamp,
  formatDuration,
  detectSessionAnomalies,
  detectHardAnomalies,
} from '../../utils/sessionHelpers';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STATUS_LABEL = { OPEN: '● Em curso', CLOSED: 'Fechada', AUTO_CLOSED: 'Fecho automático' };
const STATUS_STYLE = {
  OPEN:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CLOSED:      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  AUTO_CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ANOMALY_LABEL = {
  NO_OPERATOR: 'Sem operador',
  FATIGUE:     `Duração ≥ ${SESSION_ANOMALY_THRESHOLD_H}h`,
  AUTO_CLOSE:  'Fecho automático',
  CORRECTED:   'Corrigida manualmente',
};
const ANOMALY_COLOR = {
  NO_OPERATOR: 'text-amber-600 dark:text-amber-400',
  FATIGUE:     'text-amber-600 dark:text-amber-400',
  AUTO_CLOSE:  'text-red-600 dark:text-red-400',
  CORRECTED:   'text-sky-600 dark:text-sky-400',
};

const FILTER_STATUS = [
  { value: 'all',    label: 'Todos' },
  { value: 'OPEN',   label: 'Em curso' },
  { value: 'CLOSED', label: 'Fechadas' },
];

// Borda esquerda consoante gravidade das anomalias
function getBorderStyle(anomalies) {
  if (!anomalies?.length) return {};
  if (anomalies.includes('AUTO_CLOSE'))                          return { borderLeft: '3px solid #f87171' };
  if (anomalies.includes('NO_OPERATOR') || anomalies.includes('FATIGUE')) return { borderLeft: '3px solid #fbbf24' };
  if (anomalies.includes('CORRECTED'))                           return { borderLeft: '3px solid #38bdf8' };
  return {};
}

// ─── SUMMARY HEADER ───────────────────────────────────────────────────────────

const SummaryHeader = ({ summary, onClickAnomalies }) => {
  const tiles = [
    { label: 'Total sessões',    value: summary.total,                        icon: Activity,     color: 'text-primary-600 dark:text-primary-400',  bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { label: 'Em curso',         value: summary.active,                       icon: RefreshCw,    color: 'text-emerald-600 dark:text-emerald-400',  bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Fechadas',         value: summary.closed,                       icon: CheckCircle,  color: 'text-slate-600 dark:text-slate-400',      bg: 'bg-slate-100 dark:bg-slate-700' },
    { label: 'Anomalias',        value: summary.anomalies,                    icon: AlertTriangle,
      color: summary.anomalies > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
      bg:    summary.anomalies > 0 ? 'bg-amber-50 dark:bg-amber-900/20'    : 'bg-slate-100 dark:bg-slate-700',
      clickable: true, onClick: onClickAnomalies },
    { label: 'Horas fechadas',   value: `${summary.totalHours.toFixed(1)}h`,  icon: Clock,        color: 'text-slate-700 dark:text-slate-200',      bg: 'bg-slate-50 dark:bg-slate-700/50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 md:p-5">
      {tiles.map(({ label, value, icon: Icon, color, bg, clickable, onClick }) => (
        <div
          key={label}
          onClick={clickable ? onClick : undefined}
          className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex items-center gap-3 ${
            clickable ? 'cursor-pointer hover:border-amber-300 dark:hover:border-amber-600 transition-colors' : ''
          }`}
        >
          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-lg leading-tight ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── FILTER BAR ───────────────────────────────────────────────────────────────

const FilterBar = ({
  machines, filterMachine, setFilterMachine,
  filterStatus, setFilterStatus,
  onlyAnomalies, setOnlyAnomalies,
  onExport, total,
}) => (
  <div className="px-4 md:px-5 pb-3 flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
    <select
      value={filterMachine}
      onChange={e => setFilterMachine(e.target.value)}
      className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <option value="all">Todas as máquinas</option>
      {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>

    <div className="flex gap-1.5 flex-wrap">
      {FILTER_STATUS.map(opt => (
        <button
          key={opt.value}
          onClick={() => setFilterStatus(opt.value)}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
            filterStatus === opt.value
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>

    <button
      onClick={() => setOnlyAnomalies(v => !v)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
        onlyAnomalies
          ? 'bg-amber-500 text-white'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-amber-400'
      }`}
    >
      <AlertTriangle className="w-3 h-3" />
      Só anomalias
    </button>

    <div className="flex-1" />

    <button
      onClick={onExport}
      disabled={total === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-3 h-3" />
      CSV ({total})
    </button>
  </div>
);

// ─── DAY GROUP HEADER (table) ─────────────────────────────────────────────────

const DayHeader = ({ dateKey, sessions, collapsed, onToggle }) => {
  const totalHours    = sessions.filter(s => s.status === 'CLOSED').reduce((sum, s) => sum + (s.durationHours || 0), 0);
  const anomalyCount  = sessions.filter(s => s.hardAnomalies.length > 0).length;
  const d             = new Date(dateKey + 'T00:00:00');
  const label         = d.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <tr
      className="bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      onClick={onToggle}
    >
      <td colSpan={8} className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm capitalize">{label}</span>
          <span className="text-xs text-slate-400">{sessions.length} sess{sessions.length !== 1 ? 'ões' : 'ão'}</span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{totalHours.toFixed(1)}h</span>
          {anomalyCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />{anomalyCount}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};

// ─── SESSION ROW (desktop table) ──────────────────────────────────────────────

const SessionRow = ({ session, onClick }) => {
  const borderStyle   = getBorderStyle(session.hardAnomalies);
  const hasAnomalies  = session.anomalies.length > 0;
  const isFatigue     = session.anomalies.includes('FATIGUE');

  return (
    <tr
      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
      style={borderStyle}
      onClick={onClick}
    >
      <td className="px-4 py-2.5">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{session.machine.name}</p>
        <p className="text-xs text-slate-400">{session.machine.type || session.machine.category || '—'}</p>
      </td>
      <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300">
        {session.operator?.name || <span className="text-amber-500 text-xs">Desconhecido</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums">
        {session.startDate?.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) || '—'}
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums">
        {session.endDate ? session.endDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—'}
      </td>
      <td className={`px-4 py-2.5 text-sm tabular-nums font-medium ${isFatigue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
        {session.status === 'OPEN'
          ? <span className="text-emerald-600 dark:text-emerald-400 text-xs font-normal">Em curso…</span>
          : formatDuration(session.durationHours)}
      </td>
      <td className="px-4 py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[session.status] || STATUS_STYLE.CLOSED}`}>
          {STATUS_LABEL[session.status] || session.status}
        </span>
      </td>
      <td className="px-4 py-2.5 text-sm tabular-nums text-right text-slate-500">
        {session.costs?.total ? `${Math.round(session.costs.total)}€` : '—'}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          {hasAnomalies && (
            <span title={session.anomalies.map(a => ANOMALY_LABEL[a]).join(' · ')}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </td>
    </tr>
  );
};

// ─── SESSION CARD (mobile) ────────────────────────────────────────────────────

const SessionCard = ({ session, onClick }) => {
  const borderStyle  = getBorderStyle(session.hardAnomalies);
  const hasAnomalies = session.anomalies.length > 0;

  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
      style={borderStyle}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{session.machine.name}</p>
          <p className="text-xs text-slate-400 truncate">
            {session.operator?.name || <span className="text-amber-500">Desconhecido</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[session.status] || STATUS_STYLE.CLOSED}`}>
            {STATUS_LABEL[session.status] || session.status}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="tabular-nums">
          {session.startDate?.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) || '—'}
          {session.endDate
            ? ` → ${session.endDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
            : ' → Em curso'}
        </span>
        <span className="font-medium">
          {session.status === 'OPEN' ? '—' : formatDuration(session.durationHours)}
        </span>
        {session.costs?.total > 0 && <span>{Math.round(session.costs.total)}€</span>}
        {hasAnomalies && <AlertTriangle className="w-3 h-3 text-amber-500 ml-auto shrink-0" />}
      </div>
    </div>
  );
};

// ─── SESSION DRAWER ───────────────────────────────────────────────────────────

const SessionDrawer = ({ session, setActiveView, onClose }) => {
  const co2Factor = 2.68;
  const estimatedCO2 = session.durationHours
    ? (session.machine.consumptionRate || 0) * session.durationHours * co2Factor
    : null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-slate-900 dark:text-white">{session.machine.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[session.status] || STATUS_STYLE.CLOSED}`}>
                {STATUS_LABEL[session.status] || session.status}
              </span>
              {session.anomalies.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {session.anomalies.length} anomalia{session.anomalies.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
              {session.startDate?.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ml-2 shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Timestamps */}
          <div className="grid grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
            {[
              { label: 'Início',  value: session.startDate?.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) || '—' },
              { label: 'Fim',     value: session.endDate ? session.endDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—' },
              { label: 'Duração', value: session.status === 'OPEN' ? 'Em curso' : formatDuration(session.durationHours) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-slate-800 py-3 text-center">
                <p className="text-base font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {/* Operator */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {session.operator?.name || <span className="text-amber-500">Operador desconhecido</span>}
                </p>
                <p className="text-xs text-slate-400">
                  {session.operatorId ? `ID: ${session.operatorId}` : 'Sem registo de operador'}
                </p>
              </div>
            </div>

            {/* Cost + CO₂ — cost may be absent in localhost/sessions without tariff */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Euro className="w-3.5 h-3.5 text-slate-400" />
                  {session.costs?.total !== undefined ? `${Math.round(session.costs.total)}€` : '—'}
                </p>
                <p className="text-xs text-slate-500">Custo estimado</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-slate-400" />
                  {estimatedCO2 !== null ? `${Math.round(estimatedCO2)} kg` : '—'}
                </p>
                <p className="text-xs text-slate-500">CO₂ estimado</p>
              </div>
            </div>

            {/* Anomalies */}
            {session.anomalies.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Anomalias detectadas
                </h3>
                {session.anomalies.map(a => (
                  <div key={a} className="flex items-center gap-2 text-sm">
                    <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${ANOMALY_COLOR[a] || 'text-slate-400'}`} />
                    <span className={ANOMALY_COLOR[a] || 'text-slate-500'}>{ANOMALY_LABEL[a] || a}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Correction notes — only if session went through validation flow */}
            {session.correctionNotes && (
              <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 rounded-xl p-3">
                <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 mb-1">Nota de correcção</p>
                <p className="text-sm text-sky-700 dark:text-sky-300">{session.correctionNotes}</p>
              </div>
            )}

            {/* Session ID */}
            <p className="text-xs text-slate-300 dark:text-slate-600 font-mono">ID: {session.id}</p>
          </div>
        </div>

        {/* Correction CTA — routes to global validation flow, does not duplicate it */}
        {session.anomalies.some(a => ['NO_OPERATOR', 'FATIGUE', 'AUTO_CLOSE'].includes(a)) && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => { onClose(); setActiveView('sessoes-validacoes'); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver na validação global
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN VIEW ────────────────────────────────────────────────────────────────

const SessoesObraView = ({ obraId, dateRange, obraMachines }) => {
  const { getSessionsByObraId, sessions, machines, operators, setActiveView } = useStore();

  const [filterMachine,   setFilterMachine]   = useState('all');
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [onlyAnomalies,   setOnlyAnomalies]   = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [collapsedDays,   setCollapsedDays]   = useState({});

  // obraSessions: filtered by obraId via machine membership at query time.
  // NOTE (localhost vs deploy): in deploy with real fleet movement, a machine may
  // have changed obraId since a session was created — those historical sessions
  // will appear/disappear based on current machine.obraId, not the session's own
  // location snapshot. This is a known data limitation; no fix attempted here.
  const obraSessions = useMemo(
    () => getSessionsByObraId(obraId, dateRange),
    [obraId, dateRange, sessions, machines]
  );

  const enrichedSessions = useMemo(() => {
    return obraSessions.map(s => {
      // Resolve machine — fall back to stub if machine not found (e.g. deleted or moved)
      const machine  = obraMachines.find(m => m.id === s.machineId)
        || { id: s.machineId, name: s.machineId, type: '—', consumptionRate: 0 };
      // Resolve operator — try both cardId and id fields (RFID vs manual sessions)
      const operator = operators.find(o => o.cardId === s.operatorId || o.id === s.operatorId) || null;
      const anomalies     = detectSessionAnomalies(s);
      const hardAnomalies = detectHardAnomalies(s);
      // Guard: endTime is null for OPEN sessions — never pass to Date() without check
      const startDate = resolveTimestamp(s.startTime) || new Date(0);
      const endDate   = s.endTime ? resolveTimestamp(s.endTime) : null;
      return { ...s, machine, operator, anomalies, hardAnomalies, startDate, endDate };
    });
  }, [obraSessions, obraMachines, operators]);

  const summary = useMemo(() => {
    const closed = enrichedSessions.filter(s => s.status === 'CLOSED');
    return {
      total:      enrichedSessions.length,
      active:     enrichedSessions.filter(s => s.status === 'OPEN').length,
      closed:     closed.length,
      anomalies:  enrichedSessions.filter(s => s.hardAnomalies.length > 0).length,
      totalHours: closed.reduce((sum, s) => sum + (s.durationHours || 0), 0),
    };
  }, [enrichedSessions]);

  const filtered = useMemo(() => {
    let list = enrichedSessions;
    if (filterMachine !== 'all') list = list.filter(s => s.machineId === filterMachine);
    if (filterStatus  !== 'all') list = list.filter(s => s.status === filterStatus);
    if (onlyAnomalies)           list = list.filter(s => s.hardAnomalies.length > 0);
    return [...list].sort((a, b) => b.startDate - a.startDate);
  }, [enrichedSessions, filterMachine, filterStatus, onlyAnomalies]);

  // Group by calendar day (YYYY-MM-DD key), sorted newest-first
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(s => {
      const key = s.startDate.toISOString().slice(0, 10);
      if (!g[key]) g[key] = [];
      g[key].push(s);
    });
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const toggleDay = (key) => setCollapsedDays(prev => ({ ...prev, [key]: !prev[key] }));

  const handleExport = () => {
    const exportable = filtered.filter(s => s.status === 'CLOSED');
    const headers = ['Máquina', 'Operador', 'Data', 'Início', 'Fim', 'Duração(h)', 'Custo(€)', 'Anomalias'];
    const rows = exportable.map(s => [
      s.machine.name,
      s.operator?.name || '—',
      s.startDate.toLocaleDateString('pt-PT'),
      s.startDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      s.endDate ? s.endDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—',
      (s.durationHours || 0).toFixed(2),
      (s.costs?.total || 0).toFixed(2),
      s.anomalies.join('|') || '—',
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sessoes_${obraId}_${new Date().toLocaleDateString('pt-PT').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (obraMachines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Activity className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-slate-500">Sem máquinas nesta obra</p>
      </div>
    );
  }

  return (
    <div>
      <SummaryHeader summary={summary} onClickAnomalies={() => setOnlyAnomalies(true)} />

      <FilterBar
        machines={obraMachines}
        filterMachine={filterMachine}     setFilterMachine={setFilterMachine}
        filterStatus={filterStatus}       setFilterStatus={setFilterStatus}
        onlyAnomalies={onlyAnomalies}     setOnlyAnomalies={setOnlyAnomalies}
        onExport={handleExport}           total={filtered.length}
      />

      <div className="px-4 md:px-5 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            Sem sessões com os filtros actuais
          </div>
        ) : (
          <>
            {/* TABLE — lg+ */}
            <div className="hidden lg:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Máquina', 'Operador', 'Início', 'Fim', 'Duração', 'Estado', 'Custo', ''].map((h, i) => (
                      <th
                        key={i}
                        className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i >= 6 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {grouped.map(([dateKey, daySessions]) => (
                    <React.Fragment key={dateKey}>
                      <DayHeader
                        dateKey={dateKey}
                        sessions={daySessions}
                        collapsed={!!collapsedDays[dateKey]}
                        onToggle={() => toggleDay(dateKey)}
                      />
                      {!collapsedDays[dateKey] && daySessions.map(s => (
                        <SessionRow key={s.id} session={s} onClick={() => setSelectedSession(s)} />
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CARDS — < lg */}
            <div className="lg:hidden space-y-4">
              {grouped.map(([dateKey, daySessions]) => {
                const d       = new Date(dateKey + 'T00:00:00');
                const totalH  = daySessions.filter(s => s.status === 'CLOSED').reduce((sum, s) => sum + (s.durationHours || 0), 0);
                return (
                  <div key={dateKey}>
                    <div
                      className="flex items-center gap-2 px-1 py-2 cursor-pointer"
                      onClick={() => toggleDay(dateKey)}
                    >
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${collapsedDays[dateKey] ? '-rotate-90' : ''}`} />
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">
                        {d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </h3>
                      <span className="text-xs text-slate-400">{daySessions.length} sessões · {totalH.toFixed(1)}h</span>
                    </div>
                    {!collapsedDays[dateKey] && (
                      <div className="space-y-2">
                        {daySessions.map(s => (
                          <SessionCard key={s.id} session={s} onClick={() => setSelectedSession(s)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedSession && (
        <SessionDrawer
          session={selectedSession}
          setActiveView={setActiveView}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

export default SessoesObraView;
