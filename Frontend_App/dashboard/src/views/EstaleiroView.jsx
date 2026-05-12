import React, { useState, useMemo } from 'react';
import {
  Warehouse, PackageCheck, Wrench, AlertTriangle, Search,
  MoreVertical, ArrowRightLeft, CheckSquare, Square, X,
  ChevronDown, ChevronUp, Truck, Clock, Fuel,
} from 'lucide-react';
import useStore from '../store/useStore';
import { parseFirestoreTimestamp } from '../utils/dateUtils';
import { Card, Button, Modal, Select, EmptyState } from '../components/ui';
import { getCategoryName } from '../utils/safeRender';
import { formatHours } from '../utils/formatters';

// ── helpers ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  IDLE:        { label: 'Disponível',  dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ACTIVE:      { label: 'Em Serviço',  dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  MAINTENANCE: { label: 'Manutenção',  dot: 'bg-slate-400',   chip: 'bg-slate-100 text-slate-700 border-slate-200' },
  AVARIA:      { label: 'Avaria',      dot: 'bg-red-500',     chip: 'bg-red-50 text-red-700 border-red-200' },
};

const StatusChip = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

function timeInYard(machine) {
  const ts = machine.location?.lastUpdated;
  if (!ts) return '—';
  const date = parseFirestoreTimestamp(ts);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffDays >= 1) return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffHours >= 1) return `${diffHours}h`;
  return '< 1h';
}

