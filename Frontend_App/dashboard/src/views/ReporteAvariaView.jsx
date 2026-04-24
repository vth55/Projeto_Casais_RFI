import React, { useState, useCallback, useRef } from 'react';
import { Camera, Send, CheckCircle2, X, AlertOctagon, ImagePlus } from 'lucide-react';
import useAvariasStore from '../store/useAvariasStore';

// ─── Constantes ───────────────────────────────────────────────
const CASAIS_BLUE = '#005EB8';

// Tipos de problema — sem emojis, profissional
const TIPOS_PROBLEMA = [
  { id: 'mecanico',    label: 'Mecânico',            desc: 'Motor, transmissão, travões' },
  { id: 'hidraulico',  label: 'Hidráulico',          desc: 'Cilindros, mangueiras, bombas' },
  { id: 'eletrico',    label: 'Elétrico',            desc: 'Cablagem, luzes, sensores' },
  { id: 'pneus',       label: 'Pneus / Rastos',      desc: 'Furos, desgaste, rastos partidos' },
  { id: 'fugas',       label: 'Fuga de Fluidos',     desc: 'Óleo, combustível, refrigerante' },
  { id: 'estrutura',   label: 'Estrutura / Chassis',  desc: 'Fissuras, corrosão, deformações' },
  { id: 'seguranca',   label: 'Segurança',           desc: 'Alarmes, extintor, cinto, cabine' },
  { id: 'outro',       label: 'Outro',               desc: 'Problema não listado acima' },
];

// Máquinas demo (em produção, o QR Code pré-preenche automaticamente)
const MAQUINAS_DEMO = [
  { id: 'ESC-001', label: 'ESC-001 — Escavadora Komatsu PC210' },
  { id: 'RET-003', label: 'RET-003 — Retroescavadora CAT 430F' },
  { id: 'GRU-002', label: 'GRU-002 — Grua Torre Liebherr 172 EC-B' },
  { id: 'CMP-005', label: 'CMP-005 — Compactador Hamm H13i' },
  { id: 'DMP-004', label: 'DMP-004 — Dumper Volvo A30G' },
  { id: 'CAR-006', label: 'CAR-006 — Carregadora Volvo L120H' },
];

// ─── Header Branding ──────────────────────────────────────────
const AppHeader = () => (
  <div
    className="relative overflow-hidden"
    style={{ background: `linear-gradient(135deg, ${CASAIS_BLUE} 0%, #003d7a 100%)` }}
  >
    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10 bg-white" />
    <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-5 bg-white" />

    <div className="relative px-5 pt-12 pb-6">
      <div className="flex items-center justify-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <AlertOctagon className="w-5 h-5 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white tracking-tight">Reporte de Avaria</h1>
          <p className="text-xs text-blue-200 font-medium mt-0.5">Casais Fleet Intelligence</p>
        </div>
      </div>
    </div>

    <svg viewBox="0 0 1440 48" fill="none" className="block w-full -mb-px">
      <path d="M0 48h1440V20c-240 20-480 28-720 20S240 8 0 20v28z" fill="#f8fafc" />
    </svg>
  </div>
);

// ─── Comprimir imagem para base64 (max ~200KB) ──────────────
const compressImageToBase64 = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
};

