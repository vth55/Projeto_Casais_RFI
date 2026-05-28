import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Search,
  User,
  Wrench,
  X,
} from 'lucide-react';
import useStore from '../../store/useStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_OVERDUE_DAYS = 7;

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'in_use', label: 'Em uso' },
  { value: 'returned', label: 'Devolvidas' },
  { value: 'overdue', label: 'Atrasadas' },
];

const TOOL_STATE_LABEL = {
  available: 'Disponivel',
  in_use: 'Em uso',
  returned: 'Devolvida',
  overdue: 'Atrasada',
};

const TOOL_STATE_COLOR = {
  available: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  in_use: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  returned: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function resolveTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function formatDate(value) {
  const date = resolveTimestamp(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function formatDateTime(value) {
  const date = resolveTimestamp(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isOverdueSession(session, thresholdDays) {
  if (session?.status !== 'OPEN') return false;
  const start = resolveTimestamp(session.startTime);
  return !!start && (Date.now() - start.getTime()) >= thresholdDays * DAY_MS;
}

function getToolState(stats) {
  if (stats.overdueCount > 0) return 'overdue';
  if (stats.openCount > 0) return 'in_use';
  if (stats.closedCount > 0) return 'returned';
  return 'available';
}

function getInventoryLabel(tool) {
  return tool.assetTag
    || tool.inventoryCode
    || tool.nfcTagId
    || tool.serialNumber
    || tool.code
    || tool.id;
}

function getToolSubtitle(tool) {
  return tool.type || tool.category || tool.brand || '—';
}

function getOperatorName(operators, session) {
  if (session?.operatorName) return session.operatorName;
  if (!session?.operatorId) return '—';
  const operator = (operators || []).find(
    (item) => item.cardId === session.operatorId || item.id === session.operatorId,
  );
  return operator?.name || session.operatorId.slice(0, 10);
}

const InventoryHeader = ({ summary }) => {
  const tiles = [
    {
      label: 'Total',
      value: summary.totalTools,
      icon: Wrench,
      color: 'text-primary-600 dark:text-primary-400',
      bg: 'bg-primary-50 dark:bg-primary-900/20',
    },
    {
      label: 'Em uso agora',
      value: summary.openSessions,
      icon: Activity,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Devolvidas',
      value: summary.closedSessions,
      icon: CheckCircle2,
      color: 'text-primary-600 dark:text-primary-400',
      bg: 'bg-primary-50 dark:bg-primary-900/20',
    },
    {
      label: 'Atrasadas',
      value: summary.overdueSessions,
      icon: AlertTriangle,
      color: summary.overdueSessions > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400',
      bg: summary.overdueSessions > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 md:p-5">
      {tiles.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex items-center gap-3"
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

const ToolRow = ({ stats, operators, onClick }) => {
  const state = getToolState(stats);
  const lastOperator = stats.latestSession ? getOperatorName(operators, stats.latestSession) : '—';

  return (
    <tr
      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{stats.tool.name}</p>
        <p className="text-xs text-slate-400">{getToolSubtitle(stats.tool)}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TOOL_STATE_COLOR[state]}`}>
          {TOOL_STATE_LABEL[state]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
        <span className="font-medium">Checkouts (período):</span> {stats.checkouts}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {formatDate(stats.latestSession?.startTime)}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {formatDate(stats.latestReturn?.endTime)}
      </td>
      <td className="px-4 py-3 text-sm text-right text-slate-500 dark:text-slate-300 truncate max-w-32">
        {lastOperator}
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
      </td>
    </tr>
  );
};

const ToolListCard = ({ stats, operators, onClick }) => {
  const state = getToolState(stats);
  const lastOperator = stats.latestSession ? getOperatorName(operators, stats.latestSession) : '—';

  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">{stats.tool.name}</p>
          <p className="text-xs text-slate-400 truncate">{getToolSubtitle(stats.tool)}</p>
          <p className="text-xs text-slate-400 truncate mt-1">Inventário: {getInventoryLabel(stats.tool)}</p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TOOL_STATE_COLOR[state]}`}>
            {TOOL_STATE_LABEL[state]}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p><span className="font-medium">Checkouts (período):</span> {stats.checkouts}</p>
        <p><span className="font-medium">Último checkout:</span> {formatDateTime(stats.latestSession?.startTime)}</p>
        <p><span className="font-medium">Última devolução:</span> {formatDateTime(stats.latestReturn?.endTime)}</p>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
        <span className="flex items-center gap-1 min-w-0 truncate">
          <User className="w-3 h-3 shrink-0" />
          {lastOperator}
        </span>
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {stats.openCount} em uso
        </span>
      </div>
    </div>
  );
};

const ToolDrawer = ({ stats, operators, overdueDays, onClose }) => {
  const state = getToolState(stats);

  const recentHistory = useMemo(
    () => [...stats.sessions]
      .sort((a, b) => {
        const left = resolveTimestamp(a.startTime)?.getTime() || 0;
        const right = resolveTimestamp(b.startTime)?.getTime() || 0;
        return right - left;
      })
      .slice(0, 10),
    [stats.sessions],
  );

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="font-semibold text-slate-900 dark:text-white truncate">{stats.tool.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TOOL_STATE_COLOR[state]}`}>
                {TOOL_STATE_LABEL[state]}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{getToolSubtitle(stats.tool)}</p>
            <p className="text-xs text-slate-400 mt-1">Inventário: {getInventoryLabel(stats.tool)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ml-2 shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-px bg-slate-200 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
          {[
            { value: stats.checkouts, label: 'checkouts', icon: Activity },
            { value: stats.openCount, label: 'em uso', icon: Clock },
            { value: stats.closedCount, label: 'devolvidas', icon: CheckCircle2 },
            { value: stats.overdueCount, label: 'overdue', icon: AlertTriangle },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="bg-white dark:bg-slate-800 py-3 text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Icon className="w-3 h-3" />
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Histórico de checkouts
            </h3>
            <span className="text-xs text-slate-400">Últimos 10</span>
          </div>

          {recentHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sem checkouts no período</p>
          ) : (
            <div className="space-y-0 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
              {recentHistory.map((session, index) => {
                const overdue = isOverdueSession(session, overdueDays);
                const badgeClass = overdue
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : session.status === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300';

                const badgeLabel = overdue
                  ? 'Atrasada'
                  : session.status === 'OPEN'
                    ? 'Em uso'
                    : 'Devolvida';

                return (
                  <div
                    key={session.id || `${stats.tool.id}-${index}`}
                    className="px-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400 tabular-nums">
                            {formatDateTime(session.startTime)}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          {getOperatorName(operators, session)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">Devolução</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                          {session.status === 'OPEN' ? 'Em aberto' : formatDateTime(session.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EquipamentosObraView = ({ obraId, dateRange, obraMachines: _obraMachines }) => {
  const {
    getToolsByObraId,
    getToolSessionsByObraId,
    tools,
    toolSessions,
    operators,
    systemSettings,
  } = useStore();

  const [selectedTool, setSelectedTool] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const overdueDays = systemSettings?.toolOverdueDays ?? DEFAULT_OVERDUE_DAYS;

  const obraTools = useMemo(
    () => getToolsByObraId(obraId),
    [getToolsByObraId, obraId, tools],
  );

  const obraSessions = useMemo(
    () => getToolSessionsByObraId(obraId, dateRange),
    [getToolSessionsByObraId, obraId, dateRange, toolSessions, tools],
  );

  const toolStatsList = useMemo(
    () => obraTools
      .map((tool) => {
        const sessions = obraSessions.filter((session) => session.toolId === tool.id);
        const openSessions = sessions.filter((session) => session.status === 'OPEN');
        const closedSessions = sessions.filter((session) => session.status === 'CLOSED');
        const overdueSessions = openSessions.filter((session) => isOverdueSession(session, overdueDays));
        const latestSession = [...sessions].sort((a, b) => {
          const left = resolveTimestamp(a.startTime)?.getTime() || 0;
          const right = resolveTimestamp(b.startTime)?.getTime() || 0;
          return right - left;
        })[0] || null;
        const latestReturn = [...closedSessions].sort((a, b) => {
          const left = resolveTimestamp(a.endTime)?.getTime() || 0;
          const right = resolveTimestamp(b.endTime)?.getTime() || 0;
          return right - left;
        })[0] || null;

        return {
          tool,
          sessions,
          checkouts: sessions.length,
          openCount: openSessions.length,
          closedCount: closedSessions.length,
          overdueCount: overdueSessions.length,
          latestSession,
          latestReturn,
        };
      })
      .sort((a, b) => {
        if (b.checkouts !== a.checkouts) return b.checkouts - a.checkouts;
        const left = resolveTimestamp(a.latestSession?.startTime)?.getTime() || 0;
        const right = resolveTimestamp(b.latestSession?.startTime)?.getTime() || 0;
        return right - left;
      }),
    [obraTools, obraSessions, overdueDays],
  );

  const summary = useMemo(() => ({
    totalTools: obraTools.length,
    openSessions: obraSessions.filter((session) => session.status === 'OPEN').length,
    closedSessions: obraSessions.filter((session) => session.status === 'CLOSED').length,
    overdueSessions: obraSessions.filter((session) => isOverdueSession(session, overdueDays)).length,
  }), [obraTools.length, obraSessions, overdueDays]);

  const filtered = useMemo(() => {
    let list = toolStatsList;

    if (filterStatus === 'in_use') {
      list = list.filter((stats) => stats.openCount > 0);
    } else if (filterStatus === 'returned') {
      list = list.filter((stats) => stats.closedCount > 0);
    } else if (filterStatus === 'overdue') {
      list = list.filter((stats) => stats.overdueCount > 0);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((stats) => {
        const haystack = [
          stats.tool.name,
          getToolSubtitle(stats.tool),
          getInventoryLabel(stats.tool),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return list;
  }, [filterStatus, search, toolStatsList]);

  const selectedStats = useMemo(
    () => toolStatsList.find((stats) => stats.tool.id === selectedTool?.id) || null,
    [selectedTool, toolStatsList],
  );

  if (obraTools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Wrench className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-slate-500">Sem equipamentos nesta obra</p>
        <p className="text-sm mt-1">Atribui equipamentos à obra para ver dados aqui</p>
      </div>
    );
  }

  return (
    <div>
      <InventoryHeader summary={summary} />

      <div className="px-4 md:px-5 pb-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar equipamento…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilterStatus(option.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filterStatus === option.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-5 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            Sem equipamentos com os filtros atuais
          </div>
        ) : (
          <>
            <div className="hidden lg:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Equipamento', 'Estado', 'Uso', 'Último checkout', 'Última devolução', 'Operador', ''].map((header, index) => (
                      <th
                        key={header}
                        className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide ${
                          index >= 5 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map((stats) => (
                    <ToolRow
                      key={stats.tool.id}
                      stats={stats}
                      operators={operators}
                      onClick={() => setSelectedTool(stats.tool)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-3">
              {filtered.map((stats) => (
                <ToolListCard
                  key={stats.tool.id}
                  stats={stats}
                  operators={operators}
                  onClick={() => setSelectedTool(stats.tool)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedTool && selectedStats && (
        <ToolDrawer
          stats={selectedStats}
          operators={operators}
          overdueDays={overdueDays}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  );
};

export default EquipamentosObraView;
