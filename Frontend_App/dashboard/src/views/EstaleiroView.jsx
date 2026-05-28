/**
 * EstaleiroView — Armazém / Inventário de Equipamentos (pivot 2026-05).
 *
 * Substitui o conceito legacy de "parque de equipamentos" pelo novo modelo:
 * inventário de equipamentos pequenas NFC, com disponibilidade, histórico de
 * movimentos e valor imobilizado.
 *
 * Consome: tools, toolSessions, toolMovements do useStore.
 * NÃO consome machines / sessions / updateMachine / moveMachinesToObra.
 */
import React, { useMemo, useState } from 'react';
import {
  Warehouse, Wrench, Search, X, ChevronRight,
  Activity, AlertTriangle, CheckCircle, Tag, Clock, Euro,
} from 'lucide-react';
import useStore from '../store/useStore';
import { TOOL_STATUS } from '../types';

const STATUS_META = {
  [TOOL_STATUS.AVAILABLE]: { label: 'Disponível', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  [TOOL_STATUS.IN_USE]:    { label: 'Em uso',     dot: 'bg-primary-500', badge: 'bg-primary-50 text-primary-700' },
  [TOOL_STATUS.IN_REPAIR]: { label: 'Reparação',  dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700' },
  [TOOL_STATUS.LOST]:      { label: 'Perdida',    dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700' },
  [TOOL_STATUS.RETIRED]:   { label: 'Retirado',   dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600' },
};

const FILTERS = [
  { value: 'all',                 label: 'Todas' },
  { value: TOOL_STATUS.AVAILABLE, label: 'Disponíveis' },
  { value: TOOL_STATUS.IN_USE,    label: 'Em uso' },
  { value: TOOL_STATUS.IN_REPAIR, label: 'Reparação' },
  { value: TOOL_STATUS.LOST,      label: 'Perdidas' },
];

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

const StatTile = ({ icon: Icon, label, value, tone = 'primary' }) => {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    amber:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    red:     'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  };
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
      </div>
    </div>
  );
};

const ToolDrawer = ({ tool, movements, sessions, onClose }) => {
  if (!tool) return null;
  const meta = STATUS_META[tool.status] || STATUS_META[TOOL_STATUS.AVAILABLE];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span className="text-xs font-medium text-slate-500">{meta.label}</span>
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white truncate">{tool.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{tool.type || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg ml-2">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-400 mb-0.5">Tag NFC</p>
              <p className="font-mono text-xs text-slate-700 dark:text-slate-200 truncate">{tool.nfcTagId || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-400 mb-0.5">Valor substituição</p>
              <p className="font-semibold text-slate-900 dark:text-white">{tool.replacementCost ? `${tool.replacementCost}€` : '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Localização</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{tool.currentObraName || tool.storageLocation || 'Armazém'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Últimas movimentações</h3>
            {movements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sem movimentos registados</p>
            ) : (
              <div className="space-y-1">
                {movements.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-slate-600 dark:text-slate-300 truncate">
                      {m.fromObraId === 'WAREHOUSE' ? 'Armazém' : m.fromObraId} → {m.toObraId === 'WAREHOUSE' ? 'Armazém' : m.toObraId}
                    </span>
                    <span className="text-slate-400 shrink-0 ml-2">{formatRelative(m.movedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Últimas sessões</h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sem sessões recentes</p>
            ) : (
              <div className="space-y-1">
                {sessions.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{s.operatorName} · {s.status}</span>
                    <span className="text-slate-400 shrink-0 ml-2">{formatRelative(s.startTime)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EstaleiroView() {
  const { tools = [], toolSessions = [], toolMovements = [] } = useStore();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('warehouse'); // 'warehouse' | 'all'
  const [selected, setSelected] = useState(null);

  // Inferir status — usa tool.status se existir; senão deriva de currentObraId/sessão OPEN.
  const enrichedTools = useMemo(() => {
    const openByTool = new Set(toolSessions.filter(s => s.status === 'OPEN').map(s => s.toolId));
    return tools.map(t => ({
      ...t,
      status: t.status || (openByTool.has(t.id) || t.currentObraId ? TOOL_STATUS.IN_USE : TOOL_STATUS.AVAILABLE),
    }));
  }, [tools, toolSessions]);

  // Última movimentação por equipamento
  const lastMovementByTool = useMemo(() => {
    const map = new Map();
    toolMovements.forEach(m => {
      const tCurr = m.movedAt?.toDate ? m.movedAt.toDate().getTime() : new Date(m.movedAt || 0).getTime();
      const prev = map.get(m.toolId);
      const tPrev = prev?.movedAt?.toDate ? prev.movedAt.toDate().getTime() : 0;
      if (!prev || tCurr > tPrev) map.set(m.toolId, m);
    });
    return map;
  }, [toolMovements]);

  const stats = useMemo(() => ({
    inWarehouse: enrichedTools.filter(t => !t.currentObraId).length,
    available:   enrichedTools.filter(t => t.status === TOOL_STATUS.AVAILABLE).length,
    inUse:       enrichedTools.filter(t => t.status === TOOL_STATUS.IN_USE).length,
    inRepair:    enrichedTools.filter(t => t.status === TOOL_STATUS.IN_REPAIR).length,
    lost:        enrichedTools.filter(t => t.status === TOOL_STATUS.LOST).length,
  }), [enrichedTools]);

  const filtered = useMemo(() => {
    let list = scope === 'warehouse'
      ? enrichedTools.filter(t => !t.currentObraId)
      : enrichedTools;
    if (filter !== 'all') list = list.filter(t => t.status === filter);
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(t =>
        (t.name || '').toLowerCase().includes(s) ||
        (t.type || '').toLowerCase().includes(s) ||
        (t.nfcTagId || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [enrichedTools, filter, search, scope]);

  const selectedMovements = useMemo(
    () => selected ? toolMovements.filter(m => m.toolId === selected.id).sort((a, b) => {
      const ta = a.movedAt?.toDate ? a.movedAt.toDate().getTime() : 0;
      const tb = b.movedAt?.toDate ? b.movedAt.toDate().getTime() : 0;
      return tb - ta;
    }) : [],
    [selected, toolMovements]
  );
  const selectedSessions = useMemo(
    () => selected ? toolSessions.filter(s => s.toolId === selected.id).slice(0, 10) : [],
    [selected, toolSessions]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Warehouse className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Armazém</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Inventário de equipamentos</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
          <button
            onClick={() => setScope('warehouse')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${scope === 'warehouse' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
          >
            Só no armazém
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${scope === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile icon={Warehouse}     label="No armazém"   value={stats.inWarehouse} tone="primary" />
        <StatTile icon={CheckCircle}   label="Disponíveis"  value={stats.available}   tone="emerald" />
        <StatTile icon={Activity}      label="Em uso"       value={stats.inUse}       tone="primary" />
        <StatTile icon={Wrench}        label="Reparação"    value={stats.inRepair}    tone="amber" />
        <StatTile icon={AlertTriangle} label="Perdidas"     value={stats.lost}        tone="red" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar nome, tipo ou tag NFC…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 hover:border-primary-400'
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
          <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sem equipamentos com estes filtros</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  {['Equipamento', 'Tag NFC', 'Status', 'Última movimentação', 'Valor', ''].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const meta = STATUS_META[t.status] || STATUS_META[TOOL_STATUS.AVAILABLE];
                  const lastMoved = lastMovementByTool.get(t.id)?.movedAt;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => setSelected(t)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.name}</p>
                            <p className="text-xs text-slate-400 truncate">{t.type || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500 truncate max-w-[120px]">{t.nfcTagId || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatRelative(lastMoved)}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-700 dark:text-slate-200">{t.replacementCost ? `${t.replacementCost}€` : '—'}</td>
                      <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-slate-300 ml-auto" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map(t => {
              const meta = STATUS_META[t.status] || STATUS_META[TOOL_STATUS.AVAILABLE];
              const lastMoved = lastMovementByTool.get(t.id)?.movedAt;
              return (
                <div key={t.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-primary-400 transition-colors" onClick={() => setSelected(t)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{t.name}</p>
                      <p className="text-xs text-slate-400 truncate">{t.type || '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge} shrink-0`}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{t.nfcTagId?.slice(0, 8) || '—'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(lastMoved)}</span>
                    {t.replacementCost ? <span className="flex items-center gap-1 ml-auto"><Euro className="w-3 h-3" />{t.replacementCost}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ToolDrawer
        tool={selected}
        movements={selectedMovements}
        sessions={selectedSessions}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
