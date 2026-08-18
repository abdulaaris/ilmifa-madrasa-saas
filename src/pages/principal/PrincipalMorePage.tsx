import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { academicYearService } from '../../services/academicYearService';
import { AcademicYear } from '../../types';
import { 
  CalendarRange, 
  Settings, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const PrincipalMorePage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenantSlug || tenant?.slug || '';

  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      academicYearService.getActiveAcademicYear(tenant.id).then(y => setActiveYear(y));
    }
  }, [tenant?.id]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '24px 16px 80px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          
          {/* HEADER */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={22} style={{ color: '#7B2525' }} />
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0 }}>
                More Settings
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: '#666666', marginTop: '2px' }}>
              {tenant?.name} • Institutional Configuration & Modules
            </p>
          </div>

          {/* COMPACT ACADEMIC YEAR CARD (SMALL & SLEEK) */}
          <div style={{ display: 'grid', gap: '14px' }}>
            <Link 
              to={`/m/${tenantSlug}/principal/academic-year`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div 
                className="card" 
                style={{ 
                  padding: '16px 20px', 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '16px', 
                  border: '1px solid #E5E7EB', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#7B2525';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(123, 37, 37, 0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div 
                    style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '12px', 
                      backgroundColor: 'rgba(123, 37, 37, 0.08)', 
                      color: '#7B2525', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <CalendarRange size={22} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                        Academic Year
                      </h3>
                      <span className="badge badge-active" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {activeYear?.name || '2026–2027'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Manage session From & To dates, set active year & new academic sessions
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7B2525', fontWeight: 600, fontSize: '13px', flexShrink: 0 }}>
                  <span className="desktop-only">Manage</span>
                  <ChevronRight size={18} />
                </div>
              </div>
            </Link>
          </div>

        </main>
      </div>

      <MobileNav />
    </div>
  );
};
