import React, { useState, useMemo } from 'react';
import {
  Wrench, AlertTriangle, X, ChevronRight,
  CheckCircle, ExternalLink, XCircle, AlertCircle,
} from 'lucide-react';
import useStore from '../../store/useStore';
import useAvariasStore from '../../store/useAvariasStore';
import KpiCard from '../../components/obra/KpiCard';
import { MAINTENANCE_ALERT_PCT, MAINTENANCE_OVERDUE_PCT } from '../../utils/sessionHelpers';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLD = 150; // hours — fallback when machine has no threshold configured

const RAG = {
  OVERDUE: {
    label: 'Vencida',
    color: 'text-red-600 dark:text-red-400',
    bg:    'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    bar:   'bg-red-500',
    dot:   'bg-red-500',
  },
  ALERT: {
    label: 'Em alerta',
    color: 'text-amber-600 dark:text-amber-400',
    bg:    'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    bar:   'bg-amber-400',
    dot:   'bg-amber-400',
  },
  NORMAL: {
    label: 'Normal',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg:    'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
    bar:   'bg-emerald-400',
    dot:   'bg-emerald-400',
  },
  UNKNOWN: {
    label: 'Sem dados',
    color: 'text-slate-400',
    bg:    'bg-slate-50 border-slate-200 dark:bg-slate-700/30 dark:border-slate-600',
    bar:   'bg-slate-300',
    dot:   'bg-slate-300',
  },
};

