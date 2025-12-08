import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, CreditCard, Clock, Trash2, Activity } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Input, Table, EmptyState, Skeleton } from '../components/ui';

const OperatorForm = ({ operator, lastScannedCard, onSave, onCancel }) => {
  const [formData, setFormData] = useState(operator || {
    name: '',
    cardId: lastScannedCard || '',
    department: '',
    phone: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

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
      <Input label="Nome" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: João Silva" required />
      <Input label="ID Cartão RFID" value={formData.cardId} onChange={e => setFormData({ ...formData, cardId: e.target.value })} icon={CreditCard} required disabled={!!lastScannedCard && !operator} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Departamento" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
        <Input label="Telefone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{operator ? 'Guardar' : 'Registar'}</Button>
      </div>
    </form>
  );
};

const OperadoresView = () => {
  const { operators, sessions, loading, addOperator, deleteOperator } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const operatorStats = useMemo(() => {
    return operators.map(op => {
      const opSessions = sessions.filter(s => s.cardId === op.id);
      const totalHours = opSessions.filter(s => s.status === 'CLOSED').reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const isActive = opSessions.some(s => s.status === 'OPEN');
      return { ...op, totalHours: Math.round(totalHours * 10) / 10, sessionCount: opSessions.length, isActive };
    });
  }, [operators, sessions]);

  const filteredOperators = operatorStats.filter(op =>
    op.name?.toLowerCase().includes(searchTerm.toLowerCase()) || op.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data) => {
    await addOperator(data);
    setShowModal(false);
  };

  const handleDelete = async (operator) => {
    if (confirm(`Eliminar ${operator.name}?`)) await deleteOperator(operator.id);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Operadores</h2>
          <p className="text-slate-500 mt-1">Gestão de operadores e cartões RFID</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Novo Operador</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total" value={operators.length} color="primary" />
        <StatCard icon={Activity} title="Ativos" value={operatorStats.filter(op => op.isActive).length} color="emerald" />
        <StatCard icon={Clock} title="Horas Este Mês" value={operatorStats.reduce((sum, op) => sum + op.totalHours, 0).toFixed(0)} unit="h" color="primary" />
        <StatCard icon={CreditCard} title="Cartões" value={operators.length} color="slate" />
      </div>

      <Card padding="sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
      </Card>

      {filteredOperators.length === 0 ? (
        <EmptyState icon={Users} title="Sem operadores" actionLabel="Adicionar" onAction={() => setShowModal(true)} />
      ) : (
        <Card padding="none">
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Operador</Table.Header>
                <Table.Header>ID Cartão</Table.Header>
                <Table.Header>Departamento</Table.Header>
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
                      <span className="font-medium">{op.name}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell><code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{op.id}</code></Table.Cell>
                  <Table.Cell>{op.department || '-'}</Table.Cell>
                  <Table.Cell align="right">{op.sessionCount}</Table.Cell>
                  <Table.Cell align="right"><span className="font-medium">{op.totalHours}h</span></Table.Cell>
                  <Table.Cell align="center"><Badge variant={op.isActive ? 'success' : 'default'} dot={op.isActive}>{op.isActive ? 'Ativo' : 'Inativo'}</Badge></Table.Cell>
                  <Table.Cell align="right"><Button variant="ghost" size="xs" icon={Trash2} onClick={() => handleDelete(op)} /></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Operador" size="md">
        <OperatorForm onSave={handleSave} onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  );
};

export default OperadoresView;
