import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Fuel,
  Wrench,
  AlertTriangle,
  Check,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, StatusBadge, Modal, Input, Select, Table, EmptyState, Skeleton } from '../components/ui';

// Card de máquina
const MachineCard = ({ machine, onEdit, onDelete }) => {
  const hoursProgress = Math.min(100, ((machine.partialHours || 0) / 150) * 100);
  const needsMaintenance = hoursProgress >= 80;

  return (
    <Card hover onClick={() => onEdit(machine)} className="relative">
      {needsMaintenance && (
        <div className="absolute top-3 right-3">
          <Badge variant="warning" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Manutenção
          </Badge>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          machine.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-slate-100'
        }`}>
          <Truck className={`w-6 h-6 ${
            machine.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{machine.name}</h3>
          <p className="text-sm text-slate-500">{machine.category || 'Equipamento'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Horas Total</p>
            <p className="text-sm font-semibold text-slate-900">{machine.totalHours || 0}h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Consumo</p>
            <p className="text-sm font-semibold text-slate-900">{machine.consumptionRate || 0} L/h</p>
          </div>
        </div>
      </div>

      {/* Barra de progresso manutenção */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500">Próxima manutenção</span>
          <span className={`font-medium ${needsMaintenance ? 'text-amber-600' : 'text-slate-700'}`}>
            {machine.partialHours || 0}/150h
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              needsMaintenance ? 'bg-amber-500' : 'bg-primary-500'
            }`}
            style={{ width: `${hoursProgress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <StatusBadge status={machine.status} />
        {machine.location && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            {machine.location}
          </div>
        )}
      </div>
    </Card>
  );
};

// Formulário de máquina
const MachineForm = ({ machine, onSave, onCancel }) => {
  const [formData, setFormData] = useState(machine || {
    name: '',
    category: '',
    consumptionRate: '',
    location: '',
    serialNumber: '',
  });

  const categories = [
    { value: 'escavadora', label: 'Escavadora' },
    { value: 'retroescavadora', label: 'Retroescavadora' },
    { value: 'grua', label: 'Grua' },
    { value: 'betoneira', label: 'Betoneira' },
    { value: 'compactador', label: 'Compactador' },
    { value: 'bulldozer', label: 'Bulldozer' },
    { value: 'empilhador', label: 'Empilhador' },
    { value: 'outro', label: 'Outro' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      consumptionRate: parseFloat(formData.consumptionRate) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome do Equipamento"
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        placeholder="Ex: Escavadora CAT 320"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Categoria"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          options={categories}
        />
        <Input
          label="Consumo (L/h)"
          type="number"
          step="0.1"
          value={formData.consumptionRate}
          onChange={e => setFormData({ ...formData, consumptionRate: e.target.value })}
          placeholder="15.0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Localização"
          value={formData.location}
          onChange={e => setFormData({ ...formData, location: e.target.value })}
          placeholder="Ex: Obra Lisboa Norte"
          icon={MapPin}
        />
        <Input
          label="Nº de Série"
          value={formData.serialNumber}
          onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
          placeholder="CAT-320-2024-001"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {machine ? 'Guardar Alterações' : 'Adicionar Equipamento'}
        </Button>
      </div>
    </form>
  );
};

const MaquinasView = () => {
  const { machines, loading, addMachine, updateMachine, deleteMachine } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const filteredMachines = machines.filter(m =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: machines.length,
    active: machines.filter(m => m.status === 'ACTIVE').length,
    idle: machines.filter(m => m.status === 'IDLE').length,
    maintenance: machines.filter(m => (m.partialHours || 0) >= 120).length,
  };

  const handleSave = async (data) => {
    if (editingMachine) {
      await updateMachine(editingMachine.id, data);
    } else {
      await addMachine(data);
    }
    setShowModal(false);
    setEditingMachine(null);
  };

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setShowModal(true);
  };

  const handleDelete = async (machine) => {
    if (confirm(`Eliminar ${machine.name}?`)) {
      await deleteMachine(machine.id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="title" className="w-48" />
          <Skeleton className="w-32 h-10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton.Card key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipamentos</h2>
          <p className="text-slate-500 mt-1">Gestão de máquinas e equipamentos</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          Novo Equipamento
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Truck} title="Total" value={stats.total} color="primary" />
        <StatCard icon={Check} title="Ativos" value={stats.active} color="emerald" />
        <StatCard icon={Clock} title="Parados" value={stats.idle} color="slate" />
        <StatCard icon={Wrench} title="Manutenção" value={stats.maintenance} color={stats.maintenance > 0 ? 'amber' : 'slate'} />
      </div>

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar equipamentos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>Cards</Button>
            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>Tabela</Button>
          </div>
        </div>
      </Card>

      {filteredMachines.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sem equipamentos"
          description="Adicione o primeiro equipamento para começar."
          actionLabel="Adicionar Equipamento"
          onAction={() => setShowModal(true)}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.map(machine => (
            <MachineCard key={machine.id} machine={machine} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <Card padding="none">
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Nome</Table.Header>
                <Table.Header>Categoria</Table.Header>
                <Table.Header align="right">Horas</Table.Header>
                <Table.Header align="right">Consumo</Table.Header>
                <Table.Header align="center">Estado</Table.Header>
                <Table.Header align="right">Ações</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredMachines.map(machine => (
                <Table.Row key={machine.id} onClick={() => handleEdit(machine)}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${machine.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <Truck className={`w-4 h-4 ${machine.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="font-medium">{machine.name}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{machine.category || '-'}</Table.Cell>
                  <Table.Cell align="right">{machine.totalHours || 0}h</Table.Cell>
                  <Table.Cell align="right">{machine.consumptionRate || 0} L/h</Table.Cell>
                  <Table.Cell align="center"><StatusBadge status={machine.status} /></Table.Cell>
                  <Table.Cell align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" icon={Edit2} onClick={(e) => { e.stopPropagation(); handleEdit(machine); }} />
                      <Button variant="ghost" size="xs" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDelete(machine); }} />
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingMachine(null); }}
        title={editingMachine ? 'Editar Equipamento' : 'Novo Equipamento'}
        size="md"
      >
        <MachineForm machine={editingMachine} onSave={handleSave} onCancel={() => { setShowModal(false); setEditingMachine(null); }} />
      </Modal>
    </div>
  );
};

export default MaquinasView;
