import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TimetableSlot } from '../types';
import { auditService } from './auditService';

export const timetableService = {
  async saveSlot(tenantId: string, data: Omit<TimetableSlot, 'id' | 'tenantId'>): Promise<TimetableSlot> {
    const id = `tt_${data.classId}_${data.dayOfWeek}_${data.startTime}`.replace(/[\s-:]/g, '_');
    const slot: TimetableSlot = {
      ...data,
      id,
      tenantId
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'timetable', id), slot);
    } catch (e) {
      console.warn('Firestore saveSlot fallback:', e);
    }

    const localKey = `timetable_${tenantId}`;
    const existing: TimetableSlot[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(s => s.id === id);
    if (idx >= 0) existing[idx] = slot;
    else existing.push(slot);
    localStorage.setItem(localKey, JSON.stringify(existing));

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'TIMETABLE_SAVED',
      actionCategory: 'ACADEMIC',
      details: `Added new Timetable Period '${slot.subject}' (${slot.dayOfWeek}, ${slot.startTime} - ${slot.endTime}, Teacher: ${slot.teacherName || 'Unassigned'}) for Class '${slot.classId}'`
    });

    return slot;
  },

  async getTimetableByClass(tenantId: string, classId: string): Promise<TimetableSlot[]> {
    let all: TimetableSlot[] = [];
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'timetable'));
      snap.forEach(d => all.push(d.data() as TimetableSlot));
    } catch (e) {
      all = JSON.parse(localStorage.getItem(`timetable_${tenantId}`) || '[]');
    }

    return all.filter(s => s.classId === classId);
  },

  async updateSlot(tenantId: string, slotId: string, updates: Partial<TimetableSlot>): Promise<void> {
    const localKey = `timetable_${tenantId}`;
    const existing: TimetableSlot[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(s => s.id === slotId);
    const oldSlot = idx >= 0 ? existing[idx] : null;

    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'timetable', slotId), updates);
    } catch (e) {
      console.warn('Firestore updateSlot fallback:', e);
    }

    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }

    const pastDesc = oldSlot 
      ? `'${oldSlot.subject}' (${oldSlot.dayOfWeek}, ${oldSlot.startTime}-${oldSlot.endTime}, Teacher: ${oldSlot.teacherName || 'Unassigned'})`
      : 'Previous Period';
    
    const newSubject = updates.subject || oldSlot?.subject || 'Subject';
    const newDay = updates.dayOfWeek || oldSlot?.dayOfWeek || 'Day';
    const newTime = `${updates.startTime || oldSlot?.startTime || ''}-${updates.endTime || oldSlot?.endTime || ''}`;
    const newTeacher = updates.teacherName || oldSlot?.teacherName || 'Unassigned';

    const presentDesc = `'${newSubject}' (${newDay}, ${newTime}, Teacher: ${newTeacher})`;

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'TIMETABLE_UPDATED',
      actionCategory: 'ACADEMIC',
      details: `Modified Timetable Period for Class '${updates.classId || oldSlot?.classId || 'Class'}' — Past: ${pastDesc} ➔ Present: ${presentDesc}`
    });
  },

  async deleteSlot(tenantId: string, slotId: string): Promise<void> {
    const localKey = `timetable_${tenantId}`;
    const existing: TimetableSlot[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const target = existing.find(s => s.id === slotId);

    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'timetable', slotId));
    } catch (e) {
      console.warn('Firestore deleteSlot fallback:', e);
    }

    const filtered = existing.filter(s => s.id !== slotId);
    localStorage.setItem(localKey, JSON.stringify(filtered));

    const slotDesc = target 
      ? `'${target.subject}' on ${target.dayOfWeek} (${target.startTime}-${target.endTime}) for Class '${target.classId}'`
      : `Slot ID ${slotId}`;

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'TIMETABLE_DELETED',
      actionCategory: 'ACADEMIC',
      details: `Deleted Timetable Period ${slotDesc}`
    });
  }
};
