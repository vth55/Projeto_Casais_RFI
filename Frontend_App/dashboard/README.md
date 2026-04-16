# 🎨 Frontend_App - PWA Dashboard

Interface principal de gestão e visualização de dados do *Casais Fleet Intelligence*. Desenvolvida como uma Progressive Web Application (PWA) de alto desempenho.

---

## 🛠️ Tecnologias
- **React 19** + **Vite**
- **Tailwind CSS** (Styling)
- **Zustand** (Estado Global)
- **Lucide React** (Ícones)
- **Firebase SDK** (Sync em tempo real)

---

## 📂 Estrutura de Pastas
- `src/components/`: Componentes UI reutilizáveis (Card, StatCard, Button).
- `src/store/`: Gestão de estado centralizada.
  - `useStore.js`: Estado principal de máquinas, sessões e obras.
  - `useAuthStore.js`: Sistema de autenticação e RBAC.
- `src/views/`: Páginas completas da aplicação.
  - `DashboardView.jsx`: Painel de controlo principal.
  - `MaquinasView.jsx`: Gestão de equipamentos e custos.
- `src/config/`: Configurações de permissões e Firebase.
- `public/`: Assets estáticos e `manifest.json`.

---

## 🔐 Segurança (RBAC)
O sistema utiliza um modelo de **Role-Based Access Control** com 5 perfis:
1. **Admin**: Acesso total.
2. **IT/Sistemas**: Gestão técnica e integrações.
3. **Gestor (Frota/Financeiro)**: Operação e custos.
4. **Supervisor**: Focado em obras e manutenção.
5. **Operador**: Mobile Hub (NFC) e reporte de avarias.

---

## 📶 Modo Offline
Graças ao `enableIndexedDbPersistence` do Firebase e ao Service Worker configurado no `vite.config.js`, a app pode ser utilizada sem rede, sincronizando os dados automaticamente assim que a ligação for restabelecida.

---

## 🚀 Como Correr
```bash
npm install
npm run dev
```

---
> **Style Guide**: Seguimos os padrões oficiais da Casais (#005EB8). Evitar o uso de cores roxas/violetas conforme as regras de design do projeto.
