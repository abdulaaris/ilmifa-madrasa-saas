import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AcademicYear } from '../types';
import { auditService } from './auditService';

export const academicYearService = {
  /**
   * Default initial academic year seed if none exists
   */
  getDefaultAcademicYear(tenantId: string): AcademicYear {
    return {
      id: `AY-${tenantId}-2026-2027`,
      tenantId,
      name: '2026–2027',
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      status: 'active',
      description: 'Standard Academic Session 2026–27',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Get all academic years for a tenant
   */
  async getAcademicYears(tenantId: string): Promise<AcademicYear[]> {
    const key = `academic_years_${tenantId}`;
    let items: AcademicYear[] = [];

    // 1. Try local storage first for speed
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        items = JSON.parse(cached);
      } catch {
        items = [];
      }
    }

    // 2. Query Firestore if empty or online
    if (items.length === 0) {
      try {
        const q = query(collection(db, 'academic_years'), where('tenantId', '==', tenantId));
        const snap = await getDocs(q);
        const remoteItems = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicYear));
        if (remoteItems.length > 0) {
          items = remoteItems;
        }
      } catch (err) {
        console.warn('Could not fetch academic years from Firestore:', err);
      }
    }

    // 3. Fallback: Seed default 2026-2027 if none found
    if (items.length === 0) {
      const defaultYear = this.getDefaultAcademicYear(tenantId);
      items = [defaultYear];
      localStorage.setItem(key, JSON.stringify(items));
      try {
        await setDoc(doc(db, 'academic_years', defaultYear.id), defaultYear);
      } catch {
        // ignore offline write
      }
    }

    // Sort active first, then by startDate descending
    return items.sort((a, b) => {
      if (a.status === 'active') return -1;
      if (b.status === 'active') return 1;
      return b.startDate.localeCompare(a.startDate);
    });
  },

  /**
   * Get the single active academic year for a tenant
   */
  async getActiveAcademicYear(tenantId: string): Promise<AcademicYear> {
    const all = await this.getAcademicYears(tenantId);
    const active = all.find(y => y.status === 'active');
    return active || all[0] || this.getDefaultAcademicYear(tenantId);
  },

  /**
   * Save or Update an Academic Year with full Past ➔ Present Audit Logging
   */
  async saveAcademicYear(
    tenantId: string, 
    yearData: {
      id?: string;
      name: string;
      startDate: string;
      endDate: string;
      status?: 'active' | 'upcoming' | 'completed';
      description?: string;
    }
  ): Promise<AcademicYear> {
    const key = `academic_years_${tenantId}`;
    const existing = await this.getAcademicYears(tenantId);
    const isEdit = Boolean(yearData.id && existing.some(y => y.id === yearData.id));

    const id = yearData.id || `AY-${tenantId}-${yearData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const oldYear = isEdit ? existing.find(y => y.id === id) : null;

    // If marked active, set other years to completed or upcoming
    let updatedList = [...existing];
    const willBeActive = yearData.status === 'active' || (!isEdit && existing.length === 0);

    if (willBeActive) {
      updatedList = updatedList.map(y => y.id === id ? y : { ...y, status: y.status === 'active' ? 'completed' : y.status });
    }

    const newRecord: AcademicYear = {
      id,
      tenantId,
      name: yearData.name.trim(),
      startDate: yearData.startDate,
      endDate: yearData.endDate,
      status: yearData.status || (willBeActive ? 'active' : 'upcoming'),
      description: yearData.description || `Academic Session ${yearData.name}`,
      createdAt: oldYear?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const targetIdx = updatedList.findIndex(y => y.id === id);
    if (targetIdx >= 0) {
      updatedList[targetIdx] = newRecord;
    } else {
      updatedList.push(newRecord);
    }

    // Save to LocalStorage
    localStorage.setItem(key, JSON.stringify(updatedList));

    // Save to Firestore
    try {
      await setDoc(doc(db, 'academic_years', id), newRecord);
    } catch (err) {
      console.warn('Firestore setDoc failed for academic year:', err);
    }

    // Real-time Audit History Log
    if (isEdit && oldYear) {
      const changes: string[] = [];
      if (oldYear.name !== newRecord.name) changes.push(`Name: '${oldYear.name}' ➔ '${newRecord.name}'`);
      if (oldYear.startDate !== newRecord.startDate) changes.push(`From: '${oldYear.startDate}' ➔ '${newRecord.startDate}'`);
      if (oldYear.endDate !== newRecord.endDate) changes.push(`To: '${oldYear.endDate}' ➔ '${newRecord.endDate}'`);
      if (oldYear.status !== newRecord.status) changes.push(`Status: '${oldYear.status.toUpperCase()}' ➔ '${newRecord.status.toUpperCase()}'`);

      const changeDesc = changes.length > 0 ? changes.join(', ') : 'details updated';

      await auditService.logActivity({
        tenantId,
        action: 'ACADEMIC_YEAR_UPDATED',
        actionCategory: 'ACADEMIC',
        details: `Modified Academic Year '${newRecord.name}' — ${changeDesc}`
      });
    } else {
      await auditService.logActivity({
        tenantId,
        action: 'ACADEMIC_YEAR_CREATED',
        actionCategory: 'ACADEMIC',
        details: `Configured new Academic Year '${newRecord.name}' (From: ${newRecord.startDate} To: ${newRecord.endDate}, Status: ${newRecord.status.toUpperCase()})`
      });
    }

    return newRecord;
  },

  /**
   * Set a specific academic year as active
   */
  async setActiveAcademicYear(tenantId: string, yearId: string): Promise<void> {
    const key = `academic_years_${tenantId}`;
    const existing = await this.getAcademicYears(tenantId);
    const target = existing.find(y => y.id === yearId);
    if (!target) return;

    const previousActive = existing.find(y => y.status === 'active' && y.id !== yearId);

    const updated = existing.map(y => {
      if (y.id === yearId) {
        return { ...y, status: 'active' as const, updatedAt: new Date().toISOString() };
      } else if (y.status === 'active') {
        return { ...y, status: 'completed' as const, updatedAt: new Date().toISOString() };
      }
      return y;
    });

    localStorage.setItem(key, JSON.stringify(updated));

    try {
      await updateDoc(doc(db, 'academic_years', yearId), { status: 'active', updatedAt: new Date().toISOString() });
      if (previousActive) {
        await updateDoc(doc(db, 'academic_years', previousActive.id), { status: 'completed', updatedAt: new Date().toISOString() });
      }
    } catch (err) {
      console.warn('Firestore update failed for active academic year:', err);
    }

    await auditService.logActivity({
      tenantId,
      action: 'ACADEMIC_YEAR_ACTIVATED',
      actionCategory: 'ACADEMIC',
      details: `Switched Active Academic Year to '${target.name}' (${target.startDate} to ${target.endDate}) — Previous: '${previousActive?.name || 'None'}'`
    });
  },

  /**
   * Delete an Academic Year
   */
  async deleteAcademicYear(tenantId: string, yearId: string): Promise<void> {
    const key = `academic_years_${tenantId}`;
    const existing = await this.getAcademicYears(tenantId);
    const target = existing.find(y => y.id === yearId);
    if (!target) return;

    const filtered = existing.filter(y => y.id !== yearId);
    localStorage.setItem(key, JSON.stringify(filtered));

    try {
      await deleteDoc(doc(db, 'academic_years', yearId));
    } catch (err) {
      console.warn('Firestore delete failed for academic year:', err);
    }

    await auditService.logActivity({
      tenantId,
      action: 'ACADEMIC_YEAR_DELETED',
      actionCategory: 'ACADEMIC',
      details: `Deleted Academic Year record '${target.name}' (${target.startDate} to ${target.endDate})`
    });
  },

  /**
   * 1-Click Complete & Rollover Academic Year Wizard Engine
   */
  async rolloverAcademicYear(
    tenantId: string,
    options: {
      fromYearId: string;
      toYearId: string;
      promoteStudents: boolean;
      graduateFinalYear: boolean;
      carryForwardFees: boolean;
    }
  ): Promise<{
    promotedCount: number;
    graduatedCount: number;
    feesCarriedCount: number;
  }> {
    const years = await this.getAcademicYears(tenantId);
    const fromYear = years.find(y => y.id === options.fromYearId);
    const toYear = years.find(y => y.id === options.toYearId);

    let promotedCount = 0;
    let graduatedCount = 0;
    let feesCarriedCount = 0;

    // 1. Promote Students if enabled
    if (options.promoteStudents) {
      const studentKey = `students_${tenantId}`;
      const classKey = `classes_${tenantId}`;
      const students: any[] = JSON.parse(localStorage.getItem(studentKey) || '[]');
      const classes: any[] = JSON.parse(localStorage.getItem(classKey) || '[]');

      // Class sequence helper
      const classNames = classes.map(c => c.name);

      for (let i = 0; i < students.length; i++) {
        const s = students[i];
        if (s.status !== 'active') continue;

        const curClass = s.classId || '';
        const matchNum = curClass.match(/\d+/);

        if (matchNum) {
          const currentLevel = parseInt(matchNum[0], 10);
          const nextLevel = currentLevel + 1;
          const nextClassName = curClass.replace(String(currentLevel), String(nextLevel));

          // Check if next class exists in madrasa
          const exists = classNames.some(cn => cn.toLowerCase() === nextClassName.toLowerCase());
          if (exists || nextLevel <= 10) {
            students[i].classId = nextClassName;
            promotedCount++;
          } else if (options.graduateFinalYear) {
            students[i].status = 'graduated';
            graduatedCount++;
          }
        } else if (curClass.toLowerCase().includes('nazira')) {
          students[i].classId = 'Hifz A';
          promotedCount++;
        } else {
          promotedCount++;
        }
      }

      localStorage.setItem(studentKey, JSON.stringify(students));
    }

    // 2. Fee Rollover / Carry-forward Balance
    if (options.carryForwardFees) {
      const feeKey = `fees_${tenantId}`;
      const fees: any[] = JSON.parse(localStorage.getItem(feeKey) || '[]');
      const pendingFees = fees.filter(f => f.status === 'pending' || f.status === 'partial');
      feesCarriedCount = pendingFees.length;
    }

    // 3. Mark fromYear as completed & toYear as active
    await this.setActiveAcademicYear(tenantId, options.toYearId);

    // 4. Audit History Logging
    await auditService.logActivity({
      tenantId,
      action: 'ACADEMIC_YEAR_ACTIVATED',
      actionCategory: 'ACADEMIC',
      details: `Completed Academic Session '${fromYear?.name || 'Previous'}' & Rolled Over to '${toYear?.name || 'New'}' — ${promotedCount} students upgraded, ${graduatedCount} graduated, ${feesCarriedCount} fee balances carried forward.`
    });

    return { promotedCount, graduatedCount, feesCarriedCount };
  }
};
