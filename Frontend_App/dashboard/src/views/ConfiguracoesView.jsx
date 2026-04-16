import React, { useState, useMemo, useEffect } from 'react';
import {
  Settings, Database, Trash2, RefreshCw, Bell, Shield, Palette,
  Users, Plus, Edit2, Check, X, ChevronRight, Lock, Unlock,
  Eye, EyeOff, Save, AlertTriangle, Layers, Sun, Moon,
  Truck, Building2, Wallet, Leaf, Link2, Cloud, CloudOff, Activity,
  Fuel, Wrench, BarChart3
} from 'lucide-react';
import { createAllMockData } from '../utils/mockData';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { Card, Button, Badge, Modal, Input } from '../components/ui';
import { PERMISSION_CATEGORIES, PERMISSIONS, DEFAULT_ROLES, ROLE_LEVELS, getLevelLabel } from '../config/permissions';
import useThemeStore from '../store/useThemeStore';

// ============================================================
// PROCORE INTEGRATION SECTION — Fase 2 (UI)
// ============================================================
// Painel administrativo para a integração Procore Sandbox. Lê o estado de
// conexão via `/api/procore/status`, permite disparar um sync manual via
// `/api/procore/sync`, e mostra previews das subcoleções sincronizadas
// (`procoreProjects`, `procoreDirectory`, `procoreEquipment`) que já chegam
// pelos listeners em `useStore`.
const ProcoreIntegrationSection = () => {
  const { procoreProjects, procoreDirectory, procoreEquipment } = useStore();
  const [status, setStatus] = React.useState(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [statusError, setStatusError] = React.useState(null);
  const [syncError, setSyncError] = React.useState(null);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/procore/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
      setStatusError(null);
    } catch (err) {
      setStatusError(err.message || 'Falha a obter estado Procore');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/procore/sync', { method: 'POST' });
      if (!res.ok && res.status !== 207) {
        const text = await res.text();
        throw new Error(`Sync falhou: ${text.slice(0, 200)}`);
      }
      await fetchStatus();
    } catch (err) {
      setSyncError(err.message || 'Erro desconhecido no sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar a integração Procore? Será preciso reautorizar para voltar a sincronizar.')) return;
    try {
      await fetch('/api/procore/disconnect', { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      setStatusError(err.message || 'Erro ao desconectar');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '—';
    }
  };

  const connected = !!status?.connected;
  const hasErrors = status?.last_sync_errors && Object.keys(status.last_sync_errors).length > 0;

  return (
    <div className="space-y-6">
      {/* Estado da Conexão */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`p-3 rounded-xl ${connected ? 'bg-gradient-to-br from-[#005EB8] to-[#0077d4]' : 'bg-slate-200 dark:bg-slate-700'}`}>
              {connected ? (
                <Cloud className="w-6 h-6 text-white" />
              ) : (
                <CloudOff className="w-6 h-6 text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-900 dark:text-white">Procore</h3>
                {loadingStatus ? (
                  <Badge variant="default" size="sm">A verificar...</Badge>
                ) : connected ? (
                  <Badge variant={hasErrors ? 'warning' : 'success'} size="sm">
                    {hasErrors ? 'Conectado (com erros)' : 'Conectado'}
                  </Badge>
                ) : (
                  <Badge variant="default" size="sm">Desconectado</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sandbox: <code className="text-xs">sandbox.procore.com</code>
                {status?.company_id && <> · Company ID: <code className="text-xs">{status.company_id}</code></>}
              </p>
              {statusError && (
                <p className="text-xs text-red-600 mt-1">Erro de estado: {statusError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <Button
                  size="sm"
                  icon={RefreshCw}
                  onClick={handleSync}
                  loading={syncing}
                  disabled={syncing}
                >
                  {syncing ? 'A sincronizar...' : 'Sincronizar agora'}
                </Button>
                <Button size="sm" variant="ghost" icon={X} onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </>
            ) : (
              <a
                href="/api/procore/authorize"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[#005EB8] to-[#0077d4] hover:from-[#004a94] hover:to-[#0066b8] shadow-sm"
              >
                <Link2 className="w-4 h-4" />
                Conectar Procore
              </a>
            )}
          </div>
        </div>

        {connected && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">Último sync</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1">{formatDate(status?.last_sync_at)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">Duração</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1">
                {status?.last_sync_duration_ms ? `${Math.round(status.last_sync_duration_ms)}ms` : '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">Token expira</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1">
                {status?.expires_in_seconds != null
                  ? `${Math.max(0, Math.floor(status.expires_in_seconds / 60))} min`
                  : '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">Conectado desde</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1">{formatDate(status?.connected_at)}</p>
            </div>
          </div>
        )}

        {syncError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {hasErrors && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" /> Erros no último sync
            </p>
            <ul className="ml-6 list-disc text-xs">
              {Object.entries(status.last_sync_errors).map(([k, v]) => (
                <li key={k}><strong>{k}:</strong> {String(v).slice(0, 120)}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Contadores de entidades sincronizadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Projetos Procore</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{procoreProjects.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mirror read-only</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Equipamentos</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{procoreEquipment.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Catálogo Procore</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <Truck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Diretório</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{procoreDirectory.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Utilizadores</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Preview de projetos sincronizados */}
      {procoreProjects.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4" /> Projetos Sincronizados
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Primeiros 5 projetos do mirror Procore</p>
            </div>
          </div>
          <div className="space-y-2">
            {procoreProjects.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {p.name || p.display_name || `Projeto ${p.id}`}
                  </p>
                  {p.project_number && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">#{p.project_number}</p>
                  )}
                </div>
                <Badge variant="default" size="sm">ID {p.id}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// Componente de seção de configuração
const ConfigSection = ({ icon: Icon, title, description, children, action }) => (
  <Card>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-slate-100 rounded-lg">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      {action}
    </div>
    {children}
  </Card>
);

// Componente de role card
const RoleCard = ({ role, onEdit, isCurrentUser, canManage }) => {
  const colorMap = {
    red: 'bg-red-100 text-red-700 border-red-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  const levelColors = {
    [ROLE_LEVELS.ADMIN]: 'bg-red-50 text-red-600',
    [ROLE_LEVELS.GESTOR]: 'bg-blue-50 text-blue-600',
    [ROLE_LEVELS.SUPERVISOR]: 'bg-amber-50 text-amber-600',
    [ROLE_LEVELS.VISUALIZADOR]: 'bg-slate-50 text-slate-600',
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        canManage ? 'cursor-pointer hover:shadow-md' : 'opacity-75'
      } ${
        isCurrentUser ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={() => canManage && onEdit(role)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colorMap[role.color] || colorMap.slate}`}>
            {role.name}
          </span>
          {role.isSystem && (
            <Lock className="w-3.5 h-3.5 text-slate-400" title="Perfil de sistema" />
          )}
        </div>
        {isCurrentUser && (
          <Badge variant="primary" size="sm">Atual</Badge>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">{role.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded ${levelColors[role.level] || levelColors[ROLE_LEVELS.VISUALIZADOR]}`}>
            {getLevelLabel(role.level)}
          </span>
          <span className="text-xs text-slate-400">
            {role.permissions?.length || 0} permissões
          </span>
        </div>
        {canManage ? (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        ) : (
          <Lock className="w-4 h-4 text-slate-300" title="Não pode editar" />
        )}
      </div>
    </div>
  );
};

// Modal de edição de perfil
const RoleEditModal = ({ role, onSave, onClose, onDelete, availableLevels, userLevel }) => {
  const [formData, setFormData] = useState({
    id: role?.id || '',
    name: role?.name || '',
    description: role?.description || '',
    color: role?.color || 'blue',
    level: role?.level ?? (availableLevels[0]?.level || ROLE_LEVELS.VISUALIZADOR),
    permissions: role?.permissions || [],
  });
  const [expandedCategory, setExpandedCategory] = useState(null);

  const isNew = !role?.id;
  const isSystem = role?.isSystem && DEFAULT_ROLES[role.id];

  const handleTogglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleToggleCategory = (categoryKey) => {
    const category = PERMISSION_CATEGORIES[categoryKey];
    const categoryPermissions = category.permissions.map(p => p.id);
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p));

    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const colors = [
    { id: 'red', label: 'Vermelho' },
    { id: 'blue', label: 'Azul' },
    { id: 'emerald', label: 'Esmeralda' },
    { id: 'green', label: 'Verde' },
    { id: 'amber', label: 'Âmbar' },
    { id: 'purple', label: 'Roxo' },
    { id: 'slate', label: 'Cinza' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info básica */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nome do Perfil</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Ex: Gestor Regional"
            required
            disabled={isSystem}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Cor</label>
          <select
            value={formData.color}
            onChange={e => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
          >
            {colors.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Nível Hierárquico - só para novos perfis ou customizados */}
      {!isSystem && availableLevels && availableLevels.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Nível Hierárquico
            </div>
          </label>
          <select
            value={formData.level}
            onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
          >
            {availableLevels.map(lvl => (
              <option key={lvl.level} value={lvl.level}>{getLevelLabel(lvl.level)}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Só pode criar perfis de nível inferior ao seu ({getLevelLabel(userLevel)})
          </p>
        </div>
      )}

      {/* Mostrar nível atual se for perfil de sistema */}
      {isSystem && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Layers className="w-4 h-4" />
            <span>Nível: <strong>{getLevelLabel(role?.level)}</strong></span>
            <span className="text-slate-400">|</span>
            <Lock className="w-3.5 h-3.5" />
            <span className="text-slate-500 dark:text-slate-400">Perfil de sistema (não pode alterar nível)</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Descrição</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Descreva as responsabilidades deste perfil..."
          rows={2}
        />
      </div>

      {/* Permissões */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Permissões</label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formData.permissions.length} selecionadas
          </span>
        </div>

        <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
          {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
            const categoryPermissions = category.permissions.map(p => p.id);
            const selectedCount = categoryPermissions.filter(p => formData.permissions.includes(p)).length;
            const allSelected = selectedCount === categoryPermissions.length;
            const someSelected = selectedCount > 0 && selectedCount < categoryPermissions.length;

            return (
              <div key={key} className="border-b border-slate-100 last:border-0">
                <button
                  type="button"
                  onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={(e) => { e.stopPropagation(); handleToggleCategory(key); }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                        allSelected ? 'bg-primary-500 border-primary-500' :
                        someSelected ? 'bg-primary-200 border-primary-500' :
                        'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                      {someSelected && <div className="w-2 h-0.5 bg-primary-500" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{category.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{selectedCount}/{categoryPermissions.length}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedCategory === key ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {expandedCategory === key && (
                  <div className="px-3 pb-3 space-y-1">
                    {category.permissions.map(permission => (
                      <label
                        key={permission.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => handleTogglePermission(permission.id)}
                          className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/20"
                        />
                        <span className="text-sm text-slate-600">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {!isNew && !isSystem && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => onDelete(role.id)}
            >
              Eliminar
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" icon={Save}>
            {isNew ? 'Criar Perfil' : 'Guardar'}
          </Button>
        </div>
      </div>
    </form>
  );
};

// Componente de aparência com Dark Mode
const AppearanceSection = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <ConfigSection icon={Palette} title="Aparência" description="Personalizar interface do sistema">
      <div className="space-y-3">


        {/* Preview do tema */}
        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Pré-visualização</p>
          <div className="flex gap-4">
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={`flex-1 p-4 rounded-xl text-center transition-all duration-300 ${
                !isDark
                  ? 'bg-white border-2 border-primary-500 shadow-md transform scale-[1.02]'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center ${!isDark ? 'bg-amber-100 text-amber-600' : 'bg-slate-800'}`}>
                <Sun className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">Claro</p>
              {!isDark && <Badge variant="primary" className="mt-2" size="sm">Ativo</Badge>}
            </button>
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={`flex-1 p-4 rounded-xl text-center transition-all duration-300 ${
                isDark
                  ? 'bg-slate-900 border-2 border-primary-500 shadow-md transform scale-[1.02]'
                  : 'bg-slate-100 border border-slate-200 text-slate-400 hover:bg-slate-200'
              }`}
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-white'}`}>
                <Moon className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">Escuro</p>
              {isDark && <Badge variant="primary" className="mt-2" size="sm">Ativo</Badge>}
            </button>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
};

// ============================================================
// OPERATIONAL SETTINGS SECTION — Parâmetros de Operação
// ============================================================
const OperationalSettingsSection = () => {
  const { systemSettings, updateSystemSettings } = useStore();
  const [form, setForm] = useState({
    fuelPricePerLitre: '',
    co2FactorPerLitre: '',
    defaultMaintenanceInterval: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      fuelPricePerLitre: String(systemSettings.fuelPricePerLitre ?? ''),
      co2FactorPerLitre: String(systemSettings.co2FactorPerLitre ?? ''),
      defaultMaintenanceInterval: String(systemSettings.defaultMaintenanceInterval ?? ''),
    });
  }, [systemSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSystemSettings({
        fuelPricePerLitre: parseFloat(form.fuelPricePerLitre) || 1.89,
        co2FactorPerLitre: parseFloat(form.co2FactorPerLitre) || 2.68,
        defaultMaintenanceInterval: parseInt(form.defaultMaintenanceInterval, 10) || 150,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    String(systemSettings.fuelPricePerLitre) !== form.fuelPricePerLitre ||
    String(systemSettings.co2FactorPerLitre) !== form.co2FactorPerLitre ||
    String(systemSettings.defaultMaintenanceInterval) !== form.defaultMaintenanceInterval;

  return (
    <ConfigSection
      icon={BarChart3}
      title="Parâmetros de Operação"
      description="Valores globais usados nos cálculos de custo, emissões e manutenção. Máquinas individuais podem ter overrides."
      action={
        <Button
          size="sm"
          icon={saved ? Check : Save}
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges}
          variant={saved ? 'ghost' : 'primary'}
        >
          {saved ? 'Guardado' : 'Guardar'}
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Fuel className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Preço Diesel</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">€/litro</p>
            </div>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.fuelPricePerLitre}
            onChange={e => setForm({ ...form, fuelPricePerLitre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Fator CO₂</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">kg CO₂/litro diesel</p>
            </div>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.co2FactorPerLitre}
            onChange={e => setForm({ ...form, co2FactorPerLitre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Intervalo Manutenção</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Horas por defeito</p>
            </div>
          </div>
          <input
            type="number"
            step="1"
            min="1"
            value={form.defaultMaintenanceInterval}
            onChange={e => setForm({ ...form, defaultMaintenanceInterval: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
        Estes valores servem de base global. Para personalizar por máquina, edite a ficha individual em Equipamentos.
      </p>
    </ConfigSection>
  );
};

// View principal
const ConfiguracoesView = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const {
    currentUser,
    getAllRoles,
    addCustomRole,
    updateRole,
    deleteRole,
    can,
    getUserLevel,
    canManageRole: checkCanManageRole,
    getAvailableLevelsForCreation,
    canCreateCustomRoles,
    getVisibleRoles,
  } = useAuthStore();

  const canManageRoles = can(PERMISSIONS.SETTINGS_ROLES);
  const userLevel = getUserLevel();
  const availableLevels = getAvailableLevelsForCreation();
  const canCreateRoles = canCreateCustomRoles();

  const allRoles = useMemo(() => getAllRoles(), [getAllRoles]);
  const visibleRoles = useMemo(() => getVisibleRoles(), [getVisibleRoles]);

  const tabs = [
    { id: 'general', label: 'Geral', icon: Settings },
    { id: 'roles', label: 'Perfis de Acesso', icon: Shield },
    { id: 'integrations', label: 'Integrações', icon: Link2 },
    { id: 'demo', label: 'Modo Demo', icon: Users },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'database', label: 'Base de Dados', icon: Database },
  ];

  const handleCreateMockData = async () => {
    setLoading(true);
    try {
      const result = await createAllMockData();
      setMessage({ type: 'success', text: `Dados criados: ${result.machines} máquinas, ${result.operators} operadores, ${result.sessions} sessões` });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao criar dados mock' });
    }
    setLoading(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleClearData = async () => {
    if (!confirm('Eliminar TODOS os dados? Esta ação não pode ser revertida.')) return;
    setLoading(true);
    try {
      const basePath = `artifacts/${projectId}/public/data`;
      const collections = ['machines', 'operators', 'sessions', 'tariffs', 'maintenance', 'obras'];
      for (const col of collections) {
        const snapshot = await getDocs(collection(db, `${basePath}/${col}`));
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, `${basePath}/${col}`, d.id))));
      }
      setMessage({ type: 'success', text: 'Todos os dados foram eliminados' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao eliminar dados' });
    }
    setLoading(false);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleSaveRole = (roleData) => {
    if (editingRole) {
      updateRole(editingRole.id, roleData);
    } else {
      const newId = roleData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      addCustomRole({
        ...roleData,
        id: newId,
        level: roleData.level ?? ROLE_LEVELS.VISUALIZADOR,
        canCreateRolesBelow: false, // Perfis customizados não criam outros perfis por default
      });
    }
    setShowRoleModal(false);
    setEditingRole(null);
    setMessage({ type: 'success', text: editingRole ? 'Perfil atualizado' : 'Perfil criado' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteRole = (roleId) => {
    if (!confirm('Eliminar este perfil?')) return;
    if (deleteRole(roleId)) {
      setShowRoleModal(false);
      setEditingRole(null);
      setMessage({ type: 'success', text: 'Perfil eliminado' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'roles':
        return (
          <div className="space-y-6">
            {/* Legenda de hierarquia */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Níveis Hierárquicos:</span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 text-xs rounded bg-red-50 text-red-600">Administração</span>
                <span className="text-slate-400">&gt;</span>
                <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-600">Gestão</span>
                <span className="text-slate-400">&gt;</span>
                <span className="px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-600">Supervisão</span>
                <span className="text-slate-400">&gt;</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-50 text-slate-600">Operação</span>
              </div>
            </div>

            <ConfigSection
              icon={Shield}
              title="Perfis de Acesso"
              description={canCreateRoles
                ? `Pode criar perfis de nível: ${availableLevels.map(l => getLevelLabel(l.level)).join(', ')}`
                : 'Visualização de perfis do sistema'
              }
              action={
                canManageRoles && canCreateRoles && (
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() => { setEditingRole(null); setShowRoleModal(true); }}
                  >
                    Novo Perfil
                  </Button>
                )
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleRoles.map(role => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onEdit={handleEditRole}
                    isCurrentUser={currentUser?.systemRole === role.id}
                    canManage={checkCanManageRole(role.id) || currentUser?.systemRole === 'admin'}
                  />
                ))}
              </div>
            </ConfigSection>

            {!canManageRoles && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-700">
                  Não tem permissões para gerir perfis. Contacte um administrador.
                </p>
              </div>
            )}

            {canManageRoles && !canCreateRoles && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-700">
                  O seu perfil pode ver e editar permissões, mas não criar novos perfis.
                  Apenas perfis com gestão de pessoas podem criar sub-perfis.
                </p>
              </div>
            )}
          </div>
        );

      case 'demo':
        return (
          <ConfigSection
            icon={Users}
            title="Modo Demonstração"
            description="Alternar entre perfis de utilizador para testar permissões"
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                Selecione um perfil para testar as permissões e visualizações correspondentes.
                Esta funcionalidade é apenas para demonstração e testes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Admin */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_admin',
                      name: 'Vitor Hugo (Admin)',
                      email: 'admin@casais.pt',
                      systemRole: 'admin',
                      assignedObraId: null,
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Administrador' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'admin'
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Administrador</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Acesso total ao sistema</p>
                  </div>
                  {currentUser?.systemRole === 'admin' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* Gestor Frota */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_gestor_frota',
                      name: 'João Silva (Gestor)',
                      email: 'gestor.frota@casais.pt',
                      systemRole: 'gestor_frota',
                      assignedObraId: null,
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Gestor de Frota' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'gestor_frota'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Gestor de Frota</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gestão de equipamentos e obras</p>
                  </div>
                  {currentUser?.systemRole === 'gestor_frota' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* Gestor Financeiro */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_gestor_financeiro',
                      name: 'Maria Santos (Financeiro)',
                      email: 'financeiro@casais.pt',
                      systemRole: 'gestor_financeiro',
                      assignedObraId: null,
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Gestor Financeiro' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'gestor_financeiro'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Gestor Financeiro</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Custos, tarifários e relatórios</p>
                  </div>
                  {currentUser?.systemRole === 'gestor_financeiro' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* Encarregado de Obra */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_encarregado',
                      name: 'António Costa (Encarregado)',
                      email: 'encarregado@casais.pt',
                      systemRole: 'encarregado_obra',
                      assignedObraId: 'obra_porto_2025',
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Encarregado de Obra' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'encarregado_obra'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Encarregado de Obra</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Restrito à sua obra</p>
                  </div>
                  {currentUser?.systemRole === 'encarregado_obra' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* Visualizador */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_visualizador',
                      name: 'Pedro Ferreira (Visualizador)',
                      email: 'visualizador@casais.pt',
                      systemRole: 'visualizador',
                      assignedObraId: 'obra_porto_2025',
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Visualizador' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'visualizador'
                      ? 'border-slate-500 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Visualizador</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Apenas leitura</p>
                  </div>
                  {currentUser?.systemRole === 'visualizador' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* Gestor Sustentabilidade */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_gestor_sustentabilidade',
                      name: 'Ana Pereira (ESG)',
                      email: 'esg@casais.pt',
                      systemRole: 'gestor_sustentabilidade',
                      assignedObraId: null,
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Gestor de Sustentabilidade' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'gestor_sustentabilidade'
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-green-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Gestor Sustentabilidade</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Emissões e relatórios ESG</p>
                  </div>
                  {currentUser?.systemRole === 'gestor_sustentabilidade' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* IT / Sistemas */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_it',
                      name: 'Carlos Oliveira (IT)',
                      email: 'it@casais.pt',
                      systemRole: 'it',
                      assignedObraId: null,
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para IT / Sistemas' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'it'
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 hover:border-cyan-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">IT / Sistemas</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Acesso total e integrações</p>
                  </div>
                  {currentUser?.systemRole === 'it' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* Técnico de Manutenção */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_manutencao',
                      name: 'Rui Silva (Manutenção)',
                      email: 'manutencao@casais.pt',
                      systemRole: 'tecnico_manutencao',
                      assignedObraId: null,
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Técnico de Manutenção' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'tecnico_manutencao'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Técnico Manutenção</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Saúde e avarias dos equipamentos</p>
                  </div>
                  {currentUser?.systemRole === 'tecnico_manutencao' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>

                {/* Operador de Campo */}
                <button
                  onClick={() => {
                    useAuthStore.getState().setCurrentUser({
                      id: 'demo_operador',
                      name: 'Manuel Dias (Operador)',
                      email: 'operador@casais.pt',
                      systemRole: 'operador',
                      assignedObraId: 'obra_porto_2025',
                      cardId: 'OP_TEST_001',
                    });
                    setMessage({ type: 'success', text: 'Perfil alterado para Operador de Campo' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    currentUser?.systemRole === 'operador'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Operador de Campo</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mobile Hub e reporte de avarias</p>
                  </div>
                  {currentUser?.systemRole === 'operador' && (
                    <Badge variant="success" className="ml-auto">Ativo</Badge>
                  )}
                </button>
              </div>

              {/* Info sobre perfil atual */}
              <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-primary-600" />
                  <h4 className="font-semibold text-primary-900">Perfil Atual</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-primary-600">Nome:</span>
                    <span className="ml-2 text-primary-900 font-medium">{currentUser?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">Perfil:</span>
                    <span className="ml-2 text-primary-900 font-medium">{allRoles[currentUser?.systemRole]?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">Nível:</span>
                    <span className="ml-2 text-primary-900 font-medium">{getLevelLabel(userLevel)}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">Obra:</span>
                    <span className="ml-2 text-primary-900 font-medium">{currentUser?.assignedObraId || 'Todas'}</span>
                  </div>
                </div>
              </div>
            </div>
          </ConfigSection>
        );

      case 'notifications':
        return (
          <ConfigSection icon={Bell} title="Notificações" description="Configurar alertas e notificações">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Alertas de Manutenção</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Notificar quando máquina atinge 80% do limite de horas</p>
                </div>
                <Badge variant="success">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Anomalias de Duração</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Notificar quando uma sessão excede um limite de tempo sem fecho</p>
                </div>
                <Badge variant="success">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Auto-Fecho de Sessões</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fechar sessões automaticamente após 14 horas</p>
                </div>
                <Badge variant="success">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Notificações por Email</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enviar resumo diário por email</p>
                </div>
                <Badge variant="default">Inativo</Badge>
              </div>
            </div>
          </ConfigSection>
        );

      case 'integrations':
        return <ProcoreIntegrationSection />;

      case 'appearance':
        return (
          <AppearanceSection />
        );

      case 'database':
        return (
          <ConfigSection icon={Database} title="Base de Dados" description="Gestão de dados do sistema">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Criar Dados Demo</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Criar dados de exemplo para testes</p>
                </div>
                <Button size="sm" icon={RefreshCw} onClick={handleCreateMockData} loading={loading}>
                  Criar
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-700">Limpar Base de Dados</p>
                  <p className="text-xs text-red-600">Eliminar todos os dados do sistema</p>
                </div>
                <Button variant="danger" size="sm" icon={Trash2} onClick={handleClearData} loading={loading}>
                  Limpar
                </Button>
              </div>
            </div>
          </ConfigSection>
        );

      default: // general
        return (
          <div className="space-y-6">
            <OperationalSettingsSection />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConfigSection icon={Settings} title="Limites de Sessão" description="Thresholds para alertas automáticos">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Anomalia de Duração</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Horas contínuas para disparar alerta</p>
                    </div>
                    <Badge>5h</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Auto-Fecho Sessão</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Fechar sessão automaticamente</p>
                    </div>
                    <Badge>14h</Badge>
                  </div>
                </div>
              </ConfigSection>

              <ConfigSection icon={Users} title="Utilizador Atual" description="Informações da sua conta">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Nome</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Email</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Perfil</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{allRoles[currentUser?.systemRole]?.name || '-'}</p>
                    </div>
                    <Badge variant="primary">{currentUser?.systemRole}</Badge>
                  </div>
                </div>
              </ConfigSection>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h2>
        <p className="text-slate-500 mt-1">Gerir configurações e permissões do sistema</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {renderTabContent()}


      {/* Role Edit Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => { setShowRoleModal(false); setEditingRole(null); }}
        title={editingRole ? `Editar Perfil: ${editingRole.name}` : 'Novo Perfil'}
        size="lg"
      >
        <RoleEditModal
          role={editingRole}
          onSave={handleSaveRole}
          onClose={() => { setShowRoleModal(false); setEditingRole(null); }}
          onDelete={handleDeleteRole}
          availableLevels={availableLevels}
          userLevel={userLevel}
        />
      </Modal>
    </div>
  );
};

export default ConfiguracoesView;
