import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MadrasaTenant, MadrasaModule, MadrasaStatus, TenantBranding, DomainStatus } from '../types';
import { userService } from './userService';

export const tenantService = {
  /**
   * Generates a unique Tenant ID formatted as MAD-YYYY-XXXXXX
   */
  async generateTenantId(): Promise<string> {
    const year = new Date().getFullYear();
    const existing = await this.getAllTenants();
    const count = existing.length + 1;
    const padded = String(count).padStart(6, '0');
    return `MAD-${year}-${padded}`;
  },

  /**
   * Creates a new Madrasa Tenant along with its Principal Auth Account
   */
  async createMadrasaTenant(params: {
    name: string;
    shortName: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    principalName: string;
    principalEmail: string;
    principalPassword: string;
    branding: TenantBranding;
    enabledModules: MadrasaModule[];
    status?: MadrasaStatus;
    trialStartDate?: string;
    trialEndsAt?: string;
  }): Promise<{ tenant: MadrasaTenant; principalUid: string }> {
    const tenantId = await this.generateTenantId();

    // 1. Create Principal Account safely via secondary auth context
    const principalUser = await userService.createPrivilegedUser(
      params.principalEmail,
      params.principalPassword,
      params.principalName,
      'PRINCIPAL',
      tenantId
    );

    // 2. Build tenant record
    const tenant: MadrasaTenant = {
      id: tenantId,
      name: params.name,
      shortName: params.shortName,
      slug: params.slug.toLowerCase().trim(),
      email: params.email,
      phone: params.phone,
      address: params.address,
      status: params.status || 'active',
      principalUid: principalUser.uid,
      principalEmail: params.principalEmail,
      principalName: params.principalName,
      branding: params.branding,
      enabledModules: params.enabledModules,
      domainStatus: 'generated',
      ...(params.trialStartDate ? { trialStartDate: params.trialStartDate } : {}),
      ...(params.trialEndsAt ? { trialEndsAt: params.trialEndsAt } : {}),
      createdAt: new Date().toISOString(),
    };

    // 3. Store tenant document in madrasas/{tenantId}
    try {
      await setDoc(doc(db, 'madrasas', tenantId), tenant);
    } catch (err) {
      console.warn('Firestore setDoc failed for madrasa tenant:', err);
    }

    // Backup to localStorage for local dev resilience
    localStorage.setItem(`tenant_${tenantId}`, JSON.stringify(tenant));
    localStorage.setItem(`tenant_slug_${tenant.slug}`, tenantId);

    return { tenant, principalUid: principalUser.uid };
  },

  /**
   * Fetch all Madrasa Tenants
   */
  async getAllTenants(): Promise<MadrasaTenant[]> {
    try {
      const snap = await getDocs(collection(db, 'madrasas'));
      const list: MadrasaTenant[] = [];
      snap.forEach(d => list.push(d.data() as MadrasaTenant));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getAllTenants fallback to local storage:', e);
    }

    const localList: MadrasaTenant[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tenant_MAD-')) {
        const t = JSON.parse(localStorage.getItem(key) || '{}');
        if (t.id) localList.push(t);
      }
    }
    return localList;
  },

  /**
   * Evaluates if a trial period has expired and auto-suspends the tenant if past trialEndsAt.
   */
  async checkAndEnforceTrialExpiry(tenant: MadrasaTenant): Promise<MadrasaTenant> {
    if (tenant.status === 'trial' && tenant.trialEndsAt) {
      const now = new Date().getTime();
      const expiryTime = new Date(tenant.trialEndsAt).getTime();

      if (now >= expiryTime) {
        // Auto suspend tenant!
        const updates: Partial<MadrasaTenant> = {
          status: 'suspended',
          suspendedAt: new Date().toISOString(),
          suspensionReason: `Trial period expired on ${new Date(tenant.trialEndsAt).toLocaleString()}`
        };

        try {
          await updateDoc(doc(db, 'madrasas', tenant.id), updates);
        } catch (e) {
          console.warn('Firestore auto-suspend update failed:', e);
        }

        const updated = { ...tenant, ...updates };
        localStorage.setItem(`tenant_${tenant.id}`, JSON.stringify(updated));
        return updated;
      }
    }
    return tenant;
  },

  /**
   * Get Tenant by Tenant ID
   */
  async getTenantById(tenantId: string): Promise<MadrasaTenant | null> {
    let tenant: MadrasaTenant | null = null;
    try {
      const snap = await getDoc(doc(db, 'madrasas', tenantId));
      if (snap.exists()) tenant = snap.data() as MadrasaTenant;
    } catch (e) {
      console.warn('Firestore getTenantById fallback:', e);
    }

    if (!tenant) {
      const local = localStorage.getItem(`tenant_${tenantId}`);
      tenant = local ? JSON.parse(local) : null;
    }

    if (tenant) {
      return await this.checkAndEnforceTrialExpiry(tenant);
    }
    return null;
  },

  /**
   * Get Tenant by Slug (e.g. "noorul-hayath")
   */
  async getTenantBySlug(slug: string): Promise<MadrasaTenant | null> {
    const cleanSlug = slug.toLowerCase().trim();
    let tenant: MadrasaTenant | null = null;
    try {
      const q = query(collection(db, 'madrasas'), where('slug', '==', cleanSlug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        tenant = snap.docs[0].data() as MadrasaTenant;
      }
    } catch (e) {
      console.warn('Firestore getTenantBySlug fallback:', e);
    }

    if (!tenant) {
      const all = await this.getAllTenants();
      tenant = all.find(t => t.slug === cleanSlug) || null;
    }

    if (tenant) {
      return await this.checkAndEnforceTrialExpiry(tenant);
    }
    return null;
  },

  /**
   * Get Tenant by Custom Domain (e.g. "noorulhayath.com")
   */
  async getTenantByCustomDomain(domain: string): Promise<MadrasaTenant | null> {
    const clean = domain.toLowerCase().trim();
    try {
      const q = query(collection(db, 'madrasas'), where('customDomain', '==', clean));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as MadrasaTenant;
      }
    } catch (e) {
      console.warn('Firestore getTenantByCustomDomain fallback:', e);
    }

    const all = await this.getAllTenants();
    return all.find(t => t.customDomain?.toLowerCase() === clean) || null;
  },

  /**
   * Update Custom Domain mapping for a tenant
   */
  async setCustomDomain(tenantId: string, customDomain: string, status: DomainStatus = 'pending'): Promise<MadrasaTenant | null> {
    const updates = { customDomain: customDomain.toLowerCase().trim(), domainStatus: status };
    try {
      await updateDoc(doc(db, 'madrasas', tenantId), updates);
    } catch (e) {
      console.warn('Firestore setCustomDomain update failed:', e);
    }

    const tenant = await this.getTenantById(tenantId);
    if (tenant) {
      tenant.customDomain = updates.customDomain;
      tenant.domainStatus = updates.domainStatus;
      localStorage.setItem(`tenant_${tenantId}`, JSON.stringify(tenant));
    }
    return tenant;
  },

  /**
   * Update Tenant Status
   */
  async updateTenantStatus(tenantId: string, status: MadrasaStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId), { status });
    } catch (e) {
      console.warn('Firestore updateTenantStatus failed:', e);
    }

    const tenant = await this.getTenantById(tenantId);
    if (tenant) {
      tenant.status = status;
      localStorage.setItem(`tenant_${tenantId}`, JSON.stringify(tenant));
    }
  },

  /**
   * Update Enabled Modules per Madrasa
   */
  async updateTenantModules(tenantId: string, enabledModules: MadrasaModule[]): Promise<void> {
    try {
      await updateDoc(doc(db, 'madrasas', tenantId), { enabledModules });
    } catch (e) {
      console.warn('Firestore updateTenantModules failed:', e);
    }

    const tenant = await this.getTenantById(tenantId);
    if (tenant) {
      tenant.enabledModules = enabledModules;
      localStorage.setItem(`tenant_${tenantId}`, JSON.stringify(tenant));
    }
  },

  /**
   * Update Madrasa Tenant details (Super Admin control)
   */
  async updateTenant(tenantId: string, updates: Partial<MadrasaTenant>): Promise<void> {
    // 1. Immediately update local storage cache for local resilience & zero latency
    const localKey = `tenant_${tenantId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const merged = { ...parsed, ...updates };
        localStorage.setItem(localKey, JSON.stringify(merged));
        if (merged.slug) {
          localStorage.setItem(`tenant_slug_${merged.slug}`, tenantId);
        }
      } catch (e) {
        console.warn('LocalStorage merge failed:', e);
      }
    }

    // 2. Persist to Firestore
    try {
      await updateDoc(doc(db, 'madrasas', tenantId), updates);
    } catch (e) {
      console.warn('Firestore updateTenant failed:', e);
    }
  }
};
