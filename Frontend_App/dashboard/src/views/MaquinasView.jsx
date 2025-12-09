import React, { useState, useMemo } from 'react';
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
  Building2,
  CheckSquare,
  Square,
  ArrowRight,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, StatusBadge, Modal, Input, Select, Table, EmptyState, Skeleton } from '../components/ui';
import { getCategoryName, getLocationName, getCategoryId } from '../utils/safeRender';

// Card de máquina
const MachineCard = ({ machine, onEdit, onDelete, selected, onSelect, selectionMode }) => {
  const hoursProgress = Math.min(100, ((machine.partialHours || 0) / 150) * 100);
  const needsMaintenance = hoursProgress >= 80;

  return (
    <Card hover onClick={() => selectionMode ? onSelect(machine.id) : onEdit(machine)} className="relative">
      {needsMaintenance && (
        <div className="absolute top-3 right-3">
          <Badge variant="warning" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Manutenção
          </Badge>
        </div>
      )}

      {selectionMode && (
        <div className="absolute top-3 left-3">
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
            selected ? 'bg-primary-500 border-primary-500' : 'border-slate-300 bg-white'
          }`}>
            {selected && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      )}

      <div className={`flex items-start gap-4 ${selectionMode ? 'mt-4' : ''}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          machine.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-slate-100'
        }`}>
          <Truck className={`w-6 h-6 ${
            machine.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{machine.name}</h3>
          <p className="text-sm text-slate-500">{getCategoryName(machine.category)}</p>
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
            {getLocationName(machine.location)}
          </div>
        )}
      </div>
    </Card>
  );
};

