import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  Truck,
  Search,
  Filter,
  Plus,
  Edit,
  MapPin,
  Building2,
  List,
} from 'lucide-react';

const MaquinasView = ({ activeView }) => {
  const getInitialTab = () => {
    if (activeView === 'maquinas-categorias') return 'categorias';
    if (activeView === 'maquinas-localizacoes') return 'localizacoes';
    return 'lista';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab());
  
  useEffect(() => {
    const tab = getInitialTab();
    setActiveTab(tab);
  }, [activeView]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const basePath = `artifacts/${projectId}/public/data`;
    const unsubscribe = onSnapshot(
      collection(db, `${basePath}/machines`),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMachines(data);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar máquinas:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredMachines = useMemo(() => {
    if (!searchTerm) return machines;
    return machines.filter(
      (machine) =>
        machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [machines, searchTerm]);

  const categories = useMemo(() => {
    const cats = machines
      .map((m) => m.category)
      .filter(Boolean)
      .reduce((acc, cat) => {
        const key = cat.id || cat.name;
        if (!acc.find((c) => (c.id || c.name) === key)) {
          acc.push(cat);
        }
        return acc;
      }, []);
    return cats;
  }, [machines]);

  // Extrair localizações únicas
  const locations = useMemo(() => {
    const locs = machines
      .map((m) => m.location)
      .filter(Boolean)
      .reduce((acc, loc) => {
        const key = loc.workId || loc.workName;
        if (!acc.find((l) => (l.workId || l.workName) === key)) {
          acc.push(loc);
        }
        return acc;
      }, []);
    return locs;
  }, [machines]);

  // Agrupar máquinas por categoria
  const machinesByCategory = useMemo(() => {
    const grouped = {};
    filteredMachines.forEach((machine) => {
      const catKey = machine.category?.id || machine.category?.name || 'Sem categoria';
      if (!grouped[catKey]) {
        grouped[catKey] = {
          category: machine.category || { name: 'Sem categoria' },
          machines: [],
        };
      }
      grouped[catKey].machines.push(machine);
    });
    return grouped;
  }, [filteredMachines]);

  // Agrupar máquinas por localização
  const machinesByLocation = useMemo(() => {
    const grouped = {};
    filteredMachines.forEach((machine) => {
      const locKey = machine.location?.workId || machine.location?.workName || 'Sem localização';
      if (!grouped[locKey]) {
        grouped[locKey] = {
          location: machine.location || { workName: 'Sem localização' },
          machines: [],
        };
      }
      grouped[locKey].machines.push(machine);
    });
    return grouped;
  }, [filteredMachines]);

  const tabs = [
    {
      id: 'lista',
      label: 'Lista',
      icon: List,
      count: filteredMachines.length,
    },
    {
      id: 'categorias',
      label: 'Categorias',
      icon: Building2,
      count: categories.length,
    },
    {
      id: 'localizacoes',
      label: 'Localizações',
      icon: MapPin,
      count: locations.length,
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-slate-600 mt-2">A carregar máquinas...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'lista':
        if (filteredMachines.length === 0) {
          return (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma máquina encontrada</p>
              <Button className="mt-4" variant="secondary" icon={Plus}>
                Adicionar Primeira Máquina
              </Button>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines.map((machine) => (
              <Card key={machine.id} variant="elevated" className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Truck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{machine.name || machine.id}</h3>
                      <p className="text-sm text-slate-600">
                        {machine.category?.name || 'Sem categoria'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Localização:</span>
                    <span className="font-medium text-slate-900">
                      {machine.location?.workName || 'Não definida'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Horas Totais:</span>
                    <span className="font-medium text-slate-900">
                      {(machine.totalHours || 0).toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        machine.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {machine.status === 'ACTIVE' ? 'Ativa' : 'Parada'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Button variant="secondary" size="sm" className="w-full">
                    Ver Detalhes
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'categorias':
        if (Object.keys(machinesByCategory).length === 0) {
          return (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma categoria encontrada</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {Object.entries(machinesByCategory).map(([key, group]) => (
              <Card key={key} variant="elevated">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {group.category.name || 'Sem categoria'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {group.machines.length} máquina{group.machines.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.machines.map((machine) => (
                    <div
                      key={machine.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary-300 transition-colors"
                    >
                      <p className="font-medium text-slate-900">{machine.name || machine.id}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {machine.location?.workName || 'Sem localização'}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        );

      case 'localizacoes':
        if (Object.keys(machinesByLocation).length === 0) {
          return (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma localização encontrada</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {Object.entries(machinesByLocation).map(([key, group]) => (
              <Card key={key} variant="elevated">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {group.location.workName || 'Sem localização'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {group.machines.length} máquina{group.machines.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.machines.map((machine) => (
                    <div
                      key={machine.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary-300 transition-colors"
                    >
                      <p className="font-medium text-slate-900">{machine.name || machine.id}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {machine.category?.name || 'Sem categoria'}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Máquinas</h1>
          <p className="text-slate-600 mt-1">Gestão completa da frota de equipamentos</p>
        </div>
        <Button icon={Plus}>Adicionar Máquina</Button>
      </div>

      {/* Pesquisa */}
      <Card>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar máquinas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <Button variant="secondary" icon={Filter}>
            Filtros Avançados
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Card variant="elevated" className="overflow-hidden">
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50/50 px-2 pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all duration-200 rounded-t-lg relative ${
                  isActive
                    ? 'bg-white text-primary-600 shadow-sm border-t-2 border-x border-primary-500 -mt-px'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                <span className="font-semibold">{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="p-6">{renderContent()}</div>
      </Card>
    </div>
  );
};

export default MaquinasView;
