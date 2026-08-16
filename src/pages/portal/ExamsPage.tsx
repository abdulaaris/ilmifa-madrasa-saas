import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { examService } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { CLASS_OPTIONS } from '../../config/constants';
import { ExamRecord, Student } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { Award, Plus, X, Check } from 'lucide-react';

export const ExamsPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Exam Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [title, setTitle] = useState('Mid-Term Examination 2026');
  const [selectedClass, setSelectedClass] = useState(CLASS_OPTIONS[0]);
  const [subject, setSubject] = useState('Tajweed & Quran');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [examDate, setExamDate] = useState('2026-10-15');
  const [savingExam, setSavingExam] = useState(false);

  // Result Entry Modal
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState<number>(85);
  const [remarks, setRemarks] = useState('Excellent recitation and tajweed rules.');
  const [savingResult, setSavingResult] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [eList, sList] = await Promise.all([
        examService.getExamsByTenant(tenant.id),
        studentService.getStudentsByTenant(tenant.id)
      ]);
      setExams(eList);
      setStudents(sList);
      if (sList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(sList[0].id);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !title) return;
    setSavingExam(true);

    await examService.createExam(tenant.id, {
      title,
      classId: selectedClass,
      subject,
      maxMarks: Number(maxMarks),
      examDate
    });

    setSavingExam(false);
    setIsExamModalOpen(false);
    await loadData();
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedExam || !selectedStudentId) return;
    setSavingResult(true);

    const st = students.find(s => s.id === selectedStudentId);

    await examService.saveResult(tenant.id, {
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      studentId: selectedStudentId,
      studentName: st?.name || 'Student',
      classId: selectedExam.classId,
      subject: selectedExam.subject,
      maxMarks: selectedExam.maxMarks,
      obtainedMarks: Number(obtainedMarks),
      remarks
    });

    setSavingResult(false);
    setResultSuccess(true);
    setTimeout(() => {
      setResultSuccess(false);
      setSelectedExam(null);
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Exams & Report Cards
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Schedule examinations, record marks, and generate report cards
              </p>
            </div>

            {user?.role !== 'PARENT' && (
              <button onClick={() => setIsExamModalOpen(true)} className="btn btn-primary">
                <Plus size={18} />
                <span>Schedule New Exam</span>
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading examinations...</div>
          ) : exams.length === 0 ? (
            <EmptyState 
              icon="🏆"
              title="No Exams Scheduled Yet"
              description="Schedule examinations to record student grades and print academic report cards."
              actionLabel={user?.role !== 'PARENT' ? "+ Schedule Exam" : undefined}
              onAction={user?.role !== 'PARENT' ? () => setIsExamModalOpen(true) : undefined}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {exams.map(ex => (
                <div key={ex.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span className="badge badge-trial">{ex.classId}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>{ex.examDate}</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', marginBottom: '4px' }}>
                      {ex.title}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#7B2525', fontWeight: 600, marginBottom: '16px' }}>
                      Subject: {ex.subject} • Max Marks: {ex.maxMarks}
                    </div>
                  </div>

                  {user?.role !== 'PARENT' && (
                    <button 
                      onClick={() => setSelectedExam(ex)} 
                      className="btn btn-outline btn-full btn-sm"
                      style={{ gap: '6px' }}
                    >
                      <Award size={16} />
                      <span>Enter Student Marks</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Schedule Exam Modal */}
      {isExamModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Schedule Examination
              </h3>
              <button onClick={() => setIsExamModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateExam} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Exam Title *</label>
                <input type="text" className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Class Level</label>
                  <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Subject</label>
                  <input type="text" className="input-field" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Max Marks</label>
                  <input type="number" className="input-field" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Exam Date</label>
                  <input type="date" className="input-field" value={examDate} onChange={e => setExamDate(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsExamModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={savingExam} className="btn btn-primary">
                  {savingExam ? 'Scheduling...' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Marks Modal */}
      {selectedExam && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                  Enter Marks — {selectedExam.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Class: {selectedExam.classId} • Max: {selectedExam.maxMarks} Marks</div>
              </div>
              <button onClick={() => setSelectedExam(null)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            {resultSuccess ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#059669', fontWeight: 600, fontSize: '16px' }}>
                ✓ Result Record Saved Successfully!
              </div>
            ) : (
              <form onSubmit={handleSaveResult} style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Select Student</label>
                  <select className="input-field" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                    {students.filter(s => s.classId === selectedExam.classId).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Obtained Marks (out of {selectedExam.maxMarks})</label>
                  <input type="number" className="input-field" value={obtainedMarks} onChange={e => setObtainedMarks(Number(e.target.value))} max={selectedExam.maxMarks} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Teacher Remarks</label>
                  <input type="text" className="input-field" value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={() => setSelectedExam(null)} className="btn btn-outline">Cancel</button>
                  <button type="submit" disabled={savingResult} className="btn btn-primary">
                    {savingResult ? 'Saving...' : 'Save Result'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
};
