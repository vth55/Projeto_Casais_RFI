import React, { useState, useMemo } from 'react';
import { Wrench, AlertTriangle, Calendar, Clock, Truck, Check, Plus } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Input, Table, EmptyState, Skeleton } from '../components/ui';

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        {tab.label}
        {tab.count > 0 && <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

const MaintenanceCard = ({ machine, onSchedule, onComplete }) => {
  const hours = machine.partialHours || machine.totalHours || 0;
  const progress = Math.min(100, (hours / 150) * 100);
  const isUrgent = progress >= 100;
  const isWarning = progress >= 80;

  return (
    <Card className={`border-l-4 ${isUrgent ? 'border-l-red-500' : isWarning ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isUrgent ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Truck className={`w-6 h-6 ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{machine.name}</h3>
              {isUrgent && <Badge variant="danger">Urgente</Badge>}
              {isWarning && !isUrgent && <Badge variant="warning">Atenção</Badge>}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{machine.category || 'Equipamento'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-900'}`}>{hours}h</p>
          <p className="text-xs text-slate-500">de 150h</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
        <Button variant="outline" size="sm" onClick={() => onSchedule(machine)}>Agendar</Button>
        <Button size="sm" onClick={() => onComplete(machine)}>Registar Manutenção</Button>
      </div>
    </Card>
  );
};

const ManutencaoView = () => {
  const { activeView, machines, maintenanceRecords, addMaintenanceRecord, loading } = useStore();
  const [activeTab, setActiveTab] = useState(activeView === 'manutencao-calendario' ? 'calendar' : activeView === 'manutencao-historico' ? 'history' : 'alerts');
  const [showModal, setShowModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  const alertMachines = useMemo(() => machines.filter(m => (m.partialHours || m.totalHours || 0) >= 120).sort((a, b) => (b.partialHours || b.totalHours || 0) - (a.partialHours || a.totalHours || 0)), [machines]);
  const urgentCount = alertMachines.filter(m => (m.partialHours || m.totalHours || 0) >= 150).length;

  const handleComplete = async (machine) => {
    await addMaintenanceRecord({ machineId: machine.id, type: 'preventive', notes: 'Manutenção preventiva concluída' });
  };

  const tabs = [
    { id: 'alerts', label: 'Alertas', count: alertMachines.length },
    { id: 'calendar', label: 'Calendário', count: 0 },
    { id: 'history', label: 'Histórico', count: maintenanceRecords.length },
  ];

  if (loading) return <div className="space-y-6"><Skeleton variant="title" className="w-48" /><div className="grid grid-cols-1 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900">Manutenção</h2><p className="text-slate-500 mt-1">Gestão de manutenções preventivas</p></div>
        <Button icon={Plus}>Registar Manutenção</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} title="Alertas" value={alertMachines.length} color={alertMachines.length > 0 ? 'amber' : 'emerald'} />
        <StatCard icon={Wrench} title="Urgentes" value={urgentCount} color={urgentCount > 0 ? 'red' : 'emerald'} />
        <StatCard icon={Check} title="Concluídas" value={maintenanceRecords.length} color="primary" />
        <StatCard icon={Clock} title="Próx. 7 dias" value={0} color="slate" />
      </div>

      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="p-6">
          {activeTab === 'alerts' && (alertMachines.length === 0 ? <EmptyState icon={Check} title="Sem alertas" description="Todos os equipamentos estão dentro dos limites." /> : <div className="space-y-4">{alertMachines.map(m => <MaintenanceCard key={m.id} machine={m} onSchedule={setSelectedMachine} onComplete={handleComplete} />)}</div>)}
          {activeTab === 'calendar' && <EmptyState icon={Calendar} title="Calendário" description="Funcionalidade em desenvolvimento." />}
          {activeTab === 'history' && (maintenanceRecords.length === 0 ? <EmptyState icon={Wrench} title="Sem registos" /> : (
            <Table>
              <Table.Head><Table.Row><Table.Header>Equipamento</Table.Header><Table.Header>Tipo</Table.Header><Table.Header>Data</Table.Header><Table.Header>Notas</Table.Header></Table.Row></Table.Head>
              <Table.Body>
                {maintenanceRecords.map(r => {
                  const machine = machines.find(m => m.id === r.machineId);
                  const date = r.createdAt?.toDate?.() || new Date();
                  return (
                    <Table.Row key={r.id}>
                      <Table.Cell><span className="font-medium">{machine?.name || r.machineId}</span></Table.Cell>
                      <Table.Cell><Badge>{r.type || 'Preventiva'}</Badge></Table.Cell>
                      <Table.Cell>{date.toLocaleDateString('pt-PT')}</Table.Cell>
                      <Table.Cell>{r.notes || '-'}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ManutencaoView;
