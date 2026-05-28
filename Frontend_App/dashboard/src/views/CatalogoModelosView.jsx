import React, { useState, useMemo } from 'react';
import {
  Package, Plus, Search, X, Edit2, Trash2, Wrench,
} from 'lucide-react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';

export default function CatalogoModelosView() {
  const {
    equipmentModels = [],
    tools = [],
    addEquipmentModel,
    updateEquipmentModel,
    deleteEquipmentModel,
    uploadModelPhoto,
    slugify,
  } = useStore();
  const { currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [editingModel, setEditingModel] = useState(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'gestor';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = equipmentModels;
    if (q) {
      list = list.filter(m =>
        m.displayName?.toLowerCase().includes(q) ||
        m.brand?.toLowerCase().includes(q) ||
        m.modelCode?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [equipmentModels, search]);

  const unitsByModel = useMemo(() => {
    const map = new Map();
    tools.forEach(t => {
      const arr = map.get(t.modelId) || [];
      arr.push(t);
      map.set(t.modelId, arr);
    });
    return map;
  }, [tools]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Sem permissão. Apenas admin/gestor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Catálogo de Modelos</h1>
            <p className="text-sm text-slate-500">{equipmentModels.length} modelos cadastrados</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> Novo Modelo
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar modelo, marca, categoria..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl"
        />
      </div>

      {/* Lista de modelos */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Sem modelos cadastrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(model => {
            const units = unitsByModel.get(model.id) || [];
            return (
              <div key={model.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="aspect-[16/10] bg-slate-100 relative">
                  {model.photoUrl ? (
                    <img src={model.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Wrench className="w-12 h-12 text-slate-300" /></div>
                  )}
                  {model.brand && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur text-xs font-bold text-slate-700 rounded">
                      {model.brand}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold">{model.category || '—'}</p>
                  <h3 className="font-bold text-slate-900 mt-1 truncate">{model.displayName}</h3>
                  {model.modelCode && <p className="text-xs text-slate-500">{model.modelCode}</p>}
                  <p className="text-sm text-slate-600 mt-2">{units.length} {units.length === 1 ? 'unidade' : 'unidades'}</p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditingModel(model)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Eliminar modelo "${model.displayName}"? Esta acção só funciona se não houver unidades a usá-lo.`)) return;
                        try {
                          await deleteEquipmentModel(model.id);
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                      disabled={units.length > 0}
                      title={units.length > 0 ? `${units.length} unidade(s) impedem a eliminação` : 'Eliminar modelo'}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal create/edit */}
      {(creating || editingModel) && (
        <ModelFormModal
          model={editingModel}
          onClose={() => { setCreating(false); setEditingModel(null); }}
          onSave={async (data, photoFile) => {
            try {
              if (editingModel) {
                await updateEquipmentModel(editingModel.id, data);
                if (photoFile) await uploadModelPhoto(editingModel.id, photoFile);
              } else {
                const id = slugify(`${data.brand}-${data.modelCode}`);
                await addEquipmentModel({ ...data, id });
                if (photoFile) await uploadModelPhoto(id, photoFile);
              }
              setCreating(false);
              setEditingModel(null);
            } catch (err) {
              alert(err.message);
            }
          }}
        />
      )}
    </div>
  );
}

function ModelFormModal({ model, onClose, onSave }) {
  const [brand, setBrand] = useState(model?.brand || '');
  const [modelCode, setModelCode] = useState(model?.modelCode || '');
  const [displayName, setDisplayName] = useState(model?.displayName || '');
  const [category, setCategory] = useState(model?.category || '');
  const [photoUrl, setPhotoUrl] = useState(model?.photoUrl || '');
  const [defaultReplacementCost, setDefaultReplacementCost] = useState(model?.defaultReplacementCost || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!brand || !modelCode || !displayName || !category) {
      alert('Preencha marca, código, nome e categoria.');
      return;
    }
    setSaving(true);
    await onSave({
      brand,
      modelCode,
      displayName,
      category,
      photoUrl: photoUrl || null,
      defaultReplacementCost: defaultReplacementCost ? Number(defaultReplacementCost) : null,
    }, photoFile);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-4 border-b">
          <h2 className="font-bold text-slate-900">{model ? 'Editar Modelo' : 'Novo Modelo'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-4 space-y-3">
          <FormField label="Marca *" value={brand} onChange={setBrand} placeholder="Bosch" />
          <FormField label="Código do Modelo *" value={modelCode} onChange={setModelCode} placeholder="GSH 16-30" />
          <FormField label="Nome Completo *" value={displayName} onChange={setDisplayName} placeholder="Martelo Pneumático Bosch GSH 16-30" />
          <FormField label="Categoria *" value={category} onChange={setCategory} placeholder="Martelo Pneumático" />
          <FormField label="Valor de Substituição (€)" value={defaultReplacementCost} onChange={setDefaultReplacementCost} type="number" placeholder="1000" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Foto Cover (URL ou upload)</label>
            <input
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="https://... (ou upload abaixo)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            <input
              type="file"
              accept="image/*"
              onChange={e => setPhotoFile(e.target.files?.[0] || null)}
              className="mt-2 text-sm"
            />
            {photoFile && <p className="text-xs text-slate-500 mt-1">Será carregada após criar/guardar.</p>}
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
      />
    </div>
  );
}
