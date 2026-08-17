import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { tenantService } from '../services/tenantService';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ArrowRight, LogOut } from 'lucide-react';

export const TenantGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, logout } = useAuth();
  const { tenant, loadingTenant, resolveTenant } = useTenant();
  const params = useParams();
  const navigate = useNavigate();
  const tenantSlug = params.tenantSlug;
  const [navigatingToOwn, setNavigatingToOwn] = useState(false);

  useEffect(() => {
    if (!tenant && tenantSlug) {
      resolveTenant(tenantSlug);
    }
  }, [tenant, tenantSlug, resolveTenant]);

  const handleGoToMyMadrasa = async () => {
    setNavigatingToOwn(true);
    if (user?.tenantId) {
      const myTenant = await tenantService.getTenantById(user.tenantId);
      if (myTenant?.slug) {
        const rolePath = user.role.toLowerCase();
        navigate(`/m/${myTenant.slug}/${rolePath}`);
        setNavigatingToOwn(false);
        return;
      }
    }
    const lastSlug = localStorage.getItem('last_tenant_slug') || 'noorul-hayath';
    navigate(`/m/${lastSlug}/login`);
    setNavigatingToOwn(false);
  };

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
        <div style={{ background: '#FFF', padding: '36px 28px', borderRadius: '20px', border: '1px solid #FCA5A5', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(239, 68, 68, 0.08)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '26px' }}>
            🚫
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#991B1B', marginBottom: '8px' }}>
            Tenant Access Denied
          </h2>
          <p style={{ color: '#4B5563', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            You do not have access to <strong>{tenant.name}</strong>. Your account belongs to another Madrasa organization.
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              type="button"
              onClick={handleGoToMyMadrasa}
              disabled={navigatingToOwn}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: '15px',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#7B2525',
                borderColor: '#7B2525',
                color: '#FFF',
                boxShadow: '0 4px 14px rgba(123, 37, 37, 0.3)'
              }}
            >
              <span>{navigatingToOwn ? 'Redirecting...' : 'Go to your app'}</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              onClick={async () => { await logout(); window.location.reload(); }}
              className="btn btn-outline"
              style={{
                width: '100%',
                padding: '11px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: '#6B7280'
              }}
            >
              <LogOut size={15} />
              <span>Logout Account</span>
            </button>
          </div>
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
