import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FeeRecord } from '../types';

export const feeService = {
  async createFeeRecord(tenantId: string, data: Omit<FeeRecord, 'id' | 'tenantId' | 'balance' | 'status' | 'createdAt'>): Promise<FeeRecord> {
    const id = `fee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const balance = data.feeAmount - data.paidAmount;
    let status: FeeRecord['status'] = 'pending';
    if (balance <= 0) status = 'paid';
    else if (data.paidAmount > 0) status = 'partial';

    const record: FeeRecord = {
      ...data,
      id,
      tenantId,
      balance,
      status,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'madrasas', tenantId, 'fees', id), record);
    } catch (e) {
      console.warn('Firestore feeService fallback:', e);
    }

    const localKey = `fees_${tenantId}`;
    const existing: FeeRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(record);
    localStorage.setItem(localKey, JSON.stringify(existing));

    return record;
  },

  async getFeesByTenant(tenantId: string): Promise<FeeRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'fees'));
      const list: FeeRecord[] = [];
      snap.forEach(d => list.push(d.data() as FeeRecord));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getFeesByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`fees_${tenantId}`) || '[]');
  },

  async getFeesByStudent(tenantId: string, studentId: string): Promise<FeeRecord[]> {
    const all = await this.getFeesByTenant(tenantId);
    return all.filter(f => f.studentId === studentId);
  }
};
