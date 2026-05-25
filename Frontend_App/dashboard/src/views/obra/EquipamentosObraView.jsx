import React, { useState, useMemo } from 'react';
import {
  Truck, Wrench, Clock, Search, X, ChevronRight,
  Leaf, Euro, Activity, Calendar, User, AlertTriangle,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { calculateRAGStatus } from '../../utils/chartDataHelpers';
import { MAINTENANCE_ALERT_PCT, MAINTENANCE_OVERDUE_PCT } from '../../utils/sessionHelpers';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Normalise status values (Procore syncs IDLE/ACTIVE uppercase; PWA uses ativo/inativo)
function normalizeStatus(raw) {
  if (!raw) return 'inativo';
  switch (raw.toLowerCase()) {
    case 'ativo':
    case 'active':
    case 'activo':   return 'ativo';
    case 'manutencao':
    case 'maintenance':
    case 'em manutencao': return 'manutencao';
    case 'transit':
    case 'transito': return 'transit';
    default:         return 'inativo'; // idle, IDLE, inativo, unknown
  }
}

const STATUS_LABEL = {
  ativo:      'Activo',
  inativo:    'Inactivo',
  manutencao: 'Manutenção',
  transit:    'Trânsito',
};

const STATUS_COLOR = {
  ativo:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inativo:    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  manutencao: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  transit:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const RAG_BAR = { green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500' };
const RAG_TEXT = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
};

const FILTER_OPTIONS = [
  { value: 'all',       label: 'Todos' },
  { value: 'ativo',     label: 'Activos' },
  { value: 'inativo',   label: 'Inactivos' },
  { value: 'manutencao',label: 'Manutenção' },
  { value: 'alert',     label: 'Alerta' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getMaintenanceRag(partialHours, threshold) {
  if (!threshold || threshold <= 0) return null;
  const pct = (partialHours || 0) / threshold;
  if (pct >= MAINTENANCE_OVERDUE_PCT) return 'red';
  if (pct >= MAINTENANCE_ALERT_PCT)   return 'amber';
  return 'green';
}

function periodDaysFromRange(dateRange) {
  if (!dateRange?.start || !dateRange?.end) return 30;
  return Math.max(1, Math.ceil((dateRange.end - dateRange.start) / 86400000) + 1);
}

function formatTs(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

// ─── UTILIZATION BAR ─────────────────────────────────────────────────────────

const UtilizationBar = ({ hours, availableHours, compact }) => {
  const pct = availableHours > 0 ? Math.min(100, Math.round((hours / availableHours) * 100)) : 0;
  const rag = calculateRAGStatus(pct, { green: 50, amber: 20 });

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-1" style={{ minWidth: 48 }}>
          <div className={`h-full rounded-full ${RAG_BAR[rag]}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-medium tabular-nums shrink-0 ${RAG_TEXT[rag]}`}>{pct}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Utilização</span>
        <span className={`font-medium ${RAG_TEXT[rag]}`}>{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${RAG_BAR[rag]}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400">{hours.toFixed(1)}h / {availableHours}h disponíveis</p>
    </div>
  );
};

// ─── MAINTENANCE CHIP / BAR ───────────────────────────────────────────────────

const MaintenanceBar = ({ partialHours, threshold, compact }) => {
  const rag = getMaintenanceRag(partialHours, threshold);
  if (!rag) return null;

  const pct = Math.min(100, Math.round(((partialHours || 0) / threshold) * 100));
  const remaining = Math.max(0, threshold - (partialHours || 0));

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${RAG_TEXT[rag]}`}>
        <Wrench className="w-3 h-3 shrink-0" />
        <span>{Math.round(partialHours || 0)}h / {threshold}h</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Manutenção</span>
        <span className={`font-medium ${RAG_TEXT[rag]}`}>{pct}% usado</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${RAG_BAR[rag]}`} style={{ width: `${pct}%` }} />
      </div>
      {rag !== 'green' && (
        <p className={`text-xs ${RAG_TEXT[rag]}`}>
          {rag === 'red' ? 'Manutenção necessária' : `${Math.round(remaining)}h até manutenção`}
        </p>
      )}
    </div>
  );
};

// ─── FLEET HEADER ─────────────────────────────────────────────────────────────

const FleetHeader = ({ machines, machineStatsList }) => {
  const total      = machines.length;
  const active     = machines.filter(m => normalizeStatus(m.status) === 'ativo').length;
  const inMaint    = machines.filter(m => normalizeStatus(m.status) === 'manutencao').length;
  const overdue    = machines.filter(m => getMaintenanceRag(m.partialHours, m.maintenanceThreshold) === 'red').length;
  const totalHours = machineStatsList.reduce((s, ms) => s + ms.hours, 0);

  const maintColor = inMaint > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400';
  const maintBg    = inMaint > 0 ? 'bg-red-50 dark:bg-red-900/20'   : 'bg-slate-100 dark:bg-slate-700';

  const tiles = [
    { label: 'Total frota',      value: total,   icon: Truck,    color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { label: 'Activas',          value: active,  icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Em manutenção',    value: inMaint, icon: Wrench,   color: maintColor,                               bg: maintBg,
      description: overdue > 0 ? `${overdue} com intervenção vencida` : null },
    { label: 'Horas no período', value: `${totalHours.toFixed(1)}h`, icon: Clock, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 md:p-5">
      {tiles.map(({ label, value, icon: Icon, color, bg, description }) => (
        <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-lg leading-tight ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 truncate">{label}</p>
            {description && <p className="text-xs text-red-500 dark:text-red-400 truncate mt-0.5">{description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── MACHINE ROW (desktop table) ──────────────────────────────────────────────

const MachineRow = ({ ms, availableHours, onClick }) => (
  <tr
    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <td className="px-4 py-3">
      <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{ms.machine.name}</p>
      <p className="text-xs text-slate-400">{ms.machine.type || ms.machine.category || '—'}</p>
    </td>
    <td className="px-4 py-3">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[normalizeStatus(ms.machine.status)]}`}>
        {STATUS_LABEL[normalizeStatus(ms.machine.status)]}
      </span>
    </td>
    <td className="px-4 py-3 w-44">
      <UtilizationBar hours={ms.hours} availableHours={availableHours} compact />
    </td>
    <td className="px-4 py-3 text-sm tabular-nums text-slate-700 dark:text-slate-200">
      {ms.hours.toFixed(1)}h
    </td>
    <td className="px-4 py-3">
      <MaintenanceBar partialHours={ms.machine.partialHours} threshold={ms.machine.maintenanceThreshold} compact />
    </td>
    <td className="px-4 py-3 text-xs text-right text-slate-400 tabular-nums">{ms.sessions}</td>
    <td className="px-4 py-3 text-right">
      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
    </td>
  </tr>
);

// ─── MACHINE CARD (mobile) ────────────────────────────────────────────────────

const MachineListCard = ({ ms, availableHours, onClick }) => (
  <div
    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
    onClick={onClick}
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">{ms.machine.name}</p>
        <p className="text-xs text-slate-400">{ms.machine.type || ms.machine.category || '—'}</p>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[normalizeStatus(ms.machine.status)]}`}>
          {STATUS_LABEL[normalizeStatus(ms.machine.status)]}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </div>

    <div className="space-y-2">
      <UtilizationBar hours={ms.hours} availableHours={availableHours} />
      <MaintenanceBar partialHours={ms.machine.partialHours} threshold={ms.machine.maintenanceThreshold} compact />
    </div>

    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ms.hours.toFixed(1)}h</span>
      <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{ms.sessions} sessões</span>
      {ms.cost > 0 && <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{Math.round(ms.cost)}€</span>}
    </div>
  </div>
);

// ─── MACHINE DRAWER ───────────────────────────────────────────────────────────

const MachineDrawer = ({ machine, ms, obraSessions, operators, onClose }) => {
  const getOperatorName = (opId) => {
    if (!opId) return '—';
    const op = operators.find(o => o.cardId === opId || o.id === opId);
    return op?.name || opId.slice(0, 10);
  };

  const recentSessions = useMemo(() =>
    obraSessions
      .filter(s => s.machineId === machine.id)
      .sort((a, b) => {
        const da = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime || 0);
        const db = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || 0);
        return db - da;
      })
      .slice(0, 5),
    [machine.id, obraSessions]
  );

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
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="font-semibold text-slate-900 dark:text-white">{machine.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[normalizeStatus(machine.status)]}`}>
                {STATUS_LABEL[normalizeStatus(machine.status)]}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{machine.type || machine.category || '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ml-2 shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
            {[
              { value: `${ms.hours.toFixed(1)}h`, label: 'horas', icon: Clock },
              { value: `${Math.round(ms.cost)}€`,  label: 'custo',  icon: Euro },
              { value: `${Math.round(ms.co2)} kg`, label: 'CO₂',   icon: Leaf },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="bg-white dark:bg-slate-800 py-3 text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                  <Icon className="w-3 h-3" />{label}
                </p>
              </div>
            ))}
          </div>

          {/* Maintenance */}
          {getMaintenanceRag(machine.partialHours, machine.maintenanceThreshold) && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <MaintenanceBar partialHours={machine.partialHours} threshold={machine.maintenanceThreshold} />
            </div>
          )}

          {/* Sessions */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Sessões no período
              </h3>
              <span className="text-xs text-slate-400">{ms.sessions} total</span>
            </div>

            {recentSessions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sem sessões no período</p>
            ) : (
              <div className="space-y-0 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                {recentSessions.map((s, i) => (
                  <div
                    key={s.id || i}
                    className="flex items-center justify-between px-3 py-2.5 text-sm border-b border-slate-100 dark:border-slate-700 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-400 shrink-0 tabular-nums">{formatTs(s.startTime)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {s.status === 'OPEN' ? '● Em curso' : 'Fechada'}
                      </span>
                      <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <User className="w-3 h-3 shrink-0" />
                        {getOperatorName(s.operatorId)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums shrink-0 ml-2">
                      {s.status === 'OPEN' ? '—' : `${(s.durationHours || 0).toFixed(1)}h`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Heatmap stub — adiado */}
            <button
              disabled
              title="Em breve"
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl cursor-not-allowed"
            >
              <Calendar className="w-4 h-4" />
              Heatmap de actividade — Em breve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN VIEW ────────────────────────────────────────────────────────────────

const EquipamentosObraView = ({ obraId, dateRange, obraMachines }) => {
  const { getSessionsByObraId, sessions, machines, systemSettings, operators } = useStore();

  const [selectedMachine, setSelectedMachine] = useState(null);
  const [filterStatus, setFilterStatus]       = useState('all');
  const [search, setSearch]                   = useState('');

  const obraSessions = useMemo(
    () => getSessionsByObraId(obraId, dateRange),
    [obraId, dateRange, sessions, machines]
  );

  const machineStatsList = useMemo(() => {
    const co2Factor = systemSettings?.co2FactorPerLitre || 2.68;
    return obraMachines.map(m => {
      const ms      = obraSessions.filter(s => s.machineId === m.id);
      const closed  = ms.filter(s => s.status === 'CLOSED');
      const hours   = closed.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const cost    = closed.reduce((sum, s) => sum + (s.costs?.total || 0), 0);
      const co2     = (m.consumptionRate || 0) * hours * co2Factor;
      return {
        machine:  m,
        hours:    Math.round(hours * 10) / 10,
        cost:     Math.round(cost),
        co2:      Math.round(co2),
        sessions: ms.length,
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [obraMachines, obraSessions, systemSettings]);

  const availableHours = useMemo(() => periodDaysFromRange(dateRange) * 8, [dateRange]);

  const filtered = useMemo(() => {
    let list = machineStatsList;
    if (filterStatus === 'alert') {
      list = list.filter(ms => getMaintenanceRag(ms.machine.partialHours, ms.machine.maintenanceThreshold) === 'red');
    } else if (filterStatus !== 'all') {
      list = list.filter(ms => normalizeStatus(ms.machine.status) === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(ms =>
        ms.machine.name?.toLowerCase().includes(q) ||
        ms.machine.type?.toLowerCase().includes(q) ||
        ms.machine.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [machineStatsList, filterStatus, search]);

  const selectedMs = useMemo(
    () => machineStatsList.find(ms => ms.machine.id === selectedMachine?.id) || null,
    [selectedMachine, machineStatsList]
  );

  if (obraMachines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Truck className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-slate-500">Sem máquinas nesta obra</p>
        <p className="text-sm mt-1">Atribui máquinas à obra para ver dados aqui</p>
      </div>
    );
  }

  return (
    <div>
      <FleetHeader machines={obraMachines} machineStatsList={machineStatsList} />

      {/* Filter bar */}
      <div className="px-4 md:px-5 pb-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar máquina…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
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
              {opt.value === 'alert' && machineStatsList.filter(ms => getMaintenanceRag(ms.machine.partialHours, ms.machine.maintenanceThreshold) === 'red').length > 0 && (
                <span className="ml-1 px-1 rounded bg-red-500 text-white text-[10px]">
                  {machineStatsList.filter(ms => getMaintenanceRag(ms.machine.partialHours, ms.machine.maintenanceThreshold) === 'red').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Machine list */}
      <div className="px-4 md:px-5 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            Sem máquinas com os filtros actuais
          </div>
        ) : (
          <>
            {/* Table — lg+ */}
            <div className="hidden lg:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Máquina', 'Estado', 'Utilização', 'Horas', 'Manutenção', 'Sessões', ''].map((h, i) => (
                      <th key={i} className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i >= 5 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map(ms => (
                    <MachineRow
                      key={ms.machine.id}
                      ms={ms}
                      availableHours={availableHours}
                      onClick={() => setSelectedMachine(ms.machine)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — < lg */}
            <div className="lg:hidden space-y-3">
              {filtered.map(ms => (
                <MachineListCard
                  key={ms.machine.id}
                  ms={ms}
                  availableHours={availableHours}
                  onClick={() => setSelectedMachine(ms.machine)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      {selectedMachine && selectedMs && (
        <MachineDrawer
          machine={selectedMachine}
          ms={selectedMs}
          obraSessions={obraSessions}
          operators={operators}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </div>
  );
};

export default EquipamentosObraView;
