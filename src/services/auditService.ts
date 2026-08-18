import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { AuditLog, AuditCategory, UserRole } from '../types';

function isDemoLog(log: any): boolean {
  if (!log || typeof log !== 'object') return true;
  if (log.id && String(log.id).startsWith('log-100')) return true;
  if (log.tenantName === 'Noorul Hayath Madrasa') return true;
  if (log.userEmail === 'principal@noorulhayath.org') return true;
  if (log.userEmail === 'ibrahim@gmail.com') return true;
  if (log.userEmail === 'hameed@noorulhayath.org') return true;
  if (log.userEmail === 'principal@madrasa.org') return true;
  if (log.userName === 'Principal Mohammed') return true;
  if (log.userName === 'Ustad Abdul Hameed') return true;
  if (log.userName === 'Parent Ibrahim') return true;
  if (log.ipAddress === '157.34.22.109' || log.ipAddress === '157.34.22.112' || log.ipAddress === '157.34.22.115') return true;
  return false;
}

export const auditService = {
  /**
   * Helper to retrieve currently logged-in REAL user profile
   */
  getCurrentUserHelper(): { userId: string; userName: string; userRole: UserRole; userEmail: string; tenantId?: string } {
    // 1. Try reading stored user profile in localStorage
    const raw = localStorage.getItem('ilmifa_current_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u && (u.email || u.displayName || u.name)) {
          return {
            userId: u.uid || u.id || auth.currentUser?.uid || 'usr-active',
            userName: u.displayName || u.name || (u.email ? u.email.split('@')[0] : 'Active User'),
            userRole: u.role || 'SUPER_ADMIN',
            userEmail: u.email || auth.currentUser?.email || 'user@ilmifa.com',
            tenantId: u.tenantId
          };
        }
      } catch (e) {}
    }

    // 2. Fallback to Firebase auth.currentUser if logged in
    const fbUser = auth.currentUser;
    if (fbUser) {
      return {
        userId: fbUser.uid,
        userName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Active User',
        userRole: 'SUPER_ADMIN',
        userEmail: fbUser.email || 'user@ilmifa.com'
      };
    }

    // 3. Fallback for Super Admin session
    return {
      userId: 'usr-admin-live',
      userName: 'Super Admin',
      userRole: 'SUPER_ADMIN',
      userEmail: 'admin@ilmifa.com'
    };
  },

  /**
   * Helper to resolve REAL Madrasa name by Tenant ID
   */
  getTenantNameHelper(tenantId?: string): string {
    if (!tenantId || tenantId === 'CORE') return 'iLmiFa Core Platform';
    
    // Check localStorage tenant cache
    const raw = localStorage.getItem(`tenant_${tenantId}`);
    if (raw) {
      try {
        const t = JSON.parse(raw);
        if (t && t.name) return t.name;
      } catch (e) {}
    }

    // Check all tenants stored in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tenant_MAD-')) {
        try {
          const t = JSON.parse(localStorage.getItem(key) || '{}');
          if (t && t.id === tenantId && t.name) return t.name;
        } catch (e) {}
      }
    }

    return tenantId;
  },

  /**
   * Log a new activity with REAL user profile and REAL Madrasa name in real time
   */
  async logActivity(params: {
    tenantId?: string;
    tenantName?: string;
    userId?: string;
    userName?: string;
    userRole?: UserRole;
    userEmail?: string;
    action: string;
    actionCategory: AuditCategory;
    details: string;
    ipAddress?: string;
  }): Promise<AuditLog> {
    const activeUser = this.getCurrentUserHelper();
    const resolvedTenantId = params.tenantId || activeUser.tenantId || 'CORE';
    const resolvedTenantName = params.tenantName || this.getTenantNameHelper(resolvedTenantId);

    const logItem: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: resolvedTenantId,
      tenantName: resolvedTenantName,
      timestamp: new Date().toISOString(),
      userId: (params.userId && !params.userId.startsWith('usr-prin') && !params.userId.startsWith('usr-admin')) ? params.userId : activeUser.userId,
      userName: (params.userName && params.userName !== 'Principal' && params.userName !== 'Super Admin' && params.userName !== 'Teacher / Principal') ? params.userName : activeUser.userName,
      userRole: params.userRole || activeUser.userRole,
      userEmail: (params.userEmail && !params.userEmail.includes('@madrasa.org') && !params.userEmail.includes('admin@madrasa.org')) ? params.userEmail : activeUser.userEmail,
      action: params.action,
      actionCategory: params.actionCategory,
      details: params.details,
      ipAddress: params.ipAddress || 'Web App PWA'
    };

    // Save to LocalStorage cache
    const existing = this.getLocalAuditLogs();
    const updated = [logItem, ...existing.filter(l => !isDemoLog(l))];
    localStorage.setItem('ilmifa_audit_logs', JSON.stringify(updated));

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
    } catch (err) {
      console.warn('Firestore audit log setDoc failed, cached locally:', err);
    }

    return logItem;
  },

  /**
   * Fetch all real-time audit logs (Ordered newest first, 100% clean of demo data)
   */
  async getAllAuditLogs(): Promise<AuditLog[]> {
    let logs: AuditLog[] = [];
    try {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(500));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const item = d.data() as AuditLog;
        if (!isDemoLog(item)) {
          logs.push(item);
        }
      });
    } catch (err) {
      console.warn('Firestore getAllAuditLogs fallback:', err);
    }

    if (logs.length === 0) {
      logs = this.getLocalAuditLogs();
    }

    // Strict filter to permanently eliminate legacy demo logs
    const cleanLogs = logs.filter(l => !isDemoLog(l));

    // Sort descending by timestamp
    return cleanLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Helper to retrieve audit logs from LocalStorage (Purges legacy demo items)
   */
  getLocalAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem('ilmifa_audit_logs');
    if (!raw) return [];
    try {
      const parsed: AuditLog[] = JSON.parse(raw);
      // Filter out any legacy demo entries
      const cleanLogs = parsed.filter(l => !isDemoLog(l));
      if (cleanLogs.length !== parsed.length) {
        localStorage.setItem('ilmifa_audit_logs', JSON.stringify(cleanLogs));
      }
      return cleanLogs;
    } catch (e) {
      return [];
    }
  },

  /**
   * Clear Audit Log history completely
   */
  clearLocalHistory() {
    localStorage.setItem('ilmifa_audit_logs', JSON.stringify([]));
  }
};
