import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Teacher } from '../types';
import { userService } from './userService';
import { auditService } from './auditService';

export const teacherService = {
  async createTeacher(
    tenantId: string, 
    data: { name: string; email: string; pass: string; mobile: string; assignedClasses: string[]; subjects: string[] }
  ): Promise<Teacher> {
    const userProfile = await userService.createPrivilegedUser(
      data.email,
      data.pass,
      data.name,
      'TEACHER',
      tenantId,
      { assignedClasses: data.assignedClasses, subjects: data.subjects, phone: data.mobile }
    );

    const id = `tch_${Date.now()}`;
    const teacher: Teacher = {
      id,
      tenantId,
      uid: userProfile.uid,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      assignedClasses: data.assignedClasses,
      subjects: data.subjects,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'teachers', id), teacher);
    } catch (e) {
      console.warn('Firestore createTeacher fallback:', e);
    }

    const localKey = `teachers_${tenantId}`;
    const existing: Teacher[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(teacher);
    localStorage.setItem(localKey, JSON.stringify(existing));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'TEACHER_REGISTERED',
      actionCategory: 'ADMINISTRATION',
      details: `Added new Teacher '${teacher.name}' (${teacher.email}, Mobile: ${teacher.mobile})`
    });

    return teacher;
  },

  async getTeachersByTenant(tenantId: string): Promise<Teacher[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'teachers'));
      const list: Teacher[] = [];
      snap.forEach(d => list.push(d.data() as Teacher));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getTeachersByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`teachers_${tenantId}`) || '[]');
  },

  async updateTeacher(tenantId: string, teacherId: string, updates: Partial<Teacher>): Promise<void> {
    const localKey = `teachers_${tenantId}`;
    const existing: Teacher[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(t => t.id === teacherId);
    const target = idx >= 0 ? existing[idx] : null;

    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'teachers', teacherId), updates);
      if (target?.uid) {
        await userService.updateUserProfile(target.uid, {
          assignedClasses: updates.assignedClasses,
          subjects: updates.subjects,
          displayName: updates.name,
          phone: updates.mobile
        });
      }
    } catch (e) {
      console.warn('Firestore updateTeacher fallback:', e);
    }

    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }

    // Build comprehensive Past ➔ Present change details
    const changes: string[] = [];
    if (target) {
      if (updates.name && updates.name !== target.name) changes.push(`Name: '${target.name}' ➔ '${updates.name}'`);
      if (updates.email && updates.email !== target.email) changes.push(`Email: '${target.email}' ➔ '${updates.email}'`);
      if (updates.mobile && updates.mobile !== target.mobile) changes.push(`Mobile: '${target.mobile}' ➔ '${updates.mobile}'`);
      if (updates.status && updates.status !== target.status) changes.push(`Status: '${target.status}' ➔ '${updates.status}'`);
      if (updates.assignedClasses && JSON.stringify(updates.assignedClasses) !== JSON.stringify(target.assignedClasses)) changes.push(`Classes: [${target.assignedClasses?.join(', ') || 'None'}] ➔ [${updates.assignedClasses.join(', ')}]`);
      if (updates.subjects && JSON.stringify(updates.subjects) !== JSON.stringify(target.subjects)) changes.push(`Subjects: [${target.subjects?.join(', ') || 'None'}] ➔ [${updates.subjects.join(', ')}]`);
    }

    if (changes.length === 0 && target) {
      return;
    }

    const changeDesc = changes.length > 0 ? changes.join(', ') : 'profile fields updated';

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'TEACHER_UPDATED',
      actionCategory: 'ADMINISTRATION',
      details: `Modified Teacher '${updates.name || target?.name || teacherId}' — ${changeDesc}`
    });
  },

  async deleteTeacher(tenantId: string, teacherId: string): Promise<void> {
    const localKey = `teachers_${tenantId}`;
    const existing: Teacher[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const target = existing.find(t => t.id === teacherId);

    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'teachers', teacherId));
      if (target?.uid) {
        await userService.deleteUser(target.uid);
      }
    } catch (e) {
      console.warn('Firestore deleteTeacher fallback:', e);
    }

    if (target?.uid) {
      await userService.deleteUser(target.uid);
    }

    const filtered = existing.filter(t => t.id !== teacherId);
    localStorage.setItem(localKey, JSON.stringify(filtered));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'TEACHER_DELETED',
      actionCategory: 'ADMINISTRATION',
      details: `Deleted Teacher record '${target?.name || teacherId}' (${target?.email || 'N/A'})`
    });
  }
};
