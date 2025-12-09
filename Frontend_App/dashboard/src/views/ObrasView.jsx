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
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Input, Select, Table, EmptyState, Skeleton } from '../components/ui';
import { getLocationName } from '../utils/safeRender';

// Status das obras
const OBRA_STATUS = {
  ACTIVE: { label: 'Em Curso', color: 'emerald', icon: CheckCircle },
  PLANNED: { label: 'Planeada', color: 'primary', icon: Calendar },
  PAUSED: { label: 'Pausada', color: 'amber', icon: Clock },
  COMPLETED: { label: 'Concluída', color: 'slate', icon: CheckCircle },
};

// Card de Obra
const ObraCard = ({ obra, machines, operators, onEdit, onOpenMap }) => {
  const machinesInObra = machines.filter(m =>
    (typeof m.location === 'object' ? m.location?.workId : m.location) === obra.id
  );
  const activeOperators = new Set();

  const status = OBRA_STATUS[obra.status] || OBRA_STATUS.ACTIVE;
  const StatusIcon = status.icon;

  return (
    <Card hover onClick={() => onEdit(obra)} className="relative">
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
            <p className="text-sm font-semibold text-slate-900">{obra.operatorCount || 0}</p>
          </div>
        </div>
      </div>

      {obra.gps?.latitude && obra.gps?.longitude && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            icon={Map}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMap(obra);
            }}
          >
            Ver no Mapa
          </Button>
        </div>
      )}
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

  const openGoogleMaps = () => {
    if (formData.address) {
      const query = encodeURIComponent(`${formData.address}, ${formData.city || 'Portugal'}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
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
  const { obras, machines, operators, loading, addObra, updateObra, deleteObra } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [selectedObra, setSelectedObra] = useState(null);
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

  const handleDelete = async (obra) => {
    if (confirm(`Eliminar a obra "${obra.name}"?`)) {
      await deleteObra(obra.id);
    }
  };

  const handleOpenMap = (obra) => {
    setSelectedObra(obra);
    setShowMapModal(true);
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
