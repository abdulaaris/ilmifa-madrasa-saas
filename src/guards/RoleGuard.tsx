import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user) return null;

  if (!allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#FFF', padding: '36px', borderRadius: '16px', border: '1px solid #E5E7EB', maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#252525', marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
            Your account role ({user.role}) does not have permission to view this section.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
