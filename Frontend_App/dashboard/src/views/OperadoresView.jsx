import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Search, CreditCard, Clock, Trash2, Activity, Briefcase, Building2, Edit2, Filter, Sparkles, ArrowRight, Check, X, Shield, Key, Award, Link2, Smartphone, Radio } from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { Card, StatCard, Button, Badge, Modal, Input, Table, EmptyState, Skeleton } from '../components/ui';
import { PERMISSIONS, getLevelLabel } from '../config/permissions';

/**
 * Definição de cargos de TRABALHO (job roles - o que a pessoa FAZ no terreno)
 * Estes são diferentes dos perfis de SISTEMA (system roles - o que a pessoa pode ACEDER no PWA)
 *
 * NOTA: operadores de obra usam credencial NFC/app para levantar e devolver equipamentos.
 * O PWA é para gestores, supervisores e pessoal de escritório.
 */
const EMPLOYEE_ROLES = [
  { id: 'operador', label: 'Operador de Equipamentos', color: 'primary', description: 'Levanta e devolve equipamentos via NFC/app', suggestedSystemRole: null },
  { id: 'encarregado', label: 'Encarregado de Obra', color: 'amber', description: 'Supervisiona equipa em obra', suggestedSystemRole: 'encarregado_obra' },
  { id: 'supervisor', label: 'Supervisor', color: 'purple', description: 'Coordena múltiplas obras', suggestedSystemRole: 'gestor_frota' },
  { id: 'tecnico_manutencao', label: 'Técnico de Manutenção', color: 'emerald', description: 'Inspeção e reparação de equipamentos', suggestedSystemRole: 'tecnico_manutencao' },
  { id: 'gestor_frota', label: 'Gestor de Inventário', color: 'blue', description: 'Gestão geral dos equipamentos', suggestedSystemRole: 'gestor_frota' },
  { id: 'administrativo', label: 'Administrativo', color: 'slate', description: 'Funções administrativas', suggestedSystemRole: 'operador' },
];

const getRoleInfo = (roleId) => EMPLOYEE_ROLES.find(r => r.id === roleId) || EMPLOYEE_ROLES[0];
const getSessionDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Competências para manuseamento de equipamentos
const LICENSE_TYPES = [
  { id: 'perfuracao', label: 'Perfuração', icon: '🛠️', description: 'Berbequins, SDS e martelos' },
  { id: 'corte', label: 'Corte', icon: '🪚', description: 'Serras, rebarbadoras e cortadoras' },
  { id: 'fixacao', label: 'Fixação', icon: '🔩', description: 'Parafusadoras e pistolas de pregos' },
  { id: 'betao', label: 'Betão', icon: '🏗️', description: 'Vibradores, betoneiras e compactadores' },
  { id: 'energia', label: 'Energia', icon: '⚡', description: 'Geradores e extensões críticas' },
  { id: 'medicao', label: 'Medição', icon: '📐', description: 'Lasers e equipamentos de medição' },
  { id: 'bombagem', label: 'Bombagem', icon: '💧', description: 'Bombas e equipamentos hidráulicos' },
];

const RoleBadge = ({ roleId }) => {
  const role = getRoleInfo(roleId);
  const colorMap = {
    primary: 'bg-primary-100 text-primary-700 border-primary-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    slate: 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${colorMap[role.color]}`}>
      <Briefcase className="w-3 h-3" />
      {role.label}
    </span>
  );
};

