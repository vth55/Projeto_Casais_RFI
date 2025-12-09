import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, CreditCard, Clock, Trash2, Activity, Briefcase, Building2, Edit2, Filter, Sparkles, ArrowRight, Check, X } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Input, Table, EmptyState, Skeleton } from '../components/ui';

// Definição de cargos disponíveis
const EMPLOYEE_ROLES = [
  { id: 'operador', label: 'Operador', color: 'primary', description: 'Opera equipamentos pesados' },
  { id: 'encarregado', label: 'Encarregado de Obra', color: 'amber', description: 'Supervisiona equipa em obra' },
  { id: 'supervisor', label: 'Supervisor', color: 'purple', description: 'Coordena múltiplas obras' },
  { id: 'tecnico_manutencao', label: 'Técnico de Manutenção', color: 'emerald', description: 'Manutenção de equipamentos' },
  { id: 'gestor_frota', label: 'Gestor de Frota', color: 'blue', description: 'Gestão geral da frota' },
  { id: 'administrativo', label: 'Administrativo', color: 'slate', description: 'Funções administrativas' },
];

const getRoleInfo = (roleId) => EMPLOYEE_ROLES.find(r => r.id === roleId) || EMPLOYEE_ROLES[0];

const RoleBadge = ({ roleId }) => {
  const role = getRoleInfo(roleId);
  const colorMap = {
    primary: 'bg-primary-100 text-primary-700 border-primary-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${colorMap[role.color]}`}>
      <Briefcase className="w-3 h-3" />
      {role.label}
    </span>
  );
};

