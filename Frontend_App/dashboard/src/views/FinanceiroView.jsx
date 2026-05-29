import React, { useMemo } from 'react';
import {
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
  AlertTriangle,
  Building2,
  Download,
  Euro,
  PackageOpen,
  Wrench,
} from 'lucide-react';
import useStore from '../store/useStore';
import { parseFirestoreTimestamp } from '../utils/dateUtils';
import { Card, StatCard, Button, Badge, Table, EmptyState } from '../components/ui';
import { formatCurrency } from '../utils/formatters';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_COLORS = ['#005EB8', '#0f766e', '#d97706', '#b91c1c', '#475569', '#4338ca'];

const parseOptionalTimestamp = (timestamp) => {
  if (!timestamp) return null;
  const parsed = parseFirestoreTimestamp(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDaysOpen = (session) => {
  const start = parseOptionalTimestamp(session?.startTime);
  if (!start) return null;
  const end = parseOptionalTimestamp(session?.endTime) || new Date();
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY_MS));
};

const statusLabel = (row) => {
  if (row.status === 'LOST' || row.toolStatus === 'LOST') return 'Perdida';
  if (row.daysOpen >= row.lostDays) return 'Presumida perdida';
  return 'Atrasada';
};

const FinanceiroView = () => {
  const {
    tools = [],
    toolSessions = [],
    systemSettings = {},
  } = useStore();

  const overdueDays = systemSettings.toolOverdueDays ?? 7;
  const lostDays = systemSettings.toolLostDays ?? 30;

  const {
    fleetValue,
    openValue,
    lostValue,
    topObra,
    riskRows,
    valueByObra,
  } = useMemo(() => {
    const toolsById = new Map((tools || []).map((tool) => [tool.id, tool]));
    const replacementValue = (tool) => tool?.replacementCost ?? 0;
    const sessionFallbackValue = (session) => session?.costs?.total ?? session?.costs?.totalCost ?? 0;

    const openToolIds = new Set();
    const lostToolIds = new Set();
    const obraToolValues = new Map();
    const riskByKey = new Map();

    (toolSessions || []).forEach((session) => {
      const tool = toolsById.get(session.toolId);
      const value = replacementValue(tool);
      const estimatedValue = value || sessionFallbackValue(session);
      const daysOpen = getDaysOpen(session);
      const isOpen = session.status === 'OPEN';
      const isLost = session.status === 'LOST' || tool?.status === 'LOST';
      const isOverdue = isOpen && daysOpen !== null && daysOpen >= overdueDays;

      if (isOpen && session.toolId) {
        openToolIds.add(session.toolId);
        const obraId = session.obraId || tool?.currentObraId || 'sem_obra';
        const existing = obraToolValues.get(obraId) || {
          obraId,
          obraName: session.obraName || tool?.currentObraName || 'Sem obra',
          toolIds: new Set(),
          value: 0,
        };

        if (!existing.toolIds.has(session.toolId)) {
          existing.toolIds.add(session.toolId);
          existing.value += value;
        }
        obraToolValues.set(obraId, existing);
      }

      if (isLost && session.toolId) lostToolIds.add(session.toolId);

      if ((isOverdue || isLost) && session.toolId) {
        const key = `${session.id || session.toolId}:${session.status || 'OPEN'}`;
        riskByKey.set(key, {
          id: key,
          toolId: session.toolId,
          toolName: session.toolName || tool?.name || 'Equipamento sem nome',
          obraName: session.obraName || tool?.currentObraName || 'Sem obra',
          operatorName: session.operatorName || 'Sem operador',
          daysOpen,
          estimatedValue,
          status: session.status,
          toolStatus: tool?.status,
          lostDays,
        });
      }
    });

    (tools || []).forEach((tool) => {
      if (tool.status === 'LOST') {
        lostToolIds.add(tool.id);
        const alreadyListed = [...riskByKey.values()].some((row) => row.toolId === tool.id);
        if (!alreadyListed) {
          riskByKey.set(`tool:${tool.id}`, {
            id: `tool:${tool.id}`,
            toolId: tool.id,
            toolName: tool.name || 'Equipamento sem nome',
            obraName: tool.currentObraName || 'Sem obra',
            operatorName: 'Sem operador',
            daysOpen: null,
            estimatedValue: replacementValue(tool),
            status: 'LOST',
            toolStatus: tool.status,
            lostDays,
          });
        }
      }
    });

    const fleetValue = (tools || []).reduce((sum, tool) => sum + replacementValue(tool), 0);
    const openValue = [...openToolIds].reduce((sum, toolId) => sum + replacementValue(toolsById.get(toolId)), 0);
    const lostValue = [...lostToolIds].reduce((sum, toolId) => sum + replacementValue(toolsById.get(toolId)), 0);
    const valueByObra = [...obraToolValues.values()]
      .map(({ obraName, value }) => ({ name: obraName, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      fleetValue,
      openValue,
      lostValue,
      topObra: valueByObra[0] || { name: 'Sem obra', value: 0 },
      riskRows: [...riskByKey.values()].sort((a, b) => b.estimatedValue - a.estimatedValue),
      valueByObra,
    };
  }, [tools, toolSessions, overdueDays, lostDays]);

  const handleExport = () => {
    const rows = [
      ['Metrica', 'Valor'],
      ['Valor fora do armazem', formatCurrency(openValue)],
      ['Custo de perdidas', formatCurrency(lostValue)],
      ['Top obra por valor imobilizado', `${topObra.name} (${formatCurrency(topObra.value)})`],
      ['Valor total da frota', formatCurrency(fleetValue)],
    ];
    const csv = rows.map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `valor_imobilizado_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Valor Imobilizado &amp; Perdas</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quanto vale o que está fora do armazém</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Visão financeira dos equipamentos em obra, em atraso e declarados perdidos.
          </p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExport}>
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PackageOpen}
          title="Valor fora do armazém"
          value={openValue}
          unit="€"
          color="primary"
        />
        <StatCard
          icon={AlertTriangle}
          title="Custo de perdidas"
          value={lostValue}
          unit="€"
          color="red"
          trendLabel={`${riskRows.filter((row) => row.status === 'LOST' || row.toolStatus === 'LOST').length} registos`}
        />
        <StatCard
          icon={Building2}
          title="Top obra por valor imobilizado"
          value={topObra.name}
          color="amber"
          trendLabel={formatCurrency(topObra.value)}
        />
        <StatCard
          icon={Euro}
          title="Valor total da frota"
          value={fleetValue}
          unit="€"
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Valor imobilizado por obra</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Equipamentos com sessão aberta</p>
            </div>
            <Badge variant="default" size="sm">{valueByObra.length} obras</Badge>
          </div>

          {valueByObra.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Sem valor imobilizado"
              description="Não existem sessões abertas para distribuir por obra."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={valueByObra} layout="vertical" margin={{ left: 12, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `€${value}`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={112}
                  tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Valor imobilizado']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {valueByObra.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="xl:col-span-3">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Em risco</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sessões com mais de {overdueDays} dias ou equipamentos perdidos, ordenados por valor.
              </p>
            </div>
            <Badge variant={riskRows.length > 0 ? 'warning' : 'success'} size="sm">
              {riskRows.length} registos
            </Badge>
          </div>

          <Table minWidth={760}>
            <Table.Head>
              <Table.Row>
                <Table.Header>Equipamento</Table.Header>
                <Table.Header>Obra</Table.Header>
                <Table.Header>Operador</Table.Header>
                <Table.Header align="right">Dias aberta</Table.Header>
                <Table.Header align="right">Valor estimado</Table.Header>
                <Table.Header align="center">Estado</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {riskRows.length === 0 ? (
                <Table.Empty icon={Wrench} message="Sem equipamentos em risco." />
              ) : (
                riskRows.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>
                      <span className="font-medium text-slate-900 dark:text-white">{row.toolName}</span>
                    </Table.Cell>
                    <Table.Cell>{row.obraName}</Table.Cell>
                    <Table.Cell>{row.operatorName}</Table.Cell>
                    <Table.Cell align="right">{row.daysOpen ?? '-'}</Table.Cell>
                    <Table.Cell align="right">
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(row.estimatedValue)}</span>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <Badge
                        variant={statusLabel(row) === 'Perdida' || statusLabel(row) === 'Presumida perdida' ? 'danger' : 'warning'}
                        size="sm"
                        dot
                      >
                        {statusLabel(row)}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default FinanceiroView;
