/**
 * DashboardOperador - Dashboard otimizado para operadores de campo
 * 
 * O operador quer:
 * 1. Scan rápido (Mobile Hub)
 * 2. Ver a sua sessão ativa (se existe)
 * 3. Reportar avaria rápido
 * 4. Validar anomalias pendentes
 */

import React, { useMemo } from 'react';
import { Smartphone, Play, Clock, AlertTriangle, CheckCircle, Truck, QrCode, User } from 'lucide-react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { Card, Badge } from '../../components/ui';
import LiveTimer from '../../components/ui/LiveTimer';

const DashboardOperador = () => {
  const { sessions, machines, operators } = useStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const myCardId = currentUser?.cardId;

  // Sessões abertas do operador logado (filtradas pelo cardId RFID/NFC)
  const activeSessions = useMemo(
    () => sessions.filter(s => s.status === 'OPEN' && (!myCardId || s.cardId === myCardId)),
    [sessions, myCardId]
  );
  const recentSessions = useMemo(() => 
    sessions
      .filter(s => s.status === 'CLOSED' && (!myCardId || s.cardId === myCardId))
      .sort((a, b) => {
        const dateA = a.endTime?.toDate?.() || new Date(a.endTime);
        const dateB = b.endTime?.toDate?.() || new Date(b.endTime);
        return dateB - dateA;
      })
      .slice(0, 5),
    [sessions, myCardId]
  );

  // Abre o Mobile Hub numa nova janela com tamanho mobile
  const openMobileHub = () => {
    window.open('#/mobile-hub', '_blank', 'width=390,height=844');
  };

  // Abre o reporte de avaria
  const openReporteAvaria = () => {
    window.open('#/reporte-avaria', '_blank', 'width=390,height=844');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center pt-2">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/25">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Olá, {currentUser?.name || 'Operador'}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">O que queres fazer hoje?</p>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-4">
        {/* Scan RFID / NFC */}
        <button
          onClick={openMobileHub}
          className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-700 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          <div className="w-14 h-14 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-primary-700 dark:text-primary-300">Mobile Hub</p>
            <p className="text-xs text-primary-600/70 dark:text-primary-400/70 mt-0.5">Scan RFID / NFC</p>
          </div>
        </button>

        {/* Reportar Avaria */}
        <button
          onClick={openReporteAvaria}
          className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-700 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-red-700 dark:text-red-300">Reportar Avaria</p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">Problema na máquina</p>
          </div>
        </button>
      </div>

      {/* Sessão ativa */}
      {activeSessions.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Sessão Ativa</h3>
            <Badge variant="success" size="sm">Em curso</Badge>
          </div>
          {activeSessions.slice(0, 2).map(session => {
            const machine = machines.find(m => m.id === session.machineId);
            const startTime = session.startTime?.toDate?.() || new Date(session.startTime);

            return (
              <div key={session.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                      {typeof machine?.name === 'object' ? machine?.name?.name : (machine?.name || session.machineId)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Início: {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <LiveTimer
                    startTime={startTime}
                    tickMs={1000}
                    showSeconds
                    className="text-xl text-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">em curso</p>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Últimas sessões */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Últimas Sessões
          </h3>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem sessões recentes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map(session => {
              const machine = machines.find(m => m.id === session.machineId);
              const startTime = session.startTime?.toDate?.() || new Date(session.startTime);
              
              return (
                <div key={session.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {typeof machine?.name === 'object' ? machine?.name?.name : (machine?.name || session.machineId)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {startTime.toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    {session.durationHours?.toFixed(1) || '—'}h
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardOperador;
