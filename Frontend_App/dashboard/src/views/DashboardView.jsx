import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import Card from '../components/Card';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import DateFilter from '../components/DateFilter';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Truck,
  Users,
  TrendingUp,
  AlertTriangle,
  Gauge,
  DollarSign,
  Download,
} from 'lucide-react';

const DashboardView = () => {
  const [dateFilter, setDateFilter] = useState('month');
  const [sessions, setSessions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      console.error('Firestore não inicializado');
      setLoading(false);
      return;
    }

    try {
      const basePath = `artifacts/${projectId}/public/data`;

      const unsubscribeSessions = onSnapshot(
        query(collection(db, `${basePath}/sessions`)),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSessions(data);
          console.log(`Carregadas ${data.length} sessões`);
        },
        (error) => {
          console.error('Erro ao carregar sessões:', error);
        }
      );

      const unsubscribeMachines = onSnapshot(
        query(collection(db, `${basePath}/machines`)),
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

      const unsubscribeOperators = onSnapshot(
        query(collection(db, `${basePath}/operators`)),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOperators(data);
        },
        (error) => {
          console.error('Erro ao carregar operadores:', error);
        }
      );

      return () => {
        unsubscribeSessions();
        unsubscribeMachines();
        unsubscribeOperators();
      };
    } catch (error) {
      console.error('Erro ao configurar listeners:', error);
      setLoading(false);
    }
  }, []);

  const getFilteredSessions = () => {
    if (!sessions.length) return [];

    const now = new Date();
    let startDate;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return sessions;
    }

    return sessions.filter((session) => {
      if (!session.startTime) return false;
      const sessionDate = session.startTime.toDate
        ? session.startTime.toDate()
        : new Date(session.startTime);
      return sessionDate >= startDate;
    });
  };

  const filteredSessions = getFilteredSessions();

  // Calcular métricas
  const totalHours = filteredSessions
    .filter((s) => s.status === 'CLOSED' && s.durationHours)
    .reduce((sum, s) => sum + (s.durationHours || 0), 0);

  const activeSessions = filteredSessions.filter((s) => s.status === 'OPEN').length;

  const totalCO2 = machines.reduce((sum, machine) => {
    const machineSessions = filteredSessions.filter(
      (s) => s.machineId === machine.id && s.status === 'CLOSED'
    );
    const machineHours = machineSessions.reduce(
      (h, s) => h + (s.durationHours || 0),
      0
    );
    const consumption = (machine.consumptionRate || 0) * machineHours;
    return sum + consumption * 2.68; // Fator de emissão CO₂
  }, 0);

  const activeMachines = machines.filter((m) => m.status === 'ACTIVE').length;

  const maintenanceAlerts = machines.filter((m) => {
    const hoursSinceMaintenance = m.partialHours || m.totalHours || 0;
    return hoursSinceMaintenance >= 120; // Alerta aos 80% de 150h
  }).length;

  // Dados para gráficos (mock data se não houver dados reais)
  const chartData = useMemo(() => {
    // Se temos dados reais, usar; senão, criar dados mock para demonstração
    if (filteredSessions.length === 0) {
      // Dados mock para demonstração visual
      const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      return days.map((day, i) => ({
        name: day,
        horas: Math.floor(Math.random() * 40) + 20,
        emissoes: Math.floor(Math.random() * 200) + 100,
        custos: Math.floor(Math.random() * 500) + 300,
      }));
    }

    // Agregar dados reais por dia da semana
    const grouped = {};
    filteredSessions.forEach((session) => {
      if (session.startTime && session.durationHours) {
        const date = session.startTime.toDate
          ? session.startTime.toDate()
          : new Date(session.startTime);
        const day = date.toLocaleDateString('pt-PT', { weekday: 'short' });
        if (!grouped[day]) {
          grouped[day] = { horas: 0, emissoes: 0, custos: 0 };
        }
        grouped[day].horas += session.durationHours || 0;
        // Calcular emissões e custos
        const machine = machines.find((m) => m.id === session.machineId);
        if (machine) {
          const consumption = (machine.consumptionRate || 0) * (session.durationHours || 0);
          grouped[day].emissoes += consumption * 2.68;
          grouped[day].custos += (session.durationHours || 0) * (machine.currentTariff?.totalCostPerHour || 0);
        }
      }
    });

    return Object.entries(grouped).map(([name, data]) => ({
      name,
      horas: Math.round(data.horas * 10) / 10,
      emissoes: Math.round(data.emissoes),
      custos: Math.round(data.custos),
    }));
  }, [filteredSessions, machines]);

  // Dados para gráfico de pizza (distribuição por máquina)
  const pieData = useMemo(() => {
    if (machines.length === 0) {
      return [
        { name: 'Escavadora 01', value: 45 },
        { name: 'Grua 02', value: 30 },
        { name: 'Betoneira 03', value: 25 },
      ];
    }

    return machines.slice(0, 5).map((machine) => {
      const machineSessions = filteredSessions.filter(
        (s) => s.machineId === machine.id && s.status === 'CLOSED'
      );
      const hours = machineSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      return {
        name: machine.name || machine.id,
        value: Math.round(hours),
      };
    });
  }, [machines, filteredSessions]);

  // Cores para gráficos (Casais blue)
  const COLORS = ['#005EB8', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Painel Principal</h1>
          <p className="text-slate-600 mt-1">
            Visão geral do sistema e métricas principais
          </p>
        </div>
        <DateFilter selectedFilter={dateFilter} onFilterChange={setDateFilter} />
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
          icon={Activity}
          title="Horas Totais"
          value={totalHours.toFixed(1)}
          unit="h"
          colorClass="primary"
        />
        <StatCard
          icon={Truck}
          title="Máquinas Ativas"
          value={activeMachines}
          unit={`de ${machines.length}`}
          colorClass="emerald"
        />
        <StatCard
          icon={Users}
          title="Sessões Ativas"
          value={activeSessions}
          unit="em curso"
          colorClass="slate"
        />
        <StatCard
          icon={Gauge}
          title="Emissões CO₂"
          value={totalCO2.toFixed(0)}
          unit="kg"
          colorClass="orange"
        />
      </div>

      {/* Alertas e Avisos */}
      {maintenanceAlerts > 0 && (
        <Card variant="elevated" className="border-l-4 border-l-orange-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">
                Alertas de Manutenção
              </h3>
              <p className="text-slate-600 text-sm">
                {maintenanceAlerts} máquina{maintenanceAlerts !== 1 ? 's' : ''} com
                manutenção necessária
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Ver Detalhes
            </Button>
          </div>
        </Card>
      )}

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Horas e Emissões */}
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Atividade Semanal</h2>
              <p className="text-sm text-slate-600 mt-1">Horas trabalhadas e emissões CO₂</p>
            </div>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend />
              <Bar dataKey="horas" fill="#005EB8" name="Horas" radius={[8, 8, 0, 0]} />
              <Bar dataKey="emissoes" fill="#0ea5e9" name="CO₂ (kg)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico de Linha - Tendência */}
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Tendência de Custos</h2>
              <p className="text-sm text-slate-600 mt-1">Evolução semanal</p>
            </div>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#005EB8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#005EB8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value) => [`€${value.toLocaleString('pt-PT')}`, 'Custos']}
              />
              <Area
                type="monotone"
                dataKey="custos"
                stroke="#005EB8"
                strokeWidth={3}
                fill="url(#colorCustos)"
                name="Custos (€)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico de Pizza - Distribuição por Máquina */}
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Distribuição de Horas</h2>
              <p className="text-sm text-slate-600 mt-1">Por máquina</p>
            </div>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value) => [`${value}h`, 'Horas']}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico de Linha - Comparação */}
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Evolução de Emissões</h2>
              <p className="text-sm text-slate-600 mt-1">Tendência semanal</p>
            </div>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value) => [`${value} kg`, 'CO₂']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="emissoes"
                stroke="#005EB8"
                strokeWidth={3}
                dot={{ fill: '#005EB8', r: 5 }}
                activeDot={{ r: 8 }}
                name="Emissões CO₂ (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

    </div>
  );
};

export default DashboardView;

