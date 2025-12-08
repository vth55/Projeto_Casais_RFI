/**
 * ANÁLISES E GRÁFICOS - CASAIS FLEET INTELLIGENCE
 * 
 * Tabs: Visão Geral, Emissões CO₂, Custos e Rentabilidade
 */

import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { BarChart3, TrendingUp, Gauge, DollarSign } from 'lucide-react';

const AnalisesView = ({ activeView }) => {
  // Sincronizar tab com navegação do sidebar
  const getInitialTab = () => {
    if (activeView === 'analises-emissoes') return 'emissoes';
    if (activeView === 'analises-custos') return 'custos';
    return 'geral';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab()); // 'geral', 'emissoes', 'custos'
  
  // Atualizar tab quando navegação mudar
  useEffect(() => {
    const tab = getInitialTab();
    setActiveTab(tab);
  }, [activeView]);

  const tabs = [
    {
      id: 'geral',
      label: 'Visão Geral',
      icon: TrendingUp,
      description: 'KPIs principais',
    },
    {
      id: 'emissoes',
      label: 'Emissões CO₂',
      icon: Gauge,
      description: 'Análise ambiental',
    },
    {
      id: 'custos',
      label: 'Custos e Rentabilidade',
      icon: DollarSign,
      description: 'Análise financeira',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'geral':
        return (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">A implementar: Análises gerais e KPIs</p>
          </div>
        );
      case 'emissoes':
        return (
          <div className="text-center py-12">
            <Gauge className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">A implementar: Análise de emissões CO₂</p>
          </div>
        );
      case 'custos':
        return (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">A implementar: Análise de custos e rentabilidade</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Análises</h1>
        <p className="text-slate-600 mt-1">Gráficos e métricas avançadas</p>
      </div>

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

export default AnalisesView;
