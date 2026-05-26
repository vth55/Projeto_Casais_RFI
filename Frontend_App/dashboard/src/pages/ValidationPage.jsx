/**
 * Página de Validação de Sessão
 * CASAIS Fleet Intelligence
 *
 * Esta página é acedida via link único enviado por email ao operador.
 * URL: /validar/:token
 *
 * Características:
 * - Isolada do PWA principal (não mostra menus)
 * - Cada alerta tem URL única
 * - Não requer login
 * - Expira após 7 dias
 */

import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import {
  Clock,
  Building2,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  Loader2,
  Wrench,
} from 'lucide-react';
import useAlertsStore, { ALERT_TYPES, ALERT_STATUS } from '../store/useAlertsStore';

const BASE = `artifacts/${projectId}/public/data`;
const TOOL_ALERT_TYPES = ['TOOL_OVERDUE', 'TOOL_PRESUMED_LOST'];
const getAlertType = (alert) => alert?.anomalyType || alert?.type;

// Formatar data para input datetime-local
const formatDateTimeLocal = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString().slice(0, 16);
};

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
  if (!hours) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

const getOpenDays = (startTime) => {
  const start = timestampToDate(startTime);
  if (!start || Number.isNaN(start.getTime())) return '-';
  const days = Math.max(0, Math.ceil((Date.now() - start.getTime()) / 86_400_000));
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
};

