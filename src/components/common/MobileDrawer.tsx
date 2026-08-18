import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { moduleService } from '../../services/moduleService';
import { MadrasaModule } from '../../types';
import { 
  X, 
  LayoutDashboard, 
  Building, 
  Globe, 
  Users, 
  Settings, 
  GraduationCap, 
  UserCheck, 
  HeartHandshake, 
  CalendarCheck, 
  CreditCard, 
  Award, 
  Bell, 
  Clock, 
  BookOpen,
  Calendar,
  LogOut,
  Building2,
  Shield,
  User,
  History,
  MoreHorizontal
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();
  const params = useParams();
  const tenantSlug = params.tenantSlug || tenant?.slug || '';

  if (!user) return null;

  const isModuleActive = (mod: MadrasaModule) => {
    return moduleService.isModuleEnabled(tenant, mod);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#7B2525' : '#374151',
    backgroundColor: isActive ? 'rgba(123, 37, 37, 0.08)' : 'transparent',
    transition: 'all 0.15s ease',
    marginBottom: '4px',
    textDecoration: 'none'
  });

  const primaryColor = tenant?.branding?.primaryColor || '#7B2525';

  return (
    <>
      {/* Dark Overlay Backdrop - Touch anywhere to close */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease, visibility 0.25s ease'
        }}
      />

      {/* Left Slide-in Drawer */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '290px',
          maxWidth: '85vw',
          backgroundColor: '#FFFFFF',
          zIndex: 1001,
          boxShadow: isOpen ? '4px 0 24px rgba(0, 0, 0, 0.18)' : 'none',
          visibility: isOpen ? 'visible' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s ease',
          willChange: 'transform'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAF9F7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user.role === 'SUPER_ADMIN' ? (
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#7B2525', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
                iF
              </div>
            ) : tenant?.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: primaryColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} />
              </div>
            )}
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#252525', lineHeight: 1.1 }}>
                {user.role === 'SUPER_ADMIN' ? 'iLmiFa Core' : (tenant?.name || 'Madrasa Portal')}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'capitalize', marginTop: '2px' }}>
                {user.role.toLowerCase().replace('_', ' ')} Navigation
              </div>
            </div>
          </div>

          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer Scrollable Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {/* SUPER ADMIN CORE NAVIGATION (When on /core/*) */}
          {user.role === 'SUPER_ADMIN' && location.pathname.startsWith('/core') && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
                Platform Core
              </div>
              <NavLink to="/core/dashboard" onClick={onClose} style={linkStyle}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/core/madrasas" onClick={onClose} style={linkStyle}>
                <Building size={18} />
                <span>Madrasas Directory</span>
              </NavLink>
              <NavLink to="/core/domains" onClick={onClose} style={linkStyle}>
                <Globe size={18} />
                <span>Custom Domains</span>
              </NavLink>
              <NavLink to="/core/users" onClick={onClose} style={linkStyle}>
                <Users size={18} />
                <span>All Users</span>
              </NavLink>
              <NavLink to="/core/history" onClick={onClose} style={linkStyle}>
                <History size={18} />
                <span>Activity History</span>
              </NavLink>
              <NavLink to="/core/settings" onClick={onClose} style={linkStyle}>
                <Settings size={18} />
                <span>Platform Settings</span>
              </NavLink>
            </div>
          )}

          {/* SUPER ADMIN INSPECTION OR PRINCIPAL NAVIGATION (When on /m/:tenantSlug/*) */}
          {((user.role === 'SUPER_ADMIN' && location.pathname.startsWith('/m/')) || user.role === 'PRINCIPAL') && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
                {user.role === 'SUPER_ADMIN' ? '👑 Principal App (Admin Mode)' : 'Madrasa Admin'}
              </div>
              <NavLink to={`/m/${tenantSlug}/principal`} end onClick={onClose} style={linkStyle}>
                <LayoutDashboard size={18} />
                <span>Home</span>
              </NavLink>
              <NavLink to={`/m/${tenantSlug}/principal/classes`} onClick={onClose} style={linkStyle}>
                <BookOpen size={18} />
                <span>Classes Directory</span>
              </NavLink>
              <NavLink to={`/m/${tenantSlug}/principal/subjects`} onClick={onClose} style={linkStyle}>
                <BookOpen size={18} />
                <span>Subjects Directory</span>
              </NavLink>
              {isModuleActive('students') && (
                <NavLink to={`/m/${tenantSlug}/principal/students`} onClick={onClose} style={linkStyle}>
                  <GraduationCap size={18} />
                  <span>Students</span>
                </NavLink>
              )}
              {isModuleActive('teachers') && (
                <NavLink to={`/m/${tenantSlug}/principal/teachers`} onClick={onClose} style={linkStyle}>
                  <UserCheck size={18} />
                  <span>Teachers</span>
                </NavLink>
              )}
              {isModuleActive('parents') && (
                <NavLink to={`/m/${tenantSlug}/principal/parents`} onClick={onClose} style={linkStyle}>
                  <HeartHandshake size={18} />
                  <span>Parents</span>
                </NavLink>
              )}
              {isModuleActive('attendance') && (
                <>
                  <NavLink to={`/m/${tenantSlug}/principal/attendance`} onClick={onClose} style={linkStyle}>
                    <CalendarCheck size={18} />
                    <span>Daily Attendance</span>
                  </NavLink>
                  <NavLink to={`/m/${tenantSlug}/principal/holidays`} onClick={onClose} style={linkStyle}>
                    <Calendar size={18} />
                    <span>Holidays Calendar</span>
                  </NavLink>
                </>
              )}
              {isModuleActive('fees') && (
                <NavLink to={`/m/${tenantSlug}/principal/fees`} onClick={onClose} style={linkStyle}>
                  <CreditCard size={18} />
                  <span>Fee Invoices</span>
                </NavLink>
              )}
              {isModuleActive('exams') && (
                <NavLink to={`/m/${tenantSlug}/principal/exams`} onClick={onClose} style={linkStyle}>
                  <Award size={18} />
                  <span>Exams & Results</span>
                </NavLink>
              )}
              {isModuleActive('notices') && (
                <NavLink to={`/m/${tenantSlug}/principal/notices`} onClick={onClose} style={linkStyle}>
                  <Bell size={18} />
                  <span>Notices & Announcements</span>
                </NavLink>
              )}
              {isModuleActive('timetable') && (
                <NavLink to={`/m/${tenantSlug}/principal/timetable`} onClick={onClose} style={linkStyle}>
                  <Clock size={18} />
                  <span>Timetable Schedule</span>
                </NavLink>
              )}
              <NavLink to={`/m/${tenantSlug}/principal/more`} onClick={onClose} style={linkStyle}>
                <MoreHorizontal size={18} />
                <span>More (Academic Year)</span>
              </NavLink>
            </div>
          )}

          {/* TEACHER NAVIGATION */}
          {user.role === 'TEACHER' && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
                Teacher Portal
              </div>
              <NavLink to={`/m/${tenantSlug}/teacher`} end onClick={onClose} style={linkStyle}>
                <LayoutDashboard size={18} />
                <span>Home</span>
              </NavLink>
              <NavLink to={`/m/${tenantSlug}/teacher/students`} onClick={onClose} style={linkStyle}>
                <GraduationCap size={18} />
                <span>My Students</span>
              </NavLink>
              {isModuleActive('attendance') && (
                <NavLink to={`/m/${tenantSlug}/teacher/attendance`} onClick={onClose} style={linkStyle}>
                  <CalendarCheck size={18} />
                  <span>Mark Attendance</span>
                </NavLink>
              )}
              {isModuleActive('results') && (
                <NavLink to={`/m/${tenantSlug}/teacher/results`} onClick={onClose} style={linkStyle}>
                  <Award size={18} />
                  <span>Enter Student Marks</span>
                </NavLink>
              )}
              {isModuleActive('notices') && (
                <NavLink to={`/m/${tenantSlug}/teacher/notices`} onClick={onClose} style={linkStyle}>
                  <Bell size={18} />
                  <span>Notices</span>
                </NavLink>
              )}
              {isModuleActive('timetable') && (
                <NavLink to={`/m/${tenantSlug}/teacher/timetable`} onClick={onClose} style={linkStyle}>
                  <Clock size={18} />
                  <span>My Timetable</span>
                </NavLink>
              )}
            </div>
          )}

          {/* PARENT NAVIGATION */}
          {user.role === 'PARENT' && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
                Parent Portal
              </div>
              <NavLink to={`/m/${tenantSlug}/parent`} end onClick={onClose} style={linkStyle}>
                <LayoutDashboard size={18} />
                <span>Home</span>
              </NavLink>
              <NavLink to={`/m/${tenantSlug}/parent/children`} onClick={onClose} style={linkStyle}>
                <BookOpen size={18} />
                <span>My Children</span>
              </NavLink>
              {isModuleActive('fees') && (
                <NavLink to={`/m/${tenantSlug}/parent/fees`} onClick={onClose} style={linkStyle}>
                  <CreditCard size={18} />
                  <span>Fee Statements</span>
                </NavLink>
              )}
              {isModuleActive('results') && (
                <NavLink to={`/m/${tenantSlug}/parent/results`} onClick={onClose} style={linkStyle}>
                  <Award size={18} />
                  <span>Report Cards</span>
                </NavLink>
              )}
              {isModuleActive('notices') && (
                <NavLink to={`/m/${tenantSlug}/parent/notices`} onClick={onClose} style={linkStyle}>
                  <Bell size={18} />
                  <span>Notices</span>
                </NavLink>
              )}
              {isModuleActive('timetable') && (
                <NavLink to={`/m/${tenantSlug}/parent/timetable`} onClick={onClose} style={linkStyle}>
                  <Clock size={18} />
                  <span>Timetable</span>
                </NavLink>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer - Profile & Logout */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #E5E7EB',
          backgroundColor: '#FAF9F7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#F3F4F6',
              border: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4B5563'
            }}>
              {user.role === 'SUPER_ADMIN' ? <Shield size={18} /> : <User size={18} />}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.displayName || user.email}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-outline btn-full btn-sm"
            style={{ gap: '6px', color: '#DC2626', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
