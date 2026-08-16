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
      status: 'active',
      principalUid: principalUser.uid,
      principalEmail: params.principalEmail,
      principalName: params.principalName,
      branding: params.branding,
      enabledModules: params.enabledModules,
      domainStatus: 'generated',
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
   * Get Tenant by Tenant ID
   */
  async getTenantById(tenantId: string): Promise<MadrasaTenant | null> {
    try {
      const snap = await getDoc(doc(db, 'madrasas', tenantId));
      if (snap.exists()) return snap.data() as MadrasaTenant;
    } catch (e) {
      console.warn('Firestore getTenantById fallback:', e);
    }

    const local = localStorage.getItem(`tenant_${tenantId}`);
    return local ? JSON.parse(local) : null;
  },

  /**
   * Get Tenant by Slug (e.g. "noorul-hayath")
   */
  async getTenantBySlug(slug: string): Promise<MadrasaTenant | null> {
    const cleanSlug = slug.toLowerCase().trim();
    try {
      const q = query(collection(db, 'madrasas'), where('slug', '==', cleanSlug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as MadrasaTenant;
      }
    } catch (e) {
      console.warn('Firestore getTenantBySlug fallback:', e);
    }

    const all = await this.getAllTenants();
    return all.find(t => t.slug === cleanSlug) || null;
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
  }
};
