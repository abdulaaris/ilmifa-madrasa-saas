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
    let oldStudent: Student | null = null;
    if (idx >= 0) {
      oldStudent = { ...existing[idx] };
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }

    // Build comprehensive Past ➔ Present change details
    const changes: string[] = [];
    if (oldStudent) {
      if (updates.name && updates.name !== oldStudent.name) changes.push(`Name: '${oldStudent.name}' ➔ '${updates.name}'`);
      if (updates.classId && updates.classId !== oldStudent.classId) changes.push(`Class: '${oldStudent.classId}' ➔ '${updates.classId}'`);
      if (updates.section && updates.section !== oldStudent.section) changes.push(`Section: '${oldStudent.section}' ➔ '${updates.section}'`);
      if (updates.status && updates.status !== oldStudent.status) changes.push(`Status: '${oldStudent.status.toUpperCase()}' ➔ '${updates.status.toUpperCase()}'`);
      if (updates.studentCode && updates.studentCode !== oldStudent.studentCode) changes.push(`Student Code: '${oldStudent.studentCode}' ➔ '${updates.studentCode}'`);
      if (updates.parentName !== undefined && updates.parentName !== oldStudent.parentName) changes.push(`Parent: '${oldStudent.parentName || 'N/A'}' ➔ '${updates.parentName || 'N/A'}'`);
      if (updates.parentPhone !== undefined && updates.parentPhone !== oldStudent.parentPhone) changes.push(`Parent Phone: '${oldStudent.parentPhone || 'N/A'}' ➔ '${updates.parentPhone || 'N/A'}'`);
      if (updates.gender && updates.gender !== oldStudent.gender) changes.push(`Gender: '${oldStudent.gender}' ➔ '${updates.gender}'`);
    }

    // If nothing actually changed, don't log
    if (changes.length === 0 && oldStudent) {
      return;
    }

    const changeDesc = changes.length > 0 ? changes.join(', ') : 'profile fields updated';

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'STUDENT_UPDATED',
      actionCategory: 'ACADEMIC',
      details: `Modified Student '${updates.name || oldStudent?.name || studentId}' — ${changeDesc}`
    });
  },

  async deleteStudent(tenantId: string, studentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'students', studentId));
    } catch (e) {
      console.warn('Firestore deleteStudent fallback:', e);
    }

    const localKey = `students_${tenantId}`;
    const existing: Student[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const target = existing.find(s => s.id === studentId);
    const filtered = existing.filter(s => s.id !== studentId);
    localStorage.setItem(localKey, JSON.stringify(filtered));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'STUDENT_DELETED',
      actionCategory: 'ACADEMIC',
      details: `Deleted Student '${target?.name || studentId}' (Code: ${target?.studentCode || 'N/A'}, Class: ${target?.classId || 'N/A'})`
    });
  }
};
