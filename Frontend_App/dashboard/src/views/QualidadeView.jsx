import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Mail,
  Eye,
  CheckCheck,
  X,
  Timer,
  User,
  Truck,
  Calendar,
  Filter,
  Search,
  AlertCircle,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Input, Table, EmptyState, StatusBadge } from '../components/ui';

// Componente para tab navigation
const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200 dark:border-slate-700">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
        }`}
      >
        {tab.label}
        {tab.count > 0 && (
          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
            activeTab === tab.id
              ? 'bg-primary-100 text-primary-700'
              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600'
          }`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// Modal de validação de sessão
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
  };

  if (!session) return null;

  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
  const endTime = session.endTime?.toDate?.() || new Date(session.endTime);

  return (
    <div className="space-y-6">
      {/* Detalhes da sessão */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
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
              {startTime.toLocaleDateString('pt-PT')} {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fim</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {endTime.toLocaleDateString('pt-PT')} {endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Duração Registada</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{session.durationHours?.toFixed(2)}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Estado</p>
            <StatusBadge status={session.validationStatus || 'PENDING'} />
          </div>
        </div>
      </div>

      {/* Alerta de fadiga */}
      {session.durationHours >= 5 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Anomalia de Duração</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Esta sessão excede 5 horas contínuas. Por favor verifique se a duração está correta.
            </p>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Ação de Validação</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setAction('approve')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              action === 'approve'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600'
            }`}
          >
            <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${action === 'approve' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <p className={`text-sm font-medium ${action === 'approve' ? 'text-emerald-700' : 'text-slate-600'}`}>
              Aprovar
            </p>
          </button>
          <button
            onClick={() => setAction('correct')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              action === 'correct'
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600'
            }`}
          >
            <Clock className={`w-6 h-6 mx-auto mb-2 ${action === 'correct' ? 'text-amber-500' : 'text-slate-400'}`} />
            <p className={`text-sm font-medium ${action === 'correct' ? 'text-amber-700' : 'text-slate-600'}`}>
              Corrigir
            </p>
          </button>
          <button
            onClick={() => setAction('reject')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              action === 'reject'
                ? 'border-red-500 bg-red-50'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600'
            }`}
          >
            <XCircle className={`w-6 h-6 mx-auto mb-2 ${action === 'reject' ? 'text-red-500' : 'text-slate-400'}`} />
            <p className={`text-sm font-medium ${action === 'reject' ? 'text-red-700' : 'text-slate-600'}`}>
              Rejeitar
            </p>
          </button>
        </div>
      </div>

      {/* Campo de correção */}
      {action === 'correct' && (
        <Input
          label="Horas Corrigidas"
          type="number"
          step="0.01"
          value={correctedHours}
          onChange={e => setCorrectedHours(e.target.value)}
          placeholder="0.00"
          hint="Insira a duração correta em horas"
        />
      )}

      {/* Notas */}
      <Input
        label="Notas (opcional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Adicione observações sobre esta validação..."
      />

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant={action === 'approve' ? 'success' : action === 'reject' ? 'danger' : 'primary'}
          onClick={handleSubmit}
        >
          {action === 'approve' ? 'Aprovar Sessão' :
           action === 'correct' ? 'Guardar Correção' : 'Rejeitar Sessão'}
        </Button>
      </div>
    </div>
  );
};

const QualidadeView = () => {
  const { activeView, sessions, machines, operators } = useStore();
  const [activeTab, setActiveTab] = useState(
    activeView === 'qualidade-alertas' ? 'fatigue' :
    activeView === 'qualidade-historico' ? 'history' : 'pending'
  );

  useEffect(() => {
    if (activeView === 'qualidade-alertas') setActiveTab('fatigue');
    else if (activeView === 'qualidade-historico') setActiveTab('history');
    else setActiveTab('pending');
  }, [activeView]);

  const [selectedSession, setSelectedSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sessões que precisam de validação
  const pendingValidations = useMemo(() => {
    return sessions.filter(s => {
      // Sessões fechadas sem validação ou com duração > 5h (alerta fadiga)
      if (s.status !== 'CLOSED') return false;
      if (s.validationStatus === 'VALIDATED') return false;
      // Marcar como pendente se > 5h ou se foi auto-fechada
      return s.durationHours >= 5 || s.autoClose === true;
    });
  }, [sessions]);

  // Alertas de fadiga (> 5h)
  const fatigueAlerts = useMemo(() => {
    return sessions.filter(s => s.durationHours >= 5);
  }, [sessions]);

  // Sessões validadas (histórico)
  const validatedSessions = useMemo(() => {
    return sessions.filter(s => s.validationStatus === 'VALIDATED');
  }, [sessions]);

  // Sessões exibidas na tab atual
  const displayedSessions = useMemo(() => {
    let list = [];
    if (activeTab === 'pending') list = pendingValidations;
    else if (activeTab === 'fatigue') list = fatigueAlerts;
    else list = validatedSessions;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s => {
        const machine = machines.find(m => m.id === s.machineId);
        const operator = operators.find(o => o.id === s.cardId);
        return (
          machine?.name?.toLowerCase().includes(term) ||
          operator?.name?.toLowerCase().includes(term) ||
          s.machineId?.toLowerCase().includes(term)
        );
      });
    }

    return list.slice(0, 20);
  }, [activeTab, pendingValidations, fatigueAlerts, validatedSessions, searchTerm, machines, operators]);

  const handleValidate = (validationData) => {
    console.log('Validação:', validationData);
    // Aqui implementaria a lógica de atualização no Firestore
    setSelectedSession(null);
  };

  const tabs = [
    { id: 'pending', label: 'Pendentes', count: pendingValidations.length },
    { id: 'fatigue', label: 'Anomalias de Duração', count: fatigueAlerts.length },
    { id: 'history', label: 'Histórico', count: validatedSessions.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Qualidade de Dados</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Validação e correção de sessões</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          title="Pendentes de Validação"
          value={pendingValidations.length}
          color={pendingValidations.length > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          icon={Timer}
          title="Anomalias (>5h)"
          value={fatigueAlerts.length}
          color={fatigueAlerts.length > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={CheckCircle}
          title="Validadas Este Mês"
          value={validatedSessions.length}
          color="emerald"
        />
        <StatCard
          icon={XCircle}
          title="Corrigidas"
          value={validatedSessions.filter(s => s.corrected).length}
          color="primary"
        />
      </div>

      {/* Card Principal */}
      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por máquina ou operador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="p-6">
          {displayedSessions.length === 0 ? (
            <EmptyState
              icon={activeTab === 'pending' ? CheckCircle : activeTab === 'fatigue' ? Timer : Calendar}
              title={
                activeTab === 'pending' ? 'Sem validações pendentes' :
                activeTab === 'fatigue' ? 'Sem anomalias registadas' :
                'Não há sessões com necessidades de verificação neste momento.'
              }
              description={
                activeTab === 'pending' ? 'Todas as sessões foram validadas e os custos atribuídos corretamente.' :
                activeTab === 'fatigue' ? 'Nenhuma sessão excedeu 5 horas contínuas (Possível Esquecimento).' :
                'O histórico de validações aparecerá aqui.'
              }
            />
          ) : (
            <div className="space-y-3">
              {displayedSessions.map(session => {
                const machine = machines.find(m => m.id === session.machineId);
                const operator = operators.find(o => o.id === session.cardId);
                const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
                const isFatigue = session.durationHours >= 5;

                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      isFatigue ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isFatigue ? 'bg-amber-100' : 'bg-primary-100'
                      }`}>
                        <Truck className={`w-5 h-5 ${isFatigue ? 'text-amber-600' : 'text-primary-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {machine?.name || session.machineId}
                          </p>
                          {isFatigue && (
                            <Badge variant="warning" size="sm">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Possível Esquecimento
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {operator?.name || session.cardId}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {startTime.toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${isFatigue ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                          {session.durationHours?.toFixed(1)}h
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">duração</p>
                      </div>
                      <Button variant="ghost" size="sm" icon={Eye}>
                        Validar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Modal de Validação */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Validar Sessão"
        description="Reveja os dados e confirme ou corrija a sessão"
        size="md"
      >
        <ValidationModal
          session={selectedSession}
          machine={machines.find(m => m.id === selectedSession?.machineId)}
          operator={operators.find(o => o.id === selectedSession?.cardId)}
          onValidate={handleValidate}
          onClose={() => setSelectedSession(null)}
        />
      </Modal>
    </div>
  );
};

export default QualidadeView;
