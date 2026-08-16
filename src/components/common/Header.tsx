import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { LogOut, User, Building2, Shield, Menu } from 'lucide-react';
import { MobileDrawer } from './MobileDrawer';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const primaryColor = tenant?.branding?.primaryColor || '#7B2525';

  return (
    <>
      <header style={{
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        {/* Left Side: Hamburger Menu Toggle + Brand / Madrasa Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile Left Drawer Toggle Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151',
              transition: 'background 0.15s ease'
            }}
            title="Open Mobile Navigation Menu"
            aria-label="Open Mobile Navigation Menu"
          >
            <Menu size={20} />
          </button>

          {user?.role === 'SUPER_ADMIN' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#7B2525',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px'
              }}>
                iF
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#252525', lineHeight: 1.1 }}>iLmiFa Core</div>
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Super Admin Platform</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {tenant?.branding?.logoUrl ? (
                <img src={tenant.branding.logoUrl} alt={tenant.name} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: primaryColor,
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Building2 size={18} />
                </div>
              )}
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#252525', lineHeight: 1.1 }}>
                  {tenant?.name || 'Madrasa Portal'}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{tenant?.id}</span> • <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{user?.role.toLowerCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-only">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4B5563'
            }}>
              {user?.role === 'SUPER_ADMIN' ? <Shield size={16} /> : <User size={16} />}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{user?.displayName || user?.email}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{user?.email}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ gap: '6px', color: '#DC2626', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}
            title="Sign out of iLmiFa"
          >
            <LogOut size={14} />
            <span className="desktop-only">Logout</span>
          </button>
        </div>
      </header>

      {/* Smooth Mobile Drawer Component */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
};
