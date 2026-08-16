import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { LoadingScreen } from '../components/common/LoadingScreen';

export const TenantGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loadingTenant, resolveTenant } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenantSlug;

  useEffect(() => {
    if (!tenant && tenantSlug) {
      resolveTenant(tenantSlug);
    }
  }, [tenant, tenantSlug, resolveTenant]);

  if (authLoading || loadingTenant || (!tenant && tenantSlug)) {
    return <LoadingScreen message="Resolving Madrasa Portal..." />;
  }

  if (!user || !tenant) return null;

  // Super Admin can access any tenant for administrative support
  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Enforce Tenant ID matching
  if (user.tenantId !== tenant.id) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#FFF', padding: '36px', borderRadius: '16px', border: '1px solid #FCA5A5', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>🚫</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#991B1B', marginBottom: '8px' }}>Tenant Access Denied</h2>
          <p style={{ color: '#4B5563', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            You do not have access to <strong>{tenant.name}</strong>. Your account belongs to another Madrasa organization.
          </p>
        </div>
      </div>
    );
  }

  // Check if tenant itself is active
  if (tenant.status === 'suspended') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#FFF', padding: '36px', borderRadius: '16px', border: '1px solid #FDBA74', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#C2410C', marginBottom: '8px' }}>Madrasa Portal Suspended</h2>
          <p style={{ color: '#4B5563', fontSize: '14px', lineHeight: '1.6' }}>
            The subscription for {tenant.name} is currently suspended. Please contact the platform administration.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
