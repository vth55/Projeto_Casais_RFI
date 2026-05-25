import { create } from 'zustand';
import { db, projectId } from '../config/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, limit, orderBy,
} from 'firebase/firestore';

const BASE = `artifacts/${projectId}/public/data`;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function findToolByTag(tagId) {
  const q = query(
    collection(db, `${BASE}/tools`),
    where('nfcTagId', '==', tagId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function findOpenSession(toolId, operatorId) {
  const q = query(
    collection(db, `${BASE}/tool_sessions`),
    where('toolId', '==', toolId),
    where('operatorId', '==', operatorId),
    where('status', '==', 'OPEN'),
    orderBy('startTime', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function openSession(tool, operator) {
  const ref = await addDoc(collection(db, `${BASE}/tool_sessions`), {
    toolId: tool.id,
    toolName: tool.name,
    toolType: tool.type || null,
    nfcTagId: tool.nfcTagId,
    operatorId: operator.uid,
    operatorName: operator.name || operator.displayName || operator.email,
    obraId: tool.currentObraId || null,
    obraName: tool.currentObraName || null,
    status: 'OPEN',
    startTime: serverTimestamp(),
    endTime: null,
    durationHours: null,
    procoreSynced: false,
    sapSynced: false,
  });
  return ref.id;
}

async function closeSession(sessionId, session) {
  const now = new Date();
  const start = session.startTime?.toDate?.() ?? now;
  const durationMs = now - start;
  const durationHours = Math.round((durationMs / 3_600_000) * 100) / 100;

  await updateDoc(doc(db, `${BASE}/tool_sessions`, sessionId), {
    status: 'CLOSED',
    endTime: serverTimestamp(),
    durationHours,
  });
  return durationHours;
}

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

const useNfcStore = create((set, get) => ({
  supported: 'NDEFReader' in window,
  active: false,
  error: null,

  // Confirmation sheet state
  pending: null,   // { tool, session|null, action: 'checkout'|'checkin' }
  countdown: null,
  autoConfirmTimer: null,

  startListening: async (operator) => {
    if (!('NDEFReader' in window)) {
      set({ active: false, error: 'NFC não disponível neste dispositivo' });
      return;
    }

    try {
      const reader = new window.NDEFReader();
      await reader.scan();

      reader.addEventListener('reading', ({ serialNumber, message }) => {
        // Prefer NDEF text record content; fallback to serial number
        let tagId = null;
        if (message?.records?.length) {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              tagId = decoder.decode(record.data).trim().toUpperCase();
              break;
            }
          }
        }
        if (!tagId && serialNumber) {
          tagId = serialNumber.replace(/:/g, '').toUpperCase();
        }
        if (!tagId) return;

        get().handleTagRead(tagId, operator);
      });

      reader.addEventListener('readingerror', () => {
        set({ error: 'Erro de leitura NFC' });
      });

      set({ active: true, error: null });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        set({ active: false, error: 'Permissão NFC negada' });
      } else {
        set({ active: false, error: err.message });
      }
    }
  },

  handleTagRead: async (tagId, operator) => {
    // Dismiss any existing pending confirmation first
    get().dismissPending();

    try {
      const tool = await findToolByTag(tagId);

      if (!tool) {
        set({
          pending: {
            unknown: true,
            tagId,
            message: `Tag desconhecida: ${tagId}`,
          },
        });
        get().startAutoConfirmCountdown(null);
        return;
      }

      const openSess = await findOpenSession(tool.id, operator.uid);
      const action = openSess ? 'checkin' : 'checkout';

      set({ pending: { tool, session: openSess, action, operator } });
      get().startAutoConfirmCountdown(() => get().confirmAction());
    } catch (err) {
      console.error('NFC tag processing error:', err);
    }
  },

  startAutoConfirmCountdown: (onComplete, seconds = 4) => {
    const { autoConfirmTimer } = get();
    if (autoConfirmTimer) clearInterval(autoConfirmTimer);

    set({ countdown: seconds });
    const timer = setInterval(() => {
      const current = get().countdown;
      if (current <= 1) {
        clearInterval(timer);
        set({ countdown: null, autoConfirmTimer: null });
        if (onComplete) onComplete();
      } else {
        set({ countdown: current - 1 });
      }
    }, 1000);
    set({ autoConfirmTimer: timer });
  },

  confirmAction: async () => {
    const { pending } = get();
    if (!pending || pending.unknown) {
      get().dismissPending();
      return;
    }

    const { tool, session, action, operator } = pending;
    get().dismissPending();

    try {
      if (action === 'checkout') {
        await openSession(tool, operator);
      } else {
        await closeSession(session.id, session);
      }
    } catch (err) {
      console.error('Session action error:', err);
    }
  },

  dismissPending: () => {
    const { autoConfirmTimer } = get();
    if (autoConfirmTimer) clearInterval(autoConfirmTimer);
    set({ pending: null, countdown: null, autoConfirmTimer: null });
  },

  stopListening: () => {
    set({ active: false });
  },
}));

export default useNfcStore;
