import React, { useEffect, useState, useRef } from 'react';
import { db, projectId } from '../config/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, limit, getDoc,
} from 'firebase/firestore';
import { LogOut, LogIn, Package, MapPin, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { getCurrentPosition } from '../utils/geolocation';

const BASE = `artifacts/${projectId}/public/data`;

const S = {
  LOADING: 'loading',
  NEEDS_LOGIN: 'needs_login',
  TOOL_NOT_FOUND: 'not_found',
  CONFIRM_CHECKOUT: 'confirm_checkout',
  CONFIRM_CHECKIN: 'confirm_checkin',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function ToolTagPage() {
  const [state, setState] = useState(S.LOADING);
  const [tool, setTool] = useState(null);
  const [openSession, setOpenSession] = useState(null);
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(4);
  const { currentUser, isAuthenticated, authLoading } = useAuthStore();

  // Extract tagId from URL: /t/:tagId
  const tagId = window.location.pathname.split('/t/')[1]?.split('?')[0]?.toUpperCase();

  // Garante que loadTool() só corre uma vez — Firebase Auth pode disparar null→user
  // em cold start, o que re-executaria o effect e chamaria loadTool() uma segunda
  // vez já com a sessão de checkout criada, causando ciclo checkout→checkin.
  const loadedRef = useRef(false);

  // Ref para a função confirm — fix para stale closure no setInterval do countdown.
  // O interval captura confirm do render em que o effect correu; sem este ref,
  // usaria values velhos de state/openSession quando o timer disparasse.
  const confirmRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !(currentUser?.id || currentUser?.uid)) {
      // Só mostrar NEEDS_LOGIN se ainda não carregámos — evita flicker se o
      // Firebase Auth disparar null brevemente depois de já termos o tool carregado.
      if (!loadedRef.current) setState(S.NEEDS_LOGIN);
      return;
    }
    if (!tagId) { setState(S.TOOL_NOT_FOUND); return; }
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadTool();
  }, [authLoading, isAuthenticated, (currentUser?.id || currentUser?.uid), tagId]);

  async function loadTool() {
    // Guardas defensivas — sem estes campos definidos, Firestore where() crasha
    if (!tagId) { setState(S.TOOL_NOT_FOUND); return; }
    const uid = (currentUser?.id || currentUser?.uid);
    if (!uid) { setState(S.NEEDS_LOGIN); return; }

    setState(S.LOADING);
    try {
      const q = query(
        collection(db, `${BASE}/tools`),
        where('nfcTagId', '==', tagId),
        limit(1),
      );
      const snap = await getDocs(q);
      if (snap.empty) { setState(S.TOOL_NOT_FOUND); return; }

      const toolData = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setTool(toolData);

      // Check for open session by this user
      const sessQ = query(
        collection(db, `${BASE}/tool_sessions`),
        where('toolId', '==', toolData.id),
        where('operatorId', '==', uid),
        where('status', '==', 'OPEN'),
        limit(1),
      );
      const sessSnap = await getDocs(sessQ);
      const sess = sessSnap.empty ? null : { id: sessSnap.docs[0].id, ...sessSnap.docs[0].data() };
      setOpenSession(sess);
      setState(sess ? S.CONFIRM_CHECKIN : S.CONFIRM_CHECKOUT);
    } catch (err) {
      console.error('ToolTagPage loadTool error:', err);
      setState(S.ERROR);
      setResult(err.message || String(err));
    }
  }

  // Auto-confirm countdown
  useEffect(() => {
    if (state !== S.CONFIRM_CHECKOUT && state !== S.CONFIRM_CHECKIN) return;
    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); confirmRef.current?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  async function confirm() {
    if (state === S.PROCESSING || state === S.SUCCESS) return;
    const uid = (currentUser?.id || currentUser?.uid);
    if (!uid || !tool) { setState(S.ERROR); setResult('Sessão expirada — refaz login'); return; }
    setState(S.PROCESSING);
    try {
      if (!openSession) {
        const location = await getCurrentPosition();
        // Check-out
        await addDoc(collection(db, `${BASE}/tool_sessions`), {
          toolId: tool.id,
          toolName: tool.name,
          toolType: tool.type || null,
          nfcTagId: tool.nfcTagId,
          operatorId: uid,
          operatorName: currentUser.name || currentUser.displayName || currentUser.email || uid,
          // SAP fields
          sapOrigin: tool.storageLocation || 'Armazém',
          sapDestination: tool.currentObraName || null,
          sapWorker: uid,
          // Procore
          obraId: tool.currentObraId || null,
          obraName: tool.currentObraName || null,
          status: 'OPEN',
          startTime: serverTimestamp(),
          endTime: null,
          durationHours: null,
          procoreSynced: false,
          sapSynced: false,
          location: location || null,
        });
        setResult({ action: 'checkout', toolName: tool.name });
      } else {
        const location = await getCurrentPosition();
        // Check-in
        const now = new Date();
        const start = openSession.startTime?.toDate?.() ?? now;
        const durationHours = Math.round(((now - start) / 3_600_000) * 100) / 100;
        await updateDoc(doc(db, `${BASE}/tool_sessions`, openSession.id), {
          status: 'CLOSED',
          endTime: serverTimestamp(),
          durationHours,
          endLocation: location || null,
        });
        setResult({ action: 'checkin', toolName: tool.name, durationHours });
      }
      setState(S.SUCCESS);
    } catch (err) {
      setState(S.ERROR);
      setResult(err.message);
    }
  }

  // Manter confirmRef sincronizado com o render atual — o setInterval
  // chama confirmRef.current para ter sempre state/openSession/tool atuais.
  confirmRef.current = confirm;

  // ──── Render ────

  if (state === S.LOADING || authLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
    </div>
  );

  if (state === S.NEEDS_LOGIN) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center">
        <User className="w-7 h-7 text-primary-400" />
      </div>
      <p className="text-white font-bold text-lg text-center">Inicia sessão para registar o equipamento</p>
      <a
        href="/"
        className="px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold text-sm"
      >
        Ir para login
      </a>
    </div>
  );

  if (state === S.TOOL_NOT_FOUND) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 gap-4">
      <AlertCircle className="w-12 h-12 text-amber-400" />
      <p className="text-white font-bold text-lg text-center">Tag não reconhecida</p>
      <p className="text-slate-400 text-sm text-center font-mono">{tagId}</p>
      <a href="/" className="text-primary-400 text-sm underline">Voltar à app</a>
    </div>
  );

  if (state === S.SUCCESS) return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 gap-5
      ${result?.action === 'checkout' ? 'bg-emerald-900' : 'bg-blue-900'}`}>
      <CheckCircle className="w-16 h-16 text-white" />
      <div className="text-center">
        <p className="text-white font-black text-2xl">{result?.toolName}</p>
        <p className="text-white/70 text-base mt-1">
          {result?.action === 'checkout'
            ? 'Saída registada'
            : `Devolvido · ${result?.durationHours}h`
          }
        </p>
      </div>
      <a href="/" className="mt-4 text-white/50 text-sm underline">Voltar à app</a>
    </div>
  );

  if (state === S.ERROR) return (
    <div className="min-h-screen bg-red-900 flex flex-col items-center justify-center p-6 gap-4">
      <AlertCircle className="w-12 h-12 text-white" />
      <p className="text-white font-bold text-lg text-center">Erro ao processar</p>
      <p className="text-white/60 text-sm text-center">{result}</p>
      <a href="/" className="text-white/50 text-sm underline">Voltar à app</a>
    </div>
  );

  // CONFIRM_CHECKOUT or CONFIRM_CHECKIN
  const isCheckout = state === S.CONFIRM_CHECKOUT || state === S.PROCESSING;

  return (
    <div className={`min-h-screen flex flex-col ${isCheckout ? 'bg-slate-900' : 'bg-slate-900'}`}>

      {/* Top accent */}
      <div className={`h-1.5 w-full ${isCheckout ? 'bg-emerald-500' : 'bg-blue-500'}`} />

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">

        {/* Icon */}
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center
          ${isCheckout ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
          {isCheckout
            ? <LogOut className="w-9 h-9 text-emerald-400" />
            : <LogIn className="w-9 h-9 text-blue-400" />
          }
        </div>

        {/* Tool info */}
        <div className="text-center">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">
            {isCheckout ? 'Saída de equipamento' : 'Devolução de equipamento'}
          </p>
          <p className="text-white font-black text-2xl leading-tight">{tool.name}</p>
          {tool.type && <p className="text-slate-400 text-sm mt-1">{tool.type}</p>}
        </div>

        {/* Details card */}
        <div className="w-full max-w-xs bg-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Funcionário</p>
              <p className="text-sm text-white font-medium">
                {currentUser?.name || currentUser?.displayName || currentUser?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Origem</p>
              <p className="text-sm text-white font-medium">{tool.storageLocation || 'Armazém'}</p>
            </div>
          </div>
          {tool.currentObraName && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Destino</p>
                <p className="text-sm text-white font-medium">{tool.currentObraName}</p>
              </div>
            </div>
          )}
          {!isCheckout && openSession?.startTime && (
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Saiu às</p>
                <p className="text-sm text-white font-medium">
                  {openSession.startTime?.toDate?.()?.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Confirm button with countdown */}
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={confirm}
            disabled={state === S.PROCESSING}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg relative overflow-hidden
              transition-all active:scale-95 disabled:opacity-60
              ${isCheckout ? 'bg-emerald-500' : 'bg-blue-500'}`}
          >
            <span
              className="absolute left-0 inset-y-0 bg-white/20 transition-all duration-1000"
              style={{ width: `${(countdown / 4) * 100}%` }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {state === S.PROCESSING
                ? <><Loader2 className="w-5 h-5 animate-spin" /> A registar...</>
                : <>{isCheckout ? 'Confirmar saída' : 'Confirmar devolução'} · {countdown}s</>
              }
            </span>
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full py-3 rounded-2xl text-slate-400 text-sm font-medium
              border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
