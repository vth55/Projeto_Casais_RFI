import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Fuel,
  Wrench,
  AlertTriangle,
  Check,
  Building2,
  CheckSquare,
  Square,
  ArrowRight,
  Wifi,
  WifiOff,
  Navigation,
  History,
} from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Badge, StatusBadge, Modal, Input, Select, Table, EmptyState, Skeleton } from '../components/ui';
import { getCategoryName, getLocationName, getCategoryId } from '../utils/safeRender';
import { formatHours, formatConsumption } from '../utils/formatters';

// Card de máquina
const MachineCard = ({ machine, onEdit, onDelete: _ON_DELETE, selected, onSelect, selectionMode, maintenanceInterval, obras, onMove, onDispatch, onHistory }) => {
  const interval = machine.maintenanceInterval || maintenanceInterval || 150;
  const hoursProgress = Math.min(100, ((machine.partialHours || 0) / interval) * 100);
  const needsMaintenance = hoursProgress >= 80;
  const isTransit = machine.estadoOperacional === 'em_transito' || !!machine.despachoPendente;
  const transitDest = machine.despachoPendente?.obraName || null;

  return (
    <Card hover onClick={() => selectionMode ? onSelect(machine.id) : onEdit(machine)} className="relative">
      {needsMaintenance && !isTransit && (
        <div className="absolute top-3 right-3">
          <Badge variant="warning" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Manutenção
          </Badge>
        </div>
      )}
      {isTransit && (
        <div className="absolute top-3 right-3">
          <Badge variant="info" size="sm" dot>Em Trânsito</Badge>
        </div>
      )}

      {selectionMode && (
        <div className="absolute top-3 left-3">
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
            selected ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
          }`}>
            {selected && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      )}

      <div className={`flex items-start gap-4 ${selectionMode ? 'mt-4' : ''}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isTransit ? 'bg-sky-100 dark:bg-sky-900/30' :
          machine.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-slate-100 dark:bg-slate-700/50'
        }`}>
          <Truck className={`w-6 h-6 ${
            isTransit ? 'text-sky-500' :
            machine.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{machine.name || 'Sem Nome'}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{getCategoryName(machine.category)}</p>
          {isTransit && transitDest && (
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5 flex items-center gap-1">
              <Navigation className="w-3 h-3" /> A caminho de {transitDest}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Horas Total</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatHours(machine.totalHours)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Consumo</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatConsumption(machine.consumptionRate)}</p>
          </div>
        </div>
      </div>

      {/* Barra de progresso manutenção */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 dark:text-slate-400">Próxima manutenção</span>
          <span className={`font-medium ${needsMaintenance ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}`}>
            {formatHours(machine.partialHours).replace('h', '')} / {interval}h
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              needsMaintenance ? 'bg-amber-500' : 'bg-primary-500'
            }`}
            style={{ width: `${hoursProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={machine.estadoOperacional || machine.status} />
            {machine.rfidReaderId
              ? <span title={`Leitor: ${machine.rfidReaderId}`}><Wifi className="w-3.5 h-3.5 text-emerald-500" /></span>
              : <span title="Sem leitor RFID configurado"><WifiOff className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" /></span>
            }
          </div>
          {onHistory && (
            <button
              onClick={e => { e.stopPropagation(); onHistory(machine); }}
              title="Histórico de localização"
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <History className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Despacho ou move imediato */}
        {!isTransit && onDispatch && obras && (
          <button
            onClick={e => { e.stopPropagation(); onDispatch(machine); }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            Enviar para Obra
          </button>
        )}
        {/* Inline obra move dropdown (modo localização) */}
        {onMove && obras && !isTransit && (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
              value={machine.obraId || 'estaleiro'}
              onChange={e => onMove(machine.id, e.target.value)}
              className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 focus:border-primary-400 cursor-pointer"
            >
              <option value="estaleiro">🏭 Estaleiro</option>
              {obras.filter(o => o.status === 'ACTIVE' && o.id !== 'estaleiro').map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Card>
  );
};

// Formulário de máquina
const MachineForm = ({ machine, onSave, onCancel, systemSettings }) => {
  const initialData = machine ? {
    name: machine.name || '',
    category: getCategoryId(machine.category),
    consumptionRate: machine.consumptionRate || '',
    location: getLocationName(machine.location),
    serialNumber: machine.serialNumber || '',
    co2Factor: machine.co2Factor || '',
    maintenanceInterval: machine.maintenanceInterval || '',
    rfidReaderId: machine.rfidReaderId || '',
    qrFeatures: machine.qrFeatures || { reportAvaria: true, startSession: false, viewHistory: true },
  } : {
    name: '',
    category: '',
    consumptionRate: '',
    location: '',
    serialNumber: '',
    co2Factor: '',
    maintenanceInterval: '',
    rfidReaderId: '',
    qrFeatures: { reportAvaria: true, startSession: false, viewHistory: true },
  };
  const [formData, setFormData] = useState(initialData);

  const categories = [
    { value: 'escavadora', label: 'Escavadora' },
    { value: 'retroescavadora', label: 'Retroescavadora' },
    { value: 'grua', label: 'Grua' },
    { value: 'betoneira', label: 'Betoneira' },
    { value: 'compactador', label: 'Compactador' },
    { value: 'bulldozer', label: 'Bulldozer' },
    { value: 'empilhador', label: 'Empilhador' },
    { value: 'outro', label: 'Outro' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const saveData = {
      ...formData,
      consumptionRate: parseFloat(formData.consumptionRate) || 0,
    };
    if (formData.co2Factor !== '') saveData.co2Factor = parseFloat(formData.co2Factor);
    if (formData.maintenanceInterval !== '') saveData.maintenanceInterval = parseInt(formData.maintenanceInterval, 10);
    if (!formData.rfidReaderId) saveData.rfidReaderId = null;
    onSave(saveData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome do Equipamento"
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        placeholder="Ex: Escavadora CAT 320"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Categoria"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          options={categories}
        />
        <Input
          label="Consumo (L/h)"
          type="number"
          step="0.1"
          value={formData.consumptionRate}
          onChange={e => setFormData({ ...formData, consumptionRate: e.target.value })}
          placeholder="15.0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Localização"
          value={formData.location}
          onChange={e => setFormData({ ...formData, location: e.target.value })}
          placeholder="Ex: Obra Lisboa Norte"
          icon={MapPin}
        />
        <Input
          label="Nº de Série"
          value={formData.serialNumber}
          onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
          placeholder="CAT-320-2024-001"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={`Fator CO₂ (kg/L) — Padrão: ${systemSettings?.co2FactorPerLitre ?? 2.68}`}
          type="number"
          step="0.01"
          value={formData.co2Factor}
          onChange={e => setFormData({ ...formData, co2Factor: e.target.value })}
          placeholder={`${systemSettings?.co2FactorPerLitre ?? 2.68}`}
        />
        <Input
          label={`Intervalo Manutenção (h) — Padrão: ${systemSettings?.defaultMaintenanceInterval ?? 150}`}
          type="number"
          step="1"
          value={formData.maintenanceInterval}
          onChange={e => setFormData({ ...formData, maintenanceInterval: e.target.value })}
          placeholder={`${systemSettings?.defaultMaintenanceInterval ?? 150}`}
        />
      </div>

      {/* Leitor RFID */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
        <div className="flex items-center gap-2 mb-3">
          {formData.rfidReaderId
            ? <Wifi className="w-4 h-4 text-emerald-500" />
            : <WifiOff className="w-4 h-4 text-slate-400" />
          }
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Leitor RFID</span>
          {formData.rfidReaderId
            ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Configurado</span>
            : <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">Sem leitor</span>
          }
        </div>
        <Input
          label="ID do Leitor (ex: READER-001)"
          value={formData.rfidReaderId}
          onChange={e => setFormData({ ...formData, rfidReaderId: e.target.value })}
          placeholder="READER-001"
          icon={Wifi}
        />
        {machine?.id && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            ID Firestore desta máquina: <span className="font-mono select-all">{machine.id}</span>
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          O hardware envia o ID do leitor — o sistema resolve automaticamente qual máquina está associada.
        </p>
      </div>

      {/* QR Code */}
      {machine?.id && (
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">QR Code da Máquina</p>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <QRCodeSVG
                value={`${window.location.origin}/m/${machine.id}`}
                size={100}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-slate-500 font-mono break-all">{window.location.origin}/m/{machine.id}</p>
              <p className="text-xs text-slate-400">Funções disponíveis via QR:</p>
              <div className="space-y-1.5">
                {[
                  { key: 'reportAvaria', label: 'Reportar Avaria' },
                  { key: 'viewHistory', label: 'Ver Histórico' },
                  { key: 'startSession', label: 'Iniciar Sessão (requer RFID)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.qrFeatures?.[key]}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        qrFeatures: { ...prev.qrFeatures, [key]: e.target.checked },
                      }))}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {machine ? 'Guardar Alterações' : 'Adicionar Equipamento'}
        </Button>
      </div>
    </form>
  );
};

// Modal de Mudança de Localização em Bulk
const BulkLocationModal = ({ isOpen, onClose, selectedMachines, machines, obras, onConfirm }) => {
  const [selectedObra, setSelectedObra] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedMachinesList = machines.filter(m => selectedMachines.includes(m.id));

  const handleConfirm = async () => {
    if (!selectedObra) return;
    setLoading(true);
    await onConfirm(selectedMachines, selectedObra);
    setLoading(false);
    onClose();
  };

  const obraOptions = [
    { value: '', label: 'Selecionar obra...' },
    { value: 'estaleiro', label: '🏗️ Estaleiro (parque de máquinas)' },
    ...obras.filter(o => !o.isVirtual).map(o => ({ value: o.id, label: o.name })),
    { value: 'none', label: '-- Remover localização --' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mover Equipamentos" size="md">
      <div className="space-y-6">
        {/* Lista de máquinas selecionadas */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 block">
            Equipamentos selecionados ({selectedMachinesList.length})
          </label>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 max-h-40 overflow-y-auto">
            {selectedMachinesList.map(m => (
              <div key={m.id} className="flex items-center gap-2 py-1">
                <Truck className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{m.name}</span>
                {m.location && (
                  <span className="text-xs text-slate-400">
                    ({getLocationName(m.location)})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seletor de obra destino */}
        <div>
          <Select
            label="Mover para obra"
            value={selectedObra}
            onChange={e => setSelectedObra(e.target.value)}
            options={obraOptions}
          />
          {obras.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              Nenhuma obra cadastrada. Crie uma obra primeiro no menu Obras.
            </p>
          )}
        </div>

        {/* Preview da mudança */}
        {selectedObra && selectedObra !== 'none' && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-primary-900">
                  {obras.find(o => o.id === selectedObra)?.name}
                </p>
                <p className="text-xs text-primary-600">
                  {selectedMachinesList.length} equipamento(s) serão movidos para esta obra
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedObra === 'none' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              A localização será removida de {selectedMachinesList.length} equipamento(s)
            </p>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedObra || loading}
            loading={loading}
            icon={ArrowRight}
          >
            Confirmar Mudança
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Modal de despacho (dois passos)
const DispatchModal = ({ machine, obras, onConfirm, onClose, loading }) => {
  const [obraId, setObraId] = useState('');
  const activeObras = (obras || []).filter(o => o.status === 'ACTIVE' && o.id !== 'estaleiro');

  return (
    <Modal isOpen onClose={onClose} title={`Enviar para Obra — ${machine?.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          A máquina ficará em estado <span className="font-medium text-sky-600">Em Trânsito</span> até o cartão RFID da obra ser passado no leitor.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destino</label>
          <select
            value={obraId}
            onChange={e => setObraId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecionar obra…</option>
            {activeObras.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        {obraId && (
          <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
            <p className="text-xs text-sky-700 dark:text-sky-300">
              <span className="font-medium">Fluxo:</span> Gestor confirma envio → máquina fica Em Trânsito → portaria da obra passa cartão RFID → confirmado Em Obra
            </p>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            icon={Navigation}
            loading={loading}
            disabled={!obraId}
            onClick={() => onConfirm(machine.id, obraId)}
          >
            Confirmar Envio
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Modal de histórico de localização
const LocationHistoryModal = ({ machine, onClose }) => {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const { db: _db } = useStore();
  const { projectId: _pid } = useStore();

  useEffect(() => {
    if (!machine) return;
    // Import dinâmico para evitar dependência circular
    import('firebase/firestore').then(({ collection, query, where, getDocs, getFirestore, limit }) => {
      const firestore = getFirestore();
      const basePath = `artifacts/casais-rfid/public/data`;
      const q = query(
        collection(firestore, `${basePath}/machineLocationEvents`),
        where('machineId', '==', machine.id),
        limit(50)
      );
      getDocs(q).then(snap => {
        const evts = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setEvents(evts);
        setLoadingEvents(false);
      }).catch(err => { console.error('[history]', err); setLoadingEvents(false); });
    });
  }, [machine?.id]);

  const formatTs = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  };

  const typeLabel = {
    manual_dispatch: 'Movido manualmente',
    despacho_iniciado: 'Despacho iniciado',
    chegada_obra: 'Chegada à obra',
    chegada_obra_confirmada: 'Chegada confirmada (RFID)',
    entrada_estaleiro: 'Regresso ao estaleiro',
  };

  return (
    <Modal isOpen onClose={onClose} title={`Histórico de Localização — ${machine?.name}`}>
      {loadingEvents ? (
        <div className="py-8 text-center text-slate-400 text-sm">A carregar…</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">Sem eventos de localização registados.</div>
      ) : (
        <div className="space-y-0 max-h-96 overflow-y-auto">
          {events.map((ev, i) => (
            <div key={ev.id} className={`flex gap-3 pb-4 ${i < events.length - 1 ? 'border-l-2 border-slate-200 dark:border-slate-700 ml-3' : 'ml-3'}`}>
              <div className="relative -left-3 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-slate-400" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{typeLabel[ev.type] || ev.type}</p>
                <p className="text-xs text-slate-500">{ev.from} → {ev.to}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatTs(ev.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

const MaquinasView = () => {
  const { activeView, machines, obras, loading, addMachine, updateMachine, deleteMachine, moveMachinesToObra, dispatchMachine, systemSettings } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const isLocationView = activeView === 'maquinas-localizacao';
  const [selectionMode, setSelectionMode] = useState(isLocationView);
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [dispatchingMachine, setDispatchingMachine] = useState(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [historyMachine, setHistoryMachine] = useState(null);

  // Sync selection mode with sidebar submenu
  useEffect(() => {
    if (activeView === 'maquinas-localizacao') {
      setSelectionMode(true);
    } else {
      setSelectionMode(false);
      setSelectedMachines([]);
    }
  }, [activeView]);

  // Garantir que obras existe
  const obrasList = obras || [];

  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const categoryName = getCategoryName(m.category, '');
      return m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [machines, searchTerm]);

  const stats = {
    total: machines.length,
    active: machines.filter(m => m.status === 'ACTIVE').length,
    idle: machines.filter(m => m.status === 'IDLE').length,
    maintenance: machines.filter(m => (m.partialHours || 0) >= 120).length,
  };

  const handleSave = async (data) => {
    if (editingMachine) {
      await updateMachine(editingMachine.id, data);
    } else {
      await addMachine(data);
    }
    setShowModal(false);
    setEditingMachine(null);
  };

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setShowModal(true);
  };

  const handleMoveSingle = async (machineId, newObraId) => {
    await moveMachinesToObra([machineId], newObraId);
  };

  const handleDispatchConfirm = async (machineId, obraId) => {
    setDispatchLoading(true);
    await dispatchMachine(machineId, obraId);
    setDispatchLoading(false);
    setDispatchingMachine(null);
  };

  const handleDelete = async (machine) => {
    if (confirm(`Eliminar ${machine.name}?`)) {
      await deleteMachine(machine.id);
    }
  };

  const toggleSelection = (machineId) => {
    setSelectedMachines(prev =>
      prev.includes(machineId)
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const selectAll = () => {
    if (selectedMachines.length === filteredMachines.length) {
      setSelectedMachines([]);
    } else {
      setSelectedMachines(filteredMachines.map(m => m.id));
    }
  };

  const handleBulkMove = async (machineIds, obraId) => {
    if (obraId === 'none') {
      // Remover localização
      for (const id of machineIds) {
        await updateMachine(id, { location: null });
      }
    } else {
      await moveMachinesToObra(machineIds, obraId);
    }
    setSelectedMachines([]);
    setSelectionMode(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMachines([]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="title" className="w-48" />
          <Skeleton className="w-32 h-10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton.Card key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Equipamentos</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão de máquinas e equipamentos</p>
        </div>
        <div className="flex items-center gap-2">
          {!selectionMode ? (
            <>
              <Button variant="outline" icon={MapPin} onClick={() => setSelectionMode(true)}>
                Mudar Localização
              </Button>
              <Button icon={Plus} onClick={() => setShowModal(true)}>
                Novo Equipamento
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={exitSelectionMode}>
                Cancelar
              </Button>
              <Button
                icon={ArrowRight}
                onClick={() => setShowBulkModal(true)}
                disabled={selectedMachines.length === 0}
              >
                Mover ({selectedMachines.length})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Truck} title="Total" value={stats.total} color="primary" />
        <StatCard icon={Check} title="Ativos" value={stats.active} color="emerald" />
        <StatCard icon={Clock} title="Parados" value={stats.idle} color="slate" />
        <StatCard icon={Wrench} title="Manutenção" value={stats.maintenance} color={stats.maintenance > 0 ? 'amber' : 'slate'} />
      </div>

      {/* Barra de seleção quando em modo de seleção */}
      {selectionMode && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                {selectedMachines.length === filteredMachines.length ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                {selectedMachines.length === filteredMachines.length ? 'Desselecionar todos' : 'Selecionar todos'}
              </button>
              <span className="text-sm text-primary-600">
                {selectedMachines.length} de {filteredMachines.length} selecionados
              </span>
            </div>
            <Badge variant="primary">
              Modo de Seleção
            </Badge>
          </div>
        </div>
      )}

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar equipamentos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>Cards</Button>
            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>Tabela</Button>
          </div>
        </div>
      </Card>

      {filteredMachines.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sem equipamentos"
          description="Adicione o primeiro equipamento para começar."
          actionLabel="Adicionar Equipamento"
          onAction={() => setShowModal(true)}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.map(machine => (
            <MachineCard
              key={machine.id}
              machine={machine}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selected={selectedMachines.includes(machine.id)}
              onSelect={toggleSelection}
              selectionMode={selectionMode}
              maintenanceInterval={systemSettings.defaultMaintenanceInterval}
              obras={obrasList}
              onMove={!selectionMode ? handleMoveSingle : undefined}
              onDispatch={!selectionMode ? setDispatchingMachine : undefined}
              onHistory={!selectionMode ? setHistoryMachine : undefined}
            />
          ))}
        </div>
      ) : (
        <Card padding="none">
          <Table>
            <Table.Head>
              <Table.Row>
                {selectionMode && <Table.Header className="w-10" />}
                <Table.Header>Nome</Table.Header>
                <Table.Header>Categoria</Table.Header>
                <Table.Header>Localização</Table.Header>
                <Table.Header align="right">Horas</Table.Header>
                <Table.Header align="center">Estado</Table.Header>
                {!selectionMode && <Table.Header align="right">Ações</Table.Header>}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredMachines.map(machine => (
                <Table.Row
                  key={machine.id}
                  onClick={() => selectionMode ? toggleSelection(machine.id) : handleEdit(machine)}
                  className={selectedMachines.includes(machine.id) ? 'bg-primary-50' : ''}
                >
                  {selectionMode && (
                    <Table.Cell>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedMachines.includes(machine.id)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedMachines.includes(machine.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </Table.Cell>
                  )}
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${machine.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
                        <Truck className={`w-4 h-4 ${machine.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="font-medium">{machine.name}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{getCategoryName(machine.category, '-')}</Table.Cell>
                  <Table.Cell onClick={e => e.stopPropagation()}>
                    {!selectionMode ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <select
                          value={machine.obraId || 'estaleiro'}
                          onChange={e => handleMoveSingle(machine.id, e.target.value)}
                          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
                        >
                          <option value="estaleiro">🏭 Estaleiro</option>
                          {obrasList.filter(o => o.status === 'ACTIVE' && o.id !== 'estaleiro').map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      machine.location ? (
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {getLocationName(machine.location)}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Estaleiro
                        </span>
                      )
                    )}
                  </Table.Cell>
                  <Table.Cell align="right">{machine.totalHours || 0}h</Table.Cell>
                  <Table.Cell align="center"><StatusBadge status={machine.status} /></Table.Cell>
                  {!selectionMode && (
                    <Table.Cell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="xs" icon={Edit2} onClick={(e) => { e.stopPropagation(); handleEdit(machine); }} />
                        <Button variant="ghost" size="xs" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDelete(machine); }} />
                      </div>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      {/* Modal de Edição/Criação */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingMachine(null); }}
        title={editingMachine ? 'Editar Equipamento' : 'Novo Equipamento'}
        size="md"
      >
        <MachineForm machine={editingMachine} onSave={handleSave} onCancel={() => { setShowModal(false); setEditingMachine(null); }} systemSettings={systemSettings} />
      </Modal>

      {/* Modal de Mudança de Localização em Bulk */}
      <BulkLocationModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedMachines={selectedMachines}
        machines={machines}
        obras={obrasList}
        onConfirm={handleBulkMove}
      />

      {/* Modal de Despacho */}
      {dispatchingMachine && (
        <DispatchModal
          machine={dispatchingMachine}
          obras={obrasList}
          loading={dispatchLoading}
          onConfirm={handleDispatchConfirm}
          onClose={() => setDispatchingMachine(null)}
        />
      )}

      {/* Modal de Histórico de Localização */}
      {historyMachine && (
        <LocationHistoryModal
          machine={historyMachine}
          onClose={() => setHistoryMachine(null)}
        />
      )}
    </div>
  );
};

export default MaquinasView;
