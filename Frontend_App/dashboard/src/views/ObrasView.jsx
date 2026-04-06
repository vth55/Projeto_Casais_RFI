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
  Activity,
  Eye,
  ArrowLeft,
  BarChart3,
  X,
  CreditCard,
  Wifi,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { Card, StatCard, Button, Badge, Modal, Input, Select, Table, EmptyState, Skeleton } from '../components/ui';

// Status das obras
const OBRA_STATUS = {
  ACTIVE: { label: 'Em Curso', color: 'emerald', icon: CheckCircle },
  PLANNED: { label: 'Planeada', color: 'primary', icon: Calendar },
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
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{obra.name}</h3>
          <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{obra.address || 'Sem endereço'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Equipamentos</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{machinesInObra.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Operadores</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{operatorsInObra.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
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
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Coordenadas GPS</h4>
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
const ObraDetailView = ({ obra, machines, operators, sessions, locationCards, onBack, onEdit, onOpenMap, onAddLocationCard, onDeleteLocationCard, onDelete }) => {
  const [newCardId, setNewCardId] = useState('');
  const [creatingCard, setCreatingCard] = useState(false);

  // Cartões de localização desta obra
  const obraLocationCards = useMemo(() => {
    return locationCards.filter(card => card.obraId === obra.id);
  }, [locationCards, obra.id]);

  // Máquinas nesta obra
  const machinesInObra = useMemo(() => {
    return machines.filter(m =>
      (typeof m.location === 'object' ? m.location?.workId : m.location) === obra.id
    );
  }, [machines, obra.id]);

  // Criar novo cartão de localização
  const handleCreateCard = async () => {
    if (!newCardId.trim()) return;

    setCreatingCard(true);
    const result = await onAddLocationCard({
      cardId: newCardId.trim(),
      obraId: obra.id,
      obraName: obra.name,
      gps: obra.gps || null,
    });

    if (result.success) {
      setNewCardId('');
    }
    setCreatingCard(false);
  };

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
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{obra.name}</h2>
              <Badge variant={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            {obra.address && (
              <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
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
          {onDelete && (
            <Button
              variant="ghost"
              icon={Trash2}
              onClick={() => onDelete(obra)}
              className="!text-red-500 hover:!bg-red-50"
            />
          )}
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
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
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
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{machine.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{category || 'Sem categoria'}</p>
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
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
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
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {operator.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{operator.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(totalHours)}h trabalhadas</p>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Código</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{obra.code}</p>
            </div>
          )}
          {obra.startDate && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Data Início</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {new Date(obra.startDate).toLocaleDateString('pt-PT')}
              </p>
            </div>
          )}
          {obra.endDate && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Data Fim (Prevista)</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {new Date(obra.endDate).toLocaleDateString('pt-PT')}
              </p>
            </div>
          )}
          {obra.manager && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Responsável</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{obra.manager}</p>
            </div>
          )}
        </div>
        {obra.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Descrição</p>
            <p className="text-sm text-slate-700 dark:text-slate-200">{obra.description}</p>
          </div>
        )}
      </Card>

      {/* Cartões de Localização RFID */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <Card.Title>Cartões RFID de Localização</Card.Title>
          </div>
          <Card.Description>
            Cartões que movem equipamentos automaticamente para esta obra
          </Card.Description>
        </Card.Header>

        {/* Criar novo cartão */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">LOC_</span>
            <input
              type="text"
              value={newCardId}
              onChange={(e) => setNewCardId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              placeholder="ID_DO_CARTAO"
              className="w-full pl-12 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCard()}
            />
          </div>
          <Button
            onClick={handleCreateCard}
            disabled={creatingCard || !newCardId.trim()}
            icon={Plus}
          >
            Criar
          </Button>
        </div>

        {/* Lista de cartões */}
        {obraLocationCards.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">Nenhum cartão de localização</p>
            <p className="text-xs text-slate-400 mt-1">
              Crie um cartão para mover equipamentos facilmente para esta obra
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {obraLocationCards.map(card => (
              <div
                key={card.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold text-blue-900">{card.id}</p>
                    <p className="text-xs text-blue-600">
                      Criado em {card.createdAt?.toDate?.()?.toLocaleDateString('pt-PT') || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                  <button
                    onClick={() => onDeleteLocationCard(card.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="Eliminar cartão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instruções */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Como usar:</p>
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <li>• Escreva o ID no cartão RFID físico (ex: LOC_PORTO_01)</li>
            <li>• Quando o cartão for lido numa máquina, ela move para esta obra</li>
            <li>• Ideal para entrada/saída de equipamentos no estaleiro</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

// Modal de Eliminação Segura (admin-only, 2 passos)
const DeleteObraModal = ({ obra, isOpen, onClose, onConfirm, machinesCount, activeSessionsCount }) => {
  const [confirmName, setConfirmName] = useState('');
  const [step, setStep] = useState(1);

  const hasBlockers = machinesCount > 0 || activeSessionsCount > 0;
  const nameMatches = confirmName.trim().toLowerCase() === obra?.name?.trim().toLowerCase();

  const handleClose = () => {
    setConfirmName('');
    setStep(1);
    onClose();
  };

  const handleConfirm = () => {
    if (nameMatches && !hasBlockers) {
      onConfirm(obra);
      handleClose();
    }
  };

  if (!obra) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Eliminar Obra" size="md">
      <div className="space-y-5">
        {/* Aviso principal */}
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Ação irreversível</p>
            <p className="text-sm text-red-600 mt-1">
              A obra <strong>"{obra.name}"</strong> será permanentemente eliminada, incluindo todos os dados associados.
            </p>
          </div>
        </div>

        {/* Bloqueadores — se existir máquinas ou sessões ativas */}
        {hasBlockers ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Não é possível eliminar esta obra porque:</p>
            {machinesCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Truck className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800">
                  <strong>{machinesCount}</strong> equipamento{machinesCount > 1 ? 's' : ''} ainda atribuído{machinesCount > 1 ? 's' : ''} a esta obra
                </span>
              </div>
            )}
            {activeSessionsCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Activity className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800">
                  <strong>{activeSessionsCount}</strong> sessão{activeSessionsCount > 1 ? 'ões' : ''} ativa{activeSessionsCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">Mova os equipamentos e encerre as sessões antes de eliminar.</p>
          </div>
        ) : step === 1 ? (
          /* Passo 1 — Confirmação inicial */
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Esta obra não tem equipamentos nem sessões ativas. Tem a certeza que pretende eliminar?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button
                variant="outline"
                className="!border-red-300 !text-red-600 hover:!bg-red-50"
                onClick={() => setStep(2)}
              >
                Sim, quero eliminar
              </Button>
            </div>
          </div>
        ) : (
          /* Passo 2 — Escrever nome da obra */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Escreva <strong className="text-red-600">"{obra.name}"</strong> para confirmar:
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={obra.name}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && nameMatches && handleConfirm()}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <button
                onClick={handleConfirm}
                disabled={!nameMatches}
                className={`
                  px-4 py-2.5 rounded-lg text-sm font-semibold transition-all
                  ${nameMatches
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        )}

        {/* Badge admin */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400">Ação restrita a administradores</span>
        </div>
      </div>
    </Modal>
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
            <p className="text-sm text-slate-500 dark:text-slate-400">{obra.address}</p>
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

// Mapa de activeView da sidebar → filtro de status
const VIEW_TO_FILTER = {
  'obras': 'all',
  'obras-todas': 'all',
  'obras-em-curso': 'ACTIVE',
  'obras-planeadas': 'PLANNED',
  'obras-concluidas': 'COMPLETED',
  'obras-mapa': 'all',
};

const ObrasView = () => {
  const { activeView, setActiveView, obras, machines, operators, sessions, loading, addObra, updateObra, deleteObra, locationCards, addLocationCard, deleteLocationCard } = useStore();
  const { isAdmin } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingObra, setDeletingObra] = useState(null);
  const [editingObra, setEditingObra] = useState(null);
  const [selectedObra, setSelectedObra] = useState(null);
  const [viewingObra, setViewingObra] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Derivar filtro do activeView (sidebar) — fonte única de verdade
  const filterStatus = VIEW_TO_FILTER[activeView] || 'all';

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

  // Contagem de dependências para validação de eliminação
  const getObraDependencies = (obra) => {
    const machinesCount = machines.filter(m =>
      (typeof m.location === 'object' ? m.location?.workId : m.location) === obra.id
    ).length;
    const activeSessionsCount = sessions.filter(s =>
      s.status === 'OPEN' && machines.some(m =>
        m.id === s.machineId &&
        (typeof m.location === 'object' ? m.location?.workId : m.location) === obra.id
      )
    ).length;
    return { machinesCount, activeSessionsCount };
  };

  const handleRequestDelete = (obra) => {
    setDeletingObra(obra);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (obra) => {
    await deleteObra(obra.id);
    setShowDeleteModal(false);
    setDeletingObra(null);
    if (viewingObra?.id === obra.id) setViewingObra(null);
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
        locationCards={locationCards || []}
        onBack={() => setViewingObra(null)}
        onEdit={(obra) => {
          setEditingObra(obra);
          setShowModal(true);
        }}
        onOpenMap={handleOpenMap}
        onAddLocationCard={addLocationCard}
        onDeleteLocationCard={deleteLocationCard}
        onDelete={isAdmin() ? handleRequestDelete : null}
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Obras</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão de obras e localizações</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          Nova Obra
        </Button>
      </div>

      {/* KPIs — clicáveis como filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div onClick={() => setActiveView('obras-todas')} className="cursor-pointer">
          <StatCard icon={Building2} title="Total" value={stats.total} color="primary"
            className={`transition-all ring-2 ${filterStatus === 'all' ? 'ring-primary-500 shadow-lg shadow-primary-500/10' : 'ring-transparent hover:ring-slate-200'}`} />
        </div>
        <div onClick={() => setActiveView('obras-em-curso')} className="cursor-pointer">
          <StatCard icon={CheckCircle} title="Em Curso" value={stats.active} color="emerald"
            className={`transition-all ring-2 ${filterStatus === 'ACTIVE' ? 'ring-emerald-500 shadow-lg shadow-emerald-500/10' : 'ring-transparent hover:ring-slate-200'}`} />
        </div>
        <div onClick={() => setActiveView('obras-planeadas')} className="cursor-pointer">
          <StatCard icon={Calendar} title="Planeadas" value={stats.planned} color="primary"
            className={`transition-all ring-2 ${filterStatus === 'PLANNED' ? 'ring-primary-500 shadow-lg shadow-primary-500/10' : 'ring-transparent hover:ring-slate-200'}`} />
        </div>
        <div onClick={() => setActiveView('obras-concluidas')} className="cursor-pointer">
          <StatCard icon={CheckCircle} title="Concluídas" value={stats.completed} color="slate"
            className={`transition-all ring-2 ${filterStatus === 'COMPLETED' ? 'ring-slate-500 shadow-lg shadow-slate-500/10' : 'ring-transparent hover:ring-slate-200'}`} />
        </div>
      </div>

      {/* Pesquisa */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar obras..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          {filterStatus !== 'all' && (
            <button
              onClick={() => setActiveView('obras-todas')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtro
            </button>
          )}
        </div>
      </Card>

      {/* Conteúdo condicional: Mapa Geral ou Lista */}
      {activeView === 'obras-mapa' ? (
        /* Mapa Geral — grelha com embeds de todas as obras com GPS */
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Mapa Geral de Obras</h3>
          {(() => {
            const obrasComGPS = filteredObras.filter(o => o.gps?.latitude && o.gps?.longitude);
            if (obrasComGPS.length === 0) {
              return (
                <EmptyState
                  icon={Map}
                  title="Sem obras com GPS"
                  description="Adicione coordenadas GPS às suas obras para as ver no mapa."
                />
              );
            }
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {obrasComGPS.map(obra => (
                  <Card key={obra.id}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{obra.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {obra.address || 'Sem endereço'}
                        </p>
                      </div>
                      <Badge variant={OBRA_STATUS[obra.status]?.color || 'slate'} size="sm">
                        {OBRA_STATUS[obra.status]?.label || obra.status}
                      </Badge>
                    </div>
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                      <iframe
                        src={`https://www.google.com/maps?q=${obra.gps.latitude},${obra.gps.longitude}&z=14&output=embed`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        title={`Mapa ${obra.name}`}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-400">GPS: {obra.gps.latitude}, {obra.gps.longitude}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={ExternalLink}
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${obra.gps.latitude},${obra.gps.longitude}`, '_blank')}
                      >
                        Direções
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        filteredObras.length === 0 ? (
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
        )
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

      {/* Modal de Eliminação Segura (admin-only) */}
      {isAdmin() && (
        <DeleteObraModal
          obra={deletingObra}
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setDeletingObra(null); }}
          onConfirm={handleConfirmDelete}
          {...(deletingObra ? getObraDependencies(deletingObra) : { machinesCount: 0, activeSessionsCount: 0 })}
        />
      )}
    </div>
  );
};

export default ObrasView;
