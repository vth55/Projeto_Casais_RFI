import React, { useState, useMemo } from 'react';
import { Clock, Play, Search, Download, Truck, User, Timer, Activity, CheckCircle, Calendar } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, StatusBadge, Table, EmptyState, Skeleton } from '../components/ui';

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        {tab.label}
        {tab.count !== undefined && <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

const ActiveSessionCard = ({ session, machine, operator }) => {
  const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
  const now = new Date();
  const durationMs = now - startTime;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const isLong = hours >= 5;

  return (
    <Card className={`border-l-4 ${isLong ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLong ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Play className={`w-6 h-6 ${isLong ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{machine?.name || session.machineId}</h3>
              {isLong && <Badge variant="warning">+5h</Badge>}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{operator?.name || session.cardId}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${isLong ? 'text-amber-600' : 'text-emerald-600'}`}>{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}</div>
          <p className="text-xs text-slate-500">em curso</p>
        </div>
      </div>
    </Card>
  );
};

const SessoesView = () => {
  const { activeView, sessions, machines, operators, getFilteredSessions, loading } = useStore();
  const [activeTab, setActiveTab] = useState(activeView === 'sessoes-historico' ? 'history' : activeView === 'sessoes-validacoes' ? 'validations' : 'active');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = getFilteredSessions();
  const activeSessions = useMemo(() => sessions.filter(s => s.status === 'OPEN'), [sessions]);
  const closedSessions = useMemo(() => filteredSessions.filter(s => s.status === 'CLOSED'), [filteredSessions]);
  const pendingValidations = useMemo(() => closedSessions.filter(s => s.durationHours >= 5 && s.validationStatus !== 'VALIDATED'), [closedSessions]);

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

  const displayedSessions = getDisplayedSessions();
  const tabs = [{ id: 'active', label: 'Ativas', count: stats.active }, { id: 'history', label: 'Histórico', count: stats.closed }, { id: 'validations', label: 'Validações', count: stats.pendingValidations }];

  if (loading) return <div className="space-y-6"><Skeleton variant="title" className="w-48" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div><Skeleton.Card lines={10} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900">Sessões</h2><p className="text-slate-500 mt-1">Histórico de utilização</p></div>
        <Button variant="outline" icon={Download}>Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Play} title="Ativas" value={stats.active} color={stats.active > 0 ? 'emerald' : 'slate'} />
        <StatCard icon={Clock} title="Total" value={stats.closed} color="primary" />
        <StatCard icon={Timer} title="Horas" value={stats.totalHours} unit="h" color="primary" />
        <StatCard icon={Activity} title="Média" value={stats.avgDuration} unit="h" color="slate" />
      </div>

      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
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
                  <div><p className="font-medium text-slate-900">{machine?.name}</p><p className="text-sm text-slate-500">{operator?.name} • {startTime.toLocaleDateString('pt-PT')}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="text-lg font-bold text-amber-600">{s.durationHours?.toFixed(1)}h</p><Badge variant="warning" size="sm">Validar</Badge></div>
                  <Button variant="outline" size="sm">Validar</Button>
                </div>
              </div>
            );
          })}</div>)}
        </div>
      </Card>
    </div>
  );
};

export default SessoesView;
