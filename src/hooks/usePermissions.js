import { useAuth } from './useAuth';
import { hasPermission, ROLES } from '../utils/roles';

const STAFF_LOCAL_KEY = 'grocery_admin_staff_list_v5';

/**
 * Checks if a specific permission is granted via role or active temporary delegation
 */
const checkPermissionForStaff = (userRole, currentUser, requiredPermission) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;

  // 1. Standard role permission check
  if (hasPermission(userRole, requiredPermission)) return true;

  // 2. Custom temporary delegation check
  try {
    const stored = localStorage.getItem(STAFF_LOCAL_KEY);
    if (!stored) return false;

    const staffList = JSON.parse(stored);
    const staffMember = staffList.find(s => 
      (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      s.uid === currentUser?.uid ||
      s.role === userRole
    );

    if (staffMember && Array.isArray(staffMember.delegatedPermissions)) {
      const now = new Date();
      const activeDelegation = staffMember.delegatedPermissions.find(d => {
        if (d.permission !== requiredPermission) return false;
        if (!d.expiresAt) return true; // Permanent custom override
        return new Date(d.expiresAt) > now; // Valid unexpired date
      });

      if (activeDelegation) return true;
    }
  } catch (e) {
    console.warn('[usePermissions] Error evaluating custom delegations:', e);
  }

  return false;
};

export const usePermissions = () => {
  const { userRole, currentUser } = useAuth();

  const can = (permission) => {
    return checkPermissionForStaff(userRole, currentUser, permission);
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
