import React, { useState, useMemo, useRef } from 'react';
import { Wrench, AlertTriangle, Calendar, Clock, Truck, Check, Plus, X, Upload, Eye, Trash2, Camera, ShieldAlert, CheckCircle2, Phone, MessageSquare, Send, User, ChevronRight, ChevronLeft, CalendarPlus, Search, Download, ChevronDown } from 'lucide-react';
import useStore from '../store/useStore';
import useAvariasStore from '../store/useAvariasStore';
import useAuthStore from '../store/useAuthStore';
import { Card, StatCard, Button, Badge, Modal, Input, Table, EmptyState, Skeleton } from '../components/ui';
import { getCategoryName } from '../utils/safeRender';
import { PERMISSIONS } from '../config/permissions';

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

// ============================================================================
// MaintenanceCalendar — grid mensal com eventos passados, avarias e previsões
// ============================================================================
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const parseDate = (v) => {
  if (!v) return null;
  const d = v?.toDate?.() || new Date(v);
  return isNaN(d) ? null : d;
};

const MaintenanceCalendar = ({ maintenanceRecords, avarias, machines, schedules, getPrediction, setActiveView, onViewRecord }) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvents, setModalEvents] = useState([]);
  const [modalDate, setModalDate] = useState(null);
  const [modalTypeFilter, setModalTypeFilter] = useState('all');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Eventos indexados por dia (YYYY-MM-DD)
  const eventsByDay = useMemo(() => {
    const map = new Map();
    const push = (date, evt) => {
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(evt);
    };

    maintenanceRecords.forEach(r => {
      const d = parseDate(r.createdAt);
      const machine = machines.find(m => m.id === r.machineId);
      push(d, { type: 'past', color: 'blue', label: 'Manutenção', machine: machine?.name || r.machineId, record: r });
    });

    avarias.forEach(a => {
      const d = parseDate(a.createdAt);
      const machine = machines.find(m => m.id === a.machineId);
      push(d, { type: 'avaria', color: 'red', label: `Avaria (${a.status})`, machine: machine?.name || a.machineId, record: a });
    });

    // Build set of machineIds that have a scheduled event
    const scheduledMachineIds = new Set((schedules || []).map(s => s.machineId));

    machines.forEach(m => {
      // Skip forecast if machine already has a scheduled maintenance
      if (scheduledMachineIds.has(m.id)) return;
      const partial = m.partialHours || 0;
      if (partial < 80) return;
      const pred = getPrediction(m);
      if (pred?.predictedDate) {
        const avgLabel = pred.avgHoursPerDay > 0 ? ` (${Number(pred.avgHoursPerDay).toFixed(1)}h/dia)` : '';
        push(pred.predictedDate, {
          type: 'forecast',
          color: 'amber',
          label: `Previsão — ${Number(pred.remaining).toFixed(1)}h restantes${avgLabel}`,
          machine: m.name || m.id,
          record: m,
        });
      }
    });

    (schedules || []).forEach(s => {
      const d = parseDate(s.scheduledDate);
      const machine = machines.find(m => m.id === s.machineId);
      push(d, {
        type: 'scheduled',
        color: 'indigo',
        label: `Agendado: ${s.type || 'Manutenção'}`,
        machine: machine?.name || s.machineId,
        record: s,
      });
    });

    return map;
  }, [maintenanceRecords, avarias, machines, schedules, getPrediction]);

  // Build grid (segunda=0)
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlank = (firstDay.getDay() + 6) % 7; // Monday=0

  const cells = [];
  for (let i = 0; i < leadingBlank; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();

  const colorClasses = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  };

  const handleDayClick = (day) => {
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    const events = eventsByDay.get(key) || [];
    setModalDate(day);
    setModalEvents(events);
    setModalTypeFilter('all');
    setModalOpen(true);
  };

  const filteredModalEvents = useMemo(() => {
    if (modalTypeFilter === 'all') return modalEvents;
    return modalEvents.filter(e => e.type === modalTypeFilter);
  }, [modalEvents, modalTypeFilter]);

  const handleEventClick = (e) => {
    if (!setActiveView) return;
    if (e.type === 'past' && onViewRecord) { onViewRecord(e.record); setModalOpen(false); }
    else if (e.type === 'past') { setActiveView('manutencao-historico'); setModalOpen(false); }
    else if (e.type === 'avaria') { setActiveView('manutencao-avarias'); setModalOpen(false); }
    else if (e.type === 'forecast') { setActiveView('manutencao-alertas'); setModalOpen(false); }
    // 'scheduled' — just show info, no navigation
  };

  // Year range for picker
  const currentYear = today.getFullYear();
  const yearRange = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div>
      {/* Header com navegação */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center relative">
          <div className="flex items-center gap-1 justify-center">
            {/* Month picker */}
            <div className="relative">
              <button
                onClick={() => { setShowMonthPicker(v => !v); setShowYearPicker(false); }}
                className="text-lg font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-0.5 px-1 rounded"
              >
                {MONTHS_PT[month]}
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
              {showMonthPicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 grid grid-cols-3 gap-1 w-48">
                  {MONTHS_PT.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCursor(new Date(year, idx, 1)); setShowMonthPicker(false); }}
                      className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${idx === month ? 'bg-primary-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Year picker */}
            <div className="relative">
              <button
                onClick={() => { setShowYearPicker(v => !v); setShowMonthPicker(false); }}
                className="text-lg font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-0.5 px-1 rounded"
              >
                {year}
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
              {showYearPicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 w-28">
                  {yearRange.map(y => (
                    <button
                      key={y}
                      onClick={() => { setCursor(new Date(y, month, 1)); setShowYearPicker(false); }}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${y === year ? 'bg-primary-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="text-xs text-primary-600 hover:underline"
          >
            Ir para hoje
          </button>
        </div>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" /> Manutenção passada</div>
        <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Avaria</div>
        <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" /> Previsão</div>
        <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" /> Agendamento Sede</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const events = eventsByDay.get(key) || [];
          const isToday = sameDay(day, today);
          const uniqueColors = [...new Set(events.map(e => e.color))].slice(0, 3);

          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              className={`aspect-square flex flex-col items-center justify-between p-1.5 rounded-lg border transition-all text-left
                ${isToday ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/10' :
                  'border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <span className={`text-sm font-medium ${isToday ? 'text-primary-600 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                {day.getDate()}
              </span>
              <div className="flex gap-0.5 items-center mt-auto">
                {uniqueColors.map(c => (
                  <span key={c} className={`inline-block w-2 h-2 rounded-full ${colorClasses[c]}`} />
                ))}
                {events.length > 3 && (
                  <span className="text-[9px] text-slate-500 ml-0.5">+{events.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal de eventos do dia */}
      {modalOpen && modalDate && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalDate.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          size="md"
        >
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'past', label: 'Manutenção' },
              { key: 'avaria', label: 'Avaria' },
              { key: 'forecast', label: 'Previsão' },
              { key: 'scheduled', label: 'Agendamento' },
            ].map(pill => (
              <button
                key={pill.key}
                onClick={() => setModalTypeFilter(pill.key)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${modalTypeFilter === pill.key
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary-300'
                }`}
              >
                {pill.label}
                {pill.key === 'all' && <span className="ml-1 opacity-70">({modalEvents.length})</span>}
              </button>
            ))}
          </div>

          {filteredModalEvents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Sem eventos neste dia.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredModalEvents.map((e, idx) => {
                const isClickable = e.type !== 'scheduled';
                return (
                  <button
                    key={idx}
                    onClick={() => isClickable ? handleEventClick(e) : undefined}
                    disabled={!isClickable}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${e.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                        e.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                          e.color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' :
                            'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}
                      ${isClickable ? 'cursor-pointer hover:shadow-sm hover:scale-[1.01]' : 'cursor-default'}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClasses[e.color]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{e.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{e.machine}</p>
                      {e.type === 'scheduled' && e.record?.assignedTo && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Técnico: {e.record.assignedTo}</p>
                      )}
                    </div>
                    {isClickable && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const MaintenanceCard = ({ machine, onSchedule, onComplete, prediction }) => {
  const hours = machine.partialHours || machine.totalHours || 0;
  const interval = prediction?.interval || 150;
  const progress = Math.min(100, (hours / interval) * 100);
  const isUrgent = progress >= 100;
  const isWarning = progress >= 80;

  const predDate = prediction?.predictedDate;
  const predStr = predDate ? predDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : null;

  return (
    <Card className={`border-l-4 ${isUrgent ? 'border-l-red-500' : isWarning ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isUrgent ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Truck className={`w-6 h-6 ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-white">{machine.name}</h3>
              {isUrgent && <Badge variant="danger">Urgente</Badge>}
              {isWarning && !isUrgent && <Badge variant="warning">Atenção</Badge>}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{getCategoryName(machine.category)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{hours.toFixed(1)}h</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">de {interval}h</p>
        </div>
      </div>

      {/* Prediction Badge */}
      {prediction && predStr && (
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Previsão de Manutenção: {predStr} ({prediction.daysLeft} dias úteis)
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Média: {Number(prediction.avgHoursPerDay).toFixed(1)}h/dia • Restam {Number(prediction.remaining).toFixed(1)}h • Confiança: {prediction.confidence === 'high' ? 'Alta' : prediction.confidence === 'medium' ? 'Média' : 'Estimada'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3">
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        {onSchedule && <Button variant="outline" size="sm" onClick={() => onSchedule(machine)}>Agendar</Button>}
        {onComplete && <Button size="sm" onClick={() => onComplete(machine)}>Registar Manutenção</Button>}
      </div>
    </Card>
  );
};

// Modal para adicionar fotos a registo existente
const PhotoGalleryModal = ({ record, onClose, onAddPhoto, onRemovePhoto, uploading }) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const photos = record?.photos || [];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await onAddPhoto(record.id, file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Fotos da Manutenção" size="lg">
      <div className="space-y-4">
        {/* Upload area */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center">
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          <Camera className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 dark:text-slate-400 mb-3">Adicionar fotos à manutenção</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} icon={Upload}>
              {uploading ? 'A enviar...' : 'Galeria'}
            </Button>
            <Button variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={uploading} icon={Camera}>
              Câmara
            </Button>
          </div>
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
                  <a href={photo.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full hover:bg-slate-100">
                    <Eye className="w-4 h-4 text-slate-700" />
                  </a>
                  <button onClick={() => onRemovePhoto(record.id, photo.id, photo.path)} className="p-2 bg-red-500 rounded-full hover:bg-red-600">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{photo.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
  const cameraInputRef = useRef(null);
  const [formData, setFormData] = useState({
    machineId: machine?.id || '',
    type: 'preventive',
    notes: '',
    cost: '',
    technician: '',
  });
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    setPendingPhotos(prev => [...prev, ...imageFiles]);
    imageFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, { file, url }]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removePreview = (index) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const toRemove = prev[index];
      if (toRemove?.url) URL.revokeObjectURL(toRemove.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!formData.machineId) return;
    setUploading(true);
    setSubmitError(null);
    try {
      const maintenanceId = `maint_${Date.now()}`;
      const uploadedPhotos = [];
      for (const file of pendingPhotos) {
        try {
          const result = await uploadMaintenancePhoto(file, maintenanceId);
          if (result.success) uploadedPhotos.push(result.photo);
        } catch (e) {
          console.error('Falha no upload da foto:', e);
        }
      }
      previewUrls.forEach(p => URL.revokeObjectURL(p.url));
      await onSave({
        ...formData,
        photos: uploadedPhotos,
        cost: formData.cost ? parseFloat(formData.cost) : null,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao guardar manutenção:', error);
      setSubmitError('Não foi possível guardar o registo. Tente novamente.');
    } finally {
      setUploading(false);
    }
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Equipamento *</label>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Manutenção *</label>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Técnico Responsável</label>
          <Input
            value={formData.technician}
            onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
            placeholder="Nome do técnico..."
          />
        </div>

        {/* Cost */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custo (€)</label>
          <Input
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="0.00"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas / Descrição</label>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fotos</label>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Camera className="w-8 h-8 text-slate-400 hidden sm:block" />
              <div className="text-center sm:text-left">
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} icon={Upload}>
                    Galeria
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} icon={Camera}>
                    Tirar Foto
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">JPG, PNG até 10MB cada</p>
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
                    alt={`Foto ${index + 1}`}
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

      {submitError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!formData.machineId || uploading} icon={uploading ? null : Check}>
          {uploading ? 'A guardar...' : 'Registar Manutenção'}
        </Button>
      </div>
    </Modal>
  );
};

// Modal para agendar manutenção futura (Sede)
const ScheduleMaintenanceModal = ({ machine, machines, onClose, onSave, prediction }) => {
  const [formData, setFormData] = useState({
    machineId: machine?.id || '',
    scheduledDate: prediction?.predictedDate
      ? prediction.predictedDate.toISOString().split('T')[0]
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    type: 'preventive',
    notes: '',
    assignedTo: '',
  });

  const handleSubmit = () => {
    if (!formData.machineId || !formData.scheduledDate) return;
    onSave({ ...formData, scheduledDate: new Date(formData.scheduledDate) });
    onClose();
  };

  const types = [
    { value: 'preventive', label: 'Preventiva' },
    { value: 'inspection', label: 'Inspeção' },
    { value: 'oil_change', label: 'Mudança de Óleo' },
    { value: 'filter_change', label: 'Mudança de Filtros' },
    { value: 'major_service', label: 'Revisão Geral' },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="Agendar Manutenção" size="md">
      <div className="space-y-4">
        {prediction && (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Calendar className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Previsão de Manutenção: {prediction.predictedDate.toLocaleDateString('pt-PT')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Baseado em {Number(prediction.avgHoursPerDay).toFixed(1)}h/dia de uso real • {Number(prediction.remaining).toFixed(1)}h restantes
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Equipamento *</label>
          <select
            value={formData.machineId}
            onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecionar...</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data *</label>
          <input
            type="date"
            value={formData.scheduledDate}
            onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <Input
          label="Técnico / Responsável"
          value={formData.assignedTo}
          onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
          placeholder="Nome do técnico..."
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="Notas para o técnico..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!formData.machineId || !formData.scheduledDate} icon={CalendarPlus}>
          Agendar
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
    <button onClick={onClick} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
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
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md group ${isResolvida
          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-70'
          : avaria.maquinaParada
            ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10 hover:border-red-300'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isResolvida ? 'bg-emerald-500' : avaria.maquinaParada ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
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
            {phoneClean && (
              <div className="flex items-center gap-2">
                <a href={`tel:${phoneClean}`} className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  Ligar
                </a>
                <a href={`https://wa.me/351${phoneClean.replace(/^\+?351/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
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

// ============================================================================
// Modal de detalhe de registo de histórico
// ============================================================================
const HistoryDetailModal = ({ record, machine, onClose, onViewPhotos }) => {
  const date = record.createdAt?.toDate?.() || new Date(record.createdAt) || new Date();

  const typeLabels = {
    preventive: 'Preventiva',
    corrective: 'Corretiva',
    inspection: 'Inspeção',
    oil_change: 'Mudança de Óleo',
    filter_change: 'Mudança de Filtros',
    repair: 'Reparação',
  };

  const typeLabel = typeLabels[record.type] || record.type || 'Preventiva';
  const isCorrectiveType = record.type === 'corrective' || record.type === 'repair';

  return (
    <Modal isOpen={true} onClose={onClose} title="Detalhe da Manutenção" size="md">
      <div className="space-y-4">
        {/* Equipamento + Tipo */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
              {machine?.name || record.machineId}
            </h3>
            <div className="mt-1">
              <Badge variant={isCorrectiveType ? 'warning' : 'default'}>{typeLabel}</Badge>
            </div>
          </div>
        </div>

        {/* Detalhes em grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Data</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Técnico</p>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                {record.technician || 'Não especificado'}
              </p>
            </div>
          </div>
          {record.duration != null && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Duração</p>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{record.duration}h</p>
              </div>
            </div>
          )}
          {record.cost != null && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Custo</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{record.cost.toFixed(2)}€</p>
            </div>
          )}
        </div>

        {/* Notas */}
        {record.notes && (
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Notas / Descrição</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              {record.notes}
            </p>
          </div>
        )}

        {/* Fotos */}
        {record.photos?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-2">
              Fotos ({record.photos.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {record.photos.slice(0, 6).map((photo, idx) => (
                <img
                  key={photo.id || idx}
                  src={photo.url}
                  alt={photo.name || `Foto ${idx + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
              ))}
            </div>
            {record.photos.length > 0 && (
              <button
                onClick={() => { onClose(); onViewPhotos(record); }}
                className="mt-2 text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver todas as fotos
              </button>
            )}
          </div>
        )}

        {/* Estado */}
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Manutenção concluída</p>
        </div>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// CSV export utility
// ============================================================================
const exportHistoryCSV = (records, machines, getTypeLabel) => {
  const headers = ['Equipamento', 'Tipo', 'Data', 'Hora', 'Duração (h)', 'Técnico', 'Custo (€)', 'Notas', 'Estado'];
  const escape = (v) => {
    const str = String(v ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map(r => {
    const machine = machines.find(m => m.id === r.machineId);
    const date = r.createdAt?.toDate?.() || new Date(r.createdAt) || new Date();
    return [
      machine?.name || r.machineId,
      getTypeLabel(r.type),
      date.toLocaleDateString('pt-PT'),
      date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      r.duration ?? '',
      r.technician || '',
      r.cost != null ? r.cost.toFixed(2) : '',
      r.notes || '',
      'Concluída',
    ].map(escape).join(',');
  });

  const csv = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `manutencoes_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ManutencaoView = () => {
  const {
    activeView,
    setActiveView,
    machines,
    maintenanceRecords,
    maintenanceSchedules,
    updateMachine,
    addMaintenanceRecord,
    addMaintenanceSchedule,
    uploadMaintenancePhoto,
    addPhotoToMaintenance,
    removePhotoFromMaintenance,
    getSmartMaintenancePrediction,
    loading
  } = useStore();

  const { avarias, resolverAvaria, addNota } = useAvariasStore();
  const { can } = useAuthStore();
  const canSchedule = can(PERMISSIONS.MAINTENANCE_SCHEDULE);
  const canCreate = can(PERMISSIONS.MAINTENANCE_CREATE);
  const [selectedAvaria, setSelectedAvaria] = useState(null);

  // Derivar tab diretamente do activeView
  const activeTab = activeView === 'manutencao-calendario' ? 'calendar' : activeView === 'manutencao-historico' ? 'history' : activeView === 'manutencao-avarias' ? 'avarias' : 'alerts';

  const avariasPendentes = useMemo(() => avarias.filter((a) => a.status === 'pendente'), [avarias]);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [uploading, setUploading] = useState(false);

  // History row detail modal
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);

  // Search & filter state for Alertas tab
  const [alertsSearch, setAlertsSearch] = useState('');
  const [alertsTypeFilter, setAlertsTypeFilter] = useState('');

  // Search & filter state for Histórico tab
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  // Search & filter state for Avarias tab
  const [avariasSearch, setAvariasSearch] = useState('');
  const [avariasStatusFilter, setAvariasStatusFilter] = useState('');
  const [avariasCategoriaFilter, setAvariasCategoriaFilter] = useState('');

  // Percentage-based alert thresholds
  const alertMachines = useMemo(() => machines.filter(m => {
    const hours = m.partialHours || m.totalHours || 0;
    const pred = getSmartMaintenancePrediction(m);
    const interval = pred?.interval || 150;
    return (hours / interval) >= 0.80;
  }).sort((a, b) => {
    const predA = getSmartMaintenancePrediction(a);
    const predB = getSmartMaintenancePrediction(b);
    const intA = predA?.interval || 150;
    const intB = predB?.interval || 150;
    const pctA = (a.partialHours || a.totalHours || 0) / intA;
    const pctB = (b.partialHours || b.totalHours || 0) / intB;
    return pctB - pctA;
  }), [machines, getSmartMaintenancePrediction]);

  const urgentCount = useMemo(() => alertMachines.filter(m => {
    const hours = m.partialHours || m.totalHours || 0;
    const pred = getSmartMaintenancePrediction(m);
    const interval = pred?.interval || 150;
    return (hours / interval) >= 1.0;
  }).length, [alertMachines, getSmartMaintenancePrediction]);

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
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
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

  // Filtered alert machines — percentage-based
  const filteredAlertMachines = useMemo(() => {
    let result = alertMachines;
    if (alertsSearch.trim()) {
      const q = alertsSearch.toLowerCase();
      result = result.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (getCategoryName(m.category) || '').toLowerCase().includes(q)
      );
    }
    if (alertsTypeFilter) {
      if (alertsTypeFilter === 'urgent') {
        result = result.filter(m => {
          const hours = m.partialHours || m.totalHours || 0;
          const pred = getSmartMaintenancePrediction(m);
          const interval = pred?.interval || 150;
          return (hours / interval) >= 1.0;
        });
      }
      if (alertsTypeFilter === 'warning') {
        result = result.filter(m => {
          const hours = m.partialHours || m.totalHours || 0;
          const pred = getSmartMaintenancePrediction(m);
          const interval = pred?.interval || 150;
          const pct = hours / interval;
          return pct >= 0.80 && pct < 1.0;
        });
      }
    }
    return result;
  }, [alertMachines, alertsSearch, alertsTypeFilter, getSmartMaintenancePrediction]);

  // Filtered history records
  const filteredHistoryRecords = useMemo(() => {
    let result = sortedRecords;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter(r => {
        const machine = machines.find(m => m.id === r.machineId);
        return (
          (machine?.name || r.machineId || '').toLowerCase().includes(q) ||
          (r.technician || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q)
        );
      });
    }
    if (historyTypeFilter) {
      result = result.filter(r => r.type === historyTypeFilter);
    }
    if (historyDateFrom) {
      const from = new Date(historyDateFrom);
      result = result.filter(r => {
        const d = r.createdAt?.toDate?.() || new Date(r.createdAt);
        return d >= from;
      });
    }
    if (historyDateTo) {
      const to = new Date(historyDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(r => {
        const d = r.createdAt?.toDate?.() || new Date(r.createdAt);
        return d <= to;
      });
    }
    return result;
  }, [sortedRecords, machines, historySearch, historyTypeFilter, historyDateFrom, historyDateTo]);

  // Filtered avarias
  const filteredAvarias = useMemo(() => {
    let result = avarias;
    if (avariasSearch.trim()) {
      const q = avariasSearch.toLowerCase();
      result = result.filter(a =>
        (a.machineId || '').toLowerCase().includes(q) ||
        (a.descricao || '').toLowerCase().includes(q) ||
        (a.operadorNome || '').toLowerCase().includes(q)
      );
    }
    if (avariasStatusFilter) {
      result = result.filter(a => a.status === avariasStatusFilter);
    }
    if (avariasCategoriaFilter) {
      result = result.filter(a => a.categoria === avariasCategoriaFilter);
    }
    return result;
  }, [avarias, avariasSearch, avariasStatusFilter, avariasCategoriaFilter]);

  const selectClasses = "px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  if (loading) return <div className="space-y-6"><Skeleton variant="title" className="w-48" /><div className="grid grid-cols-1 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manutenção</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão de manutenções preventivas</p>
        </div>
        {canCreate && (
          <Button icon={Plus} onClick={() => { setSelectedMachine(null); setShowNewModal(true); }}>
            Registar Manutenção
          </Button>
        )}
      </div>

      {/* StatCards — 4 cards, clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className="cursor-pointer rounded-xl transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => { setActiveView('manutencao-alertas'); setAlertsTypeFilter(''); }}
          title="Ver alertas"
        >
          <StatCard icon={AlertTriangle} title="Alertas" value={alertMachines.length} color={alertMachines.length > 0 ? 'amber' : 'emerald'} />
        </div>
        <div
          className="cursor-pointer rounded-xl transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => { setActiveView('manutencao-alertas'); setAlertsTypeFilter('urgent'); }}
          title="Ver urgentes"
        >
          <StatCard icon={Wrench} title="Urgentes" value={urgentCount} color={urgentCount > 0 ? 'red' : 'emerald'} />
        </div>
        <div
          className="cursor-pointer rounded-xl transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => setActiveView('manutencao-historico')}
          title="Ver histórico"
        >
          <StatCard icon={Check} title="Concluídas" value={maintenanceRecords.length} color="primary" />
        </div>
        <div
          className="cursor-pointer rounded-xl transition-all hover:scale-[1.02] hover:shadow-md"
          onClick={() => setActiveView('manutencao-avarias')}
          title="Ver avarias"
        >
          <StatCard icon={ShieldAlert} title="Avarias" value={avariasPendentes.length} color={avariasPendentes.length > 0 ? 'red' : 'emerald'} />
        </div>
      </div>

      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveView(id === 'calendar' ? 'manutencao-calendario' : id === 'history' ? 'manutencao-historico' : id === 'avarias' ? 'manutencao-avarias' : 'manutencao-alertas')} />
        <div className="p-6">

          {/* ── Alertas tab ── */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={alertsSearch}
                    onChange={e => setAlertsSearch(e.target.value)}
                    placeholder="Pesquisar equipamento..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <select
                  value={alertsTypeFilter}
                  onChange={e => setAlertsTypeFilter(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Todos os estados</option>
                  <option value="urgent">Urgente (≥100%)</option>
                  <option value="warning">Atenção (≥80%)</option>
                </select>
              </div>

              {filteredAlertMachines.length === 0 ? (
                alertMachines.length === 0
                  ? <EmptyState icon={Check} title="Sem alertas" description="Todos os equipamentos estão dentro dos limites." />
                  : <EmptyState icon={Search} title="Sem resultados" description="Nenhum equipamento corresponde à pesquisa." />
              ) : (
                <div className="space-y-4">
                  {filteredAlertMachines.map(m => (
                    <MaintenanceCard
                      key={m.id}
                      machine={m}
                      onSchedule={canSchedule ? (machine) => setShowScheduleModal(machine) : null}
                      onComplete={canCreate ? handleComplete : null}
                      prediction={getSmartMaintenancePrediction(m)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Calendário tab ── */}
          {activeTab === 'calendar' && (
            <MaintenanceCalendar
              maintenanceRecords={maintenanceRecords}
              avarias={avarias}
              machines={machines}
              schedules={maintenanceSchedules}
              getPrediction={getSmartMaintenancePrediction}
              setActiveView={setActiveView}
              onViewRecord={(record) => setSelectedHistoryRecord(record)}
            />
          )}

          {/* ── Histórico tab ── */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="Pesquisar equipamento, técnico ou notas..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <select
                    value={historyTypeFilter}
                    onChange={e => setHistoryTypeFilter(e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">Todos os tipos</option>
                    <option value="preventive">Preventiva</option>
                    <option value="corrective">Corretiva</option>
                    <option value="inspection">Inspeção</option>
                    <option value="oil_change">Mudança Óleo</option>
                    <option value="filter_change">Mudança Filtros</option>
                    <option value="repair">Reparação</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Download}
                    onClick={() => exportHistoryCSV(filteredHistoryRecords, machines, getTypeLabel)}
                    disabled={filteredHistoryRecords.length === 0}
                  >
                    Exportar CSV
                  </Button>
                </div>
                {/* Date range filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">De:</label>
                    <input
                      type="date"
                      value={historyDateFrom}
                      onChange={e => setHistoryDateFrom(e.target.value)}
                      className={`flex-1 ${selectClasses}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Até:</label>
                    <input
                      type="date"
                      value={historyDateTo}
                      onChange={e => setHistoryDateTo(e.target.value)}
                      className={`flex-1 ${selectClasses}`}
                    />
                  </div>
                  {(historySearch || historyTypeFilter || historyDateFrom || historyDateTo) && (
                    <button
                      onClick={() => { setHistorySearch(''); setHistoryTypeFilter(''); setHistoryDateFrom(''); setHistoryDateTo(''); }}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5" /> Limpar filtros
                    </button>
                  )}
                </div>
                {filteredHistoryRecords.length !== sortedRecords.length && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A mostrar {filteredHistoryRecords.length} de {sortedRecords.length} registos
                  </p>
                )}
              </div>

              {filteredHistoryRecords.length === 0 ? (
                sortedRecords.length === 0
                  ? <EmptyState icon={Wrench} title="Sem registos" description="Nenhuma manutenção registada ainda." />
                  : <EmptyState icon={Search} title="Sem resultados" description="Nenhum registo corresponde aos filtros aplicados." />
              ) : (
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
                      {filteredHistoryRecords.map(r => {
                        const machine = machines.find(m => m.id === r.machineId);
                        const date = r.createdAt?.toDate?.() || new Date(r.createdAt);
                        return (
                          <Table.Row
                            key={r.id}
                            onClick={() => setSelectedHistoryRecord(r)}
                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
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
                                onClick={(e) => { e.stopPropagation(); setShowPhotoModal(r); }}
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
              )}
            </div>
          )}

          {/* ── Avarias tab ── */}
          {activeTab === 'avarias' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={avariasSearch}
                    onChange={e => setAvariasSearch(e.target.value)}
                    placeholder="Pesquisar máquina, descrição ou operador..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <select
                  value={avariasStatusFilter}
                  onChange={e => setAvariasStatusFilter(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Todos os estados</option>
                  <option value="pendente">Pendente</option>
                  <option value="resolvida">Resolvida</option>
                </select>
                <select
                  value={avariasCategoriaFilter}
                  onChange={e => setAvariasCategoriaFilter(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Todas as categorias</option>
                  {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {(avariasSearch || avariasStatusFilter || avariasCategoriaFilter) && filteredAvarias.length !== avarias.length && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A mostrar {filteredAvarias.length} de {avarias.length} avarias
                  </p>
                  <button
                    onClick={() => { setAvariasSearch(''); setAvariasStatusFilter(''); setAvariasCategoriaFilter(''); }}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Limpar filtros
                  </button>
                </div>
              )}

              {filteredAvarias.length === 0 ? (
                avarias.length === 0
                  ? <EmptyState icon={ShieldAlert} title="Sem casos de avaria" description="Nenhuma avaria reportada pelos operadores. As avarias são submetidas via QR Code no terreno." />
                  : <EmptyState icon={Search} title="Sem resultados" description="Nenhuma avaria corresponde aos filtros aplicados." />
              ) : (
                <div className="space-y-2">
                  {filteredAvarias.map(a => (
                    <AvariaListItem key={a.id} avaria={a} onClick={() => setSelectedAvaria(a)} />
                  ))}
                </div>
              )}
            </div>
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

      {/* Modal: Agendar manutenção futura */}
      {showScheduleModal && (
        <ScheduleMaintenanceModal
          machine={showScheduleModal}
          machines={machines}
          onClose={() => setShowScheduleModal(null)}
          onSave={addMaintenanceSchedule}
          prediction={showScheduleModal ? getSmartMaintenancePrediction(showScheduleModal) : null}
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

      {/* Modal: Detalhe de registo de histórico */}
      {selectedHistoryRecord && (
        <HistoryDetailModal
          record={selectedHistoryRecord}
          machine={machines.find(m => m.id === selectedHistoryRecord.machineId)}
          onClose={() => setSelectedHistoryRecord(null)}
          onViewPhotos={(r) => setShowPhotoModal(r)}
        />
      )}
    </div>
  );
};

export default ManutencaoView;
