import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { parentService } from '../../services/parentService';
import { attendanceService } from '../../services/attendanceService';
import { feeService } from '../../services/feeService';
import { examService } from '../../services/examService';
import { holidayService } from '../../services/holidayService';
import { Student, FeeRecord, ExamResult } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { GraduationCap, Award, Users, CalendarCheck, CheckCircle2, XCircle, Clock, Calendar, BarChart2, Filter } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  
  // Attendance Filter States: 'daily' | 'monthly' | 'alltime'
  const [attMode, setAttMode] = useState<'daily' | 'monthly' | 'alltime'>('alltime');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // Child metrics
  const [attendanceSummary, setAttendanceSummary] = useState<{ 
    present: number; 
    absent: number; 
    late: number;
    total: number; 
    percentage: number;
    history: Array<{ date: string; status: 'present' | 'absent' | 'late' | 'holiday'; holidayTitle?: string }>;
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

  // --- ATTENDANCE FILTER CALCULATIONS ---

  // 1. Daily record for selectedDate
  const dailyRecord = attendanceSummary.history.find(h => h.date === selectedDate);

  // 2. Monthly records for selectedMonth (YYYY-MM)
  const monthlyRecords = attendanceSummary.history.filter(h => h.date.startsWith(selectedMonth));
  const monthlyPresent = monthlyRecords.filter(r => r.status === 'present').length;
  const monthlyAbsent = monthlyRecords.filter(r => r.status === 'absent').length;
  const monthlyLate = monthlyRecords.filter(r => r.status === 'late').length;
  const monthlyTotal = monthlyRecords.length;
  const monthlyPercentage = monthlyTotal > 0 ? Math.round(((monthlyPresent + (monthlyLate * 0.5)) / monthlyTotal) * 100) : 100;

  // 3. Academic Session 2026-27 Monthly Breakdown
  const academicSessionMonths = [
    { label: 'June 2026', key: '2026-06' },
    { label: 'July 2026', key: '2026-07' },
    { label: 'August 2026', key: '2026-08' },
    { label: 'September 2026', key: '2026-09' },
    { label: 'October 2026', key: '2026-10' },
    { label: 'November 2026', key: '2026-11' },
    { label: 'December 2026', key: '2026-12' },
    { label: 'January 2027', key: '2027-01' },
    { label: 'February 2027', key: '2027-02' },
    { label: 'March 2027', key: '2027-03' },
    { label: 'April 2027', key: '2027-04' },
    { label: 'May 2027', key: '2027-05' },
  ];

  const sessionMonthlyBreakdown = academicSessionMonths.map(m => {
    const logs = attendanceSummary.history.filter(h => h.date.startsWith(m.key));
    const pr = logs.filter(l => l.status === 'present').length;
    const ab = logs.filter(l => l.status === 'absent').length;
    const lt = logs.filter(l => l.status === 'late').length;
    const tot = logs.length;
    const pct = tot > 0 ? Math.round(((pr + (lt * 0.5)) / tot) * 100) : 0;
    return { ...m, total: tot, present: pr, absent: ab, late: lt, percentage: pct };
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '24px 20px 80px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0 }}>
              Parent Portal & Student Profiles
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
                  Select Child Profile ({childrenList.length})
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
                    <div style={{ padding: '36px', textAlign: 'center', color: '#666' }}>Fetching attendance & report metrics for {selectedChild.name}...</div>
                  ) : (
                    <>
                      {/* ENHANCED FEATURE: ATTENDANCE SECTION WITH DATE PICKER, MONTH PICKER, ALL TIME SLIDER */}
                      <div className="card" style={{ padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2DDD5', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                        
                        {/* Section Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #F3F4F6', paddingBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: 'rgba(123, 37, 37, 0.08)', color: '#7B2525', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CalendarCheck size={24} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                                Attendance Analytics & History
                              </h3>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                View Daily, Monthly, and All-Time (2026–27) attendance reports
                              </div>
                            </div>
                          </div>

                          {/* Mode Switcher Slider / Pill Buttons */}
                          <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: '10px', padding: '4px', border: '1px solid #E5E7EB' }}>
                            <button
                              type="button"
                              onClick={() => setAttMode('daily')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: attMode === 'daily' ? '#FFFFFF' : 'transparent',
                                color: attMode === 'daily' ? '#7B2525' : '#4B5563',
                                fontWeight: attMode === 'daily' ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: attMode === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Calendar size={14} />
                              <span>Daily</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttMode('monthly')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: attMode === 'monthly' ? '#FFFFFF' : 'transparent',
                                color: attMode === 'monthly' ? '#7B2525' : '#4B5563',
                                fontWeight: attMode === 'monthly' ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: attMode === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Filter size={14} />
                              <span>Monthly</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttMode('alltime')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: attMode === 'alltime' ? '#FFFFFF' : 'transparent',
                                color: attMode === 'alltime' ? '#7B2525' : '#4B5563',
                                fontWeight: attMode === 'alltime' ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: attMode === 'alltime' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <BarChart2 size={14} />
                              <span>All Time (2026–27)</span>
                            </button>
                          </div>
                        </div>

                        {/* MODE 1: DAILY VIEW (DATE PICKER) */}
                        {attMode === 'daily' && (
                          <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                Select Attendance Date:
                              </label>
                              <input 
                                type="date" 
                                className="input-field" 
                                value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)}
                                style={{ maxWidth: '200px' }}
                              />
                            </div>

                            <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#FAF9F7', border: '1px solid #E2DDD5' }}>
                              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                                Daily Status for Date: <strong>{selectedDate}</strong>
                              </div>

                              {holidayService.isFriday(selectedDate) || dailyRecord?.status === 'holiday' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', width: '100%' }}>
                                  <span style={{ fontSize: '20px' }}>🕌</span>
                                  <span>{dailyRecord?.holidayTitle || 'Weekly Friday (Jummah) Holiday'} — Excused for all students.</span>
                                </div>
                              ) : dailyRecord ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  {dailyRecord.status === 'present' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', width: '100%' }}>
                                      <CheckCircle2 size={24} />
                                      <span>✓ Present on {selectedDate}</span>
                                    </div>
                                  )}
                                  {dailyRecord.status === 'absent' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#B91C1C', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', width: '100%' }}>
                                      <XCircle size={24} />
                                      <span>✕ Absent on {selectedDate}</span>
                                    </div>
                                  )}
                                  {dailyRecord.status === 'late' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#B45309', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', width: '100%' }}>
                                      <Clock size={24} />
                                      <span>⏰ Late Arrival on {selectedDate}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ padding: '16px', backgroundColor: '#FFF', borderRadius: '8px', border: '1px border #E5E7EB', color: '#6B7280', fontSize: '13px', textAlign: 'center' }}>
                                  ℹ️ No class attendance session recorded for <strong>{selectedDate}</strong>.
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* MODE 2: MONTHLY VIEW (MONTH PICKER) */}
                        {attMode === 'monthly' && (
                          <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                Select Attendance Month:
                              </label>
                              <input 
                                type="month" 
                                className="input-field" 
                                value={selectedMonth} 
                                onChange={e => setSelectedMonth(e.target.value)}
                                style={{ maxWidth: '220px' }}
                              />
                            </div>

                            {/* Monthly Overview Cards */}
                            <div className="stats-grid">
                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Monthly Rate</div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: monthlyPercentage >= 85 ? '#059669' : '#D97706', marginTop: '4px' }}>
                                  {monthlyPercentage}%
                                </div>
                              </div>

                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>Present Days</div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#065F46', marginTop: '4px' }}>
                                  {monthlyPresent}
                                </div>
                              </div>

                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#B91C1C', fontWeight: 600 }}>Absent Days</div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#991B1B', marginTop: '4px' }}>
                                  {monthlyAbsent}
                                </div>
                              </div>

                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#B45309', fontWeight: 600 }}>Late Days</div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#92400E', marginTop: '4px' }}>
                                  {monthlyLate}
                                </div>
                              </div>
                            </div>

                            {/* Monthly History Activity Log */}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
                                Daily Records for Month {selectedMonth} ({monthlyRecords.length} sessions)
                              </div>

                              {monthlyRecords.length === 0 ? (
                                <div style={{ padding: '16px', backgroundColor: '#FAF9F7', borderRadius: '8px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                                  No attendance logs found for month {selectedMonth}.
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                                  {monthlyRecords.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#252525' }}>
                                        📅 {h.date}
                                      </div>
                                      <div>
                                        {h.status === 'holiday' && (
                                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                            🕌 {h.holidayTitle || 'Friday Holiday'}
                                          </span>
                                        )}
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
                        )}

                        {/* MODE 3: ALL TIME (2026-27 ACADEMIC SESSION SLIDER REPORT) */}
                        {attMode === 'alltime' && (
                          <div style={{ display: 'grid', gap: '20px' }}>
                            {/* Academic Year 2026-27 Banner */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px', backgroundColor: 'rgba(123, 37, 37, 0.05)', border: '1px solid rgba(123, 37, 37, 0.15)' }}>
                              <div>
                                <span className="badge badge-active" style={{ fontSize: '11px', marginBottom: '4px' }}>Academic Session 2026–2027</span>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#252525', margin: 0 }}>
                                  All-Time Attendance Performance
                                </h4>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                  Cumulative academic year attendance statistics for {selectedChild.name}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: attendanceSummary.percentage >= 85 ? '#059669' : attendanceSummary.percentage >= 75 ? '#D97706' : '#DC2626' }}>
                                  {attendanceSummary.percentage}%
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>Cumulative Rate</div>
                              </div>
                            </div>

                            {/* Attendance Counters Grid */}
                            <div className="stats-grid">
                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <CheckCircle2 size={14} />
                                  <span>Present Days</span>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#065F46', marginTop: '4px' }}>
                                  {attendanceSummary.present} <span style={{ fontSize: '12px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>

                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <XCircle size={14} />
                                  <span>Absent Days</span>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#991B1B', marginTop: '4px' }}>
                                  {attendanceSummary.absent} <span style={{ fontSize: '12px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>

                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <Clock size={14} />
                                  <span>Late Days</span>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#92400E', marginTop: '4px' }}>
                                  {attendanceSummary.late} <span style={{ fontSize: '12px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>
                            </div>

                            {/* Monthly Session Breakdown Slider / List for 2026-27 */}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>
                                Academic Session 2026–27 Monthly Breakdown
                              </div>

                              <div style={{ display: 'grid', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                                {sessionMonthlyBreakdown.map((m, idx) => (
                                  <div key={idx} style={{ padding: '12px 14px', backgroundColor: '#FAF9F7', borderRadius: '10px', border: '1px solid #E2DDD5' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>{m.label}</span>
                                      {m.total > 0 ? (
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: m.percentage >= 85 ? '#059669' : '#D97706' }}>
                                          {m.percentage}% ({m.present}/{m.total} Days Present)
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>No logs yet</span>
                                      )}
                                    </div>

                                    {/* Attendance Progress Bar */}
                                    <div style={{ height: '8px', width: '100%', backgroundColor: '#E5E7EB', borderRadius: '999px', overflow: 'hidden' }}>
                                      <div 
                                        style={{ 
                                          height: '100%', 
                                          width: `${m.total > 0 ? m.percentage : 0}%`, 
                                          backgroundColor: m.percentage >= 85 ? '#059669' : m.percentage >= 75 ? '#D97706' : '#DC2626',
                                          borderRadius: '999px',
                                          transition: 'width 0.3s ease'
                                        }} 
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

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
