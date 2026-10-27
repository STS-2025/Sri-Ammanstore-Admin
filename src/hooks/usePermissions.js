import { useAuth } from './useAuth';
import { hasPermission, ROLES } from '../utils/roles';

/**
 * Checks the assigned role and administrator-issued, profile-backed delegation.
 */
const checkPermissionForStaff = (userRole, userProfile, requiredPermission) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;

  if (hasPermission(userRole, requiredPermission)) return true;

  return (userProfile?.delegatedPermissions || []).some((delegation) =>
    delegation.permission === requiredPermission &&
    (!delegation.expiresAt || new Date(delegation.expiresAt) > new Date())
  );
};

export const usePermissions = () => {
  const { userRole, currentUser, userProfile } = useAuth();

  const can = (permission) => {
    return checkPermissionForStaff(userRole, userProfile, permission);
  };

  const canAll = (permissions = []) => {
    if (permissions.length === 0) return true;
    return permissions.every((perm) => can(perm));
  };

  const canAny = (permissions = []) => {
    if (permissions.length === 0) return true;
    return permissions.some((perm) => can(perm));
  };

  const isSuperAdmin = userRole === ROLES.SUPER_ADMIN;
  const isStoreManager = userRole === ROLES.STORE_MANAGER || isSuperAdmin;
  const isDeliveryAgent = userRole === ROLES.DELIVERY_AGENT;

  return {
    can,
    canAll,
    canAny,
    userRole,
    currentUser,
    isSuperAdmin,
    isStoreManager,
    isDeliveryAgent
  };
};
