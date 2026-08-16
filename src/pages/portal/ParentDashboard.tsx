import React, { useEffect, useState } from 'react';
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
import { GraduationCap, Award, Users, CalendarCheck, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  
  // Child metrics
  const [attendanceSummary, setAttendanceSummary] = useState<{ 
    present: number; 
    absent: number; 
    late: number;
    total: number; 
    percentage: number;
    history: Array<{ date: string; status: 'present' | 'absent' | 'late' }>;
  }>({ present: 0, absent: 0, late: 0, total: 0, percentage: 100, history: [] });

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
      // Reset metrics immediately
      setAttendanceSummary({ present: 0, absent: 0, late: 0, total: 0, percentage: 100, history: [] });
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

        <main style={{ flex: 1, padding: '24px 20px 80px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
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
              {/* Child Switcher Navigation */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Linked Children ({childrenList.length})
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
                <div style={{ display: 'grid', gap: '20px' }}>
                  {/* Selected Child Details Banner */}
                  <div className="card" style={{ backgroundColor: '#FFF', border: '1px solid #E2DDD5', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    <div style={{ padding: '36px', textAlign: 'center', color: '#666' }}>Fetching attendance status for {selectedChild.name}...</div>
                  ) : (
                    <>
                      {/* MAIN FEATURE: ATTENDANCE STATUS CARD (NO TABS) */}
                      <div className="card" style={{ padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2DDD5', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CalendarCheck size={22} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#252525', margin: 0 }}>
                                Attendance Status
                              </h3>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>
                                Overall attendance record for {selectedChild.name}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: attendanceSummary.percentage >= 85 ? '#059669' : attendanceSummary.percentage >= 75 ? '#D97706' : '#DC2626' }}>
                              {attendanceSummary.percentage}%
                            </div>
                            <span className={`badge badge-${attendanceSummary.percentage >= 85 ? 'active' : attendanceSummary.percentage >= 75 ? 'trial' : 'suspended'}`} style={{ fontSize: '11px' }}>
                              {attendanceSummary.percentage >= 85 ? 'Excellent Regularity' : attendanceSummary.percentage >= 75 ? 'Satisfactory' : 'Low Attendance'}
                            </span>
                          </div>
                        </div>

                        {/* Attendance Counters Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} />
                              <span>Present</span>
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#065F46', marginTop: '4px' }}>
                              {attendanceSummary.present} <span style={{ fontSize: '12px', fontWeight: 400 }}>days</span>
                            </div>
                          </div>

                          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <XCircle size={14} />
                              <span>Absent</span>
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#991B1B', marginTop: '4px' }}>
                              {attendanceSummary.absent} <span style={{ fontSize: '12px', fontWeight: 400 }}>days</span>
                            </div>
                          </div>

                          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <Clock size={14} />
                              <span>Late</span>
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#92400E', marginTop: '4px' }}>
                              {attendanceSummary.late} <span style={{ fontSize: '12px', fontWeight: 400 }}>days</span>
                            </div>
                          </div>
                        </div>

                        {/* Recent Date-wise Attendance History Log */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
                            Recent Attendance Activity Log
                          </div>

                          {attendanceSummary.history.length === 0 ? (
                            <div style={{ padding: '16px', backgroundColor: '#FAF9F7', borderRadius: '8px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                              No daily attendance records logged for {selectedChild.name} yet.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                              {attendanceSummary.history.map((h, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#252525' }}>
                                    📅 {h.date}
                                  </div>
                                  <div>
                                    {h.status === 'present' && (
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                        ✓ Present
                                      </span>
                                    )}
                                    {h.status === 'absent' && (
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                                        ✕ Absent
                                      </span>
                                    )}
                                    {h.status === 'late' && (
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', backgroundColor: '#FFFBEB', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                                        ⏰ Late Arrival
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fee Dues Summary Card */}
                      <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Tuition Fee Dues</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: totalDues > 0 ? '#DC2626' : '#059669', marginTop: '2px' }}>
                              ₹{totalDues.toLocaleString()}
                            </div>
                          </div>
                          <span className={`badge badge-${totalDues > 0 ? 'suspended' : 'active'}`}>
                            {totalDues > 0 ? 'Pending Payment' : 'All Settled'}
                          </span>
                        </div>
                      </div>

                      {/* Academic Report Cards Summary */}
                      <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#252525', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={18} style={{ color: '#7B2525' }} />
                            <span>Academic Report Cards ({childResults.length})</span>
                          </h4>
                        </div>

                        {childResults.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                            No exam report cards published yet.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {childResults.map(res => (
                              <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #E2DDD5' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>{res.examTitle}</div>
                                  <div style={{ fontSize: '11px', color: '#666' }}>{res.subject} • Marks: {res.obtainedMarks}/{res.maxMarks}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#7B2525' }}>Grade {res.grade}</div>
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
