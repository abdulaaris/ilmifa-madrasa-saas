import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AttendanceRecord } from '../types';

export const attendanceService = {
  async saveAttendance(
    tenantId: string, 
    classId: string, 
    date: string, 
    records: Record<string, 'present' | 'absent' | 'late'>, 
    markedBy: string
  ): Promise<AttendanceRecord> {
    const id = `att_${classId}_${date}`.replace(/[\s-]/g, '_');
    const record: AttendanceRecord = {
      id,
      tenantId,
      classId,
      date,
      markedBy,
      records,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'attendance', id), record);
    } catch (e) {
      console.warn('Firestore saveAttendance fallback:', e);
    }

    const localKey = `attendance_${tenantId}`;
    const existing: AttendanceRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(r => r.id === id);
    if (idx >= 0) existing[idx] = record;
    else existing.push(record);
    localStorage.setItem(localKey, JSON.stringify(existing));

    return record;
  },

  async getAttendanceForClassAndDate(tenantId: string, classId: string, date: string): Promise<AttendanceRecord | null> {
    const id = `att_${classId}_${date}`.replace(/[\s-]/g, '_');
    try {
      const snap = await getDocs(query(collection(db, 'madrasas', tenantId, 'attendance'), where('classId', '==', classId), where('date', '==', date)));
      if (!snap.empty) {
        return snap.docs[0].data() as AttendanceRecord;
      }
    } catch (e) {
      console.warn('Firestore getAttendance fallback:', e);
    }

    const all: AttendanceRecord[] = JSON.parse(localStorage.getItem(`attendance_${tenantId}`) || '[]');
    return all.find(r => r.classId === classId && r.date === date) || null;
  },

  async getStudentAttendance(tenantId: string, studentId: string): Promise<{ present: number; absent: number; late: number; total: number; percentage: number }> {
    let all: AttendanceRecord[] = [];
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'attendance'));
      snap.forEach(d => all.push(d.data() as AttendanceRecord));
    } catch (e) {
      all = JSON.parse(localStorage.getItem(`attendance_${tenantId}`) || '[]');
    }

    let present = 0;
    let absent = 0;
    let late = 0;

    all.forEach(rec => {
      if (rec.records && rec.records[studentId]) {
        const st = rec.records[studentId];
        if (st === 'present') present++;
        else if (st === 'absent') absent++;
        else if (st === 'late') late++;
      }
    });

    const total = present + absent + late;
    const percentage = total > 0 ? Math.round(((present + (late * 0.5)) / total) * 100) : 100;
    return { present, absent, late, total, percentage };
  }
};
