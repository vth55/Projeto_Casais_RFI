/**
 * EquipamentosView - inventario operacional de equipamentos pequenos com NFC.
 *
 * Sem CAN bus nem tracking continuo: a localizacao apresentada e sempre a
 * ultima leitura NFC conhecida. A pagina funciona como inventory dashboard.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import {
  Wrench, Plus, Search, Edit2, Trash2, Nfc, Tag, Copy, Check,
  Building2, Package, AlertCircle, LogOut, Radio, Loader2, Clock,
  ShieldAlert, Activity, TrendingUp, Euro, BarChart3,
} from 'lucide-react';
import useStore from '../store/useStore';

const BASE = `artifacts/${projectId}/public/data`;
const TOOLS_PATH = `${BASE}/tools`;
const SESSIONS_PATH = `${BASE}/tool_sessions`;
const STALE_READ_DAYS = 7;
const DORMANT_DAYS = 30;
const RECENT_READ_DAYS = 7;

const TOOL_TYPES = [
  'Martelo Pneumático',
  'Compactador',
  'Berbequim',
  'Rebarbadora',
  'Vibrador de Betão',
  'Gerador Pequeno',
  'Soldadora',
  'Outro',
];

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function formatRelative(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'sem leitura';
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `há ${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `há ${hours}h`;
  const minutes = Math.floor(diff / 60000);
  if (minutes >= 1) return `há ${minutes}min`;
  return 'agora';
}

function getSessionReadTime(session) {
  return session?.endTime || session?.startTime || session?.createdAt || null;
}

function getNumericCost(tool) {
  const value = Number(tool?.replacementCost);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function daysBetween(a, b) {
  const start = toDate(a);
  const end = toDate(b);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, (end.getTime() - start.getTime()) / 86400000);
}

function isOpenIssue(record) {
  return record?.status === 'OPEN' || record?.status === 'IN_PROGRESS';
}

function getModelLabel(tool) {
  const brand = tool.brand || tool.manufacturer || '';
  const model = tool.model || tool.modelName || '';
  const joined = `${brand} ${model}`.trim();
  return joined || tool.type || 'Sem modelo';
}

function calculateEquipmentIntelligence({ tools, openSessions, latestSessions, allSessions, toolMaintenance }) {
  const now = Date.now();
  const recentThreshold = RECENT_READ_DAYS * 86400000;
  const staleThreshold = STALE_READ_DAYS * 86400000;
  const dormantThreshold = DORMANT_DAYS * 86400000;
  const monthAgo = now - 30 * 86400000;

  const sessions30d = allSessions.filter((session) => {
    const time = toDate(getSessionReadTime(session) || session.startTime);
    return time && !Number.isNaN(time.getTime()) && time.getTime() >= monthAgo;
  });

  const maintenance30d = toolMaintenance.filter((record) => {
    const time = toDate(record.reportedAt || record.createdAt);
    return time && !Number.isNaN(time.getTime()) && time.getTime() >= monthAgo;
  });

  const openIssueByTool = new Map();
  toolMaintenance.forEach((record) => {
    if (record.toolId && isOpenIssue(record)) openIssueByTool.set(record.toolId, true);
  });

  let recentReads = 0;
  let riskCount = 0;
  let riskValue = 0;
  let dormantCount = 0;
  let valueOnSite = 0;

  tools.forEach((tool) => {
    const latest = latestSessions[tool.id];
    const lastRead = toDate(getSessionReadTime(latest));
    const age = lastRead && !Number.isNaN(lastRead.getTime()) ? now - lastRead.getTime() : Infinity;
    const cost = getNumericCost(tool);
    const isInUse = !!openSessions[tool.id] || !!tool.currentObraId;
    const isRisk = age > staleThreshold && tool.status !== 'LOST' && tool.status !== 'RETIRED';

    if (age <= recentThreshold) recentReads += 1;
    if (age > dormantThreshold && !isInUse) dormantCount += 1;
    if (isInUse) valueOnSite += cost;
    if (isRisk || openIssueByTool.has(tool.id)) {
      riskCount += 1;
      riskValue += cost;
    }
  });

  const resolvedDurations = toolMaintenance
    .filter(record => record.status === 'DONE' && record.reportedAt && record.resolvedAt)
    .map(record => daysBetween(record.reportedAt, record.resolvedAt))
    .filter(value => value != null);

  const issueCount30d = maintenance30d.filter(record =>
    ['DAMAGE', 'REPAIR', 'LOSS'].includes(record.type)
  ).length;

  return {
    total: tools.length,
    inUse: Object.keys(openSessions).length,
    available: Math.max(0, tools.length - Object.keys(openSessions).length),
    stale: tools.filter((tool) => {
      const latest = latestSessions[tool.id];
      const lastReadAt = toDate(getSessionReadTime(latest));
      return !lastReadAt || now - lastReadAt.getTime() > staleThreshold;
    }).length,
    riskCount,
    riskValue,
    nfcCoveragePct: tools.length ? Math.round((recentReads / tools.length) * 100) : 0,
    issuesPer100Checkouts: sessions30d.length ? Math.round((issueCount30d / sessions30d.length) * 1000) / 10 : 0,
    rotation30d: tools.length ? Math.round((sessions30d.length / tools.length) * 10) / 10 : 0,
    dormantCount,
    valueOnSite,
    openIssues: toolMaintenance.filter(isOpenIssue).length,
    avgResolutionDays: resolvedDurations.length
      ? Math.round((resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length) * 10) / 10
      : null,
  };
}

// ──────────────────────────────────────────────
// Modal: criar / editar equipamento
// ──────────────────────────────────────────────
function ToolModal({ tool, onClose, onSaved }) {
  const isEdit = !!tool?.id;
  const [name, setName] = useState(tool?.name || '');
  const [type, setType] = useState(tool?.type || TOOL_TYPES[0]);
  const [nfcTagId, setNfcTagId] = useState(tool?.nfcTagId || '');
  const [storageLocation, setStorageLocation] = useState(tool?.storageLocation || 'Armazém Central');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  // Web NFC scan para preencher automaticamente
  async function scanNfcTag() {
    if (!('NDEFReader' in window)) {
      setError('NFC não suportado neste browser (precisa de Chrome Android)');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.addEventListener('reading', ({ serialNumber, message }) => {
        let tagId = null;
        if (message?.records?.length) {
          for (const r of message.records) {
            if (r.recordType === 'text') {
              const d = new TextDecoder(r.encoding || 'utf-8');
              tagId = d.decode(r.data).trim().toUpperCase();
              break;
            }
          }
        }
        if (!tagId && serialNumber) {
          tagId = serialNumber.replace(/:/g, '').toUpperCase();
        }
        if (tagId) setNfcTagId(tagId);
        setScanning(false);
      }, { once: true });
    } catch (err) {
      setError(err.message);
      setScanning(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!name.trim() || !nfcTagId.trim()) {
      setError('Nome e tag NFC são obrigatórios');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        type,
        nfcTagId: nfcTagId.trim().toUpperCase(),
        storageLocation: storageLocation.trim(),
        updatedAt: serverTimestamp(),
      };
      if (isEdit) {
        await updateDoc(doc(db, TOOLS_PATH, tool.id), data);
      } else {
        await addDoc(collection(db, TOOLS_PATH), {
          ...data,
          currentObraId: null,
          currentObraName: null,
          createdAt: serverTimestamp(),
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <form onSubmit={save} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">
            {isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Martelo Pneumático #3"
              required
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Tag NFC</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={nfcTagId}
                onChange={(e) => setNfcTagId(e.target.value.toUpperCase())}
                placeholder="MARTELO_003"
                required
                className="flex-1 px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={scanNfcTag}
                disabled={scanning}
                className="px-3 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Nfc className="w-4 h-4" />
                {scanning ? 'A ler...' : 'Scan'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Escreve manualmente ou clica em Scan e encosta a tag
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Armazém (origem SAP)</label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'A guardar...' : (isEdit ? 'Guardar' : 'Criar')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────
// Escreve URL na tag NFC (Web NFC API — só Chrome Android)
// ──────────────────────────────────────────────
async function writeUrlToNfcTag(url) {
  if (!('NDEFReader' in window)) {
    throw new Error('NFC não suportado (precisa Chrome Android)');
  }
  const reader = new window.NDEFReader();
  await reader.write({
    records: [{ recordType: 'url', data: url }],
  });
}

// ──────────────────────────────────────────────
// Card de equipamento
// ──────────────────────────────────────────────
function ToolCard({ tool, openSession, latestSession, onEdit, onDelete, onCopyUrl, onProgramTag, programming }) {
  const isInUse = !!openSession;
  const lastReadAt = getSessionReadTime(latestSession);
  const lastReadLocation = latestSession?.obraName
    || latestSession?.currentObraName
    || tool.currentObraName
    || tool.storageLocation
    || 'localização desconhecida';
  const lastReadOperator = latestSession?.operatorName || latestSession?.operatorId || 'operador desconhecido';

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${
      isInUse ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700'
    } p-4 hover:shadow-md transition-shadow`}>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isInUse ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700'
          }`}>
            <Wrench className={`w-5 h-5 ${isInUse ? 'text-emerald-600' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white truncate">{tool.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tool.type}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-slate-600 dark:text-slate-300">{tool.nfcTagId}</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={onCopyUrl}
              className="text-primary-500 hover:text-primary-600 flex items-center gap-1"
              title="Copiar URL da tag"
            >
              <Copy className="w-3 h-3" />
              URL
            </button>
            <button
              onClick={onProgramTag}
              disabled={programming}
              className="text-primary-500 hover:text-primary-600 flex items-center gap-1 disabled:opacity-50"
              title="Escrever este URL numa tag NFC física"
            >
              {programming ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Radio className="w-3 h-3" />
              )}
              {programming ? 'A escrever...' : 'Programar'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Package className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-300">{tool.storageLocation || 'Sem armazém'}</span>
        </div>
        {tool.currentObraName && (
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-300">{tool.currentObraName}</span>
          </div>
        )}
        <div className="flex items-start gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
          <span className="text-slate-600 dark:text-slate-300">
            Última leitura NFC — {formatRelative(lastReadAt)}
            {latestSession ? ` em ${lastReadLocation} por ${lastReadOperator}` : ''}
          </span>
        </div>
      </div>

      {isInUse && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <LogOut className="w-3.5 h-3.5" />
              Em uso por {openSession.operatorName}
            </span>
            <span className="text-slate-500">
              {openSession.startTime?.toDate?.()?.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function IntelligenceCard({ icon: Icon, label, value, helper, tone = 'slate' }) {
  const toneMap = {
    slate: 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800',
    blue: 'border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 bg-primary-50/60 dark:bg-primary-900/10',
    emerald: 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/10',
    amber: 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-900/10',
    red: 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50/60 dark:bg-red-900/10',
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone] || toneMap.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold opacity-75">{label}</p>
          <p className="text-2xl font-black mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-slate-900/40 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {helper && <p className="text-xs mt-2 opacity-75 leading-snug">{helper}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────
// View principal
// ──────────────────────────────────────────────
export default function EquipamentosView() {
  const { toolMaintenance = [] } = useStore();
  const [tools, setTools] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [openSessions, setOpenSessions] = useState({});
  const [latestSessions, setLatestSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);  // null | {} | tool obj
  const [copied, setCopied] = useState(null);
  const [programming, setProgramming] = useState(null);  // tool.id em execução
  const [toast, setToast] = useState(null);  // { kind: 'success'|'error', msg }

  // Listener: equipamentos
  useEffect(() => {
    const q = query(collection(db, TOOLS_PATH));
    const unsub = onSnapshot(q, (snap) => {
      setTools(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Listener: leituras NFC. A localização é última leitura conhecida, não GPS real-time.
  useEffect(() => {
    const q = query(collection(db, SESSIONS_PATH), orderBy('startTime', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const open = {};
      const latest = {};
      const sessions = [];
      snap.docs.forEach(d => {
        const session = { id: d.id, ...d.data() };
        sessions.push(session);
        if (session.toolId && !latest[session.toolId]) latest[session.toolId] = session;
        if (session.status === 'OPEN') open[session.toolId] = session;
      });
      setAllSessions(sessions);
      setOpenSessions(open);
      setLatestSessions(latest);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return tools.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      const latest = latestSessions[t.id];
      const lastReadAt = toDate(getSessionReadTime(latest));
      const isStale = !lastReadAt || Date.now() - lastReadAt.getTime() > STALE_READ_DAYS * 86400000;
      if (statusFilter === 'in-use' && !openSessions[t.id]) return false;
      if (statusFilter === 'available' && openSessions[t.id]) return false;
      if (statusFilter === 'stale' && !isStale) return false;
      if (!s) return true;
      return (t.name || '').toLowerCase().includes(s)
          || (t.nfcTagId || '').toLowerCase().includes(s)
          || (t.type || '').toLowerCase().includes(s);
    });
  }, [tools, search, filterType, statusFilter, openSessions, latestSessions]);

  const stats = useMemo(() => calculateEquipmentIntelligence({
    tools,
    openSessions,
    latestSessions,
    allSessions,
    toolMaintenance,
  }), [tools, openSessions, latestSessions, allSessions, toolMaintenance]);

  const modelGroups = useMemo(() => {
    const groups = new Map();
    tools.forEach((tool) => {
      const label = getModelLabel(tool);
      const group = groups.get(label) || {
        label,
        total: 0,
        inUse: 0,
        stale: 0,
        value: 0,
        searchToken: label,
      };
      const latest = latestSessions[tool.id];
      const lastReadAt = toDate(getSessionReadTime(latest));
      const stale = !lastReadAt || Date.now() - lastReadAt.getTime() > STALE_READ_DAYS * 86400000;
      group.total += 1;
      group.inUse += openSessions[tool.id] ? 1 : 0;
      group.stale += stale ? 1 : 0;
      group.value += getNumericCost(tool);
      groups.set(label, group);
    });
    return Array.from(groups.values())
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [tools, openSessions, latestSessions]);

  async function handleDelete(tool) {
    if (!confirm(`Eliminar "${tool.name}"?`)) return;
    await deleteDoc(doc(db, TOOLS_PATH, tool.id));
  }

  function handleCopyUrl(tool) {
    const url = `${window.location.origin}/t/${tool.nfcTagId}`;
    navigator.clipboard?.writeText(url);
    setCopied(tool.id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleProgramTag(tool) {
    const url = `${window.location.origin}/t/${tool.nfcTagId}`;
    setProgramming(tool.id);
    setToast({ kind: 'info', msg: `Encosta a tag de "${tool.name}" ao telemóvel agora...` });
    try {
      await writeUrlToNfcTag(url);
      setToast({ kind: 'success', msg: `Tag de "${tool.name}" programada!` });
    } catch (err) {
      setToast({ kind: 'error', msg: err.message });
    } finally {
      setProgramming(null);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Equipamentos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Equipamentos pequenos com tag NFC — saídas e devoluções automáticas
          </p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Equipamento
        </button>
      </div>

      {/* Intelligence KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <IntelligenceCard
          icon={ShieldAlert}
          label="Valor em risco"
          value={formatCurrency(stats.riskValue)}
          helper={`${stats.riskCount} equipamentos sem leitura recente ou com avaria aberta`}
          tone={stats.riskValue > 0 ? 'red' : 'emerald'}
        />
        <IntelligenceCard
          icon={Radio}
          label="Cobertura NFC"
          value={`${stats.nfcCoveragePct}%`}
          helper={`Com leitura nos últimos ${RECENT_READ_DAYS} dias`}
          tone={stats.nfcCoveragePct >= 80 ? 'emerald' : stats.nfcCoveragePct >= 60 ? 'amber' : 'red'}
        />
        <IntelligenceCard
          icon={BarChart3}
          label="Avarias / 100 usos"
          value={stats.issuesPer100Checkouts}
          helper="Dano, reparação ou perda nos últimos 30 dias"
          tone={stats.issuesPer100Checkouts > 5 ? 'red' : stats.issuesPer100Checkouts > 2 ? 'amber' : 'blue'}
        />
        <IntelligenceCard
          icon={TrendingUp}
          label="Rotação 30d"
          value={`${stats.rotation30d}x`}
          helper="Leituras por equipamento nos últimos 30 dias"
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <IntelligenceCard
          icon={Package}
          label="Total"
          value={stats.total}
          helper={`${stats.available} disponíveis · ${stats.inUse} em uso`}
        />
        <IntelligenceCard
          icon={Clock}
          label="Dormentes"
          value={stats.dormantCount}
          helper={`Sem leitura há mais de ${DORMANT_DAYS} dias`}
          tone={stats.dormantCount > 0 ? 'amber' : 'emerald'}
        />
        <IntelligenceCard
          icon={Euro}
          label="Valor em obra"
          value={formatCurrency(stats.valueOnSite)}
          helper="Valor de substituição actualmente fora do armazém"
          tone="slate"
        />
        <IntelligenceCard
          icon={Activity}
          label="Resolução média"
          value={stats.avgResolutionDays == null ? '—' : `${stats.avgResolutionDays}d`}
          helper={`${stats.openIssues} avarias abertas/em progresso`}
          tone={stats.openIssues > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {modelGroups.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Famílias de equipamentos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agrupado por marca/modelo quando existe; caso contrário por tipo.
              </p>
            </div>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Limpar filtro
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {modelGroups.map(group => (
              <button
                key={group.label}
                onClick={() => setSearch(group.searchToken)}
                className="text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
              >
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{group.label}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {group.total} un. · {group.inUse} em uso · {group.stale} sem leitura
                </p>
                <p className="text-xs text-slate-400 mt-1">{formatCurrency(group.value)} inventariado</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, tag ou tipo..."
            className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Todos os tipos</option>
          {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Todos os estados</option>
          <option value="in-use">Em uso</option>
          <option value="available">Disponíveis</option>
          <option value="stale">Sem leitura &gt; {STALE_READ_DAYS} dias</option>
        </select>
      </div>

      {/* Toast de copy */}
      {copied && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 z-50">
          <Check className="w-4 h-4" />
          URL copiado
        </div>
      )}

      {/* Toast de programação NFC */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 z-50 max-w-sm ${
          toast.kind === 'success' ? 'bg-emerald-500 text-white' :
          toast.kind === 'error'   ? 'bg-red-500 text-white' :
                                     'bg-slate-800 text-white'
        }`}>
          {toast.kind === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> :
           toast.kind === 'error'   ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> :
                                      <Radio className="w-4 h-4 flex-shrink-0 animate-pulse" />}
          {toast.msg}
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500 mt-3">
            {tools.length === 0 ? 'Sem equipamentos. Cria o primeiro.' : 'Nenhum resultado para a pesquisa.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              openSession={openSessions[tool.id]}
              latestSession={latestSessions[tool.id]}
              onEdit={() => setEditing(tool)}
              onDelete={() => handleDelete(tool)}
              onCopyUrl={() => handleCopyUrl(tool)}
              onProgramTag={() => handleProgramTag(tool)}
              programming={programming === tool.id}
            />
          ))}
        </div>
      )}

      {editing !== null && (
        <ToolModal
          tool={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