const OperatorForm = ({ operator, obras, onSave, onCancel, assignableRoles, canAssignRoles }) => {
  const latestScanBuffer = useStore(s => s.latestScanBuffer);

  const [formData, setFormData] = useState({
    name: '',
    cardId: '',
    phone: '',
    role: 'operador',
    systemRole: null,
    assignedObraId: '',
    email: '',
    licenses: [],
    ...(operator || {}),
  });

  // ─── RFID Provisioning State ───────────────────────────────────────────
  const [rfidDetected, setRfidDetected] = useState(false);
  const [rfidSource, setRfidSource] = useState(null); // 'sensor' | 'nfc'
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcError, setNfcError] = useState(null);
  const activatedAtRef = useRef(Date.now());
  const nfcReaderRef = useRef(null);

  const isCreating = !operator;

  // Watch scan_buffer for new card scans (sensor de obra)
  useEffect(() => {
    if (!isCreating || !latestScanBuffer || rfidDetected) return;
    if (latestScanBuffer.timestamp > activatedAtRef.current) {
      setFormData(prev => ({ ...prev, cardId: latestScanBuffer.cardId }));
      setRfidDetected(true);
      setRfidSource('sensor');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [latestScanBuffer, isCreating, rfidDetected]);

  // Web NFC — espelha exatamente o padrão do MobileHubView (que funciona a 100%)
  // Diferenças críticas vs versão anterior:
  //   1. window.NDEFReader (explícito)
  //   2. reader.scan() SEM AbortController (o signal causava abort prematuro)
  //   3. addEventListener em vez de property assignment
  //   4. Check de disponibilidade DENTRO do handler, não no render
  const startNfcScan = useCallback(async () => {
    if (!('NDEFReader' in window)) {
      setNfcError('NFC não disponível. Use Chrome no Android.');
      return;
    }

    try {
      const reader = new window.NDEFReader();
      await reader.scan();
      nfcReaderRef.current = reader;
      setNfcScanning(true);
      setNfcError(null);
      if (navigator.vibrate) navigator.vibrate(50);

      reader.addEventListener('reading', ({ serialNumber }) => {
        const cardId = serialNumber
          ? serialNumber.replace(/:/g, '').toUpperCase()
          : `NFC_${Date.now()}`;
        setFormData(prev => ({ ...prev, cardId }));
        setRfidDetected(true);
        setRfidSource('nfc');
        setNfcScanning(false);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
      });

      reader.addEventListener('readingerror', () => {
        if (navigator.vibrate) navigator.vibrate([200]);
      });
    } catch (err) {
      setNfcScanning(false);
      if (err.name === 'NotAllowedError') {
        setNfcError('Permissão NFC negada. Verifique as permissões do browser.');
      } else {
        setNfcError('NFC não disponível neste dispositivo.');
      }
    }
  }, []);

  const cancelNfc = useCallback(() => {
    setNfcScanning(false);
  }, []);

  const clearDetectedCard = () => {
    setFormData(prev => ({ ...prev, cardId: '' }));
    setRfidDetected(false);
    setRfidSource(null);
    activatedAtRef.current = Date.now();
  };

  // ─── Form Logic ────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleJobRoleChange = (newRole) => {
    const roleInfo = getRoleInfo(newRole);
    const suggestedSystemRole = roleInfo.suggestedSystemRole;
    setFormData({
      ...formData,
      role: newRole,
      systemRole: !operator ? suggestedSystemRole : formData.systemRole,
    });
  };

  const activeObras = obras.filter(o => o.status === 'ACTIVE' || o.status === 'PLANNED');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome Completo"
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        placeholder="Ex: João Silva"
        required
      />

      {/* ─── RFID Card Provisioning Zone ─── */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4" />
            Credencial do operador
          </div>
        </label>

        {isCreating ? (
          <div
            className={`relative rounded-xl border-2 transition-all duration-700 overflow-hidden ${
              rfidDetected
                ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 shadow-lg shadow-emerald-500/10'
                : nfcScanning
                  ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10'
                  : 'border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600'
            }`}
          >
            {/* Shimmer scan effect */}
            {!rfidDetected && !nfcScanning && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-100/40 dark:via-primary-500/5 to-transparent"
                  style={{ animation: 'rfidShimmer 3s ease-in-out infinite' }}
                />
              </div>
            )}

            {/* NFC scanning rings */}
            {nfcScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="absolute w-24 h-24 rounded-full border-2 border-violet-300/40 animate-ping" />
                <div className="absolute w-36 h-36 rounded-full border border-violet-200/20 animate-ping" style={{ animationDelay: '0.5s' }} />
              </div>
            )}

            <div className="relative p-5">
              {rfidDetected ? (
                /* ── DETECTED — Card captured ── */
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0"
                    style={{ animation: 'rfidBounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}
                  >
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      Credencial capturada!
                    </p>
                    <p className="text-xl font-mono font-black tracking-wider text-slate-900 dark:text-white truncate">
                      {formData.cardId}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      {rfidSource === 'nfc' ? (
                        <><Smartphone className="w-3 h-3" /> via NFC do telemóvel</>
                      ) : (
                        <><Radio className="w-3 h-3" /> via sensor de obra</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearDetectedCard}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 transition flex-shrink-0"
                    title="Limpar e ler outra credencial"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : nfcScanning ? (
                /* ── NFC SCANNING — Waiting for tap ── */
                <div className="flex flex-col items-center gap-3 py-3">
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-violet-600 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-violet-700 dark:text-violet-400">
                      Aproxime a credencial do telemóvel...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Segure a credencial junto ao sensor NFC do dispositivo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelNfc}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2"
                  >
                    Cancelar leitura
                  </button>
                </div>
              ) : (
                /* ── IDLE — Listening for sensors ── */
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-7 h-7 text-primary-600" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary-500" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      A escutar sensores de obra...
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Leia a credencial no telemóvel ou digite manualmente
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startNfcScan}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30 active:scale-95 flex-shrink-0"
                  >
                    <Smartphone className="w-4 h-4" />
                    Ler NFC
                  </button>
                </div>
              )}

              {/* NFC error message */}
              {nfcError && !rfidDetected && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <p className="text-xs text-amber-700 dark:text-amber-400">{nfcError}</p>
                </div>
              )}

              {/* Manual fallback input */}
              {!rfidDetected && !nfcScanning && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <input
                    type="text"
                    value={formData.cardId}
                    onChange={e => setFormData(prev => ({ ...prev, cardId: e.target.value.toUpperCase() }))}
                    placeholder="Ou digite o ID manualmente... (ex: AB12CD34)"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-white/80 dark:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 dark:focus:border-primary-500 placeholder:text-slate-400"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Edit mode — simple disabled display */
          <Input
            value={formData.cardId}
            icon={CreditCard}
            disabled
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              Cargo de Trabalho
            </div>
          </label>
          <select
            value={formData.role}
            onChange={e => handleJobRoleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-slate-800"
          >
            {EMPLOYEE_ROLES.map(role => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getRoleInfo(formData.role).description}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Obra Atribuída</label>
          <select
            value={formData.assignedObraId}
            onChange={e => setFormData({ ...formData, assignedObraId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-slate-800"
          >
            <option value="">Sem obra atribuída</option>
            {activeObras.map(obra => (
              <option key={obra.id} value={obra.id}>{obra.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Perfil de Sistema - só visível se tiver permissão */}
      {canAssignRoles && assignableRoles.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Perfil de Acesso ao Sistema
            </div>
          </label>
          <select
            value={formData.systemRole}
            onChange={e => setFormData({ ...formData, systemRole: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-slate-800"
          >
            {assignableRoles.map(role => (
              <option key={role.id} value={role.id}>{role.name} - {getLevelLabel(role.level)}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <Key className="w-3 h-3 inline mr-1" />
            Define o que este utilizador pode ver e fazer na aplicação
          </p>
        </div>
      )}

      {/* Competências de equipamentos */}
      {(formData.role === 'operador' || formData.role === 'tecnico_manutencao') && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Competências de Equipamentos
            </div>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Selecione os tipos de equipamentos que este operador está autorizado a utilizar
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LICENSE_TYPES.map(license => {
              const isSelected = formData.licenses?.includes(license.id);
              return (
                <button
                  key={license.id}
                  type="button"
                  onClick={() => {
                    const newLicenses = isSelected
                      ? formData.licenses.filter(l => l !== license.id)
                      : [...(formData.licenses || []), license.id];
                    setFormData({ ...formData, licenses: newLicenses });
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <span className="text-lg">{license.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{license.label}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {formData.licenses?.length > 0 && (
            <p className="mt-2 text-xs text-primary-600">
              {formData.licenses.length} competência(s) selecionada(s)
            </p>
          )}
        </div>
      )}

      <Input
        label="Telefone"
        value={formData.phone}
        onChange={e => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Ex: 912 345 678"
      />

      <div>
        <Input
          label="Email (opcional)"
          type="email"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          placeholder="Ex: joao.silva@casais.pt"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Campo de contacto. O levantamento de equipamentos é feito via credencial NFC/app, não email.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{operator ? 'Guardar Alterações' : 'Registar Operador'}</Button>
      </div>
    </form>
  );
};

// Componente de sugestão auto-assign
const AutoAssignSuggestionCard = ({ suggestions, onAccept, onDismiss }) => {
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-2 border-dashed border-primary-200 bg-primary-50/30">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Sugestões de Atribuição Automática
            <Badge variant="primary">{suggestions.length}</Badge>
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Baseado nos checkouts de equipamentos, estes operadores podem ser atribuídos a novas obras.
          </p>
          <div className="mt-4 space-y-2">
            {suggestions.map(suggestion => (
              <div key={suggestion.operatorId} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-xs font-semibold text-slate-600">
                    {suggestion.operatorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{suggestion.operatorName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{suggestion.currentObraName || 'Sem obra'}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="text-primary-600 font-medium">{suggestion.suggestedObraName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{suggestion.hoursInSuggestedObra.toFixed(1)}h nesta obra</span>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={Check}
                      onClick={() => onAccept(suggestion)}
                      className="text-emerald-600 hover:bg-emerald-50"
                    />
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={X}
                      onClick={() => onDismiss(suggestion.operatorId)}
                      className="text-slate-400 hover:bg-slate-100 dark:bg-slate-700/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const OperadoresView = () => {
  const { operators, toolSessions, obras, loading, addOperator, deleteOperator, updateOperator, matchOperatorToProcore, procoreDirectory, subscribeScanBuffer } = useStore();
  const { can, getAssignableRoles, getAllRoles } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [obraFilter, setObraFilter] = useState('all');
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

  // RFID Setup Mode — subscribe to scan_buffer while creating a new operator
  useEffect(() => {
    if (showModal && !editingOperator) {
      const unsubscribe = subscribeScanBuffer();
      return unsubscribe;
    }
  }, [showModal, editingOperator, subscribeScanBuffer]);

  // Permissões
  const canAssignRoles = can(PERMISSIONS.OPERATORS_ASSIGN_ROLE);
  const assignableRoles = useMemo(() => getAssignableRoles(), [getAssignableRoles]);
  const allSystemRoles = useMemo(() => getAllRoles(), [getAllRoles]);

  const operatorStats = useMemo(() => {
    return operators.map(op => {
      const opSessions = toolSessions.filter(
        s => s.operatorId === op.id || s.operatorId === op.cardId
      );
      const totalHours = opSessions
        .filter(s => s.status === 'CLOSED')
        .reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const isActive = opSessions.some(s => s.status === 'OPEN');
      const lastSession = opSessions.reduce((latest, session) => {
        const sessionDate = getSessionDate(session.endTime) || getSessionDate(session.startTime);
        const latestDate = latest
          ? getSessionDate(latest.endTime) || getSessionDate(latest.startTime)
          : null;

        if (!sessionDate) return latest;
        if (!latestDate || sessionDate > latestDate) return session;
        return latest;
      }, null);
      const assignedObra = obras.find(o => o.id === op.assignedObraId);
      const systemRoleInfo = allSystemRoles[op.systemRole];
      // Procore enrichment: matching por email/nome contra a directory sincronizada
      const { procoreUser } = matchOperatorToProcore(op);
      return {
        ...op,
        totalHours: Math.round(totalHours * 10) / 10,
        sessionCount: opSessions.length,
        isActive,
        lastSession,
        assignedObraName: assignedObra?.name || null,
        systemRoleName: systemRoleInfo?.name || 'Operador',
        systemRoleLevel: systemRoleInfo?.level,
        procoreUser: procoreUser || null,
      };
    });
  }, [operators, toolSessions, obras, allSystemRoles, procoreDirectory, matchOperatorToProcore]);

  // Calcular sugestões de auto-assign baseado nos checkouts de equipamentos
  const autoAssignSuggestions = useMemo(() => {
    const suggestions = [];

    operators.forEach(op => {
      // Ignorar operadores já dispensados
      if (dismissedSuggestions.includes(op.id)) return;

      // Obter checkouts fechados do operador
      const opSessions = toolSessions.filter(s =>
        (s.operatorId === op.id || s.operatorId === op.cardId) && s.status === 'CLOSED'
      );
      if (opSessions.length === 0) return;

      // Contar tempo fora por obra
      const hoursByObra = {};
      opSessions.forEach(session => {
        const obraId = session.obraId;
        if (obraId) {
          if (!hoursByObra[obraId]) hoursByObra[obraId] = 0;
          hoursByObra[obraId] += session.durationHours || 0;
        }
      });

      // Encontrar a obra com mais horas
      let maxObraId = null;
      let maxHours = 0;
      Object.entries(hoursByObra).forEach(([obraId, hours]) => {
        if (hours > maxHours) {
          maxHours = hours;
          maxObraId = obraId;
        }
      });

      // Se a obra com mais horas é diferente da atribuída, sugerir
      if (maxObraId && maxObraId !== op.assignedObraId && maxHours >= 5) {
        const suggestedObra = obras.find(o => o.id === maxObraId);
        const currentObra = obras.find(o => o.id === op.assignedObraId);

        if (suggestedObra && suggestedObra.status === 'ACTIVE') {
          suggestions.push({
            operatorId: op.id,
            operatorName: op.name,
            currentObraId: op.assignedObraId,
            currentObraName: currentObra?.name || null,
            suggestedObraId: maxObraId,
            suggestedObraName: suggestedObra.name,
            hoursInSuggestedObra: maxHours,
          });
        }
      }
    });

    return suggestions.sort((a, b) => b.hoursInSuggestedObra - a.hoursInSuggestedObra);
  }, [operators, toolSessions, obras, dismissedSuggestions]);

  // Pending operators: Procore directory entries not yet matched to a local operator
  const pendingFromProcore = useMemo(() => {
    if (!procoreDirectory?.length) return [];
    const localEmails = new Set(operators.map(o => (o.email || '').toLowerCase()).filter(Boolean));
    const localProcoreIds = new Set(operators.map(o => o.procoreUserId).filter(Boolean));
    return procoreDirectory.filter(u => {
      const email = (u.email_address || u.email || '').toLowerCase();
      const pid = String(u.id || '');
      return !localProcoreIds.has(pid) && (!email || !localEmails.has(email));
    });
  }, [procoreDirectory, operators]);

  const filteredOperators = operatorStats.filter(op => {
    const matchesSearch = op.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         op.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || op.role === roleFilter;
    const matchesObra = obraFilter === 'all' || op.assignedObraId === obraFilter;
    return matchesSearch && matchesRole && matchesObra;
  });

  // Contadores por cargo
  const roleStats = useMemo(() => {
    const stats = {};
    EMPLOYEE_ROLES.forEach(role => {
      stats[role.id] = operatorStats.filter(op => op.role === role.id).length;
    });
    return stats;
  }, [operatorStats]);

  const handleSave = async (data) => {
    let result;
    if (editingOperator) {
      result = await updateOperator(editingOperator.id, data);
    } else {
      result = await addOperator(data);
    }
    if (result?.success === false) {
      alert(`Erro ao guardar: ${result.error}`);
      return;
    }
    setShowModal(false);
    setEditingOperator(null);
  };

  const handleEdit = (operator) => {
    setEditingOperator(operator);
    setShowModal(true);
  };

  const handleDelete = async (operator) => {
    if (confirm(`Eliminar ${operator.name}?`)) await deleteOperator(operator.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOperator(null);
  };

  // Aceitar sugestão de auto-assign
  const handleAcceptSuggestion = async (suggestion) => {
    await updateOperator(suggestion.operatorId, {
      assignedObraId: suggestion.suggestedObraId,
    });
  };

  // Dispensar sugestão
  const handleDismissSuggestion = (operatorId) => {
    setDismissedSuggestions(prev => [...prev, operatorId]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="title" className="w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div>
        <Skeleton.Card lines={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Operadores</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão de operadores, cargos e credenciais</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Novo Operador</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} title="Total" value={operators.length} color="primary" />
        <StatCard icon={Activity} title="Ativos" value={operatorStats.filter(op => op.isActive).length} color="emerald" />
        <StatCard icon={CreditCard} title="Com credencial" value={operators.filter(o => o.cardId).length} color="blue" />
        <StatCard icon={Briefcase} title="Encarregados" value={roleStats.encarregado || 0} color="amber" />
        <StatCard icon={Briefcase} title="Técnicos" value={roleStats.tecnico_manutencao || 0} color="emerald" />
        <StatCard icon={Clock} title="Checkouts totais" value={operatorStats.reduce((sum, op) => sum + op.sessionCount, 0)} color="slate" />
      </div>

      {/* Auto-Assign Suggestions */}
      <AutoAssignSuggestionCard
        suggestions={autoAssignSuggestions}
        onAccept={handleAcceptSuggestion}
        onDismiss={handleDismissSuggestion}
      />

      {/* Pending operators from Procore directory */}
      {pendingFromProcore.length > 0 && (
        <Card className="border-2 border-dashed border-[#005EB8]/30 bg-[#005EB8]/5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-[#005EB8]/10 rounded-lg">
              <Link2 className="w-5 h-5 text-[#005EB8]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Operadores do Procore sem credencial
                <Badge variant="primary">{pendingFromProcore.length}</Badge>
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Encontrados no directory do Procore. Associe uma credencial para os activar.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingFromProcore.slice(0, 5).map(u => {
              const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Sem nome';
              const email = u.email_address || u.email || '';
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#005EB8]/10 flex items-center justify-center text-xs font-semibold text-[#005EB8]">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
                      {email && <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#005EB8]/10 text-[#005EB8]">
                      <Link2 className="w-2.5 h-2.5" />
                      Procore
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
                      <CreditCard className="w-2.5 h-2.5" />
                      Sem credencial
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        const name2 = name.split(' ');
                        setEditingOperator(null);
                        setShowModal(true);
                      }}
                    >
                      Activar
                    </Button>
                  </div>
                </div>
              );
            })}
            {pendingFromProcore.length > 5 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                + {pendingFromProcore.length - 5} operadores adicionais no Procore
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-slate-800"
            >
              <option value="all">Todos os Cargos</option>
              {EMPLOYEE_ROLES.map(role => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
            <select
              value={obraFilter}
              onChange={e => setObraFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-slate-800"
            >
              <option value="all">Todas as Obras</option>
              <option value="">Sem Obra</option>
              {obras.filter(o => o.status === 'ACTIVE').map(obra => (
                <option key={obra.id} value={obra.id}>{obra.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      {filteredOperators.length === 0 ? (
        <EmptyState icon={Users} title="Sem operadores" description="Adicione operadores para gerir a sua equipa" actionLabel="Adicionar Operador" onAction={() => setShowModal(true)} />
      ) : (
        <Card padding="none">
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Operador</Table.Header>
                <Table.Header>Cargo</Table.Header>
                <Table.Header>Competências</Table.Header>
                <Table.Header>Obra Atribuída</Table.Header>
                <Table.Header align="right">Checkouts</Table.Header>
                <Table.Header align="right">Tempo fora</Table.Header>
                <Table.Header align="center">Estado</Table.Header>
                <Table.Header align="right">Ações</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredOperators.map(op => (
                <Table.Row key={op.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${op.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600'}`}>
                        {op.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium block truncate">{op.name}</span>
                          {op.procoreUser && (
                            <span
                              title={`Sincronizado com Procore: ${op.procoreUser.name || op.procoreUser.email_address || op.procoreUser.id}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gradient-to-r from-[#005EB8] to-[#0077d4] text-white uppercase tracking-wide shadow-sm"
                            >
                              <Link2 className="w-2.5 h-2.5" />
                              Procore
                            </span>
                          )}
                          {!op.cardId && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              <CreditCard className="w-2.5 h-2.5" />
                              Sem credencial
                            </span>
                          )}
                        </div>
                        {op.email && <span className="text-xs text-slate-500 dark:text-slate-400">{op.email}</span>}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell><RoleBadge roleId={op.role} /></Table.Cell>
                  <Table.Cell>
                    {op.licenses?.length > 0 ? (
                      <div className="flex items-center gap-1" title={op.licenses.map(l => LICENSE_TYPES.find(lt => lt.id === l)?.label).join(', ')}>
                        {op.licenses.slice(0, 3).map(licenseId => {
                          const license = LICENSE_TYPES.find(l => l.id === licenseId);
                          return license ? (
                            <span key={licenseId} className="text-base" title={license.label}>{license.icon}</span>
                          ) : null;
                        })}
                        {op.licenses.length > 3 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">+{op.licenses.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {op.assignedObraName ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-primary-500" />
                        <span>{op.assignedObraName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </Table.Cell>
                  <Table.Cell align="right">{op.sessionCount}</Table.Cell>
                  <Table.Cell align="right"><span className="font-medium">{op.totalHours}h</span></Table.Cell>
                  <Table.Cell align="center">
                    <Badge variant={op.isActive ? 'success' : 'default'} dot={op.isActive}>
                      {op.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" icon={Edit2} onClick={() => handleEdit(op)} />
                      <Button variant="ghost" size="xs" icon={Trash2} onClick={() => handleDelete(op)} />
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}


      {/* Keyframes for RFID provisioning animations */}
      <style>{`
        @keyframes rfidShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes rfidBounceIn {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingOperator ? 'Editar Operador' : 'Novo Operador'} size="lg">
        <OperatorForm
          operator={editingOperator}
          obras={obras}
          onSave={handleSave}
          onCancel={handleCloseModal}
          assignableRoles={assignableRoles}
          canAssignRoles={canAssignRoles}
        />
      </Modal>
    </div>
  );
};

export default OperadoresView;
