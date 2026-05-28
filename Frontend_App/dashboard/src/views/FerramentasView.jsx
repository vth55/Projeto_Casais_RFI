/**
 * EquipamentosView — landing agrupada por modelo (Milwaukee ONE-KEY + Hilti style).
 *
 * 2 níveis:
 *   1. Landing: grelha de modelos (equipment_models) com foto cover, brand badge e mini-stats.
 *   2. Drilldown: detalhe do modelo + lista das unidades físicas (tools com modelId=X).
 *
 * Mantém também um toggle "Lista plana" que mostra todos os tools agrupados.
 * A localização apresentada é sempre a última leitura NFC conhecida.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import {
  Wrench, Plus, Search, Edit2, Trash2, Nfc, Tag, Copy, Check,
  Building2, Package, AlertCircle, LogOut, Radio, Loader2, Clock,
  ShieldAlert, Activity, TrendingUp, AlertTriangle, ChevronLeft,
  X,
} from 'lucide-react';
import useStore from '../store/useStore';

const BASE = `artifacts/${projectId}/public/data`;
const TOOLS_PATH = `${BASE}/tools`;
const SESSIONS_PATH = `${BASE}/tool_sessions`;
const STALE_READ_DAYS = 7;

const TOOL_TYPES = [
  'Martelo Pneumático',
  'Compactador',
  'Berbequim',
  'Rebarbadora',
  'Vibrador de Betão',
  'Gerador Pequeno',
  'Soldadora',
  'Outro',
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function formatRelative(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'sem leitura';
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `há ${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `há ${hours}h`;
  const minutes = Math.floor(diff / 60000);
  if (minutes >= 1) return `há ${minutes}min`;
  return 'agora';
}

function getSessionReadTime(session) {
  return session?.endTime || session?.startTime || session?.createdAt || null;
}

function statusBadge(status) {
  const map = {
    AVAILABLE: { label: 'Disponível', cls: 'bg-emerald-100 text-emerald-800' },
    IN_USE: { label: 'Em uso', cls: 'bg-blue-100 text-blue-800' },
    IN_REPAIR: { label: 'Reparação', cls: 'bg-amber-100 text-amber-800' },
    LOST: { label: 'Perdido', cls: 'bg-red-100 text-red-800' },
    RETIRED: { label: 'Retirado', cls: 'bg-slate-200 text-slate-700' },
  };
  const cfg = map[status] || { label: status || '—', cls: 'bg-slate-100 text-slate-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
}

// ──────────────────────────────────────────────
// KPI tile
// ──────────────────────────────────────────────
function KpiTile({ icon: Icon, label, value, sub, tone = 'slate' }) {
  const toneMap = {
    primary: 'border-primary-200 bg-primary-50/60 text-primary-700',
    slate: 'border-slate-200 bg-white text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-700',
    red: 'border-red-200 bg-red-50/60 text-red-700',
  };
  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone] || toneMap.slate}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold opacity-75">{label}</p>
          <p className="text-2xl font-black mt-1">{value}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {sub && <p className="text-xs mt-2 opacity-75 leading-snug">{sub}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────
// ModelCard — card de modelo na grelha
// ──────────────────────────────────────────────
function ModelCard({ stat, onClick }) {
  const { model, unitCount, inUse, available, inRepair, lost } = stat;
  return (
    <button
      onClick={onClick}
      data-testid="model-card"
      className="text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-primary-400 hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700"
    >
      {/* Foto cover */}
      <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-700 relative">
        {model.photoUrl ? (
          <img
            src={model.photoUrl}
            alt={model.displayName}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Wrench className="w-12 h-12 text-slate-300" />
          </div>
        )}
        {model.brand && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur text-xs font-bold text-slate-700 rounded">
            {model.brand}
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold dark:text-primary-300">
          {model.category}
        </p>
        <h3 className="font-bold text-slate-900 dark:text-white leading-tight truncate mt-1">
          {model.displayName}
        </h3>
        {model.modelCode && (
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{model.modelCode}</p>
        )}

        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-bold text-slate-900 dark:text-white">{unitCount}</span>
          <span className="text-xs text-slate-500">
            {unitCount === 1 ? 'unidade' : 'unidades'}
          </span>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap text-xs">
          {available > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              {available} disp.
            </span>
          )}
          {inUse > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
              {inUse} uso
            </span>
          )}
          {inRepair > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
              {inRepair} reparação
            </span>
          )}
          {lost > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">
              {lost} perdido
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────
// UnitDetailDrawer — painel lateral de unidade
// ──────────────────────────────────────────────
function UnitDetailDrawer({ unit, model, sessions, maintenance, onClose }) {
  if (!unit) return null;

  const unitSessions = sessions
    .filter(s => s.toolId === unit.id)
    .sort((a, b) => {
      const ta = toDate(a.startTime)?.getTime() ?? 0;
      const tb = toDate(b.startTime)?.getTime() ?? 0;
      return tb - ta;
    });

  const lastSession = unitSessions[0];
  const lastReadAt = getSessionReadTime(lastSession);
  const lastLocation = lastSession?.obraName || lastSession?.currentObraName || unit.currentObraName || unit.storageLocation || '—';
  const lastOperator = lastSession?.operatorName || lastSession?.operatorId || '—';

  const openIssues = maintenance.filter(m =>
    m.toolId === unit.id && (m.status === 'OPEN' || m.status === 'IN_PROGRESS')
  );

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="unit-detail-drawer">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Detalhe da Unidade</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Foto modelo */}
          <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
            {model?.photoUrl ? (
              <img src={model.photoUrl} alt={model.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Wrench className="w-12 h-12 text-slate-300" />
              </div>
            )}
          </div>

          {/* Identificação */}
          <div>
            {model?.brand && (
              <p className="text-xs uppercase tracking-wide text-primary-700 dark:text-primary-300 font-semibold">
                {model.brand} · {model.category}
              </p>
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {model?.displayName || unit.name}
            </h3>
            {unit.customNumber && (
              <p className="text-2xl font-black text-primary-600 mt-2 font-mono">#{unit.customNumber}</p>
            )}
          </div>

          {/* IDs */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2 text-sm">
            {unit.serialNumber && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Serial</span>
                <span className="font-mono text-slate-900 dark:text-white">{unit.serialNumber}</span>
              </div>
            )}
            {unit.nfcTagId && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">NFC tag</span>
                <span className="font-mono text-slate-900 dark:text-white">{unit.nfcTagId}</span>
              </div>
            )}
            <div className="flex justify-between gap-2 items-center">
              <span className="text-slate-500">Estado</span>
              {statusBadge(unit.status)}
            </div>
          </div>

          {/* Última leitura literal */}
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wide text-primary-700 dark:text-primary-300 font-semibold mb-1">
              Última leitura NFC
            </p>
            <p className="text-sm text-slate-900 dark:text-white">
              {lastReadAt
                ? <>— {formatRelative(lastReadAt)} em <strong>{lastLocation}</strong> por <strong>{lastOperator}</strong></>
                : <>Sem leituras registadas</>
              }
            </p>
          </div>

          {/* Histórico */}
          {unitSessions.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">
                Últimas sessões
              </h4>
              <div className="space-y-1.5">
                {unitSessions.slice(0, 5).map(s => (
                  <div key={s.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {s.operatorName || s.operatorId}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${
                        s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      {formatRelative(s.startTime)} em {s.obraName || s.currentObraName || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Avarias abertas */}
          {openIssues.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wide text-red-600 font-semibold mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Avarias abertas
              </h4>
              <div className="space-y-1.5">
                {openIssues.map(m => (
                  <div key={m.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-xs">
                    <p className="font-medium text-red-700 dark:text-red-300">{m.type} · {m.status}</p>
                    {m.description && <p className="text-slate-600 dark:text-slate-300 mt-0.5">{m.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// ModelDrilldownView — detalhe de um modelo
// ──────────────────────────────────────────────
function ModelDrilldownView({ modelId, onBack }) {
  const { getModelById, getUnitsByModelId, toolSessions, toolMaintenance } = useStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  const model = getModelById(modelId);
  const units = getUnitsByModelId(modelId);

  // Última leitura por unit
  const lastSeenByUnit = useMemo(() => {
    const map = new Map();
    toolSessions.forEach(s => {
      const tCurrent = toDate(s.startTime);
      if (!tCurrent) return;
      const prev = map.get(s.toolId);
      if (!prev || tCurrent > prev.start) {
        map.set(s.toolId, { start: tCurrent, session: s });
      }
    });
    return map;
  }, [toolSessions]);

  const openByToolId = useMemo(
    () => new Set(toolSessions.filter(s => s.status === 'OPEN').map(s => s.toolId)),
    [toolSessions]
  );

  if (!model) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-primary-600 flex items-center gap-1 hover:underline">
          <ChevronLeft className="w-4 h-4" /> Equipamentos
        </button>
        <div className="text-center py-16 text-slate-500">Modelo não encontrado</div>
      </div>
    );
  }

  const stats = {
    total: units.length,
    available: units.filter(u => u.status === 'AVAILABLE' && !openByToolId.has(u.id)).length,
    inUse: units.filter(u => openByToolId.has(u.id)).length,
    inRepair: units.filter(u => u.status === 'IN_REPAIR').length,
    lost: units.filter(u => u.status === 'LOST').length,
  };

  const filtered = statusFilter === 'all'
    ? units
    : statusFilter === 'IN_USE'
      ? units.filter(u => openByToolId.has(u.id))
      : units.filter(u => u.status === statusFilter);

  const selectedUnit = filtered.find(u => u.id === selectedUnitId)
    || units.find(u => u.id === selectedUnitId);

  return (
    <div className="p-6 space-y-5" data-testid="model-drilldown">
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="text-sm text-primary-600 flex items-center gap-1 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" /> Equipamentos
      </button>

      {/* Header do modelo */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-0">
          <div className="aspect-square md:aspect-auto bg-slate-100 dark:bg-slate-700">
            {model.photoUrl ? (
              <img src={model.photoUrl} alt={model.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Wrench className="w-16 h-16 text-slate-300" />
              </div>
            )}
          </div>
          <div className="p-5">
            <p className="text-xs uppercase tracking-wide text-primary-700 dark:text-primary-300 font-semibold">
              {model.brand} · {model.category}
            </p>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {model.displayName}
            </h1>
            {model.modelCode && (
              <p className="text-sm text-slate-500 mt-1 font-mono">{model.modelCode}</p>
            )}

            {model.specs && Object.keys(model.specs).length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {Object.entries(model.specs).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-200"
                  >
                    <span className="font-medium opacity-70">{k}:</span> {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5 stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile icon={Package} label="Total" value={stats.total} tone="primary" />
        <KpiTile icon={Check} label="Disponíveis" value={stats.available} tone={stats.available > 0 ? 'emerald' : 'slate'} />
        <KpiTile icon={Activity} label="Em uso" value={stats.inUse} tone={stats.inUse > 0 ? 'emerald' : 'slate'} />
        <KpiTile icon={Wrench} label="Reparação" value={stats.inRepair} tone={stats.inRepair > 0 ? 'amber' : 'slate'} />
        <KpiTile icon={AlertTriangle} label="Perdidas" value={stats.lost} tone={stats.lost > 0 ? 'red' : 'slate'} />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 items-center">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white"
        >
          <option value="all">Todos os estados</option>
          <option value="AVAILABLE">Disponíveis</option>
          <option value="IN_USE">Em uso</option>
          <option value="IN_REPAIR">Reparação</option>
          <option value="LOST">Perdidas</option>
        </select>
        <p className="text-sm text-slate-500">{filtered.length} unidade{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Tabela de unidades */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Nº interno</th>
                <th className="text-left px-4 py-3">Serial</th>
                <th className="text-left px-4 py-3">NFC</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Obra actual</th>
                <th className="text-left px-4 py-3">Última leitura</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Sem unidades com este filtro
                  </td>
                </tr>
              ) : (
                filtered.map(unit => {
                  const last = lastSeenByUnit.get(unit.id);
                  const isOpen = openByToolId.has(unit.id);
                  return (
                    <tr
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      data-testid="unit-row"
                      className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-primary-700 dark:text-primary-300">
                        #{unit.customNumber || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {unit.serialNumber || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {unit.nfcTagId || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(isOpen ? 'IN_USE' : unit.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {last?.session?.obraName || unit.currentObraName || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {last ? formatRelative(last.start) : 'sem leitura'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedUnit && (
        <UnitDetailDrawer
          unit={selectedUnit}
          model={model}
          sessions={toolSessions}
          maintenance={toolMaintenance}
          onClose={() => setSelectedUnitId(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// FlatUnitsList — vista "Lista plana" (mantém UX antiga para quem prefere)
// ──────────────────────────────────────────────
function FlatUnitsList({ tools, models, sessions, search, categoryFilter }) {
  const modelById = useMemo(
    () => new Map(models.map(m => [m.id, m])),
    [models]
  );

  const openByToolId = useMemo(
    () => new Set(sessions.filter(s => s.status === 'OPEN').map(s => s.toolId)),
    [sessions]
  );

  const lastSeenByUnit = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      const t = toDate(s.startTime);
      if (!t) return;
      const prev = map.get(s.toolId);
      if (!prev || t > prev.start) map.set(s.toolId, { start: t, session: s });
    });
    return map;
  }, [sessions]);

  const q = search.trim().toLowerCase();
  const filtered = tools.filter(t => {
    const model = modelById.get(t.modelId);
    if (categoryFilter !== 'all' && model?.category !== categoryFilter) return false;
    if (!q) return true;
    return (t.name || '').toLowerCase().includes(q)
      || (t.customNumber || '').toLowerCase().includes(q)
      || (t.serialNumber || '').toLowerCase().includes(q)
      || (t.nfcTagId || '').toLowerCase().includes(q)
      || (model?.displayName || '').toLowerCase().includes(q)
      || (model?.brand || '').toLowerCase().includes(q);
  });

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Equipamento</th>
              <th className="text-left px-4 py-3">Nº interno</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Obra</th>
              <th className="text-left px-4 py-3">Última leitura</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">Sem unidades</td>
              </tr>
            ) : filtered.map(unit => {
              const model = modelById.get(unit.modelId);
              const last = lastSeenByUnit.get(unit.id);
              const isOpen = openByToolId.has(unit.id);
              return (
                <tr key={unit.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {model?.photoUrl ? (
                        <img src={model.photoUrl} alt="" className="w-8 h-8 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <Wrench className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                          {model?.displayName || unit.name}
                        </p>
                        {model?.brand && <p className="text-xs text-slate-500">{model.brand}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-primary-700 dark:text-primary-300">
                    #{unit.customNumber || '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(isOpen ? 'IN_USE' : unit.status)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {last?.session?.obraName || unit.currentObraName || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {last ? formatRelative(last.start) : 'sem leitura'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Modal: criar / editar equipamento (mantido)
// ──────────────────────────────────────────────
function ToolModal({ tool, onClose, onSaved }) {
  const isEdit = !!tool?.id;
  const [name, setName] = useState(tool?.name || '');
  const [type, setType] = useState(tool?.type || TOOL_TYPES[0]);
  const [nfcTagId, setNfcTagId] = useState(tool?.nfcTagId || '');
  const [storageLocation, setStorageLocation] = useState(tool?.storageLocation || 'Armazém Central');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  async function scanNfcTag() {
    if (!('NDEFReader' in window)) {
      setError('NFC não suportado neste browser (precisa de Chrome Android)');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.addEventListener('reading', ({ serialNumber, message }) => {
        let tagId = null;
        if (message?.records?.length) {
          for (const r of message.records) {
            if (r.recordType === 'text') {
              const d = new TextDecoder(r.encoding || 'utf-8');
              tagId = d.decode(r.data).trim().toUpperCase();
              break;
            }
          }
        }
        if (!tagId && serialNumber) {
          tagId = serialNumber.replace(/:/g, '').toUpperCase();
        }
        if (tagId) setNfcTagId(tagId);
        setScanning(false);
      }, { once: true });
    } catch (err) {
      setError(err.message);
      setScanning(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!name.trim() || !nfcTagId.trim()) {
      setError('Nome e tag NFC são obrigatórios');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        type,
        nfcTagId: nfcTagId.trim().toUpperCase(),
        storageLocation: storageLocation.trim(),
        updatedAt: serverTimestamp(),
      };
      if (isEdit) {
        await updateDoc(doc(db, TOOLS_PATH, tool.id), data);
      } else {
        await addDoc(collection(db, TOOLS_PATH), {
          ...data,
          currentObraId: null,
          currentObraName: null,
          createdAt: serverTimestamp(),
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <form onSubmit={save} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">
            {isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Martelo Pneumático #3"
              required
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Tag NFC</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={nfcTagId}
                onChange={(e) => setNfcTagId(e.target.value.toUpperCase())}
                placeholder="MARTELO_003"
                required
                className="flex-1 px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={scanNfcTag}
                disabled={scanning}
                className="px-3 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Nfc className="w-4 h-4" />
                {scanning ? 'A ler...' : 'Scan'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Armazém (origem SAP)</label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'A guardar...' : (isEdit ? 'Guardar' : 'Criar')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────
// View principal
// ──────────────────────────────────────────────
export default function EquipamentosView() {
  const {
    equipmentModels, tools, toolSessions, toolAlerts = [],
    getModelStats,
  } = useStore();

  const [view, setView] = useState('grouped'); // 'grouped' | 'flat'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [editing, setEditing] = useState(null);

  const modelStats = useMemo(
    () => getModelStats(),
    [equipmentModels, tools, toolSessions, getModelStats]
  );

  const filteredStats = useMemo(() => {
    let list = modelStats;
    if (categoryFilter !== 'all') list = list.filter(s => s.model.category === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        (s.model.displayName || '').toLowerCase().includes(q) ||
        (s.model.brand || '').toLowerCase().includes(q) ||
        (s.model.modelCode || '').toLowerCase().includes(q) ||
        (s.model.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [modelStats, search, categoryFilter]);

  const categories = useMemo(
    () => [...new Set(equipmentModels.map(m => m.category).filter(Boolean))].sort(),
    [equipmentModels]
  );

  const globalStats = useMemo(() => {
    const openSessions = toolSessions.filter(s => s.status === 'OPEN');
    const totalInUse = openSessions.length;
    const lastByTool = new Map();
    toolSessions.forEach(s => {
      const t = toDate(s.startTime);
      if (!t) return;
      const prev = lastByTool.get(s.toolId);
      if (!prev || t > prev) lastByTool.set(s.toolId, t);
    });
    const stale = tools.filter(t => {
      const last = lastByTool.get(t.id);
      if (!last) return true;
      return (Date.now() - last.getTime()) > STALE_READ_DAYS * 86400000;
    }).length;
    const openAlertCount = toolAlerts.filter(a => a.status === 'OPEN' || a.status === 'IN_REVIEW').length;

    return {
      totalUnits: tools.length,
      inUse: totalInUse,
      stale,
      openAlerts: openAlertCount,
      totalModels: equipmentModels.length,
    };
  }, [tools, toolSessions, toolAlerts, equipmentModels]);

  // Drilldown
  if (selectedModelId) {
    return (
      <ModelDrilldownView
        modelId={selectedModelId}
        onBack={() => setSelectedModelId(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-5" data-testid="equipamentos-view">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Equipamentos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Inventário agrupado por modelo · {globalStats.totalModels} modelos · {globalStats.totalUnits} unidades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
            <button
              onClick={() => setView('grouped')}
              data-testid="view-grouped"
              className={view === 'grouped'
                ? 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                : 'px-3 py-1.5 text-slate-500'}
            >
              Por modelo
            </button>
            <button
              onClick={() => setView('flat')}
              data-testid="view-flat"
              className={view === 'flat'
                ? 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                : 'px-3 py-1.5 text-slate-500'}
            >
              Lista plana
            </button>
          </div>
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          icon={Wrench}
          label="Total Equipamentos"
          value={globalStats.totalUnits}
          sub={`${globalStats.totalModels} modelos`}
          tone="primary"
        />
        <KpiTile
          icon={Activity}
          label="Em Uso Agora"
          value={globalStats.inUse}
          sub={globalStats.totalUnits > 0
            ? `${Math.round((globalStats.inUse / globalStats.totalUnits) * 100)}%`
            : ''}
          tone={globalStats.inUse > 0 ? 'emerald' : 'slate'}
        />
        <KpiTile
          icon={Clock}
          label="Sem Leitura >7d"
          value={globalStats.stale}
          tone={globalStats.stale > 0 ? 'amber' : 'slate'}
        />
        <KpiTile
          icon={AlertTriangle}
          label="Avarias Abertas"
          value={globalStats.openAlerts}
          tone={globalStats.openAlerts > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar marca, modelo, código..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white"
        >
          <option value="all">Todas as categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Vista */}
      {view === 'grouped' ? (
        filteredStats.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{equipmentModels.length === 0 ? 'Sem modelos. Aguarda seed.' : 'Sem modelos com estes filtros'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStats.map(stat => (
              <ModelCard
                key={stat.model.id}
                stat={stat}
                onClick={() => setSelectedModelId(stat.model.id)}
              />
            ))}
          </div>
        )
      ) : (
        <FlatUnitsList
          tools={tools}
          models={equipmentModels}
          sessions={toolSessions}
          search={search}
          categoryFilter={categoryFilter}
        />
      )}

      {editing !== null && (
        <ToolModal
          tool={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
