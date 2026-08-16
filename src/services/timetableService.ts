import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TimetableSlot } from '../types';

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
    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'timetable', slotId), updates);
    } catch (e) {
      console.warn('Firestore updateSlot fallback:', e);
    }

    const localKey = `timetable_${tenantId}`;
    const existing: TimetableSlot[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(s => s.id === slotId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(localKey, JSON.stringify(existing));
    }
  },

  async deleteSlot(tenantId: string, slotId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'timetable', slotId));
    } catch (e) {
      console.warn('Firestore deleteSlot fallback:', e);
    }

    const localKey = `timetable_${tenantId}`;
    const existing: TimetableSlot[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter(s => s.id !== slotId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  }
};
