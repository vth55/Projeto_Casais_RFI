import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Users, Plus } from 'lucide-react';

const OperadoresView = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operadores</h1>
          <p className="text-slate-600 mt-1">Gestão de operadores registados</p>
        </div>
        <Button icon={Plus}>
          Registar Novo
        </Button>
      </div>

      <Card>
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">A implementar...</p>
        </div>
      </Card>
    </div>
  );
};

export default OperadoresView;

