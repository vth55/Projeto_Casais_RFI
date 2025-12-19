import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Euro,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Calculator,
  PieChart,
  ArrowRight,
  Filter,
  Download,
  Truck,
  Clock,
  Fuel,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Input, Select, Table, EmptyState } from '../components/ui';

// Componente para tab navigation
const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// Formulário de tarifário
const TariffForm = ({ tariff, onSave, onCancel }) => {
  const [formData, setFormData] = useState(tariff || {
    name: '',
    type: 'hourly',
    baseRate: '',
    fuelCostPerLiter: '',
    operatorCostPerHour: '',
    maintenanceCostPerHour: '',
    depreciationPerHour: '',
    overheadPercentage: '15',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      baseRate: parseFloat(formData.baseRate) || 0,
      fuelCostPerLiter: parseFloat(formData.fuelCostPerLiter) || 0,
      operatorCostPerHour: parseFloat(formData.operatorCostPerHour) || 0,
      maintenanceCostPerHour: parseFloat(formData.maintenanceCostPerHour) || 0,
      depreciationPerHour: parseFloat(formData.depreciationPerHour) || 0,
      overheadPercentage: parseFloat(formData.overheadPercentage) || 0,
    });
  };

  const directCosts = (parseFloat(formData.operatorCostPerHour) || 0) +
    (parseFloat(formData.maintenanceCostPerHour) || 0) +
    (parseFloat(formData.depreciationPerHour) || 0);
  const overhead = directCosts * ((parseFloat(formData.overheadPercentage) || 0) / 100);
  const totalCostPerHour = directCosts + overhead;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome do Tarifário"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Tarifário Padrão 2025"
          required
        />
        <Select
          label="Tipo de Cobrança"
          value={formData.type}
          onChange={e => setFormData({ ...formData, type: e.target.value })}
          options={[
            { value: 'hourly', label: 'Por Hora' },
            { value: 'daily', label: 'Por Dia' },
            { value: 'weekly', label: 'Por Semana' },
          ]}
        />
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Custos Diretos (€/hora)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Operador"
            type="number"
            step="0.01"
            value={formData.operatorCostPerHour}
            onChange={e => setFormData({ ...formData, operatorCostPerHour: e.target.value })}
            placeholder="0.00"
            icon={Euro}
          />
          <Input
            label="Manutenção"
            type="number"
            step="0.01"
            value={formData.maintenanceCostPerHour}
            onChange={e => setFormData({ ...formData, maintenanceCostPerHour: e.target.value })}
            placeholder="0.00"
            icon={Euro}
          />
          <Input
            label="Depreciação"
            type="number"
            step="0.01"
            value={formData.depreciationPerHour}
            onChange={e => setFormData({ ...formData, depreciationPerHour: e.target.value })}
            placeholder="0.00"
            icon={Euro}
          />
          <Input
            label="Combustível (€/L)"
            type="number"
            step="0.01"
            value={formData.fuelCostPerLiter}
            onChange={e => setFormData({ ...formData, fuelCostPerLiter: e.target.value })}
            placeholder="0.00"
            icon={Euro}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Overhead e Margem</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Overhead (%)"
            type="number"
            step="0.1"
            value={formData.overheadPercentage}
            onChange={e => setFormData({ ...formData, overheadPercentage: e.target.value })}
            placeholder="15"
            hint="Custos indiretos (administrativo, seguros, etc.)"
          />
          <Input
            label="Taxa Base (€/hora)"
            type="number"
            step="0.01"
            value={formData.baseRate}
            onChange={e => setFormData({ ...formData, baseRate: e.target.value })}
            placeholder="0.00"
            icon={Euro}
            hint="Preço de venda ao cliente"
          />
        </div>
      </div>

      {/* Resumo de custos */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Resumo de Custos</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Custos Diretos</p>
            <p className="text-lg font-bold text-slate-900">€{directCosts.toFixed(2)}/h</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">+ Overhead</p>
            <p className="text-lg font-bold text-slate-900">€{overhead.toFixed(2)}/h</p>
          </div>
          <div className="bg-primary-50 rounded-lg p-2">
            <p className="text-xs text-primary-600">Custo Total</p>
            <p className="text-lg font-bold text-primary-700">€{totalCostPerHour.toFixed(2)}/h</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Guardar Tarifário
        </Button>
      </div>
    </form>
  );
};

