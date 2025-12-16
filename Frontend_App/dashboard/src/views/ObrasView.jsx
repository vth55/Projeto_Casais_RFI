import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Truck,
  Users,
  Calendar,
  ExternalLink,
  Map,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  Eye,
  ArrowLeft,
  BarChart3,
  X,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Input, Select, Table, EmptyState, Skeleton } from '../components/ui';

// Status das obras
const OBRA_STATUS = {
  ACTIVE: { label: 'Em Curso', color: 'emerald', icon: CheckCircle },
  PLANNED: { label: 'Planeada', color: 'primary', icon: Calendar },
  PAUSED: { label: 'Pausada', color: 'amber', icon: Clock },
  COMPLETED: { label: 'Concluída', color: 'slate', icon: CheckCircle },
};

// Card de Obra
const ObraCard = ({ obra, machines, operators, onViewDetails, onEdit, onOpenMap }) => {
  const machinesInObra = machines.filter(m =>
    (typeof m.location === 'object' ? m.location?.workId : m.location) === obra.id
  );
  const operatorsInObra = operators.filter(op => op.assignedObraId === obra.id);

  const status = OBRA_STATUS[obra.status] || OBRA_STATUS.ACTIVE;
  const StatusIcon = status.icon;

  return (
    <Card hover onClick={() => onViewDetails(obra)} className="relative">
      <div className="absolute top-3 right-3">
        <Badge variant={status.color} size="sm">
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{obra.name}</h3>
          <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{obra.address || 'Sem endereço'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Equipamentos</p>
            <p className="text-sm font-semibold text-slate-900">{machinesInObra.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Operadores</p>
            <p className="text-sm font-semibold text-slate-900">{operatorsInObra.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(obra);
          }}
        >
          Ver Detalhes
        </Button>
        {obra.gps?.latitude && obra.gps?.longitude && (
          <Button
            variant="ghost"
            size="sm"
            icon={Map}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMap(obra);
            }}
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={Edit2}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(obra);
          }}
        />
      </div>
    </Card>
  );
};

