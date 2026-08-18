import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { 
  Home, 
  GraduationCap, 
  CalendarCheck, 
  Bell, 
  Award, 
  CreditCard, 
  Building, 
  Globe, 
  Users, 
  BookOpen,
  MoreHorizontal
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenantSlug || tenant?.slug || '';

  if (!user) return null;

  const itemStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#7B2525' : '#6B7280',
    textDecoration: 'none',
    flex: 1,
    padding: '6px 0'
  });

  return (
    <nav className="mobile-only" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 50,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      {/* SUPER ADMIN MOBILE NAV */}
      {user.role === 'SUPER_ADMIN' && (
        <>
          <NavLink to="/core/dashboard" style={itemStyle}>
            <Home size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/core/madrasas" style={itemStyle}>
            <Building size={18} />
            <span>Madrasas</span>
          </NavLink>
          <NavLink to="/core/domains" style={itemStyle}>
            <Globe size={18} />
            <span>Domains</span>
          </NavLink>
          <NavLink to="/core/users" style={itemStyle}>
            <Users size={18} />
            <span>Users</span>
          </NavLink>
        </>
      )}

      {/* PRINCIPAL MOBILE NAV */}
      {user.role === 'PRINCIPAL' && (
        <>
          <NavLink to={`/m/${tenantSlug}/principal`} end style={itemStyle}>
            <Home size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/principal/students`} style={itemStyle}>
            <GraduationCap size={18} />
            <span>Students</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/principal/attendance`} style={itemStyle}>
            <CalendarCheck size={18} />
            <span>Attendance</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/principal/notices`} style={itemStyle}>
            <Bell size={18} />
            <span>Notices</span>
          </NavLink>
        </>
      )}

      {/* TEACHER MOBILE NAV */}
      {user.role === 'TEACHER' && (
        <>
          <NavLink to={`/m/${tenantSlug}/teacher`} end style={itemStyle}>
            <Home size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/teacher/students`} style={itemStyle}>
            <GraduationCap size={18} />
            <span>Students</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/teacher/attendance`} style={itemStyle}>
            <CalendarCheck size={18} />
            <span>Attendance</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/teacher/results`} style={itemStyle}>
            <Award size={18} />
            <span>Results</span>
          </NavLink>
        </>
      )}

      {/* PARENT MOBILE NAV */}
      {user.role === 'PARENT' && (
        <>
          <NavLink to={`/m/${tenantSlug}/parent`} end style={itemStyle}>
            <Home size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/parent/children`} style={itemStyle}>
            <BookOpen size={18} />
            <span>Children</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/parent/results`} style={itemStyle}>
            <Award size={18} />
            <span>Results</span>
          </NavLink>
          <NavLink to={`/m/${tenantSlug}/parent/fees`} style={itemStyle}>
            <CreditCard size={18} />
            <span>Fees</span>
          </NavLink>
        </>
      )}
    </nav>
  );
};
