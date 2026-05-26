import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Eye,
  MapPinOff,
  Search,
  UserX,
  Wrench,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Modal, Table, EmptyState } from '../components/ui';
import { detectToolSessionAnomalies, resolveTimestamp } from '../utils/sessionHelpers';

const DAY_MS = 24 * 60 * 60 * 1000;

function detectQualityIssues(s) { const issues = []; if (!s.operatorId) issues.push('NO_OPERATOR'); if (s.status === 'OPEN' && !s.location) issues.push('NO_LOCATION'); issues.push(...detectToolSessionAnomalies(s)); return issues; }

const ISSUE_CONFIG = {
  TOOL_PRESUMED_LOST: {
    label: 'Ferramenta presumivelmente perdida',
    shortLabel: 'Presumida perdida',
    variant: 'danger',
    severity: 4,
  },
  TOOL_OVERDUE: {
    label: 'Checkout em atraso',
    shortLabel: 'Atrasada',
    variant: 'warning',
    severity: 3,
  },
  NO_LOCATION: {
    label: 'Sem GPS no checkout aberto',
    shortLabel: 'Sem GPS',
    variant: 'info',
    severity: 2,
  },
  NO_OPERATOR: {
    label: 'Operador desconhecido',
    shortLabel: 'Operador desconhecido',
    variant: 'default',
    severity: 1,
  },
};

const toValidDate = (value) => {
  const date = resolveTimestamp(value);
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getDaysOpen = (session) => {
  if (session?.status !== 'OPEN') return 0;
  const start = toValidDate(session?.startTime);
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / DAY_MS));
};

const findTool = (tools, session) =>
  tools.find(tool => tool.id === session?.toolId);

const findOperator = (operators, session) =>
  operators.find(operator =>
    operator.id === session?.operatorId ||
    operator.cardId === session?.operatorId ||
    operator.rfidCard === session?.operatorId
  );

const displayName = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.name || value.displayName || fallback;
};

const getToolName = (tool, session) =>
  displayName(tool?.name, null) || session?.toolName || session?.toolId || 'Ferramenta sem nome';

const getOperatorName = (operator, session) =>
  operator?.name || session?.operatorName || session?.operatorId || 'Operador desconhecido';

const getObraName = (session) =>
  session?.obraName || session?.obraId || session?.location?.workName || session?.location?.workId || '-';

const getPrimaryIssue = (issues) =>
  [...issues].sort((a, b) => (ISSUE_CONFIG[b]?.severity || 0) - (ISSUE_CONFIG[a]?.severity || 0))[0];

const hasPresumedLostIssue = (session) =>
  session?.status === 'OPEN' && (
    getDaysOpen(session) >= 30 ||
    detectToolSessionAnomalies(session).includes('TOOL_PRESUMED_LOST')
  );

