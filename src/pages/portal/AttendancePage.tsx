import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { teacherService } from '../../services/teacherService';
import { holidayService } from '../../services/holidayService';
import { classService } from '../../services/classService';
import { Student, Teacher, MadrasaClass } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { CalendarCheck, Save, Check, UserCheck, Users } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [activeTab, setActiveTab] = useState<'STUDENT' | 'TEACHER'>('STUDENT');

  // Student Attendance States
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

  // Teacher Attendance States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherRecords, setTeacherRecords] = useState<Record<string, 'present' | 'absent' | 'late' | 'on_leave'>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const isParent = user?.role === 'PARENT';
  const isTeacher = user?.role === 'TEACHER';
  const canManageTeachers = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL';
  const isFridayDate = holidayService.isFriday(date);

  const loadAttendance = async () => {
    if (tenant?.id) {
      setLoading(true);
      if (activeTab === 'STUDENT') {
        const [allSt, cList] = await Promise.all([
          studentService.getStudentsByTenant(tenant.id),
          classService.getClassesByTenant(tenant.id)
        ]);

        let names = cList.map((c: MadrasaClass) => c.name);
        if (isTeacher && user) {
          let teacherClasses = user.assignedClasses || [];
          const tList = await teacherService.getTeachersByTenant(tenant.id);
          const me = tList.find(t => (t.email && t.email.toLowerCase() === user.email.toLowerCase()) || t.uid === user.uid);
          if (me && me.assignedClasses && me.assignedClasses.length > 0) {
            teacherClasses = me.assignedClasses;
          }
          names = names.filter(n => teacherClasses.includes(n));
        }

        if (names.length > 0) {
          setAvailableClasses(names);
          if (!selectedClass || !names.includes(selectedClass)) {
            setSelectedClass(names[0]);
          }
        } else {
          setAvailableClasses([]);
          setSelectedClass('');
        }
        
        let filtered = allSt;
        if (isParent && user) {
          const parentStudentIds = user.studentIds || [];
          filtered = allSt.filter((s: Student) => parentStudentIds.includes(s.id) || s.parentId === user.uid);
        } else {
          filtered = allSt.filter((s: Student) => s.classId === selectedClass);
        }

        setStudents(filtered);

        const existing = await attendanceService.getAttendanceForClassAndDate(tenant.id, selectedClass, date);
        if (existing && existing.records) {
          setRecords(existing.records);
        } else {
          const initial: Record<string, 'present' | 'absent' | 'late'> = {};
          filtered.forEach((s: Student) => initial[s.id] = 'present');
          setRecords(initial);
        }
      } else {
        // Teacher Attendance Tab
        const tList = await teacherService.getTeachersByTenant(tenant.id);
        setTeachers(tList);

        const existingRecords = await attendanceService.getTeacherAttendanceForDate(tenant.id, date);
        if (existingRecords) {
          setTeacherRecords(existingRecords);
        } else {
          const initial: Record<string, 'present' | 'absent' | 'late' | 'on_leave'> = {};
          tList.forEach(t => initial[t.id] = 'present');
          setTeacherRecords(initial);
        }
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [tenant, selectedClass, date, user, activeTab]);

  const toggleStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (isParent) return;
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const toggleTeacherStatus = (teacherId: string, status: 'present' | 'absent' | 'late' | 'on_leave') => {
    setTeacherRecords(prev => ({ ...prev, [teacherId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!tenant?.id || !user) return;
    setSaving(true);

    if (activeTab === 'STUDENT') {
      if (isParent) return;
      await attendanceService.saveAttendance(tenant.id, selectedClass, date, records, user.displayName || user.email);
    } else {
      if (!canManageTeachers) return;
      await attendanceService.saveTeacherAttendance(tenant.id, date, teacherRecords, user.displayName || user.email);
    }

    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {activeTab === 'STUDENT' ? (isParent ? 'Children Attendance Record' : 'Daily Class Attendance') : 'Staff & Teacher Attendance'}
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                {activeTab === 'STUDENT' ? 'Mark present, absent, and late status for students' : 'Track daily attendance and leave status for Madrasa teachers & ustadz'}
              </p>
            </div>

            {(!isParent && (activeTab === 'STUDENT' || canManageTeachers)) && (
              <button onClick={handleSaveAttendance} disabled={saving} className="btn btn-primary">
                {savedMsg ? <Check size={18} /> : <Save size={18} />}
                <span>{savedMsg ? 'Saved Successfully!' : saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            )}
          </div>

          {/* Role Tab Navigation for Principal / Super Admin */}
          {canManageTeachers && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: '#E5E7EB', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
              <button
                type="button"
                onClick={() => setActiveTab('STUDENT')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'STUDENT' ? '#FFF' : 'transparent',
                  color: activeTab === 'STUDENT' ? '#7B2525' : '#4B5563',
                  fontWeight: activeTab === 'STUDENT' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'STUDENT' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={16} />
                <span>Student Attendance</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TEACHER')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'TEACHER' ? '#FFF' : 'transparent',
                  color: activeTab === 'TEACHER' ? '#7B2525' : '#4B5563',
                  fontWeight: activeTab === 'TEACHER' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'TEACHER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <UserCheck size={16} />
                <span>Teacher Attendance</span>
              </button>
            </div>
          )}

          {/* Class & Date Controls */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {!isParent && activeTab === 'STUDENT' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>Select Class</label>
                <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>Attendance Date</label>
              <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {isFridayDate && (
            <div className="card" style={{ padding: '16px 20px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontWeight: 600, fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🕌</span>
              <span>Friday (Jummah) Weekly Holiday — Attendance for {date} is automatically excused.</span>
            </div>
          )}

          {/* Content Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading attendance records...</div>
            ) : activeTab === 'STUDENT' ? (
              students.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
                  {isParent ? 'No children registered under your account.' : `No students enrolled in ${selectedClass}.`}
                </div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Student Code</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => {
                        const currentStatus = records[s.id] || 'present';
                        return (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#7B2525' }}>{s.studentCode}</td>
                            <td style={{ fontWeight: 600, color: '#252525' }}>{s.name}</td>
                            <td>{s.classId}</td>
                            <td>
                              {isParent ? (
                                <div>
                                  {currentStatus === 'present' && <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>✓ Present</span>}
                                  {currentStatus === 'absent' && <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '4px 12px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>✕ Absent</span>}
                                  {currentStatus === 'late' && <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', backgroundColor: '#FFFBEB', padding: '4px 12px', borderRadius: '6px', border: '1px solid #FDE68A' }}>⏰ Late</span>}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button type="button" onClick={() => toggleStatus(s.id, 'present')} style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${currentStatus === 'present' ? '#059669' : '#D1D5DB'}`, backgroundColor: currentStatus === 'present' ? '#ECFDF5' : '#FFF', color: currentStatus === 'present' ? '#047857' : '#4B5563', fontWeight: currentStatus === 'present' ? 600 : 500, fontSize: '12px', cursor: 'pointer' }}>Present</button>
                                  <button type="button" onClick={() => toggleStatus(s.id, 'absent')} style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${currentStatus === 'absent' ? '#DC2626' : '#D1D5DB'}`, backgroundColor: currentStatus === 'absent' ? '#FEF2F2' : '#FFF', color: currentStatus === 'absent' ? '#B91C1C' : '#4B5563', fontWeight: currentStatus === 'absent' ? 600 : 500, fontSize: '12px', cursor: 'pointer' }}>Absent</button>
                                  <button type="button" onClick={() => toggleStatus(s.id, 'late')} style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${currentStatus === 'late' ? '#D97706' : '#D1D5DB'}`, backgroundColor: currentStatus === 'late' ? '#FFFBEB' : '#FFF', color: currentStatus === 'late' ? '#B45309' : '#4B5563', fontWeight: currentStatus === 'late' ? 600 : 500, fontSize: '12px', cursor: 'pointer' }}>Late</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* TEACHER ATTENDANCE TABLE */
              teachers.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>No teachers registered in this Madrasa.</div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Teacher Name</th>
                        <th>Email / Contact</th>
                        <th>Assigned Classes</th>
                        <th>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map(t => {
                        const tStatus = teacherRecords[t.id] || 'present';
                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600, color: '#252525' }}>{t.name}</td>
                            <td style={{ fontSize: '13px', color: '#4B5563' }}>{t.email} {t.mobile ? `(${t.mobile})` : ''}</td>
                            <td style={{ fontSize: '13px', color: '#4B5563' }}>{t.assignedClasses?.join(', ') || 'General'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button type="button" onClick={() => toggleTeacherStatus(t.id, 'present')} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${tStatus === 'present' ? '#059669' : '#D1D5DB'}`, backgroundColor: tStatus === 'present' ? '#ECFDF5' : '#FFF', color: tStatus === 'present' ? '#047857' : '#4B5563', fontWeight: tStatus === 'present' ? 600 : 500, fontSize: '12px', cursor: 'pointer' }}>Present</button>
                                <button type="button" onClick={() => toggleTeacherStatus(t.id, 'absent')} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${tStatus === 'absent' ? '#DC2626' : '#D1D5DB'}`, backgroundColor: tStatus === 'absent' ? '#FEF2F2' : '#FFF', color: tStatus === 'absent' ? '#B91C1C' : '#4B5563', fontWeight: tStatus === 'absent' ? 600 : 500, fontSize: '12px', cursor: 'pointer' }}>Absent</button>
                                <button type="button" onClick={() => toggleTeacherStatus(t.id, 'late')} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${tStatus === 'late' ? '#D97706' : '#D1D5DB'}`, backgroundColor: tStatus === 'late' ? '#FFFBEB' : '#FFF', color: tStatus === 'late' ? '#B45309' : '#4B5563', fontWeight: tStatus === 'late' ? 600 : 500, fontSize: '12px', cursor: 'pointer' }}>Late</button>
                                <button type="button" onClick={() => toggleTeacherStatus(t.id, 'on_leave')} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${tStatus === 'on_leave' ? '#2563EB' : '#D1D5DB'}`, backgroundColor: tStatus === 'on_leave' ? '#EFF6FF' : '#FFF', color: tStatus === 'on_leave' ? '#1D4ED8' : '#4B5563', fontWeight: tStatus === 'on_leave' ? 600 : 500, fontSize: '12px', cursor: 'pointer' }}>On Leave</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
