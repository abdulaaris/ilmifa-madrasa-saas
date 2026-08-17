import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  // 1. If logged in, redirect to their role dashboard
  if (user) {
    if (user.role === 'SUPER_ADMIN') {
      return <Navigate to="/core/dashboard" replace />;
    }
    const slug = user.tenantId ? (tenant?.slug || 'noorul-hayath') : 'noorul-hayath';
    if (user.role === 'PRINCIPAL') {
      return <Navigate to={`/m/${slug}/principal`} replace />;
    }
    if (user.role === 'TEACHER') {
      return <Navigate to={`/m/${slug}/teacher`} replace />;
    }
    if (user.role === 'PARENT') {
      return <Navigate to={`/m/${slug}/parent`} replace />;
    }
  }

  // 2. If tenant context exists or stored in session, redirect to customer portal login
  if (tenant?.slug) {
    return <Navigate to={`/m/${tenant.slug}/login`} replace />;
  }

  const lastSlug = localStorage.getItem('last_tenant_slug') || 'noorul-hayath';
  return <Navigate to={`/m/${lastSlug}/login`} replace />;
};
