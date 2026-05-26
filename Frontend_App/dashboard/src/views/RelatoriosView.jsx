import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Download, PackageSearch, UserCheck, Wrench } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, Button, Badge } from '../components/ui';
import { getDateRangeFromPreset } from '../utils/chartDataHelpers';
import { detectToolSessionAnomalies, resolveTimestamp } from '../utils/sessionHelpers';

const DAY_MS = 24 * 60 * 60 * 1000;

const reportTypes = [
  {
    id: 'inventory',
    name: 'Inventário por obra',
    description: 'Ferramentas atribuídas a cada obra, com estado e último checkout conhecido.',
    icon: PackageSearch,
    filename: 'inventario_ferramentas_por_obra',
  },
  {
    id: 'sessions',
    name: 'Checkouts/Devoluções (período)',
    description: 'Todas as sessões de ferramentas dentro do período global selecionado.',
    icon: Calendar,
    filename: 'checkouts_devolucoes_ferramentas',
  },
  {
    id: 'overdue',
    name: 'Overdue & Perdidas',
    description: 'Sessões atrasadas, presumidas perdidas e ferramentas marcadas como perdidas.',
    icon: AlertTriangle,
    filename: 'ferramentas_overdue_perdidas',
  },
  {
    id: 'operators',
    name: 'Por operador',
    description: 'Atividade por operador: checkouts, ferramentas distintas e sessões abertas.',
    icon: UserCheck,
  },
];

const toValidDate = (value) => {
  const date = resolveTimestamp(value);
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getSessionStart = (session) => toValidDate(session?.startTime);
const getSessionEnd = (session) => toValidDate(session?.endTime);

const getSessionDurationHours = (session) => {
  if (typeof session?.durationHours === 'number') return session.durationHours;

  const start = getSessionStart(session);
  if (!start) return 0;

  const end = getSessionEnd(session) || new Date();
  return Math.max(0, (end.getTime() - start.getTime()) / 3600000);
};

const getDaysOpen = (session) => {
  const start = getSessionStart(session);
  if (!start) return '';
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / DAY_MS));
};

const formatDateTime = (date) =>
  date ? date.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '';

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildCsv = (headers, rows) =>
  [headers.join(';'), ...rows.map(row => row.map(csvCell).join(';'))].join('\n');

