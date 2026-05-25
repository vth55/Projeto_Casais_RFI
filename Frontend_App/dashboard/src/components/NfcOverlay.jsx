import React from 'react';
import { Nfc, Package, LogIn, LogOut, X } from 'lucide-react';
import useNfcStore from '../store/useNfcStore';

export default function NfcOverlay() {
  const { pending, countdown, confirmAction, dismissPending } = useNfcStore();

  if (!pending) return null;

  const isCheckout = pending.action === 'checkout';
  const isUnknown = pending.unknown;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={dismissPending}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden">

        {/* Colour bar */}
        <div className={`h-1.5 w-full ${isUnknown ? 'bg-amber-400' : isCheckout ? 'bg-emerald-500' : 'bg-blue-500'}`} />

        <div className="p-6 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isUnknown ? 'bg-amber-100 dark:bg-amber-900/30' :
                isCheckout ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {isUnknown
                  ? <Nfc className="w-5 h-5 text-amber-600" />
                  : isCheckout
                    ? <LogOut className="w-5 h-5 text-emerald-600" />
                    : <LogIn className="w-5 h-5 text-blue-600" />
                }
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isUnknown ? 'Tag desconhecida' : isCheckout ? 'Saída de equipamento' : 'Devolução de equipamento'}
                </p>
                <p className="font-bold text-slate-900 dark:text-white text-base leading-tight mt-0.5">
                  {isUnknown ? pending.tagId : pending.tool.name}
                </p>
              </div>
            </div>
            <button
              onClick={dismissPending}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tool details */}
          {!isUnknown && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 space-y-2">
              {pending.tool.type && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">{pending.tool.type}</span>
                </div>
              )}
              {pending.tool.currentObraName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 text-xs">Obra</span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{pending.tool.currentObraName}</span>
                </div>
              )}
              {!isCheckout && pending.session?.startTime && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 text-xs">Saiu</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {pending.session.startTime?.toDate?.()?.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) ?? '—'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isUnknown && (
            <div className="flex gap-3">
              <button
                onClick={dismissPending}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 relative overflow-hidden ${
                  isCheckout ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {/* Countdown progress bar */}
                {countdown != null && (
                  <span
                    className="absolute left-0 inset-y-0 bg-white/20 transition-all duration-1000"
                    style={{ width: `${(countdown / 4) * 100}%` }}
                  />
                )}
                <span className="relative">
                  {isCheckout ? 'Confirmar saída' : 'Confirmar devolução'}
                  {countdown != null && <span className="ml-2 opacity-70">{countdown}s</span>}
                </span>
              </button>
            </div>
          )}

          {isUnknown && (
            <button
              onClick={dismissPending}
              className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm"
            >
              Dispensar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
