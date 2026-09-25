import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

export const PermissionGuard = ({
  permission,
  anyPermissions = [],
  allPermissions = [],
  role,
  fallback = null,
  children
}) => {
  const { can, canAny, canAll, userRole } = usePermissions();

  if (role && userRole !== role) {
    return fallback;
  }

  if (permission && !can(permission)) {
    return fallback;
  }

  if (anyPermissions.length > 0 && !canAny(anyPermissions)) {
    return fallback;
  }

  if (allPermissions.length > 0 && !canAll(allPermissions)) {
    return fallback;
  }

  return <>{children}</>;
};
