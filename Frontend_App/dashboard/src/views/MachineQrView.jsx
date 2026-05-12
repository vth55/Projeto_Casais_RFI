import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { AlertTriangle, Clock, Wrench, ExternalLink, Truck, ChevronRight, CheckCircle } from 'lucide-react';

const projectId = 'casais-rfid';
const basePath = `artifacts/${projectId}/public/data`;

const CATEGORY_LABELS = {
  escavadoras: 'Escavadora',
  retroescavadoras: 'Retroescavadora',
  gruas: 'Grua',
  camioes: 'Dumper/Camião',
  compactadores: 'Compactador',
  geradores: 'Gerador',
  escavadora: 'Escavadora',
  grua: 'Grua',
};

const getCategoryLabel = (cat) => CATEGORY_LABELS[cat] || cat || 'Equipamento';

export default function MachineQrView() {
  const machineId = window.location.pathname.split('/m/')[1]?.split('/')[0] || '';
  const appUrl = `${window.location.origin}${window.location.pathname}`;

  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!machineId) {
      setError('ID de máquina em falta na URL.');
      setLoading(false);
      return;
    }

    const db = getFirestore();
    getDoc(doc(db, `${basePath}/machines`, machineId)).then(snap => {
      if (!snap.exists()) {
        setError('Máquina não encontrada.');
      } else {
        setMachine({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }).catch(err => {
      setError('Erro ao carregar dados da máquina.');
      setLoading(false);
      console.error(err);
    });
  }, [machineId]);

  const handleReportAvaria = () => {
    window.location.href = `/reporte-avaria?machine=${machineId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">A carregar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-xs">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="font-semibold text-slate-900">Equipamento não encontrado</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="text-xs text-slate-400 font-mono">ID: {machineId}</p>
        </div>
      </div>
    );
  }

  const features = machine.qrFeatures || { reportAvaria: true, startSession: false, viewHistory: true };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#005EB8] text-white px-5 py-5 safe-area-top">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-blue-200 uppercase tracking-wider font-medium">
              {getCategoryLabel(machine.category)}
            </p>
            <h1 className="text-lg font-bold truncate">{machine.name}</h1>
            {machine.obraId && machine.obraId !== 'estaleiro' && (
              <p className="text-xs text-blue-200 mt-0.5 truncate">{machine.obraId}</p>
            )}
            {(!machine.obraId || machine.obraId === 'estaleiro') && (
              <p className="text-xs text-blue-200 mt-0.5">Estaleiro</p>
            )}
          </div>
        </div>
      </div>

      {/* Status info */}
      <div className="px-5 py-4 bg-white border-b border-slate-100">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Código</p>
            <p className="text-sm font-semibold text-slate-900">{machine.equipmentCode || machine.id}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Horas</p>
            <p className="text-sm font-semibold text-slate-900">{Math.round(machine.totalHours || 0)}h</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Estado</p>
            <p className={`text-sm font-semibold ${
              machine.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
            }`}>
              {machine.status === 'active' ? 'Em uso' : 'Parado'}
            </p>
          </div>
        </div>
      </div>

      {/* Feature buttons */}
      <div className="px-5 py-5 space-y-3">
        {features.reportAvaria !== false && (
          <button
            onClick={handleReportAvaria}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Reportar Avaria</p>
              <p className="text-xs text-slate-500 mt-0.5">Registar problema ou falha no equipamento</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        )}

        {features.viewHistory && (
          <button
            onClick={() => window.location.href = `/?view=sessoes-historico&machine=${machineId}`}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Ver Histórico</p>
              <p className="text-xs text-slate-500 mt-0.5">Sessões e registos de utilização</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        )}

        {features.startSession && (
          <button
            disabled
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left opacity-50 cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Iniciar Sessão</p>
              <p className="text-xs text-slate-500 mt-0.5">Requer cartão RFID</p>
            </div>
          </button>
        )}

        {machine.make && machine.model && (
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Ficha do Equipamento</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-400">Marca</p>
                <p className="font-medium text-slate-900">{machine.make}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Modelo</p>
                <p className="font-medium text-slate-900">{machine.model}</p>
              </div>
              {machine.year && (
                <div>
                  <p className="text-xs text-slate-400">Ano</p>
                  <p className="font-medium text-slate-900">{machine.year}</p>
                </div>
              )}
              {machine.consumptionRate && (
                <div>
                  <p className="text-xs text-slate-400">Consumo</p>
                  <p className="font-medium text-slate-900">{machine.consumptionRate} L/h</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer QR */}
      <div className="px-5 pb-8 text-center space-y-2">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">CASAIS Fleet Intelligence</p>
        <p className="text-[10px] text-slate-300 font-mono break-all">{appUrl}</p>
      </div>
    </div>
  );
}
