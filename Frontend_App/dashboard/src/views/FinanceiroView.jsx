import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Wallet,
  Euro,
  Plus,
  Edit2,
  Clock,
  Truck,
  History,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Download,
  ChevronRight,
} from 'lucide-react';
import useStore from '../store/useStore';
import { parseFirestoreTimestamp } from '../utils/dateUtils';
import { Card, StatCard, Button, Badge, Modal, Input, Select, Table, EmptyState } from '../components/ui';
import { formatCurrency, formatHours, formatNumber } from '../utils/formatters';

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200 dark:border-slate-700">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// Formulário de tarifário alinhado com o esquema do documento SISTEMA_TARIFARIOS.md
const MachineTariffForm = ({ machines, initialMachineId, onSave, onCancel }) => {
  const [machineId, setMachineId] = useState(initialMachineId || (machines?.length > 0 ? machines[0].id : ''));
  const [type, setType] = useState('MACHINE_ONLY');
  const [machineCost, setMachineCost] = useState('');
  const [operatorCost, setOperatorCost] = useState('');

  const total =
    (parseFloat(machineCost) || 0) +
    (type === 'MACHINE_AND_OPERATOR' ? parseFloat(operatorCost) || 0 : 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!machineId) return;
    onSave(machineId, { type, machineCostPerHour: parseFloat(machineCost) || 0, operatorCostPerHour: parseFloat(operatorCost) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Equipamento Alvo
        </label>
        <Select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          options={(machines || []).map(m => ({ value: m.id, label: m.name }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Tipo de Tarifário</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'MACHINE_ONLY', label: 'Só Máquina', sub: 'Combustível, desgaste, manutenção' },
            { value: 'MACHINE_AND_OPERATOR', label: 'Máquina + Operador', sub: 'Inclui salário e encargos' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                type === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600'
              }`}
            >
              <p className={`font-semibold text-sm ${type === opt.value ? 'text-primary-700' : 'text-slate-700 dark:text-slate-200'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${type === 'MACHINE_AND_OPERATOR' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <Input
          label="Custo Máquina (€/h)"
          type="number"
          step="0.01"
          min="0"
          value={machineCost}
          onChange={e => setMachineCost(e.target.value)}
          placeholder="Ex: 25.00"
          icon={Euro}
          required
        />
        {type === 'MACHINE_AND_OPERATOR' && (
          <Input
            label="Custo Operador (€/h)"
            type="number"
            step="0.01"
            min="0"
            value={operatorCost}
            onChange={e => setOperatorCost(e.target.value)}
            placeholder="Ex: 15.00"
            icon={Euro}
          />
        )}
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-primary-700">Total por hora</span>
        <span className="text-2xl font-bold text-primary-800">{formatCurrency(total)}/h</span>
      </div>

      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>O tarifário anterior será arquivado com a data de hoje. Sessões históricas mantêm o tarifário original.</span>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar Tarifário</Button>
      </div>
    </form>
  );
};

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = parseFirestoreTimestamp(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const FinanceiroView = () => {
  const { activeView, setActiveView, machines, getFilteredSessions, setMachineTariff } = useStore();

  // Derivar a tab activa DIRECTAMENTE do activeView — sem estado local
  const activeTab = activeView === 'financeiro-custos' ? 'costs' : 'tariffs';

  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [showTariffModal, setShowTariffModal] = useState(false);

  const filteredSessions = getFilteredSessions();

  // Máquina seleccionada (default para a primeira)
  const selectedMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId) || machines[0] || null;
  }, [machines, selectedMachineId]);

  // KPIs financeiros reais — calculados a partir de session.costs
  const financialData = useMemo(() => {
    const closed = filteredSessions.filter(s => s.status === 'CLOSED');
    const withCosts = closed.filter(s => s.costs);

    const totalCost = withCosts.reduce((sum, s) => sum + (s.costs.totalCost || 0), 0);
    const totalHours = closed.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const machineCost = withCosts.reduce((sum, s) => sum + (s.costs.breakdown?.machineCost || 0), 0);
    const operatorCost = withCosts.reduce((sum, s) => sum + (s.costs.breakdown?.operatorCost || 0), 0);
    const avgCostPerHour = withCosts.length > 0 ? totalCost / withCosts.reduce((h, s) => h + (s.costs.hours || 0), 0) : 0;

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      totalHours: Math.round(totalHours * 10) / 10,
      avgCostPerHour: Math.round(avgCostPerHour * 100) / 100,
      machineCost: Math.round(machineCost * 100) / 100,
      operatorCost: Math.round(operatorCost * 100) / 100,
      sessionsWithoutTariff: closed.filter(s => !s.costs).length,
      coverage: closed.length > 0 ? Math.round((withCosts.length / closed.length) * 100) : 0,
    };
  }, [filteredSessions]);

  // Dados de evolução mensal reais (de session.costs)
  const trendData = useMemo(() => {
    const map = {};
    filteredSessions
      .filter(s => s.status === 'CLOSED' && s.costs && s.startTime)
      .forEach(s => {
        const d = parseFirestoreTimestamp(s.startTime);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
        if (!map[key]) map[key] = { name: label, custos: 0, maquina: 0, operador: 0 };
        map[key].custos += s.costs.totalCost || 0;
        map[key].maquina += s.costs.breakdown?.machineCost || 0;
        map[key].operador += s.costs.breakdown?.operatorCost || 0;
      });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        name: v.name,
        custos: Math.round(v.custos),
        maquina: Math.round(v.maquina),
        operador: Math.round(v.operador),
      }));
  }, [filteredSessions]);

  // Custos reais por máquina
  const machineCostData = useMemo(() => {
    return machines
      .map(machine => {
        const machineSessions = filteredSessions.filter(
          s => s.machineId === machine.id && s.status === 'CLOSED'
        );
        const withCosts = machineSessions.filter(s => s.costs);
        const totalCost = withCosts.reduce((sum, s) => sum + (s.costs.totalCost || 0), 0);
        const hours = machineSessions.reduce((h, s) => h + (s.durationHours || 0), 0);
        const machineCost = withCosts.reduce((sum, s) => sum + (s.costs.breakdown?.machineCost || 0), 0);
        const opCost = withCosts.reduce((sum, s) => sum + (s.costs.breakdown?.operatorCost || 0), 0);
        return {
          machine,
          hours: Math.round(hours * 10) / 10,
          totalCost: Math.round(totalCost * 100) / 100,
          machineCost: Math.round(machineCost * 100) / 100,
          opCost: Math.round(opCost * 100) / 100,
          hasTariff: !!machine.currentTariff,
          sessionsCount: machineSessions.length,
        };
      })
      .filter(d => d.hours > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [machines, filteredSessions]);

  const handleSaveTariff = async (tariffMachineId, tariffData) => {
    if (!tariffMachineId) return;
    await setMachineTariff(tariffMachineId, tariffData);
    setShowTariffModal(false);
  };

  const handleExport = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Custo Total Real', formatCurrency(financialData.totalCost)],
      ['Total de Horas', formatHours(financialData.totalHours)],
      ['Custo Médio/Hora', `${formatCurrency(financialData.avgCostPerHour)}/h`],
      ['Custo Máquina', formatCurrency(financialData.machineCost)],
      ['Custo Operador', formatCurrency(financialData.operatorCost)],
      ['Cobertura Tarifária', `${financialData.coverage}%`],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `custos_reais_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const tabs = [
    { id: 'tariffs', label: 'Tarifários por Máquina' },
    { id: 'costs', label: 'Evolução de Custos' },
    { id: 'machines', label: 'Custos por Equipamento' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão Financeira</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tarifários versionados e custos reais por sessão</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExport}>
          Exportar
        </Button>
      </div>

      {/* KPIs — dados reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Euro}
          title="Custo Total Real"
          value={formatNumber(financialData.totalCost, 2)}
          unit="€"
          color="primary"
        />
        <StatCard
          icon={Clock}
          title="Total de Horas"
          value={formatNumber(financialData.totalHours, 1)}
          unit="h"
          color="sky"
        />
        <StatCard
          icon={Wallet}
          title="Custo Médio/Hora"
          value={financialData.avgCostPerHour.toFixed(2)}
          unit="€/h"
          color="amber"
        />
        <StatCard
          icon={financialData.sessionsWithoutTariff > 0 ? AlertCircle : CheckCircle2}
          title="Cobertura Tarifária"
          value={financialData.coverage}
          unit="%"
          color={financialData.coverage === 100 ? 'emerald' : financialData.coverage >= 70 ? 'amber' : 'red'}
          trendLabel={financialData.sessionsWithoutTariff > 0 ? `${financialData.sessionsWithoutTariff} sess. sem tarifário` : 'Cobertura total'}
        />
      </div>

      {/* Tabs */}
      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveView(id === 'costs' ? 'financeiro-custos' : 'financeiro-tarifarios')} />

        <div className="p-6">

          {/* ---- TAB: TARIFÁRIOS POR MÁQUINA ---- */}
          {activeTab === 'tariffs' && (
            <div className="space-y-6">
              {machines.length === 0 ? (
                <EmptyState icon={Truck} title="Sem máquinas registadas" description="Adicione máquinas para configurar tarifários." />
              ) : (
                <>
                  {/* Selector de máquina */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <Select
                        label="Selecionar Máquina"
                        value={selectedMachine?.id || ''}
                        onChange={e => setSelectedMachineId(e.target.value)}
                        options={machines.filter(m => m && m.id && m.name).map(m => ({
                          value: m.id,
                          label: `${m.name}${m.currentTariff ? ` — ${formatCurrency(m.currentTariff.totalCostPerHour || 0)}/h` : ' — sem tarifário'}`,
                        }))}
                      />
                    </div>
                    {selectedMachine && (
                      <div className="sm:pt-6">
                        <Button icon={Plus} onClick={() => setShowTariffModal(true)}>
                          Novo Tarifário
                        </Button>
                      </div>
                    )}
                  </div>

                  {selectedMachine && (
                    <div className="space-y-5">
                      {/* Tarifário Atual */}
                      {selectedMachine.currentTariff ? (
                        <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-sky-50 p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Tarifário Atual</p>
                              <p className="text-3xl font-bold text-primary-900 mt-1">
                                €{selectedMachine.currentTariff.totalCostPerHour.toFixed(2)}
                                <span className="text-base font-normal text-primary-600">/hora</span>
                              </p>
                            </div>
                            <Badge variant={selectedMachine.currentTariff.type === 'MACHINE_AND_OPERATOR' ? 'primary' : 'default'}>
                              {selectedMachine.currentTariff.type === 'MACHINE_AND_OPERATOR' ? 'Máquina + Operador' : 'Só Máquina'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Custo Máquina</p>
                              <p className="font-semibold text-slate-800">{formatCurrency(selectedMachine.currentTariff.machineCostPerHour)}/h</p>
                            </div>
                            {selectedMachine.currentTariff.type === 'MACHINE_AND_OPERATOR' && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Custo Operador</p>
                                <p className="font-semibold text-slate-800">{formatCurrency(selectedMachine.currentTariff.operatorCostPerHour)}/h</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Válido desde</p>
                              <p className="font-semibold text-slate-800">{formatDate(selectedMachine.currentTariff.validFrom)}</p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-primary-200">
                            <button
                              onClick={() => setShowTariffModal(true)}
                              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Substituir por novo tarifário
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center">
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="font-medium text-amber-800">Sem tarifário definido</p>
                          <p className="text-sm text-amber-600 mt-1 mb-4">As sessões desta máquina não terão custo calculado no backend.</p>
                          <Button size="sm" icon={Plus} onClick={() => setShowTariffModal(true)}>
                            Definir Tarifário
                          </Button>
                        </div>
                      )}

                      {/* Histórico de Tarifários */}
                      {selectedMachine.tariffHistory && selectedMachine.tariffHistory.length > 0 ? (
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                            <History className="w-4 h-4" />
                            Histórico de Tarifários
                          </h3>
                          <Table>
                            <Table.Head>
                              <Table.Row>
                                <Table.Header>Tipo</Table.Header>
                                <Table.Header align="right">Total/h</Table.Header>
                                <Table.Header align="right">Máquina/h</Table.Header>
                                <Table.Header align="right">Operador/h</Table.Header>
                                <Table.Header>Válido de</Table.Header>
                                <Table.Header>Válido até</Table.Header>
                                <Table.Header align="center">Estado</Table.Header>
                              </Table.Row>
                            </Table.Head>
                            <Table.Body>
                              {[...selectedMachine.tariffHistory]
                                .sort((a, b) => {
                                  const aMs = a.validFrom?.toMillis?.() ?? 0;
                                  const bMs = b.validFrom?.toMillis?.() ?? 0;
                                  return bMs - aMs;
                                })
                                .map(t => {
                                  const isCurrent = t.id === selectedMachine.currentTariff?.id;
                                  return (
                                    <Table.Row key={t.id}>
                                      <Table.Cell>
                                        <Badge variant={t.type === 'MACHINE_AND_OPERATOR' ? 'primary' : 'default'} size="sm">
                                          {t.type === 'MACHINE_AND_OPERATOR' ? 'M+O' : 'Máquina'}
                                        </Badge>
                                      </Table.Cell>
                                      <Table.Cell align="right">
                                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(t.totalCostPerHour)}</span>
                                      </Table.Cell>
                                      <Table.Cell align="right">{formatCurrency(t.machineCostPerHour)}</Table.Cell>
                                      <Table.Cell align="right">{formatCurrency(t.operatorCostPerHour)}</Table.Cell>
                                      <Table.Cell className="text-xs text-slate-500 dark:text-slate-400">{formatDate(t.validFrom)}</Table.Cell>
                                      <Table.Cell className="text-xs text-slate-500 dark:text-slate-400">
                                        {t.validUntil ? formatDate(t.validUntil) : '—'}
                                      </Table.Cell>
                                      <Table.Cell align="center">
                                        <Badge variant={isCurrent ? 'success' : 'default'} dot size="sm">
                                          {isCurrent ? 'Atual' : 'Arquivado'}
                                        </Badge>
                                      </Table.Cell>
                                    </Table.Row>
                                  );
                                })}
                            </Table.Body>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-4">Sem histórico de tarifários para esta máquina.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---- TAB: EVOLUÇÃO DE CUSTOS ---- */}
          {activeTab === 'costs' && (
            <div className="space-y-6">
              {financialData.sessionsWithoutTariff > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{financialData.sessionsWithoutTariff}</strong> sessões fechadas sem tarifário definido.
                    Configure tarifários nas máquinas para cobertura total.
                  </span>
                </div>
              )}

              {trendData.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Sem dados de custos reais"
                  description="Os custos serão calculados automaticamente pelo backend quando as sessões forem fechadas com tarifário definido."
                />
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Evolução Mensal de Custos Reais</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="gCustos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#005EB8" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#005EB8" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gMaquina" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={v => `€${v}`} />
                        <Tooltip
                          formatter={(value, name) => [
                            formatCurrency(value),
                            name === 'custos' ? 'Total' : name === 'maquina' ? 'Máquina' : 'Operador',
                          ]}
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Area type="monotone" dataKey="custos" stroke="#005EB8" strokeWidth={2} fill="url(#gCustos)" name="custos" />
                        <Area type="monotone" dataKey="maquina" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gMaquina)" name="maquina" strokeDasharray="4 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Breakdown global */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Custo Máquina', value: financialData.machineCost, color: '#f59e0b' },
                      { label: 'Custo Operador', value: financialData.operatorCost, color: '#3b82f6' },
                      { label: 'Total Real', value: financialData.totalCost, color: '#005EB8', bold: true },
                    ].map(item => (
                      <div
                        key={item.label}
                        className={`rounded-xl p-4 ${item.bold ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${item.bold ? 'text-primary-800' : 'text-slate-800'}`}>
                          {formatCurrency(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---- TAB: CUSTOS POR EQUIPAMENTO ---- */}
          {activeTab === 'machines' && (
            <div className="space-y-4">
              {machineCostData.length === 0 ? (
                <EmptyState
                  icon={Truck}
                  title="Sem dados de custos"
                  description="Os custos aparecerão aqui após sessões fechadas com tarifário definido."
                />
              ) : (
                <>
                  {/* Gráfico de barras */}
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={machineCostData.slice(0, 8)} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={v => `€${v}`} />
                      <YAxis
                        type="category"
                        dataKey="machine.name"
                        stroke="#94a3b8"
                        fontSize={11}
                        width={100}
                        tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(value), 'Custo Total']}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                        {machineCostData.slice(0, 8).map((entry, i) => (
                          <Cell key={i} fill={entry.hasTariff ? '#005EB8' : '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tabela detalhada */}
                  <Table>
                    <Table.Head>
                      <Table.Row>
                        <Table.Header>Equipamento</Table.Header>
                        <Table.Header align="right">Horas</Table.Header>
                        <Table.Header align="right">Custo Máquina</Table.Header>
                        <Table.Header align="right">Custo Operador</Table.Header>
                        <Table.Header align="right">Total Real</Table.Header>
                        <Table.Header align="center">Tarifário</Table.Header>
                      </Table.Row>
                    </Table.Head>
                    <Table.Body>
                      {machineCostData.map(({ machine, hours, totalCost, machineCost: mc, opCost, hasTariff }) => (
                        <Table.Row key={machine.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                                <Truck className="w-4 h-4 text-primary-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{machine.name || 'Sem Nome'}</p>
                                {machine.currentTariff && (
                                  <p className="text-xs text-slate-400">{formatCurrency(machine.currentTariff.totalCostPerHour)}/h atual</p>
                                )}
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell align="right">{formatHours(hours)}</Table.Cell>
                          <Table.Cell align="right">{formatCurrency(mc)}</Table.Cell>
                          <Table.Cell align="right">{formatCurrency(opCost)}</Table.Cell>
                          <Table.Cell align="right">
                            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalCost)}</span>
                          </Table.Cell>
                          <Table.Cell align="center">
                            <Badge variant={hasTariff ? 'success' : 'warning'} dot size="sm">
                              {hasTariff ? 'Definido' : 'Em falta'}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Modal: Novo Tarifário */}
      <Modal
        isOpen={showTariffModal}
        onClose={() => setShowTariffModal(false)}
        title="Novo Tarifário"
        description="O tarifário anterior será arquivado automaticamente com a data de hoje."
        size="md"
      >
        <MachineTariffForm
          machines={machines}
          initialMachineId={selectedMachineId}
          onSave={handleSaveTariff}
          onCancel={() => setShowTariffModal(false)}
        />
      </Modal>
    </div>
  );
};

export default FinanceiroView;
