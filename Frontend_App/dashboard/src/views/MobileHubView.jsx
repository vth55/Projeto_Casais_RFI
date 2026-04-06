import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, projectId } from '../config/firebase';
import { doc, setDoc, getDoc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';

// ============================================
// CONSTANTES
// ============================================
const STORAGE_KEY = 'casais_mobile_machine_id';
const BASE_PATH = `artifacts/${projectId}/public/data`;

// Gerar ou recuperar ID unico e persistente do dispositivo
const getOrCreateMachineId = () => {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `M_MOB_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};

// ============================================
// ESTADOS VISUAIS
// ============================================
const S = {
  READY: 'READY',
  READING: 'READING',
  PROCESSING: 'PROCESSING',
  START: 'START',
  STOP: 'STOP',
  LOCATION: 'LOCATION',
  ERROR: 'ERROR',
  NFC_OFF: 'NFC_OFF',
};

const UI = {
  [S.READY]:      { bg: 'from-blue-600 to-blue-800',      icon: '\u{1F4E1}', title: 'PRONTO PARA LEITURA', sub: 'Aproxime o cartao NFC', pulse: true },
  [S.READING]:    { bg: 'from-amber-500 to-amber-700',    icon: '\u{1F4F6}', title: 'A LER CARTAO...',      sub: '',                     pulse: true },
  [S.PROCESSING]: { bg: 'from-indigo-600 to-indigo-800',  icon: '\u23F3',    title: 'A PROCESSAR...',       sub: 'A comunicar com o servidor', pulse: true },
  [S.START]:      { bg: 'from-emerald-500 to-emerald-700', icon: '\u2705',    title: 'SESSAO INICIADA',     sub: '',                     pulse: false },
  [S.STOP]:       { bg: 'from-emerald-500 to-emerald-700', icon: '\u23F9',    title: 'SESSAO ENCERRADA',    sub: '',                     pulse: false },
  [S.LOCATION]:   { bg: 'from-teal-500 to-teal-700',      icon: '\u{1F4CD}', title: 'LOCALIZACAO ALTERADA', sub: '',                     pulse: false },
  [S.ERROR]:      { bg: 'from-red-600 to-red-800',        icon: '\u274C',    title: 'ERRO',                sub: '',                     pulse: false },
  [S.NFC_OFF]:    { bg: 'from-gray-700 to-gray-900',      icon: '\u{1F6AB}', title: 'NFC NAO DISPONIVEL',  sub: 'Use Chrome no Android para NFC. Ou use a entrada manual abaixo.', pulse: false },
};

// ============================================
// AUTO-REGISTO COMO MAQUINA NO FIRESTORE
// ============================================
const autoRegisterMachine = async (machineId) => {
  if (!db) return;
  const ref = doc(db, `${BASE_PATH}/machines`, machineId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: machineId,
      name: `Hub Mobile ${machineId.slice(-8)}`,
      category: { id: 'mobile-hub', name: 'Hub Mobile', code: 'MOB' },
      status: 'IDLE',
      type: 'mobile',
      totalHours: 0,
      location: null,
      createdAt: new Date(),
      registeredBy: 'auto-mobile-hub',
    });
    console.log(`\u2705 Maquina ${machineId} registada automaticamente no Firestore`);
  }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function MobileHubView() {
  const [machineId] = useState(getOrCreateMachineId);
  const [status, setStatus] = useState(S.READY);
  const [message, setMessage] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [manualCard, setManualCard] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [nfcStarted, setNfcStarted] = useState(false);
  const timerRef = useRef(null);

  // Auto-registo ao montar
  useEffect(() => {
    autoRegisterMachine(machineId).then(() => setRegistered(true)).catch(console.error);
  }, [machineId]);

  // Monitorizar sessao ativa
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, `${BASE_PATH}/sessions`),
      where('machineId', '==', machineId),
      where('endTime', '==', null),
      limit(1)
    );
    return onSnapshot(q, (snap) => {
      setActiveSession(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  }, [machineId]);

  // Cleanup timer
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Reset para READY apos feedback
  const resetAfter = (ms = 4000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setStatus(S.READY); setMessage(''); }, ms);
  };

  // ============================================
  // ENVIAR SCAN
  // ============================================
  const sendScan = useCallback(async (cardId) => {
    setStatus(S.PROCESSING);
    setMessage('A enviar...');

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, machineId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(S.ERROR);
        setMessage(data.message || data.error || `Erro ${res.status}`);
      } else if (data.status === 'START') {
        setStatus(S.START);
        setMessage(`Operador ${cardId} iniciou sessao`);
        setScanCount(c => c + 1);
      } else if (data.status === 'STOP') {
        setStatus(S.STOP);
        setMessage(`Sessao encerrada - ${data.duration}h`);
        setScanCount(c => c + 1);
      } else if (data.status === 'LOCATION_CHANGED') {
        setStatus(S.LOCATION);
        setMessage(`Nova localizacao: ${data.newLocation}`);
        setScanCount(c => c + 1);
      } else if (data.status === 'DENIED') {
        setStatus(S.ERROR);
        setMessage(data.message || 'Acesso negado');
      } else {
        setStatus(S.START);
        setMessage(data.message || 'OK');
        setScanCount(c => c + 1);
      }
    } catch (err) {
      setStatus(S.ERROR);
      setMessage(err.message === 'Failed to fetch' ? 'Sem ligacao ao servidor.' : err.message);
    }

    resetAfter();
  }, [machineId]);

  // ============================================
  // WEB NFC — iniciado por gesto do utilizador
  // ============================================
  const startNfc = useCallback(async () => {
    if (!('NDEFReader' in window)) {
      setStatus(S.NFC_OFF);
      setShowManual(true);
      return;
    }

    try {
      const reader = new window.NDEFReader();
      await reader.scan();

      reader.addEventListener('reading', ({ serialNumber }) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const card = serialNumber ? serialNumber.replace(/:/g, '').toUpperCase() : `NFC_${Date.now()}`;
        setStatus(S.READING);
        setMessage(`Cartao: ${card}`);
        setTimeout(() => sendScan(card), 300);
      });

      reader.addEventListener('readingerror', () => {
        setStatus(S.ERROR);
        setMessage('Erro ao ler cartao. Tente novamente.');
        resetAfter(3000);
      });

      setNfcStarted(true);
      setStatus(S.READY);
      setMessage('NFC ativo');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setStatus(S.ERROR);
        setMessage('Permissao NFC negada. Verifica as permissoes do browser.');
      } else {
        setStatus(S.NFC_OFF);
      }
      setShowManual(true);
    }
  }, [sendScan]);

  // ============================================
  // MANUAL SCAN
  // ============================================
  const handleManual = (e) => {
    e.preventDefault();
    if (!manualCard.trim()) return;
    sendScan(manualCard.trim().toUpperCase());
    setManualCard('');
  };

  const cfg = UI[status] || UI[S.READY];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${cfg.bg} flex flex-col text-white transition-colors duration-500 select-none`}>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${registered ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-xs font-mono text-white/70 truncate max-w-[180px]">{machineId}</span>
        </div>
        <div className="flex items-center gap-3">
          {activeSession && (
            <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-full font-medium">
              Sessao Ativa
            </span>
          )}
          <span className="text-xs text-white/50">{scanCount} scans</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-6">

        {/* Icon */}
        <div className={`relative ${cfg.pulse ? 'animate-pulse' : ''}`}>
          {cfg.pulse && (
            <>
              <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-4 rounded-full bg-white/5 animate-ping" style={{ animationDuration: '3s' }} />
            </>
          )}
          <div className="relative w-32 h-32 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border-2 border-white/20">
            <span className="text-6xl">{cfg.icon}</span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider">{cfg.title}</h1>
          {(message || cfg.sub) && (
            <p className="text-sm sm:text-base text-white/70 max-w-xs mx-auto">{message || cfg.sub}</p>
          )}
        </div>

        {/* Active Session */}
        {activeSession && status === S.READY && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 w-full max-w-xs border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Sessao em Curso</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Operador</span>
                <span className="font-mono">{activeSession.cardId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Inicio</span>
                <span className="font-mono text-xs">
                  {activeSession.startTime?.toDate
                    ? activeSession.startTime.toDate().toLocaleTimeString('pt-PT')
                    : '--:--'}
                </span>
              </div>
            </div>
            <p className="text-xs text-white/40 mt-3 text-center">Aproxime o mesmo cartao para encerrar</p>
          </div>
        )}
      </div>

      {/* Manual Input */}
      {showManual && (
        <div className="px-4 pb-4">
          <div className="bg-black/20 backdrop-blur rounded-2xl p-4 max-w-sm mx-auto">
            <p className="text-xs text-white/50 mb-3 text-center">Entrada manual de cartao</p>
            <form onSubmit={handleManual} className="flex gap-2">
              <input
                type="text"
                value={manualCard}
                onChange={(e) => setManualCard(e.target.value)}
                placeholder="ID do cartao..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-mono
                           focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/30"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCard.trim()}
                className="px-5 py-3 bg-white/20 hover:bg-white/30 disabled:opacity-30
                           rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                SCAN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Botao Ativar NFC */}
      {!nfcStarted && status !== S.NFC_OFF && (
        <div className="px-4 pb-4 text-center">
          <button
            onClick={startNfc}
            className="px-8 py-4 bg-white/20 hover:bg-white/30 active:scale-95 rounded-2xl font-bold text-lg transition-all border border-white/20"
          >
            Ativar NFC
          </button>
        </div>
      )}

      {/* Toggle manual */}
      {!showManual && (nfcStarted || status === S.NFC_OFF) && (
        <div className="px-4 pb-4 text-center">
          <button onClick={() => setShowManual(true)} className="text-xs text-white/30 hover:text-white/60 underline">
            Entrada manual
          </button>
        </div>
      )}

      {/* Bottom */}
      <div className="px-4 py-3 bg-black/20 flex items-center justify-between text-xs text-white/30">
        <span>Hub Mobile</span>
        <span>Casais Fleet Intelligence</span>
      </div>
    </div>
  );
}
