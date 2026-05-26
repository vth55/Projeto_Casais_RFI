import React, { useState, useMemo } from 'react';
import {
  Clock, Play, Search, Download, Wrench, User, Timer, Activity,
  CheckCircle, Calendar, AlertTriangle, XCircle, Eye,
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { Card, StatCard, Button, Badge, StatusBadge, Table, EmptyState, Skeleton, Modal, Input } from '../components/ui';
import LiveTimer from '../components/ui/LiveTimer';
import TabNav from '../components/TabNav';
import { PERMISSIONS } from '../config/permissions';
import { getDateRangeFromPreset } from '../utils/chartDataHelpers';
import { detectToolSessionAnomalies, resolveTimestamp } from '../utils/sessionHelpers';

const DAY_MS = 24 * 60 * 60 * 1000;

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
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / DAY_MS));
};

const formatDuration = (session) => {
  const hours = getSessionDurationHours(session);
  return hours > 0 ? `${hours.toFixed(1)}h` : '-';
};

const findTool = (tools, session) =>
  tools.find(tool => tool.id === session?.toolId);

const findOperator = (operators, session) =>
  operators.find(operator =>
    operator.id === session?.operatorId ||
    operator.cardId === session?.operatorId ||
    operator.rfidCard === session?.operatorId
  );

const getToolName = (tool, session) =>
  tool?.name || session?.toolName || session?.toolId || 'Ferramenta';

const getOperatorName = (operator, session) =>
  operator?.name || session?.operatorName || session?.operatorId || 'Operador';

const getAnomalyLabel = (flag) => {
  if (flag === 'TOOL_PRESUMED_LOST') return 'Presumida perdida';
  if (flag === 'TOOL_OVERDUE') return 'Devolução atrasada';
  return flag;
};

const getAnomalyVariant = (flag) =>
  flag === 'TOOL_PRESUMED_LOST' ? 'danger' : 'warning';

