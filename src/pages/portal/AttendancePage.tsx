import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { CLASS_OPTIONS } from '../../config/constants';
import { Student } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { CalendarCheck, Save, Check, X, Clock } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [selectedClass, setSelectedClass] = useState(CLASS_OPTIONS[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const loadAttendance = async () => {
    if (tenant?.id) {
      setLoading(true);
      const allSt = await studentService.getStudentsByTenant(tenant.id);
      const classSt = allSt.filter(s => s.classId === selectedClass);
      setStudents(classSt);

      // Load existing attendance
      const existing = await attendanceService.getAttendanceForClassAndDate(tenant.id, selectedClass, date);
      if (existing && existing.records) {
        setRecords(existing.records);
      } else {
        // Default all to present
        const initial: Record<string, 'present' | 'absent' | 'late'> = {};
        classSt.forEach(s => initial[s.id] = 'present');
        setRecords(initial);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [tenant, selectedClass, date]);

  const toggleStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!tenant?.id || !user) return;
    setSaving(true);
    await attendanceService.saveAttendance(tenant.id, selectedClass, date, records, user.displayName || user.email);
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
                Daily Class Attendance
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Track present, absent, and late students
              </p>
            </div>

            {user?.role !== 'PARENT' && (
              <button onClick={handleSaveAttendance} disabled={saving} className="btn btn-primary">
                {savedMsg ? <Check size={18} /> : <Save size={18} />}
                <span>{savedMsg ? 'Saved Successfully!' : saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            )}
          </div>

          {/* Class & Date Controls */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>Select Class</label>
              <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>Attendance Date</label>
              <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {/* Students Grid */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading class roster...</div>
            ) : students.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
                No students enrolled in <strong>{selectedClass}</strong>. Add students to this class level first.
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
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => toggleStatus(s.id, 'present')}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  border: `1px solid ${currentStatus === 'present' ? '#059669' : '#D1D5DB'}`,
                                  backgroundColor: currentStatus === 'present' ? '#ECFDF5' : '#FFF',
                                  color: currentStatus === 'present' ? '#047857' : '#4B5563',
                                  fontWeight: currentStatus === 'present' ? 600 : 500,
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                Present
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleStatus(s.id, 'absent')}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  border: `1px solid ${currentStatus === 'absent' ? '#DC2626' : '#D1D5DB'}`,
                                  backgroundColor: currentStatus === 'absent' ? '#FEF2F2' : '#FFF',
                                  color: currentStatus === 'absent' ? '#B91C1C' : '#4B5563',
                                  fontWeight: currentStatus === 'absent' ? 600 : 500,
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                Absent
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleStatus(s.id, 'late')}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  border: `1px solid ${currentStatus === 'late' ? '#D97706' : '#D1D5DB'}`,
                                  backgroundColor: currentStatus === 'late' ? '#FFFBEB' : '#FFF',
                                  color: currentStatus === 'late' ? '#B45309' : '#4B5563',
                                  fontWeight: currentStatus === 'late' ? 600 : 500,
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                Late
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
