import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Settings, Database, Trash2, AlertTriangle } from 'lucide-react';
import { createAllMockData } from '../utils/mockData';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';

const ConfiguracoesView = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleCreateMockData = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await createAllMockData();
      if (result.success) {
        console.log(`Mock data criado: ${result.machines} máquinas, ${result.operators} operadores`);
        setMessage({
          type: 'success',
          text: `✅ Dados criados: ${result.machines} máquinas, ${result.operators} operadores, ${result.sessions} sessões`,
        });
      } else {
        setMessage({
          type: 'error',
          text: `❌ Erro: ${result.error}`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Erro: ${error.message}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleDeleteAllData = async () => {
    if (
      !confirm(
        '⚠️ ATENÇÃO: Isto vai apagar TODOS os dados (máquinas, operadores, sessões).\n\nTens CERTEZA?'
      )
    ) {
      return;
    }

    if (
      !confirm(
        '⚠️ ÚLTIMA CONFIRMAÇÃO: Isto é IRREVERSÍVEL!\n\nTens ABSOLUTA CERTEZA que queres apagar tudo?'
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const basePath = `artifacts/${projectId}/public/data`;

      const machinesSnapshot = await getDocs(collection(db, `${basePath}/machines`));
      for (const machineDoc of machinesSnapshot.docs) {
        await deleteDoc(doc(db, `${basePath}/machines`, machineDoc.id));
      }

      const operatorsSnapshot = await getDocs(collection(db, `${basePath}/operators`));
      for (const operatorDoc of operatorsSnapshot.docs) {
        await deleteDoc(doc(db, `${basePath}/operators`, operatorDoc.id));
      }

      const sessionsSnapshot = await getDocs(collection(db, `${basePath}/sessions`));
      for (const sessionDoc of sessionsSnapshot.docs) {
        await deleteDoc(doc(db, `${basePath}/sessions`, sessionDoc.id));
      }

      console.log('Dados apagados com sucesso');
      setMessage({
        type: 'success',
        text: '✅ Todos os dados foram apagados',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Erro: ${error.message}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-600 mt-1">Sistema e preferências</p>
      </div>

      {/* Gestão de Dados Mock */}
      <Card variant="elevated">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Database className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Dados de Demonstração</h2>
            <p className="text-sm text-slate-600 mt-1">
              Criar ou apagar dados mock para visualizar gráficos e funcionalidades
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">Criar Dados Mock</h3>
            <p className="text-sm text-slate-600 mb-4">
              Adiciona máquinas, operadores e sessões de exemplo para visualizar gráficos e
              funcionalidades.
            </p>
            <Button onClick={handleCreateMockData} disabled={loading} icon={Database}>
              {loading ? 'A criar...' : 'Criar Dados Mock'}
            </Button>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-semibold text-red-900">Apagar Todos os Dados</h3>
            </div>
            <p className="text-sm text-red-700 mb-4">
              ⚠️ Esta ação é IRREVERSÍVEL. Apaga todas as máquinas, operadores e sessões.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllData}
              disabled={loading}
              icon={Trash2}
            >
              {loading ? 'A apagar...' : 'Apagar Todos os Dados'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Outras Configurações */}
      <Card>
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">Outras configurações a implementar...</p>
        </div>
      </Card>
    </div>
  );
};

export default ConfiguracoesView;
