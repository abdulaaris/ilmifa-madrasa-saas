import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/common/LoadingScreen';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const params = useParams();

  if (loading) {
    return <LoadingScreen message="Checking authentication state..." />;
  }

  if (!user) {
    // If accessing super admin core route -> redirect to /core/login
    if (location.pathname.startsWith('/core')) {
      return <Navigate to="/core/login" state={{ from: location }} replace />;
    }
    
    // If accessing tenant portal route -> redirect to /m/:tenantSlug/login
    const tenantSlug = params.tenantSlug;
    if (tenantSlug) {
      return <Navigate to={`/m/${tenantSlug}/login`} state={{ from: location }} replace />;
    }

    return <Navigate to="/core/login" replace />;
  }

  // Check if user status is suspended or inactive
  if (user.status === 'suspended' || user.status === 'inactive') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5F2', padding: '24px' }}>
        <div style={{ background: '#FFF', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px font-size 20px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#252525', marginBottom: '8px' }}>Account Suspended</h2>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
            Your account ({user.email}) is currently {user.status}. Please contact your Madrasa Principal or iLmiFa Platform Administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
