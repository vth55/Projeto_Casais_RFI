import React, { useState } from 'react';
import {
  X, CheckCircle, EyeOff, Package, AlertOctagon, Wrench,
  MapPin, User, FileText,
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';

const ANOMALY_LABELS = {
  TOOL_OVERDUE: 'Devolução atrasada',
  TOOL_PRESUMED_LOST: 'Presumida perdida',
  NO_LOCATION: 'Sem localização',
  NO_OPERATOR: 'Sem operador',
  DAMAGED: 'Avaria reportada',
};

const STATUS_LABELS = {
  OPEN: 'Aberta',
  IN_REVIEW: 'Em revisão',
  RESOLVED: 'Resolvida',
};

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AlertDetailDrawer({ alertId, onClose }) {
  const {
    getToolAlertById, tools, equipmentModels, obras,
    resolveToolAlert, ignoreToolAlert, markReturnedFromAlert, markLostFromAlert, createMaintenanceFromAlert,
  } = useStore();
  const { currentUser } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintNotes, setMaintNotes] = useState('');
  const [maintCost, setMaintCost] = useState('');

  const alertData = getToolAlertById(alertId);
  const tool = alertData ? tools.find(t => t.id === alertData.toolId) : null;
  const model = tool ? equipmentModels.find(m => m.id === tool.modelId) : null;
  const obra = tool?.currentObraId ? obras.find(o => o.id === tool.currentObraId) : null;

  if (!alertData) return null;

  const uid = currentUser?.id || currentUser?.uid || 'anonymous';
  const isResolved = alertData.status === 'RESOLVED';

  const handle = async (action) => {
    setBusy(true);
    try {
      if (action === 'resolve') {
        await resolveToolAlert(alertId, { resolvedBy: uid, resolution: 'RESOLVED' });
      } else if (action === 'ignore') {
        await ignoreToolAlert(alertId, { resolvedBy: uid });
      } else if (action === 'returned') {
        await markReturnedFromAlert(alertId, { sessionId: alertData.toolSessionId, toolId: alertData.toolId, resolvedBy: uid });
      } else if (action === 'lost') {
        if (!window.confirm('Marcar este equipamento como PERDIDO? Esta acção altera o estado da unidade.')) {
          setBusy(false);
          return;
        }
        await markLostFromAlert(alertId, { sessionId: alertData.toolSessionId, toolId: alertData.toolId, resolvedBy: uid });
      }
      onClose();
    } catch (err) {
      console.error('Action failed', err);
      window.alert(err.message || 'Acção falhou');
    } finally {
      setBusy(false);
    }
  };

  const submitMaintenance = async () => {
    setBusy(true);
    try {
      await createMaintenanceFromAlert(alertId, {
        toolId: alertData.toolId,
        sessionId: alertData.toolSessionId,
        resolvedBy: uid,
        notes: maintNotes || 'Reportado via AlertDetailDrawer',
        cost: maintCost ? Number(maintCost) : undefined,
      });
      onClose();
    } catch (err) {
      console.error('Maint creation failed', err);
      window.alert(err.message || 'Criação de avaria falhou');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose} data-testid="alert-drawer">
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              {ANOMALY_LABELS[alertData.anomalyType] || alertData.anomalyType}
            </p>
            <h2 className="font-bold text-slate-900 mt-0.5">{STATUS_LABELS[alertData.status] || alertData.status}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Criado: {formatDateTime(alertData.createdAt)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Fechar">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Foto + nome */}
          <div className="p-4 border-b border-slate-100">
            <div className="aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden mb-3">
              {model?.photoUrl ? (
                <img src={model.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full"><Wrench className="w-12 h-12 text-slate-300" /></div>
              )}
            </div>
            {model?.brand && <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold">{model.brand} · {model.category}</p>}
            <h3 className="font-bold text-slate-900 mt-1">{model?.displayName || tool?.name || alertData.toolId}</h3>
            {tool?.customNumber && <p className="text-sm text-slate-500">#{tool.customNumber}</p>}
            {tool?.nfcTagId && <p className="text-xs text-slate-400 font-mono mt-1">NFC: {tool.nfcTagId}</p>}
          </div>

          {/* Info */}
          <div className="p-4 space-y-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Obra: {obra?.name || tool?.currentObraName || '—'}</span>
            </div>
            {alertData.notifiedTo && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span>Operador: {alertData.notifiedTo}</span>
              </div>
            )}
          </div>

          {/* Acções */}
          {!isResolved && !showMaintForm && (
            <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-100">
              <ActionBtn onClick={() => handle('resolve')} disabled={busy} icon={CheckCircle} label="Resolver" tone="emerald" />
              <ActionBtn onClick={() => handle('ignore')} disabled={busy} icon={EyeOff} label="Ignorar" tone="slate" />
              <ActionBtn onClick={() => handle('returned')} disabled={busy} icon={Package} label="Devolvido" tone="blue" />
              <ActionBtn onClick={() => handle('lost')} disabled={busy} icon={AlertOctagon} label="Perdido" tone="red" />
              <ActionBtn onClick={() => setShowMaintForm(true)} disabled={busy} icon={Wrench} label="Reportar Avaria" tone="amber" className="col-span-2" />
            </div>
          )}

          {/* Maintenance form */}
          {showMaintForm && !isResolved && (
            <div className="p-4 space-y-3 border-b border-slate-100 bg-amber-50">
              <h4 className="font-semibold text-slate-900">Reportar Avaria</h4>
              <textarea
                value={maintNotes}
                onChange={e => setMaintNotes(e.target.value)}
                rows={3}
                placeholder="Descrição da avaria..."
                className="w-full p-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                value={maintCost}
                onChange={e => setMaintCost(e.target.value)}
                placeholder="Custo estimado (€, opcional)"
                className="w-full p-2 text-sm border border-slate-300 rounded-lg"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowMaintForm(false)} className="flex-1 py-2 text-sm text-slate-700 rounded-lg bg-white border border-slate-300">Cancelar</button>
                <button onClick={submitMaintenance} disabled={busy} className="flex-1 py-2 text-sm font-medium text-white rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
                  {busy ? 'A criar...' : 'Criar Avaria'}
                </button>
              </div>
            </div>
          )}

          {/* Audit log timeline */}
          {alertData.auditLog && alertData.auditLog.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Histórico
              </h4>
              <div className="space-y-3">
                {[...alertData.auditLog].reverse().map((entry, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-1 bg-slate-200 rounded-full shrink-0 my-1" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-700">{entry.action}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(entry.at)} · {entry.by}</p>
                      {entry.notes && <p className="text-xs text-slate-600 mt-0.5">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isResolved && (
            <div className="p-4 bg-emerald-50 border-t border-emerald-200">
              <p className="text-sm text-emerald-800">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Alerta resolvido em {formatDateTime(alertData.resolvedAt)}
                {alertData.resolvedBy && ` por ${alertData.resolvedBy}`}
              </p>
              {alertData.resolution && <p className="text-xs text-emerald-700 mt-1">Resolução: {alertData.resolution}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, icon: Icon, label, tone, className = '' }) {
  const toneMap = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    slate:   'bg-slate-200 hover:bg-slate-300 text-slate-700',
    blue:    'bg-blue-600 hover:bg-blue-700 text-white',
    red:     'bg-red-600 hover:bg-red-700 text-white',
    amber:   'bg-amber-500 hover:bg-amber-600 text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${toneMap[tone]} ${className}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
