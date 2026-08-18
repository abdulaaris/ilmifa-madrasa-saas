import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FeeRecord } from '../types';
import { auditService } from './auditService';

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

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId,
      action: 'FEE_RECORD_CREATED',
      actionCategory: 'FINANCE',
      details: `Created Fee Record of ₹${data.feeAmount} for Student '${data.studentName}' (${data.month})`
    });

    return record;
  },

  async getFeesByTenant(tenantId: string): Promise<FeeRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas', tenantId, 'fees'));
      const list: FeeRecord[] = [];
      snap.forEach(d => list.push(d.data() as FeeRecord));
      return list;
    } catch (e) {
      console.warn('Firestore getFeesByTenant fallback:', e);
    }

    return JSON.parse(localStorage.getItem(`fees_${tenantId}`) || '[]');
  },

  async getFeesByStudent(tenantId: string, studentId: string): Promise<FeeRecord[]> {
    const all = await this.getFeesByTenant(tenantId);
    return all.filter(f => f.studentId === studentId);
  },

  async updateFeeRecord(tenantId: string, feeId: string, updates: Partial<FeeRecord>): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId, 'fees', feeId), updates);
    } catch (e) {
      console.warn('Firestore updateFeeRecord fallback:', e);
    }

    const localKey = `fees_${tenantId}`;
    const existing: FeeRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(f => f.id === feeId);
    if (idx >= 0) {
      const merged = { ...existing[idx], ...updates };
      merged.balance = merged.feeAmount - merged.paidAmount;
      if (merged.balance <= 0) merged.status = 'paid';
      else if (merged.paidAmount > 0) merged.status = 'partial';
      else merged.status = 'pending';

      existing[idx] = merged;
      localStorage.setItem(localKey, JSON.stringify(existing));
    }
  },

  async deleteFeeRecord(tenantId: string, feeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'madrasas', tenantId, 'fees', feeId));
    } catch (e) {
      console.warn('Firestore deleteFeeRecord fallback:', e);
    }

    const localKey = `fees_${tenantId}`;
    const existing: FeeRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter(f => f.id !== feeId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  }
};