// Formulário de máquina
const MachineForm = ({ machine, onSave, onCancel }) => {
  // Extrair valores primitivos dos objetos quando machine existe
  const initialData = machine ? {
    name: machine.name || '',
    category: getCategoryId(machine.category),
    consumptionRate: machine.consumptionRate || '',
    location: getLocationName(machine.location),
    serialNumber: machine.serialNumber || '',
  } : {
    name: '',
    category: '',
    consumptionRate: '',
    location: '',
    serialNumber: '',
  };
  const [formData, setFormData] = useState(initialData);

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

// Modal de Mudança de Localização em Bulk
const BulkLocationModal = ({ isOpen, onClose, selectedMachines, machines, obras, onConfirm }) => {
  const [selectedObra, setSelectedObra] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedMachinesList = machines.filter(m => selectedMachines.includes(m.id));

  const handleConfirm = async () => {
    if (!selectedObra) return;
    setLoading(true);
    await onConfirm(selectedMachines, selectedObra);
    setLoading(false);
    onClose();
  };

  const obraOptions = [
    { value: '', label: 'Selecionar obra...' },
    ...obras.map(o => ({ value: o.id, label: o.name })),
    { value: 'none', label: '-- Remover localização --' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mover Equipamentos" size="md">
      <div className="space-y-6">
        {/* Lista de máquinas selecionadas */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Equipamentos selecionados ({selectedMachinesList.length})
          </label>
          <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
            {selectedMachinesList.map(m => (
              <div key={m.id} className="flex items-center gap-2 py-1">
                <Truck className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">{m.name}</span>
                {m.location && (
                  <span className="text-xs text-slate-400">
                    ({getLocationName(m.location)})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seletor de obra destino */}
        <div>
          <Select
            label="Mover para obra"
            value={selectedObra}
            onChange={e => setSelectedObra(e.target.value)}
            options={obraOptions}
          />
          {obras.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              Nenhuma obra cadastrada. Crie uma obra primeiro no menu Obras.
            </p>
          )}
        </div>

        {/* Preview da mudança */}
        {selectedObra && selectedObra !== 'none' && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-primary-900">
                  {obras.find(o => o.id === selectedObra)?.name}
                </p>
                <p className="text-xs text-primary-600">
                  {selectedMachinesList.length} equipamento(s) serão movidos para esta obra
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedObra === 'none' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              A localização será removida de {selectedMachinesList.length} equipamento(s)
            </p>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedObra || loading}
            loading={loading}
            icon={ArrowRight}
          >
            Confirmar Mudança
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const MaquinasView = () => {
  const { machines, obras, loading, addMachine, updateMachine, deleteMachine, moveMachinesToObra } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMachines, setSelectedMachines] = useState([]);

  // Garantir que obras existe
  const obrasList = obras || [];

  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const categoryName = getCategoryName(m.category, '');
      return m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [machines, searchTerm]);

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

  const toggleSelection = (machineId) => {
    setSelectedMachines(prev =>
      prev.includes(machineId)
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const selectAll = () => {
    if (selectedMachines.length === filteredMachines.length) {
      setSelectedMachines([]);
    } else {
      setSelectedMachines(filteredMachines.map(m => m.id));
    }
  };

  const handleBulkMove = async (machineIds, obraId) => {
    if (obraId === 'none') {
      // Remover localização
      for (const id of machineIds) {
        await updateMachine(id, { location: null });
      }
    } else {
      await moveMachinesToObra(machineIds, obraId);
    }
    setSelectedMachines([]);
    setSelectionMode(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMachines([]);
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
        <div className="flex items-center gap-2">
          {!selectionMode ? (
            <>
              <Button variant="outline" icon={MapPin} onClick={() => setSelectionMode(true)}>
                Mudar Localização
              </Button>
              <Button icon={Plus} onClick={() => setShowModal(true)}>
                Novo Equipamento
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={exitSelectionMode}>
                Cancelar
              </Button>
              <Button
                icon={ArrowRight}
                onClick={() => setShowBulkModal(true)}
                disabled={selectedMachines.length === 0}
              >
                Mover ({selectedMachines.length})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Truck} title="Total" value={stats.total} color="primary" />
        <StatCard icon={Check} title="Ativos" value={stats.active} color="emerald" />
        <StatCard icon={Clock} title="Parados" value={stats.idle} color="slate" />
        <StatCard icon={Wrench} title="Manutenção" value={stats.maintenance} color={stats.maintenance > 0 ? 'amber' : 'slate'} />
      </div>

      {/* Barra de seleção quando em modo de seleção */}
      {selectionMode && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                {selectedMachines.length === filteredMachines.length ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                {selectedMachines.length === filteredMachines.length ? 'Desselecionar todos' : 'Selecionar todos'}
              </button>
              <span className="text-sm text-primary-600">
                {selectedMachines.length} de {filteredMachines.length} selecionados
              </span>
            </div>
            <Badge variant="primary">
              Modo de Seleção
            </Badge>
          </div>
        </div>
      )}

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
            <MachineCard
              key={machine.id}
              machine={machine}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selected={selectedMachines.includes(machine.id)}
              onSelect={toggleSelection}
              selectionMode={selectionMode}
            />
          ))}
        </div>
      ) : (
        <Card padding="none">
          <Table>
            <Table.Head>
              <Table.Row>
                {selectionMode && <Table.Header className="w-10" />}
                <Table.Header>Nome</Table.Header>
                <Table.Header>Categoria</Table.Header>
                <Table.Header>Localização</Table.Header>
                <Table.Header align="right">Horas</Table.Header>
                <Table.Header align="center">Estado</Table.Header>
                {!selectionMode && <Table.Header align="right">Ações</Table.Header>}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredMachines.map(machine => (
                <Table.Row
                  key={machine.id}
                  onClick={() => selectionMode ? toggleSelection(machine.id) : handleEdit(machine)}
                  className={selectedMachines.includes(machine.id) ? 'bg-primary-50' : ''}
                >
                  {selectionMode && (
                    <Table.Cell>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedMachines.includes(machine.id)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-slate-300'
                      }`}>
                        {selectedMachines.includes(machine.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </Table.Cell>
                  )}
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${machine.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <Truck className={`w-4 h-4 ${machine.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="font-medium">{machine.name}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{getCategoryName(machine.category, '-')}</Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {getLocationName(machine.location, 'Sem localização')}
                    </div>
                  </Table.Cell>
                  <Table.Cell align="right">{machine.totalHours || 0}h</Table.Cell>
                  <Table.Cell align="center"><StatusBadge status={machine.status} /></Table.Cell>
                  {!selectionMode && (
                    <Table.Cell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="xs" icon={Edit2} onClick={(e) => { e.stopPropagation(); handleEdit(machine); }} />
                        <Button variant="ghost" size="xs" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDelete(machine); }} />
                      </div>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      {/* Modal de Edição/Criação */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingMachine(null); }}
        title={editingMachine ? 'Editar Equipamento' : 'Novo Equipamento'}
        size="md"
      >
        <MachineForm machine={editingMachine} onSave={handleSave} onCancel={() => { setShowModal(false); setEditingMachine(null); }} />
      </Modal>

      {/* Modal de Mudança de Localização em Bulk */}
      <BulkLocationModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedMachines={selectedMachines}
        machines={machines}
        obras={obrasList}
        onConfirm={handleBulkMove}
      />
    </div>
  );
};

export default MaquinasView;