const QualityDetailsModal = ({ session, tool, operator, issues, onClose }) => {
  if (!session) return null;

  const startTime = toValidDate(session.startTime);
  const endTime = toValidDate(session.endTime);
  const daysOpen = getDaysOpen(session);

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{getToolName(tool, session)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Checkout {session.status || '-'} · {getObraName(session)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Operador</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{getOperatorName(operator, session)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Obra</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{getObraName(session)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Inicio</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {startTime
                ? `${startTime.toLocaleDateString('pt-PT')} ${startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fim</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {endTime
                ? `${endTime.toLocaleDateString('pt-PT')} ${endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                : 'Em aberto'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Dias aberta</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{daysOpen}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">GPS</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {session.location ? 'Registado' : 'Sem GPS'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Anomalias detectadas</p>
        <div className="flex flex-wrap gap-2">
          {issues.map(issue => (
            <Badge key={issue} variant={ISSUE_CONFIG[issue]?.variant || 'default'}>
              {ISSUE_CONFIG[issue]?.label || issue}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
};

const QualidadeView = () => {
  const {
    toolSessions = [],
    tools = [],
    operators = [],
    getOverdueTools,
  } = useStore();
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const issueRows = useMemo(() => {
    const normalized = toolSessions.map(session => {
      const tool = findTool(tools, session);
      const operator = findOperator(operators, session);
      const issues = detectQualityIssues(session);
      const primaryIssue = getPrimaryIssue(issues);

      return {
        session,
        tool,
        operator,
        issues,
        primaryIssue,
        severity: ISSUE_CONFIG[primaryIssue]?.severity || 0,
        daysOpen: getDaysOpen(session),
        toolName: getToolName(tool, session),
        operatorName: getOperatorName(operator, session),
        obraName: getObraName(session),
      };
    }).filter(row => row.issues.length > 0);

    const filtered = searchTerm
      ? normalized.filter(row => {
        const term = searchTerm.toLowerCase();
        return (
          row.toolName.toLowerCase().includes(term) ||
          row.operatorName.toLowerCase().includes(term) ||
          row.obraName.toLowerCase().includes(term) ||
          row.issues.some(issue => (ISSUE_CONFIG[issue]?.label || issue).toLowerCase().includes(term))
        );
      })
      : normalized;

    return filtered.sort((a, b) =>
      b.severity - a.severity ||
      b.daysOpen - a.daysOpen ||
      a.toolName.localeCompare(b.toolName, 'pt-PT')
    );
  }, [toolSessions, tools, operators, searchTerm]);

  const overdueCount = useMemo(() => {
    if (typeof getOverdueTools !== 'function') return 0;
    return getOverdueTools(7)
      .filter(session => !detectToolSessionAnomalies(session).includes('TOOL_PRESUMED_LOST'))
      .length;
  }, [getOverdueTools, toolSessions]);

  const presumedLostCount = useMemo(
    () => toolSessions.filter(hasPresumedLostIssue).length,
    [toolSessions]
  );

  const missingGpsCount = useMemo(
    () => toolSessions.filter(session => session.status === 'OPEN' && !session.location).length,
    [toolSessions]
  );

  const unknownOperatorCount = useMemo(
    () => toolSessions.filter(session => !session.operatorId).length,
    [toolSessions]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            Validações Operacionais / Auditoria
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Anomalias e integridade dos checkouts
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Auditoria de ferramentas em checkout com atraso, perda presumida, GPS em falta ou operador desconhecido.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          title="TOOL_OVERDUE"
          value={overdueCount}
          color={overdueCount > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          icon={AlertTriangle}
          title="TOOL_PRESUMED_LOST"
          value={presumedLostCount}
          color={presumedLostCount > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={MapPinOff}
          title="Sem GPS"
          value={missingGpsCount}
          color={missingGpsCount > 0 ? 'primary' : 'emerald'}
        />
        <StatCard
          icon={UserX}
          title="Operador desconhecido"
          value={unknownOperatorCount}
          color={unknownOperatorCount > 0 ? 'slate' : 'emerald'}
        />
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por ferramenta, operador, obra ou anomalia..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="p-6">
          {issueRows.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Sem anomalias de checkouts"
              description="Não há ferramentas com problemas de atraso, perda presumida, GPS em falta ou operador desconhecido."
            />
          ) : (
            <Table minWidth={860}>
              <Table.Head>
                <Table.Row>
                  <Table.Header>Ferramenta</Table.Header>
                  <Table.Header>Operador</Table.Header>
                  <Table.Header>Obra</Table.Header>
                  <Table.Header align="right">Dias aberta</Table.Header>
                  <Table.Header align="center">Anomalia</Table.Header>
                  <Table.Header align="right">Ação</Table.Header>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {issueRows.map(row => {
                  const config = ISSUE_CONFIG[row.primaryIssue] || {
                    label: row.primaryIssue,
                    shortLabel: row.primaryIssue,
                    variant: 'default',
                  };

                  return (
                    <Table.Row key={row.session.id || `${row.session.toolId}-${row.session.startTime}`} onClick={() => setSelectedRow(row)}>
                      <Table.Cell>
                        <div className="font-medium text-slate-900 dark:text-white">{row.toolName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.session.toolId || '-'}</div>
                      </Table.Cell>
                      <Table.Cell>{row.operatorName}</Table.Cell>
                      <Table.Cell>{row.obraName}</Table.Cell>
                      <Table.Cell align="right">
                        <span className={row.daysOpen >= 30 ? 'font-semibold text-red-600 dark:text-red-400' : 'font-medium'}>
                          {row.daysOpen}
                        </span>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <Badge variant={config.variant} size="sm">
                          {config.shortLabel}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell align="right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={event => {
                            event.stopPropagation();
                            setSelectedRow(row);
                          }}
                        >
                          Ver
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </div>
      </Card>

      <Modal
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title="Detalhes do checkout"
        description="Revisão segura dos dados operacionais da ferramenta"
        size="lg"
      >
        <QualityDetailsModal
          session={selectedRow?.session}
          tool={selectedRow?.tool}
          operator={selectedRow?.operator}
          issues={selectedRow?.issues || []}
          onClose={() => setSelectedRow(null)}
        />
      </Modal>
    </div>
  );
};

export default QualidadeView;
