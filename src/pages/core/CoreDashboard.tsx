import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantService } from '../../services/tenantService';
import { userService } from '../../services/userService';
import { MadrasaTenant, UserProfile } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { CreateMadrasaModal } from '../../components/superadmin/CreateMadrasaModal';
import { Building2, Plus, Globe, Users, GraduationCap, UserCheck, HeartHandshake, ExternalLink } from 'lucide-react';

export const CoreDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<MadrasaTenant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    const [tList, uList] = await Promise.all([
      tenantService.getAllTenants(),
      userService.getAllUsers()
    ]);
    setTenants(tList);
    setUsers(uList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalMadrasas = tenants.length;
  const activeMadrasas = tenants.filter(t => t.status === 'active').length;
  const trialMadrasas = tenants.filter(t => t.status === 'trial').length;
  const suspendedMadrasas = tenants.filter(t => t.status === 'suspended').length;

  const totalStudents = users.filter(u => u.role === 'PARENT').reduce((acc, curr) => acc + (curr.studentIds?.length || 1), 0);
  const totalTeachers = users.filter(u => u.role === 'TEACHER').length;
  const totalParents = users.filter(u => u.role === 'PARENT').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />
      
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Platform Overview
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Central iLmiFa Core SaaS metrics and tenant control
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus size={18} />
                <span>Create Madrasa</span>
              </button>
              <button onClick={() => navigate('/core/madrasas')} className="btn btn-outline">
                <Building2 size={18} />
                <span>Manage Madrasas</span>
              </button>
              <button onClick={() => navigate('/core/domains')} className="btn btn-outline">
                <Globe size={18} />
                <span>Domains</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div className="card">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Madrasas</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#7B2525', marginTop: '4px' }}>{totalMadrasas}</div>
            </div>

            <div className="card">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Madrasas</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{activeMadrasas}</div>
            </div>

            <div className="card">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trial Madrasas</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>{trialMadrasas}</div>
            </div>

            <div className="card">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suspended</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>{suspendedMadrasas}</div>
            </div>

            <div className="card">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Students</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#252525', marginTop: '4px' }}>{totalStudents}</div>
            </div>

            <div className="card">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Teachers</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#252525', marginTop: '4px' }}>{totalTeachers}</div>
            </div>

            <div className="card">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Parents</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#252525', marginTop: '4px' }}>{totalParents}</div>
            </div>
          </div>

          {/* Recent Madrasas Table */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#252525', margin: 0 }}>
                Recent Madrasa Tenants
              </h3>
              <button onClick={() => navigate('/core/madrasas')} className="btn btn-ghost btn-sm" style={{ color: '#7B2525', fontWeight: 600 }}>
                View All →
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#666' }}>Loading Madrasa tenants...</div>
            ) : tenants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏫</div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#252525', marginBottom: '6px' }}>No Madrasas Registered Yet</h4>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                  Create your first Madrasa tenant to start onboarding Principal & Teacher accounts.
                </p>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                  <Plus size={16} />
                  <span>Create First Madrasa</span>
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tenant ID</th>
                      <th>Madrasa Name</th>
                      <th>Slug & Portal</th>
                      <th>Principal</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.slice(0, 5).map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace', color: '#7B2525' }}>{t.id}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#252525' }}>{t.name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{t.phone}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>/m/{t.slug}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{t.principalName}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>{t.principalEmail}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${t.status}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          <a 
                            href={`/m/${t.slug}/login`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ gap: '4px', textDecoration: 'none' }}
                          >
                            <ExternalLink size={14} />
                            <span>Customer Portal</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />

      {/* Modal */}
      <CreateMadrasaModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};
