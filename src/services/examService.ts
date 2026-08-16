import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ExamRecord, ExamResult } from '../types';

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

    return exam;
  },

  async getExamsByTenant(tenantId: string): Promise<ExamRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'exams'));
      const list: ExamRecord[] = [];
      snap.forEach(d => list.push(d.data() as ExamRecord));
      if (list.length > 0) return list;
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
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }
  },

  async saveResult(tenantId: string, data: Omit<ExamResult, 'id' | 'tenantId' | 'percentage' | 'grade' | 'createdAt'>): Promise<ExamResult> {
    const id = `res_${data.examId}_${data.studentId}`;
    const percentage = Math.round((data.obtainedMarks / data.maxMarks) * 100);
    
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    const result: ExamResult = {
      ...data,
      id,
      tenantId,
      percentage,
      grade,
      createdAt: new Date().toISOString()
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

    return result;
  },

  async getResultsByStudent(tenantId: string, studentId: string): Promise<ExamResult[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'results'));
      const list: ExamResult[] = [];
      snap.forEach(d => {
        const res = d.data() as ExamResult;
        if (res.studentId === studentId) list.push(res);
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getResultsByStudent fallback:', e);
    }

    const all: ExamResult[] = JSON.parse(localStorage.getItem(`results_${tenantId}`) || '[]');
    return all.filter(r => r.studentId === studentId);
  }
};