// Active Session Card
const ActiveSessionCard = ({ session, tool, operator }) => {
  const startTime = getSessionStart(session);
  const anomalies = detectToolSessionAnomalies(session);
  const isOverdue = anomalies.length > 0;

  return (
    <Card className={`border-l-4 ${isOverdue ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Play className={`w-6 h-6 ${isOverdue ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {getToolName(tool, session)}
              </h3>
              {anomalies.map(flag => (
                <Badge key={flag} variant={getAnomalyVariant(flag)} size="sm">
                  {getAnomalyLabel(flag)}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {getOperatorName(operator, session)}
              </span>
              {startTime && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {session.obraName && <span>{session.obraName}</span>}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {startTime ? (
            <LiveTimer
              startTime={startTime}
              tickMs={1000}
              className={`text-2xl ${isOverdue ? 'text-amber-600' : 'text-emerald-600'}`}
            />
          ) : (
            <p className="text-2xl text-slate-400">-</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">em curso</p>
        </div>
      </div>
    </Card>
  );
};

// Validation Modal, preserving the existing validation action flow.
const ValidationModal = ({ session, tool, operator, onValidate, onClose }) => {
  const [action, setAction] = useState('approve');
  const [correctedHours, setCorrectedHours] = useState(session ? getSessionDurationHours(session).toFixed(2) : '');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onValidate({
      sessionId: session.id,
      action,
      correctedHours: action === 'correct' ? parseFloat(correctedHours) : null,
      notes,
    });
    onClose();
  };

  if (!session) return null;

  const startTime = getSessionStart(session);
  const endTime = getSessionEnd(session);
  const anomalies = detectToolSessionAnomalies(session);
  const daysOpen = getDaysOpen(session);

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{getToolName(tool, session)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Operador: {getOperatorName(operator, session)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Início</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {startTime
                ? `${startTime.toLocaleDateString('pt-PT')} ${startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fim</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {endTime
                ? `${endTime.toLocaleDateString('pt-PT')} ${endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                : 'Em curso'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tempo em aberto</p>
            <p className={`text-sm font-semibold ${anomalies.length ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
              {daysOpen} dias
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Estado Atual</p>
            <StatusBadge status={session.validationStatus || session.status || 'PENDING'} />
          </div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Anomalia de ferramenta</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              {anomalies.map(getAnomalyLabel).join(', ')}. Confirme se a ferramenta continua em uso,
              se já foi devolvida ou se precisa de correção administrativa.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Ação de Validação</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setAction('approve')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              action === 'approve'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${action === 'approve' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <p className={`text-sm font-medium ${action === 'approve' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Aprovar
            </p>
          </button>
          <button
            onClick={() => setAction('correct')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              action === 'correct'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <Clock className={`w-6 h-6 mx-auto mb-2 ${action === 'correct' ? 'text-amber-500' : 'text-slate-400'}`} />
            <p className={`text-sm font-medium ${action === 'correct' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Corrigir
            </p>
          </button>
          <button
            onClick={() => setAction('reject')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              action === 'reject'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <XCircle className={`w-6 h-6 mx-auto mb-2 ${action === 'reject' ? 'text-red-500' : 'text-slate-400'}`} />
            <p className={`text-sm font-medium ${action === 'reject' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Rejeitar
            </p>
          </button>
        </div>
      </div>

      {action === 'correct' && (
        <Input
          label="Horas Corrigidas"
          type="number"
          step="0.01"
          min="0"
          value={correctedHours}
          onChange={e => setCorrectedHours(e.target.value)}
          placeholder="0.00"
          hint="Insira a duração correta em horas decimais (ex: 2.50)"
        />
      )}

      <Input
        label="Notas (opcional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Adicione observações sobre esta validação..."
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant={action === 'approve' ? 'success' : action === 'reject' ? 'danger' : 'primary'}
          onClick={handleSubmit}
          disabled={action === 'correct' && (!correctedHours || isNaN(parseFloat(correctedHours)))}
        >
          {action === 'approve' ? 'Aprovar Sessão' :
           action === 'correct' ? 'Guardar Correção' : 'Rejeitar Sessão'}
        </Button>
      </div>
    </div>
  );
};

const ValidationSessionCard = ({ session, tool, operator, onSelect, canValidate }) => {
  const startTime = getSessionStart(session);
  const anomalies = detectToolSessionAnomalies(session);
  const isValidated = session.validationStatus === 'VALIDATED' || session.validationStatus === 'RESOLVED';
  const isCorrected = !!session.corrected || !!session.correctedByAdmin;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
        canValidate ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
      } ${
        anomalies.length && !isValidated
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      onClick={() => canValidate && onSelect(session)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isValidated ? 'bg-emerald-100 dark:bg-emerald-900/30' :
          anomalies.length ? 'bg-amber-100 dark:bg-amber-900/30' :
          'bg-primary-100 dark:bg-primary-900/30'
        }`}>
          {isValidated
            ? <CheckCircle className="w-5 h-5 text-emerald-600" />
            : anomalies.length
              ? <AlertTriangle className="w-5 h-5 text-amber-600" />
              : <Wrench className="w-5 h-5 text-primary-600" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {getToolName(tool, session)}
            </p>
            {anomalies.map(flag => (
              <Badge key={flag} variant={getAnomalyVariant(flag)} size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {getAnomalyLabel(flag)}
              </Badge>
            ))}
            {isCorrected && (
              <Badge variant="primary" size="sm">Corrigida</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{getOperatorName(operator, session)}</span>
            </span>
            {startTime && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                {startTime.toLocaleDateString('pt-PT')}
              </span>
            )}
            {session.obraName && <span>{session.obraName}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          <p className={`text-lg font-semibold ${
            anomalies.length && !isValidated ? 'text-amber-600' : 'text-slate-900 dark:text-white'
          }`}>
            {getDaysOpen(session)}d
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">em aberto</p>
        </div>
        {canValidate && !isValidated && (
          <Button variant="outline" size="sm" icon={Eye}>
            Validar
          </Button>
        )}
        {isValidated && (
          <StatusBadge status="VALIDATED" />
        )}
      </div>
    </div>
  );
};

const SessoesView = () => {
  const {
    activeView,
    setActiveView,
    toolSessions = [],
    tools = [],
    operators = [],
    resolveSessionAnomaly,
    loading,
    dateFilter,
    customRange,
  } = useStore();
  const { can } = useAuthStore();

  const canViewValidations = can(PERMISSIONS.QUALITY_VIEW) || can(PERMISSIONS.SESSIONS_VIEW_ALL);
  const canValidate = can(PERMISSIONS.QUALITY_VALIDATE);

  const activeTab = activeView === 'sessoes-historico'
    ? 'history'
    : activeView === 'sessoes-validacoes'
      ? 'validations'
      : 'active';

  const [searchTerm, setSearchTerm] = useState('');
  const [validatingSession, setValidatingSession] = useState(null);

  const filteredSessions = useMemo(() => {
    const { start, end } = getDateRangeFromPreset(dateFilter, customRange);
    return toolSessions.filter(session => {
      const sessionDate = getSessionStart(session);
      return sessionDate && sessionDate >= start && sessionDate <= end;
    });
  }, [toolSessions, dateFilter, customRange]);

  const activeSessions = useMemo(
    () => toolSessions.filter(session => session.status === 'OPEN'),
    [toolSessions],
  );

  const closedSessions = useMemo(
    () => filteredSessions.filter(session => session.status === 'CLOSED'),
    [filteredSessions],
  );

  const anomalySessions = useMemo(
    () => toolSessions.filter(session => detectToolSessionAnomalies(session).length > 0),
    [toolSessions],
  );

  const stats = useMemo(() => ({
    total: filteredSessions.length,
    active: activeSessions.length,
    closed: closedSessions.length,
    anomalies: anomalySessions.length,
  }), [filteredSessions, activeSessions, closedSessions, anomalySessions]);

  const applySearch = (list) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(session => {
      const tool = findTool(tools, session);
      const operator = findOperator(operators, session);
      return (
        getToolName(tool, session).toLowerCase().includes(term) ||
        getOperatorName(operator, session).toLowerCase().includes(term) ||
        session.toolId?.toLowerCase().includes(term) ||
        session.obraName?.toLowerCase().includes(term)
      );
    });
  };

  const displayedSessions = useMemo(() => {
    const base = activeTab === 'active'
      ? activeSessions
      : activeTab === 'history'
        ? closedSessions
        : anomalySessions;
    return applySearch(base).slice(0, 30);
  }, [activeTab, activeSessions, closedSessions, anomalySessions, searchTerm, tools, operators]);

  const handleExportCSV = () => {
    const sessionsToExport = activeTab === 'active'
      ? activeSessions
      : activeTab === 'history'
        ? closedSessions
        : anomalySessions;

    if (sessionsToExport.length === 0) {
      alert('Não há sessões para exportar');
      return;
    }

    const headers = ['Ferramenta', 'Operador', 'Data', 'Início', 'Fim', 'Duração(h)', 'Obra', 'Anomalias'];
    const rows = sessionsToExport.map(session => {
      const tool = findTool(tools, session);
      const operator = findOperator(operators, session);
      const startTime = getSessionStart(session);
      const endTime = getSessionEnd(session);
      const anomalies = detectToolSessionAnomalies(session).map(getAnomalyLabel).join(', ');

      return [
        getToolName(tool, session),
        getOperatorName(operator, session),
        startTime ? startTime.toLocaleDateString('pt-PT') : '-',
        startTime ? startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '-',
        endTime ? endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '-',
        formatDuration(session),
        session.obraName || session.obraId || '-',
        anomalies || '-',
      ];
    });

    const csv = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sessoes_ferramentas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleValidate = async (validationData) => {
    await resolveSessionAnomaly(validationData.sessionId, {
      action: validationData.action,
      correctedHours: validationData.correctedHours,
      notes: validationData.notes,
    });
  };

  const mainTabs = [
    { id: 'active', label: 'Ativas', count: stats.active },
    { id: 'history', label: 'Histórico', count: stats.closed },
    ...(canViewValidations
      ? [{ id: 'validations', label: 'Validações', count: stats.anomalies }]
      : []),
  ];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton variant="title" className="w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}
      </div>
      <Skeleton.Card lines={10} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sessões</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Histórico de utilização de ferramentas</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExportCSV}>Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Timer} title="Total" value={stats.total} color="primary" />
        <StatCard icon={Play} title="Ativas" value={stats.active} color={stats.active > 0 ? 'emerald' : 'slate'} />
        <StatCard icon={CheckCircle} title="Fechadas" value={stats.closed} color="slate" />
        <StatCard icon={AlertTriangle} title="Anomalias" value={stats.anomalies} color={stats.anomalies > 0 ? 'amber' : 'emerald'} />
      </div>

      <Card padding="none">
        <TabNav
          tabs={mainTabs}
          activeTab={activeTab}
          onChange={(id) => {
            setSearchTerm('');
            setActiveView(
              id === 'history' ? 'sessoes-historico' :
              id === 'validations' ? 'sessoes-validacoes' :
              'sessoes-ativas'
            );
          }}
          scrollable={true}
        />

        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por ferramenta, operador ou obra..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'active' && (
            displayedSessions.length === 0
              ? <EmptyState icon={Play} title="Sem sessões ativas" description="Não existem ferramentas em utilização neste momento." />
              : <div className="space-y-4">
                  {displayedSessions.map(session => (
                    <ActiveSessionCard
                      key={session.id}
                      session={session}
                      tool={findTool(tools, session)}
                      operator={findOperator(operators, session)}
                    />
                  ))}
                </div>
          )}

          {activeTab === 'history' && (
            displayedSessions.length === 0
              ? <EmptyState icon={Clock} title="Sem sessões" description="Não foram encontradas sessões com os filtros atuais." />
              : (
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Header>Ferramenta</Table.Header>
                      <Table.Header>Operador</Table.Header>
                      <Table.Header>Obra</Table.Header>
                      <Table.Header>Data</Table.Header>
                      <Table.Header align="right">Início</Table.Header>
                      <Table.Header align="right">Fim</Table.Header>
                      <Table.Header align="right">Duração</Table.Header>
                      <Table.Header align="center">Estado</Table.Header>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {displayedSessions.map(session => {
                      const tool = findTool(tools, session);
                      const operator = findOperator(operators, session);
                      const startTime = getSessionStart(session);
                      const endTime = getSessionEnd(session);
                      return (
                        <Table.Row key={session.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="font-medium">{getToolName(tool, session)}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>{getOperatorName(operator, session)}</Table.Cell>
                          <Table.Cell>{session.obraName || session.obraId || '-'}</Table.Cell>
                          <Table.Cell>{startTime ? startTime.toLocaleDateString('pt-PT') : '-'}</Table.Cell>
                          <Table.Cell align="right">
                            {startTime ? startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </Table.Cell>
                          <Table.Cell align="right">
                            {endTime ? endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </Table.Cell>
                          <Table.Cell align="right">
                            <span className="font-medium">{formatDuration(session)}</span>
                          </Table.Cell>
                          <Table.Cell align="center">
                            <StatusBadge status={session.validationStatus || session.status} />
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              )
          )}

          {activeTab === 'validations' && (
            displayedSessions.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="Sem validações pendentes"
                description="Não existem ferramentas OPEN com devolução atrasada."
              />
            ) : (
              <div className="space-y-3">
                {displayedSessions.map(session => (
                  <ValidationSessionCard
                    key={session.id}
                    session={session}
                    tool={findTool(tools, session)}
                    operator={findOperator(operators, session)}
                    onSelect={setValidatingSession}
                    canValidate={canValidate}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </Card>

      <Modal
        isOpen={!!validatingSession}
        onClose={() => setValidatingSession(null)}
        title="Validar Sessão"
        description="Reveja os dados e confirme, corrija ou rejeite a sessão"
        size="md"
      >
        <ValidationModal
          session={validatingSession}
          tool={findTool(tools, validatingSession)}
          operator={findOperator(operators, validatingSession)}
          onValidate={handleValidate}
          onClose={() => setValidatingSession(null)}
        />
      </Modal>
    </div>
  );
};

export default SessoesView;
