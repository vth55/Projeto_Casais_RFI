# Configurações Flowchart

## Feature: Configurações (System Settings & Admin)
**Entry Point:** `Frontend_App/dashboard/src/views/ConfiguracoesView.jsx:758`

Admin hub for role management, operational settings, Procore integration, theme, and database.

**External Dependencies:**
- `useAuthStore` (getAllRoles, addCustomRole, updateRole, deleteRole, can)
- `useThemeStore` (theme toggle)
- Procore OAuth2 + REST API
- System settings collection (Firestore)

**Key Flows:**
1. **General Tab** — Edit fuel price, CO2 factor, default maintenance interval via OperationalSettingsSection
2. **Roles Tab** — View/Edit/Delete roles with permission matrix (RoleEditModal)
3. **Integrations Tab** — Connect Procore via OAuth → Manual sync → View status & catalog
4. **Demo Tab** — Role switching for testing (setCurrentUser without logout)
5. **Appearance Tab** — Light/Dark theme toggle
6. **Database Tab** — Create mock data or clear collections

**Permission Matrix:**
- Hierarchical roles (admin=4, gestor=3, encarregado=2, operador=1)
- Permission categories: SESSIONS_*, MACHINES_*, MAINTENANCE_*, SETTINGS_*, QUALITY_*, REPORTS_*
- Custom role creation allowed for users with SETTINGS_MANAGE_ROLES

**Constraints:**
- Only admin/it roles can manage roles (SETTINGS_MANAGE_ROLES check)
- Procore sync capped at 1/hour (via backend rate limiting)
- Theme persisted to localStorage
- System settings apply globally (not per-user)
