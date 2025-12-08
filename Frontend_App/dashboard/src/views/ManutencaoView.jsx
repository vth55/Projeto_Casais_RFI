/**
 * GESTÃO DE MANUTENÇÃO - CASAIS FLEET INTELLIGENCE
 * 
 * Tabs: Alertas, Calendário, Avarias Reportadas
 */

import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { Wrench, AlertTriangle, Calendar, AlertCircle } from 'lucide-react';

const ManutencaoView = ({ activeView }) => {
  // Sincronizar tab com navegação do sidebar
  const getInitialTab = () => {
    if (activeView === 'manutencao-calendario') return 'calendario';
    if (activeView === 'manutencao-avarias') return 'avarias';
    return 'alertas';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab()); // 'alertas', 'calendario', 'avarias'
  
  // Atualizar tab quando navegação mudar
  useEffect(() => {
    const tab = getInitialTab();
    setActiveTab(tab);
  }, [activeView]);

  const tabs = [
    {
      id: 'alertas',
      label: 'Alertas',
      icon: AlertTriangle,
      count: 0, // TODO: Implementar contagem real
      description: 'Manutenção necessária',
    },
    {
      id: 'calendario',
      label: 'Calendário',
      icon: Calendar,
      count: 0, // TODO: Implementar contagem real
      description: 'Agendamentos',
    },
    {
      id: 'avarias',
      label: 'Avarias Reportadas',
      icon: AlertCircle,
      count: 0, // TODO: Implementar contagem real
      description: 'Problemas reportados',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'alertas':
        return (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">A implementar: Alertas de manutenção</p>
          </div>
        );
      case 'calendario':
        return (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">A implementar: Calendário de manutenção</p>
          </div>
        );
      case 'avarias':
        return (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">A implementar: Avarias reportadas</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Manutenção</h1>
        <p className="text-slate-600 mt-1">Alertas e gestão de manutenção</p>
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

export default ManutencaoView;
