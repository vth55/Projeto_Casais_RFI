import React from 'react';
import useAuthStore from '../../store/useAuthStore';

const PermissionGuard = ({ permission, children, fallback = null }) => {
  const { can } = useAuthStore();

  if (!can(permission)) {
    return fallback;
  }

  return children;
};

export default PermissionGuard;
