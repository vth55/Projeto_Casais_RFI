/**
 * GuiasTransferenciaView — guias logísticas de equipamentos por NFC.
 *
 * Fluxo alvo:
 * - Logística/Admin: armazém -> obra, receção de devoluções.
 * - Encarregado/Admin: obra -> obra, obra -> armazém.
 *
 * A guia é a intenção logística. As leituras NFC confirmam as unidades físicas,
 * evitando o erro clássico de enviar "um martelo igual" em vez daquele toolId.
 */
import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft, CheckCircle2, ClipboardList, Nfc, PackageCheck,
  Search, Send, Truck, Warehouse, X, AlertTriangle,
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';

const STATUS_META = {
  DRAFT:      { label: 'Rascunho',    cls: 'bg-slate-100 text-slate-700' },
  DISPATCHED: { label: 'Em trânsito', cls: 'bg-blue-50 text-blue-700' },
  PARTIAL:    { label: 'Parcial',     cls: 'bg-amber-50 text-amber-700' },
  RECEIVED:   { label: 'Recebida',    cls: 'bg-emerald-50 text-emerald-700' },
  CANCELLED:  { label: 'Cancelada',   cls: 'bg-red-50 text-red-700' },
};

const TYPE_LABEL = {
  WAREHOUSE_TO_OBRA: 'Armazém → Obra',
  OBRA_TO_WAREHOUSE: 'Obra → Armazém',
  OBRA_TO_OBRA: 'Obra → Obra',
};

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getTransferType(fromId, toId) {
  if (fromId === 'WAREHOUSE' && toId !== 'WAREHOUSE') return 'WAREHOUSE_TO_OBRA';
  if (fromId !== 'WAREHOUSE' && toId === 'WAREHOUSE') return 'OBRA_TO_WAREHOUSE';
  return 'OBRA_TO_OBRA';
}

