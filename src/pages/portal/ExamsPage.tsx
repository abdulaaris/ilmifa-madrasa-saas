import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { examService } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { CLASS_OPTIONS } from '../../config/constants';
import { ExamRecord, Student, ExamResult } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { Award, Plus, X, Edit2, Trash2, Check } from 'lucide-react';

import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import { subjectService } from '../../services/subjectService';

export const ExamsPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Security Check: Super Admin, Principal, and Teacher can Edit/Schedule Exams
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL' || user?.role === 'TEACHER';

  // Create / Edit Exam Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamRecord | null>(null);
  const [title, setTitle] = useState('Mid-Term Examination 2026');
  const [selectedClass, setSelectedClass] = useState('');
  const [subject, setSubject] = useState('Tajweed & Quran');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectDates, setSubjectDates] = useState<Record<string, string>>({});
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [savingExam, setSavingExam] = useState(false);

  // Excel Sheet Bulk Result Entry Modal State
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState('');
  const [bulkMarks, setBulkMarks] = useState<Record<string, Record<string, { obtainedMarks: number | ''; remarks: string }>>>({});
  const [loadingExamStudents, setLoadingExamStudents] = useState(false);
  const [savingBulkResults, setSavingBulkResults] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [eList, sList, cList, subList] = await Promise.all([
        examService.getExamsByTenant(tenant.id),
        studentService.getStudentsByTenant(tenant.id),
        classService.getClassesByTenant(tenant.id),
        subjectService.getSubjectsByTenant(tenant.id)
      ]);
      setAvailableSubjects(subList.map(s => s.name));
      let names = cList.map(c => c.name);
      if (user?.role === 'TEACHER' && user) {
        let teacherClasses = user.assignedClasses || [];
        const tList = await teacherService.getTeachersByTenant(tenant.id);
        const me = tList.find(t => (t.email && t.email.toLowerCase() === user.email.toLowerCase()) || t.uid === user.uid);
        if (me && me.assignedClasses && me.assignedClasses.length > 0) {
          teacherClasses = me.assignedClasses;
        }

        names = names.filter(n => teacherClasses.includes(n));
        const filteredExams = eList.filter(e => teacherClasses.includes(e.classId));
        setExams(filteredExams);
      } else {
        setExams(eList);
      }

      setStudents(sList);
      if (names.length > 0) {
        setAvailableClasses(names);
        setSelectedClass(names[0]);
      } else {
        setAvailableClasses([]);
        setSelectedClass('');
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
    setSelectedClass(availableClasses[0] || '');
    setSubject(availableSubjects[0] || '');
    const todayStr = new Date().toISOString().substring(0, 10);
    const initialSubs = availableSubjects.length > 0 ? [availableSubjects[0]] : [];
    setSelectedSubjects(initialSubs);
    const initialDates: Record<string, string> = {};
    initialSubs.forEach(s => {
      initialDates[s] = todayStr;
    });
    setSubjectDates(initialDates);
    setCustomSubjectInput('');
    setMaxMarks(100);
    setIsExamModalOpen(true);
  };

  const openEditExamModal = (ex: ExamRecord) => {
    setEditingExam(ex);
    setTitle(ex.title);
    setSelectedClass(ex.classId);
    setSubject(ex.subject);
    const subs = ex.subjects && ex.subjects.length > 0 ? ex.subjects : ex.subject ? [ex.subject] : [];
    setSelectedSubjects(subs);
    
    const datesMap: Record<string, string> = { ...(ex.subjectDates || {}) };
    const fallbackDate = ex.examDate || new Date().toISOString().substring(0, 10);
    subs.forEach(s => {
      if (!datesMap[s]) datesMap[s] = fallbackDate;
    });
    setSubjectDates(datesMap);
    setCustomSubjectInput('');
    setMaxMarks(ex.maxMarks);
    setIsExamModalOpen(true);
  };

  const toggleSubjectSelect = (subName: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    setSelectedSubjects(prev => {
      if (prev.includes(subName)) {
        return prev.filter(s => s !== subName);
      } else {
        setSubjectDates(d => ({ ...d, [subName]: d[subName] || todayStr }));
        return [...prev, subName];
      }
    });
  };

  const handleSubjectDateChange = (subName: string, dateVal: string) => {
    setSubjectDates(prev => ({
      ...prev,
      [subName]: dateVal
    }));
  };

  const handleAddCustomSubject = () => {
    if (customSubjectInput.trim() && !selectedSubjects.includes(customSubjectInput.trim())) {
      const newSub = customSubjectInput.trim();
      const todayStr = new Date().toISOString().substring(0, 10);
      setSelectedSubjects(prev => [...prev, newSub]);
      setSubjectDates(d => ({ ...d, [newSub]: todayStr }));
      setCustomSubjectInput('');
    }
  };

  const openEnterMarksModal = async (ex: ExamRecord) => {
    setSelectedExam(ex);
    setLoadingExamStudents(true);
    setBulkSuccessMessage(null);

    const examSubs = ex.subjects && ex.subjects.length > 0 
      ? ex.subjects 
      : ex.subject ? ex.subject.split(', ').map(s => s.trim()) : ['General'];
    
    const defaultTab = examSubs[0] || 'General';
    setActiveSubjectTab(defaultTab);

    let existingResults: ExamResult[] = [];
    if (tenant?.id) {
      existingResults = await examService.getResultsByExam(tenant.id, ex.id);
    }

    const classStudents = students.filter(s => s.classId === ex.classId);
    const fullMap: Record<string, Record<string, { obtainedMarks: number | ''; remarks: string }>> = {};

    examSubs.forEach(sub => {
      fullMap[sub] = {};
      classStudents.forEach(s => {
        const foundRes = existingResults.find(r => r.studentId === s.id && (r.subject === sub || (!r.subject && sub === 'General')));
        fullMap[sub][s.id] = {
          obtainedMarks: foundRes !== undefined && foundRes.obtainedMarks !== undefined ? foundRes.obtainedMarks : '',
          remarks: foundRes?.remarks || ''
        };
      });
    });

    setBulkMarks(fullMap);
    setLoadingExamStudents(false);
  };

  const handleMarkChange = (studentId: string, val: string) => {
    const num = val === '' ? '' : Math.min(selectedExam?.maxMarks || 100, Math.max(0, Number(val)));
    setBulkMarks(prev => ({
      ...prev,
      [activeSubjectTab]: {
        ...(prev[activeSubjectTab] || {}),
        [studentId]: {
          ...(prev[activeSubjectTab]?.[studentId] || { remarks: '' }),
          obtainedMarks: num
        }
      }
    }));
  };

  const handleRemarkChange = (studentId: string, val: string) => {
    setBulkMarks(prev => ({
      ...prev,
      [activeSubjectTab]: {
        ...(prev[activeSubjectTab] || {}),
        [studentId]: {
          ...(prev[activeSubjectTab]?.[studentId] || { obtainedMarks: '' }),
          remarks: val
        }
      }
    }));
  };

  const handleSetAllDefaultMarks = (defaultScore: number) => {
    setBulkMarks(prev => {
      const subMap = { ...(prev[activeSubjectTab] || {}) };
      Object.keys(subMap).forEach(sId => {
        if (subMap[sId].obtainedMarks === '') {
          subMap[sId] = { ...subMap[sId], obtainedMarks: defaultScore };
        }
      });
      return {
        ...prev,
        [activeSubjectTab]: subMap
      };
    });
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !title) return;
    setSavingExam(true);

    const subjectString = selectedSubjects.length > 0 ? selectedSubjects.join(', ') : subject || 'General';
    const dateValues = Object.values(subjectDates).filter(Boolean);
    const primaryDate = dateValues.length > 0 ? dateValues.sort()[0] : new Date().toISOString().substring(0, 10);

    if (editingExam) {
      await examService.updateExam(tenant.id, editingExam.id, {
        title,
        classId: selectedClass,
        subject: subjectString,
        subjects: selectedSubjects,
        subjectDates,
        maxMarks: Number(maxMarks),
        examDate: primaryDate
      });
    } else {
      await examService.createExam(tenant.id, {
        title,
        classId: selectedClass,
        subject: subjectString,
        subjects: selectedSubjects,
        subjectDates,
        maxMarks: Number(maxMarks),
        examDate: primaryDate
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

  const handleSaveBulkResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedExam) return;
    setSavingBulkResults(true);

    const classStudents = students.filter(s => s.classId === selectedExam.classId);
    const examSubs = selectedExam.subjects && selectedExam.subjects.length > 0 
      ? selectedExam.subjects 
      : selectedExam.subject ? selectedExam.subject.split(', ').map(s => s.trim()) : ['General'];

    const recordsToSave: Array<Omit<ExamResult, 'id' | 'tenantId' | 'percentage' | 'grade' | 'createdAt'>> = [];

    examSubs.forEach(sub => {
      const subMap = bulkMarks[sub] || {};
      classStudents.forEach(s => {
        const markEntry = subMap[s.id];
        if (markEntry && markEntry.obtainedMarks !== '') {
          recordsToSave.push({
            examId: selectedExam.id,
            examTitle: selectedExam.title,
            studentId: s.id,
            studentName: s.name,
            classId: selectedExam.classId,
            subject: sub,
            maxMarks: selectedExam.maxMarks,
            obtainedMarks: Number(markEntry.obtainedMarks),
            remarks: markEntry.remarks || ''
          });
        }
      });
    });

    if (recordsToSave.length === 0) {
      alert('Please enter marks for at least one student before saving.');
      setSavingBulkResults(false);
      return;
    }

    await examService.saveBulkResults(tenant.id, recordsToSave);
    setSavingBulkResults(false);
    setBulkSuccessMessage(`✓ Marks saved successfully for ${recordsToSave.length} student subject records!`);
    setTimeout(() => {
      setBulkSuccessMessage(null);
      setSelectedExam(null);
    }, 1500);
  };

  const calculateGradeBadge = (marks: number | '', max: number) => {
    if (marks === '') return <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Not Entered</span>;
    const pct = Math.round((Number(marks) / max) * 100);
    let grade = 'F';
    let bg = '#FEE2E2';
    let color = '#991B1B';

    if (pct >= 90) { grade = 'A+'; bg = '#ECFDF5'; color = '#047857'; }
    else if (pct >= 80) { grade = 'A'; bg = '#D1FAE5'; color = '#065F46'; }
    else if (pct >= 70) { grade = 'B'; bg = '#EFF6FF'; color = '#1D4ED8'; }
    else if (pct >= 60) { grade = 'C'; bg = '#FEF3C7'; color = '#B45309'; }
    else if (pct >= 50) { grade = 'D'; bg = '#FFEDD5'; color = '#C2410C'; }

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
        <span>{pct}%</span>
        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: bg, color: color, fontSize: '11px' }}>
          {grade}
        </span>
      </span>
    );
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
                    <div style={{ fontSize: '13px', color: '#7B2525', fontWeight: 600, marginBottom: '8px' }}>
                      Class: {ex.classId} • Max Marks: {ex.maxMarks}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '6px' }}>Subject Schedule & Dates:</div>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {(ex.subjects && ex.subjects.length > 0 ? ex.subjects : [ex.subject]).map(sub => {
                          const sDate = (ex.subjectDates && ex.subjectDates[sub]) || ex.examDate;
                          return (
                            <div key={sub} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }}>
                              <span style={{ fontWeight: 600, color: '#252525' }}>📖 {sub}</span>
                              <span className="badge badge-trial" style={{ fontSize: '11px', gap: '4px' }}>
                                📅 {sDate}
                              </span>
                            </div>
                          );
                        })}
                      </div>
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
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Class Level *</label>
                  <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Max Marks *</label>
                  <input type="number" className="input-field" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} />
                </div>
              </div>

              {/* Select Subjects for this Exam */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#252525' }}>
                  Select Subject(s) Included in this Exam *
                </label>
                
                {availableSubjects.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', backgroundColor: '#FAF9F7', borderRadius: '10px', border: '1px solid #E5E7EB', maxHeight: '130px', overflowY: 'auto' }}>
                    {availableSubjects.map(sub => {
                      const isSelected = selectedSubjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleSubjectSelect(sub)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: isSelected ? '1.5px solid #7B2525' : '1px solid #D1D5DB',
                            backgroundColor: isSelected ? '#7B2525' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <Check size={13} />}
                          <span>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                    No pre-created subjects found in Subjects Directory. Add subject manually below:
                  </div>
                )}

                {/* Custom subject manual add */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Add custom subject (e.g. Tajweed)..."
                    value={customSubjectInput}
                    onChange={e => setCustomSubjectInput(e.target.value)}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add
                  </button>
                </div>

                {selectedSubjects.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280', alignSelf: 'center' }}>Selected:</span>
                    {selectedSubjects.map(s => (
                      <span key={s} style={{ padding: '2px 8px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '12px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {s}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleSubjectSelect(s)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Individual Per-Subject Date Pickers */}
              {selectedSubjects.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#252525' }}>
                    📅 Exam Date for Each Selected Subject *
                  </label>
                  <div style={{ display: 'grid', gap: '8px', padding: '10px', backgroundColor: '#FAF9F7', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                    {selectedSubjects.map(subName => (
                      <div key={subName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#7B2525' }}>
                          📖 {subName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Exam Date:</span>
                          <input
                            type="date"
                            className="input-field"
                            value={subjectDates[subName] || new Date().toISOString().substring(0, 10)}
                            onChange={e => handleSubjectDateChange(subName, e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '12px', width: '135px', fontWeight: 600 }}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

      {/* Excel Sheet Quick Student Marks Entry Modal */}
      {selectedExam && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '20px', maxWidth: '860px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            {/* Modal Header */}
            <div style={{ padding: '18px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAF9F7', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                  📊 Excel Sheet Marks Entry — {selectedExam.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  Class: <strong>{selectedExam.classId}</strong> • Active Subject: <strong style={{ color: '#7B2525' }}>📖 {activeSubjectTab}</strong> • Max Marks: <strong>{selectedExam.maxMarks}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedExam(null)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            {/* Subject Navigation Tabs Bar */}
            <div style={{ display: 'flex', gap: '6px', padding: '10px 24px 0', backgroundColor: '#FAF9F7', borderBottom: '1px solid #E5E7EB', overflowX: 'auto' }}>
              {(selectedExam.subjects && selectedExam.subjects.length > 0 
                ? selectedExam.subjects 
                : selectedExam.subject ? selectedExam.subject.split(', ').map(s => s.trim()) : ['General']
              ).map(subName => {
                const isActive = activeSubjectTab === subName;
                const subMap = bulkMarks[subName] || {};
                const filledCount = Object.values(subMap).filter(m => m.obtainedMarks !== '').length;
                return (
                  <button
                    key={subName}
                    type="button"
                    onClick={() => setActiveSubjectTab(subName)}
                    style={{
                      padding: '8px 16px',
                      borderTopLeftRadius: '10px',
                      borderTopRightRadius: '10px',
                      border: '1px solid #E5E7EB',
                      borderBottom: isActive ? '3px solid #7B2525' : '1px solid #E5E7EB',
                      backgroundColor: isActive ? '#FFFFFF' : '#F3F4F6',
                      color: isActive ? '#7B2525' : '#4B5563',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                      marginBottom: '-1px'
                    }}
                  >
                    <span>📖 {subName}</span>
                    {filledCount > 0 && (
                      <span style={{ padding: '1px 7px', borderRadius: '10px', backgroundColor: isActive ? '#7B2525' : '#D1D5DB', color: isActive ? '#FFF' : '#374151', fontSize: '11px', fontWeight: 700 }}>
                        {filledCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              {bulkSuccessMessage ? (
                <div style={{ padding: '36px', textAlign: 'center', backgroundColor: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '16px', color: '#047857', fontWeight: 700, fontSize: '16px' }}>
                  {bulkSuccessMessage}
                </div>
              ) : loadingExamStudents ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading class roster & existing marks...</div>
              ) : (
                <form onSubmit={handleSaveBulkResults}>
                  {/* Quick Action Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      Class Roster: <strong>{students.filter(s => s.classId === selectedExam.classId).length} Students</strong> • Entering marks for: <span style={{ color: '#7B2525', fontWeight: 700 }}>📖 {activeSubjectTab}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => handleSetAllDefaultMarks(selectedExam.maxMarks)} className="btn btn-outline btn-xs" style={{ fontSize: '11px' }}>
                        ⚡ Set All {selectedExam.maxMarks} (Full Marks)
                      </button>
                      <button type="button" onClick={() => handleSetAllDefaultMarks(0)} className="btn btn-outline btn-xs" style={{ fontSize: '11px', color: '#DC2626' }}>
                        Clear All
                      </button>
                    </div>
                  </div>

                  {students.filter(s => s.classId === selectedExam.classId).length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#666', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                      No students found in class <strong>{selectedExam.classId}</strong>.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                            <th style={{ padding: '10px 14px', width: '100px', color: '#6B7280', fontWeight: 600 }}>Code</th>
                            <th style={{ padding: '10px 14px', color: '#252525', fontWeight: 600 }}>Student Name</th>
                            <th style={{ padding: '10px 14px', width: '150px', color: '#252525', fontWeight: 600 }}>Obtained Marks ({activeSubjectTab})</th>
                            <th style={{ padding: '10px 14px', width: '130px', color: '#252525', fontWeight: 600 }}>Grade / %</th>
                            <th style={{ padding: '10px 14px', color: '#6B7280', fontWeight: 600 }}>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.filter(s => s.classId === selectedExam.classId).map((st, idx) => {
                            const subMap = bulkMarks[activeSubjectTab] || {};
                            const entry = subMap[st.id] || { obtainedMarks: '', remarks: '' };
                            return (
                              <tr key={st.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                                <td style={{ padding: '10px 14px', color: '#6B7280', fontWeight: 600, fontSize: '12px' }}>
                                  {st.studentCode}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>
                                  {st.name}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input 
                                      type="number" 
                                      className="input-field" 
                                      placeholder="0"
                                      value={entry.obtainedMarks} 
                                      onChange={e => handleMarkChange(st.id, e.target.value)} 
                                      min={0}
                                      max={selectedExam.maxMarks}
                                      style={{ width: '80px', padding: '6px 10px', fontWeight: 700, textAlign: 'center', borderColor: entry.obtainedMarks !== '' ? '#7B2525' : '#D1D5DB' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#6B7280' }}>/ {selectedExam.maxMarks}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {calculateGradeBadge(entry.obtainedMarks, selectedExam.maxMarks)}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    placeholder="Good performance..."
                                    value={entry.remarks} 
                                    onChange={e => handleRemarkChange(st.id, e.target.value)} 
                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                    <button type="button" onClick={() => setSelectedExam(null)} className="btn btn-outline">Cancel</button>
                    <button type="submit" disabled={savingBulkResults || students.filter(s => s.classId === selectedExam.classId).length === 0} className="btn btn-primary btn-lg">
                      {savingBulkResults ? 'Saving All Student Marks...' : '💾 Save All Student Marks'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
};