// ─── Captura de Foto (câmara real) ────────────────────────────
const PhotoCapture = ({ photos, onCapture, onRemove }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        onCapture({ file, url, id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` });
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="px-5">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        Foto da Avaria
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm">
            <img src={photo.url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(photo.id)}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ))}

        {photos.length < 3 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-1.5 active:scale-[0.96] active:border-blue-400 transition-all"
          >
            {photos.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                  <Camera className="w-6 h-6 text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Tirar Foto</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      {photos.length === 0 && (
        <p className="text-[11px] text-slate-400 mt-2 text-center">Opcional — até 3 fotografias</p>
      )}
    </div>
  );
};

// ─── Seleção de Máquina ───────────────────────────────────────
const MachineSelect = ({ value, onChange }) => (
  <div className="px-5">
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      Equipamento
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3.5 pr-10 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
      >
        <option value="">Selecionar equipamento...</option>
        {MAQUINAS_DEMO.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
      <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
    <p className="text-[10px] text-slate-400 mt-1.5 px-1">Em produção, o QR Code preenche automaticamente.</p>
  </div>
);

// ─── Identificação do Operador ────────────────────────────────
const OperadorFields = ({ nome, onNomeChange, telefone, onTelefoneChange }) => (
  <div className="px-5 space-y-3">
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        O seu nome
      </label>
      <input
        type="text"
        value={nome}
        onChange={(e) => onNomeChange(e.target.value)}
        placeholder="Ex: João Silva"
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
      />
    </div>
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        Contacto telefónico
      </label>
      <input
        type="tel"
        inputMode="tel"
        value={telefone}
        onChange={(e) => onTelefoneChange(e.target.value)}
        placeholder="Ex: 912 345 678"
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
      />
      <p className="text-[10px] text-slate-400 mt-1.5 px-1">Para a equipa de manutenção o poder contactar se necessário.</p>
    </div>
  </div>
);

// ─── Máquina Parou? (toggle binário) ──────────────────────────
const MaquinaParouToggle = ({ value, onChange }) => (
  <div className="px-5">
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      A máquina está parada?
    </label>
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onChange(false)}
        className={`
          flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200
          ${value === false
            ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-500/10'
            : 'border-slate-200 bg-white active:scale-[0.97]'
          }
        `}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${value === false ? 'bg-emerald-500' : 'bg-slate-200'} transition-colors`}>
          <CheckCircle2 className={`w-5 h-5 ${value === false ? 'text-white' : 'text-slate-400'}`} />
        </div>
        <div className="text-center">
          <span className={`text-sm font-bold block ${value === false ? 'text-emerald-700' : 'text-slate-600'}`}>Não</span>
          <span className={`text-[10px] ${value === false ? 'text-emerald-600' : 'text-slate-400'}`}>Ainda opera</span>
        </div>
      </button>

      <button
        onClick={() => onChange(true)}
        className={`
          flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200
          ${value === true
            ? 'border-red-400 bg-red-50 shadow-md shadow-red-500/10'
            : 'border-slate-200 bg-white active:scale-[0.97]'
          }
        `}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${value === true ? 'bg-red-500' : 'bg-slate-200'} transition-colors`}>
          <AlertOctagon className={`w-5 h-5 ${value === true ? 'text-white' : 'text-slate-400'}`} />
        </div>
        <div className="text-center">
          <span className={`text-sm font-bold block ${value === true ? 'text-red-700' : 'text-slate-600'}`}>Sim</span>
          <span className={`text-[10px] ${value === true ? 'text-red-600' : 'text-slate-400'}`}>Parada / Imobilizada</span>
        </div>
      </button>
    </div>
  </div>
);

// ─── Tipo de Problema (sem emojis) ────────────────────────────
const TipoProblemaSelector = ({ selected, onChange }) => (
  <div className="px-5">
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      Tipo de Problema
    </label>
    <div className="grid grid-cols-2 gap-2">
      {TIPOS_PROBLEMA.map((tipo) => {
        const isActive = selected === tipo.id;
        return (
          <button
            key={tipo.id}
            onClick={() => onChange(tipo.id)}
            className={`
              relative flex flex-col px-3 py-2.5 rounded-xl border-2 transition-all duration-200 text-left
              ${isActive
                ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10'
                : 'border-slate-200 bg-white active:scale-[0.97]'
              }
            `}
          >
            <span className={`text-xs font-bold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
              {tipo.label}
            </span>
            <span className={`text-[9px] leading-tight mt-0.5 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
              {tipo.desc}
            </span>
            {isActive && (
              <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Descrição ────────────────────────────────────────────────
const DescricaoInput = ({ value, onChange }) => (
  <div className="px-5">
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      O que aconteceu?
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder="Ex: O braço hidráulico não levanta, ouve-se um barulho estranho no cilindro direito..."
      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
    />
  </div>
);

// ─── Splash Screen de Sucesso ─────────────────────────────────
const SuccessScreen = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
    style={{ background: `linear-gradient(160deg, ${CASAIS_BLUE} 0%, #003d7a 60%, #001f4d 100%)` }}
  >
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-white/10" />
    </div>

    <div className="relative flex flex-col items-center text-center animate-fadeInUp">
      <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center mb-8 shadow-2xl shadow-black/20 animate-bounceIn">
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
          <CheckCircle2 className="w-9 h-9 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Avaria Reportada</h2>
      <p className="text-blue-200/90 text-sm leading-relaxed max-w-xs mb-2">
        A equipa de manutenção foi notificada e irá analisar a situação.
      </p>
      <p className="text-blue-300/60 text-xs mb-10">
        Pode fechar esta janela ou submeter outra avaria.
      </p>

      <button
        onClick={onClose}
        className="w-full max-w-xs py-4 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-xl shadow-black/20 active:scale-[0.97] transition-transform"
      >
        Nova Avaria
      </button>

      <p className="text-blue-300/40 text-xs mt-6">Casais Fleet Intelligence</p>
    </div>

    <style>{`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes bounceIn {
        0%   { opacity: 0; transform: scale(0.3); }
        50%  { transform: scale(1.08); }
        70%  { transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
      }
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
      .animate-bounceIn { animation: bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
    `}</style>
  </div>
);

// ─── View Principal ───────────────────────────────────────────
const ReporteAvariaView = () => {
  const submitAvaria = useAvariasStore((s) => s.submitAvaria);

  const [machineId, setMachineId] = useState('');
  const [operadorNome, setOperadorNome] = useState('');
  const [operadorTelefone, setOperadorTelefone] = useState('');
  const [maquinaParada, setMaquinaParada] = useState(null);
  const [tipoProblema, setTipoProblema] = useState('');
  const [descricao, setDescricao] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = machineId && tipoProblema && maquinaParada !== null && descricao.trim().length > 5;

  const handleAddPhoto = useCallback(async (photo) => {
    if (photos.length >= 3) return;
    const base64 = await compressImageToBase64(photo.file);
    if (base64) {
      setPhotos((prev) => prev.length < 3 ? [...prev, { ...photo, url: base64 }] : prev);
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    setTimeout(() => {
      submitAvaria({
        machineId,
        operadorNome: operadorNome.trim() || 'Não identificado',
        operadorTelefone: operadorTelefone.trim() || null,
        maquinaParada,
        tipoProblema,
        categoria: tipoProblema,
        urgencia: maquinaParada ? 'alta' : 'media',
        descricao: descricao.trim(),
        hasPhoto: photos.length > 0,
        photoCount: photos.length,
        photos: photos.map(({ id, url }) => ({ id, url })),
      });

      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  }, [canSubmit, submitting, submitAvaria, machineId, operadorNome, operadorTelefone, maquinaParada, tipoProblema, descricao, photos]);

  const handleReset = useCallback(() => {
    setMachineId('');
    setOperadorNome('');
    setOperadorTelefone('');
    setMaquinaParada(null);
    setTipoProblema('');
    setDescricao('');
    setPhotos([]);
    setSubmitted(false);
  }, [photos]);

  if (submitted) {
    return <SuccessScreen onClose={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader />

      <div className="flex-1 overflow-y-auto pb-32 space-y-5 pt-4">
        <PhotoCapture photos={photos} onCapture={handleAddPhoto} onRemove={handleRemovePhoto} />
        <MachineSelect value={machineId} onChange={setMachineId} />
        <OperadorFields
          nome={operadorNome}
          onNomeChange={setOperadorNome}
          telefone={operadorTelefone}
          onTelefoneChange={setOperadorTelefone}
        />
        <MaquinaParouToggle value={maquinaParada} onChange={setMaquinaParada} />
        <TipoProblemaSelector selected={tipoProblema} onChange={setTipoProblema} />
        <DescricaoInput value={descricao} onChange={setDescricao} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 px-5 py-4 safe-area-bottom">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`
            w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-bold shadow-xl transition-all duration-300
            ${canSubmit && !submitting
              ? 'text-white shadow-blue-500/30 active:scale-[0.97]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }
          `}
          style={canSubmit && !submitting ? { background: `linear-gradient(135deg, ${CASAIS_BLUE} 0%, #003d7a 100%)` } : {}}
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              A enviar...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submeter Avaria
            </>
          )}
        </button>
      </div>

      <style>{`
        .safe-area-bottom { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
      `}</style>
    </div>
  );
};

export default ReporteAvariaView;