const OperatorForm = ({ operator, lastScannedCard, obras, onSave, onCancel }) => {
  const [formData, setFormData] = useState(operator || {
    name: '',
    cardId: lastScannedCard || '',
    department: '',
    phone: '',
    role: 'operador',
    assignedObraId: '',
    email: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const activeObras = obras.filter(o => o.status === 'ACTIVE' || o.status === 'PLANNED');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {lastScannedCard && !operator && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <CreditCard className="w-5 h-5 text-primary-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary-700">Cartão detectado</p>
            <p className="text-xs text-primary-600">ID: {lastScannedCard}</p>
          </div>
          <Badge variant="primary">Auto-fill</Badge>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nome Completo"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: João Silva"
          required
        />
        <Input
          label="ID Cartão RFID"
          value={formData.cardId}
          onChange={e => setFormData({ ...formData, cardId: e.target.value })}
          icon={CreditCard}
          required
          disabled={!!lastScannedCard && !operator}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
          <select
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
          >
            {EMPLOYEE_ROLES.map(role => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{getRoleInfo(formData.role).description}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Obra Atribuída</label>
          <select
            value={formData.assignedObraId}
            onChange={e => setFormData({ ...formData, assignedObraId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
          >
            <option value="">Sem obra atribuída</option>
            {activeObras.map(obra => (
              <option key={obra.id} value={obra.id}>{obra.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Departamento"
          value={formData.department}
          onChange={e => setFormData({ ...formData, department: e.target.value })}
          placeholder="Ex: Operações"
        />
        <Input
          label="Telefone"
          value={formData.phone}
          onChange={e => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Ex: 912 345 678"
        />
      </div>

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={e => setFormData({ ...formData, email: e.target.value })}
        placeholder="Ex: joao.silva@casais.pt"
      />

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{operator ? 'Guardar Alterações' : 'Registar Operador'}</Button>
      </div>
    </form>
  );
};

// Componente de sugestão auto-assign
const AutoAssignSuggestionCard = ({ suggestions, onAccept, onDismiss }) => {
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-2 border-dashed border-primary-200 bg-primary-50/30">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            Sugestões de Atribuição Automática
            <Badge variant="primary">{suggestions.length}</Badge>
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Baseado no uso de máquinas, estes operadores podem ser atribuídos a novas obras.
          </p>
          <div className="mt-4 space-y-2">
            {suggestions.map(suggestion => (
              <div key={suggestion.operatorId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                    {suggestion.operatorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{suggestion.operatorName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{suggestion.currentObraName || 'Sem obra'}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="text-primary-600 font-medium">{suggestion.suggestedObraName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>{suggestion.hoursInSuggestedObra.toFixed(1)}h nesta obra</span>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={Check}
                      onClick={() => onAccept(suggestion)}
                      className="text-emerald-600 hover:bg-emerald-50"
                    />
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={X}
                      onClick={() => onDismiss(suggestion.operatorId)}
                      className="text-slate-400 hover:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const OperadoresView = () => {
  const { operators, sessions, obras, machines, loading, addOperator, deleteOperator, updateOperator } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [obraFilter, setObraFilter] = useState('all');
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

  const operatorStats = useMemo(() => {
    return operators.map(op => {
      const opSessions = sessions.filter(s => s.cardId === op.id);
      const totalHours = opSessions.filter(s => s.status === 'CLOSED').reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const isActive = opSessions.some(s => s.status === 'OPEN');
      const assignedObra = obras.find(o => o.id === op.assignedObraId);
      return {
        ...op,
        totalHours: Math.round(totalHours * 10) / 10,
        sessionCount: opSessions.length,
        isActive,
        assignedObraName: assignedObra?.name || null
      };
    });
  }, [operators, sessions, obras]);

  // Calcular sugestões de auto-assign baseado no uso de máquinas
  const autoAssignSuggestions = useMemo(() => {
    const suggestions = [];

    operators.forEach(op => {
      // Ignorar operadores já dispensados
      if (dismissedSuggestions.includes(op.id)) return;

      // Obter sessões do operador
      const opSessions = sessions.filter(s => s.cardId === op.id && s.status === 'CLOSED');
      if (opSessions.length === 0) return;

      // Contar horas por obra (baseado na localização da máquina)
      const hoursByObra = {};
      opSessions.forEach(session => {
        const machine = machines.find(m => m.id === session.machineId);
        const obraId = machine?.location?.workId;
        if (obraId) {
          if (!hoursByObra[obraId]) hoursByObra[obraId] = 0;
          hoursByObra[obraId] += session.durationHours || 0;
        }
      });

      // Encontrar a obra com mais horas
      let maxObraId = null;
      let maxHours = 0;
      Object.entries(hoursByObra).forEach(([obraId, hours]) => {
        if (hours > maxHours) {
          maxHours = hours;
          maxObraId = obraId;
        }
      });

      // Se a obra com mais horas é diferente da atribuída, sugerir
      if (maxObraId && maxObraId !== op.assignedObraId && maxHours >= 5) {
        const suggestedObra = obras.find(o => o.id === maxObraId);
        const currentObra = obras.find(o => o.id === op.assignedObraId);

        if (suggestedObra && suggestedObra.status === 'ACTIVE') {
          suggestions.push({
            operatorId: op.id,
            operatorName: op.name,
            currentObraId: op.assignedObraId,
            currentObraName: currentObra?.name || null,
            suggestedObraId: maxObraId,
            suggestedObraName: suggestedObra.name,
            hoursInSuggestedObra: maxHours,
          });
        }
      }
    });

    return suggestions.sort((a, b) => b.hoursInSuggestedObra - a.hoursInSuggestedObra);
  }, [operators, sessions, machines, obras, dismissedSuggestions]);

  const filteredOperators = operatorStats.filter(op => {
    const matchesSearch = op.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         op.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || op.role === roleFilter;
    const matchesObra = obraFilter === 'all' || op.assignedObraId === obraFilter;
    return matchesSearch && matchesRole && matchesObra;
  });

  // Contadores por cargo
  const roleStats = useMemo(() => {
    const stats = {};
    EMPLOYEE_ROLES.forEach(role => {
      stats[role.id] = operatorStats.filter(op => op.role === role.id).length;
    });
    return stats;
  }, [operatorStats]);

  const handleSave = async (data) => {
    if (editingOperator) {
      await updateOperator(editingOperator.id, data);
    } else {
      await addOperator(data);
    }
    setShowModal(false);
    setEditingOperator(null);
  };

  const handleEdit = (operator) => {
    setEditingOperator(operator);
    setShowModal(true);
  };

  const handleDelete = async (operator) => {
    if (confirm(`Eliminar ${operator.name}?`)) await deleteOperator(operator.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOperator(null);
  };

  // Aceitar sugestão de auto-assign
  const handleAcceptSuggestion = async (suggestion) => {
    await updateOperator(suggestion.operatorId, {
      assignedObraId: suggestion.suggestedObraId,
    });
  };

  // Dispensar sugestão
  const handleDismissSuggestion = (operatorId) => {
    setDismissedSuggestions(prev => [...prev, operatorId]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="title" className="w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div>
        <Skeleton.Card lines={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Operadores</h2>
          <p className="text-slate-500 mt-1">Gestão de operadores, cargos e cartões RFID</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Novo Operador</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} title="Total" value={operators.length} color="primary" />
        <StatCard icon={Activity} title="Ativos" value={operatorStats.filter(op => op.isActive).length} color="emerald" />
        <StatCard icon={Briefcase} title="Operadores" value={roleStats.operador || 0} color="blue" />
        <StatCard icon={Briefcase} title="Encarregados" value={roleStats.encarregado || 0} color="amber" />
        <StatCard icon={Briefcase} title="Técnicos" value={roleStats.tecnico_manutencao || 0} color="emerald" />
        <StatCard icon={Clock} title="Horas Mês" value={operatorStats.reduce((sum, op) => sum + op.totalHours, 0).toFixed(0)} unit="h" color="slate" />
      </div>

      {/* Auto-Assign Suggestions */}
      <AutoAssignSuggestionCard
        suggestions={autoAssignSuggestions}
        onAccept={handleAcceptSuggestion}
        onDismiss={handleDismissSuggestion}
      />

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
            >
              <option value="all">Todos os Cargos</option>
              {EMPLOYEE_ROLES.map(role => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
            <select
              value={obraFilter}
              onChange={e => setObraFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
            >
              <option value="all">Todas as Obras</option>
              <option value="">Sem Obra</option>
              {obras.filter(o => o.status === 'ACTIVE').map(obra => (
                <option key={obra.id} value={obra.id}>{obra.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      {filteredOperators.length === 0 ? (
        <EmptyState icon={Users} title="Sem operadores" description="Adicione operadores para gerir a sua equipa" actionLabel="Adicionar Operador" onAction={() => setShowModal(true)} />
      ) : (
        <Card padding="none">
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Operador</Table.Header>
                <Table.Header>Cargo</Table.Header>
                <Table.Header>ID Cartão</Table.Header>
                <Table.Header>Obra Atribuída</Table.Header>
                <Table.Header align="right">Sessões</Table.Header>
                <Table.Header align="right">Horas</Table.Header>
                <Table.Header align="center">Estado</Table.Header>
                <Table.Header align="right">Ações</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredOperators.map(op => (
                <Table.Row key={op.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${op.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {op.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <span className="font-medium block">{op.name}</span>
                        {op.email && <span className="text-xs text-slate-500">{op.email}</span>}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell><RoleBadge roleId={op.role} /></Table.Cell>
                  <Table.Cell><code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{op.id}</code></Table.Cell>
                  <Table.Cell>
                    {op.assignedObraName ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-primary-500" />
                        <span>{op.assignedObraName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </Table.Cell>
                  <Table.Cell align="right">{op.sessionCount}</Table.Cell>
                  <Table.Cell align="right"><span className="font-medium">{op.totalHours}h</span></Table.Cell>
                  <Table.Cell align="center">
                    <Badge variant={op.isActive ? 'success' : 'default'} dot={op.isActive}>
                      {op.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" icon={Edit2} onClick={() => handleEdit(op)} />
                      <Button variant="ghost" size="xs" icon={Trash2} onClick={() => handleDelete(op)} />
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      {/* Role Legend */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Legenda de Cargos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {EMPLOYEE_ROLES.map(role => (
            <div key={role.id} className="flex items-center gap-2">
              <RoleBadge roleId={role.id} />
              <span className="text-xs text-slate-500">({roleStats[role.id] || 0})</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingOperator ? 'Editar Operador' : 'Novo Operador'} size="lg">
        <OperatorForm
          operator={editingOperator}
          obras={obras}
          onSave={handleSave}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default OperadoresView;
