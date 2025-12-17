/**
 * Alerts Store - Gestão de alertas e validações
 * CASAIS Fleet Intelligence
 *
 * Tipos de Alerta:
 * - FATIGUE: Sessão excede threshold de fadiga (precisa validação)
 * - AUTO_CLOSE: Sessão excede threshold máximo, fechada automaticamente (obrigatório corrigir)
 * - MAINTENANCE: Máquina próxima de manutenção (informativo)
 *
 * NOTA: Alertas NÃO expiram - ficam pendentes até serem validados.
 * Alertas pendentes há muito tempo são escalados para supervisores.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, projectId } from '../config/firebase';

const basePath = `artifacts/${projectId}/public/data`;

// Tipos de alerta
export const ALERT_TYPES = {
  LONG_SESSION: 'LONG_SESSION', // Sessão excede limite de horas
  AUTO_CLOSE: 'AUTO_CLOSE',     // Sessão auto-fechada
  MAINTENANCE: 'MAINTENANCE',    // Manutenção próxima
};

// Status de alerta (sem EXPIRED - alertas nunca expiram)
export const ALERT_STATUS = {
  PENDING: 'PENDING',           // Aguarda validação
  VALIDATED: 'VALIDATED',       // Validado pelo operador
  CORRECTED: 'CORRECTED',       // Corrigido pelo operador
};

// Thresholds de escalação (em horas)
export const ESCALATION_THRESHOLDS = {
  WARNING: 24,    // Aviso após 24h pendente
  CRITICAL: 48,   // Crítico após 48h pendente
  URGENT: 72,     // Urgente após 72h pendente
};

// Gerar token único para URL de validação
const generateValidationToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const useAlertsStore = create(
  persist(
    (set, get) => ({
      // Estado
      alerts: [],
      alertsLoaded: false, // Flag para indicar que o Firestore respondeu
      loading: false,
      error: null,

      // Inicializar listener de alertas
      initializeAlertsListener: () => {
        if (!db) {
          set({ error: 'Firestore não inicializado', alertsLoaded: true });
          return () => {};
        }

        const alertsQuery = query(
          collection(db, `${basePath}/alerts`),
          orderBy('createdAt', 'desc')
        );

        return onSnapshot(
          alertsQuery,
          (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            set({ alerts: data, loading: false, alertsLoaded: true });
          },
          (error) => {
            console.error('Erro alerts:', error);
            set({ error: error.message, alertsLoaded: true });
          }
        );
      },

      // Criar novo alerta
      createAlert: async (alertData) => {
        if (!db) return { success: false, error: 'DB não inicializado' };

        try {
          const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const validationToken = generateValidationToken();

          const alert = {
            id,
            validationToken,
            type: alertData.type,
            status: ALERT_STATUS.PENDING,

            // Dados da sessão
            sessionId: alertData.sessionId,
            machineId: alertData.machineId,
            machineName: alertData.machineName,
            operatorId: alertData.operatorId,
            operatorName: alertData.operatorName,
            operatorEmail: alertData.operatorEmail,
            obraId: alertData.obraId,
            obraName: alertData.obraName,

            // Horários originais
            originalStartTime: alertData.startTime,
            originalEndTime: alertData.endTime,
            originalDurationHours: alertData.durationHours,

            // Horários corrigidos (preenchidos após validação)
            correctedStartTime: null,
            correctedEndTime: null,
            correctedDurationHours: null,

            // Metadados
            createdAt: Timestamp.now(),
            validatedAt: null,
            validatedBy: null,

            // Controlo de emails
            emailSentAt: Timestamp.now(),
            emailResendCount: 0,
            lastEmailResendAt: null,

            // Notas
            operatorNotes: '',

            // Auditoria
            auditLog: [
              {
                action: 'CREATED',
                timestamp: Timestamp.now(),
                details: `Alerta criado: ${alertData.type}`,
              },
            ],
          };

          await setDoc(doc(db, `${basePath}/alerts`, id), alert);

          return { success: true, id, validationToken };
        } catch (error) {
          console.error('Erro ao criar alerta:', error);
          return { success: false, error: error.message };
        }
      },

      // Obter alerta por token de validação (para página de validação)
      getAlertByToken: (token) => {
        const { alerts } = get();
        return alerts.find((a) => a.validationToken === token) || null;
      },

      // Obter alerta por ID
      getAlertById: (id) => {
        const { alerts } = get();
        return alerts.find((a) => a.id === id) || null;
      },

      // Validar/Corrigir alerta (usado pela página de validação)
      validateAlert: async (alertId, validationData) => {
        if (!db) return { success: false, error: 'DB não inicializado' };

        try {
          const alert = get().getAlertById(alertId);
          if (!alert) return { success: false, error: 'Alerta não encontrado' };

          // Verificar se já foi validado
          if (alert.status !== ALERT_STATUS.PENDING) {
            return { success: false, error: 'Alerta já foi processado' };
          }

          // NOTA: Alertas não expiram - ficam pendentes até serem validados

          // Determinar se houve correção
          const wasChanged =
            validationData.correctedStartTime !== alert.originalStartTime ||
            validationData.correctedEndTime !== alert.originalEndTime;

          const newStatus = wasChanged
            ? ALERT_STATUS.CORRECTED
            : ALERT_STATUS.VALIDATED;

          // Calcular duração corrigida
          const startDate = new Date(validationData.correctedStartTime);
          const endDate = new Date(validationData.correctedEndTime);
          const correctedDurationHours = (endDate - startDate) / (1000 * 60 * 60);

          // Novo log de auditoria
          const auditEntry = {
            action: wasChanged ? 'CORRECTED' : 'VALIDATED',
            timestamp: Timestamp.now(),
            validatedBy: alert.operatorName,
            originalValues: {
              startTime: alert.originalStartTime,
              endTime: alert.originalEndTime,
              durationHours: alert.originalDurationHours,
            },
            newValues: {
              startTime: validationData.correctedStartTime,
              endTime: validationData.correctedEndTime,
              durationHours: correctedDurationHours,
            },
            notes: validationData.notes || '',
          };

          // Atualizar alerta
          await updateDoc(doc(db, `${basePath}/alerts`, alertId), {
            status: newStatus,
            correctedStartTime: validationData.correctedStartTime,
            correctedEndTime: validationData.correctedEndTime,
            correctedDurationHours: correctedDurationHours,
            operatorNotes: validationData.notes || '',
            validatedAt: Timestamp.now(),
            validatedBy: alert.operatorName,
            auditLog: [...(alert.auditLog || []), auditEntry],
          });

          // Se houve correção, atualizar também a sessão original
          if (wasChanged && alert.sessionId) {
            await updateDoc(doc(db, `${basePath}/sessions`, alert.sessionId), {
              startTime: Timestamp.fromDate(startDate),
              endTime: Timestamp.fromDate(endDate),
              durationHours: correctedDurationHours,
              correctedByOperator: true,
              correctedAt: Timestamp.now(),
              correctionAlertId: alertId,
            });
          }

          return { success: true, status: newStatus };
        } catch (error) {
          console.error('Erro ao validar alerta:', error);
          return { success: false, error: error.message };
        }
      },

      // Obter alertas pendentes
      getPendingAlerts: () => {
        const { alerts } = get();
        return alerts.filter((a) => a.status === ALERT_STATUS.PENDING);
      },

      // Obter alertas corrigidos (para supervisão)
      getCorrectedAlerts: (obraId = null) => {
        const { alerts } = get();
        let filtered = alerts.filter(
          (a) => a.status === ALERT_STATUS.CORRECTED || a.status === ALERT_STATUS.VALIDATED
        );

        if (obraId) {
          filtered = filtered.filter((a) => a.obraId === obraId);
        }

        return filtered;
      },

      // Obter alertas por operador
      getAlertsByOperator: (operatorId) => {
        const { alerts } = get();
        return alerts.filter((a) => a.operatorId === operatorId);
      },

      // Obter URL de validação
      getValidationUrl: (token) => {
        // Em produção, isto seria o domínio real
        const baseUrl = window.location.origin;
        return `${baseUrl}/validar/${token}`;
      },

      // Estatísticas de alertas
      getAlertStats: () => {
        const { alerts } = get();
        const pendingAlerts = alerts.filter((a) => a.status === ALERT_STATUS.PENDING);

        // Calcular alertas por nível de urgência
        const now = new Date();
        const urgentCount = pendingAlerts.filter((a) => {
          const createdAt = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const hoursPending = (now - createdAt) / (1000 * 60 * 60);
          return hoursPending >= ESCALATION_THRESHOLDS.URGENT;
        }).length;

        const criticalCount = pendingAlerts.filter((a) => {
          const createdAt = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const hoursPending = (now - createdAt) / (1000 * 60 * 60);
          return hoursPending >= ESCALATION_THRESHOLDS.CRITICAL && hoursPending < ESCALATION_THRESHOLDS.URGENT;
        }).length;

        return {
          total: alerts.length,
          pending: pendingAlerts.length,
          validated: alerts.filter((a) => a.status === ALERT_STATUS.VALIDATED).length,
          corrected: alerts.filter((a) => a.status === ALERT_STATUS.CORRECTED).length,
          urgent: urgentCount,
          critical: criticalCount,
          byType: {
            longSession: alerts.filter((a) => a.type === ALERT_TYPES.LONG_SESSION).length,
            autoClose: alerts.filter((a) => a.type === ALERT_TYPES.AUTO_CLOSE).length,
            maintenance: alerts.filter((a) => a.type === ALERT_TYPES.MAINTENANCE).length,
          },
        };
      },

      // Obter alertas pendentes com nível de escalação
      getPendingAlertsWithEscalation: () => {
        const { alerts } = get();
        const now = new Date();

        return alerts
          .filter((a) => a.status === ALERT_STATUS.PENDING)
          .map((alert) => {
            const createdAt = alert.createdAt?.toDate
              ? alert.createdAt.toDate()
              : new Date(alert.createdAt);
            const hoursPending = (now - createdAt) / (1000 * 60 * 60);

            let escalationLevel = 'normal';
            if (hoursPending >= ESCALATION_THRESHOLDS.URGENT) {
              escalationLevel = 'urgent';
            } else if (hoursPending >= ESCALATION_THRESHOLDS.CRITICAL) {
              escalationLevel = 'critical';
            } else if (hoursPending >= ESCALATION_THRESHOLDS.WARNING) {
              escalationLevel = 'warning';
            }

            return {
              ...alert,
              hoursPending: Math.round(hoursPending * 10) / 10,
              escalationLevel,
            };
          })
          .sort((a, b) => b.hoursPending - a.hoursPending); // Mais antigos primeiro
      },

      // Reenviar email de alerta
      resendAlertEmail: async (alertId) => {
        if (!db) return { success: false, error: 'DB não inicializado' };

        try {
          const alert = get().getAlertById(alertId);
          if (!alert) return { success: false, error: 'Alerta não encontrado' };

          if (alert.status !== ALERT_STATUS.PENDING) {
            return { success: false, error: 'Alerta já foi processado' };
          }

          // Atualizar contador de reenvios
          const newResendCount = (alert.emailResendCount || 0) + 1;

          // Adicionar entrada no audit log
          const auditEntry = {
            action: 'EMAIL_RESENT',
            timestamp: Timestamp.now(),
            details: `Email reenviado (${newResendCount}x)`,
          };

          await updateDoc(doc(db, `${basePath}/alerts`, alertId), {
            emailResendCount: newResendCount,
            lastEmailResendAt: Timestamp.now(),
            auditLog: [...(alert.auditLog || []), auditEntry],
          });

          // TODO: Trigger Cloud Function para reenviar email
          console.log(`📧 Email reenviado para ${alert.operatorEmail} (${newResendCount}x)`);

          return { success: true, resendCount: newResendCount };
        } catch (error) {
          console.error('Erro ao reenviar email:', error);
          return { success: false, error: error.message };
        }
      },

      // Obter alertas que precisam de atenção do supervisor
      getAlertsNeedingSupervisorAttention: () => {
        const pendingWithEscalation = get().getPendingAlertsWithEscalation();
        return pendingWithEscalation.filter(
          (a) => a.escalationLevel !== 'normal'
        );
      },

      // Verificar se há alertas urgentes (para mostrar popup)
      hasUrgentAlerts: () => {
        const alerts = get().getPendingAlertsWithEscalation();
        return alerts.some((a) => a.escalationLevel === 'urgent' || a.escalationLevel === 'critical');
      },
    }),
    {
      name: 'casais-alerts',
      partialize: (state) => ({
        // Não persistir alertas localmente - vêm do Firebase
      }),
    }
  )
);

export default useAlertsStore;
