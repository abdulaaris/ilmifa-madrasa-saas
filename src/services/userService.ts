import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db, getSecondaryAuth } from '../config/firebase';
import { UserProfile, UserRole, UserStatus } from '../types';
import { auditService } from './auditService';

export const userService = {
  /**
   * Privileged account creation for Principal, Teacher, or Parent using Secondary Auth Instance.
   * Prevents logging out the active Super Admin or Principal session.
   */
  async createPrivilegedUser(
    email: string, 
    pass: string, 
    displayName: string, 
    role: UserRole, 
    tenantId: string | null, 
    extraData: Partial<UserProfile> = {}
  ): Promise<UserProfile> {
    const secondaryAuth = getSecondaryAuth();
    
    // Create Firebase Auth user in secondary auth context
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const uid = userCredential.user.uid;

    const userProfile: UserProfile = {
      uid,
      email: email.toLowerCase().trim(),
      displayName,
      role,
      tenantId,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...extraData
    };

    // Save profile doc to Firestore users/{uid}
    try {
      await setDoc(doc(db, 'users', uid), userProfile);
    } catch (err) {
      console.warn('Firestore setDoc failed for new user profile:', err);
    }

    // Backup to localStorage for dev fallback resilience
    localStorage.setItem(`user_profile_${uid}`, JSON.stringify(userProfile));

    // Sign out secondary auth context so it stays clean
    await secondaryAuth.signOut();

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: tenantId || 'CORE',
      action: 'USER_CREATED',
      actionCategory: 'ADMINISTRATION',
      details: `Created new ${role} user account for ${displayName} (${email})`
    });

    return userProfile;
  },

  /**
   * Fetch all users across platform (Super Admin view)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getAllUsers fetch fallback:', e);
    }
    
    // Backup search in localStorage keys for local dev
    const localUsers: UserProfile[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('user_profile_')) {
        const u = JSON.parse(localStorage.getItem(key) || '{}');
        if (u.uid) localUsers.push(u);
      }
    }
    return localUsers;
  },

  /**
   * Fetch users for a specific Madrasa tenant
   */
  async getTenantUsers(tenantId: string): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getTenantUsers fetch fallback:', e);
    }

    const all = await this.getAllUsers();
    return all.filter(u => u.tenantId === tenantId);
  },

  /**
   * Update user profile document in users/{uid}
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Firestore updateUserProfile failed:', e);
    }

    const localKey = `user_profile_${uid}`;
    const existing = localStorage.getItem(localKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      const updated = { ...parsed, ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  },

  /**
   * Update user status (active, inactive, suspended)
   */
  async updateUserStatus(uid: string, status: UserStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), { status, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Firestore updateUserStatus failed:', e);
    }

    const localKey = `user_profile_${uid}`;
    const existing = localStorage.getItem(localKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      parsed.status = status;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(localKey, JSON.stringify(parsed));
    }
  },

  /**
   * Delete user profile doc from users/{uid} and local storage
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.warn('Firestore deleteUser failed:', e);
    }

    localStorage.removeItem(`user_profile_${uid}`);
  }
};