// Formulário de Obra
const ObraForm = ({ obra, onSave, onCancel }) => {
  const [formData, setFormData] = useState(obra || {
    name: '',
    code: '',
    address: '',
    city: '',
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
    gps: { latitude: '', longitude: '' },
    manager: '',
    description: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      gps: {
        latitude: parseFloat(formData.gps?.latitude) || null,
        longitude: parseFloat(formData.gps?.longitude) || null,
      },
    });
  };

  const getCoordinatesFromAddress = async () => {
    if (!formData.address) return;
    // Abrir Google Maps para o utilizador copiar as coordenadas manualmente
    const query = encodeURIComponent(`${formData.address}, ${formData.city || 'Portugal'}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    alert('Copie as coordenadas do Google Maps e cole nos campos GPS.\n\nDica: Clique com o botão direito no mapa para ver as coordenadas.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome da Obra"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Obra Porto Norte 2025"
          required
        />
        <Input
          label="Código"
          value={formData.code}
          onChange={e => setFormData({ ...formData, code: e.target.value })}
          placeholder="Ex: OPN-2025"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Endereço"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            placeholder="Rua, número, etc."
            icon={MapPin}
          />
        </div>
        <Input
          label="Cidade"
          value={formData.city}
          onChange={e => setFormData({ ...formData, city: e.target.value })}
          placeholder="Porto"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Estado"
          value={formData.status}
          onChange={e => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: 'ACTIVE', label: 'Em Curso' },
            { value: 'PLANNED', label: 'Planeada' },
            { value: 'PAUSED', label: 'Pausada' },
            { value: 'COMPLETED', label: 'Concluída' },
          ]}
        />
        <Input
          label="Data Início"
          type="date"
          value={formData.startDate}
          onChange={e => setFormData({ ...formData, startDate: e.target.value })}
        />
        <Input
          label="Data Fim (Prevista)"
          type="date"
          value={formData.endDate}
          onChange={e => setFormData({ ...formData, endDate: e.target.value })}
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-900">Coordenadas GPS</h4>
          <Button type="button" variant="ghost" size="sm" icon={ExternalLink} onClick={getCoordinatesFromAddress}>
            Obter do Maps
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude"
            type="number"
            step="any"
            value={formData.gps?.latitude || ''}
            onChange={e => setFormData({ ...formData, gps: { ...formData.gps, latitude: e.target.value } })}
            placeholder="41.1579"
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            value={formData.gps?.longitude || ''}
            onChange={e => setFormData({ ...formData, gps: { ...formData.gps, longitude: e.target.value } })}
            placeholder="-8.6291"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Responsável / Encarregado"
          value={formData.manager}
          onChange={e => setFormData({ ...formData, manager: e.target.value })}
          placeholder="Nome do responsável"
          icon={Users}
        />
      </div>

      <Input
        label="Descrição / Notas"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        placeholder="Informações adicionais sobre a obra..."
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {obra ? 'Guardar Alterações' : 'Criar Obra'}
        </Button>
      </div>
    </form>
  );
};

// Vista detalhada da Obra
const ObraDetailView = ({ obra, machines, operators, sessions, onBack, onEdit, onOpenMap }) => {
  // Máquinas nesta obra
  const machinesInObra = useMemo(() => {
    return machines.filter(m =>
      (typeof m.location === 'object' ? m.location?.workId : m.location) === obra.id
    );
  }, [machines, obra.id]);

  // Operadores atribuídos a esta obra
  const operatorsInObra = useMemo(() => {
    return operators.filter(op => op.assignedObraId === obra.id);
  }, [operators, obra.id]);

  // Sessões desta obra (baseado nas máquinas na obra)
  const machineIds = machinesInObra.map(m => m.id);
  const sessionsInObra = useMemo(() => {
    return sessions.filter(s => machineIds.includes(s.machineId));
  }, [sessions, machineIds]);

  // Estatísticas
  const stats = useMemo(() => {
    const activeSessions = sessionsInObra.filter(s => s.status === 'OPEN').length;
    const totalHours = sessionsInObra
      .filter(s => s.status === 'CLOSED')
      .reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const activeMachines = machinesInObra.filter(m =>
      sessions.some(s => s.machineId === m.id && s.status === 'OPEN')
    ).length;

    return {
      totalMachines: machinesInObra.length,
      activeMachines,
      totalOperators: operatorsInObra.length,
      activeSessions,
      totalHours: Math.round(totalHours),
    };
  }, [machinesInObra, operatorsInObra, sessionsInObra, sessions]);

  const status = OBRA_STATUS[obra.status] || OBRA_STATUS.ACTIVE;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{obra.name}</h2>
              <Badge variant={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            {obra.address && (
              <p className="text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {obra.address}{obra.city && `, ${obra.city}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {obra.gps?.latitude && obra.gps?.longitude && (
            <Button variant="outline" icon={Map} onClick={() => onOpenMap(obra)}>
              Ver Mapa
            </Button>
          )}
          <Button icon={Edit2} onClick={() => onEdit(obra)}>
            Editar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard icon={Truck} title="Equipamentos" value={stats.totalMachines} color="primary" />
        <StatCard icon={Activity} title="Ativos Agora" value={stats.activeMachines} color="emerald" />
        <StatCard icon={Users} title="Operadores" value={stats.totalOperators} color="blue" />
        <StatCard icon={Clock} title="Sessões Ativas" value={stats.activeSessions} color="amber" />
        <StatCard icon={BarChart3} title="Horas Total" value={stats.totalHours} unit="h" color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Máquinas */}
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary-500" />
              <Card.Title>Equipamentos na Obra</Card.Title>
            </div>
          </Card.Header>
          {machinesInObra.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Nenhum equipamento nesta obra</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {machinesInObra.map(machine => {
                const isActive = sessions.some(s => s.machineId === machine.id && s.status === 'OPEN');
                const category = typeof machine.category === 'object' ? machine.category?.name : machine.category;
                return (
                  <div
                    key={machine.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{machine.name}</p>
                        <p className="text-xs text-slate-500">{category || 'Sem categoria'}</p>
                      </div>
                    </div>
                    <Badge variant={isActive ? 'success' : 'default'} size="sm">
                      {isActive ? 'Ativo' : 'Parado'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Lista de Operadores */}
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <Card.Title>Operadores Atribuídos</Card.Title>
            </div>
          </Card.Header>
          {operatorsInObra.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Nenhum operador atribuído</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {operatorsInObra.map(operator => {
                const isActive = sessions.some(s => s.cardId === operator.id && s.status === 'OPEN');
                const opSessions = sessions.filter(s => s.cardId === operator.id && s.status === 'CLOSED');
                const totalHours = opSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
                return (
                  <div
                    key={operator.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {operator.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{operator.name}</p>
                        <p className="text-xs text-slate-500">{Math.round(totalHours)}h trabalhadas</p>
                      </div>
                    </div>
                    <Badge variant={isActive ? 'success' : 'default'} size="sm">
                      {isActive ? 'Ativo' : 'Disponível'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Informações adicionais */}
      <Card>
        <Card.Header>
          <Card.Title>Informações da Obra</Card.Title>
        </Card.Header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {obra.code && (
            <div>
              <p className="text-xs text-slate-500">Código</p>
              <p className="text-sm font-medium text-slate-900">{obra.code}</p>
            </div>
          )}
          {obra.startDate && (
            <div>
              <p className="text-xs text-slate-500">Data Início</p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(obra.startDate).toLocaleDateString('pt-PT')}
              </p>
            </div>
          )}
          {obra.endDate && (
            <div>
              <p className="text-xs text-slate-500">Data Fim (Prevista)</p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(obra.endDate).toLocaleDateString('pt-PT')}
              </p>
            </div>
          )}
          {obra.manager && (
            <div>
              <p className="text-xs text-slate-500">Responsável</p>
              <p className="text-sm font-medium text-slate-900">{obra.manager}</p>
            </div>
          )}
        </div>
        {obra.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Descrição</p>
            <p className="text-sm text-slate-700">{obra.description}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

// Modal de Mapa
const MapModal = ({ obra, isOpen, onClose }) => {
  if (!obra?.gps?.latitude || !obra?.gps?.longitude) return null;

  const mapUrl = `https://www.google.com/maps?q=${obra.gps.latitude},${obra.gps.longitude}&z=15&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${obra.gps.latitude},${obra.gps.longitude}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={obra.name} size="lg">
      <div className="space-y-4">
        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Mapa ${obra.name}`}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{obra.address}</p>
            <p className="text-xs text-slate-400">
              GPS: {obra.gps.latitude}, {obra.gps.longitude}
            </p>
          </div>
          <Button
            variant="outline"
            icon={ExternalLink}
            onClick={() => window.open(directionsUrl, '_blank')}
          >
            Direções
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ObrasView = () => {
  const { obras, machines, operators, sessions, loading, addObra, updateObra, deleteObra } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [selectedObra, setSelectedObra] = useState(null);
  const [viewingObra, setViewingObra] = useState(null); // Para vista de detalhes
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Garantir que obras existe
  const obrasList = obras || [];

  const filteredObras = useMemo(() => {
    return obrasList.filter(obra => {
      const matchesSearch = obra.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           obra.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           obra.city?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || obra.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [obrasList, searchTerm, filterStatus]);

  const stats = useMemo(() => ({
    total: obrasList.length,
    active: obrasList.filter(o => o.status === 'ACTIVE').length,
    planned: obrasList.filter(o => o.status === 'PLANNED').length,
    completed: obrasList.filter(o => o.status === 'COMPLETED').length,
  }), [obrasList]);

  const handleSave = async (data) => {
    if (editingObra) {
      await updateObra(editingObra.id, data);
    } else {
      await addObra(data);
    }
    setShowModal(false);
    setEditingObra(null);
  };

  const handleEdit = (obra) => {
    setEditingObra(obra);
    setShowModal(true);
  };

  // Função de eliminar reservada - será usada no modal de edição
  const _handleDelete = async (obra) => {
    if (confirm(`Eliminar a obra "${obra.name}"?`)) {
      await deleteObra(obra.id);
    }
  };

  const handleOpenMap = (obra) => {
    setSelectedObra(obra);
    setShowMapModal(true);
  };

  const handleViewDetails = (obra) => {
    setViewingObra(obra);
  };

  // Se está a ver detalhes de uma obra, mostrar essa vista
  if (viewingObra) {
    return (
      <ObraDetailView
        obra={viewingObra}
        machines={machines}
        operators={operators}
        sessions={sessions}
        onBack={() => setViewingObra(null)}
        onEdit={(obra) => {
          setEditingObra(obra);
          setShowModal(true);
        }}
        onOpenMap={handleOpenMap}
      />
    );
  }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Obras</h2>
          <p className="text-slate-500 mt-1">Gestão de obras e localizações</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          Nova Obra
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Building2} title="Total" value={stats.total} color="primary" />
        <StatCard icon={CheckCircle} title="Em Curso" value={stats.active} color="emerald" />
        <StatCard icon={Calendar} title="Planeadas" value={stats.planned} color="primary" />
        <StatCard icon={Clock} title="Concluídas" value={stats.completed} color="slate" />
      </div>

      {/* Filtros */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar obras..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'Todos os estados' },
                { value: 'ACTIVE', label: 'Em Curso' },
                { value: 'PLANNED', label: 'Planeadas' },
                { value: 'PAUSED', label: 'Pausadas' },
                { value: 'COMPLETED', label: 'Concluídas' },
              ]}
              className="w-40"
            />
          </div>
        </div>
      </Card>

      {/* Lista de Obras */}
      {filteredObras.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sem obras"
          description="Adicione a primeira obra para começar a gerir localizações."
          actionLabel="Adicionar Obra"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredObras.map(obra => (
            <ObraCard
              key={obra.id}
              obra={obra}
              machines={machines}
              operators={operators}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onOpenMap={handleOpenMap}
            />
          ))}
        </div>
      )}

      {/* Modal de Formulário */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingObra(null); }}
        title={editingObra ? 'Editar Obra' : 'Nova Obra'}
        size="lg"
      >
        <ObraForm
          obra={editingObra}
          onSave={handleSave}
          onCancel={() => { setShowModal(false); setEditingObra(null); }}
        />
      </Modal>

      {/* Modal de Mapa */}
      <MapModal
        obra={selectedObra}
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
      />
    </div>
  );
};

export default ObrasView;
