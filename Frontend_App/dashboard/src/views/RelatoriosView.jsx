/**
 * RELATÓRIOS - CASAIS FLEET INTELLIGENCE
 */

import React from 'react';
import Card from '../components/Card';
import { FileText } from 'lucide-react';

const RelatoriosView = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-600 mt-1">Exportações e documentos</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">A implementar...</p>
        </div>
      </Card>
    </div>
  );
};

export default RelatoriosView;

