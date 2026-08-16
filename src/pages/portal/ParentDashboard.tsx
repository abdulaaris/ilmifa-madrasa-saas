import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { feeService } from '../../services/feeService';
import { examService } from '../../services/examService';
import { Student, FeeRecord, ExamResult } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { GraduationCap, CalendarCheck, CreditCard, Award, UserCheck, ChevronRight } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.tenantSlug || tenant?.slug || '';

  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  
  // Child metrics
  const [attendanceSummary, setAttendanceSummary] = useState<{ present: number; absent: number; total: number; percentage: number }>({ present: 0, absent: 0, total: 0, percentage: 100 });
  const [childFees, setChildFees] = useState<FeeRecord[]>([]);
  const [childResults, setChildResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id && user) {
      setLoading(true);
      studentService.getStudentsByTenant(tenant.id).then(allStudents => {
        // Filter ONLY linked children for this parent
        const parentStudentIds = user.studentIds || [];
        const linked = allStudents.filter(s => parentStudentIds.includes(s.id) || s.parentId === user.uid || parentStudentIds.length === 0);
        setChildrenList(linked);

        if (linked.length > 0) {
          setSelectedChild(linked[0]);
        }
        setLoading(false);
      });
    }
  }, [tenant, user]);

  useEffect(() => {
    if (tenant?.id && selectedChild) {
      Promise.all([
        attendanceService.getStudentAttendance(tenant.id, selectedChild.id),
        feeService.getFeesByStudent(tenant.id, selectedChild.id),
        examService.getResultsByStudent(tenant.id, selectedChild.id)
      ]).then(([att, fList, rList]) => {
        setAttendanceSummary(att);
        setChildFees(fList);
        setChildResults(rList);
      });
    }
  }, [tenant, selectedChild]);

  const totalDues = childFees.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '24px 20px 80px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0 }}>
              Parent Portal
            </h1>
            <p style={{ fontSize: '13px', color: '#666666', marginTop: '2px' }}>
              {tenant?.name}
            </p>
          </div>

          {/* Child Switcher Pill Navigation */}
          {childrenList.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Select Child
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {childrenList.map(child => {
                  const isSelected = selectedChild?.id === child.id;
                  return (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '999px',
                        border: `1px solid ${isSelected ? tenant?.branding?.primaryColor || '#7B2525' : '#E2DDD5'}`,
                        backgroundColor: isSelected ? tenant?.branding?.primaryColor || '#7B2525' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#252525',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: isSelected ? '0 4px 12px rgba(123, 37, 37, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <GraduationCap size={16} />
                      <span>{child.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedChild ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Selected Child Info Badge */}
              <div className="card" style={{ backgroundColor: '#FAF9F7', border: '1px solid #E2DDD5', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                    {selectedChild.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                    {selectedChild.classId} • Student Code: {selectedChild.studentCode}
                  </div>
                </div>
                <span className="badge badge-active">Active Student</span>
              </div>

              {/* Overview Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Attendance</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                    {attendanceSummary.percentage}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                    {attendanceSummary.present} Present / {attendanceSummary.absent} Absent
                  </div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Fee Dues</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: totalDues > 0 ? '#DC2626' : '#059669', marginTop: '4px' }}>
                    ₹{totalDues.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                    {totalDues > 0 ? 'Pending Payment' : 'All Settled'}
                  </div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Recent Exams</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: '#7B2525', marginTop: '4px' }}>
                    {childResults.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>Exam Records</div>
                </div>
              </div>

              {/* Latest Results Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#252525', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={18} style={{ color: '#7B2525' }} />
                    <span>Academic Report Cards</span>
                  </h4>
                </div>

                {childResults.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                    No exam results published yet for {selectedChild.name}.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {childResults.map(res => (
                      <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#FAF9F7', borderRadius: '10px', border: '1px solid #E2DDD5' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#252525' }}>{res.examTitle}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Subject: {res.subject} • Marks: {res.obtainedMarks}/{res.maxMarks}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#7B2525' }}>Grade {res.grade}</div>
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{res.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No children linked to your parent account yet. Please contact Madrasa administration.
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
