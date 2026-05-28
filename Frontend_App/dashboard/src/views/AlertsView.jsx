import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, Search, ChevronRight, Clock,
  AlertOctagon, MapPin, User, Wrench, CheckCircle,
} from 'lucide-react';
import useStore from '../store/useStore';
import AlertDetailDrawer from '../components/AlertDetailDrawer';

// NOTE: classes Tailwind para anomaly icon/label têm de ser literais — o JIT do
// Tailwind não consegue inferir classes geradas dinamicamente.
const ANOMALY_META = {
  TOOL_OVERDUE:       { label: 'Devolução atrasada', icon: Clock,        iconCls: 'text-amber-600', labelCls: 'text-amber-700' },
  TOOL_PRESUMED_LOST: { label: 'Presumida perdida',  icon: AlertOctagon, iconCls: 'text-red-600',   labelCls: 'text-red-700'   },
  NO_LOCATION:        { label: 'Sem localização',    icon: MapPin,       iconCls: 'text-slate-600', labelCls: 'text-slate-700' },
  NO_OPERATOR:        { label: 'Sem operador',       icon: User,         iconCls: 'text-slate-600', labelCls: 'text-slate-700' },
  DAMAGED:            { label: 'Avaria reportada',   icon: Wrench,       iconCls: 'text-red-600',   labelCls: 'text-red-700'   },
};

const STATUS_META = {
  OPEN:      { label: 'Aberta',     badge: 'bg-red-50 text-red-700' },
  IN_REVIEW: { label: 'Em revisão', badge: 'bg-amber-50 text-amber-700' },
  RESOLVED:  { label: 'Resolvida',  badge: 'bg-emerald-50 text-emerald-700' },
};

function formatRelative(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `há ${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `há ${hours}h`;
  const min = Math.floor(diff / 60000);
  return min >= 1 ? `há ${min}min` : 'agora';
}

export default function AlertsView() {
  const { toolAlerts, tools, equipmentModels, obras } = useStore();
  const [filter, setFilter] = useState('open'); // 'open' | 'all' | 'resolved'
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  // Enrich alerts com tool + model + obra
  const enriched = useMemo(() => {
    const toolById = new Map(tools.map(t => [t.id, t]));
    const modelById = new Map(equipmentModels.map(m => [m.id, m]));
    const obraById = new Map(obras.map(o => [o.id, o]));
    return toolAlerts.map(a => {
      const tool = toolById.get(a.toolId);
      const model = tool ? modelById.get(tool.modelId) : null;
      const obra = tool?.currentObraId ? obraById.get(tool.currentObraId) : null;
      return {
        ...a,
        tool,
        model,
        obraName: obra?.name || tool?.currentObraName || '—',
        displayName: model?.displayName || tool?.name || a.toolId,
        photoUrl: model?.photoUrl || null,
        brand: model?.brand || null,
        customNumber: tool?.customNumber || null,
      };
    });
  }, [toolAlerts, tools, equipmentModels, obras]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter === 'open') list = list.filter(a => a.status === 'OPEN' || a.status === 'IN_REVIEW');
    if (filter === 'resolved') list = list.filter(a => a.status === 'RESOLVED');
    if (typeFilter !== 'all') list = list.filter(a => a.anomalyType === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        (a.displayName || '').toLowerCase().includes(q) ||
        (a.obraName || '').toLowerCase().includes(q) ||
        (a.customNumber || '').toLowerCase().includes(q)
      );
    }
    return list.slice().sort((a, b) => {
      const tA = a.createdAt?.toDate?.() ?? new Date(0);
      const tB = b.createdAt?.toDate?.() ?? new Date(0);
      return tB - tA;
    });
  }, [enriched, filter, typeFilter, search]);

  // Stats
  const stats = useMemo(() => ({
    open: enriched.filter(a => a.status === 'OPEN').length,
    inReview: enriched.filter(a => a.status === 'IN_REVIEW').length,
    resolved: enriched.filter(a => a.status === 'RESOLVED').length,
    total: enriched.length,
  }), [enriched]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alertas</h1>
            <p className="text-sm text-slate-500">Anomalias detectadas — gestão operacional</p>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={AlertOctagon} label="Abertas" value={stats.open} tone={stats.open > 0 ? 'red' : 'slate'} />
        <StatTile icon={Clock} label="Em revisão" value={stats.inReview} tone={stats.inReview > 0 ? 'amber' : 'slate'} />
        <StatTile icon={CheckCircle} label="Resolvidas" value={stats.resolved} tone="emerald" />
        <StatTile icon={AlertTriangle} label="Total" value={stats.total} tone="primary" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar equipamento, obra..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { v: 'open', l: 'Abertas' },
            { v: 'all', l: 'Todas' },
            { v: 'resolved', l: 'Resolvidas' },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                filter === opt.v
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-400'
              }`}
            >{opt.l}</button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white"
        >
          <option value="all">Todos os tipos</option>
          {Object.entries(ANOMALY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Lista de alertas */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
          <p className="font-medium">Sem alertas — tudo em ordem</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => (
            <AlertRow key={alert.id} alert={alert} onClick={() => setSelectedAlertId(alert.id)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      {selectedAlertId && (
        <AlertDetailDrawer
          alertId={selectedAlertId}
          onClose={() => setSelectedAlertId(null)}
        />
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }) {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber:   'bg-amber-50 text-amber-700',
    red:     'bg-red-50 text-red-700',
    slate:   'bg-slate-100 text-slate-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function AlertRow({ alert, onClick }) {
  const anomaly = ANOMALY_META[alert.anomalyType] || {
    label: alert.anomalyType,
    icon: AlertTriangle,
    iconCls: 'text-slate-600',
    labelCls: 'text-slate-700',
  };
  const status = STATUS_META[alert.status] || STATUS_META.OPEN;
  const Icon = anomaly.icon;
  return (
    <button
      onClick={onClick}
      data-testid="alert-row"
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-primary-400 hover:shadow-sm transition-all flex items-center gap-4"
    >
      {/* Foto/icon */}
      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
        {alert.photoUrl ? (
          <img src={alert.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Wrench className="w-6 h-6 text-slate-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${anomaly.iconCls}`} />
          <span className={`text-xs font-semibold ${anomaly.labelCls}`}>{anomaly.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.badge}`}>{status.label}</span>
        </div>
        <p className="font-semibold text-slate-900 truncate">
          {alert.brand && <span className="text-slate-500">{alert.brand} · </span>}
          {alert.displayName}
          {alert.customNumber && <span className="text-slate-500"> · {alert.customNumber}</span>}
        </p>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.obraName}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(alert.createdAt)}</span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
    </button>
  );
}
