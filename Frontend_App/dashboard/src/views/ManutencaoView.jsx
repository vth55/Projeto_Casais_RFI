/**
 * ManutencaoView — Gestão de tool_maintenance (pivot 2026-05).
 *
 * Substitui completamente a view legacy de manutenção de máquinas pesadas
 * (maintenanceInterval / partialHours / calendário de horas de motor).
 *
 * Consome: tools, toolMaintenance, updateToolMaintenance, resolveToolMaintenance
 * Semântica: inspeção / dano / reparação / calibração / substituição / perda
 */
import React, { useState, useMemo } from 'react';
import {
  Wrench, Search, X, ChevronRight, AlertTriangle, CheckCircle,
  Clock, Euro, ClipboardList, ShieldAlert, RotateCcw, Gauge,
  RefreshCw, Trash2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { TOOL_MAINTENANCE_TYPES } from '../types';

// ─── META ─────────────────────────────────────────────────────────────────────

const TYPE_META = {
  [TOOL_MAINTENANCE_TYPES.INSPECTION]: {
    label: 'Inspeção',
    icon: ClipboardList,
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  [TOOL_MAINTENANCE_TYPES.DAMAGE]: {
    label: 'Dano',
    icon: AlertTriangle,
    color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    dot: 'bg-red-500',
  },
  [TOOL_MAINTENANCE_TYPES.REPAIR]: {
    label: 'Reparação',
    icon: Wrench,
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  [TOOL_MAINTENANCE_TYPES.CALIBRATION]: {
    label: 'Calibração',
    icon: Gauge,
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  [TOOL_MAINTENANCE_TYPES.REPLACEMENT]: {
    label: 'Substituição',
    icon: RefreshCw,
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  [TOOL_MAINTENANCE_TYPES.LOSS]: {
    label: 'Perda',
    icon: Trash2,
    color: 'bg-slate-50 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
};

const STATUS_META = {
  OPEN: {
    label: 'Aberto',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  },
  IN_PROGRESS: {
    label: 'Em progresso',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  },
  DONE: {
    label: 'Resolvido',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
};

// ─── TYPE FILTER OPTIONS ──────────────────────────────────────────────────────

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  ...Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label })),
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os estados' },
  { value: 'OPEN', label: 'Abertos' },
  { value: 'IN_PROGRESS', label: 'Em progresso' },
  { value: 'DONE', label: 'Resolvidos' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatRelative(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `há ${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `há ${hours}h`;
  const min = Math.floor(diff / 60000);
  if (min >= 1) return `há ${min}min`;
  return 'agora';
}

// ─── STAT TILE ────────────────────────────────────────────────────────────────

const StatTile = ({ icon: Icon, label, value, tone = 'primary' }) => {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    amber:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    red:     'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  };
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneMap[tone] || toneMap.primary}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
      </div>
    </div>
  );
};

// ─── RESOLVE DRAWER ───────────────────────────────────────────────────────────

const ResolveDrawer = ({ record, onClose, onResolve }) => {
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  if (!record) return null;

  const typeMeta = TYPE_META[record.type] || TYPE_META[TOOL_MAINTENANCE_TYPES.REPAIR];
  const TypeIcon = typeMeta.icon;

  async function handleResolve() {
    setSaving(true);
    try {
      await onResolve(record.id, {
        notes: notes.trim() || record.notes,
        cost: cost ? Number(cost) : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.color}`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 dark:text-white">Resolver registo</h2>
              <p className="text-xs text-slate-500 truncate">{record.toolName || record.toolId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg ml-2 shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Notas de resolução
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={record.notes || 'Descreve a resolução…'}
              rows={4}
              className="w-full p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Custo real (€, opcional)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0"
              className="w-full p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleResolve}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'A guardar…' : 'Marcar como resolvido'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── DETAIL DRAWER ────────────────────────────────────────────────────────────

const DetailDrawer = ({ record, toolName, onClose, onMarkInProgress, onOpenResolve }) => {
  if (!record) return null;

  const typeMeta   = TYPE_META[record.type] || TYPE_META[TOOL_MAINTENANCE_TYPES.REPAIR];
  const statusMeta = STATUS_META[record.status] || STATUS_META.OPEN;
  const TypeIcon   = typeMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.color}`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                <span className="text-xs font-medium text-slate-500">{statusMeta.label}</span>
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white truncate">{toolName || record.toolId}</h2>
              <p className="text-xs text-slate-500">{typeMeta.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg ml-2 shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-400 mb-0.5">Reportado por</p>
              <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{record.reportedBy || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-400 mb-0.5">Data</p>
              <p className="font-medium text-slate-800 dark:text-slate-100">{formatDate(record.reportedAt)}</p>
            </div>
            {record.obraId && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Obra</p>
                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{record.obraId}</p>
              </div>
            )}
            {record.notes && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Notas</p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{record.notes}</p>
              </div>
            )}
            {record.cost != null && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-400 mb-0.5">Custo</p>
                <p className="font-bold text-slate-900 dark:text-white">{record.cost}€</p>
              </div>
            )}
            {record.resolvedBy && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-400 mb-0.5">Resolvido por</p>
                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{record.resolvedBy}</p>
              </div>
            )}
            {record.resolvedAt && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-400 mb-0.5">Data resolução</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">{formatDate(record.resolvedAt)}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          {record.photos && record.photos.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Fotos ({record.photos.length})</p>
              <div className="grid grid-cols-3 gap-2">
                {record.photos.map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                    #{i + 1}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {record.status !== 'DONE' && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            {record.status === 'OPEN' && (
              <button
                onClick={() => { onMarkInProgress(record.id); onClose(); }}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Marcar em progresso
              </button>
            )}
            <button
              onClick={() => { onClose(); onOpenResolve(record); }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Resolver
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN VIEW ────────────────────────────────────────────────────────────────

export default function ManutencaoView() {
  const { tools = [], toolMaintenance = [], updateToolMaintenance, resolveToolMaintenance } = useStore();
  const { currentUser } = useAuthStore();

  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(null);   // detail drawer
  const [resolving,    setResolving]    = useState(null);   // resolve drawer

  // Enrich each record with tool name
  const enriched = useMemo(() => {
    const toolMap = new Map(tools.map(t => [t.id, t]));
    return toolMaintenance.map(r => ({
      ...r,
      tool: toolMap.get(r.toolId) || null,
    }));
  }, [toolMaintenance, tools]);

  // Stats
  const stats = useMemo(() => {
    const open       = enriched.filter(r => r.status === 'OPEN').length;
    const inProgress = enriched.filter(r => r.status === 'IN_PROGRESS').length;
    const done       = enriched.filter(r => r.status === 'DONE').length;
    const losses     = enriched.filter(r => r.type === TOOL_MAINTENANCE_TYPES.LOSS).length;
    const totalCost  = enriched.reduce((sum, r) => sum + (r.cost || 0), 0);
    return { open, inProgress, done, losses, totalCost };
  }, [enriched]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = enriched;
    if (typeFilter !== 'all')   list = list.filter(r => r.type === typeFilter);
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(r =>
        (r.tool?.name || '').toLowerCase().includes(s) ||
        (r.tool?.type || '').toLowerCase().includes(s) ||
        (r.notes || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [enriched, typeFilter, statusFilter, search]);

  async function handleMarkInProgress(recordId) {
    await updateToolMaintenance(recordId, { status: 'IN_PROGRESS' });
  }

  async function handleResolve(recordId, { notes, cost }) {
    await resolveToolMaintenance(recordId, {
      resolvedBy: currentUser?.id || currentUser?.uid || 'unknown',
      notes,
      cost,
    });
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
          <Wrench className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manutenção de Ferramentas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Inspeções, danos, reparações, perdas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile icon={AlertCircle}   label="Abertos"      value={stats.open}       tone="red" />
        <StatTile icon={Clock}         label="Em progresso" value={stats.inProgress} tone="amber" />
        <StatTile icon={CheckCircle}   label="Resolvidos"   value={stats.done}       tone="emerald" />
        <StatTile icon={Trash2}        label="Perdas"       value={stats.losses}     tone="slate" />
        <StatTile icon={Euro}          label="Custo total"  value={`${stats.totalCost.toFixed(0)}€`} tone="primary" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar ferramenta…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {TYPE_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sem registos com estes filtros</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  {['Ferramenta', 'Tipo', 'Estado', 'Reportado por', 'Data', 'Notas', 'Custo', ''].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const typeMeta   = TYPE_META[r.type]   || TYPE_META[TOOL_MAINTENANCE_TYPES.REPAIR];
                  const statusMeta = STATUS_META[r.status] || STATUS_META.OPEN;
                  const TypeIcon   = typeMeta.icon;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${typeMeta.dot}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.tool?.name || r.toolId}</p>
                            <p className="text-xs text-slate-400 truncate">{r.tool?.type || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeMeta.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{r.reportedBy || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatRelative(r.reportedAt)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[160px]">{r.notes || '—'}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">{r.cost != null ? `${r.cost}€` : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {r.status === 'OPEN' && (
                            <button
                              onClick={() => handleMarkInProgress(r.id)}
                              className="px-2 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 font-medium whitespace-nowrap"
                            >
                              Em progresso
                            </button>
                          )}
                          {r.status !== 'DONE' && (
                            <button
                              onClick={() => setResolving(r)}
                              className="px-2 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 font-medium"
                            >
                              Resolver
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map(r => {
              const typeMeta   = TYPE_META[r.type]   || TYPE_META[TOOL_MAINTENANCE_TYPES.REPAIR];
              const statusMeta = STATUS_META[r.status] || STATUS_META.OPEN;
              const TypeIcon   = typeMeta.icon;
              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-primary-400 transition-colors"
                  onClick={() => setSelected(r)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{r.tool?.name || r.toolId}</p>
                      <p className="text-xs text-slate-400 truncate">{r.tool?.type || '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${statusMeta.badge}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeMeta.color}`}>
                      <TypeIcon className="w-3 h-3" />
                      {typeMeta.label}
                    </span>
                    {r.cost != null && (
                      <span className="text-xs text-slate-500 flex items-center gap-0.5 ml-auto">
                        <Euro className="w-3 h-3" />{r.cost}
                      </span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-xs text-slate-500 truncate mb-2">{r.notes}</p>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-400">{r.reportedBy || '—'}</span>
                    <span className="text-xs text-slate-400 ml-auto">{formatRelative(r.reportedAt)}</span>
                  </div>
                  {r.status !== 'DONE' && (
                    <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                      {r.status === 'OPEN' && (
                        <button
                          onClick={() => handleMarkInProgress(r.id)}
                          className="flex-1 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 font-medium"
                        >
                          Em progresso
                        </button>
                      )}
                      <button
                        onClick={() => setResolving(r)}
                        className="flex-1 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 font-medium"
                      >
                        Resolver
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail Drawer */}
      <DetailDrawer
        record={selected}
        toolName={selected?.tool?.name || selected?.toolId}
        onClose={() => setSelected(null)}
        onMarkInProgress={handleMarkInProgress}
        onOpenResolve={r => { setSelected(null); setResolving(r); }}
      />

      {/* Resolve Drawer */}
      <ResolveDrawer
        record={resolving}
        onClose={() => setResolving(null)}
        onResolve={handleResolve}
      />
    </div>
  );
}
