import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { parentService } from '../../services/parentService';
import { feeService } from '../../services/feeService';
import { Student, Teacher, Parent, FeeRecord } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { GraduationCap, UserCheck, HeartHandshake, CreditCard, Plus, CalendarCheck, Bell } from 'lucide-react';

export const PrincipalDashboard: React.FC = () => {
  const { tenant } = useTenant();
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.tenantSlug || tenant?.slug || '';

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id) {
      setLoading(true);
      Promise.all([
        studentService.getStudentsByTenant(tenant.id),
        teacherService.getTeachersByTenant(tenant.id),
        parentService.getParentsByTenant(tenant.id),
        feeService.getFeesByTenant(tenant.id)
      ]).then(([sList, tList, pList, fList]) => {
        setStudents(sList);
        setTeachers(tList);
        setParents(pList);
        setFees(fList);
        setLoading(false);
      });
    }
  }, [tenant]);

  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalParents = parents.length;
  const totalFeesCollected = fees.reduce((acc, curr) => acc + curr.paidAmount, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {tenant?.name} Dashboard
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Principal Control Panel • Tenant ID: {tenant?.id}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => navigate(`/m/${slug}/principal/students`)} className="btn btn-primary">
                <Plus size={16} />
                <span>Add Student</span>
              </button>
              <button onClick={() => navigate(`/m/${slug}/principal/teachers`)} className="btn btn-outline">
                <Plus size={16} />
                <span>Add Teacher</span>
              </button>
              <button onClick={() => navigate(`/m/${slug}/principal/attendance`)} className="btn btn-outline">
                <CalendarCheck size={16} />
                <span>Attendance</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', fontSize: '13px', fontWeight: 600 }}>
                <GraduationCap size={18} style={{ color: tenant?.branding?.primaryColor || '#7B2525' }} />
                <span>Total Students</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#252525', marginTop: '6px' }}>{totalStudents}</div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', fontSize: '13px', fontWeight: 600 }}>
                <UserCheck size={18} style={{ color: '#2563EB' }} />
                <span>Teachers</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#252525', marginTop: '6px' }}>{totalTeachers}</div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', fontSize: '13px', fontWeight: 600 }}>
                <HeartHandshake size={18} style={{ color: '#059669' }} />
                <span>Parents</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#252525', marginTop: '6px' }}>{totalParents}</div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', fontSize: '13px', fontWeight: 600 }}>
                <CreditCard size={18} style={{ color: '#D97706' }} />
                <span>Fees Collected</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669', marginTop: '6px' }}>
                ₹{totalFeesCollected.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Recent Students & Teachers Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Registered Students</h3>
                <button onClick={() => navigate(`/m/${slug}/principal/students`)} className="btn btn-ghost btn-sm" style={{ color: tenant?.branding?.primaryColor || '#7B2525' }}>
                  Manage →
                </button>
              </div>
              {students.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                  No students created yet. Click "+ Add Student" to start.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {students.slice(0, 4).map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #E2DDD5' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#252525' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{s.classId} • Parent: {s.parentName || 'N/A'}</div>
                      </div>
                      <span className="badge badge-active">{s.studentCode}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Madrasa Teachers</h3>
                <button onClick={() => navigate(`/m/${slug}/principal/teachers`)} className="btn btn-ghost btn-sm" style={{ color: tenant?.branding?.primaryColor || '#7B2525' }}>
                  Manage →
                </button>
              </div>
              {teachers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                  No teachers added yet. Click "+ Add Teacher" to start.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {teachers.slice(0, 4).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #E2DDD5' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#252525' }}>{t.name}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{t.email} • {t.mobile}</div>
                      </div>
                      <span className="badge badge-active">Teacher</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
