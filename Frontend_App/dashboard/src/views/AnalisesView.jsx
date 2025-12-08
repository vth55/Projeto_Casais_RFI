import React, { useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, Leaf, Fuel, Truck } from 'lucide-react';
import useStore from '../store/useStore';
import { Card, StatCard, Button, Skeleton } from '../components/ui';

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-slate-200">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
    ))}
  </div>
);

const AnalisesView = () => {
  const { activeView, machines, getFilteredSessions, getKPIs, loading } = useStore();
  const [activeTab, setActiveTab] = useState(activeView === 'analises-emissoes' ? 'emissions' : activeView === 'analises-utilizacao' ? 'utilization' : 'general');

  const filteredSessions = getFilteredSessions();
  const kpis = getKPIs();

  const chartData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return days.map(day => ({
      name: day,
      horas: Math.floor(Math.random() * 60) + 20,
      emissoes: Math.floor(Math.random() * 400) + 100,
      combustivel: Math.floor(Math.random() * 150) + 50,
    }));
  }, []);

  const utilizationData = useMemo(() => {
    return machines.slice(0, 6).map(m => ({
      name: m.name?.substring(0, 12) || m.id,
      value: Math.floor(Math.random() * 60) + 40,
    }));
  }, [machines]);

  const COLORS = ['#005EB8', '#0ea5e9', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'];
  const tabs = [{ id: 'general', label: 'Visão Geral' }, { id: 'emissions', label: 'Emissões CO₂' }, { id: 'utilization', label: 'Utilização' }];

  if (loading) return <div className="space-y-6"><Skeleton variant="title" className="w-48" /><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton.Stat key={i} />)}</div></div>;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-slate-900">Análises</h2><p className="text-slate-500 mt-1">Estatísticas e tendências</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} title="Horas Totais" value={kpis.totalHours} unit="h" color="primary" />
        <StatCard icon={Truck} title="Utilização" value={kpis.utilizationRate} unit="%" color="emerald" />
        <StatCard icon={Fuel} title="Combustível" value={kpis.totalFuel} unit="L" color="amber" />
        <StatCard icon={Leaf} title="CO₂" value={kpis.totalCO2} unit="kg" color="slate" />
      </div>

      <Card padding="none">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Atividade Semanal</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="horas" fill="#005EB8" name="Horas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Tendência de Consumo</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="combustivel" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Combustível (L)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {activeTab === 'emissions' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Emissões CO₂ Semanais</h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEmissoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip formatter={(v) => [`${v} kg`, 'CO₂']} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="emissoes" stroke="#10b981" strokeWidth={2} fill="url(#colorEmissoes)" name="CO₂" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {activeTab === 'utilization' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Utilização por Equipamento</h3>
                <div className="space-y-4">
                  {utilizationData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-slate-600 w-28 truncate">{item.name}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-12 text-right">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribuição</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={utilizationData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {utilizationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`, 'Utilização']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AnalisesView;
