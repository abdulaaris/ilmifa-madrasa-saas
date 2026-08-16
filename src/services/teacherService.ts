import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Teacher } from '../types';
import { userService } from './userService';

export const teacherService = {
  async createTeacher(
    tenantId: string, 
    data: { name: string; email: string; pass: string; mobile: string; assignedClasses: string[]; subjects: string[] }
  ): Promise<Teacher> {
    // 1. Create Auth Account safely
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
  }
};
