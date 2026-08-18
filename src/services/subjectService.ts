import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MadrasaSubject } from '../types';
import { auditService } from './auditService';

export const subjectService = {
  async createSubject(
    tenantId: string, 
    data: { name: string; code?: string; classId?: string }
  ): Promise<MadrasaSubject> {
    const id = `sub_${Date.now()}`;
    const subject: MadrasaSubject = {
      id,
      tenantId,
      name: data.name.trim(),
      code: data.code?.trim() || '',
      classId: data.classId || 'All Classes',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'subjects', id), subject);
    } catch (e) {
      console.warn('Firestore createSubject fallback:', e);
    }

    const localKey = `subjects_${tenantId}`;
    const existing: MadrasaSubject[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(subject);
    localStorage.setItem(localKey, JSON.stringify(existing));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'SUBJECT_CREATED',
      actionCategory: 'ACADEMIC',
      details: `Created new Subject '${subject.name}' (Code: ${subject.code || 'N/A'})`
    });

    return subject;
  },

  async getSubjectsByTenant(tenantId: string): Promise<MadrasaSubject[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'subjects'));
      const list: MadrasaSubject[] = [];
      snap.forEach(d => list.push(d.data() as MadrasaSubject));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getSubjectsByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`subjects_${tenantId}`) || '[]');
  },

  async updateSubject(tenantId: string, subjectId: string, updates: Partial<MadrasaSubject>): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'subjects', subjectId), updates);
    } catch (e) {
      console.warn('Firestore updateSubject fallback:', e);
    }

    const localKey = `subjects_${tenantId}`;
    const existing: MadrasaSubject[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(s => s.id === subjectId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }
  },

  async deleteSubject(tenantId: string, subjectId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'subjects', subjectId));
    } catch (e) {
      console.warn('Firestore deleteSubject fallback:', e);
    }

    const localKey = `subjects_${tenantId}`;
    const existing: MadrasaSubject[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter(s => s.id !== subjectId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  }
};
