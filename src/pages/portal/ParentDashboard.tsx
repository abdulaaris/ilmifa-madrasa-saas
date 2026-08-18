import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { parentService } from '../../services/parentService';
import { attendanceService } from '../../services/attendanceService';
import { feeService } from '../../services/feeService';
import { examService } from '../../services/examService';
import { holidayService } from '../../services/holidayService';
import { noticeService } from '../../services/noticeService';
import { Student, FeeRecord, ExamResult, Notice } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { 
  GraduationCap, 
  Award, 
  Users, 
  CalendarCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  BarChart2, 
  Filter, 
  BookOpen, 
  CreditCard, 
  Sparkles, 
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  X
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const tenantSlug = params.tenantSlug || tenant?.slug || '';

  // Determine current active section from URL
  const getActiveTab = (): 'HOME' | 'CHILDREN' | 'RESULTS' => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/children')) return 'CHILDREN';
    if (path.includes('/results')) return 'RESULTS';
    return 'HOME';
  };

  const activeTab = getActiveTab();

  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [showChildPickerModal, setShowChildPickerModal] = useState(false);
  
  // Attendance Filter States: 'daily' | 'monthly' | 'alltime' (Default: 'monthly')
  const [attMode, setAttMode] = useState<'daily' | 'monthly' | 'alltime'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [clickedCalendarDate, setClickedCalendarDate] = useState<string | null>(null);

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
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [childrenStatsMap, setChildrenStatsMap] = useState<Record<string, { attendancePct: number; feeDue: number; resultsCount: number }>>({});
  
  const [loading, setLoading] = useState(true);
  const [loadingChildMetrics, setLoadingChildMetrics] = useState(false);

  useEffect(() => {
    if (tenant?.id && user) {
      setLoading(true);

      Promise.all([
        studentService.getStudentsByTenant(tenant.id),
        parentService.getParentsByTenant(tenant.id),
        noticeService.getNoticesByRole(tenant.id, 'PARENT')
      ]).then(async ([allStudents, parents, notices]) => {
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
        setRecentNotices(notices.slice(0, 3));

        if (linked.length > 0) {
          setSelectedChild(prev => {
            if (prev && linked.some(c => c.id === prev.id)) return prev;
            return linked[0];
          });

          // Fetch quick summary stats for all children for the Home page cards
          const statsMap: Record<string, { attendancePct: number; feeDue: number; resultsCount: number }> = {};
          await Promise.all(linked.map(async (ch) => {
            const [att, fees, res] = await Promise.all([
              attendanceService.getStudentAttendance(tenant.id, ch.id),
              feeService.getFeesByStudent(tenant.id, ch.id),
              examService.getResultsByStudent(tenant.id, ch.id)
            ]);
            const due = fees.reduce((acc, curr) => acc + curr.balance, 0);
            statsMap[ch.id] = {
              attendancePct: att.percentage,
              feeDue: due,
              resultsCount: res.length
            };
          }));
          setChildrenStatsMap(statsMap);
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

  const handleSelectChildAndNavigate = (child: Student, targetTab: 'children' | 'results') => {
    setSelectedChild(child);
    navigate(`/m/${tenantSlug}/parent/${targetTab}`);
  };

  const totalDues = childFees.reduce((acc, curr) => acc + curr.balance, 0);

  // --- ATTENDANCE FILTER CALCULATIONS ---
  const dailyRecord = attendanceSummary.history.find(h => h.date === selectedDate);
  const monthlyRecords = attendanceSummary.history.filter(h => h.date.startsWith(selectedMonth));
  const monthlyPresent = monthlyRecords.filter(r => r.status === 'present').length;
  const monthlyAbsent = monthlyRecords.filter(r => r.status === 'absent').length;
  const monthlyLate = monthlyRecords.filter(r => r.status === 'late').length;
  const monthlyTotal = monthlyRecords.length;
  const monthlyPercentage = monthlyTotal > 0 ? Math.round(((monthlyPresent + (monthlyLate * 0.5)) / monthlyTotal) * 100) : 100;

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr || '2026', 10);
    let m = parseInt(mStr || '8', 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
    setClickedCalendarDate(null);
  };

  const handleNextMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr || '2026', 10);
    let m = parseInt(mStr || '8', 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
    setClickedCalendarDate(null);
  };

  // Calendar Calculation for Current Selected Month
  const [selYearStr, selMonthStr] = selectedMonth.split('-');
  const selYear = parseInt(selYearStr || '2026', 10);
  const selMonthIdx = parseInt(selMonthStr || '8', 10) - 1;
  const currentMonthTitle = new Date(selYear, selMonthIdx, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(selYear, selMonthIdx, 1).getDay(); // 0: Sun, 1: Mon, ...
  const totalDaysInCurrentMonth = new Date(selYear, selMonthIdx + 1, 0).getDate();
  const todayDateStr = new Date().toISOString().substring(0, 10);

  // Clicked Day details
  const clickedRecord = clickedCalendarDate ? attendanceSummary.history.find(h => h.date === clickedCalendarDate) : null;
  const isClickedFriday = clickedCalendarDate ? (holidayService.isFriday(clickedCalendarDate) || new Date(clickedCalendarDate).getDay() === 5) : false;

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

  // Calculate Result summary metrics for Results Page
  const avgResultPercentage = childResults.length > 0 
    ? Math.round(childResults.reduce((sum, r) => sum + r.percentage, 0) / childResults.length) 
    : 0;

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
      case 'A': return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      case 'B': return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'C': return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'D': return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' };
      default: return { bg: '#FEF2F2', text: '#991B1B', border: '#FCA5A5' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '24px 16px 80px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          
          {/* ========================================================================= */}
          {/* 1. CLEAN TOP HEADER                                                       */}
          {/* ========================================================================= */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🕌</span>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {activeTab === 'HOME' && 'Parent Portal Dashboard'}
                {activeTab === 'CHILDREN' && 'My Children & Attendance'}
                {activeTab === 'RESULTS' && 'Academic Exam Results & Grades'}
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: '#666666', marginTop: '2px' }}>
              {tenant?.name} • Welcome, <strong>{user?.displayName || user?.email}</strong>
            </p>
          </div>

          {/* LOADING STATE */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#666', backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#7B2525' }}>Loading parent portal details...</div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>Fetching children profiles, attendance & exam reports</div>
            </div>
          ) : childrenList.length === 0 ? (
            /* NO LINKED CHILDREN STATE */
            <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
              <Users size={44} style={{ color: '#9CA3AF', margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', marginBottom: '6px' }}>
                No Linked Children Found
              </h3>
              <p style={{ color: '#666', fontSize: '13px', maxWidth: '440px', margin: '0 auto 16px', lineHeight: '1.5' }}>
                Your parent account is registered, but no student records are linked to your profile ({user?.email}).
              </p>
              <div style={{ fontSize: '12px', color: '#7B2525', fontWeight: 600, backgroundColor: 'rgba(123, 37, 37, 0.08)', padding: '10px 16px', borderRadius: '8px', display: 'inline-block' }}>
                Please ask the Madrasa Principal to link your children under Principal → Parents → Edit Parent.
              </div>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* 2. TAB 1: HOME DASHBOARD                                                  */}
              {/* ========================================================================= */}
              {activeTab === 'HOME' && (
                <div style={{ display: 'grid', gap: '24px' }}>
                  
                  {/* WELCOME BANNER */}
                  <div 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '16px', 
                      background: 'linear-gradient(135deg, #7B2525 0%, #541919 100%)', 
                      color: '#FFFFFF',
                      boxShadow: '0 4px 20px rgba(123, 37, 37, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>
                        <Sparkles size={13} />
                        <span>Madrasa Parent Hub</span>
                      </div>
                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        Assalamu Alaikum, {user?.displayName || 'Respected Parent'}
                      </h2>
                      <p style={{ fontSize: '13px', color: '#FEE2E2', marginTop: '4px', maxWidth: '500px', lineHeight: 1.4 }}>
                        Monitor your children's Islamic academic growth, attendance records, exam marks, and Madrasa notices in real-time.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', padding: '12px 18px', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800 }}>{childrenList.length}</div>
                        <div style={{ fontSize: '11px', color: '#FEE2E2' }}>Children Enrolled</div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', padding: '12px 18px', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800 }}>2026–27</div>
                        <div style={{ fontSize: '11px', color: '#FEE2E2' }}>Academic Year</div>
                      </div>
                    </div>
                  </div>

                  {/* CHILDREN NAME CARDS */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#252525', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <GraduationCap size={22} style={{ color: '#7B2525' }} />
                          <span>My Enrolled Children ({childrenList.length})</span>
                        </h3>
                        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                          Click any child card below to open complete profile & daily attendance
                        </p>
                      </div>
                    </div>

                    {/* CHILDREN CARDS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {childrenList.map((child, idx) => {
                        const stats = childrenStatsMap[child.id] || { attendancePct: 100, feeDue: 0, resultsCount: 0 };
                        const gradients = [
                          'linear-gradient(135deg, #7B2525 0%, #A33A3A 100%)',
                          'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                          'linear-gradient(135deg, #065F46 0%, #059669 100%)',
                          'linear-gradient(135deg, #6B21A8 0%, #8B5CF6 100%)'
                        ];
                        const avatarGradient = gradients[idx % gradients.length];

                        return (
                          <div
                            key={child.id}
                            onClick={() => handleSelectChildAndNavigate(child, 'children')}
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '18px',
                              border: '1px solid #E5E7EB',
                              padding: '20px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-3px)';
                              e.currentTarget.style.boxShadow = '0 8px 24px rgba(123, 37, 37, 0.12)';
                              e.currentTarget.style.borderColor = '#7B2525';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.03)';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                            }}
                          >
                            {/* Card Top: Avatar & Name Details */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                              <div 
                                style={{ 
                                  width: '54px', 
                                  height: '54px', 
                                  borderRadius: '16px', 
                                  background: avatarGradient, 
                                  color: '#FFFFFF', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontWeight: 800, 
                                  fontSize: '20px',
                                  flexShrink: 0,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                              >
                                {child.name.charAt(0).toUpperCase()}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', lineHeight: 1.2, wordBreak: 'break-word' }}>
                                  {child.name}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                  <span 
                                    style={{ 
                                      backgroundColor: '#F3F4F6', 
                                      color: '#1F2937', 
                                      fontWeight: 700, 
                                      fontSize: '12px', 
                                      padding: '3px 8px', 
                                      borderRadius: '6px',
                                      border: '1px solid #E5E7EB'
                                    }}
                                  >
                                    Class: {child.classId} {child.section ? `(${child.section})` : ''}
                                  </span>

                                  <span 
                                    style={{ 
                                      fontFamily: 'monospace', 
                                      fontSize: '11px', 
                                      fontWeight: 700, 
                                      color: '#7B2525', 
                                      backgroundColor: 'rgba(123, 37, 37, 0.08)', 
                                      padding: '3px 7px', 
                                      borderRadius: '6px',
                                      border: '1px solid rgba(123, 37, 37, 0.15)'
                                    }}
                                  >
                                    {child.studentCode}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Middle: Quick Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#FAF9F7', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '14px' }}>
                              <div>
                                <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Attendance</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: stats.attendancePct >= 85 ? '#059669' : '#D97706', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CalendarCheck size={14} />
                                  <span>{stats.attendancePct}%</span>
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Fee Status</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: stats.feeDue > 0 ? '#DC2626' : '#059669', marginTop: '2px' }}>
                                  {stats.feeDue > 0 ? `₹${stats.feeDue.toLocaleString()} Due` : '✓ Settled'}
                                </div>
                              </div>
                            </div>

                            {/* Card Footer: Action Button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#7B2525', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Open Profile</span>
                                <ChevronRight size={15} />
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectChildAndNavigate(child, 'results');
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Award size={12} />
                                <span>Results ({stats.resultsCount})</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* QUICK ACCESS PORTAL HUB CARDS */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      Quick Portal Navigation
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <Link 
                        to={`/m/${tenantSlug}/parent/children`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="card" style={{ padding: '16px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s ease' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>My Children</div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>Profiles & Attendance</div>
                          </div>
                        </div>
                      </Link>

                      <Link 
                        to={`/m/${tenantSlug}/parent/results`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="card" style={{ padding: '16px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s ease' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Award size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>Report Cards</div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>Exams, Marks & Grades</div>
                          </div>
                        </div>
                      </Link>

                      <Link 
                        to={`/m/${tenantSlug}/parent/fees`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="card" style={{ padding: '16px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s ease' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#D1FAE5', color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>Fee Statements</div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>Receipts & Dues</div>
                          </div>
                        </div>
                      </Link>

                      <Link 
                        to={`/m/${tenantSlug}/parent/notices`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="card" style={{ padding: '16px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s ease' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F3E8FF', color: '#6B21A8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Bell size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>Notices</div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>Announcements</div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* RECENT NOTICES SNIPPET */}
                  {recentNotices.length > 0 && (
                    <div className="card" style={{ padding: '20px', backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Bell size={18} style={{ color: '#7B2525' }} />
                          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#252525', margin: 0 }}>
                            Latest Madrasa Announcements
                          </h4>
                        </div>
                        <Link to={`/m/${tenantSlug}/parent/notices`} style={{ fontSize: '12px', fontWeight: 600, color: '#7B2525', textDecoration: 'none' }}>
                          View All ➔
                        </Link>
                      </div>

                      <div style={{ display: 'grid', gap: '10px' }}>
                        {recentNotices.map((n) => (
                          <div key={n.id} style={{ padding: '12px 14px', backgroundColor: '#FAF9F7', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{n.title}</div>
                              <span style={{ fontSize: '11px', color: '#6B7280' }}>
                                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px', lineHeight: 1.4 }}>
                              {n.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ========================================================================= */}
              {/* 3. TAB 2: MY CHILDREN VIEW (FULL PROFILE & ATTENDANCE ANALYTICS)          */}
              {/* ========================================================================= */}
              {activeTab === 'CHILDREN' && (
                <div style={{ display: 'grid', gap: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                  
                  {/* CUSTOM STYLISH CHILD SELECTOR DROPDOWN CARD */}
                  <div 
                    onClick={() => setShowChildPickerModal(true)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      border: '1.5px solid #7B2525',
                      boxShadow: '0 4px 14px rgba(123, 37, 37, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div 
                        style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '12px', 
                          backgroundColor: '#7B2525', 
                          color: '#FFFFFF', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 800, 
                          fontSize: '17px',
                          flexShrink: 0,
                          boxShadow: '0 3px 8px rgba(123, 37, 37, 0.25)'
                        }}
                      >
                        {selectedChild?.name.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#7B2525', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Selected Student Profile
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span>{selectedChild?.name || 'Select Child'}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '1px 6px', borderRadius: '4px' }}>
                            {selectedChild?.classId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        backgroundColor: 'rgba(123, 37, 37, 0.08)', 
                        color: '#7B2525', 
                        padding: '7px 12px', 
                        borderRadius: '10px', 
                        fontSize: '12px', 
                        fontWeight: 700,
                        flexShrink: 0 
                      }}
                    >
                      <span>Switch Child</span>
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  {selectedChild && (
                    <>
                      {/* SELECTED CHILD FULL PROFILE CARD */}
                      <div className="card" style={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '16px 14px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#7B2525', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, flexShrink: 0 }}>
                              {selectedChild.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {selectedChild.name}
                                </h3>
                                <span className="badge badge-active" style={{ fontSize: '10px' }}>Active Student</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                Class: <strong>{selectedChild.classId}</strong> (Sec: {selectedChild.section || 'A'}) • Code: <strong>{selectedChild.studentCode}</strong>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectChildAndNavigate(selectedChild, 'results')}
                            className="btn btn-outline"
                            style={{ gap: '6px', fontSize: '12px', color: '#1D4ED8', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', fontWeight: 600, flexShrink: 0, padding: '6px 12px' }}
                          >
                            <Award size={15} />
                            <span>Exam Results ➔</span>
                          </button>
                        </div>

                        {/* Profile Info Details Grid (2-column responsive) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F3F4F6' }}>
                          <div style={{ padding: '8px 10px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                            <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Gender</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', textTransform: 'capitalize', marginTop: '2px' }}>{selectedChild.gender || 'Not specified'}</div>
                          </div>
                          <div style={{ padding: '8px 10px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                            <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Date of Birth</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>{selectedChild.dob || 'N/A'}</div>
                          </div>
                          <div style={{ padding: '8px 10px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                            <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Parent Contact</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedChild.parentPhone || user?.phone || 'N/A'}</div>
                          </div>
                          <div style={{ padding: '8px 10px', backgroundColor: '#FAF9F7', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                            <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Admission Date</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>{selectedChild.admissionDate || 'N/A'}</div>
                          </div>
                        </div>
                      </div>

                      {/* DEEP ATTENDANCE ANALYTICS & CALENDAR SECTION */}
                      <div className="card" style={{ padding: '16px 12px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2DDD5', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        
                        {/* Section Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(123, 37, 37, 0.08)', color: '#7B2525', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <CalendarCheck size={20} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#252525', margin: 0 }}>
                                Attendance Analytics & History
                              </h3>
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                View Daily, Monthly, and All-Time reports
                              </div>
                            </div>
                          </div>

                          {/* Mode Switcher Slider / Pill Buttons */}
                          <div 
                            className="no-scrollbar"
                            style={{ 
                              display: 'flex',
                              flexWrap: 'nowrap',
                              alignItems: 'center',
                              backgroundColor: '#F3F4F6', 
                              borderRadius: '8px', 
                              padding: '3px', 
                              border: '1px solid #E5E7EB',
                              maxWidth: '100%',
                              boxSizing: 'border-box'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setAttMode('daily')}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: attMode === 'daily' ? '#FFFFFF' : 'transparent',
                                color: attMode === 'daily' ? '#7B2525' : '#4B5563',
                                fontWeight: attMode === 'daily' ? 700 : 500,
                                fontSize: '12px',
                                cursor: 'pointer',
                                boxShadow: attMode === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Calendar size={13} />
                              <span>Daily</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttMode('monthly')}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: attMode === 'monthly' ? '#FFFFFF' : 'transparent',
                                color: attMode === 'monthly' ? '#7B2525' : '#4B5563',
                                fontWeight: attMode === 'monthly' ? 700 : 500,
                                fontSize: '12px',
                                cursor: 'pointer',
                                boxShadow: attMode === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Filter size={13} />
                              <span>Monthly</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttMode('alltime')}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: attMode === 'alltime' ? '#FFFFFF' : 'transparent',
                                color: attMode === 'alltime' ? '#7B2525' : '#4B5563',
                                fontWeight: attMode === 'alltime' ? 700 : 500,
                                fontSize: '12px',
                                cursor: 'pointer',
                                boxShadow: attMode === 'alltime' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <BarChart2 size={13} />
                              <span>All Time</span>
                            </button>
                          </div>
                        </div>

                        {/* MODE 1: DAILY VIEW */}
                        {attMode === 'daily' && (
                          <div style={{ display: 'grid', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                                Select Date:
                              </label>
                              <input 
                                type="date" 
                                className="input-field" 
                                value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)}
                                style={{ maxWidth: '180px', padding: '6px 10px', fontSize: '13px' }}
                              />
                            </div>

                            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#FAF9F7', border: '1px solid #E5E7EB' }}>
                              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
                                Attendance Status for {selectedDate}
                              </div>

                              {dailyRecord ? (
                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {dailyRecord.status === 'holiday' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
                                      <span style={{ fontSize: '20px' }}>🕌</span>
                                      <div>
                                        <div style={{ fontSize: '15px', fontWeight: 700 }}>
                                          {dailyRecord.holidayTitle || 'Madrasa Holiday / Jummah'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#059669' }}>No classes scheduled today</div>
                                      </div>
                                    </div>
                                  )}
                                  {dailyRecord.status === 'present' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669' }}>
                                      <CheckCircle2 size={24} />
                                      <div>
                                        <div style={{ fontSize: '15px', fontWeight: 700 }}>Present in Class</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Student attended all class periods on this day</div>
                                      </div>
                                    </div>
                                  )}
                                  {dailyRecord.status === 'absent' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
                                      <XCircle size={24} />
                                      <div>
                                        <div style={{ fontSize: '15px', fontWeight: 700 }}>Absent</div>
                                        <div style={{ fontSize: '12px', color: '#EF4444' }}>Student was recorded absent for morning roll call</div>
                                      </div>
                                    </div>
                                  )}
                                  {dailyRecord.status === 'late' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706' }}>
                                      <Clock size={24} />
                                      <div>
                                        <div style={{ fontSize: '15px', fontWeight: 700 }}>Late Arrival</div>
                                        <div style={{ fontSize: '12px', color: '#F59E0B' }}>Student arrived after assembly / first period</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ marginTop: '8px', color: '#6B7280', fontSize: '13px' }}>
                                  ℹ️ No attendance record found for <strong>{selectedDate}</strong> (Madrasa closed or attendance not marked).
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* MODE 2: INTERACTIVE MONTHLY ATTENDANCE CALENDAR GRID */}
                        {attMode === 'monthly' && (
                          <div style={{ display: 'grid', gap: '14px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                            
                            {/* Month Navigation & Picker Header Bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAF9F7', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E5E7EB', flexWrap: 'wrap', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={handlePrevMonth}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF' }}
                                  title="Previous Month"
                                >
                                  <ChevronLeft size={15} />
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Calendar size={16} style={{ color: '#7B2525' }} />
                                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                                    {currentMonthTitle}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleNextMonth}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF' }}
                                  title="Next Month"
                                >
                                  <ChevronRight size={15} />
                                </button>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input 
                                  type="month" 
                                  className="input-field" 
                                  value={selectedMonth} 
                                  onChange={e => { setSelectedMonth(e.target.value); setClickedCalendarDate(null); }}
                                  style={{ padding: '4px 6px', fontSize: '12px', width: 'auto' }}
                                />
                              </div>
                            </div>

                            {/* Monthly Overview Stats Grid (2-column on mobile, 4-col on desktop) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>Attendance Rate</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: monthlyPercentage >= 85 ? '#059669' : '#D97706', marginTop: '2px' }}>
                                  {monthlyPercentage}%
                                </div>
                              </div>

                              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#047857', fontWeight: 600 }}>Present Days</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#065F46', marginTop: '2px' }}>
                                  {monthlyPresent} <span style={{ fontSize: '10px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>

                              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#B91C1C', fontWeight: 600 }}>Absent Days</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#991B1B', marginTop: '2px' }}>
                                  {monthlyAbsent} <span style={{ fontSize: '10px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>

                              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#B45309', fontWeight: 600 }}>Late Days</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#92400E', marginTop: '2px' }}>
                                  {monthlyLate} <span style={{ fontSize: '10px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>
                            </div>

                            {/* ========================================================================= */}
                            {/* ULTRA STYLISH 100% RESPONSIVE CALENDAR GRID WRAPPER                       */}
                            {/* ========================================================================= */}
                            <div className="parent-calendar-container" style={{ backgroundColor: '#FFFFFF', padding: '12px 8px', borderRadius: '14px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                              
                              {/* Day Names Header Bar (Sun - Sat) */}
                              <div className="parent-calendar-grid" style={{ textAlign: 'center', marginBottom: '6px' }}>
                                {[
                                  { label: 'Sun', isFri: false },
                                  { label: 'Mon', isFri: false },
                                  { label: 'Tue', isFri: false },
                                  { label: 'Wed', isFri: false },
                                  { label: 'Thu', isFri: false },
                                  { label: 'Fri', isFri: true },
                                  { label: 'Sat', isFri: false }
                                ].map((d) => (
                                  <div 
                                    key={d.label} 
                                    style={{ 
                                      fontSize: '10px', 
                                      fontWeight: 800, 
                                      color: d.isFri ? '#047857' : '#6B7280', 
                                      padding: '6px 0', 
                                      backgroundColor: d.isFri ? '#ECFDF5' : '#F9FAFB',
                                      borderRadius: '6px',
                                      border: `1px solid ${d.isFri ? '#A7F3D0' : '#F3F4F6'}`,
                                      textTransform: 'uppercase'
                                    }}
                                  >
                                    {d.label}
                                  </div>
                                ))}
                              </div>

                              {/* Days Grid - Guaranteed Identical 1:1 Square Cells without right overflow */}
                              <div className="parent-calendar-grid">
                                
                                {/* Blank Padding Slots before Day 1 */}
                                {Array.from({ length: firstDayOfWeek }).map((_, padIdx) => (
                                  <div 
                                    key={`pad-${padIdx}`} 
                                    className="parent-calendar-cell"
                                    style={{ 
                                      borderRadius: '8px', 
                                      backgroundColor: '#FAF9F7', 
                                      opacity: 0.35,
                                      border: '1px dashed #E5E7EB'
                                    }} 
                                  />
                                ))}

                                {/* Day 1 to daysInMonth */}
                                {Array.from({ length: totalDaysInCurrentMonth }).map((_, idx) => {
                                  const dayNum = idx + 1;
                                  const dateStr = `${selYear}-${String(selMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                  const rec = attendanceSummary.history.find(h => h.date === dateStr);
                                  const isFriday = holidayService.isFriday(dateStr) || (new Date(selYear, selMonthIdx, dayNum).getDay() === 5);
                                  const isToday = dateStr === todayDateStr;
                                  const isSelected = clickedCalendarDate === dateStr;

                                  // Visual status styling tokens
                                  let tileBg = '#FAF9F7';
                                  let tileBorder = '#E5E7EB';
                                  let numColor = '#4B5563';
                                  let badgeIcon = null;
                                  let badgeColor = '#9CA3AF';

                                  if (isFriday || rec?.status === 'holiday') {
                                    tileBg = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)';
                                    tileBorder = '#86EFAC';
                                    numColor = '#14532D';
                                    badgeIcon = '🕌';
                                    badgeColor = '#15803D';
                                  } else if (rec?.status === 'present') {
                                    tileBg = 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)';
                                    tileBorder = '#6EE7B7';
                                    numColor = '#064E3B';
                                    badgeIcon = '✓';
                                    badgeColor = '#047857';
                                  } else if (rec?.status === 'absent') {
                                    tileBg = 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)';
                                    tileBorder = '#FCA5A5';
                                    numColor = '#7F1D1D';
                                    badgeIcon = '✕';
                                    badgeColor = '#B91C1C';
                                  } else if (rec?.status === 'late') {
                                    tileBg = 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)';
                                    tileBorder = '#FDE68A';
                                    numColor = '#78350F';
                                    badgeIcon = '⏰';
                                    badgeColor = '#B45309';
                                  }

                                  return (
                                    <div
                                      key={dateStr}
                                      onClick={() => setClickedCalendarDate(isSelected ? null : dateStr)}
                                      className="parent-calendar-cell"
                                      style={{
                                        borderRadius: '8px',
                                        background: tileBg,
                                        border: isToday 
                                          ? '2px solid #7B2525' 
                                          : isSelected 
                                          ? '2px solid #7B2525' 
                                          : `1px solid ${tileBorder}`,
                                        boxShadow: isToday
                                          ? '0 0 0 2px rgba(123, 37, 37, 0.2)'
                                          : isSelected
                                          ? '0 3px 10px rgba(123, 37, 37, 0.2)'
                                          : 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        position: 'relative'
                                      }}
                                    >
                                      {/* Top Row: Date Number & Today Dot */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 2px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: numColor, lineHeight: 1 }}>
                                          {dayNum}
                                        </span>
                                        {isToday && (
                                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#7B2525' }} title="Today" />
                                        )}
                                      </div>

                                      {/* Center / Bottom: Distinctive Status Badge */}
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '1px' }}>
                                        {badgeIcon ? (
                                          <span style={{ fontSize: '10px', fontWeight: 800, color: badgeColor, lineHeight: 1 }}>
                                            {badgeIcon}
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '9px', color: '#D1D5DB' }}>—</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Calendar Color Legend */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', fontSize: '11px', fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#047857' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7' }} />
                                  <span>✓ Present</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#B91C1C' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }} />
                                  <span>✕ Absent</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#B45309' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }} />
                                  <span>⏰ Late</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#15803D' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }} />
                                  <span>🕌 Holiday</span>
                                </div>
                              </div>
                            </div>

                            {/* SELECTED DATE DETAIL INSPECTOR (WHEN PARENT CLICKS A DAY) */}
                            {clickedCalendarDate && (
                              <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#FAF9F7', border: '2px solid #7B2525', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#7B2525', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Date:</div>
                                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginTop: '1px' }}>
                                    📅 {new Date(clickedCalendarDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </div>
                                </div>

                                <div>
                                  {isClickedFriday || clickedRecord?.status === 'holiday' ? (
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D', backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: '6px', border: '1px solid #86EFAC' }}>
                                      🕌 {clickedRecord?.holidayTitle || 'Friday (Jummah)'}
                                    </span>
                                  ) : clickedRecord?.status === 'present' ? (
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '4px 10px', borderRadius: '6px', border: '1px solid #6EE7B7' }}>
                                      ✓ Present
                                    </span>
                                  ) : clickedRecord?.status === 'absent' ? (
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', backgroundColor: '#FEE2E2', padding: '4px 10px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                                      ✕ Absent
                                    </span>
                                  ) : clickedRecord?.status === 'late' ? (
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', backgroundColor: '#FEF3C7', padding: '4px 10px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                                      ⏰ Late Arrival
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', backgroundColor: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                      ℹ️ No Class
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>
                        )}

                        {/* MODE 3: ALL TIME (2026-27 ACADEMIC SESSION SLIDER REPORT) */}
                        {attMode === 'alltime' && (
                          <div style={{ display: 'grid', gap: '18px' }}>
                            {/* Academic Year 2026-27 Banner */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderRadius: '12px', backgroundColor: 'rgba(123, 37, 37, 0.05)', border: '1px solid rgba(123, 37, 37, 0.15)', flexWrap: 'wrap', gap: '10px' }}>
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
                                <div style={{ fontSize: '28px', fontWeight: 800, color: attendanceSummary.percentage >= 85 ? '#059669' : attendanceSummary.percentage >= 75 ? '#D97706' : '#DC2626' }}>
                                  {attendanceSummary.percentage}%
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>Cumulative Rate</div>
                              </div>
                            </div>

                            {/* Attendance Counters Grid */}
                            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <CheckCircle2 size={14} />
                                  <span>Present Days</span>
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#065F46', marginTop: '4px' }}>
                                  {attendanceSummary.present} <span style={{ fontSize: '11px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>

                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <XCircle size={14} />
                                  <span>Absent Days</span>
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#991B1B', marginTop: '4px' }}>
                                  {attendanceSummary.absent} <span style={{ fontSize: '11px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>

                              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <Clock size={14} />
                                  <span>Late Days</span>
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400E', marginTop: '4px' }}>
                                  {attendanceSummary.late} <span style={{ fontSize: '11px', fontWeight: 400 }}>days</span>
                                </div>
                              </div>
                            </div>

                            {/* 12-MONTH ACADEMIC SESSION VISUAL CALENDAR GRID */}
                            <div style={{ width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                                    📅 2026–2027 Academic Year Monthly Calendar Matrix
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                    Tap any month tile to open its interactive daily attendance calendar
                                  </div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#7B2525', backgroundColor: 'rgba(123, 37, 37, 0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                                  12 Academic Months
                                </span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                                {sessionMonthlyBreakdown.map((m) => {
                                  const hasLogs = m.total > 0;
                                  const isHigh = m.percentage >= 85;
                                  const isMed = m.percentage >= 75 && m.percentage < 85;

                                  let cardBg = '#FAF9F7';
                                  let cardBorder = '#E5E7EB';
                                  let pctColor = '#9CA3AF';
                                  let barColor = '#D1D5DB';

                                  if (hasLogs) {
                                    if (isHigh) {
                                      cardBg = 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)';
                                      cardBorder = '#A7F3D0';
                                      pctColor = '#059669';
                                      barColor = '#059669';
                                    } else if (isMed) {
                                      cardBg = 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)';
                                      cardBorder = '#FDE68A';
                                      pctColor = '#D97706';
                                      barColor = '#D97706';
                                    } else {
                                      cardBg = 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%)';
                                      cardBorder = '#FCA5A5';
                                      pctColor = '#DC2626';
                                      barColor = '#DC2626';
                                    }
                                  }

                                  return (
                                    <div
                                      key={m.key}
                                      onClick={() => {
                                        setSelectedMonth(m.key);
                                        setClickedCalendarDate(null);
                                        setAttMode('monthly');
                                      }}
                                      style={{
                                        padding: '12px 10px',
                                        borderRadius: '12px',
                                        background: cardBg,
                                        border: `1px solid ${cardBorder}`,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                        cursor: 'pointer',
                                        transition: 'all 0.16s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        boxSizing: 'border-box'
                                      }}
                                      title={`View ${m.label} Attendance Calendar`}
                                    >
                                      {/* Month Header */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>
                                          {m.label}
                                        </span>
                                        <ChevronRight size={14} style={{ color: '#9CA3AF' }} />
                                      </div>

                                      {/* Percentage Number */}
                                      <div style={{ margin: '4px 0 6px' }}>
                                        {hasLogs ? (
                                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '22px', fontWeight: 800, color: pctColor, lineHeight: 1 }}>
                                              {m.percentage}%
                                            </span>
                                            <span style={{ fontSize: '10px', fontWeight: 600, color: pctColor }}>
                                              {isHigh ? '🟢 High' : isMed ? '🟡 Good' : '🔴 Low'}
                                            </span>
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#9CA3AF', padding: '4px 0' }}>
                                            Upcoming
                                          </div>
                                        )}
                                      </div>

                                      {/* Progress Bar */}
                                      <div style={{ height: '5px', width: '100%', backgroundColor: '#E5E7EB', borderRadius: '999px', overflow: 'hidden', marginBottom: '6px' }}>
                                        <div 
                                          style={{ 
                                            height: '100%', 
                                            width: `${hasLogs ? m.percentage : 0}%`, 
                                            backgroundColor: barColor,
                                            borderRadius: '999px'
                                          }} 
                                        />
                                      </div>

                                      {/* Days Count Subtitle */}
                                      <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500 }}>
                                        {hasLogs ? (
                                          <span>✓ <strong>{m.present}</strong> / {m.total} Days Present</span>
                                        ) : (
                                          <span>0 sessions logged</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Fee Dues Summary Card */}
                      <div className="card" style={{ padding: '18px 20px', backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Tuition Fee Dues for {selectedChild.name}</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: totalDues > 0 ? '#DC2626' : '#059669', marginTop: '2px' }}>
                              ₹{totalDues.toLocaleString()}
                            </div>
                          </div>
                          <Link 
                            to={`/m/${tenantSlug}/parent/fees`}
                            style={{ textDecoration: 'none' }}
                          >
                            <span className={`badge badge-${totalDues > 0 ? 'suspended' : 'active'}`} style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}>
                              {totalDues > 0 ? 'View & Pay Dues ➔' : '✓ All Settled'}
                            </span>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 4. TAB 3: RESULTS & REPORT CARDS                                          */}
              {/* ========================================================================= */}
              {activeTab === 'RESULTS' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  
                  {/* CUSTOM STYLISH CHILD SELECTOR DROPDOWN CARD */}
                  <div 
                    onClick={() => setShowChildPickerModal(true)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      border: '1.5px solid #7B2525',
                      boxShadow: '0 4px 14px rgba(123, 37, 37, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div 
                        style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '12px', 
                          backgroundColor: '#7B2525', 
                          color: '#FFFFFF', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 800, 
                          fontSize: '17px',
                          flexShrink: 0,
                          boxShadow: '0 3px 8px rgba(123, 37, 37, 0.25)'
                        }}
                      >
                        {selectedChild?.name.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#7B2525', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Viewing Exam Results For
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span>{selectedChild?.name || 'Select Child'}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '1px 6px', borderRadius: '4px' }}>
                            {selectedChild?.classId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        backgroundColor: 'rgba(123, 37, 37, 0.08)', 
                        color: '#7B2525', 
                        padding: '7px 12px', 
                        borderRadius: '10px', 
                        fontSize: '12px', 
                        fontWeight: 700,
                        flexShrink: 0 
                      }}
                    >
                      <span>Switch Child</span>
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  {selectedChild && (
                    <>
                      {/* ACADEMIC PERFORMANCE OVERVIEW STATS BANNER */}
                      <div 
                        style={{ 
                          padding: '18px 20px', 
                          borderRadius: '16px', 
                          backgroundColor: '#FFF', 
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '14px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Award size={22} style={{ color: '#7B2525' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                              {selectedChild.name}'s Academic Progress
                            </h3>
                          </div>
                          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                            Class: <strong>{selectedChild.classId}</strong> (Sec {selectedChild.section || 'A'}) • Code: <strong>{selectedChild.studentCode}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ padding: '8px 14px', borderRadius: '12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: '#047857', textTransform: 'uppercase' }}>Average Score</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#065F46', marginTop: '2px' }}>
                              {avgResultPercentage}%
                            </div>
                          </div>

                          <div style={{ padding: '8px 14px', borderRadius: '12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase' }}>Exams Completed</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E40AF', marginTop: '2px' }}>
                              {childResults.length}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* EXAM RESULTS CARDS LIST */}
                      <div className="card" style={{ padding: '20px 18px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
                              Published Exam Results & Marks ({childResults.length})
                            </h4>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                              Subject breakdown, obtained scores, grades, and teacher remarks
                            </div>
                          </div>
                        </div>

                        {loadingChildMetrics ? (
                          <div style={{ padding: '36px', textAlign: 'center', color: '#666' }}>Fetching exam records...</div>
                        ) : childResults.length === 0 ? (
                          <div style={{ padding: '36px 16px', textAlign: 'center', backgroundColor: '#FAF9F7', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                            <Award size={34} style={{ color: '#D1D5DB', margin: '0 auto 8px' }} />
                            <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', margin: 0 }}>No Exam Results Published Yet</h5>
                            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                              When teachers enter marks for {selectedChild.name}, full report cards with grades and percentages will show here.
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {childResults.map((res) => {
                              const gradeBadge = getGradeBadgeColor(res.grade);
                              return (
                                <div 
                                  key={res.id} 
                                  style={{ 
                                    padding: '16px 18px', 
                                    backgroundColor: '#FFFFFF', 
                                    borderRadius: '14px', 
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                  }}
                                >
                                  {/* Result Top Row */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                                          {res.examTitle}
                                        </span>
                                        <span 
                                          style={{ 
                                            fontSize: '11px', 
                                            fontWeight: 700, 
                                            padding: '2px 8px', 
                                            borderRadius: '6px', 
                                            backgroundColor: '#F3F4F6', 
                                            color: '#374151',
                                            border: '1px solid #E5E7EB'
                                          }}
                                        >
                                          📖 {res.subject || 'General'}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                        Student: <strong>{selectedChild.name}</strong> • Class: {selectedChild.classId}
                                      </div>
                                    </div>

                                    {/* Grade Badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                                          {res.obtainedMarks} / {res.maxMarks}
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: res.percentage >= 75 ? '#059669' : '#D97706' }}>
                                          {res.percentage}% Score
                                        </div>
                                      </div>

                                      <div 
                                        style={{ 
                                          padding: '6px 12px', 
                                          borderRadius: '10px', 
                                          backgroundColor: gradeBadge.bg, 
                                          color: gradeBadge.text, 
                                          border: `1px solid ${gradeBadge.border}`,
                                          fontSize: '15px',
                                          fontWeight: 800,
                                          textAlign: 'center',
                                          minWidth: '48px'
                                        }}
                                      >
                                        {res.grade}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Score Progress Bar */}
                                  <div style={{ height: '6px', width: '100%', backgroundColor: '#F3F4F6', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div 
                                      style={{ 
                                        height: '100%', 
                                        width: `${res.percentage}%`, 
                                        backgroundColor: res.percentage >= 85 ? '#059669' : res.percentage >= 60 ? '#2563EB' : '#D97706',
                                        borderRadius: '999px',
                                        transition: 'width 0.4s ease'
                                      }} 
                                    />
                                  </div>

                                  {/* Teacher Remarks if available */}
                                  {res.remarks && (
                                    <div style={{ backgroundColor: '#FAF9F7', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F3F4F6', fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>💬</span>
                                      <span>Teacher Remarks: <strong>"{res.remarks}"</strong></span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* 5. SLIDE-UP BOTTOM SHEET MODAL: SELECT STUDENT PROFILE                    */}
      {/* ========================================================================= */}
      {showChildPickerModal && (
        <div className="modal-overlay" onClick={() => setShowChildPickerModal(false)}>
          <div 
            className="modal-card" 
            style={{ maxWidth: '480px', padding: '22px 20px', boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={20} style={{ color: '#7B2525' }} />
                  <span>Select Student Profile</span>
                </h3>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '3px 0 0' }}>
                  Choose which child's attendance and academic reports to view
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChildPickerModal(false)}
                className="btn btn-outline btn-sm"
                style={{ padding: '6px', borderRadius: '50%', color: '#6B7280', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Children Selection Cards List */}
            <div style={{ display: 'grid', gap: '10px' }}>
              {childrenList.map((child, idx) => {
                const isSelected = selectedChild?.id === child.id;
                const stats = childrenStatsMap[child.id] || { attendancePct: 100, feeDue: 0, resultsCount: 0 };
                const gradients = [
                  'linear-gradient(135deg, #7B2525 0%, #A33A3A 100%)',
                  'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                  'linear-gradient(135deg, #065F46 0%, #059669 100%)',
                  'linear-gradient(135deg, #6B21A8 0%, #8B5CF6 100%)'
                ];
                const avatarGradient = gradients[idx % gradients.length];

                return (
                  <div
                    key={child.id}
                    onClick={() => {
                      setSelectedChild(child);
                      setShowChildPickerModal(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: isSelected ? 'rgba(123, 37, 37, 0.04)' : '#FAF9F7',
                      border: `2px solid ${isSelected ? '#7B2525' : '#E5E7EB'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(123, 37, 37, 0.1)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div 
                        style={{ 
                          width: '44px', 
                          height: '44px', 
                          borderRadius: '12px', 
                          background: avatarGradient, 
                          color: '#FFFFFF', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 800, 
                          fontSize: '18px',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        {child.name.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {child.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                          Class: <strong>{child.classId}</strong> (Sec: {child.section || 'A'}) • Code: <strong>{child.studentCode}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {isSelected ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', backgroundColor: '#7B2525', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={13} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '4px 10px', borderRadius: '8px' }}>
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
};
