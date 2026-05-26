/**
 * Sessões Corrigidas View - Para supervisores
 * CASAIS Fleet Intelligence
 *
 * Mostra:
 * - Alertas pendentes de validação (com níveis de escalação)
 * - Histórico de sessões validadas/corrigidas
 * - Audit trail completo para conformidade ISO
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  Edit3,
  AlertTriangle,
  Search,
  Download,
  Eye,
  X,
  FileText,
  Building2,
  User,
  Package,
  Calendar,
  Timer,
  History,
  Mail,
  RefreshCw,
  AlertCircle,
  Bell,
} from 'lucide-react';
import useAlertsStore, { ALERT_TYPES, ALERT_STATUS, ESCALATION_THRESHOLDS } from '../store/useAlertsStore';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, Table, EmptyState, Skeleton } from '../components/ui';

// Formatar data para exibição
const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Formatar duração
const formatDuration = (hours) => {
  if (!hours && hours !== 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

// Formatar horas pendentes
const formatHoursPending = (hours) => {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return `${days}d ${remainingHours}h`;
};

// Badge para tipo de alerta
const AlertTypeBadge = ({ type }) => {
  const config = {
    [ALERT_TYPES.AUTO_CLOSE]: {
      label: 'Auto-Fecho',
      variant: 'error',
      icon: AlertTriangle,
    },
    [ALERT_TYPES.LONG_SESSION]: {
      label: 'Sessão Longa',
      variant: 'warning',
      icon: Timer,
    },
    [ALERT_TYPES.MAINTENANCE]: {
      label: 'Manutenção',
      variant: 'info',
      icon: Clock,
    },
  };

  const { label, variant, icon: Icon } = config[type] || {
    label: type,
    variant: 'secondary',
    icon: AlertTriangle,
  };

  return (
    <Badge variant={variant} size="sm" className="inline-flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

// Badge para status
const StatusBadge = ({ status }) => {
  const config = {
    [ALERT_STATUS.VALIDATED]: { label: 'Validado', variant: 'success' },
    [ALERT_STATUS.CORRECTED]: { label: 'Corrigido', variant: 'warning' },
    [ALERT_STATUS.PENDING]: { label: 'Pendente', variant: 'secondary' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

// Badge para nível de escalação
const EscalationBadge = ({ level, hoursPending }) => {
  const config = {
    urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
    critical: { label: 'Crítico', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Bell },
    warning: { label: 'Atenção', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    normal: { label: 'Normal', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  };

  const { label, color, icon: Icon } = config[level] || config.normal;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}>
      <Icon className="w-3 h-3" />
      {label} ({formatHoursPending(hoursPending)})
    </span>
  );
};

// Tab Navigation
const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
        }`}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
            activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
          } ${tab.urgent ? 'bg-red-100 text-red-700' : ''}`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// Card de Alerta Pendente
const PendingAlertCard = ({ alert, onResendEmail, onViewDetails }) => {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    await onResendEmail(alert.id);
    setResending(false);
  };

  const escalationColors = {
    urgent: 'border-l-red-500 bg-red-50/50',
    critical: 'border-l-orange-500 bg-orange-50/50',
    warning: 'border-l-amber-500 bg-amber-50/50',
    normal: 'border-l-slate-300 bg-white',
  };

  return (
    <div className={`p-4 border border-slate-200 border-l-4 rounded-lg ${escalationColors[alert.escalationLevel]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            alert.escalationLevel === 'urgent' ? 'bg-red-100' :
            alert.escalationLevel === 'critical' ? 'bg-orange-100' :
            'bg-amber-100'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${
              alert.escalationLevel === 'urgent' ? 'text-red-600' :
              alert.escalationLevel === 'critical' ? 'text-orange-600' :
              'text-amber-600'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">{alert.machineName}</h3>
              <AlertTypeBadge type={alert.type} />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {alert.operatorName}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {alert.obraName || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <EscalationBadge level={alert.escalationLevel} hoursPending={alert.hoursPending} />
              {alert.emailResendCount > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (email enviado {alert.emailResendCount + 1}x)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'A enviar...' : 'Reenviar Email'}
          </Button>
          <button
            onClick={() => onViewDetails(alert)}
            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
        <div className="text-slate-500 dark:text-slate-400">
          Criado: {formatDateTime(alert.createdAt)}
        </div>
        <div className="text-slate-600">
          Duração original: <strong>{formatDuration(alert.originalDurationHours)}</strong>
        </div>
      </div>
    </div>
  );
};

// Modal de detalhes do alerta
const AlertDetailModal = ({ alert, onClose }) => {
  if (!alert) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Detalhes do Alerta</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ID: {alert.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info da Sessão */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                <Package className="w-4 h-4" />
                Equipamento
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{alert.toolName || alert.machineName}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                <User className="w-4 h-4" />
                Operador
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{alert.operatorName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{alert.operatorEmail}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                <Building2 className="w-4 h-4" />
                Obra
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{alert.obraName || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Data
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {formatDateTime(alert.originalStartTime)?.split(',')[0]}
              </p>
            </div>
          </div>

          {/* Tipo e Status */}
          <div className="flex items-center gap-4">
            <AlertTypeBadge type={alert.type} />
            <StatusBadge status={alert.status} />
            {alert.escalationLevel && (
              <EscalationBadge level={alert.escalationLevel} hoursPending={alert.hoursPending || 0} />
            )}
          </div>

          {/* Comparação de Horários */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Comparação de Horários
              </h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Campo</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Original</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Corrigido</p>
                </div>

                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">Início</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    {formatDateTime(alert.originalStartTime)?.split(',')[1]?.trim()}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    alert.correctedStartTime ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {alert.correctedStartTime
                      ? new Date(alert.correctedStartTime).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </p>
                </div>

                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">Fim</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    {formatDateTime(alert.originalEndTime)?.split(',')[1]?.trim()}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    alert.correctedEndTime ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {alert.correctedEndTime
                      ? new Date(alert.correctedEndTime).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </p>
                </div>

                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">Duração</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    {formatDuration(alert.originalDurationHours)}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    alert.correctedDurationHours ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {alert.correctedDurationHours ? formatDuration(alert.correctedDurationHours) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notas do Operador */}
          {alert.operatorNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" />
                Notas do Operador
              </h4>
              <p className="text-sm text-amber-700">{alert.operatorNotes}</p>
            </div>
          )}

          {/* Audit Trail */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico de Auditoria
              </h4>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {alert.auditLog?.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      entry.action === 'CREATED' ? 'bg-blue-500' :
                      entry.action === 'EMAIL_RESENT' ? 'bg-amber-500' :
                      entry.action === 'VALIDATED' ? 'bg-emerald-500' :
                      entry.action === 'CORRECTED' ? 'bg-orange-500' :
                      'bg-slate-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {entry.action === 'CREATED' && 'Alerta Criado'}
                          {entry.action === 'EMAIL_RESENT' && 'Email Reenviado'}
                          {entry.action === 'VALIDATED' && 'Validado pelo Operador'}
                          {entry.action === 'CORRECTED' && 'Corrigido pelo Operador'}
                        </p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      {entry.validatedBy && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Por: {entry.validatedBy}</p>
                      )}
                      {entry.details && (
                        <p className="text-xs text-slate-600 mt-1">{entry.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

const SessoesCorrigidasView = () => {
  const {
    alerts,
    initializeAlertsListener,
    getAlertStats,
    getPendingAlertsWithEscalation,
    resendAlertEmail,
    hasUrgentAlerts,
  } = useAlertsStore();
  const { obras, loading: storeLoading } = useStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObra, setSelectedObra] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Inicializar listener de alertas
  useEffect(() => {
    const unsubscribe = initializeAlertsListener();
    return () => unsubscribe && unsubscribe();
  }, [initializeAlertsListener]);

  // Estatísticas
  const stats = useMemo(() => {
    return getAlertStats();
  }, [alerts, getAlertStats]);

  // Alertas pendentes com escalação
  const pendingAlerts = useMemo(() => {
    let filtered = getPendingAlertsWithEscalation();

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.machineName?.toLowerCase().includes(term) ||
          a.operatorName?.toLowerCase().includes(term) ||
          a.obraName?.toLowerCase().includes(term)
      );
    }

    if (selectedObra) {
      filtered = filtered.filter((a) => a.obraId === selectedObra);
    }

    if (selectedType) {
      filtered = filtered.filter((a) => a.type === selectedType);
    }

    return filtered;
  }, [alerts, searchTerm, selectedObra, selectedType, getPendingAlertsWithEscalation]);

  // Alertas processados (validados ou corrigidos)
  const processedAlerts = useMemo(() => {
    let filtered = alerts.filter(
      (a) => a.status === ALERT_STATUS.VALIDATED || a.status === ALERT_STATUS.CORRECTED
    );

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.machineName?.toLowerCase().includes(term) ||
          a.operatorName?.toLowerCase().includes(term) ||
          a.obraName?.toLowerCase().includes(term)
      );
    }

    if (selectedObra) {
      filtered = filtered.filter((a) => a.obraId === selectedObra);
    }

    if (selectedType) {
      filtered = filtered.filter((a) => a.type === selectedType);
    }

    return filtered.sort((a, b) => {
      const dateA = a.validatedAt?.toDate?.() || new Date(a.validatedAt);
      const dateB = b.validatedAt?.toDate?.() || new Date(b.validatedAt);
      return dateB - dateA;
    });
  }, [alerts, searchTerm, selectedObra, selectedType]);

  const handleResendEmail = async (alertId) => {
    const result = await resendAlertEmail(alertId);
    if (!result.success) {
      console.error('Erro ao reenviar email:', result.error);
      // TODO: Mostrar toast de erro
    }
    // TODO: Mostrar toast de sucesso
  };

  const tabs = [
    { id: 'pending', label: 'Pendentes', count: stats.pending, urgent: stats.urgent > 0 || stats.critical > 0 },
    { id: 'processed', label: 'Processados', count: stats.validated + stats.corrected },
  ];

  if (storeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="title" className="w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton.Stat key={i} />
          ))}
        </div>
        <Skeleton.Card lines={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Validação de Sessões</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão de alertas e correções de sessões</p>
        </div>
        <Button variant="outline" icon={Download}>
          Exportar CSV
        </Button>
      </div>

      {/* Alerta de urgência */}
      {hasUrgentAlerts() && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">Atenção Necessária</p>
            <p className="text-sm text-red-600">
              Existem {stats.urgent + stats.critical} alerta(s) pendente(s) há mais de 48 horas.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          title="Pendentes"
          value={stats.pending}
          color={stats.pending > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          icon={AlertCircle}
          title="Urgentes"
          value={stats.urgent + stats.critical}
          color={stats.urgent > 0 ? 'red' : stats.critical > 0 ? 'orange' : 'slate'}
        />
        <StatCard icon={CheckCircle} title="Validadas" value={stats.validated} color="emerald" />
        <StatCard icon={Edit3} title="Corrigidas" value={stats.corrected} color="primary" />
      </div>

      {/* Content */}
      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Filters */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <select
              value={selectedObra}
              onChange={(e) => setSelectedObra(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
            >
              <option value="">Todas as Obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
            >
              <option value="">Todos os Tipos</option>
              <option value={ALERT_TYPES.AUTO_CLOSE}>Auto-Fecho</option>
              <option value={ALERT_TYPES.LONG_SESSION}>Sessão Longa</option>
            </select>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'pending' && (
            pendingAlerts.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="Sem alertas pendentes"
                description="Todos os alertas foram validados pelos operadores."
              />
            ) : (
              <div className="space-y-4">
                {pendingAlerts.map((alert) => (
                  <PendingAlertCard
                    key={alert.id}
                    alert={alert}
                    onResendEmail={handleResendEmail}
                    onViewDetails={setSelectedAlert}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'processed' && (
            processedAlerts.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="Sem sessões processadas"
                description="Quando operadores validarem sessões, aparecerão aqui."
              />
            ) : (
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.Header>Data</Table.Header>
                    <Table.Header>Equipamento</Table.Header>
                    <Table.Header>Operador</Table.Header>
                    <Table.Header>Obra</Table.Header>
                    <Table.Header>Tipo</Table.Header>
                    <Table.Header align="center">Original</Table.Header>
                    <Table.Header align="center">Corrigido</Table.Header>
                    <Table.Header align="center">Estado</Table.Header>
                    <Table.Header align="center">Ações</Table.Header>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {processedAlerts.slice(0, 50).map((alert) => (
                    <Table.Row key={alert.id}>
                      <Table.Cell>
                        <div className="text-sm">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {formatDateTime(alert.validatedAt)?.split(',')[0]}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">
                            {formatDateTime(alert.validatedAt)?.split(',')[1]?.trim()}
                          </p>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{alert.toolName || alert.machineName}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{alert.operatorName}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm text-slate-600">{alert.obraName || '-'}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <AlertTypeBadge type={alert.type} />
                      </Table.Cell>
                      <Table.Cell align="center">
                        <span className="text-sm text-slate-600 tabular-nums">
                          {formatDuration(alert.originalDurationHours)}
                        </span>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <span
                          className={`text-sm font-medium tabular-nums ${
                            alert.correctedDurationHours !== alert.originalDurationHours
                              ? 'text-emerald-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatDuration(alert.correctedDurationHours)}
                        </span>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <StatusBadge status={alert.status} />
                      </Table.Cell>
                      <Table.Cell align="center">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )
          )}
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
};

export default SessoesCorrigidasView;
