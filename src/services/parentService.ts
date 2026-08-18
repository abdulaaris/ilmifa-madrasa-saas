import { collection, doc, setDoc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Parent } from '../types';
import { userService } from './userService';
import { auditService } from './auditService';

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

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'PARENT_REGISTERED',
      actionCategory: 'ADMINISTRATION',
      details: `Registered Parent '${parent.name}' (${parent.relationship}, Email: ${parent.email}, Mobile: ${parent.mobile})`
    });

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

      // Sync updated studentIds to users/{uid} document as well
      const parentRef = doc(db, 'madrasas', tenantId, 'parents', parentId);
      const snap = await getDoc(parentRef);
      if (snap.exists()) {
        const parentData = snap.data() as Parent;
        if (parentData.uid) {
          await updateDoc(doc(db, 'users', parentData.uid), { 
            studentIds: parentData.studentIds || updates.studentIds || [],
            phone: parentData.mobile || updates.mobile || ''
          });

          // Sync to localStorage profile backup
          const localUserKey = `user_profile_${parentData.uid}`;
          const uStr = localStorage.getItem(localUserKey);
          if (uStr) {
            const uObj = JSON.parse(uStr);
            uObj.studentIds = parentData.studentIds || updates.studentIds || [];
            uObj.phone = parentData.mobile || updates.mobile || '';
            localStorage.setItem(localUserKey, JSON.stringify(uObj));
          }
        }
      }
    } catch (e) {
      console.warn('Firestore updateParent fallback:', e);
    }

    const localKey = `parents_${tenantId}`;
    const existing: Parent[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(p => p.id === parentId);
    let targetParent: Parent | null = null;
    if (idx >= 0) {
      targetParent = existing[idx];
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }

    // Build comprehensive Past ➔ Present change details
    const changes: string[] = [];
    if (targetParent) {
      if (updates.name && updates.name !== targetParent.name) changes.push(`Name: '${targetParent.name}' ➔ '${updates.name}'`);
      if (updates.email && updates.email !== targetParent.email) changes.push(`Email: '${targetParent.email}' ➔ '${updates.email}'`);
      if (updates.mobile && updates.mobile !== targetParent.mobile) changes.push(`Mobile: '${targetParent.mobile}' ➔ '${updates.mobile}'`);
      if (updates.relationship && updates.relationship !== targetParent.relationship) changes.push(`Relationship: '${targetParent.relationship}' ➔ '${updates.relationship}'`);
      if (updates.studentIds && JSON.stringify(updates.studentIds) !== JSON.stringify(targetParent.studentIds)) changes.push(`Linked Students: [${targetParent.studentIds?.join(', ') || 'None'}] ➔ [${updates.studentIds.join(', ')}]`);
    }

    if (changes.length === 0 && targetParent) {
      return;
    }

    const changeDesc = changes.length > 0 ? changes.join(', ') : 'profile fields updated';

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'PARENT_UPDATED',
      actionCategory: 'ADMINISTRATION',
      details: `Modified Parent '${updates.name || targetParent?.name || parentId}' — ${changeDesc}`
    });
  },

  async deleteParent(tenantId: string, parentId: string): Promise<void> {
    const localKey = `parents_${tenantId}`;
    const existing: Parent[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const target = existing.find(p => p.id === parentId);

    try {
      const parentRef = doc(db, 'madrasas', tenantId, 'parents', parentId);
      const snap = await getDoc(parentRef);
      let targetUid = target?.uid;
      if (snap.exists()) {
        const pData = snap.data() as Parent;
        if (pData.uid) targetUid = pData.uid;
      }

      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(parentRef);

      // Delete parent login profile from users/{uid}
      if (targetUid) {
        await userService.deleteUser(targetUid);
      }
    } catch (e) {
      console.warn('Firestore deleteParent fallback:', e);
    }

    if (target?.uid) {
      await userService.deleteUser(target.uid);
    }

    const filtered = existing.filter(p => p.id !== parentId);
    localStorage.setItem(localKey, JSON.stringify(filtered));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'PARENT_DELETED',
      actionCategory: 'ADMINISTRATION',
      details: `Deleted Parent record for '${target?.name || parentId}' (${target?.email || 'N/A'})`
    });
  }
};
