import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MadrasaClass } from '../types';
import { auditService } from './auditService';

export const classService = {
  async createClass(tenantId: string, data: Omit<MadrasaClass, 'id' | 'tenantId' | 'createdAt'>): Promise<MadrasaClass> {
    const id = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newClass: MadrasaClass = {
      ...data,
      id,
      tenantId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'classes', id), newClass);
    } catch (e) {
      console.warn('Firestore createClass fallback:', e);
    }

    const localKey = `classes_${tenantId}`;
    const existing: MadrasaClass[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(newClass);
    localStorage.setItem(localKey, JSON.stringify(existing));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'CLASS_CREATED',
      actionCategory: 'ACADEMIC',
      details: `Created new Class '${newClass.name} ${newClass.section ? `(${newClass.section})` : ''}'`
    });

    return newClass;
  },

  async getClassesByTenant(tenantId: string): Promise<MadrasaClass[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'classes'));
      const list: MadrasaClass[] = [];
      snap.forEach(d => list.push(d.data() as MadrasaClass));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getClassesByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`classes_${tenantId}`) || '[]');
  },

  async updateClass(tenantId: string, classId: string, updates: Partial<MadrasaClass>): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'classes', classId), updates);
    } catch (e) {
      console.warn('Firestore updateClass fallback:', e);
    }

    const localKey = `classes_${tenantId}`;
    const existing: MadrasaClass[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(c => c.id === classId);
    const oldClass = idx >= 0 ? { ...existing[idx] } : null;
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'CLASS_UPDATED',
      actionCategory: 'ACADEMIC',
      details: `Modified Class — Past: '${oldClass?.name || 'N/A'}' (Section: ${oldClass?.section || 'N/A'}) ➔ Present: '${updates.name || oldClass?.name || 'N/A'}' (Section: ${updates.section || oldClass?.section || 'N/A'})`
    });
  },

  async deleteClass(tenantId: string, classId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'classes', classId));
    } catch (e) {
      console.warn('Firestore deleteClass fallback:', e);
    }

    const localKey = `classes_${tenantId}`;
    const existing: MadrasaClass[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const target = existing.find(c => c.id === classId);
    const filtered = existing.filter(c => c.id !== classId);
    localStorage.setItem(localKey, JSON.stringify(filtered));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'CLASS_DELETED',
      actionCategory: 'ACADEMIC',
      details: `Deleted Class '${target?.name || classId}' (Section: ${target?.section || 'N/A'})`
    });
  }
};
