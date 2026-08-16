import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { InstallPwaCard } from '../../components/common/InstallPwaCard';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { TenantNotFound } from './TenantNotFound';
import { UserRole } from '../../types';
import { Building2, ArrowRight, ShieldCheck, UserCheck, HeartHandshake } from 'lucide-react';

export const PortalLoginPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant, loadingTenant, resolveTenant } = useTenant();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>('PRINCIPAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (tenantSlug) {
      resolveTenant(tenantSlug);
    }
  }, [tenantSlug, resolveTenant]);

  // If tenant user is already authenticated and matches tenant -> redirect to role dashboard
  useEffect(() => {
    if (user && tenant && user.role !== 'SUPER_ADMIN') {
      if (user.tenantId === tenant.id) {
        if (user.role === 'PRINCIPAL') navigate(`/m/${tenant.slug}/principal`);
        else if (user.role === 'TEACHER') navigate(`/m/${tenant.slug}/teacher`);
        else if (user.role === 'PARENT') navigate(`/m/${tenant.slug}/parent`);
      }
    }
  }, [user, tenant, navigate]);

  if (loadingTenant) {
    return <LoadingScreen message="Loading Madrasa Portal..." />;
  }

  if (!tenant && !loadingTenant) {
    return <TenantNotFound slug={tenantSlug} />;
  }

  const primaryColor = tenant?.branding?.primaryColor || '#7B2525';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your Email and Password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const userProfile = await login(email, password);

      // Super Admin bypass for administrative support
      if (userProfile.role === 'SUPER_ADMIN') {
        navigate(`/core/dashboard`);
        return;
      }

      // 1. Enforce Tenant Matching
      if (userProfile.tenantId !== tenant?.id) {
        await authService.logout();
        setError(`Access Denied. Your account is registered under a different Madrasa tenant.`);
        setLoading(false);
        return;
      }

      // 2. Enforce Role check match if user picked specific tab
      if (userProfile.role !== activeRoleTab) {
        // We can inform or auto-route to correct dashboard
        console.warn(`User role is ${userProfile.role}, tab selected was ${activeRoleTab}`);
      }

      // 3. Route to proper dashboard
      if (userProfile.role === 'PRINCIPAL') navigate(`/m/${tenant.slug}/principal`);
      else if (userProfile.role === 'TEACHER') navigate(`/m/${tenant.slug}/teacher`);
      else if (userProfile.role === 'PARENT') navigate(`/m/${tenant.slug}/parent`);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await authService.sendPasswordReset(email);
      setResetSent(true);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
      setError(msg);
    }
  };

  if (loadingTenant || (!tenant && tenantSlug && !tenantError)) {
    return <LoadingScreen message="Loading Madrasa Portal..." />;
  }

  if (tenantError || (!tenant && tenantSlug)) {
    return <TenantNotFound slug={tenantSlug || 'unknown'} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7F5F2',
      padding: '24px 16px'
    }}>
      {user?.role === 'SUPER_ADMIN' && (
        <div style={{
          maxWidth: '440px',
          width: '100%',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#1E40AF'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>⚡ You are logged in as Super Admin</div>
          <div style={{ color: '#3B82F6', fontSize: '12px', marginBottom: '10px' }}>
            You can inspect this Madrasa's portal or logout to test Principal/Teacher/Parent logins.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => navigate(`/m/${tenant?.slug}/principal`)} 
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#2563EB', border: 'none', fontSize: '12px' }}
            >
              Inspect Principal Portal
            </button>
            <button 
              onClick={async () => { await authService.logout(); window.location.reload(); }} 
              className="btn btn-outline btn-sm"
              style={{ borderColor: '#93C5FD', color: '#1E40AF', fontSize: '12px' }}
            >
              Logout Super Admin
            </button>
          </div>
        </div>
      )}

      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '36px 28px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
        border: '1px solid #E2DDD5'
      }}>
        {/* Madrasa Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: primaryColor,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            fontSize: '28px',
            fontWeight: 'bold',
            boxShadow: `0 8px 20px ${primaryColor}33`
          }}>
            {tenant?.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }} />
            ) : (
              <Building2 size={32} />
            )}
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0 }}>
            {tenant?.name}
          </h1>
          <div style={{ fontSize: '13px', fontWeight: 600, color: primaryColor, marginTop: '4px' }}>
            Madrasa Management Portal
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
            Powered by <strong>iLmiFa Core</strong>
          </div>
        </div>

        {/* Role Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4px',
          backgroundColor: '#F3F4F6',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setActiveRoleTab('PRINCIPAL')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: activeRoleTab === 'PRINCIPAL' ? 600 : 500,
              backgroundColor: activeRoleTab === 'PRINCIPAL' ? '#FFFFFF' : 'transparent',
              color: activeRoleTab === 'PRINCIPAL' ? primaryColor : '#6B7280',
              boxShadow: activeRoleTab === 'PRINCIPAL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <ShieldCheck size={14} />
            <span>Principal</span>
          </button>

          <button
            onClick={() => setActiveRoleTab('TEACHER')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: activeRoleTab === 'TEACHER' ? 600 : 500,
              backgroundColor: activeRoleTab === 'TEACHER' ? '#FFFFFF' : 'transparent',
              color: activeRoleTab === 'TEACHER' ? primaryColor : '#6B7280',
              boxShadow: activeRoleTab === 'TEACHER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <UserCheck size={14} />
            <span>Teacher</span>
          </button>

          <button
            onClick={() => setActiveRoleTab('PARENT')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: activeRoleTab === 'PARENT' ? 600 : 500,
              backgroundColor: activeRoleTab === 'PARENT' ? '#FFFFFF' : 'transparent',
              color: activeRoleTab === 'PARENT' ? primaryColor : '#6B7280',
              boxShadow: activeRoleTab === 'PARENT' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <HeartHandshake size={14} />
            <span>Parent</span>
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {resetSent && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', marginBottom: '16px' }}>
            ✓ Password reset email sent to your address.
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#252525' }}>
              {activeRoleTab === 'PRINCIPAL' ? 'Principal Email' : activeRoleTab === 'TEACHER' ? 'Teacher Email' : 'Parent Login Email'}
            </label>
            <input 
              type="email"
              className="input-field"
              placeholder={activeRoleTab === 'PRINCIPAL' ? 'principal@madrasa.org' : activeRoleTab === 'TEACHER' ? 'teacher@madrasa.org' : 'parent@gmail.com'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#252525' }}>
                Password
              </label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, color: primaryColor, fontSize: '12px' }}
              >
                Forgot Password?
              </button>
            </div>
            <input 
              type="password"
              className="input-field"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary btn-full btn-lg" 
            style={{ marginTop: '8px', backgroundColor: primaryColor }}
          >
            {loading ? 'Authenticating...' : `LOGIN AS ${activeRoleTab}`}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* PWA Installation Card */}
        <InstallPwaCard />
      </div>
    </div>
  );
};