const FinanceiroView = () => {
  const { activeView, machines, getFilteredSessions, tariffs, addTariff, updateTariff, deleteTariff } = useStore();
  const [activeTab, setActiveTab] = useState(
    activeView === 'financeiro-custos' ? 'costs' :
    activeView === 'financeiro-rentabilidade' ? 'profitability' : 'tariffs'
  );
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);

  const filteredSessions = getFilteredSessions();

  // Cálculos financeiros
  const financialData = useMemo(() => {
    const totalHours = filteredSessions
      .filter(s => s.status === 'CLOSED')
      .reduce((sum, s) => sum + (s.durationHours || 0), 0);

    // Custo médio por hora (baseado em tarifários ou estimativa)
    const avgCostPerHour = 45; // €/hora
    const avgRevenuePerHour = 65; // €/hora

    const totalCosts = totalHours * avgCostPerHour;
    const totalRevenue = totalHours * avgRevenuePerHour;
    const profit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Custos por categoria
    const fuelCosts = machines.reduce((sum, m) => {
      const machineSessions = filteredSessions.filter(s => s.machineId === m.id && s.status === 'CLOSED');
      const hours = machineSessions.reduce((h, s) => h + (s.durationHours || 0), 0);
      return sum + (m.consumptionRate || 0) * hours * 1.45; // €1.45/L diesel
    }, 0);

    const operatorCosts = totalHours * 15; // €15/h operador
    const maintenanceCosts = totalHours * 8; // €8/h manutenção
    const depreciationCosts = totalHours * 12; // €12/h depreciação
    const overheadCosts = totalCosts * 0.15; // 15% overhead

    return {
      totalHours: Math.round(totalHours),
      totalCosts: Math.round(totalCosts),
      totalRevenue: Math.round(totalRevenue),
      profit: Math.round(profit),
      margin: Math.round(margin * 10) / 10,
      fuelCosts: Math.round(fuelCosts),
      operatorCosts: Math.round(operatorCosts),
      maintenanceCosts: Math.round(maintenanceCosts),
      depreciationCosts: Math.round(depreciationCosts),
      overheadCosts: Math.round(overheadCosts),
    };
  }, [filteredSessions, machines]);

  // Dados para gráfico de evolução
  const trendData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return days.map((day, i) => ({
      name: day,
      receitas: 2500 + Math.random() * 2000,
      custos: 1800 + Math.random() * 1500,
      lucro: 700 + Math.random() * 500,
    }));
  }, []);

  // Dados para gráfico de distribuição de custos
  const costBreakdown = [
    { name: 'Combustível', value: financialData.fuelCosts, color: '#f59e0b' },
    { name: 'Operadores', value: financialData.operatorCosts, color: '#3b82f6' },
    { name: 'Manutenção', value: financialData.maintenanceCosts, color: '#10b981' },
    { name: 'Depreciação', value: financialData.depreciationCosts, color: '#6366f1' },
    { name: 'Overhead', value: financialData.overheadCosts, color: '#94a3b8' },
  ];

  const handleSaveTariff = async (tariffData) => {
    if (editingTariff) {
      await updateTariff(editingTariff.id, tariffData);
    } else {
      await addTariff(tariffData);
    }
    setShowTariffModal(false);
    setEditingTariff(null);
  };

  const handleEditTariff = (tariff) => {
    setEditingTariff(tariff);
    setShowTariffModal(true);
  };

  const handleDeleteTariff = async (tariffId) => {
    if (confirm('Eliminar este tarifário?')) {
      await deleteTariff(tariffId);
    }
  };

  // Exportar relatório financeiro
  const handleExportFinanceiro = () => {
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Receita Total', `€${financialData.totalRevenue.toLocaleString('pt-PT')}`],
      ['Custos Totais', `€${financialData.totalCosts.toLocaleString('pt-PT')}`],
      ['Lucro', `€${financialData.profit.toLocaleString('pt-PT')}`],
      ['Margem', `${financialData.margin}%`],
      ['Horas Totais', `${financialData.totalHours}h`],
      ['---', '---'],
      ['Custos Combustível', `€${financialData.fuelCosts.toLocaleString('pt-PT')}`],
      ['Custos Operadores', `€${financialData.operatorCosts.toLocaleString('pt-PT')}`],
      ['Custos Manutenção', `€${financialData.maintenanceCosts.toLocaleString('pt-PT')}`],
      ['Custos Depreciação', `€${financialData.depreciationCosts.toLocaleString('pt-PT')}`],
      ['Custos Overhead', `€${financialData.overheadCosts.toLocaleString('pt-PT')}`],
    ];
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const tabs = [
    { id: 'tariffs', label: 'Tarifários' },
    { id: 'costs', label: 'Análise de Custos' },
    { id: 'profitability', label: 'Rentabilidade' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão Financeira</h2>
          <p className="text-slate-500 mt-1">Tarifários, custos e rentabilidade</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Download} onClick={handleExportFinanceiro}>
            Exportar
          </Button>
          <Button icon={Plus} onClick={() => setShowTariffModal(true)}>
            Novo Tarifário
          </Button>
        </div>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Euro}
          title="Receita Total"
          value={financialData.totalRevenue.toLocaleString('pt-PT')}
          unit="€"
          color="primary"
          trend={8}
          trendLabel="vs mês anterior"
        />
        <StatCard
          icon={Wallet}
          title="Custos Totais"
          value={financialData.totalCosts.toLocaleString('pt-PT')}
          unit="€"
          color="amber"
          trend={-3}
          trendLabel="eficiência"
        />
        <StatCard
          icon={TrendingUp}
          title="Lucro"
          value={financialData.profit.toLocaleString('pt-PT')}
          unit="€"
          color="emerald"
          trend={15}
        />
        <StatCard
          icon={PieChart}
          title="Margem"
          value={financialData.margin}
          unit="%"
          color={financialData.margin >= 20 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Tabs */}
      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-6">
          {/* Tab: Tarifários */}
          {activeTab === 'tariffs' && (
            <div className="space-y-6">
              {tariffs.length === 0 ? (
                <EmptyState
                  icon={Calculator}
                  title="Sem tarifários configurados"
                  description="Configure tarifários para calcular custos e rentabilidade automaticamente."
                  actionLabel="Criar Tarifário"
                  onAction={() => setShowTariffModal(true)}
                />
              ) : (
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Header>Nome</Table.Header>
                      <Table.Header>Tipo</Table.Header>
                      <Table.Header align="right">Custo/Hora</Table.Header>
                      <Table.Header align="right">Taxa Base</Table.Header>
                      <Table.Header align="center">Estado</Table.Header>
                      <Table.Header align="right">Ações</Table.Header>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {tariffs.map(tariff => (
                      <Table.Row key={tariff.id}>
                        <Table.Cell>
                          <span className="font-medium">{tariff.name}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant="default">
                            {tariff.type === 'hourly' ? 'Hora' : tariff.type === 'daily' ? 'Dia' : 'Semana'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell align="right">
                          €{tariff.totalCostPerHour?.toFixed(2) || '0.00'}
                        </Table.Cell>
                        <Table.Cell align="right">
                          €{tariff.baseRate?.toFixed(2) || '0.00'}
                        </Table.Cell>
                        <Table.Cell align="center">
                          <Badge variant={tariff.active ? 'success' : 'default'} dot>
                            {tariff.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell align="right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="xs" icon={Edit2} onClick={() => handleEditTariff(tariff)} />
                            <Button variant="ghost" size="xs" icon={Trash2} onClick={() => handleDeleteTariff(tariff.id)} />
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}
            </div>
          )}

          {/* Tab: Análise de Custos */}
          {activeTab === 'costs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribuição de Custos */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribuição de Custos</h3>
                  <div className="space-y-3">
                    {costBreakdown.map(item => (
                      <div key={item.name} className="flex items-center gap-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-slate-600 flex-1">{item.name}</span>
                        <span className="text-sm font-medium text-slate-900">
                          €{item.value.toLocaleString('pt-PT')}
                        </span>
                        <span className="text-xs text-slate-500 w-12 text-right">
                          {financialData.totalCosts > 0
                            ? Math.round((item.value / financialData.totalCosts) * 100)
                            : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">Total</span>
                      <span className="font-bold text-lg text-slate-900">
                        €{financialData.totalCosts.toLocaleString('pt-PT')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gráfico de barras */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Custos por Categoria</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={costBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
                      <Tooltip
                        formatter={(value) => [`€${value.toLocaleString('pt-PT')}`, 'Custo']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {costBreakdown.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Rentabilidade */}
          {activeTab === 'profitability' && (
            <div className="space-y-6">
              {/* Gráfico de tendência */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Evolução Financeira</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#005EB8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#005EB8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      formatter={(value) => [`€${Math.round(value).toLocaleString('pt-PT')}`, '']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="receitas"
                      stroke="#005EB8"
                      strokeWidth={2}
                      fill="url(#colorReceitas)"
                      name="Receitas"
                    />
                    <Area
                      type="monotone"
                      dataKey="custos"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#colorCustos)"
                      name="Custos"
                    />
                    <Line
                      type="monotone"
                      dataKey="lucro"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Lucro"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Rentabilidade por equipamento */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Rentabilidade por Equipamento</h3>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Header>Equipamento</Table.Header>
                      <Table.Header align="right">Horas</Table.Header>
                      <Table.Header align="right">Receita</Table.Header>
                      <Table.Header align="right">Custo</Table.Header>
                      <Table.Header align="right">Lucro</Table.Header>
                      <Table.Header align="right">Margem</Table.Header>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {machines.slice(0, 5).map(machine => {
                      const machineSessions = filteredSessions.filter(
                        s => s.machineId === machine.id && s.status === 'CLOSED'
                      );
                      const hours = machineSessions.reduce((h, s) => h + (s.durationHours || 0), 0);
                      const revenue = hours * 65;
                      const cost = hours * 45;
                      const profit = revenue - cost;
                      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                      return (
                        <Table.Row key={machine.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                                <Truck className="w-4 h-4 text-primary-600" />
                              </div>
                              <span className="font-medium">{machine.name}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell align="right">{hours.toFixed(1)}h</Table.Cell>
                          <Table.Cell align="right">€{Math.round(revenue).toLocaleString('pt-PT')}</Table.Cell>
                          <Table.Cell align="right">€{Math.round(cost).toLocaleString('pt-PT')}</Table.Cell>
                          <Table.Cell align="right">
                            <span className={profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              €{Math.round(profit).toLocaleString('pt-PT')}
                            </span>
                          </Table.Cell>
                          <Table.Cell align="right">
                            <Badge variant={margin >= 20 ? 'success' : margin >= 10 ? 'warning' : 'danger'}>
                              {margin.toFixed(1)}%
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modal de Tarifário */}
      <Modal
        isOpen={showTariffModal}
        onClose={() => { setShowTariffModal(false); setEditingTariff(null); }}
        title={editingTariff ? 'Editar Tarifário' : 'Novo Tarifário'}
        description="Configure os custos e preços para o cálculo automático"
        size="lg"
      >
        <TariffForm
          tariff={editingTariff}
          onSave={handleSaveTariff}
          onCancel={() => { setShowTariffModal(false); setEditingTariff(null); }}
        />
      </Modal>
    </div>
  );
};

export default FinanceiroView;
