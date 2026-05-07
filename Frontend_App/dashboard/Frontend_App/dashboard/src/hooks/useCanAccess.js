import useAuthStore from '../store/useAuthStore';

export const useCanAccess = (permissions) => {
  const { can } = useAuthStore();

  if (Array.isArray(permissions)) {
    return permissions.some(p => can(p));
  }

  return can(permissions);
};
