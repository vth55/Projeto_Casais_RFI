/**
 * ReporteAvariaView — Reporte de problema em equipamento (pivot 2026-05).
 *
 * Substitui o fluxo legacy de avarias de equipamento. Cria documento em
 * `tool_maintenance` via addToolMaintenance do useStore. Schema em src/types.js.
 *
 * Standalone fullscreen: acedido via QR Code ou link directo.
 * URL: /reporte-avaria?tool=<toolId>  (também aceita ?machine=<id> como fallback legacy)
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Send, CheckCircle2, X, AlertOctagon, Wrench, MapPin, ImagePlus, Search, Nfc } from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { TOOL_MAINTENANCE_TYPES } from '../types';

const CASAIS_BLUE = '#005EB8';

// Tipos de problema mapeados directamente aos enums de tool_maintenance.
const TIPOS = [
  { id: TOOL_MAINTENANCE_TYPES.DAMAGE,      label: 'Avaria',                 desc: 'Avaria, fissura, peça partida, mau funcionamento' },
  { id: TOOL_MAINTENANCE_TYPES.LOSS,        label: 'Perdido',              desc: 'Equipamento extraviado ou não encontrado' },
  { id: TOOL_MAINTENANCE_TYPES.INSPECTION,  label: 'Precisa inspeção',     desc: 'Pedido de verificação técnica' },
  { id: TOOL_MAINTENANCE_TYPES.REPAIR,      label: 'Precisa reparação',    desc: 'Reparação necessária para voltar ao serviço' },
];

const AppHeader = () => (
  <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${CASAIS_BLUE} 0%, #003d7a 100%)` }}>
    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10 bg-white" />
    <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-5 bg-white" />
    <div className="relative px-5 pt-12 pb-6">
      <div className="flex items-center justify-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <AlertOctagon className="w-5 h-5 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white tracking-tight">Reporte de Equipamento</h1>
          <p className="text-xs text-blue-200 font-medium mt-0.5">Casais Fleet Intelligence</p>
        </div>
      </div>
    </div>
    <svg viewBox="0 0 1440 48" fill="none" className="block w-full -mb-px">
      <path d="M0 48h1440V20c-240 20-480 28-720 20S240 8 0 20v28z" fill="#f8fafc" />
    </svg>
  </div>
);

const ToolPicker = ({ tools, value, onChange }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tools.slice(0, 20);
    return tools.filter(t =>
      (t.name || '').toLowerCase().includes(s) ||
      (t.type || '').toLowerCase().includes(s) ||
      (t.nfcTagId || '').toLowerCase().includes(s)
    ).slice(0, 30);
  }, [tools, q]);

  const selected = tools.find(t => t.id === value);
  if (selected) {
    return (
      <div className="px-5">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Equipamento</label>
        <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-primary-500 bg-primary-50">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{selected.name}</p>
            <p className="text-xs text-slate-500 truncate">{selected.type || '—'}{selected.currentObraName ? ` · ${selected.currentObraName}` : ''}</p>
          </div>
          <button onClick={() => onChange(null)} className="ml-3 p-2 rounded-lg hover:bg-white/60">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5">
      <label className="block text-sm font-semibold text-slate-700 mb-2">Equipamento</label>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Pesquisar por nome, tipo ou tag NFC…"
          className="w-full pl-9 pr-3 py-3 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-slate-400 text-center">Sem equipamentos com este filtro</p>
        ) : filtered.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {t.type || '—'}
                  {t.currentObraName && <span className="inline-flex items-center gap-1 ml-2"><MapPin className="w-3 h-3" />{t.currentObraName}</span>}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const TypePicker = ({ value, onChange }) => (
  <div className="px-5">
    <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de problema</label>
    <div className="grid grid-cols-2 gap-2">
      {TIPOS.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`text-left p-3 rounded-xl border-2 transition-colors ${
            value === opt.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-slate-200 bg-white hover:border-primary-300'
          }`}
        >
          <p className="text-sm font-bold text-slate-900">{opt.label}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

const PhotoCapture = ({ photos, onCapture, onRemove }) => {
  const fileInputRef = useRef(null);
  return (
    <div className="px-5">
      <label className="block text-sm font-semibold text-slate-700 mb-2">Fotos (opcional)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => {
          Array.from(e.target.files || []).forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            const url = URL.createObjectURL(file);
            onCapture({ file, url, id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        className="hidden"
      />
      <div className="grid grid-cols-3 gap-2">
        {photos.map(p => (
          <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(p.id)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
        >
          <ImagePlus className="w-6 h-6" />
          <span className="text-xs font-medium">Adicionar</span>
        </button>
      </div>
    </div>
  );
};

export default function ReporteAvariaView() {
  const { tools = [], reportToolMaintenance } = useStore();
  const { currentUser } = useAuthStore();

  // Aceitar URL param ?tool=<id> (novo) ou ?machine=<id> (legacy, fallback só para não crashar).
  const initialToolId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tool') || params.get('machine') || null;
  }, []);

  const [toolId, setToolId] = useState(initialToolId);
  const [type, setType] = useState(TOOL_MAINTENANCE_TYPES.DAMAGE);
  const [usable, setUsable] = useState(false);  // "O equipamento está utilizável?"
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  // Se URL passou um id que existe em tools, confirmar; senão mantém para o picker mostrar nada e o utilizador escolher.
  useEffect(() => {
    if (!tools.length) return;
    if (initialToolId && !tools.find(t => t.id === initialToolId)) {
      // ID inválido — limpar para mostrar picker
      setToolId(null);
    }
  }, [initialToolId, tools]);

  const selectedTool = tools.find(t => t.id === toolId);

  async function scanToolTagForReport() {
    if (!('NDEFReader' in window)) {
      setError('NFC não suportado neste browser. Pesquisa o equipamento manualmente.');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.addEventListener('reading', ({ serialNumber, message }) => {
        let tag = null;
        if (message?.records?.length) {
          for (const record of message.records) {
            if (record.recordType === 'text' || record.recordType === 'url') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              const raw = decoder.decode(record.data).trim();
              tag = raw.includes('/t/') ? raw.split('/t/')[1]?.split(/[?#]/)[0] : raw;
              break;
            }
          }
        }
        if (!tag && serialNumber) tag = serialNumber.replace(/:/g, '');
        const normalized = tag?.trim().toUpperCase();
        const found = tools.find(t => (t.nfcTagId || '').toUpperCase() === normalized);
        if (found) {
          setToolId(found.id);
          setError(null);
        } else {
          setError(normalized ? `Tag NFC não encontrada: ${normalized}` : 'Não foi possível ler a tag NFC.');
        }
        setScanning(false);
      }, { once: true });
    } catch (err) {
      setError(err.message || 'Erro ao ler NFC');
      setScanning(false);
    }
  }

  async function submit() {
    if (!toolId || !type) { setError('Seleciona o equipamento e o tipo de problema'); return; }
    setSubmitting(true);
    setError(null);
    try {
      // Photos: nesta fase enviamos só URLs locais (objectURL). Upload real para Storage
      // fica para fase seguinte — manter compat com schema que aceita array de strings.
      const photoRefs = photos.map(p => p.id); // placeholder; quando integrar Storage substituir por download URL

      await reportToolMaintenance({
        toolId,
        type,
        status: 'OPEN',
        reportedBy: currentUser?.id || currentUser?.uid || 'anonymous',
        obraId: selectedTool?.currentObraId || null,
        source: 'NFC_REPORT',
        usable,
        notes: [
          notes.trim(),
          usable ? '[Utilizável]' : '[Inutilizável]',
        ].filter(Boolean).join(' '),
        photos: photoRefs,
        ...(cost ? { cost: Number(cost) } : {}),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Erro ao submeter reporte');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Reporte enviado</h2>
          <p className="text-slate-500 text-sm max-w-xs">A equipa de manutenção vai analisar o problema. Obrigado.</p>
          <a href="/" className="mt-4 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold text-sm">Voltar à app</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-32">
      <AppHeader />
      <div className="flex-1 flex flex-col gap-5 mt-4">
        <ToolPicker tools={tools} value={toolId} onChange={setToolId} />

        <div className="px-5">
          <button
            type="button"
            onClick={scanToolTagForReport}
            disabled={scanning}
            className="w-full py-3 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 text-primary-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Nfc className="w-4 h-4" />
            {scanning ? 'A aproximar tag NFC...' : 'Ler tag NFC para reportar avaria'}
          </button>
          <p className="text-xs text-slate-500 mt-2">
            Este modo não abre sessão de uso. Ao submeter, sessões abertas deste equipamento são fechadas automaticamente.
          </p>
        </div>

        <TypePicker value={type} onChange={setType} />

        <div className="px-5">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
            <input
              type="checkbox"
              checked={usable}
              onChange={e => setUsable(e.target.checked)}
              className="w-5 h-5 rounded text-primary-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">O equipamento está utilizável?</p>
              <p className="text-xs text-slate-500">Marca se ainda pode ser usada com cuidado até intervenção</p>
            </div>
          </label>
        </div>

        <div className="px-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Descrição (opcional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Descreve o problema, onde ocorreu, etc."
            rows={4}
            className="w-full p-3 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {(type === TOOL_MAINTENANCE_TYPES.REPAIR || type === TOOL_MAINTENANCE_TYPES.DAMAGE) && (
          <div className="px-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Custo estimado (€, opcional)</label>
            <input
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0"
              className="w-full p-3 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        <PhotoCapture
          photos={photos}
          onCapture={p => setPhotos(prev => [...prev, p])}
          onRemove={id => setPhotos(prev => prev.filter(p => p.id !== id))}
        />

        {error && (
          <div className="px-5">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-slate-200 safe-bottom">
        <button
          onClick={submit}
          disabled={submitting || !toolId}
          className="w-full py-4 rounded-2xl bg-primary-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          {submitting ? 'A enviar…' : <><Send className="w-4 h-4" /> Submeter reporte</>}
        </button>
      </div>
    </div>
  );
}
