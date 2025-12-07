import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import Card from '../components/Card';
import Button from '../components/Button';
import { ClipboardList, Activity, Calendar, AlertTriangle, Clock, User, Truck } from 'lucide-react';

const SessoesView = ({ activeView }) => {
  const getInitialTab = () => {
    if (activeView === 'sessoes-ativas') return 'ativas';
    if (activeView === 'sessoes-validacoes') return 'validacoes';
    return 'historico';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab());
  
  useEffect(() => {
    const tab = getInitialTab();
    setActiveTab(tab);
  }, [activeView]);
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

    const basePath = `artifacts/${projectId}/public/data`;

    const unsubscribeSessions = onSnapshot(
      query(collection(db, `${basePath}/sessions`), orderBy('startTime', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSessions(data);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar sessões:', error);
        setLoading(false);
      }
    );

    const unsubscribeMachines = onSnapshot(
      collection(db, `${basePath}/machines`),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMachines(data);
      },
      (error) => {
        console.error('Erro ao carregar máquinas:', error);
      }
    );

    const unsubscribeOperators = onSnapshot(
      collection(db, `${basePath}/operators`),
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
  }, []);

  const filteredSessions = useMemo(() => {
    switch (activeTab) {
      case 'ativas':
        return sessions.filter((s) => s.status === 'OPEN');
      case 'historico':
        return sessions.filter((s) => s.status === 'CLOSED');
      case 'validacoes':
        // TODO: Implementar quando houver sistema de validação
        return [];
      default:
        return sessions;
    }
  }, [sessions, activeTab]);

  // Calcular duração para sessões ativas
  const getActiveDuration = (session) => {
    if (session.status !== 'OPEN' || !session.startTime) return null;
    const start = session.startTime.toDate
      ? session.startTime.toDate()
      : new Date(session.startTime);
    const now = new Date();
    const diffHours = (now - start) / (1000 * 60 * 60);
    return diffHours;
  };

  const formatDuration = (hours) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}min`;
  };

  const tabs = [
    {
      id: 'ativas',
      label: 'Sessões Ativas',
      icon: Activity,
      count: sessions.filter((s) => s.status === 'OPEN').length,
      description: 'Em curso agora',
    },
    {
      id: 'historico',
      label: 'Histórico Completo',
      icon: Calendar,
      count: sessions.filter((s) => s.status === 'CLOSED').length,
      description: 'Todas as sessões',
    },
    {
      id: 'validacoes',
      label: 'Validações Pendentes',
      icon: AlertTriangle,
      count: 0, // TODO: Implementar quando houver sistema de validação
      description: 'Aguardar confirmação',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sessões</h1>
        <p className="text-slate-600 mt-1">Gestão completa de sessões de operação</p>
      </div>

      {/* Tabs - Design Profissional */}
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

        {/* Conteúdo da Tab */}
        <div className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <p className="text-slate-600 mt-2">A carregar dados...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">
                {activeTab === 'ativas'
                  ? 'Nenhuma sessão ativa no momento'
                  : activeTab === 'validacoes'
                  ? 'Nenhuma validação pendente'
                  : 'Nenhuma sessão encontrada'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Máquina
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Operador
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Início
                    </th>
                    {activeTab === 'historico' && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Fim
                      </th>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Duração
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => {
                    const operator = operators.find((o) => o.id === session.cardId);
                    const machine = machines.find((m) => m.id === session.machineId);
                    const startTime = session.startTime?.toDate
                      ? session.startTime.toDate()
                      : new Date(session.startTime);
                    const endTime = session.endTime?.toDate
                      ? session.endTime.toDate()
                      : session.endTime
                      ? new Date(session.endTime)
                      : null;

                    const duration =
                      activeTab === 'ativas'
                        ? getActiveDuration(session)
                        : session.durationHours;

                    return (
                      <tr
                        key={session.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-slate-900">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">
                              {machine?.name || session.machineId}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{operator?.name || session.cardId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>
                              {startTime.toLocaleString('pt-PT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        {activeTab === 'historico' && (
                          <td className="py-3 px-4 text-sm text-slate-700">
                            {endTime
                              ? endTime.toLocaleString('pt-PT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                        )}
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {duration ? (
                            <span className="font-medium">
                              {activeTab === 'ativas'
                                ? formatDuration(duration)
                                : `${duration.toFixed(1)}h`}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              session.status === 'OPEN'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {session.status === 'OPEN' ? 'Ativa' : 'Fechada'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SessoesView;
