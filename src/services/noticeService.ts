import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notice, UserRole } from '../types';

export const noticeService = {
  async createNotice(tenantId: string, data: Omit<Notice, 'id' | 'tenantId' | 'createdAt'>): Promise<Notice> {
    const id = `ntc_${Date.now()}`;
    const notice: Notice = {
      ...data,
      id,
      tenantId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'notices', id), notice);
    } catch (e) {
      console.warn('Firestore createNotice fallback:', e);
    }

    const localKey = `notices_${tenantId}`;
    const existing: Notice[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.unshift(notice);
    localStorage.setItem(localKey, JSON.stringify(existing));

    return notice;
  },

  async getNoticesByRole(tenantId: string, role: UserRole): Promise<Notice[]> {
    let all: Notice[] = [];
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'notices'));
      snap.forEach(d => all.push(d.data() as Notice));
    } catch (e) {
      all = JSON.parse(localStorage.getItem(`notices_${tenantId}`) || '[]');
    }

    return all.filter(n => {
      if (n.targetAudience === 'all') return true;
      if (role === 'TEACHER' && n.targetAudience === 'teachers') return true;
      if (role === 'PARENT' && n.targetAudience === 'parents') return true;
      if (role === 'PRINCIPAL') return true;
      return false;
    });
  }
};
