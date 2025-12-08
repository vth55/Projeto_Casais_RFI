import React, { useState } from 'react';
import { Settings, Database, Trash2, AlertTriangle, RefreshCw, Check, Bell, User, Shield, Palette } from 'lucide-react';
import { createAllMockData } from '../utils/mockData';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';
import useStore from '../store/useStore';
import { Card, Button, Badge, Modal, Input } from '../components/ui';

const ConfigSection = ({ icon: Icon, title, description, children }) => (
  <Card>
    <div className="flex items-start gap-4 mb-4">
      <div className="p-2.5 bg-slate-100 rounded-lg"><Icon className="w-5 h-5 text-slate-600" /></div>
      <div><h3 className="font-semibold text-slate-900">{title}</h3><p className="text-sm text-slate-500 mt-0.5">{description}</p></div>
    </div>
    {children}
  </Card>
);

const ConfiguracoesView = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleCreateMockData = async () => {
    setLoading(true);
    try {
      const result = await createAllMockData();
      setMessage({ type: 'success', text: `Dados criados: ${result.machines} máquinas, ${result.operators} operadores, ${result.sessions} sessões` });
    } catch (error) {
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
      const collections = ['machines', 'operators', 'sessions', 'tariffs', 'maintenance'];
      for (const col of collections) {
        const snapshot = await getDocs(collection(db, `${basePath}/${col}`));
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, `${basePath}/${col}`, d.id))));
      }
      setMessage({ type: 'success', text: 'Todos os dados foram eliminados' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao eliminar dados' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-slate-900">Configurações</h2><p className="text-slate-500 mt-1">Gerir configurações do sistema</p></div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConfigSection icon={Database} title="Base de Dados" description="Gestão de dados do sistema">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Criar Dados Demo</p><p className="text-xs text-slate-500">Criar dados de exemplo</p></div>
              <Button size="sm" icon={RefreshCw} onClick={handleCreateMockData} loading={loading}>Criar</Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div><p className="text-sm font-medium text-red-700">Limpar Base de Dados</p><p className="text-xs text-red-600">Eliminar todos os dados</p></div>
              <Button variant="danger" size="sm" icon={Trash2} onClick={handleClearData} loading={loading}>Limpar</Button>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection icon={Bell} title="Notificações" description="Configurar alertas e notificações">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Alertas de Manutenção</p><p className="text-xs text-slate-500">Notificar quando limite de horas</p></div>
              <Badge variant="success">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Alertas de Fadiga</p><p className="text-xs text-slate-500">Notificar sessões {'>'}5 horas</p></div>
              <Badge variant="success">Ativo</Badge>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection icon={Settings} title="Sistema" description="Configurações gerais">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Limite Manutenção</p><p className="text-xs text-slate-500">Horas até manutenção preventiva</p></div>
              <Badge>150h</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Alerta Fadiga</p><p className="text-xs text-slate-500">Horas contínuas para alerta</p></div>
              <Badge>5h</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Auto-close Sessão</p><p className="text-xs text-slate-500">Fechar sessão automaticamente</p></div>
              <Badge>14h</Badge>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection icon={Palette} title="Aparência" description="Personalizar interface">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Cor Primária</p><p className="text-xs text-slate-500">Azul Casais (#005EB8)</p></div>
              <div className="w-6 h-6 bg-primary-500 rounded-full border-2 border-white shadow" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-900">Tema</p><p className="text-xs text-slate-500">Modo de exibição</p></div>
              <Badge>Claro</Badge>
            </div>
          </div>
        </ConfigSection>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-100 rounded-lg"><Shield className="w-5 h-5 text-slate-600" /></div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Versão do Sistema</h3>
            <p className="text-sm text-slate-500">CASAIS Fleet Intelligence v1.0.0</p>
          </div>
          <Badge variant="success">Atualizado</Badge>
        </div>
      </Card>
    </div>
  );
};

export default ConfiguracoesView;
