import React, { useState, useMemo } from 'react';
import { Clock, Play, Search, Download, Truck, User, Timer, Activity, CheckCircle, Calendar } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, StatusBadge, Table, EmptyState, Skeleton, Modal } from '../components/ui';
import LiveTimer from '../components/ui/LiveTimer';

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200 dark:border-slate-700">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}>
        {tab.label}
        {tab.count !== undefined && <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600'}`}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

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
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
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

// Modal de validação
const ValidationModal = ({ session, machine, operator, onClose, onValidate }) => {
  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
  const endTime = session.endTime?.toDate?.() || new Date(session.endTime);
  const [correctedStart, setCorrectedStart] = useState(startTime.toISOString().slice(0, 16));
  const [correctedEnd, setCorrectedEnd] = useState(endTime.toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async (action) => {
    setLoading(true);
    await onValidate(session.id, {
      action,
      correctedStart: action === 'correct' ? new Date(correctedStart) : null,
      correctedEnd: action === 'correct' ? new Date(correctedEnd) : null,
      notes,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Validar Sessão" size="md">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Timer className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-900">Sessão com duração longa</h4>
          </div>
          <p className="text-sm text-amber-700">
            Esta sessão teve uma duração de <strong>{session.durationHours?.toFixed(1)}h</strong>,
            superior ao limite de 5 horas. Valide ou corrija os horários.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Equipamento</label>
            <p className="text-sm text-slate-900 dark:text-white">{machine?.name || session.machineId}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Operador</label>
            <p className="text-sm text-slate-900 dark:text-white">{operator?.name || session.cardId}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Horários Registados</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Início</label>
              <input
                type="datetime-local"
                value={correctedStart}
                onChange={(e) => setCorrectedStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Fim</label>
              <input
                type="datetime-local"
                value={correctedEnd}
                onChange={(e) => setCorrectedEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Motivo da correção ou observações..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="outline" onClick={() => handleValidate('confirm')} disabled={loading}>Confirmar Original</Button>
          <Button onClick={() => handleValidate('correct')} disabled={loading} icon={CheckCircle}>Guardar Correção</Button>
        </div>
      </div>
    </Modal>
  );
};

const SessoesView = () => {
  const { activeView, setActiveView, sessions, machines, operators, getFilteredSessions, resolveSessionAnomaly, loading } = useStore();

  // Derivar tab directamente do activeView
  const activeTab = activeView === 'sessoes-historico' ? 'history' : activeView === 'sessoes-validacoes' ? 'validations' : 'active';

  const [searchTerm, setSearchTerm] = useState('');
  const [validatingSession, setValidatingSession] = useState(null);

  const filteredSessions = getFilteredSessions();
  const activeSessions = useMemo(() => sessions.filter(s => s.status === 'OPEN'), [sessions]);
  const closedSessions = useMemo(() => filteredSessions.filter(s => s.status === 'CLOSED'), [filteredSessions]);
  const pendingValidations = useMemo(() => closedSessions.filter(s => s.durationHours >= 5 && s.validationStatus !== 'VALIDATED' && s.validationStatus !== 'RESOLVED'), [closedSessions]);

  const stats = useMemo(() => {
    const totalHours = closedSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    return {
      active: activeSessions.length,
      closed: closedSessions.length,
      totalHours: Math.round(totalHours),
      avgDuration: closedSessions.length > 0 ? Math.round((totalHours / closedSessions.length) * 10) / 10 : 0,
      pendingValidations: pendingValidations.length,
    };
  }, [activeSessions, closedSessions, pendingValidations]);

  const getDisplayedSessions = () => {
    let list = activeTab === 'active' ? activeSessions : activeTab === 'history' ? closedSessions : pendingValidations;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s => {
        const machine = machines.find(m => m.id === s.machineId);
        const operator = operators.find(o => o.id === s.cardId);
        return machine?.name?.toLowerCase().includes(term) || operator?.name?.toLowerCase().includes(term);
      });
    }
    return list;
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const sessionsToExport = activeTab === 'active' ? activeSessions :
      activeTab === 'history' ? closedSessions : pendingValidations;
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

  // Validar sessão — resolve anomalia com persistência original vs corrigido
  const handleValidate = async (sessionId, validationData) => {
    await resolveSessionAnomaly(sessionId, {
      action: validationData.action,
      correctedStart: validationData.correctedStart,
      correctedEnd: validationData.correctedEnd,
      notes: validationData.notes,
    });
  };

  const displayedSessions = getDisplayedSessions();
  const tabs = [{ id: 'active', label: 'Ativas', count: stats.active }, { id: 'history', label: 'Histórico', count: stats.closed }, { id: 'validations', label: 'Validações', count: stats.pendingValidations }];

  if (loading) return <div className="space-y-6"><Skeleton variant="title" className="w-48" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div><Skeleton.Card lines={10} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sessões</h2><p className="text-slate-500 dark:text-slate-400 mt-1">Histórico de utilização</p></div>
        <Button variant="outline" icon={Download} onClick={handleExportCSV}>Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Play} title="Ativas" value={stats.active} color={stats.active > 0 ? 'emerald' : 'slate'} />
        <StatCard icon={Clock} title="Total" value={stats.closed} color="primary" />
        <StatCard icon={Timer} title="Horas" value={stats.totalHours} unit="h" color="primary" />
        <StatCard icon={Activity} title="Média" value={stats.avgDuration} unit="h" color="slate" />
      </div>

      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveView(id === 'history' ? 'sessoes-historico' : id === 'validations' ? 'sessoes-validacoes' : 'sessoes-ativas')} />
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
          </div>
        </div>
        <div className="p-6">
          {activeTab === 'active' && (displayedSessions.length === 0 ? <EmptyState icon={Play} title="Sem sessões ativas" /> : <div className="space-y-4">{displayedSessions.map(s => <ActiveSessionCard key={s.id} session={s} machine={machines.find(m => m.id === s.machineId)} operator={operators.find(o => o.id === s.cardId)} />)}</div>)}
          {activeTab === 'history' && (displayedSessions.length === 0 ? <EmptyState icon={Clock} title="Sem sessões" /> : (
            <Table>
              <Table.Head><Table.Row><Table.Header>Equipamento</Table.Header><Table.Header>Operador</Table.Header><Table.Header>Data</Table.Header><Table.Header align="right">Início</Table.Header><Table.Header align="right">Fim</Table.Header><Table.Header align="right">Duração</Table.Header><Table.Header align="center">Estado</Table.Header></Table.Row></Table.Head>
              <Table.Body>
                {displayedSessions.slice(0, 20).map(s => {
                  const machine = machines.find(m => m.id === s.machineId);
                  const operator = operators.find(o => o.id === s.cardId);
                  const startTime = s.startTime?.toDate?.() || new Date(s.startTime);
                  const endTime = s.endTime?.toDate?.() || new Date(s.endTime);
                  return (
                    <Table.Row key={s.id}>
                      <Table.Cell><div className="flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400" /><span className="font-medium">{machine?.name || s.machineId}</span></div></Table.Cell>
                      <Table.Cell>{operator?.name || s.cardId}</Table.Cell>
                      <Table.Cell>{startTime.toLocaleDateString('pt-PT')}</Table.Cell>
                      <Table.Cell align="right">{startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</Table.Cell>
                      <Table.Cell align="right">{endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</Table.Cell>
                      <Table.Cell align="right"><span className={`font-medium ${s.durationHours >= 5 ? 'text-amber-600' : ''}`}>{s.durationHours?.toFixed(1)}h</span></Table.Cell>
                      <Table.Cell align="center"><StatusBadge status={s.validationStatus || s.status} /></Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          ))}
          {activeTab === 'validations' && (displayedSessions.length === 0 ? <EmptyState icon={CheckCircle} title="Sem validações pendentes" /> : <div className="space-y-3">{displayedSessions.map(s => {
            const machine = machines.find(m => m.id === s.machineId);
            const operator = operators.find(o => o.id === s.cardId);
            const startTime = s.startTime?.toDate?.() || new Date(s.startTime);
            return (
              <div key={s.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Timer className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="font-medium text-slate-900 dark:text-white">{machine?.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{operator?.name} • {startTime.toLocaleDateString('pt-PT')}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="text-lg font-bold text-amber-600">{s.durationHours?.toFixed(1)}h</p><Badge variant="warning" size="sm">Validar</Badge></div>
                  <Button variant="outline" size="sm" onClick={() => setValidatingSession(s)}>Validar</Button>
                </div>
              </div>
            );
          })}</div>)}
        </div>
      </Card>

      {/* Modal de Validação */}
      {validatingSession && (
        <ValidationModal
          session={validatingSession}
          machine={machines.find(m => m.id === validatingSession.machineId)}
          operator={operators.find(o => o.id === validatingSession.cardId)}
          onClose={() => setValidatingSession(null)}
          onValidate={handleValidate}
        />
      )}
    </div>
  );
};

export default SessoesView;
