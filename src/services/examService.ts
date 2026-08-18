import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ExamRecord, ExamResult } from '../types';
import { auditService } from './auditService';

export const examService = {
  async createExam(tenantId: string, data: Omit<ExamRecord, 'id' | 'tenantId' | 'createdAt'>): Promise<ExamRecord> {
    const id = `ex_${Date.now()}`;
    const exam: ExamRecord = {
      ...data,
      id,
      tenantId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'exams', id), exam);
    } catch (e) {
      console.warn('Firestore createExam fallback:', e);
    }

    const localKey = `exams_${tenantId}`;
    const existing: ExamRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(exam);
    localStorage.setItem(localKey, JSON.stringify(existing));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'EXAM_CREATED',
      actionCategory: 'ACADEMIC',
      details: `Scheduled new Exam '${exam.title}' for Subject '${exam.subject}' (${exam.examDate}, Max Marks: ${exam.maxMarks})`
    });

    return exam;
  },

  async getExamsByTenant(tenantId: string): Promise<ExamRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'exams'));
      const list: ExamRecord[] = [];
      snap.forEach(d => list.push(d.data() as ExamRecord));
      return list;
    } catch (e) {
      console.warn('Firestore getExamsByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`exams_${tenantId}`) || '[]');
  },

  async updateExam(tenantId: string, examId: string, updates: Partial<ExamRecord>): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'exams', examId), updates);
    } catch (e) {
      console.warn('Firestore updateExam fallback:', e);
    }

    const localKey = `exams_${tenantId}`;
    const existing: ExamRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(e => e.id === examId);
    const oldExam = idx >= 0 ? { ...existing[idx] } : null;
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'EXAM_UPDATED',
      actionCategory: 'ACADEMIC',
      details: `Modified Exam — Past: '${oldExam?.title || 'N/A'}' (Subject: ${oldExam?.subject || 'N/A'}, Date: ${oldExam?.examDate || 'N/A'}, Max Marks: ${oldExam?.maxMarks || 'N/A'}) ➔ Present: '${updates.title || oldExam?.title || 'N/A'}' (Subject: ${updates.subject || oldExam?.subject || 'N/A'}, Date: ${updates.examDate || oldExam?.examDate || 'N/A'}, Max Marks: ${updates.maxMarks || oldExam?.maxMarks || 'N/A'})`
    });
  },

  async deleteExam(tenantId: string, examId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'exams', examId));
    } catch (e) {
      console.warn('Firestore deleteExam fallback:', e);
    }

    const localKey = `exams_${tenantId}`;
    const existing: ExamRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const target = existing.find(e => e.id === examId);
    const filtered = existing.filter(e => e.id !== examId);
    localStorage.setItem(localKey, JSON.stringify(filtered));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'EXAM_DELETED',
      actionCategory: 'ACADEMIC',
      details: `Deleted Exam '${target?.title || examId}' (Subject: ${target?.subject || 'N/A'}, Date: ${target?.examDate || 'N/A'})`
    });
  },

  async saveResult(tenantId: string, data: Omit<ExamResult, 'id' | 'tenantId' | 'percentage' | 'grade' | 'createdAt'>): Promise<ExamResult> {
    const subSlug = (data.subject || 'general').replace(/[^a-zA-Z0-9]/g, '_');
    const id = `res_${data.examId}_${data.studentId}_${subSlug}`;
    const percentage = Math.round((data.obtainedMarks / data.maxMarks) * 100);
    
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    // 1. Query existing results for this exam to check if this student's result actually CHANGED
    const existingExamResults = await this.getResultsByExam(tenantId, data.examId);
    const oldRecord = existingExamResults.find(
      r => r.studentId === data.studentId && 
           (r.subject === data.subject || (!r.subject && (data.subject === 'General' || !data.subject)))
    );

    const isNew = !oldRecord;
    const marksChanged = oldRecord && oldRecord.obtainedMarks !== undefined && Number(oldRecord.obtainedMarks) !== Number(data.obtainedMarks);
    const remarksChanged = oldRecord && (oldRecord.remarks || '') !== (data.remarks || '');
    const isModified = !isNew && (marksChanged || remarksChanged);

    const result: ExamResult = {
      ...data,
      id,
      tenantId,
      percentage,
      grade,
      createdAt: oldRecord?.createdAt || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'results', id), result);
    } catch (e) {
      console.warn('Firestore saveResult fallback:', e);
    }

    const localKey = `results_${tenantId}`;
    const existing: ExamResult[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(r => r.id === id);
    if (idx >= 0) existing[idx] = result;
    else existing.push(result);
    localStorage.setItem(localKey, JSON.stringify(existing));

    // CRITICAL REQUIREMENT: IF NOT NEW AND NOTHING CHANGED -> DO NOT CREATE HISTORY LOG!
    if (!isNew && !isModified) {
      return result;
    }

    if (isModified) {
      const oldMarks = oldRecord ? Number(oldRecord.obtainedMarks) : 0;
      const oldGrade = oldRecord?.grade || 'F';
      const oldRemarks = oldRecord?.remarks || 'None';
      const newRemarks = data.remarks || 'None';

      let detailsMessage = '';
      if (marksChanged && remarksChanged) {
        detailsMessage = `Modified ${data.studentName}'s ${data.subject || 'General'} marks from ${oldMarks} to ${data.obtainedMarks} (Grade: ${oldGrade} ➔ ${grade}) & Updated Remarks from '${oldRemarks}' to '${newRemarks}' in '${data.examTitle}'`;
      } else if (marksChanged) {
        detailsMessage = `Modified ${data.studentName}'s ${data.subject || 'General'} marks from ${oldMarks} to ${data.obtainedMarks} out of ${data.maxMarks} in '${data.examTitle}' (Past Grade: ${oldGrade} ➔ Present Grade: ${grade})`;
      } else if (remarksChanged) {
        detailsMessage = `Updated Remarks for Student '${data.studentName}' in '${data.examTitle}' (${data.subject || 'General'}) — Past Remarks: '${oldRemarks}' ➔ Present Remarks: '${newRemarks}'`;
      }

      // Real-time Audit History Log for modified student ONLY
      await auditService.logActivity({
        tenantId: tenantId,
        action: 'EXAM_MARKS_MODIFIED',
        actionCategory: 'ACADEMIC',
        details: detailsMessage
      });
    } else if (isNew) {
      const detailsMessage = `Recorded new exam marks for Student '${data.studentName}' in '${data.examTitle}' (Subject: ${data.subject || 'General'}) — Marks: ${data.obtainedMarks}/${data.maxMarks} (Grade: ${grade}) ${data.remarks ? `| Remarks: '${data.remarks}'` : ''}`;

      // Real-time Audit History Log for new student record ONLY
      await auditService.logActivity({
        tenantId: tenantId,
        action: 'EXAM_MARKS_RECORDED',
        actionCategory: 'ACADEMIC',
        details: detailsMessage
      });
    }

    return result;
  },

  async deleteResult(tenantId: string, resultId: string, studentName?: string, examTitle?: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'results', resultId));
    } catch (e) {
      console.warn('Firestore deleteResult fallback:', e);
    }

    const localKey = `results_${tenantId}`;
    const existing: ExamResult[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter(r => r.id !== resultId);
    localStorage.setItem(localKey, JSON.stringify(filtered));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'EXAM_MARKS_DELETED',
      actionCategory: 'ACADEMIC',
      details: `Deleted exam marks record ${studentName ? `for Student '${studentName}'` : ''} ${examTitle ? `in '${examTitle}'` : `(ID: ${resultId})`}`
    });
  },

  async getResultsByStudent(tenantId: string, studentId: string): Promise<ExamResult[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'results'));
      const list: ExamResult[] = [];
      snap.forEach(d => {
        const res = d.data() as ExamResult;
        if (res.studentId === studentId) list.push(res);
      });
      return list;
    } catch (e) {
      console.warn('Firestore getResultsByStudent fallback:', e);
    }

    const all: ExamResult[] = JSON.parse(localStorage.getItem(`results_${tenantId}`) || '[]');
    return all.filter(r => r.studentId === studentId);
  },

  async getResultsByExam(tenantId: string, examId: string): Promise<ExamResult[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'results'));
      const list: ExamResult[] = [];
      snap.forEach(d => {
        const res = d.data() as ExamResult;
        if (res.examId === examId) list.push(res);
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getResultsByExam fallback:', e);
    }

    const all: ExamResult[] = JSON.parse(localStorage.getItem(`results_${tenantId}`) || '[]');
    return all.filter(r => r.examId === examId);
  },

  async saveBulkResults(
    tenantId: string, 
    results: Array<Omit<ExamResult, 'id' | 'tenantId' | 'percentage' | 'grade' | 'createdAt'>>
  ): Promise<void> {
    await Promise.all(results.map(r => this.saveResult(tenantId, r)));
  }
};
