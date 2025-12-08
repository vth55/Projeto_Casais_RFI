import React, { useState } from 'react';
import { FileText, Download, Calendar, Truck, Users, Clock, Leaf, Euro } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, Button, Badge, EmptyState } from '../components/ui';

const reportTypes = [
  { id: 'sessions', name: 'Relatório de Sessões', description: 'Histórico completo de utilizações por período', icon: Clock, format: 'CSV/Excel' },
  { id: 'machines', name: 'Relatório de Equipamentos', description: 'Estado atual, horas e manutenções', icon: Truck, format: 'CSV/Excel' },
  { id: 'operators', name: 'Relatório de Operadores', description: 'Atividade e horas por operador', icon: Users, format: 'CSV/Excel' },
  { id: 'emissions', name: 'Relatório de Emissões', description: 'Emissões CO₂ por equipamento e período', icon: Leaf, format: 'PDF' },
  { id: 'financial', name: 'Relatório Financeiro', description: 'Custos, receitas e rentabilidade', icon: Euro, format: 'PDF/Excel' },
];

const RelatoriosView = () => {
  const { machines, operators, sessions } = useStore();
  const [selectedType, setSelectedType] = useState(null);
  const [period, setPeriod] = useState('month');

  const handleExport = (type) => {
    console.log('Exportando:', type, 'Período:', period);
    // Implementar exportação real
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Relatórios</h2>
          <p className="text-slate-500 mt-1">Exportação de dados e relatórios</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          {['week', 'month', 'quarter', 'year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'quarter' ? 'Trimestre' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map(report => (
          <Card key={report.id} hover onClick={() => setSelectedType(report.id)} className={selectedType === report.id ? 'ring-2 ring-primary-500' : ''}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <report.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{report.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                <Badge variant="default" size="sm" className="mt-2">{report.format}</Badge>
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
              <Button size="sm" icon={Download} onClick={(e) => { e.stopPropagation(); handleExport(report.id); }}>Exportar</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2.5 bg-slate-100 rounded-lg"><Calendar className="w-5 h-5 text-slate-600" /></div>
          <div>
            <h3 className="font-semibold text-slate-900">Relatórios Agendados</h3>
            <p className="text-sm text-slate-500">Configure relatórios automáticos por email</p>
          </div>
        </div>
        <EmptyState icon={FileText} title="Sem relatórios agendados" description="Configure relatórios automáticos para receber por email." actionLabel="Agendar Relatório" />
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-900 mb-4">Dados Disponíveis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-slate-900">{machines.length}</p>
            <p className="text-sm text-slate-500">Equipamentos</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-slate-900">{operators.length}</p>
            <p className="text-sm text-slate-500">Operadores</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
            <p className="text-sm text-slate-500">Sessões</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RelatoriosView;