const ValidationPage = ({ token }) => {
  const { alerts, alertsLoaded, getAlertByToken, validateAlert, initializeAlertsListener } = useAlertsStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [toolSession, setToolSession] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    correctedStartTime: '',
    correctedEndTime: '',
    notes: '',
  });

  // Inicializar listener de alertas
  useEffect(() => {
    const unsubscribe = initializeAlertsListener();
    return () => unsubscribe && unsubscribe();
  }, [initializeAlertsListener]);

  // Obter alerta pelo token
  const alert = useMemo(() => {
    return getAlertByToken(token);
  }, [alerts, token, getAlertByToken]);

  const alertType = getAlertType(alert);
  const isToolAlert = TOOL_ALERT_TYPES.includes(alertType);

  // Quando o alerta é carregado, preencher o formulário
  useEffect(() => {
    if (alert) {
      setFormData({
        correctedStartTime: formatDateTimeLocal(alert.originalStartTime),
        correctedEndTime: formatDateTimeLocal(alert.originalEndTime),
        notes: '',
      });
      if (!TOOL_ALERT_TYPES.includes(getAlertType(alert)) || alert.status !== ALERT_STATUS.PENDING) {
        setLoading(false);
      }
    } else if (alertsLoaded) {
      // Firestore respondeu mas token não encontrado
      setError('Link de validação inválido ou expirado.');
      setLoading(false);
    }
  }, [alert, alertsLoaded]);

  useEffect(() => {
    if (!alert || !TOOL_ALERT_TYPES.includes(getAlertType(alert)) || alert.status !== ALERT_STATUS.PENDING) return;

    const loadToolSession = async () => {
      if (!alert.sessionId) {
        setError('Alerta sem sessao de equipamento associada.');
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, `${BASE}/tool_sessions`, alert.sessionId));
        if (!snap.exists()) {
          setError('Sessao de equipamento nao encontrada.');
          setLoading(false);
          return;
        }
        setToolSession({ id: snap.id, ...snap.data() });
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar sessao de equipamento:', err);
        setError('Erro ao carregar sessao de equipamento. Por favor tente novamente.');
        setLoading(false);
      }
    };

    loadToolSession();
  }, [alert]);

  // Verificar se é alerta de auto-close (obrigatório alterar)
  const isAutoClose = getAlertType(alert) === ALERT_TYPES.AUTO_CLOSE;

  // Verificar se houve alteração
  const hasChanges = useMemo(() => {
    if (!alert) return false;
    const originalStart = formatDateTimeLocal(alert.originalStartTime);
    const originalEnd = formatDateTimeLocal(alert.originalEndTime);
    return (
      formData.correctedStartTime !== originalStart ||
      formData.correctedEndTime !== originalEnd
    );
  }, [formData, alert]);

  // Calcular nova duração
  const newDuration = useMemo(() => {
    if (!formData.correctedStartTime || !formData.correctedEndTime) return null;
    const start = new Date(formData.correctedStartTime);
    const end = new Date(formData.correctedEndTime);
    return (end - start) / (1000 * 60 * 60);
  }, [formData]);

  // Validar formulário com mensagens detalhadas
  const validateForm = () => {
    if (!formData.correctedStartTime || !formData.correctedEndTime) {
      return 'Por favor preencha ambos os horários.';
    }

    const start = new Date(formData.correctedStartTime);
    const end = new Date(formData.correctedEndTime);

    // Validar que fim é depois do início
    if (end <= start) {
      const startStr = start.toLocaleString('pt-PT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      const endStr = end.toLocaleString('pt-PT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      return `Erro: A hora de fim (${endStr}) não pode ser igual ou anterior à hora de início (${startStr}). Por favor corrija os horários.`;
    }

    // Validar duração mínima (pelo menos 1 minuto)
    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < 1) {
      return 'Erro: A sessão deve ter pelo menos 1 minuto de duração.';
    }

    // Validar duração máxima razoável (24 horas)
    const durationHours = durationMinutes / 60;
    if (durationHours > 24) {
      return `Aviso: A duração de ${durationHours.toFixed(1)} horas parece excessiva. Confirme se os horários estão corretos.`;
    }

    // Validar que início não é no futuro
    const now = new Date();
    if (start > now) {
      return 'Erro: A hora de início não pode ser no futuro.';
    }

    if (isAutoClose && !hasChanges) {
      return 'Para sessões fechadas automaticamente, é obrigatório corrigir a hora de fim.';
    }

    return null;
  };

  // Erro de validação em tempo real (para mostrar enquanto o utilizador edita)
  const realtimeError = useMemo(() => {
    if (!formData.correctedStartTime || !formData.correctedEndTime) return null;

    const start = new Date(formData.correctedStartTime);
    const end = new Date(formData.correctedEndTime);

    if (end <= start) {
      return 'A hora de fim deve ser posterior à hora de início';
    }

    return null;
  }, [formData.correctedStartTime, formData.correctedEndTime]);

  // Submeter validação
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setShowConfirmation(true);
  };

  // Confirmar submissão
  const confirmSubmit = async () => {
    setShowConfirmation(false);
    setSubmitting(true);
    setError(null);

    const result = await validateAlert(alert.id, {
      correctedStartTime: formData.correctedStartTime,
      correctedEndTime: formData.correctedEndTime,
      notes: formData.notes,
    });

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Erro ao validar sessão. Por favor tente novamente.');
    }

    setSubmitting(false);
  };

  const handleToolAction = async (action) => {
    if (!alert || !toolSession) return;
    if (action === 'lost' && !window.confirm('Confirmar que esta equipamento foi perdida?')) return;

    setSubmitting(true);
    setError(null);

    try {
      const validatedBy = toolSession.operatorName || alert.operatorName || 'operator-validation';

      if (action === 'in_use') {
        await updateDoc(doc(db, `${BASE}/alerts`, alert.id), {
          status: 'confirmed_in_use',
          resolution: 'confirmed_in_use',
          lastConfirmedAt: serverTimestamp(),
          resolvedAt: serverTimestamp(),
          validatedAt: serverTimestamp(),
          validatedBy,
        });
      } else if (action === 'returned') {
        const now = new Date();
        const start = timestampToDate(toolSession.startTime) || now;
        const durationHours = Math.max(0, Math.round(((now - start) / 3_600_000) * 100) / 100);

        const batch = writeBatch(db);
        batch.update(doc(db, `${BASE}/tool_sessions`, toolSession.id), {
          status: 'CLOSED',
          endTime: serverTimestamp(),
          durationHours,
          closedBy: 'operator-validation',
        });
        batch.update(doc(db, `${BASE}/alerts`, alert.id), {
          status: ALERT_STATUS.RESOLVED,
          resolution: 'returned_now',
          resolvedAt: serverTimestamp(),
          validatedAt: serverTimestamp(),
          validatedBy,
        });
        await batch.commit();
      } else if (action === 'lost') {
        const toolId = toolSession.toolId || alert.toolId;
        if (!toolId) {
          setError('Nao foi possivel identificar a equipamento para marcar como perdida.');
          setSubmitting(false);
          return;
        }

        const batch = writeBatch(db);
        batch.update(doc(db, `${BASE}/tool_sessions`, toolSession.id), {
          status: 'LOST',
          lostAt: serverTimestamp(),
        });
        batch.update(doc(db, `${BASE}/tools`, toolId), {
          status: 'lost',
          lostAt: serverTimestamp(),
        });
        batch.update(doc(db, `${BASE}/alerts`, alert.id), {
          status: ALERT_STATUS.RESOLVED,
          resolution: 'lost',
          resolvedAt: serverTimestamp(),
          validatedAt: serverTimestamp(),
          validatedBy,
        });
        await batch.commit();
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Erro ao validar alerta de equipamento:', err);
      setError(err.message || 'Erro ao validar equipamento. Por favor tente novamente.');
    }

    setSubmitting(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">A carregar...</p>
        </div>
      </div>
    );
  }

  // Error state (token inválido)
  if (error && !alert) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link Inválido</h1>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-500 mt-4">
            Se continua a ter problemas, contacte o seu supervisor.
          </p>
        </div>
      </div>
    );
  }

  // Already processed state
  if (alert && alert.status !== ALERT_STATUS.PENDING) {
    const resolutionLabel = alert.resolution === 'CORRECTED' || alert.status === ALERT_STATUS.CORRECTED
      ? 'corrigida'
      : 'validada';
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Sessão Resolvida</h1>
          <p className="text-slate-600">
            Esta sessão já foi {resolutionLabel} em{' '}
            {formatDateTime(alert.validatedAt || alert.resolvedAt)}.
          </p>
          <p className="text-sm text-slate-500 mt-4">Pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    const successTitle = isToolAlert
      ? 'Equipamento Validada'
      : hasChanges
      ? 'Sessão Corrigida'
      : 'Sessão Validada';
    const successMessage = isToolAlert
      ? 'A situação da equipamento foi registada com sucesso. Obrigado!'
      : hasChanges
      ? 'Os horários foram corrigidos com sucesso. Obrigado!'
      : 'Os horários foram confirmados. Obrigado!';

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {successTitle}
          </h1>
          <p className="text-slate-600">
            {successMessage}
          </p>
          <p className="text-sm text-slate-500 mt-4">Pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  if (isToolAlert) {
    const title = alertType === 'TOOL_OVERDUE'
      ? 'Equipamento com devolução atrasada'
      : 'Equipamento presumivelmente perdida';

    return (
      <div className="min-h-screen bg-slate-100 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium mb-4">
              <span className="font-bold">CASAIS</span>
              <span className="opacity-75">Fleet Intelligence</span>
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-600 mt-1">Confirme o estado atual desta equipamento.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Informações da Equipamento</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Equipamento</p>
                  <p className="font-medium text-slate-900">{toolSession?.toolName || alert.toolName || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Obra</p>
                  <p className="font-medium text-slate-900">{toolSession?.obraName || alert.obraName || 'Sem obra atribuída'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tempo em aberto</p>
                  <p className="font-medium text-slate-900">{getOpenDays(toolSession?.startTime)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Operador de checkout</p>
                  <p className="font-medium text-slate-900">{toolSession?.operatorName || alert.operatorName || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleToolAction('in_use')}
              disabled={submitting}
              className="w-full py-4 rounded-xl font-semibold text-white text-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Ainda em uso
            </button>
            <button
              onClick={() => handleToolAction('returned')}
              disabled={submitting}
              className="w-full py-4 rounded-xl font-semibold text-white text-lg bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Devolvida agora
            </button>
            <button
              onClick={() => handleToolAction('lost')}
              disabled={submitting}
              className="w-full py-4 rounded-xl font-semibold text-white text-lg bg-red-500 hover:bg-red-600 disabled:bg-slate-400 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              Perdida
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            CASAIS Fleet Intelligence - Sistema de Gestão de Frotas
          </p>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium mb-4">
            <span className="font-bold">CASAIS</span>
            <span className="opacity-75">Fleet Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Validação de Sessão</h1>
          <p className="text-slate-600 mt-1">
            {isAutoClose
              ? 'Esta sessão foi fechada automaticamente. Por favor corrija a hora de fim.'
              : 'Por favor confirme ou corrija os horários desta sessão.'}
          </p>
        </div>

        {/* Alert Badge */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-6 ${
            isAutoClose
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">
            {isAutoClose ? 'Fecho Automático (>14h)' : 'Alerta de Fadiga (>5h)'}
          </span>
        </div>

        {/* Session Info Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Informações da Sessão</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Equipamento</p>
                <p className="font-medium text-slate-900">{alert.toolName || alert.machineName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Obra</p>
                <p className="font-medium text-slate-900">{alert.obraName || 'Sem obra atribuída'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Data</p>
                <p className="font-medium text-slate-900">
                  {formatDateTime(alert.originalStartTime)?.split(',')[0]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Operador</p>
                <p className="font-medium text-slate-900">{alert.operatorName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Original Times (read-only) */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Horários Registados</h2>
            <p className="text-xs text-slate-500 mt-1">Estes são os horários que o sistema registou</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Início</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDateTime(alert.originalStartTime)?.split(',')[1]?.trim() || '-'}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isAutoClose ? 'bg-red-50' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-1">
                  Fim {isAutoClose && <span className="text-red-500">(auto)</span>}
                </p>
                <p className={`text-lg font-semibold ${isAutoClose ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatDateTime(alert.originalEndTime)?.split(',')[1]?.trim() || '-'}
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-slate-100 rounded-lg text-center">
              <p className="text-sm text-slate-600">
                Duração registada: <strong>{formatDuration(alert.originalDurationHours)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Correction Form */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-primary-50 px-6 py-4 border-b border-primary-100">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold text-primary-900">Corrigir Horários</h2>
            </div>
            <p className="text-xs text-primary-700 mt-1">
              {isAutoClose
                ? 'Indique a hora real de fim da sessão'
                : 'Se os horários estão corretos, clique em Confirmar. Caso contrário, corrija abaixo.'}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hora de Início</label>
              <input
                type="datetime-local"
                value={formData.correctedStartTime}
                onChange={(e) => setFormData({ ...formData, correctedStartTime: e.target.value })}
                className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hora de Fim {isAutoClose && <span className="text-red-500">*</span>}
              </label>
              <input
                type="datetime-local"
                value={formData.correctedEndTime}
                onChange={(e) => setFormData({ ...formData, correctedEndTime: e.target.value })}
                className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                  isAutoClose ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-primary-500'
                }`}
              />
            </div>

            {/* Aviso de erro em tempo real */}
            {realtimeError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{realtimeError}</p>
              </div>
            )}

            {/* Duração calculada (só mostra se não há erro) */}
            {newDuration && !realtimeError && newDuration > 0 && (
              <div
                className={`p-3 rounded-lg text-center ${
                  hasChanges ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <p className="text-sm">
                  Nova duração: <strong>{formatDuration(newDuration)}</strong>
                  {hasChanges && ' (alterado)'}
                </p>
              </div>
            )}

            {/* Aviso de duração negativa */}
            {newDuration && newDuration < 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Duração inválida: {formatDuration(Math.abs(newDuration))} negativas
                </p>
                <p className="text-xs text-red-600 mt-1">
                  A hora de fim está antes da hora de início
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Adicione alguma observação se necessário..."
                rows={3}
                className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || realtimeError}
          className={`w-full py-4 rounded-xl font-semibold text-white text-lg transition-all flex items-center justify-center gap-2 ${
            submitting || realtimeError
              ? 'bg-slate-400 cursor-not-allowed'
              : hasChanges
              ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
              : 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              A processar...
            </>
          ) : realtimeError ? (
            <>
              <XCircle className="w-5 h-5" />
              Corrija os horários
            </>
          ) : hasChanges ? (
            <>
              <Save className="w-5 h-5" />
              Guardar Correção
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Confirmar Horários
            </>
          )}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          CASAIS Fleet Intelligence - Sistema de Gestão de Frotas
        </p>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Alteração</h3>
              <p className="text-slate-600">Vai {hasChanges ? 'corrigir' : 'confirmar'} a sessão para:</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Início:</span>
                <span className="font-medium">
                  {formatDateTime(alert.originalStartTime)?.split(',')[1]?.trim()}
                  {formData.correctedStartTime !== formatDateTimeLocal(alert.originalStartTime) && (
                    <span className="text-emerald-600">
                      {' → '}
                      {new Date(formData.correctedStartTime).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Fim:</span>
                <span className="font-medium">
                  {formatDateTime(alert.originalEndTime)?.split(',')[1]?.trim()}
                  {formData.correctedEndTime !== formatDateTimeLocal(alert.originalEndTime) && (
                    <span className="text-emerald-600">
                      {' → '}
                      {new Date(formData.correctedEndTime).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-500 text-center mb-6">
              Esta ação não pode ser revertida.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPage;
