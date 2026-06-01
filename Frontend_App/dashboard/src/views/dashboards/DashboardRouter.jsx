/**
 * DashboardRouter - Renderiza o dashboard adequado ao perfil ativo
 * 
 * Em vez de esconder menus, cada perfil vê um dashboard "feito para ele":
 * - Admin: Dashboard global (KPIs financeiros, todas as obras)
 * - IT: Dashboard técnico (APIs, logs, integrações)
 * - Manutenção: Dashboard global de equipamentos enquanto o painel dedicado é migrado
 * - Encarregado: Dashboard da sua obra
 * - Operador: painel de terreno com NFC global pronto e reporte de avaria
 * - Outros: Dashboard global (fallback)
 */

import React, { lazy, Suspense } from 'react';
import useAuthStore from '../../store/useAuthStore';

// Lazy load dashboards específicos
const DashboardOperador = lazy(() => import('./DashboardOperador'));

// Fallback simples
const Loader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">A carregar...</p>
    </div>
  </div>
);

const DashboardRouter = ({ DefaultDashboard }) => {
  const { currentUser, getRole } = useAuthStore();
  const role = getRole(currentUser?.systemRole);
  const dashboardType = role?.defaultDashboard;

  // Decidir qual dashboard renderizar
  switch (dashboardType) {
    case 'manutencao':
      return <DefaultDashboard />;
    case 'operador':
      return (
        <Suspense fallback={<Loader />}>
          <DashboardOperador />
        </Suspense>
      );
    case 'it':
      // IT usa o dashboard global + extras (por enquanto, dashboard global)
      return <DefaultDashboard />;
    default:
      // Admin, Gestores, Encarregado, Operador → dashboard global
      return <DefaultDashboard />;
  }
};

export default DashboardRouter;
