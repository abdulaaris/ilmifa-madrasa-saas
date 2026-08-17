import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { formatAuthErrorMessage } from '../../utils/authErrorUtils';
import { InstallPwaCard } from '../../components/common/InstallPwaCard';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { TenantNotFound } from './TenantNotFound';
import { UserRole } from '../../types';
import { Building2, ArrowRight, ShieldCheck, UserCheck, HeartHandshake } from 'lucide-react';

export const PortalLoginPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant, loadingTenant, tenantError, resolveTenant } = useTenant();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>('PRINCIPAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Secret 5-Tap Super Admin Access Override
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretEmail, setSecretEmail] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [secretLoading, setSecretLoading] = useState(false);
  const [secretError, setSecretError] = useState<string | null>(null);

  const handleLogoTap = () => {
    setLogoTapCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setShowSecretModal(true);
        setSecretError(null);
        return 0;
      }
      return next;
    });

    // Reset tap counter after 2 seconds of inactivity
    clearTimeout((window as any)._logoTapTimer);
    (window as any)._logoTapTimer = setTimeout(() => {
      setLogoTapCount(0);
    }, 2000);
  };

  const handleSecretAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretEmail || !secretPassword) {
      setSecretError('Please enter Super Admin Email and Password.');
      return;
    }
    setSecretLoading(true);
    setSecretError(null);

    try {
      const userProfile = await login(secretEmail, secretPassword);
      if (userProfile.role !== 'SUPER_ADMIN') {
        await authService.logout();
        setSecretError('Access Restricted. Only Super Admin credentials can unlock this secret override.');
        setSecretLoading(false);
        return;
      }
      // Super Admin authenticated! Navigate directly to this Madrasa's Principal Portal!
      setShowSecretModal(false);
      navigate(`/m/${tenant?.slug}/principal`);
    } catch (err: unknown) {
      setSecretError(formatAuthErrorMessage(err, 'iLmiFa Core Admin'));
      setSecretLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSlug) {
      resolveTenant(tenantSlug);
    }
  }, [tenantSlug, resolveTenant]);

  // If tenant user is already authenticated and matches tenant -> check role tab & redirect or show warning
  useEffect(() => {
    if (user && tenant && user.role !== 'SUPER_ADMIN') {
      if (user.tenantId === tenant.id) {
        if (user.role !== activeRoleTab) {
          // Role mismatch! Do not auto-navigate. Logout and set red error!
          const tabTitle = activeRoleTab.charAt(0) + activeRoleTab.slice(1).toLowerCase();
          const userRoleTitle = user.role.charAt(0) + user.role.slice(1).toLowerCase();
          authService.logout().then(() => {
            setError(`You are not a ${tabTitle}. Your account is registered as a ${userRoleTitle}. Please select the ${userRoleTitle} tab to log in.`);
          });
        } else {
          if (user.role === 'PRINCIPAL') navigate(`/m/${tenant.slug}/principal`);
          else if (user.role === 'TEACHER') navigate(`/m/${tenant.slug}/teacher`);
          else if (user.role === 'PARENT') navigate(`/m/${tenant.slug}/parent`);
        }
      }
    }
  }, [user, tenant, activeRoleTab, navigate]);

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

      // 2. Strict Role tab matching validation
      if (userProfile.role !== activeRoleTab) {
        await authService.logout();
        const tabTitle = activeRoleTab.charAt(0) + activeRoleTab.slice(1).toLowerCase();
        const userRoleTitle = userProfile.role.charAt(0) + userProfile.role.slice(1).toLowerCase();
        setError(`You are not a ${tabTitle}. Your account is registered as a ${userRoleTitle}. Please select the ${userRoleTitle} tab to log in.`);
        setLoading(false);
        return;
      }

      // 3. Route to proper dashboard
      if (userProfile.role === 'PRINCIPAL') navigate(`/m/${tenant.slug}/principal`);
      else if (userProfile.role === 'TEACHER') navigate(`/m/${tenant.slug}/teacher`);
      else if (userProfile.role === 'PARENT') navigate(`/m/${tenant.slug}/parent`);

    } catch (err: unknown) {
      const msg = formatAuthErrorMessage(err, tenant?.name);
      setError(msg);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your login Email address in the email field first.');
      return;
    }
    setLoading(true);
    setResetSent(false);
    try {
      await authService.sendPasswordReset(email.trim());
      setResetSent(true);
      setError(null);
    } catch (err: unknown) {
      console.warn('Password reset error:', err);
      const msg = formatAuthErrorMessage(err, tenant?.name);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingTenant || (!tenant && tenantSlug && !tenantError)) {
    return <LoadingScreen message="Loading Madrasa Portal..." />;
  }

  if (tenantError || (!tenant && tenantSlug)) {
    return <TenantNotFound slug={tenantSlug || 'unknown'} />;
  }

  if (tenant?.status === 'suspended') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: '#FFF', borderRadius: '20px', border: '1.5px solid #FCA5A5', padding: '36px 28px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(220, 38, 38, 0.1)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>
            🔒
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
            Madrasa Subscription Suspended
          </h2>
          <p style={{ fontSize: '14px', color: '#7F1D1D', marginBottom: '16px', lineHeight: 1.5 }}>
            Access to <strong>{tenant.name}</strong> portal has been automatically suspended.
          </p>
          {tenant.suspensionReason && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#B91C1C', fontSize: '12px', fontWeight: 600, marginBottom: '20px' }}>
              ⏱️ {tenant.suspensionReason}
            </div>
          )}
          <div style={{ padding: '14px', backgroundColor: '#FFF5F5', borderRadius: '12px', fontSize: '13px', color: '#991B1B', border: '1px solid #FECACA' }}>
            📞 Please contact <strong>iLmiFa Platform Administrator</strong> to renew or upgrade your Madrasa subscription.
          </div>
        </div>
      </div>
    );
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
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '36px 28px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
        border: '1px solid #E2DDD5'
      }}>
        {/* Madrasa Branding Header (5 Taps Triggers Secret Super Admin Access) */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            onClick={handleLogoTap}
            title="Double tap for Madrasa Portal"
            style={{
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
              boxShadow: `0 8px 20px ${primaryColor}33`,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.15s ease'
            }}
          >
            {tenant?.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }} />
            ) : (
              <Building2 size={32} />
            )}
          </div>

          <h1 
            onClick={handleLogoTap}
            style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0, cursor: 'pointer', userSelect: 'none' }}
          >
            {tenant?.name}
          </h1>
          <div style={{ fontSize: '13px', fontWeight: 600, color: primaryColor, marginTop: '4px' }}>
            Madrasa Management Portal
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
            Powered by <strong>iLmiFa Core</strong>
          </div>

          {logoTapCount > 0 && logoTapCount < 5 && (
            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 700, marginTop: '8px', animation: 'pulse 1s infinite' }}>
              ⚡ Secret Admin Access: {5 - logoTapCount} more taps...
            </div>
          )}
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
            onClick={() => { setActiveRoleTab('PRINCIPAL'); setError(null); }}
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
            onClick={() => { setActiveRoleTab('TEACHER'); setError(null); }}
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
            onClick={() => { setActiveRoleTab('PARENT'); setError(null); }}
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
          <div style={{ 
            padding: '14px 16px', 
            borderRadius: '12px', 
            backgroundColor: '#FEF2F2', 
            border: '1.5px solid #FCA5A5', 
            color: '#991B1B', 
            fontSize: '13px', 
            fontWeight: 600,
            lineHeight: 1.4,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {resetSent && (
          <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#ECFDF5', border: '1.5px solid #A7F3D0', color: '#065F46', fontSize: '13px', lineHeight: 1.4, marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>✓ Password Reset Link Dispatched!</div>
            <div>A password reset link was sent to <strong>{email}</strong>. Please check your <strong>Inbox and Spam / Junk folder</strong>.</div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#047857' }}>
              💡 <em>Can't access your email inbox? Your Principal can also reset your password directly from the Madrasa Admin Portal!</em>
            </div>
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

      {/* Secret Super Admin Access Modal (Triggered by 5 taps on Logo) */}
      {showSecretModal && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.75)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, 
            padding: '16px' 
          }}
        >
          <div 
            className="modal-card" 
            style={{ 
              backgroundColor: '#1E1E1E', 
              color: '#FFFFFF', 
              borderRadius: '24px', 
              maxWidth: '440px', 
              width: '100%', 
              padding: '28px', 
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)', 
              border: '1px solid #7B2525' 
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '16px', 
                  backgroundColor: '#7B2525', 
                  color: '#FFFFFF', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '12px',
                  boxShadow: '0 8px 20px rgba(123, 37, 37, 0.4)'
                }}
              >
                <ShieldCheck size={30} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#F3F4F6', margin: 0 }}>
                Super Admin Secret Override
              </h2>
              <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px', lineHeight: 1.4 }}>
                Authenticate as Super Admin to directly inspect and manage <strong>{tenant?.name}</strong>.
              </p>
            </div>

            {secretError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#450A0A', border: '1px solid #991B1B', color: '#FCA5A5', fontSize: '13px', marginBottom: '16px', lineHeight: 1.4 }}>
                ⚠️ {secretError}
              </div>
            )}

            <form onSubmit={handleSecretAdminLogin} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                  Super Admin Email
                </label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="admin@ilmifa.com" 
                  value={secretEmail} 
                  onChange={e => setSecretEmail(e.target.value)} 
                  required 
                  style={{ backgroundColor: '#2D2D2D', borderColor: '#404040', color: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                  Super Admin Password
                </label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••••••" 
                  value={secretPassword} 
                  onChange={e => setSecretPassword(e.target.value)} 
                  required 
                  style={{ backgroundColor: '#2D2D2D', borderColor: '#404040', color: '#FFF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowSecretModal(false)} 
                  className="btn btn-outline" 
                  style={{ borderColor: '#4B5563', color: '#D1D5DB', borderRadius: '12px', padding: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={secretLoading} 
                  className="btn btn-primary" 
                  style={{ backgroundColor: '#7B2525', borderColor: '#7B2525', color: '#FFF', borderRadius: '12px', padding: '12px', fontWeight: 700, boxShadow: '0 4px 14px rgba(123, 37, 37, 0.4)' }}
                >
                  {secretLoading ? 'Unlocking...' : '🔓 Unlock Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