// ── EstaleiroView ─────────────────────────────────────────────────────
export default function EstaleiroView() {
  const { machines, obras, updateMachine, moveMachinesToObra, setActiveView } = useStore();

  const estMachines = useMemo(
    () => machines.filter(m => m.obraId === 'estaleiro' || (!m.obraId && !m.location)),
    [machines]
  );

  const realObras = useMemo(
    () => (obras || []).filter(o => !o.isVirtual && o.id !== 'estaleiro'),
    [obras]
  );

  const stats = useMemo(() => ({
    total:       estMachines.length,
    disponiveis: estMachines.filter(m => m.status === 'IDLE').length,
    manutencao:  estMachines.filter(m => m.status === 'MAINTENANCE').length,
    avaria:      estMachines.filter(m => m.status === 'AVARIA').length,
  }), [estMachines]);

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField]       = useState('timeDesc');
  const [selectedIds, setSelectedIds]   = useState([]);
  const [openMenu, setOpenMenu]         = useState(null);
  const [showMover, setShowMover]       = useState(false);
  const [moverObraId, setMoverObraId]   = useState('');
  const [saving, setSaving]             = useState(false);

  const filtered = useMemo(() => {
    let list = estMachines;
    if (search) list = list.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.id?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter);
    if (sortField === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortField === 'hours') list = [...list].sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));
    return list;
  }, [estMachines, search, statusFilter, sortField]);

  const allSelected = filtered.length > 0 && filtered.every(m => selectedIds.includes(m.id));
  const toggleAll   = () => setAllSelected(allSelected ? [] : filtered.map(m => m.id));
  function setAllSelected(ids) { setSelectedIds(ids); }
  const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleMoverConfirm = async () => {
    if (!moverObraId || selectedIds.length === 0) return;
    setSaving(true);
    await moveMachinesToObra(selectedIds, moverObraId);
    setSaving(false);
    setShowMover(false);
    setSelectedIds([]);
    setMoverObraId('');
  };

  const handleStatusChange = async (machineId, newStatus) => {
    await updateMachine(machineId, { status: newStatus });
    setOpenMenu(null);
  };

  const handleBulkStatus = async (newStatus) => {
    await Promise.all(selectedIds.map(id => updateMachine(id, { status: newStatus })));
    setSelectedIds([]);
  };

  const STATUS_PILLS = [
    { key: 'all',         label: 'Todas' },
    { key: 'IDLE',        label: 'Disponíveis' },
    { key: 'MAINTENANCE', label: 'Manutenção' },
    { key: 'AVARIA',      label: 'Avaria' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <Warehouse className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Estaleiro</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Parque central · equipamentos não alocados a obra activa</p>
          </div>
        </div>
        {selectedIds.length > 0 && (
          <Button variant="primary" onClick={() => setShowMover(true)} icon={ArrowRightLeft}>
            Mover {selectedIds.length} para obra…
          </Button>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Warehouse className="w-5 h-5 text-amber-600" />}
          bg="bg-amber-50"
          label="No Estaleiro"
          value={stats.total}
          sub="equipamentos"
        />
        <StatCard
          icon={<PackageCheck className="w-5 h-5 text-emerald-600" />}
          bg="bg-emerald-50"
          label="Disponíveis"
          value={stats.disponiveis}
          sub="prontos a deploy"
        />
        <StatCard
          icon={<Wrench className="w-5 h-5 text-slate-500" />}
          bg="bg-slate-100"
          label="Manutenção"
          value={stats.manutencao}
          sub="em intervenção"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          bg="bg-red-50"
          label="Avaria"
          value={stats.avaria}
          sub="bloqueadas"
        />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar equipamento…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {STATUS_PILLS.map(pill => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === pill.key
                  ? 'bg-white dark:bg-slate-700 text-amber-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <select
          value={sortField}
          onChange={e => setSortField(e.target.value)}
          className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="timeDesc">Tempo no estaleiro ↓</option>
          <option value="name">Nome A→Z</option>
          <option value="hours">Horas totais ↓</option>
        </select>
      </div>

      {/* ── Bulk action bar ──────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-amber-800">{selectedIds.length} selecionados</span>
          <div className="flex-1" />
          <Button size="sm" variant="primary" onClick={() => setShowMover(true)} icon={ArrowRightLeft}>
            Mover para obra
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleBulkStatus('MAINTENANCE')} icon={Wrench}>
            Manutenção
          </Button>
          <button
            onClick={() => setSelectedIds([])}
            className="p-1 text-amber-600 hover:text-amber-900 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Tabela ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={estMachines.length === 0 ? 'Estaleiro vazio' : 'Sem resultados'}
          description={estMachines.length === 0
            ? 'Todos os equipamentos estão alocados a obras activas.'
            : 'Ajuste os filtros de pesquisa.'}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Equipamento</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 hidden lg:table-cell">No estaleiro</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 hidden lg:table-cell">Horas totais</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(machine => {
                const selected = selectedIds.includes(machine.id);
                return (
                  <tr
                    key={machine.id}
                    className={`border-b border-slate-50 dark:border-slate-700/50 transition-colors ${
                      selected ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-amber-50/30 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleOne(machine.id)} className="text-slate-400 hover:text-slate-600">
                        {selected ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{machine.name || 'Sem nome'}</p>
                          <p className="text-xs text-slate-400">{machine.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                      {getCategoryName(machine.category) || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={machine.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                      {timeInYard(machine)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatHours(machine.totalHours)}
                      </div>
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === machine.id ? null : machine.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === machine.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[180px]">
                          <MenuButton
                            icon={ArrowRightLeft}
                            label="Mover para obra…"
                            onClick={() => { setSelectedIds([machine.id]); setOpenMenu(null); setShowMover(true); }}
                          />
                          {machine.status !== 'MAINTENANCE' && (
                            <MenuButton icon={Wrench} label="Marcar manutenção" onClick={() => handleStatusChange(machine.id, 'MAINTENANCE')} />
                          )}
                          {machine.status !== 'AVARIA' && (
                            <MenuButton icon={AlertTriangle} label="Registar avaria" onClick={() => handleStatusChange(machine.id, 'AVARIA')} />
                          )}
                          {(machine.status === 'MAINTENANCE' || machine.status === 'AVARIA') && (
                            <MenuButton icon={PackageCheck} label="Devolver ao serviço" onClick={() => handleStatusChange(machine.id, 'IDLE')} />
                          )}
                          <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                            <MenuButton icon={Clock} label="Ver sessões" onClick={() => { setOpenMenu(null); setActiveView('sessoes-historico'); }} />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700">
            {filtered.length} equipamento{filtered.length !== 1 ? 's' : ''} no estaleiro
            {filtered.length !== estMachines.length && ` (${estMachines.length} total)`}
          </div>
        </div>
      )}

      {/* ── Modal Mover para Obra ─────────────────────────────────── */}
      {showMover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMover(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mover para Obra</h2>
              <button onClick={() => setShowMover(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-500">
              {selectedIds.length} equipamento{selectedIds.length !== 1 ? 's' : ''} será{selectedIds.length !== 1 ? 'ão' : ''} movido{selectedIds.length !== 1 ? 's' : ''} para a obra seleccionada.
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Obra de destino</label>
              {realObras.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Sem obras activas disponíveis.</p>
              ) : (
                <select
                  value={moverObraId}
                  onChange={e => setMoverObraId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar obra…</option>
                  {realObras.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMover(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!moverObraId || saving}
                onClick={handleMoverConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#005EB8] hover:bg-[#004fa0] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> A mover…</>
                ) : (
                  <><ArrowRightLeft className="w-4 h-4" /> Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* fechar menu ao clicar fora */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}

// ── sub-componentes locais ────────────────────────────────────────────
function StatCard({ icon, bg, label, value, sub }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-slate-100 dark:border-slate-700`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/70 dark:bg-slate-800/50 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <Icon className="w-4 h-4 text-slate-400" />
      {label}
    </button>
  );
}
