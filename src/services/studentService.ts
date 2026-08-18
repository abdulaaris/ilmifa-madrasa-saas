import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Student } from '../types';
import { auditService } from './auditService';

export const studentService = {
  async createStudent(tenantId: string, data: Omit<Student, 'id' | 'tenantId' | 'createdAt'>): Promise<Student> {
    const id = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const student: Student = {
      ...data,
      id,
      tenantId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'students', id), student);
    } catch (e) {
      console.warn('Firestore createStudent fallback:', e);
    }

    const localKey = `students_${tenantId}`;
    const existing: Student[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(student);
    localStorage.setItem(localKey, JSON.stringify(existing));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'STUDENT_ENROLLED',
      actionCategory: 'ACADEMIC',
      details: `Enrolled new Student '${student.name}' (Code: ${student.studentCode}, Class: ${student.classId})`
    });

    return student;
  },

  async getStudentsByTenant(tenantId: string): Promise<Student[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'students'));
      const list: Student[] = [];
      snap.forEach(d => list.push(d.data() as Student));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getStudentsByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`students_${tenantId}`) || '[]');
  },

  async updateStudent(tenantId: string, studentId: string, updates: Partial<Student>): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'students', studentId), updates);
    } catch (e) {
      console.warn('Firestore updateStudent fallback:', e);
    }

    const localKey = `students_${tenantId}`;
    const existing: Student[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(s => s.id === studentId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }
  },

  async deleteStudent(tenantId: string, studentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'students', studentId));
    } catch (e) {
      console.warn('Firestore deleteStudent fallback:', e);
    }

    const localKey = `students_${tenantId}`;
    const existing: Student[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter(s => s.id !== studentId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  }
};
