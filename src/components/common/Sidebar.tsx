import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { moduleService } from '../../services/moduleService';
import { MadrasaModule } from '../../types';
import { 
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
  FileText, 
  Award, 
  Bell, 
  Clock, 
  BookOpen,
  Calendar
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenantSlug || tenant?.slug || '';

  if (!user) return null;

  const isModuleActive = (mod: MadrasaModule) => {
    return moduleService.isModuleEnabled(tenant, mod);
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#7B2525' : '#4B5563',
    backgroundColor: isActive ? 'rgba(123, 37, 37, 0.08)' : 'transparent',
    transition: 'all 0.15s ease',
    marginBottom: '2px',
    textDecoration: 'none'
  });

  return (
    <aside className="desktop-only" style={{
      width: '240px',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <nav style={{ flex: 1 }}>
        {/* SUPER ADMIN NAVIGATION */}
        {user.role === 'SUPER_ADMIN' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
              Platform Core
            </div>
            <NavLink to="/core/dashboard" style={linkStyle}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/core/madrasas" style={linkStyle}>
              <Building size={18} />
              <span>Madrasas</span>
            </NavLink>
            <NavLink to="/core/domains" style={linkStyle}>
              <Globe size={18} />
              <span>Domains</span>
            </NavLink>
            <NavLink to="/core/users" style={linkStyle}>
              <Users size={18} />
              <span>All Users</span>
            </NavLink>
            <NavLink to="/core/settings" style={linkStyle}>
              <Settings size={18} />
              <span>Platform Settings</span>
            </NavLink>
          </div>
        )}

        {/* PRINCIPAL NAVIGATION */}
        {user.role === 'PRINCIPAL' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
              Madrasa Admin
            </div>
            <NavLink to={`/m/${tenantSlug}/principal`} end style={linkStyle}>
              <LayoutDashboard size={18} />
              <span>Home</span>
            </NavLink>
            <NavLink to={`/m/${tenantSlug}/principal/classes`} style={linkStyle}>
              <BookOpen size={18} />
              <span>Classes</span>
            </NavLink>
            {isModuleActive('students') && (
              <NavLink to={`/m/${tenantSlug}/principal/students`} style={linkStyle}>
                <GraduationCap size={18} />
                <span>Students</span>
              </NavLink>
            )}
            {isModuleActive('teachers') && (
              <NavLink to={`/m/${tenantSlug}/principal/teachers`} style={linkStyle}>
                <UserCheck size={18} />
                <span>Teachers</span>
              </NavLink>
            )}
            {isModuleActive('parents') && (
              <NavLink to={`/m/${tenantSlug}/principal/parents`} style={linkStyle}>
                <HeartHandshake size={18} />
                <span>Parents</span>
              </NavLink>
            )}
            {isModuleActive('attendance') && (
              <>
                <NavLink to={`/m/${tenantSlug}/principal/attendance`} style={linkStyle}>
                  <CalendarCheck size={18} />
                  <span>Attendance</span>
                </NavLink>
                <NavLink to={`/m/${tenantSlug}/principal/holidays`} style={linkStyle}>
                  <Calendar size={18} />
                  <span>Holidays</span>
                </NavLink>
              </>
            )}
            {isModuleActive('fees') && (
              <NavLink to={`/m/${tenantSlug}/principal/fees`} style={linkStyle}>
                <CreditCard size={18} />
                <span>Fees</span>
              </NavLink>
            )}
            {isModuleActive('exams') && (
              <NavLink to={`/m/${tenantSlug}/principal/exams`} style={linkStyle}>
                <Award size={18} />
                <span>Exams & Results</span>
              </NavLink>
            )}
            {isModuleActive('notices') && (
              <NavLink to={`/m/${tenantSlug}/principal/notices`} style={linkStyle}>
                <Bell size={18} />
                <span>Notices</span>
              </NavLink>
            )}
            {isModuleActive('timetable') && (
              <NavLink to={`/m/${tenantSlug}/principal/timetable`} style={linkStyle}>
                <Clock size={18} />
                <span>Timetable</span>
              </NavLink>
            )}
          </div>
        )}

        {/* TEACHER NAVIGATION */}
        {user.role === 'TEACHER' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
              Teacher Portal
            </div>
            <NavLink to={`/m/${tenantSlug}/teacher`} end style={linkStyle}>
              <LayoutDashboard size={18} />
              <span>Home</span>
            </NavLink>
            <NavLink to={`/m/${tenantSlug}/teacher/students`} style={linkStyle}>
              <GraduationCap size={18} />
              <span>My Students</span>
            </NavLink>
            {isModuleActive('attendance') && (
              <NavLink to={`/m/${tenantSlug}/teacher/attendance`} style={linkStyle}>
                <CalendarCheck size={18} />
                <span>Mark Attendance</span>
              </NavLink>
            )}
            {isModuleActive('results') && (
              <NavLink to={`/m/${tenantSlug}/teacher/results`} style={linkStyle}>
                <Award size={18} />
                <span>Enter Marks</span>
              </NavLink>
            )}
            {isModuleActive('notices') && (
              <NavLink to={`/m/${tenantSlug}/teacher/notices`} style={linkStyle}>
                <Bell size={18} />
                <span>Notices</span>
              </NavLink>
            )}
            {isModuleActive('timetable') && (
              <NavLink to={`/m/${tenantSlug}/teacher/timetable`} style={linkStyle}>
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
            <NavLink to={`/m/${tenantSlug}/parent`} end style={linkStyle}>
              <LayoutDashboard size={18} />
              <span>Home</span>
            </NavLink>
            <NavLink to={`/m/${tenantSlug}/parent/children`} style={linkStyle}>
              <BookOpen size={18} />
              <span>My Children</span>
            </NavLink>
            {isModuleActive('fees') && (
              <NavLink to={`/m/${tenantSlug}/parent/fees`} style={linkStyle}>
                <CreditCard size={18} />
                <span>Fee Statements</span>
              </NavLink>
            )}
            {isModuleActive('results') && (
              <NavLink to={`/m/${tenantSlug}/parent/results`} style={linkStyle}>
                <Award size={18} />
                <span>Report Cards</span>
              </NavLink>
            )}
            {isModuleActive('notices') && (
              <NavLink to={`/m/${tenantSlug}/parent/notices`} style={linkStyle}>
                <Bell size={18} />
                <span>Notices</span>
              </NavLink>
            )}
            {isModuleActive('timetable') && (
              <NavLink to={`/m/${tenantSlug}/parent/timetable`} style={linkStyle}>
                <Clock size={18} />
                <span>Timetable</span>
              </NavLink>
            )}
          </div>
        )}
      </nav>

      {/* Footer info */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid #F3F4F6', fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>
        iLmiFa v2.4 SaaS Platform
      </div>
    </aside>
  );
};
