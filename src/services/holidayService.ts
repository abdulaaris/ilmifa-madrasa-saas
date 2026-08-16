import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MadrasaHoliday } from '../types';

export const holidayService = {
  /**
   * Helper to check if a date string YYYY-MM-DD falls on a Friday (Jummah)
   */
  isFriday(dateStr: string): boolean {
    if (!dateStr) return false;
    // Create Date object with T00:00:00 to avoid timezone offset issues
    const d = new Date(`${dateStr}T00:00:00`);
    return d.getDay() === 5; // 5 = Friday
  },

  async createHoliday(
    tenantId: string, 
    data: Omit<MadrasaHoliday, 'id' | 'tenantId' | 'createdAt'>
  ): Promise<MadrasaHoliday> {
    const id = `hld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const holiday: MadrasaHoliday = {
      ...data,
      id,
      tenantId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'holidays', id), holiday);
    } catch (e) {
      console.warn('Firestore createHoliday fallback:', e);
    }

    const localKey = `holidays_${tenantId}`;
    const existing: MadrasaHoliday[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(holiday);
    localStorage.setItem(localKey, JSON.stringify(existing));

    return holiday;
  },

  async getHolidaysByTenant(tenantId: string): Promise<MadrasaHoliday[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'holidays'));
      const list: MadrasaHoliday[] = [];
      snap.forEach(d => list.push(d.data() as MadrasaHoliday));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getHolidaysByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`holidays_${tenantId}`) || '[]');
  },

  async deleteHoliday(tenantId: string, holidayId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'holidays', holidayId));
    } catch (e) {
      console.warn('Firestore deleteHoliday fallback:', e);
    }

    const localKey = `holidays_${tenantId}`;
    const existing: MadrasaHoliday[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter(h => h.id !== holidayId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  },

  /**
   * Check if a given date is a Friday OR a declared Madrasa Holiday
   */
  checkHolidayStatus(dateStr: string, customHolidays: MadrasaHoliday[]): { isHoliday: boolean; title?: string } {
    if (this.isFriday(dateStr)) {
      return { isHoliday: true, title: '🕌 Weekly Friday (Jummah) Holiday' };
    }

    const found = customHolidays.find(h => h.date === dateStr);
    if (found) {
      return { isHoliday: true, title: `🎉 ${found.title}` };
    }

    return { isHoliday: false };
  }
};