const Stat = ({ icon: Icon, label, value, tone = 'primary' }) => {
  const tones = {
    primary: 'bg-primary-50 text-primary-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone] || tones.primary}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
};

export default function GuiasTransferenciaView() {
  const {
    tools = [],
    obras = [],
    toolTransfers = [],
    createToolTransferGuide,
    dispatchToolTransferGuide,
    receiveToolTransferGuide,
  } = useStore();
  const { currentUser } = useAuthStore();

  const [fromId, setFromId] = useState('WAREHOUSE');
  const [toId, setToId] = useState(obras[0]?.id || 'WAREHOUSE');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const userId = currentUser?.id || currentUser?.uid || currentUser?.email || 'system';

  const locations = useMemo(() => [
    { id: 'WAREHOUSE', name: 'Armazém' },
    ...obras.map(o => ({ id: o.id, name: o.name || o.id })),
  ], [obras]);

  const selectedTools = useMemo(
    () => selectedIds.map(id => tools.find(t => t.id === id)).filter(Boolean),
    [selectedIds, tools],
  );

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools
      .filter(t => !selectedIds.includes(t.id))
      .filter(t => {
        if (!q) return true;
        return [t.name, t.type, t.nfcTagId, t.serialNumber, t.customNumber]
          .some(v => String(v || '').toLowerCase().includes(q));
      })
      .slice(0, 12);
  }, [tools, search, selectedIds]);

  const stats = useMemo(() => ({
    inTransit: toolTransfers.filter(g => g.status === 'DISPATCHED').length,
    partial: toolTransfers.filter(g => g.status === 'PARTIAL').length,
    received: toolTransfers.filter(g => g.status === 'RECEIVED').length,
    draft: toolTransfers.filter(g => g.status === 'DRAFT').length,
  }), [toolTransfers]);

  function addTool(toolId) {
    if (!toolId || selectedIds.includes(toolId)) return;
    setSelectedIds(prev => [...prev, toolId]);
  }

  async function scanTool() {
    if (!('NDEFReader' in window)) {
      setError('NFC não suportado neste browser. Usa a pesquisa para adicionar equipamentos.');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.addEventListener('reading', ({ serialNumber, message }) => {
        let tag = null;
        for (const record of message?.records || []) {
          if (record.recordType === 'text' || record.recordType === 'url') {
            const decoder = new TextDecoder(record.encoding || 'utf-8');
            const raw = decoder.decode(record.data).trim();
            tag = raw.includes('/t/') ? raw.split('/t/')[1]?.split(/[?#]/)[0] : raw;
            break;
          }
        }
        if (!tag && serialNumber) tag = serialNumber.replace(/:/g, '');
        const normalized = tag?.trim().toUpperCase();
        const found = tools.find(t => (t.nfcTagId || '').toUpperCase() === normalized);
        if (found) addTool(found.id);
        else setError(normalized ? `Tag não encontrada: ${normalized}` : 'Não foi possível ler a tag.');
        setScanning(false);
      }, { once: true });
    } catch (err) {
      setScanning(false);
      setError(err.message || 'Erro ao ler NFC');
    }
  }

  async function createAndDispatch() {
    if (fromId === toId) {
      setError('Origem e destino têm de ser diferentes.');
      return;
    }
    if (!selectedIds.length) {
      setError('Adiciona pelo menos um equipamento à guia.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createToolTransferGuide({
        type: getTransferType(fromId, toId),
        fromObraId: fromId === 'WAREHOUSE' ? null : fromId,
        toObraId: toId === 'WAREHOUSE' ? null : toId,
        toolIds: selectedIds,
        createdBy: userId,
        notes,
        sourceSystem: 'PWA',
      });
      await dispatchToolTransferGuide(id, { dispatchedBy: userId });
      setSelectedIds([]);
      setNotes('');
    } catch (err) {
      setError(err.message || 'Erro ao criar guia');
    } finally {
      setBusy(false);
    }
  }

  async function receiveGuide(guide) {
    setBusy(true);
    setError(null);
    try {
      await receiveToolTransferGuide(guide.id, {
        receivedBy: userId,
        receivedToolIds: guide.toolIds || [],
      });
    } catch (err) {
      setError(err.message || 'Erro ao receber guia');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Guias de Equipamentos</h1>
            <p className="text-sm text-slate-500">
              Expedição e receção confirmadas por NFC, preparadas para SAP/Procore.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Truck} label="Em trânsito" value={stats.inTransit} tone="blue" />
        <Stat icon={AlertTriangle} label="Parciais" value={stats.partial} tone="amber" />
        <Stat icon={CheckCircle2} label="Recebidas" value={stats.received} tone="emerald" />
        <Stat icon={ClipboardList} label="Rascunhos" value={stats.draft} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-6">
        <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Nova guia</h2>
            <p className="text-xs text-slate-500 mt-1">
              A leitura NFC confirma a unidade física exacta que saiu ou entrou.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-slate-500">
              Origem
              <select value={fromId} onChange={e => setFromId(e.target.value)} className="mt-1 w-full p-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900">
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Destino
              <select value={toId} onChange={e => setToId(e.target.value)} className="mt-1 w-full p-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900">
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={scanTool}
            disabled={scanning}
            className="w-full py-3 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 text-primary-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Nfc className="w-4 h-4" />
            {scanning ? 'A aproximar tag...' : 'Ler equipamento NFC'}
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar para adicionar manualmente..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
          </div>

          {search && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {filteredTools.map(t => (
                <button key={t.id} type="button" onClick={() => addTool(t.id)} className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.name || t.customNumber || t.id}</p>
                  <p className="text-xs text-slate-500 truncate">{t.type || '—'} · {t.currentObraName || 'Armazém'}</p>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Equipamentos na guia ({selectedTools.length})</p>
            {selectedTools.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-slate-400 text-center">
                Lê tags NFC ou adiciona por pesquisa.
              </div>
            ) : selectedTools.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.name || t.customNumber || t.id}</p>
                  <p className="text-xs text-slate-500 truncate">{t.nfcTagId || 'sem tag'} · {t.currentObraName || 'Armazém'}</p>
                </div>
                <button type="button" onClick={() => setSelectedIds(prev => prev.filter(id => id !== t.id))} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas logísticas, referência SAP/Procore, transporte..."
            rows={3}
            className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
          />

          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

          <button
            type="button"
            onClick={createAndDispatch}
            disabled={busy || !selectedIds.length || fromId === toId}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {busy ? 'A processar...' : 'Criar guia e expedir'}
          </button>
        </section>

        <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-slate-900 dark:text-white">Guias recentes</h2>
          </div>

          {toolTransfers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Ainda não existem guias.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {toolTransfers.slice(0, 30).map(g => {
                const meta = STATUS_META[g.status] || STATUS_META.DRAFT;
                return (
                  <div key={g.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                        <span className="text-xs text-slate-400">{TYPE_LABEL[g.type] || g.type}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {g.from?.name || 'Origem'} → {g.to?.name || 'Destino'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(g.toolIds || []).length} equipamento(s) · criada {formatDate(g.createdAt)}
                      </p>
                    </div>
                    {g.status === 'DISPATCHED' && (
                      <button
                        type="button"
                        onClick={() => receiveGuide(g)}
                        disabled={busy}
                        className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                      >
                        Receber tudo
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