const FILTER_OPTIONS = [
  { value: 'all',     label: 'Todos'      },
  { value: 'OVERDUE', label: 'Vencida'    },
  { value: 'ALERT',   label: 'Em alerta' },
  { value: 'NORMAL',  label: 'Normal'     },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getEffectiveThreshold(machine, systemDefault) {
  return machine.maintenanceThreshold || machine.maintenanceInterval || systemDefault;
}

function getMachineRag(partialHours, threshold) {
  if (!threshold) return 'UNKNOWN';
  const pct = partialHours / threshold;
  if (pct >= MAINTENANCE_OVERDUE_PCT) return 'OVERDUE';
  if (pct >= MAINTENANCE_ALERT_PCT)   return 'ALERT';
  return 'NORMAL';
}

function getRagPriority(rag) {
  return { OVERDUE: 0, ALERT: 1, NORMAL: 2, UNKNOWN: 3 }[rag] ?? 3;
}

function formatLastMaintenance(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

const MaintenanceBar = ({ partialHours, threshold, rag }) => {
  const pct = threshold > 0 ? Math.min((partialHours / threshold) * 100, 100) : 0;
  const r   = RAG[rag] || RAG.UNKNOWN;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-medium ${r.color}`}>{pct.toFixed(0)}%</span>
        <span className="text-slate-400 tabular-nums">{partialHours}h / {threshold}h</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${r.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ─── SUMMARY HEADER ───────────────────────────────────────────────────────────

const SummaryHeader = ({ enriched, openAvarias, onFilterOverdue }) => {
  const overdue = enriched.filter(m => m.rag === 'OVERDUE').length;
  const alert   = enriched.filter(m => m.rag === 'ALERT').length;
  return (
    <div className="p-4 md:p-5 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Máquinas na obra"
          value={enriched.length}
          icon={Wrench}
          color="primary"
        />
        <KpiCard
          label="Em alerta"
          value={alert}
          icon={AlertTriangle}
          color={alert > 0 ? 'amber' : 'slate'}
        />
        <KpiCard
          label="Manutenção vencida"
          value={overdue}
          icon={XCircle}
          color={overdue > 0 ? 'red' : 'slate'}
        />
        <KpiCard
          label="Avarias abertas"
          value={openAvarias}
          icon={AlertCircle}
          color={openAvarias > 0 ? 'red' : 'slate'}
        />
      </div>

      {overdue > 0 && (
        <button
          onClick={onFilterOverdue}
          className="w-full flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{overdue}</strong> máquina{overdue > 1 ? 's' : ''} com manutenção vencida — bloquear utilização recomendado.
          </span>
          <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
        </button>
      )}
    </div>
  );
};

// ─── FILTER BAR ───────────────────────────────────────────────────────────────

const FilterBar = ({ filter, setFilter, search, setSearch }) => (
  <div className="px-4 md:px-5 pb-3 flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap border-b border-slate-100 dark:border-slate-700/50">
    <div className="flex gap-1.5 flex-wrap">
      {FILTER_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => setFilter(opt.value)}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
            filter === opt.value
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
    <input
      type="text"
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Pesquisar máquina…"
      className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-48"
    />
  </div>
);

// ─── MACHINE ROW (desktop table) ──────────────────────────────────────────────

const MachineRow = ({ machine, onClick }) => {
  const r   = RAG[machine.rag] || RAG.UNKNOWN;
  const pct = machine.threshold > 0
    ? Math.min((machine.partialHours / machine.threshold) * 100, 100)
    : 0;

  return (
    <tr
      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.dot}`} />
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{machine.name}</p>
            <p className="text-xs text-slate-400">{machine.type || machine.category || '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${r.bg} ${r.color}`}>
          {r.label}
        </span>
      </td>
      <td className="px-4 py-3 w-48">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
            <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-slate-500 whitespace-nowrap w-8 text-right">
            {pct.toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {machine.partialHours}h / {machine.threshold}h
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
        {machine.lastMaintenanceFormatted ?? <span className="italic">Desconhecida</span>}
      </td>
      <td className="px-4 py-3 text-right">
        {machine.openAvarias > 0 && (
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
            {machine.openAvarias} avaria{machine.openAvarias > 1 ? 's' : ''}
          </span>
        )}
      </td>
      <td className="px-4 py-3 w-8">
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </td>
    </tr>
  );
};

// ─── MACHINE CARD (mobile) ────────────────────────────────────────────────────

const MachineCard = ({ machine, onClick }) => {
  const r   = RAG[machine.rag] || RAG.UNKNOWN;
  const pct = machine.threshold > 0
    ? Math.min((machine.partialHours / machine.threshold) * 100, 100)
    : 0;

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-slate-800 ${r.bg}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{machine.name}</p>
          <p className="text-xs text-slate-400">{machine.type || machine.category || '—'}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ml-2 ${r.bg} ${r.color}`}>
          {r.label}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
          <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs tabular-nums text-slate-500 w-8 text-right">{pct.toFixed(0)}%</span>
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{machine.partialHours}h / {machine.threshold}h</span>
        {machine.openAvarias > 0 && (
          <span className="text-red-500 font-medium">
            {machine.openAvarias} avaria{machine.openAvarias > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── MACHINE DRAWER ───────────────────────────────────────────────────────────

const MachineDrawer = ({ machine, onClose }) => {
  if (!machine) return null;
  const r        = RAG[machine.rag] || RAG.UNKNOWN;
  const pct      = machine.threshold > 0
    ? Math.min((machine.partialHours / machine.threshold) * 100, 100)
    : 0;
  const hoursLeft = machine.threshold > 0
    ? Math.max(machine.threshold - machine.partialHours, 0)
    : null;
  const hoursOver = machine.rag === 'OVERDUE'
    ? Math.round(machine.partialHours - machine.threshold)
    : 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-lg leading-tight">{machine.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{machine.type || machine.category || '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-3 flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* RAG + progress */}
          <div className={`rounded-xl border p-4 ${r.bg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.dot}`} />
              <span className={`text-sm font-semibold ${r.color}`}>{r.label}</span>
            </div>
            <MaintenanceBar
              partialHours={machine.partialHours}
              threshold={machine.threshold}
              rag={machine.rag}
            />
            {machine.rag !== 'OVERDUE' && hoursLeft !== null && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {hoursLeft}h restantes até manutenção
              </p>
            )}
            {machine.rag === 'OVERDUE' && (
              <p className={`text-xs mt-2 font-medium ${r.color}`}>
                Vencida há {hoursOver}h — intervenção necessária
              </p>
            )}
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Horas parciais</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {machine.partialHours}<span className="text-sm font-normal text-slate-400 ml-0.5">h</span>
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Threshold</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {machine.threshold}<span className="text-sm font-normal text-slate-400 ml-0.5">h</span>
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Última manutenção</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {machine.lastMaintenanceFormatted ?? (
                  <span className="text-slate-400 text-xs italic">Desconhecida</span>
                )}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Avarias abertas</p>
              <p className={`text-xl font-bold tabular-nums ${machine.openAvarias > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                {machine.openAvarias}
              </p>
            </div>
          </div>

          {/* Procore deep-link */}
          {machine.procoreEquipmentId && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#005EB8]/5 border border-[#005EB8]/20 rounded-xl text-xs text-[#005EB8] dark:text-blue-400">
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Procore Equipment ID: {machine.procoreEquipmentId}</span>
            </div>
          )}

          {/* Deferred CTA stub */}
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 text-center">
            <Wrench className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">Registar manutenção</p>
            <p className="text-xs text-slate-400 mt-0.5">Disponível em próxima fase</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN VIEW ────────────────────────────────────────────────────────────────

const ManutencaoObraView = ({ obraId, obraMachines }) => {
  const { systemSettings } = useStore();
  const { avarias }        = useAvariasStore();

  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const systemDefault = systemSettings?.defaultMaintenanceInterval || DEFAULT_THRESHOLD;

  // Enrich machines with maintenance state — sorted by criticality
  const enriched = useMemo(() => {
    return obraMachines
      .map(m => {
        const threshold             = getEffectiveThreshold(m, systemDefault);
        const partialHours          = m.partialHours || 0;
        const rag                   = getMachineRag(partialHours, threshold);
        // NOTE: avarias have no obraId field — join is via machineId only.
        // A machine that moved between obras carries avarias from prior obras.
        // This is a known data limitation; no fix attempted here.
        const machineAvarias        = avarias.filter(a => a.machineId === m.id && a.status !== 'resolvida');
        const lastMaintenanceFormatted = formatLastMaintenance(m.lastMaintenance);
        return { ...m, threshold, partialHours, rag, openAvarias: machineAvarias.length, lastMaintenanceFormatted };
      })
      .sort((a, b) => {
        const pa = getRagPriority(a.rag);
        const pb = getRagPriority(b.rag);
        if (pa !== pb) return pa - pb;
        // Within same RAG group: most consumed first
        const pctA = a.threshold > 0 ? a.partialHours / a.threshold : 0;
        const pctB = b.threshold > 0 ? b.partialHours / b.threshold : 0;
        return pctB - pctA;
      });
  }, [obraMachines, avarias, systemDefault]);

  const openAvarias = useMemo(
    () => enriched.reduce((sum, m) => sum + m.openAvarias, 0),
    [enriched]
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== 'all')    list = list.filter(m => m.rag === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) || (m.type || m.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, filter, search]);

  if (obraMachines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Wrench className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-slate-500">Sem máquinas nesta obra</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-400 px-4 md:px-5 pt-3 pb-0">
        Estado actual da frota — independente do período seleccionado
      </p>
      <SummaryHeader
        enriched={enriched}
        openAvarias={openAvarias}
        onFilterOverdue={() => setFilter('OVERDUE')}
      />

      <FilterBar filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CheckCircle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium text-slate-500">Nenhuma máquina neste estado</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left font-medium">Máquina</th>
                  <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-left font-medium w-48">Consumo</th>
                  <th className="px-4 py-2.5 text-left font-medium">Horas</th>
                  <th className="px-4 py-2.5 text-left font-medium">Última manut.</th>
                  <th className="px-4 py-2.5 text-left font-medium">Avarias</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <MachineRow key={m.id} machine={m} onClick={() => setSelected(m)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden p-4 space-y-3">
            {filtered.map(m => (
              <MachineCard key={m.id} machine={m} onClick={() => setSelected(m)} />
            ))}
          </div>
        </>
      )}

      {selected && <MachineDrawer machine={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ManutencaoObraView;
