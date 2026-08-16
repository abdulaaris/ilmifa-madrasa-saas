import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { parentService } from '../../services/parentService';
import { attendanceService } from '../../services/attendanceService';
import { feeService } from '../../services/feeService';
import { examService } from '../../services/examService';
import { Student, FeeRecord, ExamResult } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { GraduationCap, Award, Users } from 'lucide-react';

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
  const [loadingChildMetrics, setLoadingChildMetrics] = useState(false);

  useEffect(() => {
    if (tenant?.id && user) {
      setLoading(true);

      Promise.all([
        studentService.getStudentsByTenant(tenant.id),
        parentService.getParentsByTenant(tenant.id)
      ]).then(([allStudents, parents]) => {
        // Find parent record matching current user UID or Email
        const parentRecord = parents.find(p => p.uid === user.uid || p.email.toLowerCase() === user.email.toLowerCase());

        // Collect all linked student IDs from both user profile and parent record
        const linkedIds = new Set<string>([
          ...(user.studentIds || []),
          ...(parentRecord?.studentIds || [])
        ]);

        const parentPhone = (user.phone || parentRecord?.mobile || '').replace(/\s+/g, '');
        const parentName = (user.displayName || parentRecord?.name || '').toLowerCase().trim();

        // Filter all students belonging to this parent
        const linked = allStudents.filter(s => {
          if (linkedIds.has(s.id)) return true;
          if (s.parentId && (s.parentId === user.uid || s.parentId === parentRecord?.id)) return true;
          if (parentPhone && s.parentPhone && s.parentPhone.replace(/\s+/g, '') === parentPhone) return true;
          if (parentName && s.parentName && s.parentName.toLowerCase().trim() === parentName) return true;
          return false;
        });

        setChildrenList(linked);

        if (linked.length > 0) {
          setSelectedChild(prev => {
            if (prev && linked.some(c => c.id === prev.id)) return prev;
            return linked[0];
          });
        } else {
          setSelectedChild(null);
        }
        setLoading(false);
      });
    }
  }, [tenant, user]);

  // Fetch unique metrics strictly per selected child
  useEffect(() => {
    if (tenant?.id && selectedChild?.id) {
      setLoadingChildMetrics(true);
      // Reset metrics immediately so previous child's metrics do not spill over
      setAttendanceSummary({ present: 0, absent: 0, total: 0, percentage: 100 });
      setChildFees([]);
      setChildResults([]);

      const targetStudentId = selectedChild.id;

      Promise.all([
        attendanceService.getStudentAttendance(tenant.id, targetStudentId),
        feeService.getFeesByStudent(tenant.id, targetStudentId),
        examService.getResultsByStudent(tenant.id, targetStudentId)
      ]).then(([att, fList, rList]) => {
        setAttendanceSummary(att);
        setChildFees(fList);
        setChildResults(rList);
        setLoadingChildMetrics(false);
      });
    }
  }, [tenant?.id, selectedChild?.id]);

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
              {tenant?.name} • Logged in as {user?.displayName || user?.email}
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading children details...</div>
          ) : childrenList.length > 0 ? (
            <div>
              {/* Child Switcher Pill Navigation Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Linked Children ({childrenList.length})
                  </div>
                  <div style={{ fontSize: '12px', color: '#7B2525', fontWeight: 600 }}>
                    Click child name to view unique report card & fees
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {childrenList.map(child => {
                    const isSelected = selectedChild?.id === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChild(child)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '999px',
                          border: `2px solid ${isSelected ? tenant?.branding?.primaryColor || '#7B2525' : '#E2DDD5'}`,
                          backgroundColor: isSelected ? tenant?.branding?.primaryColor || '#7B2525' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#252525',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: isSelected ? '0 4px 14px rgba(123, 37, 37, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <GraduationCap size={18} />
                        <span>{child.name}</span>
                        <span style={{ fontSize: '11px', opacity: 0.85, backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                          {child.classId}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedChild && (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Selected Child Details Banner */}
                  <div className="card" style={{ backgroundColor: '#FAF9F7', border: '1px solid #E2DDD5', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                        {selectedChild.name}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        Class: <strong>{selectedChild.classId}</strong> (Sec {selectedChild.section || 'A'}) • Student Code: <strong>{selectedChild.studentCode}</strong>
                      </div>
                    </div>
                    <span className="badge badge-active">Active Student</span>
                  </div>

                  {loadingChildMetrics ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#666' }}>Fetching reports for {selectedChild.name}...</div>
                  ) : (
                    <>
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

                      {/* Academic Report Cards */}
                      <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#252525', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={18} style={{ color: '#7B2525' }} />
                            <span>Academic Report Cards — {selectedChild.name}</span>
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
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
              <Users size={40} style={{ color: '#9CA3AF', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#252525', marginBottom: '6px' }}>
                No Linked Children Found
              </h3>
              <p style={{ color: '#666', fontSize: '13px', maxWidth: '420px', margin: '0 auto 16px', lineHeight: '1.5' }}>
                Your parent account is registered, but no student records are currently linked to your profile ({user?.email}).
              </p>
              <div style={{ fontSize: '12px', color: '#7B2525', fontWeight: 500 }}>
                Please ask the Madrasa Principal to link your children under Principal → Parents → Edit Parent.
              </div>
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
