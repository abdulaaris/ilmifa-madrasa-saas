import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { Student } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { GraduationCap, CalendarCheck, Award, Bell, BookOpen } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.tenantSlug || tenant?.slug || '';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id) {
      studentService.getStudentsByTenant(tenant.id).then(list => {
        setStudents(list);
        setLoading(false);
      });
    }
  }, [tenant]);

  const assignedClasses = user?.assignedClasses || [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
              Welcome, {user?.displayName || 'Teacher'}
            </h1>
            <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
              Teacher Portal • {tenant?.name}
            </p>
          </div>

          {/* Quick Action Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div 
              onClick={() => navigate(`/m/${slug}/teacher/attendance`)}
              className="card" 
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(123, 37, 37, 0.1)', color: '#7B2525', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <CalendarCheck size={22} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#252525', margin: 0 }}>Mark Attendance</h3>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Take daily class attendance</p>
            </div>

            <div 
              onClick={() => navigate(`/m/${slug}/teacher/results`)}
              className="card" 
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Award size={22} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#252525', margin: 0 }}>Enter Exam Marks</h3>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Record grades & scores</p>
            </div>

            <div 
              onClick={() => navigate(`/m/${slug}/teacher/students`)}
              className="card" 
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <GraduationCap size={22} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#252525', margin: 0 }}>My Class Roster</h3>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>View assigned students</p>
            </div>
          </div>

          {/* Assigned Classes */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#252525', marginBottom: '16px' }}>
              My Assigned Classes ({assignedClasses.length})
            </h3>
            {assignedClasses.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#FAF9F7', borderRadius: '8px', color: '#666', fontSize: '13px', textAlign: 'center' }}>
                No classes currently assigned to your account by the Principal.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {assignedClasses.map((cls, idx) => (
                  <div key={idx} style={{ padding: '16px', backgroundColor: '#FAF9F7', border: '1px solid #E2DDD5', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BookOpen size={24} style={{ color: '#7B2525' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#252525', fontSize: '15px' }}>{cls}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Active Academic Class</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
