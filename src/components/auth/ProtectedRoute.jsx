import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { LoadingState } from '../common/LoadingState';

export const ProtectedRoute = ({
  children,
  requiredPermission,
  requiredRole,
  requiredAnyPermission = []
}) => {
  const { currentUser, loading } = useAuth();
  const { can, canAny, userRole } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Authenticating Sri Amman Store Session..." />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredAnyPermission.length > 0 && !canAny(requiredAnyPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
