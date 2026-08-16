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
import { Award, Plus, X, Edit2, Trash2 } from 'lucide-react';

import { classService } from '../../services/classService';

export const ExamsPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [availableClasses, setAvailableClasses] = useState<string[]>(CLASS_OPTIONS);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Security Check: Super Admin, Principal, and Teacher can Edit/Schedule Exams
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL' || user?.role === 'TEACHER';

  // Create / Edit Exam Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamRecord | null>(null);
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
      const [eList, sList, cList] = await Promise.all([
        examService.getExamsByTenant(tenant.id),
        studentService.getStudentsByTenant(tenant.id),
        classService.getClassesByTenant(tenant.id)
      ]);
      setExams(eList);
      setStudents(sList);
      if (cList.length > 0) {
        const names = cList.map(c => c.name);
        setAvailableClasses(names);
        setSelectedClass(names[0]);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const openCreateExamModal = () => {
    setEditingExam(null);
    setTitle('Mid-Term Examination 2026');
    setSelectedClass(CLASS_OPTIONS[0]);
    setSubject('Tajweed & Quran');
    setMaxMarks(100);
    setExamDate('2026-10-15');
    setIsExamModalOpen(true);
  };

  const openEditExamModal = (ex: ExamRecord) => {
    setEditingExam(ex);
    setTitle(ex.title);
    setSelectedClass(ex.classId);
    setSubject(ex.subject);
    setMaxMarks(ex.maxMarks);
    setExamDate(ex.examDate);
    setIsExamModalOpen(true);
  };

  const openEnterMarksModal = (ex: ExamRecord) => {
    setSelectedExam(ex);
    const classStudents = students.filter(s => s.classId === ex.classId);
    if (classStudents.length > 0) {
      setSelectedStudentId(classStudents[0].id);
    } else if (students.length > 0) {
      setSelectedStudentId(students[0].id);
    } else {
      setSelectedStudentId('');
    }
    setObtainedMarks(85);
    setRemarks('Good academic performance.');
    setResultSuccess(false);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !title) return;
    setSavingExam(true);

    if (editingExam) {
      // Edit existing exam
      await examService.updateExam(tenant.id, editingExam.id, {
        title,
        classId: selectedClass,
        subject,
        maxMarks: Number(maxMarks),
        examDate
      });
    } else {
      // Create new exam
      await examService.createExam(tenant.id, {
        title,
        classId: selectedClass,
        subject,
        maxMarks: Number(maxMarks),
        examDate
      });
    }

    setSavingExam(false);
    setIsExamModalOpen(false);
    await loadData();
  };

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (tenant?.id && window.confirm(`Are you sure you want to delete examination "${examTitle}"?`)) {
      await examService.deleteExam(tenant.id, examId);
      setIsExamModalOpen(false);
      await loadData();
    }
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedExam || !selectedStudentId) return;
    setSavingResult(true);

    const targetStudent = students.find(s => s.id === selectedStudentId);

    if (!targetStudent) {
      alert('Selected student not found.');
      setSavingResult(false);
      return;
    }

    await examService.saveResult(tenant.id, {
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
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
    }, 1200);
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

            {canEdit && (
              <button onClick={openCreateExamModal} className="btn btn-primary">
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
              actionLabel={canEdit ? "+ Schedule Exam" : undefined}
              onAction={canEdit ? openCreateExamModal : undefined}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {exams.map(ex => (
                <div key={ex.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span className="badge badge-trial">{ex.classId}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>{ex.examDate}</span>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => openEditExamModal(ex)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }} title="Edit Exam Details">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteExam(ex.id, ex.title)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: '#DC2626' }} title="Delete Examination">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', marginBottom: '4px' }}>
                      {ex.title}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#7B2525', fontWeight: 600, marginBottom: '16px' }}>
                      Subject: {ex.subject} • Max Marks: {ex.maxMarks}
                    </div>
                  </div>

                  {canEdit && (
                    <button 
                      onClick={() => openEnterMarksModal(ex)} 
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

      {/* Schedule / Edit Exam Modal */}
      {isExamModalOpen && canEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {editingExam ? 'Edit Examination' : 'Schedule Examination'}
              </h3>
              <button onClick={() => setIsExamModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExam} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Exam Title *</label>
                <input type="text" className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Class Level</label>
                  <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                {editingExam ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteExam(editingExam.id, editingExam.title)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#DC2626', gap: '6px' }}
                  >
                    <Trash2 size={16} />
                    <span>Delete Exam</span>
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setIsExamModalOpen(false)} className="btn btn-outline">Cancel</button>
                  <button type="submit" disabled={savingExam} className="btn btn-primary">
                    {savingExam ? 'Saving...' : editingExam ? 'Update Exam' : 'Schedule Exam'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Marks Modal */}
      {selectedExam && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                  Enter Student Marks
                </h3>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {selectedExam.title} • Class: {selectedExam.classId} • Max: {selectedExam.maxMarks} Marks
                </div>
              </div>
              <button onClick={() => setSelectedExam(null)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            {resultSuccess ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#059669', fontWeight: 600, fontSize: '16px' }}>
                ✓ Marks Record Saved for Selected Student!
              </div>
            ) : (
              <form onSubmit={handleSaveResult} style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#7B2525' }}>Select Target Student *</label>
                  <select 
                    className="input-field" 
                    value={selectedStudentId} 
                    onChange={e => setSelectedStudentId(e.target.value)}
                    style={{ fontWeight: 600, borderColor: '#7B2525' }}
                    required
                  >
                    {students.filter(s => s.classId === selectedExam.classId).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.studentCode})</option>
                    ))}
                    {students.filter(s => s.classId === selectedExam.classId).length === 0 && (
                      <option value="">No students in class {selectedExam.classId}</option>
                    )}
                  </select>
                </div>

                {selectedStudentId && (
                  <div style={{ padding: '10px 12px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', fontSize: '12px', color: '#1E40AF' }}>
                    🎯 Saving result strictly for: <strong>{students.find(s => s.id === selectedStudentId)?.name}</strong> (Code: {students.find(s => s.id === selectedStudentId)?.studentCode})
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Obtained Marks (out of {selectedExam.maxMarks})</label>
                  <input type="number" className="input-field" value={obtainedMarks} onChange={e => setObtainedMarks(Number(e.target.value))} max={selectedExam.maxMarks} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Teacher Remarks</label>
                  <input type="text" className="input-field" value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={() => setSelectedExam(null)} className="btn btn-outline">Cancel</button>
                  <button type="submit" disabled={savingResult || !selectedStudentId} className="btn btn-primary">
                    {savingResult ? 'Saving Marks...' : 'Save Result'}
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
