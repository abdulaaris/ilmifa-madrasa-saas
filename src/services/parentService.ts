import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Parent } from '../types';
import { userService } from './userService';

export const parentService = {
  async createParent(
    tenantId: string, 
    data: { name: string; email: string; pass: string; mobile: string; relationship: string; studentIds: string[] }
  ): Promise<Parent> {
    const userProfile = await userService.createPrivilegedUser(
      data.email,
      data.pass,
      data.name,
      'PARENT',
      tenantId,
      { studentIds: data.studentIds, phone: data.mobile }
    );

    const id = `prn_${Date.now()}`;
    const parent: Parent = {
      id,
      tenantId,
      uid: userProfile.uid,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      relationship: data.relationship,
      studentIds: data.studentIds,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'parents', id), parent);
    } catch (e) {
      console.warn('Firestore createParent fallback:', e);
    }

    const localKey = `parents_${tenantId}`;
    const existing: Parent[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(parent);
    localStorage.setItem(localKey, JSON.stringify(existing));

    return parent;
  },

  async getParentsByTenant(tenantId: string): Promise<Parent[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'parents'));
      const list: Parent[] = [];
      snap.forEach(d => list.push(d.data() as Parent));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getParentsByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`parents_${tenantId}`) || '[]');
  },

  async updateParent(tenantId: string, parentId: string, updates: Partial<Parent>): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'parents', parentId), updates);
    } catch (e) {
      console.warn('Firestore updateParent fallback:', e);
    }

    const localKey = `parents_${tenantId}`;
    const existing: Parent[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(p => p.id === parentId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }
  }
};
