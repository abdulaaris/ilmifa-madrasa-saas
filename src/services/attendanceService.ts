import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AttendanceRecord } from '../types';
import { holidayService } from './holidayService';
import { auditService } from './auditService';

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

    // 1. Fetch old attendance record for this class & date
    const oldRecord = await this.getAttendanceForClassAndDate(tenantId, classId, date);
    const oldRecordsMap = oldRecord?.records || {};

    const isNew = !oldRecord;
    const changedStudents: string[] = [];

    // Fetch students list to map real student names for pin-to-pin details
    const studentList: any[] = JSON.parse(localStorage.getItem(`students_${tenantId}`) || '[]');
    const studentNameMap: Record<string, string> = {};
    studentList.forEach(s => {
      if (s && s.id && s.name) studentNameMap[s.id] = s.name;
    });

    Object.keys(records).forEach(studentId => {
      const oldStatus = oldRecordsMap[studentId];
      const newStatus = records[studentId];
      if (oldStatus && oldStatus !== newStatus) {
        const sName = studentNameMap[studentId] || `Student ID ${studentId}`;
        changedStudents.push(`${sName}: Past [${oldStatus.toUpperCase()}] ➔ Present [${newStatus.toUpperCase()}]`);
      }
    });

    const isModified = !isNew && changedStudents.length > 0;

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

    // CRITICAL RULE: IF NOT NEW AND NO STUDENT STATUS CHANGED -> DO NOT LOG!
    if (!isNew && !isModified) {
      return record;
    }

    const count = Object.keys(records).length;
    const presentCount = Object.values(records).filter(v => v === 'present').length;
    const absentCount = Object.values(records).filter(v => v === 'absent').length;
    const lateCount = Object.values(records).filter(v => v === 'late').length;

    let detailsMessage = '';
    if (isModified) {
      detailsMessage = `Modified Student Attendance for Class '${classId}' on ${date} — ${changedStudents.join(', ')} (Overall: ${presentCount}/${count} Present, ${absentCount} Absent, ${lateCount} Late)`;
    } else {
      detailsMessage = `Marked Student Attendance for Class '${classId}' on ${date} (${presentCount}/${count} Present, ${absentCount} Absent, ${lateCount} Late)`;
    }

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: isModified ? 'STUDENT_ATTENDANCE_MODIFIED' : 'STUDENT_ATTENDANCE_MARKED',
      actionCategory: 'ACADEMIC',
      details: detailsMessage
    });

    return record;
  },

  async saveTeacherAttendance(
    tenantId: string, 
    date: string, 
    records: Record<string, 'present' | 'absent' | 'late' | 'on_leave'>, 
    markedBy: string
  ): Promise<void> {
    const id = `att_teacher_${date}`.replace(/[\s-]/g, '_');
    const data = {
      id,
      tenantId,
      date,
      markedBy,
      records,
      updatedAt: new Date().toISOString()
    };

    // 1. Fetch old teacher attendance record
    const oldTeacherRecordsMap = (await this.getTeacherAttendanceForDate(tenantId, date)) || {};
    const isNewTeacher = Object.keys(oldTeacherRecordsMap).length === 0;

    const teacherList: any[] = JSON.parse(localStorage.getItem(`teachers_${tenantId}`) || '[]');
    const teacherNameMap: Record<string, string> = {};
    teacherList.forEach(t => {
      if (t && t.id && t.name) teacherNameMap[t.id] = t.name;
    });

    const changedTeachers: string[] = [];
    Object.keys(records).forEach(teacherId => {
      const oldStatus = oldTeacherRecordsMap[teacherId];
      const newStatus = records[teacherId];
      if (oldStatus && oldStatus !== newStatus) {
        const tName = teacherNameMap[teacherId] || `Teacher ID ${teacherId}`;
        changedTeachers.push(`${tName}: Past [${oldStatus.toUpperCase()}] ➔ Present [${newStatus.toUpperCase()}]`);
      }
    });

    const isModifiedTeacher = !isNewTeacher && changedTeachers.length > 0;

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'teacher_attendance', id), data);
    } catch (e) {
      console.warn('Firestore saveTeacherAttendance fallback:', e);
    }

    const localKey = `teacher_attendance_${tenantId}`;
    const existing: any[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(r => r.id === id);
    if (idx >= 0) existing[idx] = data;
    else existing.push(data);
    localStorage.setItem(localKey, JSON.stringify(existing));

    if (!isNewTeacher && !isModifiedTeacher) {
      return;
    }

    const total = Object.keys(records).length;
    const presentCount = Object.values(records).filter(v => v === 'present').length;
    const absentCount = Object.values(records).filter(v => v === 'absent').length;
    const leaveCount = Object.values(records).filter(v => v === 'on_leave').length;

    let detailsMessage = '';
    if (isModifiedTeacher) {
      detailsMessage = `Modified Teacher Attendance for ${date} — ${changedTeachers.join(', ')} (Overall: ${presentCount}/${total} Present, ${absentCount} Absent, ${leaveCount} On Leave)`;
    } else {
      detailsMessage = `Marked Teacher Attendance for ${date} (${presentCount}/${total} Present, ${absentCount} Absent, ${leaveCount} On Leave)`;
    }

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: isModifiedTeacher ? 'TEACHER_ATTENDANCE_MODIFIED' : 'TEACHER_ATTENDANCE_MARKED',
      actionCategory: 'ADMINISTRATION',
      details: detailsMessage
    });
  },

  async getTeacherAttendanceForDate(tenantId: string, date: string): Promise<Record<string, 'present' | 'absent' | 'late' | 'on_leave'> | null> {
    const id = `att_teacher_${date}`.replace(/[\s-]/g, '_');
    try {
      const snap = await getDocs(query(collection(db, 'madrasas', tenantId, 'teacher_attendance'), where('date', '==', date)));
      if (!snap.empty) {
        const d = snap.docs[0].data();
        return d.records || null;
      }
    } catch (e) {
      console.warn('Firestore getTeacherAttendance fallback:', e);
    }

    const all: any[] = JSON.parse(localStorage.getItem(`teacher_attendance_${tenantId}`) || '[]');
    const found = all.find(r => r.date === date);
    return found ? found.records : null;
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

  async getStudentAttendance(tenantId: string, studentId: string): Promise<{ 
    present: number; 
    absent: number; 
    late: number; 
    total: number; 
    percentage: number;
    history: Array<{ date: string; status: 'present' | 'absent' | 'late' | 'holiday'; holidayTitle?: string }>;
  }> {
    let all: AttendanceRecord[] = [];
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'attendance'));
      snap.forEach(d => all.push(d.data() as AttendanceRecord));
    } catch (e) {
      all = JSON.parse(localStorage.getItem(`attendance_${tenantId}`) || '[]');
    }

    const customHolidays = await holidayService.getHolidaysByTenant(tenantId);

    let present = 0;
    let absent = 0;
    let late = 0;
    const history: Array<{ date: string; status: 'present' | 'absent' | 'late' | 'holiday'; holidayTitle?: string }> = [];

    all.forEach(rec => {
      if (rec.records && rec.records[studentId]) {
        const holidayInfo = holidayService.checkHolidayStatus(rec.date, customHolidays);

        if (holidayInfo.isHoliday) {
          history.push({ 
            date: rec.date, 
            status: 'holiday', 
            holidayTitle: holidayInfo.title || 'Madrasa Holiday' 
          });
        } else {
          const st = rec.records[studentId];
          if (st === 'present') present++;
          else if (st === 'absent') absent++;
          else if (st === 'late') late++;

          history.push({ date: rec.date, status: st });
        }
      }
    });

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = present + absent + late;
    const percentage = total > 0 ? Math.round(((present + (late * 0.5)) / total) * 100) : 100;
    return { present, absent, late, total, percentage, history };
  }
};
