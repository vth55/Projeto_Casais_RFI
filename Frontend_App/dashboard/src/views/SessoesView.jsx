import React, { useState, useMemo } from 'react';
import {
  Clock, Play, Search, Download, Truck, User, Timer, Activity,
  CheckCircle, Calendar, AlertTriangle, XCircle, Eye,
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { Card, StatCard, Button, Badge, StatusBadge, Table, EmptyState, Skeleton, Modal, Input } from '../components/ui';
import LiveTimer from '../components/ui/LiveTimer';
import TabNav from '../components/TabNav';
import { PERMISSIONS } from '../config/permissions';

// ─── Active Session Card ───────────────────────────────────────────────────────
const ActiveSessionCard = ({ session, machine, operator }) => {
  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
  const durationMs = Date.now() - startTime.getTime();
  const isLong = durationMs >= 5 * 60 * 60 * 1000;

  return (
    <Card className={`border-l-4 ${isLong ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLong ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Play className={`w-6 h-6 ${isLong ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">{machine?.name || session.machineId}</h3>
              {isLong && <Badge variant="warning">+5h</Badge>}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{operator?.name || session.cardId}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <LiveTimer
            startTime={startTime}
            tickMs={1000}
            className={`text-2xl ${isLong ? 'text-amber-600' : 'text-emerald-600'}`}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">em curso</p>
        </div>
      </div>
    </Card>
  );
};

// ─── Validation Modal (merged from QualidadeView) ──────────────────────────────
const ValidationModal = ({ session, machine, operator, onValidate, onClose }) => {
  const [action, setAction] = useState('approve');
  const [correctedHours, setCorrectedHours] = useState(session?.durationHours?.toFixed(2) || '');
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

  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
  const endTime = session.endTime?.toDate?.() || new Date(session.endTime);
  const hasDurationAnomaly = session.durationHours >= 5;

  return (
    <div className="space-y-6">
      {/* Detalhes da sessão */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{machine?.name || session.machineId}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Operador: {operator?.name || session.cardId}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Início</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {startTime.toLocaleDateString('pt-PT')}{' '}
              {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fim</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {endTime.toLocaleDateString('pt-PT')}{' '}
              {endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Duração Registada</p>
            <p className={`text-sm font-semibold ${hasDurationAnomaly ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
              {session.durationHours?.toFixed(2)}h
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Estado Atual</p>
            <StatusBadge status={session.validationStatus || 'PENDING'} />
          </div>
        </div>
      </div>

      {/* Alerta de anomalia de duração */}
      {hasDurationAnomaly && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Anomalia de Duração</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Esta sessão excede 5 horas contínuas ({session.durationHours?.toFixed(1)}h).
              Verifique se a duração está correta ou se foi um esquecimento de fecho.
            </p>
          </div>
        </div>
      )}

      {/* Seleção de ação */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Ação de Validação</p>
        <div className="grid grid-cols-3 gap-3">
          {/* Aprovar */}
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
          {/* Corrigir */}
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
          {/* Rejeitar */}
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

      {/* Campo de horas corrigidas — só quando corrigir */}
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

      {/* Notas */}
      <Input
        label="Notas (opcional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Adicione observações sobre esta validação..."
      />

      {/* Botões de ação */}
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

// ─── Validation Session Card ───────────────────────────────────────────────────
const ValidationSessionCard = ({ session, machine, operator, onSelect, canValidate }) => {
  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
  const isFatigue = session.durationHours >= 5;
  const isValidated = session.validationStatus === 'VALIDATED';
  const isCorrected = !!session.corrected;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
        canValidate ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
      } ${
        isFatigue && !isValidated
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      onClick={() => canValidate && onSelect(session)}
    >
      {/* Lado esquerdo — info da sessão */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isValidated ? 'bg-emerald-100 dark:bg-emerald-900/30' :
          isFatigue ? 'bg-amber-100 dark:bg-amber-900/30' :
          'bg-primary-100 dark:bg-primary-900/30'
        }`}>
          {isValidated
            ? <CheckCircle className="w-5 h-5 text-emerald-600" />
            : isFatigue
              ? <AlertTriangle className="w-5 h-5 text-amber-600" />
              : <Truck className="w-5 h-5 text-primary-600" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {machine?.name || session.machineId}
            </p>
            {isFatigue && !isValidated && (
              <Badge variant="warning" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Possível Esquecimento
              </Badge>
            )}
            {isCorrected && (
              <Badge variant="primary" size="sm">Corrigida</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{operator?.name || session.cardId}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              {startTime.toLocaleDateString('pt-PT')}
            </span>
          </div>
        </div>
      </div>

      {/* Lado direito — duração + ação */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          <p className={`text-lg font-semibold ${
            isFatigue && !isValidated ? 'text-amber-600' : 'text-slate-900 dark:text-white'
          }`}>
            {session.durationHours?.toFixed(1)}h
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">duração</p>
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

// ─── Main Component ────────────────────────────────────────────────────────────
const SessoesView = () => {
  const { activeView, setActiveView, sessions, machines, operators, getFilteredSessions, resolveSessionAnomaly, loading } = useStore();
  const { can } = useAuthStore();

  const canViewValidations = can(PERMISSIONS.QUALITY_VIEW) || can(PERMISSIONS.SESSIONS_VIEW_ALL);
  const canValidate = can(PERMISSIONS.QUALITY_VALIDATE);

  // Derivar tab directamente do activeView
  const activeTab = activeView === 'sessoes-historico'
    ? 'history'
    : activeView === 'sessoes-validacoes'
      ? 'validations'
      : 'active';

  const [searchTerm, setSearchTerm] = useState('');
  const [validatingSession, setValidatingSession] = useState(null);
  const [validationSubTab, setValidationSubTab] = useState('pending');

  const filteredSessions = getFilteredSessions();
  const activeSessions = useMemo(() => sessions.filter(s => s.status === 'OPEN'), [sessions]);
  const closedSessions = useMemo(() => filteredSessions.filter(s => s.status === 'CLOSED'), [filteredSessions]);

  // Validações — sessões fechadas pendentes (duração >=5h ou autoClose, não validadas)
  const pendingValidations = useMemo(() => closedSessions.filter(s =>
    (s.durationHours >= 5 || s.autoClose === true) &&
    s.validationStatus !== 'VALIDATED' &&
    s.validationStatus !== 'RESOLVED'
  ), [closedSessions]);

  // Anomalias — só >5h (pode estar validada ou não)
  const fatigueAlerts = useMemo(() => sessions.filter(s => s.durationHours >= 5), [sessions]);

  // Histórico de validadas
  const validatedSessions = useMemo(() => sessions.filter(s => s.validationStatus === 'VALIDATED'), [sessions]);

  const stats = useMemo(() => {
    const totalHours = closedSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    return {
      active: activeSessions.length,
      closed: closedSessions.length,
      totalHours: Math.round(totalHours),
      avgDuration: closedSessions.length > 0
        ? Math.round((totalHours / closedSessions.length) * 10) / 10
        : 0,
      pendingValidations: pendingValidations.length,
      fatigueAlerts: fatigueAlerts.length,
      validated: validatedSessions.length,
      corrected: validatedSessions.filter(s => s.corrected).length,
    };
  }, [activeSessions, closedSessions, pendingValidations, fatigueAlerts, validatedSessions]);

  // Sessões para a tab de validações conforme sub-tab
  const validationList = useMemo(() => {
    if (validationSubTab === 'pending') return pendingValidations;
    if (validationSubTab === 'fatigue') return fatigueAlerts;
    return validatedSessions;
  }, [validationSubTab, pendingValidations, fatigueAlerts, validatedSessions]);

  const applySearch = (list) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(s => {
      const machine = machines.find(m => m.id === s.machineId);
      const operator = operators.find(o => o.id === s.cardId);
      return (
        machine?.name?.toLowerCase().includes(term) ||
        operator?.name?.toLowerCase().includes(term) ||
        s.machineId?.toLowerCase().includes(term)
      );
    });
  };

  const displayedSessions = useMemo(() => {
    const base = activeTab === 'active'
      ? activeSessions
      : activeTab === 'history'
        ? closedSessions
        : validationList;
    return applySearch(base).slice(0, 30);
  }, [activeTab, activeSessions, closedSessions, validationList, searchTerm]);

  // Exportar CSV
  const handleExportCSV = () => {
    const sessionsToExport = activeTab === 'active'
      ? activeSessions
      : activeTab === 'history'
        ? closedSessions
        : pendingValidations;

    if (sessionsToExport.length === 0) {
      alert('Não há sessões para exportar');
      return;
    }
    const headers = ['ID', 'Equipamento', 'Operador', 'Data', 'Início', 'Fim', 'Duração (h)', 'Estado'];
    const rows = sessionsToExport.map(s => {
      const machine = machines.find(m => m.id === s.machineId);
      const operator = operators.find(o => o.id === s.cardId);
      const startTime = s.startTime?.toDate?.() || new Date(s.startTime);
      const endTime = s.endTime?.toDate?.() || (s.status === 'OPEN' ? new Date() : null);
      return [
        s.id,
        machine?.name || s.machineId,
        operator?.name || s.cardId,
        startTime.toLocaleDateString('pt-PT'),
        startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        endTime ? endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '-',
        s.durationHours?.toFixed(1) || '-',
        s.status,
      ];
    });
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sessoes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Validar sessão via store
  const handleValidate = async (validationData) => {
    await resolveSessionAnomaly(validationData.sessionId, {
      action: validationData.action,
      correctedHours: validationData.correctedHours,
      notes: validationData.notes,
    });
  };

  // Tabs principais
  const mainTabs = [
    { id: 'active', label: 'Ativas', count: stats.active },
    { id: 'history', label: 'Histórico', count: stats.closed },
    ...(canViewValidations
      ? [{ id: 'validations', label: 'Validações', count: stats.pendingValidations }]
      : []),
  ];

  // Sub-tabs dentro de Validações
  const validationSubTabs = [
    { id: 'pending', label: 'Pendentes', count: pendingValidations.length },
    { id: 'fatigue', label: 'Anomalias >5h', count: fatigueAlerts.length },
    { id: 'history', label: 'Validadas', count: validatedSessions.length },
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sessões</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Histórico de utilização de equipamentos</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExportCSV}>Exportar CSV</Button>
      </div>

      {/* KPI Cards — mudam conforme tab ativa */}
      {activeTab !== 'validations' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Play} title="Ativas" value={stats.active} color={stats.active > 0 ? 'emerald' : 'slate'} />
          <StatCard icon={Clock} title="Total" value={stats.closed} color="primary" />
          <StatCard icon={Timer} title="Horas" value={stats.totalHours} unit="h" color="primary" />
          <StatCard icon={Activity} title="Média" value={stats.avgDuration} unit="h" color="slate" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={AlertTriangle}
            title="Pendentes"
            value={stats.pendingValidations}
            color={stats.pendingValidations > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            icon={Timer}
            title="Anomalias >5h"
            value={stats.fatigueAlerts}
            color={stats.fatigueAlerts > 0 ? 'red' : 'emerald'}
          />
          <StatCard
            icon={CheckCircle}
            title="Validadas"
            value={stats.validated}
            color="emerald"
          />
          <StatCard
            icon={XCircle}
            title="Corrigidas"
            value={stats.corrected}
            color="primary"
          />
        </div>
      )}

      {/* Card Principal */}
      <Card padding="none">
        {/* Tabs principais */}
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

        {/* Sub-tabs de validações */}
        {activeTab === 'validations' && (
          <div className="px-4 pt-3 pb-0">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
              {validationSubTabs.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => { setValidationSubTab(sub.id); setSearchTerm(''); }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    validationSubTab === sub.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sub.label}
                  {sub.count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      validationSubTab === sub.id
                        ? sub.id === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : sub.id === 'fatigue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {sub.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Barra de pesquisa */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'validations'
                  ? 'Pesquisar por máquina ou operador...'
                  : 'Pesquisar...'
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Conteúdo da tab */}
        <div className="p-4 sm:p-6">

          {/* Tab: Ativas */}
          {activeTab === 'active' && (
            displayedSessions.length === 0
              ? <EmptyState icon={Play} title="Sem sessões ativas" description="Não existem equipamentos em utilização neste momento." />
              : <div className="space-y-4">
                  {displayedSessions.map(s => (
                    <ActiveSessionCard
                      key={s.id}
                      session={s}
                      machine={machines.find(m => m.id === s.machineId)}
                      operator={operators.find(o => o.id === s.cardId)}
                    />
                  ))}
                </div>
          )}

          {/* Tab: Histórico */}
          {activeTab === 'history' && (
            displayedSessions.length === 0
              ? <EmptyState icon={Clock} title="Sem sessões" description="Não foram encontradas sessões com os filtros actuais." />
              : (
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Header>Equipamento</Table.Header>
                      <Table.Header>Operador</Table.Header>
                      <Table.Header>Data</Table.Header>
                      <Table.Header align="right">Início</Table.Header>
                      <Table.Header align="right">Fim</Table.Header>
                      <Table.Header align="right">Duração</Table.Header>
                      <Table.Header align="center">Estado</Table.Header>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {displayedSessions.map(s => {
                      const machine = machines.find(m => m.id === s.machineId);
                      const operator = operators.find(o => o.id === s.cardId);
                      const startTime = s.startTime?.toDate?.() || new Date(s.startTime);
                      const endTime = s.endTime?.toDate?.() || new Date(s.endTime);
                      return (
                        <Table.Row key={s.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="font-medium">{machine?.name || s.machineId}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>{operator?.name || s.cardId}</Table.Cell>
                          <Table.Cell>{startTime.toLocaleDateString('pt-PT')}</Table.Cell>
                          <Table.Cell align="right">
                            {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </Table.Cell>
                          <Table.Cell align="right">
                            {endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </Table.Cell>
                          <Table.Cell align="right">
                            <span className={`font-medium ${s.durationHours >= 5 ? 'text-amber-600' : ''}`}>
                              {s.durationHours?.toFixed(1)}h
                            </span>
                          </Table.Cell>
                          <Table.Cell align="center">
                            <StatusBadge status={s.validationStatus || s.status} />
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              )
          )}

          {/* Tab: Validações */}
          {activeTab === 'validations' && (
            displayedSessions.length === 0 ? (
              <EmptyState
                icon={
                  validationSubTab === 'pending' ? CheckCircle :
                  validationSubTab === 'fatigue' ? AlertTriangle :
                  Calendar
                }
                title={
                  validationSubTab === 'pending' ? 'Sem validações pendentes' :
                  validationSubTab === 'fatigue' ? 'Sem anomalias registadas' :
                  'Sem sessões validadas'
                }
                description={
                  validationSubTab === 'pending'
                    ? 'Todas as sessões foram validadas e os dados estão corretos.'
                    : validationSubTab === 'fatigue'
                      ? 'Nenhuma sessão excedeu 5 horas contínuas.'
                      : 'O histórico de validações aparecerá aqui.'
                }
              />
            ) : (
              <div className="space-y-3">
                {displayedSessions.map(s => (
                  <ValidationSessionCard
                    key={s.id}
                    session={s}
                    machine={machines.find(m => m.id === s.machineId)}
                    operator={operators.find(o => o.id === s.cardId)}
                    onSelect={setValidatingSession}
                    canValidate={canValidate}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </Card>

      {/* Modal de Validação */}
      <Modal
        isOpen={!!validatingSession}
        onClose={() => setValidatingSession(null)}
        title="Validar Sessão"
        description="Reveja os dados e confirme, corrija ou rejeite a sessão"
        size="md"
      >
        <ValidationModal
          session={validatingSession}
          machine={machines.find(m => m.id === validatingSession?.machineId)}
          operator={operators.find(o => o.id === validatingSession?.cardId)}
          onValidate={handleValidate}
          onClose={() => setValidatingSession(null)}
        />
      </Modal>
    </div>
  );
};

export default SessoesView;
