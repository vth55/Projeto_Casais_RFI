import React, { useState, useMemo, useRef } from 'react';
import { Wrench, AlertTriangle, Calendar, Clock, Truck, Check, Plus, Image, X, Upload, Eye, Trash2, Camera, ShieldAlert, CheckCircle2, Phone, MessageSquare, Send, User, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';
import useAvariasStore from '../store/useAvariasStore';
import { Card, StatCard, Button, Badge, Modal, Input, Table, EmptyState, Skeleton } from '../components/ui';
import { getCategoryName } from '../utils/safeRender';

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200 dark:border-slate-700">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}>
        {tab.label}
        {tab.count > 0 && <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

const MaintenanceCard = ({ machine, onSchedule, onComplete }) => {
  const hours = machine.partialHours || machine.totalHours || 0;
  const progress = Math.min(100, (hours / 150) * 100);
  const isUrgent = progress >= 100;
  const isWarning = progress >= 80;

  return (
    <Card className={`border-l-4 ${isUrgent ? 'border-l-red-500' : isWarning ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isUrgent ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Truck className={`w-6 h-6 ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">{machine.name}</h3>
              {isUrgent && <Badge variant="danger">Urgente</Badge>}
              {isWarning && !isUrgent && <Badge variant="warning">Atenção</Badge>}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{getCategoryName(machine.category)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{hours}h</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">de 150h</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <Button variant="outline" size="sm" onClick={() => onSchedule(machine)}>Agendar</Button>
        <Button size="sm" onClick={() => onComplete(machine)}>Registar Manutenção</Button>
      </div>
    </Card>
  );
};

// Modal para adicionar fotos a registo existente
const PhotoGalleryModal = ({ record, onClose, onAddPhoto, onRemovePhoto, uploading }) => {
  const fileInputRef = useRef(null);
  const photos = record?.photos || [];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await onAddPhoto(record.id, file);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Fotos da Manutenção" size="lg">
      <div className="space-y-4">
        {/* Upload area */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Camera className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            Arraste fotos ou clique para selecionar
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            icon={Upload}
          >
            {uploading ? 'A enviar...' : 'Adicionar Fotos'}
          </Button>
        </div>

        {/* Photo grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <a
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white rounded-full hover:bg-slate-100"
                  >
                    <Eye className="w-4 h-4 text-slate-700" />
                  </a>
                  <button
                    onClick={() => onRemovePhoto(record.id, photo.id, photo.path)}
                    className="p-2 bg-red-500 rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{photo.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Sem fotos adicionadas</p>
          </div>
        )}
      </div>
      <div className="flex justify-end mt-6">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
};

// Modal para criar novo registo de manutenção
const NewMaintenanceModal = ({ machine, machines, onClose, onSave, uploading, setUploading }) => {
  const { uploadMaintenancePhoto } = useStore();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    machineId: machine?.id || '',
    type: 'preventive',
    notes: '',
    cost: '',
    technician: '',
  });
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    setPendingPhotos(prev => [...prev, ...imageFiles]);

    // Create preview URLs
    imageFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, { file, url }]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePreview = (index) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const toRemove = prev[index];
      if (toRemove?.url) {
        URL.revokeObjectURL(toRemove.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!formData.machineId) return;

    setUploading(true);

    // Upload photos first
    const maintenanceId = `maint_${Date.now()}`;
    const uploadedPhotos = [];

    for (const file of pendingPhotos) {
      const result = await uploadMaintenancePhoto(file, maintenanceId);
      if (result.success) {
        uploadedPhotos.push(result.photo);
      }
    }

    // Clean up preview URLs
    previewUrls.forEach(p => URL.revokeObjectURL(p.url));

    await onSave({
      ...formData,
      photos: uploadedPhotos,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    });

    setUploading(false);
    onClose();
  };

  const maintenanceTypes = [
    { value: 'preventive', label: 'Preventiva' },
    { value: 'corrective', label: 'Corretiva' },
    { value: 'inspection', label: 'Inspeção' },
    { value: 'oil_change', label: 'Mudança de Óleo' },
    { value: 'filter_change', label: 'Mudança de Filtros' },
    { value: 'repair', label: 'Reparação' },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="Registar Manutenção" size="lg">
      <div className="space-y-4">
        {/* Machine selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Equipamento *
          </label>
          <select
            value={formData.machineId}
            onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecionar equipamento...</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Tipo de Manutenção *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {maintenanceTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Technician */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Técnico Responsável
          </label>
          <Input
            value={formData.technician}
            onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
            placeholder="Nome do técnico..."
          />
        </div>

        {/* Cost */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Custo (€)
          </label>
          <Input
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="0.00"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notas / Descrição
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="Descreva o trabalho realizado..."
          />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Fotos
          </label>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3">
              <Camera className="w-8 h-8 text-slate-400" />
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  icon={Upload}
                >
                  Adicionar Fotos
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  JPG, PNG até 10MB cada
                </p>
              </div>
            </div>
          </div>

          {/* Preview thumbnails */}
          {previewUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {previewUrls.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview.url}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    onClick={() => removePreview(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          disabled={!formData.machineId || uploading}
          icon={uploading ? null : Check}
        >
          {uploading ? 'A guardar...' : 'Registar Manutenção'}
        </Button>
      </div>
    </Modal>
  );
};

// Componente de miniaturas de fotos para a tabela
const PhotoThumbnails = ({ photos, onClick }) => {
  if (!photos?.length) {
    return <span className="text-slate-400 text-sm">-</span>;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
    >
      <div className="flex -space-x-2">
        {photos.slice(0, 3).map((photo, index) => (
          <img
            key={photo.id}
            src={photo.url}
            alt=""
            className="w-8 h-8 rounded-md object-cover border-2 border-white dark:border-slate-800"
            style={{ zIndex: 3 - index }}
          />
        ))}
      </div>
      {photos.length > 3 && (
        <span className="text-xs text-primary-600 font-medium ml-1">+{photos.length - 3}</span>
      )}
      <span className="text-xs text-slate-500 ml-1">({photos.length})</span>
    </button>
  );
};

// ─── Avarias: Constantes e Componentes ────────────────────────
const CATEGORIA_LABELS = {
  mecanico: 'Mecânico',
  hidraulico: 'Hidráulico',
  eletrico: 'Elétrico',
  pneus: 'Pneus / Rastos',
  fugas: 'Fuga de Fluidos',
  estrutura: 'Estrutura',
  seguranca: 'Segurança',
  outro: 'Outro',
  motor: 'Motor',
};

// Lista de avarias — linha compacta, clicável para abrir detalhe
const AvariaListItem = ({ avaria, onClick }) => {
  const isResolvida = avaria.status === 'resolvida';
  const createdDate = new Date(avaria.createdAt);
  const timeStr = createdDate.toLocaleDateString('pt-PT') + ' ' + createdDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md group ${
        isResolvida
          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-70'
          : avaria.maquinaParada
            ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10 hover:border-red-300'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Indicador de estado */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          isResolvida ? 'bg-emerald-500' : avaria.maquinaParada ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
        }`} />

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white">{avaria.machineId}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{CATEGORIA_LABELS[avaria.categoria] || avaria.categoria}</span>
            {avaria.maquinaParada && !isResolvida && (
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">PARADA</span>
            )}
            {isResolvida && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Resolvida</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{avaria.descricao}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{timeStr}</span>
            {avaria.operadorNome && avaria.operadorNome !== 'Não identificado' && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">por {avaria.operadorNome}</span>
            )}
            {avaria.hasPhoto && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                <Camera className="w-3 h-3" /> {avaria.photoCount || 1}
              </span>
            )}
            {(avaria.notas?.length > 0) && (
              <span className="text-[11px] text-primary-500 flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" /> {avaria.notas.length}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 transition-colors flex-shrink-0" />
      </div>
    </button>
  );
};

// Modal de detalhe de uma avaria com contacto e notas
const AvariaDetailModal = ({ avaria, onClose, onResolver, onAddNota }) => {
  const [notaTexto, setNotaTexto] = useState('');
  const isResolvida = avaria.status === 'resolvida';
  const createdDate = new Date(avaria.createdAt);

  const handleSubmitNota = () => {
    if (!notaTexto.trim()) return;
    onAddNota(avaria.id, notaTexto);
    setNotaTexto('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitNota();
    }
  };

  // Formatar telefone para link
  const phoneClean = avaria.operadorTelefone?.replace(/\s/g, '') || '';

  return (
    <Modal isOpen={true} onClose={onClose} title="Detalhe da Avaria" size="lg">
      <div className="space-y-5">
        {/* Estado + Máquina */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isResolvida ? 'bg-emerald-500' : avaria.maquinaParada ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{avaria.machineId}</h3>
          </div>
          {avaria.maquinaParada && !isResolvida && (
            <span className="text-xs font-bold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-lg">MÁQUINA PARADA</span>
          )}
          {isResolvida && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-lg">RESOLVIDA</span>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Tipo</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">{CATEGORIA_LABELS[avaria.categoria] || avaria.categoria}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Data</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">{createdDate.toLocaleDateString('pt-PT')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{createdDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Descrição</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">{avaria.descricao}</p>
        </div>

        {/* Operador + Contacto */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-2">Reportado por</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{avaria.operadorNome || 'Não identificado'}</p>
                {avaria.operadorTelefone && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{avaria.operadorTelefone}</p>
                )}
              </div>
            </div>

            {/* Botões de contacto */}
            {phoneClean && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${phoneClean}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Ligar
                </a>
                <a
                  href={`https://wa.me/351${phoneClean.replace(/^\+?351/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Resolução */}
        {avaria.resolvedAt && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Resolvida em {new Date(avaria.resolvedAt).toLocaleDateString('pt-PT')} por {avaria.resolvedBy || 'Gestor'}
            </p>
          </div>
        )}

        {/* Notas internas */}
        <div>
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-2">
            Notas Internas ({avaria.notas?.length || 0})
          </p>

          {/* Lista de notas */}
          {avaria.notas?.length > 0 && (
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {avaria.notas.map((nota) => (
                <div key={nota.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{nota.texto}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {nota.autor} · {new Date(nota.createdAt).toLocaleDateString('pt-PT')} {new Date(nota.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Input para nova nota */}
          <div className="flex gap-2">
            <input
              type="text"
              value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escrever nota interna..."
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <Button size="sm" icon={Send} onClick={handleSubmitNota} disabled={!notaTexto.trim()}>
              Enviar
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        {!isResolvida && (
          <Button icon={CheckCircle2} onClick={() => { onResolver(avaria.id); onClose(); }}>
            Marcar como Resolvida
          </Button>
        )}
      </div>
    </Modal>
  );
};

const ManutencaoView = () => {
  const {
    activeView,
    setActiveView,
    machines,
    maintenanceRecords,
    updateMachine,
    addMaintenanceRecord,
    uploadMaintenancePhoto,
    addPhotoToMaintenance,
    removePhotoFromMaintenance,
    loading
  } = useStore();

  const { avarias, resolverAvaria, addNota } = useAvariasStore();
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  // Derivar tab diretamente do activeView
  const activeTab = activeView === 'manutencao-calendario' ? 'calendar' : activeView === 'manutencao-historico' ? 'history' : activeView === 'manutencao-avarias' ? 'avarias' : 'alerts';

  const avariasPendentes = useMemo(() => avarias.filter((a) => a.status === 'pendente'), [avarias]);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [uploading, setUploading] = useState(false);

  const alertMachines = useMemo(() => machines.filter(m => (m.partialHours || m.totalHours || 0) >= 120).sort((a, b) => (b.partialHours || b.totalHours || 0) - (a.partialHours || a.totalHours || 0)), [machines]);
  const urgentCount = alertMachines.filter(m => (m.partialHours || m.totalHours || 0) >= 150).length;

  const handleComplete = (machine) => {
    setSelectedMachine(machine);
    setShowNewModal(true);
  };

  const handleSave = async (record) => {
    await addMaintenanceRecord(record);
  };

  const handleAddPhotoToExisting = async (maintenanceId, file) => {
    setUploading(true);
    const result = await uploadMaintenancePhoto(file, maintenanceId);
    if (result.success) {
      await addPhotoToMaintenance(maintenanceId, result.photo);
    }
    setUploading(false);
  };

  const handleRemovePhoto = async (maintenanceId, photoId, photoPath) => {
    await removePhotoFromMaintenance(maintenanceId, photoId, photoPath);
  };

  const tabs = [
    { id: 'alerts', label: 'Alertas', count: alertMachines.length },
    { id: 'calendar', label: 'Calendário', count: 0 },
    { id: 'history', label: 'Histórico', count: maintenanceRecords.length },
    { id: 'avarias', label: 'Casos de Avaria', count: avariasPendentes.length },
  ];

  // Sort maintenance records by date (newest first)
  const sortedRecords = useMemo(() => {
    return [...maintenanceRecords].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
  }, [maintenanceRecords]);

  const getTypeLabel = (type) => {
    const types = {
      preventive: 'Preventiva',
      corrective: 'Corretiva',
      inspection: 'Inspeção',
      oil_change: 'Mudança Óleo',
      filter_change: 'Mudança Filtros',
      repair: 'Reparação',
    };
    return types[type] || type || 'Preventiva';
  };

  if (loading) return <div className="space-y-6"><Skeleton variant="title" className="w-48" /><div className="grid grid-cols-1 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manutenção</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão de manutenções preventivas</p>
        </div>
        <Button icon={Plus} onClick={() => { setSelectedMachine(null); setShowNewModal(true); }}>
          Registar Manutenção
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard icon={AlertTriangle} title="Alertas" value={alertMachines.length} color={alertMachines.length > 0 ? 'amber' : 'emerald'} />
        <StatCard icon={Wrench} title="Urgentes" value={urgentCount} color={urgentCount > 0 ? 'red' : 'emerald'} />
        <StatCard icon={Check} title="Concluídas" value={maintenanceRecords.length} color="primary" />
        <StatCard icon={Image} title="Com Fotos" value={maintenanceRecords.filter(r => r.photos?.length > 0).length} color="slate" />
        <StatCard icon={ShieldAlert} title="Avarias" value={avariasPendentes.length} color={avariasPendentes.length > 0 ? 'red' : 'emerald'} />
      </div>

      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveView(id === 'calendar' ? 'manutencao-calendario' : id === 'history' ? 'manutencao-historico' : id === 'avarias' ? 'manutencao-avarias' : 'manutencao-alertas')} />
        <div className="p-6">
          {activeTab === 'alerts' && (
            alertMachines.length === 0
              ? <EmptyState icon={Check} title="Sem alertas" description="Todos os equipamentos estão dentro dos limites." />
              : <div className="space-y-4">{alertMachines.map(m => <MaintenanceCard key={m.id} machine={m} onSchedule={setSelectedMachine} onComplete={handleComplete} />)}</div>
          )}

          {activeTab === 'calendar' && (
            <EmptyState icon={Calendar} title="Calendário" description="Funcionalidade em desenvolvimento." />
          )}

          {activeTab === 'history' && (
            sortedRecords.length === 0
              ? <EmptyState icon={Wrench} title="Sem registos" description="Nenhuma manutenção registada ainda." />
              : (
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Head>
                      <Table.Row>
                        <Table.Header>Equipamento</Table.Header>
                        <Table.Header>Tipo</Table.Header>
                        <Table.Header>Data</Table.Header>
                        <Table.Header>Técnico</Table.Header>
                        <Table.Header>Custo</Table.Header>
                        <Table.Header>Fotos</Table.Header>
                        <Table.Header>Notas</Table.Header>
                      </Table.Row>
                    </Table.Head>
                    <Table.Body>
                      {sortedRecords.map(r => {
                        const machine = machines.find(m => m.id === r.machineId);
                        const date = r.createdAt?.toDate?.() || new Date();
                        return (
                          <Table.Row key={r.id}>
                            <Table.Cell>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {machine?.name || r.machineId}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant={r.type === 'corrective' || r.type === 'repair' ? 'warning' : 'default'}>
                                {getTypeLabel(r.type)}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell className="text-slate-600 dark:text-slate-400">
                              {date.toLocaleDateString('pt-PT')}
                            </Table.Cell>
                            <Table.Cell className="text-slate-600 dark:text-slate-400">
                              {r.technician || '-'}
                            </Table.Cell>
                            <Table.Cell className="text-slate-600 dark:text-slate-400">
                              {r.cost ? `${r.cost.toFixed(2)}€` : '-'}
                            </Table.Cell>
                            <Table.Cell>
                              <PhotoThumbnails
                                photos={r.photos}
                                onClick={() => setShowPhotoModal(r)}
                              />
                            </Table.Cell>
                            <Table.Cell className="text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {r.notes || '-'}
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table>
                </div>
              )
          )}

          {activeTab === 'avarias' && (
            avarias.length === 0
              ? <EmptyState icon={ShieldAlert} title="Sem casos de avaria" description="Nenhuma avaria reportada pelos operadores. As avarias são submetidas via QR Code no terreno." />
              : <div className="space-y-2">{avarias.map(a => <AvariaListItem key={a.id} avaria={a} onClick={() => setSelectedAvaria(a)} />)}</div>
          )}
        </div>
      </Card>

      {/* Modal: Novo registo de manutenção */}
      {showNewModal && (
        <NewMaintenanceModal
          machine={selectedMachine}
          machines={machines}
          onClose={() => { setShowNewModal(false); setSelectedMachine(null); }}
          onSave={handleSave}
          uploading={uploading}
          setUploading={setUploading}
        />
      )}

      {/* Modal: Ver/gerir fotos de registo existente */}
      {showPhotoModal && (
        <PhotoGalleryModal
          record={showPhotoModal}
          onClose={() => setShowPhotoModal(null)}
          onAddPhoto={handleAddPhotoToExisting}
          onRemovePhoto={handleRemovePhoto}
          uploading={uploading}
        />
      )}

      {/* Modal: Detalhe de avaria */}
      {selectedAvaria && (
        <AvariaDetailModal
          avaria={selectedAvaria}
          onClose={() => setSelectedAvaria(null)}
          onResolver={resolverAvaria}
          onAddNota={addNota}
        />
      )}
    </div>
  );
};

export default ManutencaoView;