const downloadCsv = (filename, headers, rows) => {
  const csv = buildCsv(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const findTool = (toolsById, session) => toolsById.get(session?.toolId) || null;

const findOperator = (operators, session) =>
  operators.find(operator =>
    operator.id === session?.operatorId ||
    operator.cardId === session?.operatorId ||
    operator.rfidCard === session?.operatorId
  ) || null;

const getToolName = (tool, session) =>
  tool?.name || session?.toolName || session?.toolId || 'Ferramenta sem nome';

const getToolType = (tool, session) =>
  tool?.type || tool?.category || session?.toolType || session?.toolCategory || '';

const getToolStatus = (tool) =>
  tool?.status || tool?.state || 'Sem estado';

const getOperatorName = (operator, session) =>
  operator?.name || session?.operatorName || session?.operatorId || 'Operador sem nome';

const getObraId = (tool, session) =>
  session?.obraId || tool?.currentObraId || tool?.assignedObraId || tool?.obraId || null;

const getObraName = (obrasById, tool, session) => {
  const obraId = getObraId(tool, session);
  return session?.obraName ||
    tool?.currentObraName ||
    tool?.assignedObraName ||
    tool?.obraName ||
    obrasById.get(obraId)?.name ||
    obraId ||
    'Sem obra atribuida';
};

const getLastCheckout = (tool, sessions) => {
  const latest = sessions
    .filter(session => session.toolId === tool.id)
    .map(getSessionStart)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ? formatDateTime(latest) : '';
};

const getAnomalyLabel = (flag) => {
  if (flag === 'TOOL_PRESUMED_LOST') return 'Presumida perdida';
  if (flag === 'TOOL_OVERDUE') return 'Devolução atrasada';
  return flag;
};

const getPeriodLabel = (dateFilter, customRange, dateRange) => {
  if (dateFilter === 'today') return 'Hoje';
  if (dateFilter === 'week') return 'Semana';
  if (dateFilter === 'month') return 'Mes';
  if (dateFilter === 'quarter') return 'Trimestre';
  if (dateFilter === 'custom' && customRange?.start && customRange?.end) {
    return `${formatDateTime(dateRange.start)} - ${formatDateTime(dateRange.end)}`;
  }
  return dateFilter || 'Período global';
};

const RelatoriosView = () => {
  const {
    tools = [],
    toolSessions = [],
    operators = [],
    obras = [],
    dateFilter,
    customRange,
  } = useStore();
  const [selectedType, setSelectedType] = useState(null);

  const dateRange = useMemo(
    () => getDateRangeFromPreset(dateFilter, customRange),
    [dateFilter, customRange]
  );

  const toolsById = useMemo(
    () => new Map(tools.map(tool => [tool.id, tool])),
    [tools]
  );

  const obrasById = useMemo(
    () => new Map(obras.map(obra => [obra.id, obra])),
    [obras]
  );

  const sessionsInRange = useMemo(
    () => toolSessions.filter(session => {
      const start = getSessionStart(session);
      return start && start >= dateRange.start && start <= dateRange.end;
    }),
    [toolSessions, dateRange]
  );

  const periodLabel = useMemo(
    () => getPeriodLabel(dateFilter, customRange, dateRange),
    [dateFilter, customRange, dateRange]
  );

  const exportInventoryByObra = () => {
    const headers = ['Obra', 'Ferramenta', 'Tipo/Categoria', 'Status', 'Último Checkout'];
    const rows = tools
      .map(tool => [
        getObraName(obrasById, tool, null),
        getToolName(tool, null),
        getToolType(tool, null),
        getToolStatus(tool),
        getLastCheckout(tool, toolSessions),
      ])
      .sort((a, b) => `${a[0]}${a[1]}`.localeCompare(`${b[0]}${b[1]}`));

    downloadCsv('inventario_ferramentas_por_obra', headers, rows);
  };

  const exportSessions = () => {
    const headers = ['Ferramenta', 'Operador', 'Obra', 'Início', 'Fim', 'Duração(h)', 'Status', 'Anomalias'];
    const rows = sessionsInRange.map(session => {
      const tool = findTool(toolsById, session);
      const operator = findOperator(operators, session);
      const anomalies = detectToolSessionAnomalies(session).map(getAnomalyLabel).join(', ');

      return [
        getToolName(tool, session),
        getOperatorName(operator, session),
        getObraName(obrasById, tool, session),
        formatDateTime(getSessionStart(session)),
        formatDateTime(getSessionEnd(session)),
        getSessionDurationHours(session).toFixed(2),
        session.status || '',
        anomalies,
      ];
    });

    downloadCsv('checkouts_devolucoes_ferramentas', headers, rows);
  };

  const exportOverdueAndLost = () => {
    const headers = ['Ferramenta', 'Operador', 'Obra', 'Início', 'Status', 'Dias em aberto', 'Origem', 'Anomalias'];
    const sessionRows = toolSessions
      .filter(session => {
        const status = normalize(session.status);
        const anomalies = detectToolSessionAnomalies(session);
        return status === 'lost' || anomalies.length > 0;
      })
      .map(session => {
        const tool = findTool(toolsById, session);
        const operator = findOperator(operators, session);
        const anomalies = detectToolSessionAnomalies(session).map(getAnomalyLabel).join(', ');

        return [
          getToolName(tool, session),
          getOperatorName(operator, session),
          getObraName(obrasById, tool, session),
          formatDateTime(getSessionStart(session)),
          session.status || '',
          getDaysOpen(session),
          'Sessão',
          anomalies,
        ];
      });

    const sessionToolIds = new Set(
      toolSessions
        .filter(session => normalize(session.status) === 'lost' || detectToolSessionAnomalies(session).length > 0)
        .map(session => session.toolId)
    );

    const lostToolRows = tools
      .filter(tool => normalize(tool.status) === 'lost' && !sessionToolIds.has(tool.id))
      .map(tool => [
        getToolName(tool, null),
        '',
        getObraName(obrasById, tool, null),
        '',
        getToolStatus(tool),
        '',
        'Ferramenta',
        'Marcada como perdida',
      ]);

    downloadCsv('ferramentas_overdue_perdidas', headers, [...sessionRows, ...lostToolRows]);
  };

  const exportByOperator = () => {
    const headers = ['Operador', 'Checkouts', 'Ferramentas únicas', 'Sessões abertas'];
    const grouped = new Map();

    sessionsInRange.forEach(session => {
      const operator = findOperator(operators, session);
      const key = operator?.id || session.operatorId || 'sem_operador';
      const current = grouped.get(key) || {
        operatorName: getOperatorName(operator, session),
        checkouts: 0,
        tools: new Set(),
        openSessions: 0,
      };

      current.checkouts += 1;
      if (session.toolId) current.tools.add(session.toolId);
      if (session.status === 'OPEN') current.openSessions += 1;
      grouped.set(key, current);
    });

    const rows = Array.from(grouped.values())
      .map(group => [
        group.operatorName,
        group.checkouts,
        group.tools.size,
        group.openSessions,
      ])
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    downloadCsv('ferramentas_por_operador', headers, rows);
  };

  const handleExport = (type) => {
    if (type === 'inventory') exportInventoryByObra();
    if (type === 'sessions') exportSessions();
    if (type === 'overdue') exportOverdueAndLost();
    if (type === 'operators') exportByOperator();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Exportação Operacional</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Exportações CSV de ferramentas, checkouts, devoluções e atividade por operador.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700/50 px-3 py-2 rounded-lg">
          <Wrench className="w-4 h-4 text-slate-500 dark:text-slate-300" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Período global</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{periodLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map(report => (
          <Card
            key={report.id}
            hover
            onClick={() => setSelectedType(report.id)}
            className={selectedType === report.id ? 'ring-2 ring-primary-500' : ''}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <report.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{report.name}</h3>
                  <Badge variant="default" size="sm">CSV</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{report.description}</p>
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Button
                size="sm"
                icon={Download}
                onClick={(event) => {
                  event.stopPropagation();
                  handleExport(report.id);
                }}
              >
                Exportar CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RelatoriosView;
